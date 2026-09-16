const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const NotificationService = require('../services/notification.service');
const CustomerService = require('../services/customer.service');
const { hashIdentifier } = require('../utils/crypto.util');

class CustomerPortalController {
  /**
   * Request OTP for Customer Portal Login / Enrollment
   */
  static async requestOtp(req, res, next) {
    try {
      const { name, phone, aadhaar_number } = req.body;
      const tenantId = req.tenantId || env.defaultTenantId;

      if (!name || !String(name).trim()) {
        return res.status(400).json({ status: 'fail', error: 'Customer name is required.' });
      }

      // Condition: No numeric digits acceptable in name
      if (/\d/.test(name)) {
        return res.status(400).json({ status: 'fail', error: 'Customer name cannot contain numbers.' });
      }

      if (!phone || !String(phone).trim()) {
        return res.status(400).json({ status: 'fail', error: 'Phone number is required.' });
      }

      // Aadhaar is required for enrollment
      if (!aadhaar_number || !String(aadhaar_number).trim()) {
        return res.status(400).json({ status: 'fail', error: 'Aadhaar card number is required.' });
      }

      const cleanAadhaar = String(aadhaar_number).replace(/[^\d]/g, '');
      if (!/^\d{12}$/.test(cleanAadhaar)) {
        return res.status(400).json({ status: 'fail', error: 'Aadhaar number must be exactly 12 digits.' });
      }

      const cleanPhone = String(phone).replace(/[^\d]/g, '');
      const phoneToUse = cleanPhone.length === 10 ? cleanPhone : (cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone);

      if (phoneToUse.length !== 10) {
        return res.status(400).json({ status: 'fail', error: 'Phone number must be a 10-digit number.' });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 8);

      // Insert new OTP first (only becomes effective once WhatsApp actually delivers)
      const insertRes = await pool.query(
        `INSERT INTO otp_requests (phone_number, otp_hash, purpose, expires_at, tenant_id)
         VALUES ($1, $2, 'customer_portal_login', NOW() + INTERVAL '5 minutes', $3)
         RETURNING otp_id AS id, expires_at;`,
        [phoneToUse, otpHash, tenantId]
      );
      const newOtpId = insertRes.rows[0].id;

      // Send WhatsApp OTP
      const otpSendResult = await NotificationService.sendOtpNotification({
        phone: phoneToUse,
        otp,
        tenant_id: tenantId,
      });

      if (!otpSendResult.success) {
        // Do not leave an undelivered OTP active — it would shadow a valid older code.
        await pool.query(`UPDATE otp_requests SET is_used = TRUE, used_at = NOW() WHERE otp_id = $1;`, [newOtpId]);
        return res.status(502).json({
          status: 'fail',
          error: otpSendResult.error || 'Failed to send OTP via WhatsApp. Please try again.',
        });
      }

      // Only the latest OTP should stay valid. Invalidate older unused codes so users
      // never hit a mismatch by typing a code that was superseded by a newer request.
      await pool.query(
        `UPDATE otp_requests SET is_used = TRUE, used_at = NOW()
         WHERE phone_number = $1 AND purpose = 'customer_portal_login' AND is_used = FALSE AND otp_id <> $2 AND tenant_id = $3;`,
        [phoneToUse, newOtpId, tenantId]
      );

      const expiresAt = new Date(insertRes.rows[0].expires_at);
      const expiresInSeconds = Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 1000));
      const isDebugEnabled = process.env.NODE_ENV === 'development' && process.env.ENABLE_DEBUG_OTP === 'true';

      res.status(200).json({
        status: 'success',
        message: `OTP sent via WhatsApp to ${phoneToUse}.`,
        whatsapp_sent: otpSendResult.success,
        expires_in_seconds: expiresInSeconds,
        expires_at: expiresAt.toISOString(),
        ...(isDebugEnabled && { debug_otp: otp }),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify OTP and Login / Enroll Customer
   */
  static async otpVerify(req, res, next) {
    try {
      const { name, phone, otp, aadhaar_number } = req.body;
      const tenantId = req.tenantId || env.defaultTenantId;

      if (!phone || !otp) {
        return res.status(400).json({ status: 'fail', error: 'Phone number and OTP code are required.' });
      }

      const cleanPhone = String(phone).replace(/[^\d]/g, '');
      const phoneToUse = cleanPhone.length === 10 ? cleanPhone : (cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone);

      const otpRes = await pool.query(
        `SELECT otp_id, otp_hash, expires_at FROM otp_requests
         WHERE phone_number = $1
           AND purpose = 'customer_portal_login'
           AND is_used = FALSE
           AND tenant_id = $2
         ORDER BY created_at DESC
         LIMIT 1;`,
        [phoneToUse, tenantId]
      );

      if (otpRes.rows.length === 0) {
        return res.status(400).json({ status: 'fail', error: 'No active OTP code found for this number. Please request a new one.' });
      }

      const otpRecord = otpRes.rows[0];
      if (new Date(otpRecord.expires_at).getTime() <= Date.now()) {
        return res.status(400).json({ status: 'fail', error: 'This OTP code has expired. Please resend a new code.' });
      }

      const isMatch = await bcrypt.compare(String(otp).trim(), otpRecord.otp_hash);
      if (!isMatch) {
        return res.status(400).json({ status: 'fail', error: 'Invalid OTP code. You can clear and retype it, or resend a new code.' });
      }

      // Mark OTP as used
      await pool.query(`UPDATE otp_requests SET used_at = NOW(), is_used = TRUE WHERE otp_id = $1;`, [otpRecord.otp_id]);

      // ── Robust Customer Identification ──
      // Strategy: Try MULTIPLE lookup methods to reliably detect existing customers.
      //   1. Phone in customer_phones (exact 10-digit)
      //   2. Phone in customer_phones (with 91-prefix, flexible suffix match)
      //   3. Aadhaar hash in customers table
      //   4. Aadhaar plaintext in customers table (older AppSheet imports)
      // Only create new enrollment if ALL lookups fail.
      let customer = null;
      let isNewEnrollment = false;

      // ─── Strategy 1: Exact 10-digit phone match in customer_phones ───
      const phoneRes = await pool.query(
        `SELECT c.customer_id, c.customer_name AS name
         FROM customer_phones cp
         JOIN customers c ON cp.customer_id = c.customer_id AND cp.tenant_id = c.tenant_id
         WHERE cp.phone_number = $1 AND cp.tenant_id = $2 AND c.is_merged = FALSE
         LIMIT 1;`,
        [phoneToUse, tenantId]
      );
      if (phoneRes.rows.length > 0) {
        customer = phoneRes.rows[0];
      }

      // ─── Strategy 2: Flexible phone match (handles 91XXXXXXXXXX / +91XXXXXXXXXX stored formats) ───
      if (!customer) {
        const phoneWithCountry = `91${phoneToUse}`;
        const flexPhoneRes = await pool.query(
          `SELECT c.customer_id, c.customer_name AS name
           FROM customer_phones cp
           JOIN customers c ON cp.customer_id = c.customer_id AND cp.tenant_id = c.tenant_id
           WHERE (cp.phone_number = $1 OR cp.phone_number = $2 OR cp.phone_number = $3)
             AND cp.tenant_id = $4 AND c.is_merged = FALSE
           LIMIT 1;`,
          [phoneToUse, phoneWithCountry, `+${phoneWithCountry}`, tenantId]
        );
        if (flexPhoneRes.rows.length > 0) {
          customer = flexPhoneRes.rows[0];
        }
      }

      // ─── Strategy 3: Aadhaar hash match ───
      if (!customer && aadhaar_number && String(aadhaar_number).trim()) {
        const cleanAadhaar = String(aadhaar_number).replace(/[^\d]/g, '');
        if (/^\d{12}$/.test(cleanAadhaar)) {
          const aadhaarHash = hashIdentifier(cleanAadhaar);
          const aadhaarRes = await pool.query(
            `SELECT customer_id, customer_name AS name
             FROM customers
             WHERE aadhaar_hash = $1 AND tenant_id = $2 AND is_merged = FALSE
             LIMIT 1;`,
            [aadhaarHash, tenantId]
          );
          if (aadhaarRes.rows.length > 0) {
            customer = aadhaarRes.rows[0];
          }
        }
      }

      // ─── Strategy 4: Aadhaar plaintext match (older AppSheet data without hash) ───
      if (!customer && aadhaar_number && String(aadhaar_number).trim()) {
        const cleanAadhaar = String(aadhaar_number).replace(/[^\d]/g, '');
        if (/^\d{12}$/.test(cleanAadhaar)) {
          const aadhaarPlainRes = await pool.query(
            `SELECT customer_id, customer_name AS name
             FROM customers
             WHERE aadhaar_number = $1 AND tenant_id = $2 AND is_merged = FALSE
             LIMIT 1;`,
            [cleanAadhaar, tenantId]
          );
          if (aadhaarPlainRes.rows.length > 0) {
            customer = aadhaarPlainRes.rows[0];
          }
        }
      }

      // ─── Only create new customer if ALL lookups failed ───
      if (!customer) {
        isNewEnrollment = true;
        const cleanName = name ? String(name).trim() : 'Valued Customer';
        const cleanAadhaar = aadhaar_number ? String(aadhaar_number).replace(/[^\d]/g, '') : null;
        const newCust = await CustomerService.createCustomer({
          name: cleanName,
          phone_numbers: [phoneToUse],
          aadhaar_number: cleanAadhaar,
          visit_type: 'first_time',
          is_first_time_visitor: true,
          tenant_id: tenantId,
          explicit_customer_id: null,
          otp: String(otp).trim(),
          otp_verified: true,
        });
        customer = {
          customer_id: newCust.customer_id,
          name: newCust.customer_name || newCust.name || cleanName,
        };
      }

      // Asynchronously auto-sync enrolled customer details to Google Sheet (Sheet ID: 1qiBr8Jkmn9e9W_EuigvpN_4C7DcckP1q-YK25-BbOb0)
      const GoogleSheetsService = require('../services/googleSheets.service');
      GoogleSheetsService.syncCustomerToSheet({
        customer_id: customer.customer_id,
        name: customer.name || name,
        phone: phoneToUse,
        aadhaar_number: aadhaar_number || null,
        source: isNewEnrollment ? 'Customer Portal New Enrollment' : 'Customer Portal Login',
        tenant_id: tenantId,
      }).catch((gsErr) => console.error('[Google Sheets Sync Error]', gsErr.message || gsErr));

      // Generate JWT Token scoped to customer
      const token = jwt.sign(
        {
          customer_id: customer.customer_id,
          role: 'customer',
          name: customer.name,
          phone: phoneToUse,
          tenant_id: tenantId,
        },
        env.jwtSecret,
        { expiresIn: env.jwtExpiresIn || '30d' }
      );

      res.status(200).json({
        status: 'success',
        is_new_enrollment: isNewEnrollment,
        token,
        customer: {
          customer_id: customer.customer_id,
          name: customer.name,
          phone: phoneToUse,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /me — Returns logged-in customer's profile & balance overview
   */
  static async getMe(req, res, next) {
    try {
      const customerId = req.user.customer_id;
      const tenantId = req.tenantId || env.defaultTenantId;

      if (!customerId) {
        return res.status(403).json({ status: 'fail', error: 'Access denied. Customer portal token required.' });
      }

      // Fetch customer profile
      const custRes = await pool.query(
        `SELECT c.customer_id, c.customer_name AS name, c.created_at, c.aadhaar_number,
                COALESCE(cp.phone_number, '') AS phone
         FROM customers c
         LEFT JOIN customer_phones cp ON c.customer_id = cp.customer_id AND cp.tenant_id = c.tenant_id
         WHERE c.customer_id = $1 AND c.tenant_id = $2
         ORDER BY cp.is_verified DESC NULLS LAST
         LIMIT 1;`,
        [customerId, tenantId]
      );

      if (custRes.rows.length === 0) {
        return res.status(444).json({ status: 'fail', error: 'Customer account not found.' });
      }

      const cust = custRes.rows[0];

      // Fetch primary vehicle
      const vehRes = await pool.query(
        `SELECT brand_name, model, variant, registration_number
         FROM vehicles
         WHERE customer_id = $1 AND tenant_id = $2
         ORDER BY vehicle_id DESC
         LIMIT 1;`,
        [customerId, tenantId]
      );

      let vehicleStr = null;
      if (vehRes.rows.length > 0) {
        const v = vehRes.rows[0];
        const modelStr = [v.brand_name, v.model, v.variant].filter(Boolean).join(' ');
        const regStr = v.registration_number ? ` (${v.registration_number})` : '';
        vehicleStr = `${modelStr || 'Vehicle'}${regStr}`;
      }

      // Fetch points balance
      const balRes = await pool.query(
        `SELECT COALESCE(SUM(points), 0) AS balance
         FROM points_ledger
         WHERE customer_id = $1 AND tenant_id = $2;`,
        [customerId, tenantId]
      );

      const balance = parseInt(balRes.rows[0].balance || '0', 10);
      const redeemableValue = Math.max(0, Math.floor(balance / 4));

      // Count total transactions to determine if new customer
      const txnCountRes = await pool.query(
        `SELECT COUNT(*)::int AS total FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2;`,
        [customerId, tenantId]
      );
      const totalTransactions = txnCountRes.rows[0].total || 0;

      // Member since month/year — use actual created_at year
      const memberSince = cust.created_at
        ? new Date(cust.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      // Mask aadhaar: show only last 4 digits
      let aadhaarDisplay = null;
      if (cust.aadhaar_number && cust.aadhaar_number.length >= 4) {
        aadhaarDisplay = `XXXX-XXXX-${cust.aadhaar_number.slice(-4)}`;
      }

      res.status(200).json({
        name: cust.name || 'Valued Customer',
        phone: cust.phone || req.user.phone || '',
        aadhaar: aadhaarDisplay,
        vehicle: vehicleStr,
        memberSince,
        referralCode: cust.customer_id,
        balance,
        redeemableValue,
        isNewCustomer: balance === 0 && totalTransactions === 0,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /me/ledger — Returns cursor-paginated transaction activity ledger
   */
  static async getLedger(req, res, next) {
    try {
      const customerId = req.user.customer_id;
      const tenantId = req.tenantId || env.defaultTenantId;
      const cursor = req.query.cursor ? parseInt(req.query.cursor, 10) : null;
      const limit = 15;

      if (!customerId) {
        return res.status(403).json({ status: 'fail', error: 'Access denied. Customer portal token required.' });
      }

      let query = `
        SELECT entry_id AS id, type, transaction_category, points, source_ref AS reason, created_at AS date
        FROM points_ledger
        WHERE customer_id = $1 AND tenant_id = $2
      `;
      const queryParams = [customerId, tenantId];

      if (cursor) {
        query += ` AND entry_id < $3`;
        queryParams.push(cursor);
      }

      query += ` ORDER BY entry_id DESC LIMIT $${queryParams.length + 1};`;
      queryParams.push(limit + 1);

      const resRows = await pool.query(query, queryParams);
      const hasMore = resRows.rows.length > limit;
      const itemsRaw = hasMore ? resRows.rows.slice(0, limit) : resRows.rows;

      const items = itemsRaw.map((row) => {
        let type = 'purchase';
        const rawType = (row.type || '').toLowerCase();
        const rawCat = (row.transaction_category || '').toLowerCase();

        if (rawType === 'redeem' || row.points < 0) {
          type = 'redeem';
        } else if (rawCat.includes('insurance')) {
          type = 'insurance';
        } else if (rawCat.includes('finance')) {
          type = 'finance';
        } else if (rawCat.includes('exchange')) {
          type = 'exchange';
        } else if (rawCat.includes('referral') || rawType.includes('referral')) {
          type = 'referral';
        } else if (rawCat.includes('tnps') || rawCat.includes('survey')) {
          type = 'tnps';
        } else {
          type = 'purchase';
        }

        // Plain language reason text fallback (guarantees reason text next to number)
        let text = row.reason;
        if (!text || !text.trim()) {
          if (type === 'redeem') text = 'Redemption discount applied';
          else if (type === 'insurance') text = 'Insurance policy points credit';
          else if (type === 'finance') text = 'Vehicle finance transaction points';
          else if (type === 'exchange') text = 'Old vehicle exchange bonus points';
          else if (type === 'referral') text = 'Successful friend referral bonus';
          else if (type === 'tnps') text = 'Customer feedback survey reward';
          else text = 'Vehicle service & purchase loyalty reward';
        }

        const dateFormatted = row.date
          ? new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—';

        return {
          id: parseInt(row.id, 10),
          type,
          text,
          date: dateFormatted,
          points: parseInt(row.points, 10),
        };
      });

      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

      res.status(200).json({
        items,
        nextCursor,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CustomerPortalController;
