const { pool } = require('../config/db');
const { encrypt, decrypt, hashIdentifier, lastDigits } = require('../utils/crypto.util');
const TransactionService = require('./transaction.service');
const bcrypt = require('bcryptjs');
const NotificationService = require('./notification.service');

class CustomerService {
  /**
   * Request OTP for manual customer creation
   */
  static async requestCustomerCreationOtp({ phone, tenant_id }) {
    if (!phone || !String(phone).trim()) {
      throw { statusCode: 400, message: 'Phone number is required.' };
    }
    const cleanPhone = String(phone).trim().replace(/[^\d]/g, '');
    const phoneToUse = cleanPhone.length === 10 ? cleanPhone : (cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone);

    if (phoneToUse.length !== 10) {
      throw { statusCode: 400, message: 'Phone number must be a valid 10-digit number.' };
    }

    // Check if phone number is already registered to an existing customer
    const existingPhone = await pool.query(
      `SELECT customer_id FROM customer_phones WHERE phone_number = $1 AND tenant_id = $2 LIMIT 1;`,
      [phoneToUse, tenant_id]
    );
    if (existingPhone.rows.length > 0) {
      throw { statusCode: 409, message: 'This phone number is already registered to an existing customer.' };
    }

    // Rate limiting: max 5 OTP requests per hour per phone
    const rateCheck = await pool.query(
      `SELECT COUNT(*) AS count
       FROM otp_requests
       WHERE phone_number = $1 AND tenant_id = $2
         AND created_at > NOW() - INTERVAL '1 hour';`,
      [phoneToUse, tenant_id]
    );
    if (parseInt(rateCheck.rows[0].count, 10) >= 5) {
      throw { statusCode: 429, message: 'Too many OTP requests for this phone number. Please try again in an hour.' };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 8);

    await pool.query(
      `INSERT INTO otp_requests (phone_number, otp_hash, purpose, expires_at, tenant_id)
       VALUES ($1, $2, 'customer_creation', NOW() + INTERVAL '5 minutes', $3);`,
      [phoneToUse, otpHash, tenant_id]
    );

    // Send WhatsApp OTP
    const otpSendResult = await NotificationService.sendOtpNotification({
      phone: phoneToUse,
      otp,
      tenant_id,
    });

    const isDebugEnabled = process.env.NODE_ENV === 'development' && process.env.ENABLE_DEBUG_OTP === 'true';

    return {
      success: true,
      message: `OTP sent via WhatsApp to ${phoneToUse}.`,
      whatsapp_sent: otpSendResult.success,
      ...(isDebugEnabled && { debug_otp: otp }),
    };
  }

  /**
   * Creates a new customer with auto-generated BAC-100001 ID and links initial phone numbers
   */
  static async createCustomer({
    name,
    email,
    phone_numbers,
    vehicle,
    opening_points,
    aadhaar_number,
    age,
    firm_name,
    address,
    visit_type,
    is_first_time_visitor,
    created_by,
    tenant_id,
    explicit_customer_id,
    award_auto_sales_points = false,
    otp,
    otp_verified = false,
    gst_number,
    ledger_name,
    ledger_code,
    ledger_group,
    party_type,
    customer_type,
    gst_registration_type,
    state,
    city,
    pincode,
    vat_no,
    pan_no,
    service_tax_no,
    ecc_no,
  }) {
    // 1. Mandatory OTP verification for customer creation (unless created via automated AppSheet pull)
    const primaryPhone = Array.isArray(phone_numbers) && phone_numbers.length > 0 ? String(phone_numbers[0]).trim() : null;

    if (!explicit_customer_id && !otp_verified) {
      if (!otp || !String(otp).trim()) {
        throw { statusCode: 400, message: 'OTP verification is required to create a new customer.' };
      }
      if (!primaryPhone) {
        throw { statusCode: 400, message: 'Customer primary phone number is required.' };
      }

      const cleanPhone = primaryPhone.replace(/[^\d]/g, '');
      const phoneToUse = cleanPhone.length === 10 ? cleanPhone : (cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone);

      const otpRes = await pool.query(
        `SELECT otp_id, otp_hash FROM otp_requests
         WHERE phone_number = $1
           AND purpose = 'customer_creation'
           AND is_used = FALSE
           AND expires_at > NOW()
           AND tenant_id = $2
         ORDER BY created_at DESC
         LIMIT 1;`,
        [phoneToUse, tenant_id]
      );

      if (otpRes.rows.length === 0) {
        throw { statusCode: 400, message: 'Invalid or expired OTP. Please request a new OTP.' };
      }

      const otpRecord = otpRes.rows[0];
      const isMatch = await bcrypt.compare(String(otp).trim(), otpRecord.otp_hash);
      if (!isMatch) {
        throw { statusCode: 400, message: 'Invalid OTP code. Please check and try again.' };
      }

      // Mark OTP as used
      await pool.query(`UPDATE otp_requests SET used_at = NOW(), is_used = TRUE WHERE otp_id = $1;`, [otpRecord.otp_id]);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Process optional Aadhaar number (HMAC-SHA256 hash & AES encrypted last-4)
      let aadhaarHash = null;
      let aadhaarLast4Enc = null;
      let aadhaarLast4 = null;

      if (aadhaar_number && String(aadhaar_number).trim()) {
        const cleanAadhaar = String(aadhaar_number).trim();
        if (!/^\d{12}$/.test(cleanAadhaar)) {
          throw { statusCode: 400, message: 'Aadhaar number must be exactly 12 numeric digits.' };
        }

        aadhaarHash = hashIdentifier(cleanAadhaar);
        aadhaarLast4 = lastDigits(cleanAadhaar, 4);
        aadhaarLast4Enc = encrypt(aadhaarLast4);

        // Check if a customer with the same Aadhaar hash already exists for this tenant
        const dupRes = await client.query(
          `SELECT customer_id, customer_name FROM customers
           WHERE tenant_id = $1 AND aadhaar_hash = $2 AND is_merged = FALSE
           LIMIT 1;`,
          [tenant_id, aadhaarHash]
        );

        if (dupRes.rows.length > 0) {
          const existing = dupRes.rows[0];
          throw {
            statusCode: 409,
            message: `Aadhaar number is already registered to ${existing.customer_name} (${existing.customer_id}).`,
          };
        }
      }

      const cleanAadhaarStr = aadhaar_number && String(aadhaar_number).trim() ? String(aadhaar_number).trim() : null;
      const cleanGst = gst_number && String(gst_number).trim() ? String(gst_number).trim() : null;
      const cleanAge = age ? parseInt(age, 10) : null;
      const cleanFirm = firm_name ? String(firm_name).trim() : null;
      const cleanAddress = address ? String(address).trim() : null;
      const cleanVisitType = visit_type ? String(visit_type).trim() : 'first_time';
      const cleanIsFirstTime = typeof is_first_time_visitor === 'boolean' ? is_first_time_visitor : cleanVisitType === 'first_time';

      const cleanLedgerName = ledger_name ? String(ledger_name).trim() : null;
      const cleanLedgerCode = ledger_code ? String(ledger_code).trim() : null;
      const cleanLedgerGroup = ledger_group ? String(ledger_group).trim() : null;
      const cleanPartyType = party_type ? String(party_type).trim() : null;
      const cleanCustomerType = customer_type ? String(customer_type).trim() : null;
      const cleanGstRegType = gst_registration_type ? String(gst_registration_type).trim() : null;
      const cleanState = state ? String(state).trim() : null;
      const cleanCity = city ? String(city).trim() : null;
      const cleanPincode = pincode ? String(pincode).trim() : null;
      const cleanVat = vat_no ? String(vat_no).trim() : null;
      const cleanPan = pan_no ? String(pan_no).trim() : null;
      const cleanServiceTax = service_tax_no ? String(service_tax_no).trim() : null;
      const cleanEcc = ecc_no ? String(ecc_no).trim() : null;

      // 1. Insert customer (supporting explicit customer_id from AppSheet like BAC-E0122437)
      let customerRes;
      if (explicit_customer_id) {
        customerRes = await client.query(
          `INSERT INTO customers (
             customer_id, customer_name, aadhaar_hash, aadhaar_last4_enc, aadhaar_number, gst_number, age, firm_name, address, visit_type, is_first_time_visitor, tenant_id,
             ledger_name, ledger_code, ledger_group, party_type, customer_type, gst_registration_type, state, city, pincode, vat_no, pan_no, service_tax_no, ecc_no
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
           ON CONFLICT (customer_id) DO UPDATE SET customer_name = EXCLUDED.customer_name
           RETURNING customer_id, customer_name AS name, NULL::text AS email, tenant_id, created_at, updated_at;`,
          [
            explicit_customer_id, name, aadhaarHash, aadhaarLast4Enc, cleanAadhaarStr, cleanGst, cleanAge, cleanFirm, cleanAddress, cleanVisitType, cleanIsFirstTime, tenant_id,
            cleanLedgerName, cleanLedgerCode, cleanLedgerGroup, cleanPartyType, cleanCustomerType, cleanGstRegType, cleanState, cleanCity, cleanPincode, cleanVat, cleanPan, cleanServiceTax, cleanEcc
          ]
        );
      } else {
        customerRes = await client.query(
          `INSERT INTO customers (
             customer_name, aadhaar_hash, aadhaar_last4_enc, aadhaar_number, gst_number, age, firm_name, address, visit_type, is_first_time_visitor, tenant_id,
             ledger_name, ledger_code, ledger_group, party_type, customer_type, gst_registration_type, state, city, pincode, vat_no, pan_no, service_tax_no, ecc_no
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
           RETURNING customer_id, customer_name AS name, NULL::text AS email, tenant_id, created_at, updated_at;`,
          [
            name, aadhaarHash, aadhaarLast4Enc, cleanAadhaarStr, cleanGst, cleanAge, cleanFirm, cleanAddress, cleanVisitType, cleanIsFirstTime, tenant_id,
            cleanLedgerName, cleanLedgerCode, cleanLedgerGroup, cleanPartyType, cleanCustomerType, cleanGstRegType, cleanState, cleanCity, cleanPincode, cleanVat, cleanPan, cleanServiceTax, cleanEcc
          ]
        );
      }

      const customer = {
        ...customerRes.rows[0],
        aadhaar_last4: aadhaarLast4,
      };

      // 2. Insert phone numbers linked to the new customer_id
      // DB NOTE: customer_phones.id -> phone_id, is_primary -> is_verified, created_at -> added_at
      const phoneRows = [];
      for (let i = 0; i < phone_numbers.length; i++) {
        const isPrimary = i === 0;
        const phoneRes = await client.query(
          `INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
           VALUES ($1, $2, $3, $4)
           RETURNING phone_id AS id, customer_id, phone_number, is_verified AS is_primary, added_at AS created_at;`,
          [customer.customer_id, phone_numbers[i], isPrimary, tenant_id]
        );
        phoneRows.push(phoneRes.rows[0]);
      }

      // 3. Optionally insert vehicle record
      let vehicleRow = null;
      if (
        vehicle &&
        (vehicle.registration_number ||
          vehicle.chassis_no ||
          vehicle.vin ||
          vehicle.model ||
          vehicle.variant ||
          vehicle.brand_name ||
          vehicle.branch_name ||
          vehicle.fuel_type ||
          vehicle.vehicle_city ||
          vehicle.firm_name)
      ) {
        const chassisNo = vehicle.registration_number || vehicle.chassis_no || vehicle.vin || null;
        // ex_showroom_price stored in paise (rupees * 100) for integer precision
        const exShowroomPaise = vehicle.ex_showroom_price
          ? Math.round(Number(vehicle.ex_showroom_price) * 100)
          : null;

        const vehRes = await client.query(
          `INSERT INTO vehicles (
             customer_id, brand_id, chassis_no, registration_number, model, variant,
             brand_name, branch_name, fuel_type, vehicle_city, firm_name,
             purchase_date, ex_showroom_price, tenant_id
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING vehicle_id AS id, registration_number, chassis_no AS vin, model, variant,
                     brand_name, branch_name, fuel_type, purchase_date, ex_showroom_price, vehicle_city, created_at;`,
          [
            customer.customer_id,
            vehicle.brand_id || null,
            chassisNo,
            vehicle.registration_number || null,
            vehicle.model || null,
            vehicle.variant || null,
            vehicle.brand_name || null,
            vehicle.branch_name || null,
            vehicle.fuel_type || null,
            vehicle.vehicle_city || null,
            vehicle.firm_name || cleanFirm || null,
            vehicle.purchase_date || null,
            exShowroomPaise,
            tenant_id,
          ]
        );
        vehicleRow = vehRes.rows[0];
      }

      // 4. Record vehicle sales points automatically ONLY IF award_auto_sales_points is true (e.g. from VIN Order Form pull job)
      const explicitOpeningPts = parseInt(opening_points || '0', 10);
      let calculatedSalesPoints = 0;

      if (award_auto_sales_points) {
        if (vehicleRow && vehicleRow.ex_showroom_price) {
          const exRupees = Math.floor(Number(vehicleRow.ex_showroom_price) / 100);
          calculatedSalesPoints = Math.floor(exRupees / 100); // 1 point per ₹100 ex-showroom price
        } else if (vehicle) {
          const is2W = vehicle.vehicle_type === '2W' || /ather|hero|vida|scooter|bike|2w/i.test(vehicle.model || '');
          calculatedSalesPoints = is2W ? 1250 : 10000;
        }
      }

      const totalInitialPoints = Math.max(explicitOpeningPts, calculatedSalesPoints);

      if (totalInitialPoints > 0) {
        // Requires a branch_id — use the first available branch for this tenant as a fallback
        const branchRes = await client.query(
          `SELECT branch_id FROM branches WHERE tenant_id = $1 ORDER BY branch_id ASC LIMIT 1;`,
          [tenant_id]
        );
        const branchId = branchRes.rows[0]?.branch_id || 1;

        await client.query(
          `INSERT INTO points_ledger (
             customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, cashier_id, tenant_id
           )
           VALUES ($1, $2, $3, 'earn_sale', 'sale', $4, $5, $6, $7);`,
          [
            customer.customer_id,
            vehicleRow?.id || null,
            branchId,
            totalInitialPoints,
            'Auto-calculated Vehicle Sales Points (Ex-Showroom)',
            created_by || null,
            tenant_id,
          ]
        );

        // Also upsert customer_tier_snapshot
        await client.query(
          `INSERT INTO customer_tier_snapshot (customer_id, current_tier, lifetime_points, tenant_id, updated_at)
           VALUES ($1, 'Silver', $2, $3, NOW())
           ON CONFLICT (customer_id) DO UPDATE
             SET lifetime_points = EXCLUDED.lifetime_points, updated_at = NOW();`,
          [customer.customer_id, totalInitialPoints, tenant_id]
        );
      }

      await client.query('COMMIT');

      return {
        ...customer,
        phones: phoneRows,
        vehicles: vehicleRow ? [vehicleRow] : [],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
  /**
   * Look up referring customer profile by referral code (customer_id or phone)
   */
  static async getCustomerByReferralCode(code, tenantId) {
    if (!code || typeof code !== 'string') {
      throw { statusCode: 400, message: 'Referral code is required.' };
    }

    const cleanCode = code.trim();
    const phoneDigits = cleanCode.replace(/\D/g, '');

    // 1. Search by customer_id (e.g. BAC-100001, BAC-API2)
    let res = await pool.query(
      `SELECT c.customer_id, c.customer_name AS name, c.aadhaar_number, p.phone_number
       FROM customers c
       LEFT JOIN customer_phones p ON c.customer_id = p.customer_id AND p.is_verified = TRUE
       WHERE c.tenant_id = $1 AND (c.customer_id ILIKE $2 OR c.customer_id ILIKE ('BAC-' || $2))
       LIMIT 1;`,
      [tenantId, cleanCode]
    );

    // 2. If not found by customer_id, search by phone number
    if (res.rows.length === 0 && phoneDigits.length >= 8) {
      res = await pool.query(
        `SELECT c.customer_id, c.customer_name AS name, c.aadhaar_number, p.phone_number
         FROM customer_phones p
         JOIN customers c ON p.customer_id = c.customer_id
         WHERE p.tenant_id = $1 AND p.phone_number = $2
         LIMIT 1;`,
        [tenantId, phoneDigits]
      );
    }

    if (res.rows.length === 0) {
      throw { statusCode: 404, message: `Invalid referral code. No customer found matching '${cleanCode}'.` };
    }

    return {
      customer_id: res.rows[0].customer_id,
      customer_name: res.rows[0].name,
      phone_number: res.rows[0].phone_number || '',
      aadhaar_number: res.rows[0].aadhaar_number || null,
    };
  }

  /**
   * Retrieves a full customer profile with all linked phones and vehicles
   */
  static async getCustomerById(customerId, tenantId) {
    const customerRes = await pool.query(
      `SELECT customer_id, customer_name AS name, age, address, firm_name, firm_name AS firm, email,
              branch_name, branch_name AS branch, branch_address, dms_invoice_number, dms_invoice_date,
              sales_consultant, aadhaar_last4_enc, tenant_id, created_at, updated_at
       FROM customers
       WHERE customer_id = $1 AND tenant_id = $2;`,
      [customerId, tenantId]
    );

    if (customerRes.rows.length === 0) {
      // Fallback: If customer is from AppSheet and not yet in PostgreSQL, sync customer on demand
      try {
        const AppSheetSearchService = require('./appsheetSearch.service');
        const AppSheetPullService = require('./appsheetPull.service');
        const rawId = customerId.replace(/^BAC-/i, '');
        const appMatches = await AppSheetSearchService.searchPrDoneCustomers(rawId, 5);
        if (appMatches.length > 0) {
          const matchedAppCust = appMatches[0];
          // Auto sync this customer to PostgreSQL with explicit customerId
          const cleanPhone = matchedAppCust.phones[0]?.phone_number || '';
          const rowData = {
            'Customer Name': matchedAppCust.name,
            'Customer Number': cleanPhone,
            'VIN Number': matchedAppCust.vehicles[0]?.vin,
            'Reg Number': matchedAppCust.vehicles[0]?.registration_number,
            'Model': matchedAppCust.vehicles[0]?.model,
            'Brand': matchedAppCust.vehicles[0]?.brand,
            'Branch': matchedAppCust.branch,
            'Total Vehicle Billing Amount': matchedAppCust.vehicles[0]?.ex_showroom_price,
            'Order Unique ID': rawId,
          };
          
          await AppSheetPullService.resolveOrCreateCustomer(rowData, tenantId, customerId);

          // Re-query PostgreSQL after auto-sync
          const retryRes = await pool.query(
            `SELECT customer_id, customer_name AS name, NULL::text AS email, address, gst_number, nominee_name, nominee_relation, firm_name, age, aadhaar_last4_enc, tenant_id, created_at, updated_at
             FROM customers
             WHERE customer_id = $1 AND tenant_id = $2;`,
            [customerId, tenantId]
          );

          if (retryRes.rows.length > 0) {
            const row = retryRes.rows[0];
            const phonesRes = await pool.query(
              `SELECT phone_id AS id, phone_number, is_verified AS is_primary, added_at AS created_at
               FROM customer_phones WHERE customer_id = $1 AND tenant_id = $2 ORDER BY is_verified DESC, phone_id ASC;`,
              [customerId, tenantId]
            );
            const vehiclesRes = await pool.query(
              `SELECT v.vehicle_id AS id, v.brand_id, b.brand_name AS brand_name,
                      v.chassis_no AS registration_number, v.chassis_no AS vin, v.chassis_no,
                      v.model, v.purchase_date, v.ex_showroom_price, v.vehicle_city, v.created_at
               FROM vehicles v LEFT JOIN brands b ON v.brand_id = b.brand_id
               WHERE v.customer_id = $1 AND v.tenant_id = $2 ORDER BY v.vehicle_id ASC;`,
              [customerId, tenantId]
            );

            // Also auto-create vehicle if PostgreSQL vehicle list is empty
            if (vehiclesRes.rows.length === 0 && matchedAppCust.vehicles?.length > 0) {
              const rowData = {
                'Customer Name': matchedAppCust.name,
                'Customer Number': cleanPhone,
                'VIN Number': matchedAppCust.vehicles[0]?.vin,
                'Reg Number': matchedAppCust.vehicles[0]?.registration_number,
                'Model': matchedAppCust.vehicles[0]?.model,
                'Brand': matchedAppCust.vehicles[0]?.brand,
                'Branch': matchedAppCust.branch,
                'Total Vehicle Billing Amount': matchedAppCust.vehicles[0]?.ex_showroom_price,
                'Order Unique ID': rawId,
              };
              await AppSheetPullService.resolveOrCreateVehicle(rowData, customerId, tenantId);
              
              // Also sync transaction to grant points
              await TransactionService.syncTransaction({
                category: 'sale',
                job_card_number: rawId,
                reference_id: rawId,
                bill_amount: matchedAppCust.vehicles[0]?.ex_showroom_price || 0,
                customer_id: customerId,
                registration_number: matchedAppCust.vehicles[0]?.vin,
                branch_id: 1,
                source: 'appsheet_bot',
                tenant_id: tenantId,
              }).catch((e) => console.warn('[AutoSync Tx Warning]', e.message || e));
            }

            const pointsRes = await pool.query(
              `SELECT COALESCE(SUM(points), 0) AS total_points FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2;`,
              [customerId, tenantId]
            );
            const livePoints = parseInt(pointsRes.rows[0]?.total_points || '0', 10) || matchedAppCust.points_balance || 0;

            const finalVehicles = vehiclesRes.rows.length > 0 ? vehiclesRes.rows : matchedAppCust.vehicles;

            return {
              customer_id: row.customer_id,
              name: row.name,
              customer_name: row.name,
              email: row.email,
              tenant_id: row.tenant_id,
              created_at: row.created_at,
              updated_at: row.updated_at,
              phones: phonesRes.rows.length > 0 ? phonesRes.rows : matchedAppCust.phones,
              vehicles: finalVehicles,
              points_balance: livePoints,
              lifetime_points: livePoints,
              current_tier: livePoints >= 10000 ? 'Gold' : livePoints >= 5000 ? 'Silver' : 'Bronze',
              billing_status: matchedAppCust.billing_status || 'PR Done',
            };
          }

          matchedAppCust.customer_id = customerId;
          return matchedAppCust;
        }
      } catch (fallbackErr) {
        console.error('[CustomerService AppSheet Fallback Warning]', fallbackErr.message || fallbackErr);
      }
      const customerRes = await pool.query(
      `SELECT customer_id, customer_name AS name, age, aadhaar_number, address, firm_name, firm_name AS firm, email,
              branch_name, branch_name AS branch, branch_address, dms_invoice_number, dms_invoice_date,
              sales_consultant, aadhaar_last4_enc, tenant_id, created_at, updated_at
       FROM customers
       WHERE customer_id = $1 AND tenant_id = $2;`,
      [customerId, tenantId]
    );

    if (customerRes.rows.length === 0) {
      return null;
    }
    }




    const row = customerRes.rows[0];
    let aadhaarLast4 = null;
    if (row.aadhaar_last4_enc) {
      try {
        aadhaarLast4 = decrypt(row.aadhaar_last4_enc);
      } catch (e) {
        aadhaarLast4 = null;
      }
    }

    const customer = {
      customer_id: row.customer_id,
      name: row.name || row.customer_name,
      customer_name: row.name || row.customer_name,
      age: row.age || null,
      aadhaar_number: row.aadhaar_number || (aadhaarLast4 ? `XXXX-XXXX-${aadhaarLast4}` : null),
      aadhaar_last4: aadhaarLast4,
      address: row.address || null,
      firm: row.firm_name || row.firm || null,
      firm_name: row.firm_name || row.firm || null,
      email: row.email || null,
      branch: row.branch_name || row.branch || '',
      branch_name: row.branch_name || row.branch || '',
      branch_address: row.branch_address || null,
      dms_invoice_number: row.dms_invoice_number || '',
      dms_invoice_date: row.dms_invoice_date || '',
      sales_consultant: row.sales_consultant || '',
      tenant_id: row.tenant_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    const phonesRes = await pool.query(
      `SELECT phone_id AS id, phone_number, is_verified AS is_primary, added_at AS created_at
       FROM customer_phones
       WHERE customer_id = $1 AND tenant_id = $2
       ORDER BY is_verified DESC, phone_id ASC;`,
      [customerId, tenantId]
    );

    const vehiclesRes = await pool.query(
      `SELECT v.vehicle_id AS id, v.brand_id,
              COALESCE(v.brand_name, b.brand_name, 'Hero/Hyundai/Swaraj') AS brand_name,
              COALESCE(v.brand_name, b.brand_name, 'Hero/Hyundai/Swaraj') AS brand,
              COALESCE(v.registration_number, v.chassis_no, '') AS registration_number,
              COALESCE(v.registration_number, v.chassis_no, '') AS reg_no,
              COALESCE(v.vin, v.chassis_no, '') AS vin,
              v.chassis_no,
              COALESCE(v.model, 'Vehicle') AS model,
              COALESCE(v.variant, '') AS variant,
              COALESCE(v.variant, '') AS varient,
              COALESCE(v.fuel_type, '') AS fuel_type,
              COALESCE(v.firm_name, '') AS firm_name,
              COALESCE(v.firm_name, '') AS firm,
              COALESCE(v.branch_name, '') AS branch_name,
              COALESCE(v.branch_name, '') AS branch,
              v.branch_address,
              v.dms_invoice_number, v.dms_invoice_date, v.sales_consultant,
              v.purchase_date,
              v.ex_showroom_price AS ex_showroom_price_paise,
              FLOOR(COALESCE(v.ex_showroom_price, 0) / 100) AS ex_showroom_price,
              v.vehicle_city, v.created_at
       FROM vehicles v
       LEFT JOIN brands b ON v.brand_id = b.brand_id
       WHERE v.customer_id = $1 AND v.tenant_id = $2
       ORDER BY v.vehicle_id ASC;`,
      [customerId, tenantId]
    );

    let finalVehicles = vehiclesRes.rows;

    // Check points ledger balance
    const pointsRes = await pool.query(
      `SELECT COALESCE(SUM(points), 0) AS total_points FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2;`,
      [customerId, tenantId]
    );
    const livePoints = parseInt(pointsRes.rows[0]?.total_points || '0', 10);

    return {
      ...customer,
      phones: phonesRes.rows,
      vehicles: finalVehicles,
      points_balance: livePoints,
      lifetime_points: livePoints,
      current_tier: livePoints >= 10000 ? 'Gold' : livePoints >= 5000 ? 'Silver' : 'Bronze',
      billing_status: 'PR Done',
      pr_status: 'PR Done',
    };
  }


  /**
   * Lists customers with pagination
   */
  static async listCustomers(tenantId, limit = 20, offset = 0) {
    const res = await pool.query(
      `SELECT c.customer_id, c.customer_name AS name, NULL::text AS email, c.tenant_id, c.created_at,
              COALESCE(
                json_agg(
                  json_build_object('id', cp.phone_id, 'phone_number', cp.phone_number, 'is_primary', cp.is_verified)
                ) FILTER (WHERE cp.phone_id IS NOT NULL), '[]'
              ) as phones
       FROM customers c
       LEFT JOIN customer_phones cp ON c.customer_id = cp.customer_id AND cp.tenant_id = c.tenant_id
       WHERE c.tenant_id = $1
       GROUP BY c.customer_id
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3;`,
      [tenantId, limit, offset]
    );

    return res.rows;
  }

  /**
   * Updates basic customer info (name, email)
   * DB NOTE: email is no longer persisted (column removed); the value is accepted for API
   * compatibility but silently ignored.
   */
  static async updateCustomer(customerId, { name, email }, tenantId) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`customer_name = $${idx++}`);
      values.push(name);
    }

    if (fields.length === 0) {
      return this.getCustomerById(customerId, tenantId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(customerId, tenantId);

    const res = await pool.query(
      `UPDATE customers
       SET ${fields.join(', ')}
       WHERE customer_id = $${idx++} AND tenant_id = $${idx++}
       RETURNING customer_id, customer_name AS name, NULL::text AS email, tenant_id, created_at, updated_at;`,
      values
    );

    if (res.rows.length === 0) return null;
    return this.getCustomerById(customerId, tenantId);
  }

  /**
   * Adds a new phone number to an existing customer
   */
  static async addPhone(customerId, { phone_number, is_primary = false }, tenantId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify customer exists
      const custCheck = await client.query(
        `SELECT customer_id FROM customers WHERE customer_id = $1 AND tenant_id = $2;`,
        [customerId, tenantId]
      );
      if (custCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      if (is_primary) {
        await client.query(
          `UPDATE customer_phones SET is_verified = FALSE WHERE customer_id = $1 AND tenant_id = $2;`,
          [customerId, tenantId]
        );
      }

      const res = await client.query(
        `INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
         VALUES ($1, $2, $3, $4)
         RETURNING phone_id AS id, customer_id, phone_number, is_verified AS is_primary, added_at AS created_at;`,
        [customerId, phone_number, is_primary, tenantId]
      );

      await client.query('COMMIT');
      return res.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Deletes a phone number from a customer
   */
  static async removePhone(customerId, phoneId, tenantId) {
    const res = await pool.query(
      `DELETE FROM customer_phones
       WHERE phone_id = $1 AND customer_id = $2 AND tenant_id = $3
       RETURNING phone_id AS id;`,
      [phoneId, customerId, tenantId]
    );
    return res.rowCount > 0;
  }

  /**
   * Deletes customer (admin only)
   */
  static async deleteCustomer(customerId, tenantId) {
    const res = await pool.query(
      `DELETE FROM customers WHERE customer_id = $1 AND tenant_id = $2 RETURNING customer_id;`,
      [customerId, tenantId]
    );
    return res.rowCount > 0;
  }
}

module.exports = CustomerService;
