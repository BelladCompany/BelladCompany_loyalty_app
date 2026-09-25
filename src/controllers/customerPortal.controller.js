const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const NotificationService = require('../services/notification.service');
const CustomerService = require('../services/customer.service');
const GiftCardService = require('../services/giftCard.service');
const ReferralService = require('../services/referral.service');
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

      // Insert new OTP first
      const insertRes = await pool.query(
        `INSERT INTO otp_requests (phone_number, otp_hash, purpose, expires_at, tenant_id)
         VALUES ($1, $2, 'customer_portal_login', NOW() + INTERVAL '5 minutes', $3)
         RETURNING otp_id AS id, expires_at;`,
        [phoneToUse, otpHash, tenantId]
      );
      const newOtpId = insertRes.rows[0].id;

      // Send WhatsApp OTP (or fallback in dev/test)
      const otpSendResult = await NotificationService.sendOtpNotification({
        phone: phoneToUse,
        otp,
        tenant_id: tenantId,
      });

      await pool.query(
        `UPDATE otp_requests SET is_used = TRUE, used_at = NOW()
         WHERE phone_number = $1 AND purpose = 'customer_portal_login' AND is_used = FALSE AND otp_id <> $2 AND tenant_id = $3;`,
        [phoneToUse, newOtpId, tenantId]
      );

      const expiresAt = new Date(insertRes.rows[0].expires_at);
      const expiresInSeconds = Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 1000));

      res.status(200).json({
        status: 'success',
        message: `OTP sent successfully. (Testing Mode Code: 123456 or ${otp})`,
        whatsapp_sent: Boolean(otpSendResult?.success),
        expires_in_seconds: expiresInSeconds,
        expires_at: expiresAt.toISOString(),
        debug_otp: otp,
        dummy_otp: '123456',
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
      const submittedOtp = String(otp).trim();

      // Master Test Bypass OTPs for convenient testing
      const isMasterTestOtp = ['123456', '999999'].includes(submittedOtp);

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

      let matchedOtpId = null;

      if (isMasterTestOtp) {
        if (otpRes.rows.length > 0) {
          matchedOtpId = otpRes.rows[0].otp_id;
        }
      } else {
        if (otpRes.rows.length === 0) {
          return res.status(400).json({ status: 'fail', error: 'No active OTP code found for this number. Please request a new one or use test code 123456.' });
        }

        const otpRecord = otpRes.rows[0];
        if (new Date(otpRecord.expires_at).getTime() <= Date.now()) {
          return res.status(400).json({ status: 'fail', error: 'This OTP code has expired. Please resend a new code or use test code 123456.' });
        }

        const isMatch = await bcrypt.compare(submittedOtp, otpRecord.otp_hash);
        if (!isMatch) {
          return res.status(400).json({ status: 'fail', error: 'Invalid OTP code. Please check and try again (or use test code 123456).' });
        }
        matchedOtpId = otpRecord.otp_id;
      }

      if (matchedOtpId) {
        await pool.query(`UPDATE otp_requests SET used_at = NOW(), is_used = TRUE WHERE otp_id = $1;`, [matchedOtpId]);
      }

      let customer = null;
      let isNewEnrollment = false;

      // Strategy 1: Exact 10-digit phone match
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

      // Strategy 2: Flexible phone match
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

      // Strategy 3: Aadhaar hash match
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

      // Strategy 4: Plaintext Aadhaar match
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

      // Create new customer if not found
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

      // Auto-sync customer to Google Sheet
      const GoogleSheetsService = require('../services/googleSheets.service');
      GoogleSheetsService.syncCustomerToSheet({
        customer_id: customer.customer_id,
        name: customer.name || name,
        phone: phoneToUse,
        aadhaar_number: aadhaar_number || null,
        source: isNewEnrollment ? 'Customer Portal New Enrollment' : 'Customer Portal Login',
        tenant_id: tenantId,
      }).catch((gsErr) => console.error('[Google Sheets Sync Error]', gsErr.message || gsErr));

      // Generate JWT Token
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

      const custRes = await pool.query(
        `SELECT c.customer_id, c.customer_name AS name, c.created_at, c.aadhaar_number,
                c.firm_name, c.branch_name, c.address, c.age,
                COALESCE(cp.phone_number, '') AS phone
         FROM customers c
         LEFT JOIN customer_phones cp ON c.customer_id = cp.customer_id AND cp.tenant_id = c.tenant_id
         WHERE c.customer_id = $1 AND c.tenant_id = $2
         ORDER BY cp.is_verified DESC NULLS LAST
         LIMIT 1;`,
        [customerId, tenantId]
      );

      if (custRes.rows.length === 0) {
        return res.status(404).json({ status: 'fail', error: 'Customer account not found.' });
      }

      const cust = custRes.rows[0];

      // Fetch vehicles with detailed pricing & discount breakdown
      const vehRes = await pool.query(
        `SELECT v.vehicle_id, v.brand_name, v.model, v.variant, v.fuel_type, v.registration_number,
                v.chassis_no AS vin, v.purchase_date, v.dms_invoice_date,
                FLOOR(COALESCE(v.ex_showroom_price, 0) / 100) AS gross_ex_showroom_price,
                COALESCE(st.dealer_cash_discount_paise, 0) / 100.0 AS dealer_cash_discount,
                COALESCE(st.emps_discount_paise, 0) / 100.0 AS emps_discount,
                COALESCE(st.oem_offers_amount_paise, 0) / 100.0 AS oem_offers_amount
         FROM vehicles v
         LEFT JOIN LATERAL (
           SELECT dealer_cash_discount_paise, emps_discount_paise, oem_offers_amount_paise
           FROM sale_transactions
           WHERE vehicle_id = v.vehicle_id AND tenant_id = v.tenant_id
           ORDER BY id DESC LIMIT 1
         ) st ON TRUE
         WHERE v.customer_id = $1 AND v.tenant_id = $2
         ORDER BY v.vehicle_id DESC;`,
        [customerId, tenantId]
      );

      const vehicles = vehRes.rows.map((v) => {
        const gross = Number(v.gross_ex_showroom_price || 0);
        const dealer = Number(v.dealer_cash_discount || 0);
        const emps = Number(v.emps_discount || 0);
        const oem = Number(v.oem_offers_amount || 0);
        const totalDiscounts = dealer + emps + oem;
        const netExShowroom = Math.max(0, gross - totalDiscounts);

        return {
          ...v,
          total_discounts: totalDiscounts,
          net_ex_showroom_price: netExShowroom,
          after_discount_price: netExShowroom,
        };
      });

      // Primary vehicle description
      let vehicleStr = null;
      if (vehicles.length > 0) {
        const primary = vehicles[0];
        const modelStr = [primary.brand_name, primary.model, primary.variant].filter(Boolean).join(' ');
        const regStr = primary.registration_number ? ` (${primary.registration_number})` : '';
        vehicleStr = `${modelStr || 'Vehicle'}${regStr}`;
      }

      // Fetch points balance
      const balRes = await pool.query(
        `SELECT COALESCE(SUM(points), 0) AS balance,
                COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) AS lifetime_points
         FROM points_ledger
         WHERE customer_id = $1 AND tenant_id = $2;`,
        [customerId, tenantId]
      );

      const balance = parseInt(balRes.rows[0].balance || '0', 10);
      const lifetimePoints = parseInt(balRes.rows[0].lifetime_points || '0', 10);
      const redeemableValue = Math.max(0, Math.floor(balance / 4));

      // Tier Calculation
      let currentTier = 'Silver';
      let nextTier = 'Gold';
      let nextTierPoints = 5000;
      let tierProgress = Math.min(100, Math.round((lifetimePoints / 5000) * 100));

      if (lifetimePoints >= 35000) {
        currentTier = 'Diamond';
        nextTier = 'Diamond (Top Tier)';
        nextTierPoints = 35000;
        tierProgress = 100;
      } else if (lifetimePoints >= 15000) {
        currentTier = 'Platinum';
        nextTier = 'Diamond';
        nextTierPoints = 35000;
        tierProgress = Math.min(100, Math.round(((lifetimePoints - 15000) / 20000) * 100));
      } else if (lifetimePoints >= 5000) {
        currentTier = 'Gold';
        nextTier = 'Platinum';
        nextTierPoints = 15000;
        tierProgress = Math.min(100, Math.round(((lifetimePoints - 5000) / 10000) * 100));
      }

      // Fetch In-House benefits summary
      const inhouseRes = await pool.query(
        `SELECT transaction_category, source_ref, reason_text
         FROM points_ledger
         WHERE customer_id = $1 AND tenant_id = $2 AND (source_ref ILIKE '%in-house%' OR reason_text ILIKE '%in-house%');`,
        [customerId, tenantId]
      );

      const inhouseServices = {
        finance_opted: inhouseRes.rows.some((r) => String(r.source_ref || r.reason_text).toLowerCase().includes('finance')),
        insurance_opted: inhouseRes.rows.some((r) => String(r.source_ref || r.reason_text).toLowerCase().includes('insurance')),
        exchange_opted: inhouseRes.rows.some((r) => String(r.source_ref || r.reason_text).toLowerCase().includes('exchange')),
      };

      // Fetch Gift Card Summary
      const giftCardsSummary = await GiftCardService.getCustomerGiftCards(customerId, tenantId);

      // Mask Aadhaar: show only last 4 digits
      let aadhaarDisplay = null;
      if (cust.aadhaar_number && cust.aadhaar_number.length >= 4) {
        aadhaarDisplay = `XXXX-XXXX-${cust.aadhaar_number.slice(-4)}`;
      }

      res.status(200).json({
        customer_id: cust.customer_id,
        name: cust.name || 'Valued Customer',
        phone: cust.phone || req.user.phone || '',
        aadhaar: aadhaarDisplay,
        aadhaar_full_available: !!cust.aadhaar_number,
        firm_name: cust.firm_name || 'Bellad & Company',
        branch_name: cust.branch_name || 'Main Showroom',
        address: cust.address || '',
        vehicle: vehicleStr,
        vehicles,
        memberSince: cust.created_at
          ? new Date(cust.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        referralCode: cust.customer_id,
        balance,
        lifetime_points: lifetimePoints,
        redeemableValue,
        tier: {
          current: currentTier,
          next: nextTier,
          next_points: nextTierPoints,
          progress_percentage: tierProgress,
        },
        inhouse_benefits: inhouseServices,
        gift_cards_summary: {
          total_cards: giftCardsSummary.cards.length,
          total_gift_balance: giftCardsSummary.total_gift_balance,
        },
        isNewCustomer: balance === 0 && lifetimePoints === 0,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /me/ledger — Returns transaction activity ledger with breakdown
   */
  static async getLedger(req, res, next) {
    try {
      const customerId = req.user.customer_id;
      const tenantId = req.tenantId || env.defaultTenantId;
      const cursor = req.query.cursor ? parseInt(req.query.cursor, 10) : null;
      const limit = 20;

      if (!customerId) {
        return res.status(403).json({ status: 'fail', error: 'Access denied. Customer portal token required.' });
      }

      let query = `
        SELECT entry_id AS id, type, transaction_category, points, amount_paise, source_ref, reason_type, reason_text, created_at AS date
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
        const reasonText = (row.reason_text || row.source_ref || '').toLowerCase();

        if (rawType === 'redeem' || row.points < 0) {
          type = 'redeem';
        } else if (reasonText.includes('in-house') || rawCat.includes('inhouse')) {
          if (reasonText.includes('finance')) type = 'inhouse_finance';
          else if (reasonText.includes('insurance')) type = 'inhouse_insurance';
          else if (reasonText.includes('exchange')) type = 'inhouse_exchange';
          else type = 'inhouse';
        } else if (rawCat.includes('insurance')) {
          type = 'insurance';
        } else if (rawCat.includes('finance')) {
          type = 'finance';
        } else if (rawCat.includes('exchange')) {
          type = 'exchange';
        } else if (rawCat.includes('referral') || rawType.includes('referral')) {
          type = 'referral';
        } else if (rawCat.includes('gift') || row.reason_type === 'gift_card_claim') {
          type = 'gift_card';
        } else if (rawCat.includes('service') || rawType.includes('service')) {
          type = 'service';
        } else {
          type = 'purchase';
        }

        let text = row.reason_text || row.source_ref || '';
        if (text.includes(' | ')) {
          text = text.split(' | ').slice(1).join(' | ').trim();
        }

        if (!text || !text.trim()) {
          if (type === 'redeem') text = 'Redemption discount applied';
          else if (type === 'inhouse_finance') text = 'In-house Finance Bonus Points';
          else if (type === 'inhouse_insurance') text = 'In-house Insurance Policy Bonus';
          else if (type === 'inhouse_exchange') text = 'In-house Vehicle Exchange Bonus';
          else if (type === 'referral') text = 'Friend Referral Bonus Reward';
          else if (type === 'gift_card') text = 'Digital Gift Card Claimed';
          else if (type === 'service') text = 'Workshop Service Loyalty Points';
          else text = 'Vehicle Purchase Points (After Discount)';
        }

        const dateFormatted = row.date
          ? new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—';

        return {
          id: parseInt(row.id, 10),
          type,
          text,
          date: dateFormatted,
          points: parseInt(row.points, 10),
          amount: row.amount_paise ? Number(row.amount_paise) / 100 : null,
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

  /**
   * GET /me/referrals — Returns customer's referrals & tracking status
   */
  static async getReferrals(req, res, next) {
    try {
      const customerId = req.user.customer_id;
      const tenantId = req.tenantId || env.defaultTenantId;

      if (!customerId) {
        return res.status(403).json({ status: 'fail', error: 'Customer token required.' });
      }

      const refSummary = await ReferralService.getReferralAnalytics(tenantId);
      const userReferrals = await ReferralService.getCustomerReferralSummary(customerId, tenantId);

      res.status(200).json({
        status: 'success',
        referral_code: customerId,
        referrals: userReferrals || [],
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /me/referrals/submit — Customer refers a friend directly from portal
   */
  static async submitReferral(req, res, next) {
    try {
      const customerId = req.user.customer_id;
      const tenantId = req.tenantId || env.defaultTenantId;
      const { referee_name, referee_phone, vehicle_model, notes } = req.body;

      if (!referee_name || !referee_phone) {
        return res.status(400).json({ status: 'fail', error: 'Friend name and phone number are required.' });
      }

      const result = await ReferralService.createReferralLead({
        referrer_customer_id: customerId,
        referee_name,
        referee_phone,
        vehicle_model,
        notes,
        tenant_id: tenantId,
      });

      res.status(201).json({
        status: 'success',
        message: 'Referral submitted successfully! You will earn bonus points once your friend completes purchase.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /me/gift-cards — Returns customer's digital gift cards
   */
  static async getMyGiftCards(req, res, next) {
    try {
      const customerId = req.user.customer_id;
      const tenantId = req.tenantId || env.defaultTenantId;

      if (!customerId) {
        return res.status(403).json({ status: 'fail', error: 'Customer token required.' });
      }

      const result = await GiftCardService.getCustomerGiftCards(customerId, tenantId);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /me/gift-cards/claim — Claim Gift Card code into points / account balance
   */
  static async claimGiftCard(req, res, next) {
    try {
      const customerId = req.user.customer_id;
      const tenantId = req.tenantId || env.defaultTenantId;
      const { card_number, pin_code } = req.body;

      if (!card_number || !pin_code) {
        return res.status(400).json({ status: 'fail', error: 'Card number and 4-digit Security PIN are required.' });
      }

      const result = await GiftCardService.claimGiftCardToPoints({
        card_number,
        pin_code,
        customer_id: customerId,
        cashier_id: null,
        tenant_id: tenantId,
      });

      res.status(200).json({
        status: 'success',
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CustomerPortalController;
