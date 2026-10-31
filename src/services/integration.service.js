const crypto = require('crypto');
const { pool } = require('../config/db');
const TransactionService = require('./transaction.service');
const RedemptionService = require('./redemption.service');
const PointsService = require('./points.service');
const RealBooksService = require('./realbooks/realbooks.service');
const { encrypt, decrypt, hashIdentifier, lastDigits } = require('../utils/crypto.util');

class IntegrationService {
  /**
   * 1. Health & Server Info
   */
  static async getHealth(apiClient) {
    const dbStart = Date.now();
    await pool.query('SELECT 1;');
    const dbLatencyMs = Date.now() - dbStart;

    return {
      status: 'healthy',
      app: 'Bellad & Company Automotive Loyalty Platform',
      version: '2.0.0-enterprise',
      client_name: apiClient?.name || 'Authorized Client',
      client_type: apiClient?.client_type || 'custom',
      scopes: apiClient?.scopes || [],
      tenant_id: apiClient?.tenant_id || 'bellad_and_company',
      database: {
        status: 'connected',
        latency_ms: dbLatencyMs,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 2. Comprehensive API Documentation Schema
   */
  static getDocs(baseUrl = '/api/v1/integration') {
    return {
      api_name: 'Bellad Loyalty Platform External Integration API',
      version: 'v1',
      description: 'Unified RESTful CRUD & Webhook API for DMS (Dealer Management Systems), RealBooks Accounting ERP, and AppSheet bots.',
      authentication: {
        method: 'API Key',
        headers: [
          'X-API-Key: <YOUR_API_KEY>',
          'Authorization: Bearer <YOUR_API_KEY>',
        ],
        seeded_keys: {
          dms: 'bac_live_dms_7f8a9b0c1d2e3f4a5b6c',
          realbooks: 'bac_live_realbooks_9c8b7a6d5e4f3a2b1c',
          appsheet: 'bac_live_appsheet_1a2b3c4d5e6f7a8b9c',
          master_admin: 'bac_live_master_bellad_loyalty_2026',
        },
      },
      endpoints: [
        {
          method: 'GET',
          path: `${baseUrl}/customers`,
          description: 'Search and list customer profiles, points balances, tier, and registered vehicles.',
          query_params: {
            search: 'Free-text search (Name, Phone, ID, Aadhaar)',
            phone: 'Exact 10-digit mobile number',
            customer_id: 'Bellad Customer ID (e.g. BAC-613E43F4)',
            limit: 'Results per page (default: 25, max: 100)',
            offset: 'Pagination offset (default: 0)',
          },
        },
        {
          method: 'GET',
          path: `${baseUrl}/customers/:id`,
          description: 'Fetch complete Customer 360 profile by Customer ID, Phone, or Aadhaar.',
        },
        {
          method: 'POST',
          path: `${baseUrl}/customers`,
          description: 'Create or auto-resolve customer profile (idempotent by phone number).',
          body: {
            customer_name: 'Mahesh Bhajantri',
            phone_number: '9986741971',
            aadhaar_number: 'XXXX-XXXX-3310 (optional)',
            address: 'Ward No 5, Mudhol',
            city: 'Bagalkot',
            state: 'Karnataka',
            pincode: '587313',
            branch_id: 1,
          },
        },
        {
          method: 'PUT',
          path: `${baseUrl}/customers/:id`,
          description: 'Update customer demographic details, addresses, and nominees.',
        },
        {
          method: 'POST',
          path: `${baseUrl}/transactions/invoice`,
          description: 'Ingest DMS/AppSheet invoice (Sale, Service, Bodyshop, Accessories). Auto-awards points via Master Rules.',
          body: {
            department: 'service', // "sale" | "service" | "accessory" | "bodyshop"
            invoice_number: 'INV-DMS-2026-901',
            invoice_date: '2026-10-31',
            bill_amount: 4500,
            customer_phone: '9986741971',
            customer_name: 'Mahesh Bhajantri',
            vehicle_registration: 'KA25MF4133',
            branch_id: 1,
            remarks: '2nd Periodic Service with Synthetic Oil',
          },
        },
        {
          method: 'POST',
          path: `${baseUrl}/transactions/redeem`,
          description: 'Cashier / DMS points redemption at counter (Burns points for bill discount).',
          body: {
            customer_phone: '9986741971',
            points_to_redeem: 2000, // Or amount_inr: 500
            department: 'service',
            invoice_number: 'INV-DMS-2026-901',
            branch_id: 1,
            remarks: 'Redemption applied at counter',
          },
        },
        {
          method: 'GET',
          path: `${baseUrl}/realbooks/feed`,
          description: 'Pull pending loyalty vouchers and redemption discounts for RealBooks ledger posting.',
        },
        {
          method: 'POST',
          path: `${baseUrl}/realbooks/ack`,
          description: 'Post acknowledgment confirming RealBooks ledger voucher creation.',
          body: {
            sync_ids: [101, 102],
            realbooks_voucher_no: 'RB-VOUCH-2026-88',
          },
        },
        {
          method: 'POST',
          path: `${baseUrl}/appsheet/webhook`,
          description: 'Bidirectional AppSheet webhook endpoint for live AppSheet row triggers.',
        },
      ],
    };
  }

  /**
   * 3. Customer Search & List
   */
  static async getCustomers({
    tenantId = 'bellad_and_company',
    search = '',
    phone = '',
    customerId = '',
    limit = 25,
    offset = 0,
  }) {
    let whereClauses = ['c.tenant_id = $1'];
    let queryParams = [tenantId];
    let pIdx = 2;

    if (customerId) {
      whereClauses.push(`c.customer_id = $${pIdx++}`);
      queryParams.push(customerId.trim());
    }

    if (phone) {
      const cleanPhone = phone.replace(/[^\d]/g, '');
      const p10 = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;
      whereClauses.push(
        `EXISTS (SELECT 1 FROM customer_phones cp WHERE cp.customer_id = c.customer_id AND cp.tenant_id = c.tenant_id AND (cp.phone_number = $${pIdx} OR cp.phone_number LIKE '%' || $${pIdx}))`
      );
      pIdx++;
      queryParams.push(p10);
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      whereClauses.push(`(
        c.customer_name ILIKE $${pIdx} 
        OR c.customer_id ILIKE $${pIdx}
        OR EXISTS (SELECT 1 FROM customer_phones cp WHERE cp.customer_id = c.customer_id AND cp.tenant_id = c.tenant_id AND cp.phone_number ILIKE $${pIdx})
        OR EXISTS (SELECT 1 FROM vehicles v WHERE v.customer_id = c.customer_id AND (v.registration_number ILIKE $${pIdx} OR v.chassis_no ILIKE $${pIdx}))
      )`);
      pIdx++;
      queryParams.push(s);
    }

    const whereSql = whereClauses.join(' AND ');

    // Total Count
    const countRes = await pool.query(
      `SELECT COUNT(c.customer_id) AS total FROM customers c WHERE ${whereSql};`,
      queryParams
    );
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    // Data query
    const selectSql = `
      SELECT 
        c.customer_id,
        c.customer_name,
        c.created_at,
        c.address,
        c.city,
        c.state,
        c.pincode,
        c.firm_name,
        c.branch_name,
        c.dms_invoice_number,
        c.dms_invoice_date,
        cp.phone_number,
        COALESCE((
          SELECT GREATEST(0, SUM(pl.points)) 
          FROM points_ledger pl 
          WHERE pl.customer_id = c.customer_id AND pl.tenant_id = c.tenant_id
        ), 0) AS points_balance,
        COALESCE((
          SELECT GREATEST(0, SUM(pl.points)) * 0.25 
          FROM points_ledger pl 
          WHERE pl.customer_id = c.customer_id AND pl.tenant_id = c.tenant_id
        ), 0) AS equivalent_inr,
        COALESCE((
          SELECT json_agg(json_build_object(
            'vehicle_id', v.vehicle_id,
            'registration_number', v.registration_number,
            'model', v.model,
            'chassis_no', v.chassis_no
          ))
          FROM vehicles v
          WHERE v.customer_id = c.customer_id
        ), '[]'::json) AS vehicles
      FROM customers c
      LEFT JOIN LATERAL (
        SELECT phone_number FROM customer_phones 
        WHERE customer_id = c.customer_id AND tenant_id = c.tenant_id 
        ORDER BY is_verified DESC, phone_id ASC 
        LIMIT 1
      ) cp ON true
      WHERE ${whereSql}
      ORDER BY c.created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++};
    `;

    queryParams.push(Math.min(parseInt(limit, 10) || 25, 100));
    queryParams.push(parseInt(offset, 10) || 0);

    const rowsRes = await pool.query(selectSql, queryParams);

    return {
      total,
      limit: parseInt(limit, 10) || 25,
      offset: parseInt(offset, 10) || 0,
      customers: rowsRes.rows.map((r) => ({
        customer_id: r.customer_id,
        customer_name: r.customer_name,
        phone_number: r.phone_number || 'N/A',
        points_balance: parseInt(r.points_balance || 0, 10),
        equivalent_inr: parseFloat(r.equivalent_inr || 0),
        tier: 'Silver', // Silver baseline
        vehicles: r.vehicles || [],
        address: r.address,
        city: r.city,
        state: r.state,
        pincode: r.pincode,
        branch_name: r.branch_name,
        created_at: r.created_at,
      })),
    };
  }

  /**
   * 4. Customer 360 Deep-Dive Profile
   */
  static async getCustomerById(identifier, tenantId = 'bellad_and_company') {
    if (!identifier) {
      throw { statusCode: 400, message: 'Customer identifier (ID or Phone) is required.' };
    }

    const cleanId = String(identifier).trim();
    const isPhone = /^[0-9+ -]{10,15}$/.test(cleanId);

    let custSql = `
      SELECT 
        c.*,
        cp.phone_number,
        COALESCE((
          SELECT GREATEST(0, SUM(pl.points)) 
          FROM points_ledger pl 
          WHERE pl.customer_id = c.customer_id AND pl.tenant_id = c.tenant_id
        ), 0) AS points_balance,
        COALESCE((
          SELECT GREATEST(0, SUM(pl.points)) * 0.25 
          FROM points_ledger pl 
          WHERE pl.customer_id = c.customer_id AND pl.tenant_id = c.tenant_id
        ), 0) AS equivalent_inr
      FROM customers c
      LEFT JOIN LATERAL (
        SELECT phone_number FROM customer_phones 
        WHERE customer_id = c.customer_id AND tenant_id = c.tenant_id 
        ORDER BY is_verified DESC, phone_id ASC 
        LIMIT 1
      ) cp ON true
      WHERE c.tenant_id = $1
    `;

    const params = [tenantId];
    if (isPhone) {
      const cleanPhone = cleanId.replace(/[^\d]/g, '');
      const p10 = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;
      custSql += ` AND EXISTS (SELECT 1 FROM customer_phones cp2 WHERE cp2.customer_id = c.customer_id AND cp2.tenant_id = c.tenant_id AND (cp2.phone_number = $2 OR cp2.phone_number LIKE '%' || $2)) LIMIT 1;`;
      params.push(p10);
    } else {
      custSql += ` AND c.customer_id = $2 LIMIT 1;`;
      params.push(cleanId);
    }

    const res = await pool.query(custSql, params);
    if (res.rows.length === 0) {
      throw { statusCode: 404, message: `Customer not found for identifier '${cleanId}'.` };
    }

    const c = res.rows[0];

    // Vehicles
    const vehRes = await pool.query(
      `SELECT vehicle_id, registration_number, chassis_no, vin, model, variant, purchase_date, branch_name
       FROM vehicles
       WHERE customer_id = $1 AND tenant_id = $2;`,
      [c.customer_id, tenantId]
    );

    // Recent 5 Ledger Entries
    const ledgerRes = await pool.query(
      `SELECT entry_id, created_at, type, transaction_category, points, receipt_no, source_ref
       FROM points_ledger
       WHERE customer_id = $1 AND tenant_id = $2
       ORDER BY entry_id DESC
       LIMIT 5;`,
      [c.customer_id, tenantId]
    );

    return {
      customer_id: c.customer_id,
      customer_name: c.customer_name,
      phone_number: c.phone_number,
      points_balance: parseInt(c.points_balance || 0, 10),
      equivalent_inr: parseFloat(c.equivalent_inr || 0),
      tier: 'Silver',
      aadhaar_number: c.aadhaar_number || 'N/A',
      address: c.address,
      city: c.city,
      state: c.state,
      pincode: c.pincode,
      email: c.email,
      firm_name: c.firm_name,
      branch_name: c.branch_name,
      nominee_name: c.nominee_name,
      nominee_relation: c.nominee_relation,
      dms_invoice_number: c.dms_invoice_number,
      dms_invoice_date: c.dms_invoice_date,
      vehicles: vehRes.rows,
      recent_transactions: ledgerRes.rows,
      created_at: c.created_at,
    };
  }

  /**
   * 5. Create or Auto-Resolve Customer (Idempotent by Phone)
   */
  static async createCustomer({
    customer_name,
    phone_number,
    aadhaar_number = null,
    address = null,
    city = 'Hubballi',
    state = 'Karnataka',
    pincode = null,
    email = null,
    firm_name = 'Bellad and company',
    branch_id = 1,
    branch_name = 'Bellad Hubli',
    nominee_name = null,
    nominee_relation = null,
    tenant_id = 'bellad_and_company',
  }) {
    if (!phone_number || !String(phone_number).trim()) {
      throw { statusCode: 400, message: 'phone_number is required.' };
    }

    const cleanDigits = String(phone_number).replace(/[^\d]/g, '');
    const p10 = cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits;
    if (p10.length !== 10) {
      throw { statusCode: 400, message: 'Valid 10-digit mobile number required.' };
    }

    const name = (customer_name || 'Valued Member').trim();

    // Check existing phone
    const existingPhoneRes = await pool.query(
      `SELECT customer_id FROM customer_phones WHERE phone_number = $1 AND tenant_id = $2 LIMIT 1;`,
      [p10, tenant_id]
    );

    if (existingPhoneRes.rows.length > 0) {
      const existingId = existingPhoneRes.rows[0].customer_id;
      return {
        status: 'exists',
        message: 'Customer already exists with this phone number.',
        customer: await this.getCustomerById(existingId, tenant_id),
      };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const custId = `BAC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      let aadhaarHash = null;
      let aadhaarLast4Enc = null;
      if (aadhaar_number) {
        aadhaarHash = hashIdentifier(aadhaar_number);
        aadhaarLast4Enc = encrypt(lastDigits(aadhaar_number, 4));
      }

      await client.query(
        `INSERT INTO customers (
          customer_id, tenant_id, customer_name, address, city, state, pincode, email,
          firm_name, branch_name, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
          nominee_name, nominee_relation, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, NOW(), NOW()
        );`,
        [
          custId,
          tenant_id,
          name,
          address,
          city,
          state,
          pincode,
          email,
          firm_name,
          branch_name,
          aadhaar_number,
          aadhaarHash,
          aadhaarLast4Enc,
          nominee_name,
          nominee_relation,
        ]
      );

      // Insert phone
      await client.query(
        `INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
         VALUES ($1, $2, true, $3);`,
        [custId, p10, tenant_id]
      );

      await client.query('COMMIT');

      return {
        status: 'created',
        message: 'Customer profile successfully created.',
        customer: await this.getCustomerById(custId, tenant_id),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 6. Update Customer Profile
   */
  static async updateCustomer(customerId, updateData, tenantId = 'bellad_and_company') {
    if (!customerId) {
      throw { statusCode: 400, message: 'customerId is required.' };
    }

    const allowedFields = [
      'customer_name',
      'email',
      'address',
      'city',
      'state',
      'pincode',
      'firm_name',
      'branch_name',
      'nominee_name',
      'nominee_relation',
      'gst_number',
      'party_type',
    ];

    const updates = [];
    const values = [customerId, tenantId];
    let pIdx = 3;

    for (const f of allowedFields) {
      if (updateData[f] !== undefined) {
        updates.push(`${f} = $${pIdx++}`);
        values.push(updateData[f]);
      }
    }

    if (updates.length === 0) {
      throw { statusCode: 400, message: 'No valid fields provided for update.' };
    }

    updates.push(`updated_at = NOW()`);

    const updateSql = `
      UPDATE customers 
      SET ${updates.join(', ')}
      WHERE customer_id = $1 AND tenant_id = $2
      RETURNING customer_id;
    `;

    const res = await pool.query(updateSql, values);
    if (res.rows.length === 0) {
      throw { statusCode: 404, message: `Customer '${customerId}' not found.` };
    }

    return {
      status: 'updated',
      message: 'Customer profile updated successfully.',
      customer: await this.getCustomerById(customerId, tenantId),
    };
  }

  /**
   * 7. Ingest Invoice & Process Points (DMS / AppSheet Core Bridge)
   */
  static async ingestInvoice({
    department = 'service', // "sale" | "service" | "accessory" | "bodyshop"
    invoice_number,
    invoice_date = new Date().toISOString(),
    bill_amount,
    customer_phone,
    customer_name,
    vehicle_registration,
    vehicle_model,
    branch_id = 1,
    remarks = '',
    tenant_id = 'bellad_and_company',
    created_by = 'dms_api',
  }) {
    if (!invoice_number) {
      throw { statusCode: 400, message: 'invoice_number is required.' };
    }
    if (!bill_amount || Number(bill_amount) <= 0) {
      throw { statusCode: 400, message: 'bill_amount must be a valid number greater than 0.' };
    }
    if (!customer_phone) {
      throw { statusCode: 400, message: 'customer_phone is required.' };
    }

    const cleanPhone = String(customer_phone).replace(/[^\d]/g, '');
    const p10 = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;

    // 1. Resolve or auto-enroll customer
    let custRes = await pool.query(
      `SELECT customer_id FROM customer_phones WHERE (phone_number = $1 OR phone_number LIKE '%' || $1) AND tenant_id = $2 LIMIT 1;`,
      [p10, tenant_id]
    );

    let customerId = null;
    if (custRes.rows.length === 0) {
      // Auto-create customer
      const created = await this.createCustomer({
        customer_name: customer_name || 'Valued Member',
        phone_number: p10,
        branch_id,
        tenant_id,
      });
      customerId = created.customer.customer_id;
    } else {
      customerId = custRes.rows[0].customer_id;
    }

    // 2. Resolve or link vehicle if registration provided
    let vehicleId = null;
    if (vehicle_registration && vehicle_registration.trim()) {
      const reg = vehicle_registration.trim().toUpperCase().replace(/\s+/g, '');
      const vehRes = await pool.query(
        `SELECT vehicle_id FROM vehicles WHERE registration_number = $1 AND tenant_id = $2 LIMIT 1;`,
        [reg, tenant_id]
      );
      if (vehRes.rows.length > 0) {
        vehicleId = vehRes.rows[0].vehicle_id;
      } else {
        // Register vehicle to this customer
        const insertVeh = await pool.query(
          `INSERT INTO vehicles (customer_id, registration_number, model, tenant_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING vehicle_id;`,
          [customerId, reg, vehicle_model || 'Vehicle', tenant_id]
        );
        vehicleId = insertVeh.rows[0].vehicle_id;
      }
    }

    const deptCategory = (department || 'service').toLowerCase();
    const isSale = deptCategory === 'sale';

    // 3. Delegate to TransactionService for idempotent processing and Master Rules calculation
    const activeSource = (created_by && String(created_by).toLowerCase().includes('appsheet')) ? 'appsheet_bot' : 'auto_dms';

    const syncResult = await TransactionService.syncTransaction({
      category: deptCategory,
      job_card_number: invoice_number,
      reference_id: invoice_number,
      bill_amount: Number(bill_amount),
      ex_showroom_price: isSale ? Number(bill_amount) : undefined,
      customer_id: customerId,
      phone_number: p10,
      vehicle_id: vehicleId,
      registration_number: vehicle_registration,
      branch_id,
      source: activeSource,
      created_by: null,
      tenant_id,
      is_invoice_finalized: true,
    });

    // 4. Get updated balance
    const balRes = await pool.query(
      `SELECT GREATEST(0, COALESCE(SUM(points), 0)) AS total_points FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2;`,
      [customerId, tenant_id]
    );
    const updatedBalance = parseInt(balRes.rows[0]?.total_points || 0, 10);

    return {
      status: 'success',
      invoice_number,
      customer_id: customerId,
      customer_phone: p10,
      bill_amount: Number(bill_amount),
      department: deptCategory,
      transaction_id: syncResult.transaction_id || syncResult.sale_id || syncResult.transaction?.id,
      points_credited: syncResult.ledger_entry?.points || syncResult.points_awarded || syncResult.points_calculated || 0,
      updated_points_balance: updatedBalance,
      updated_balance_inr: updatedBalance * 0.25,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 8. Redeem Points at Counter / Cashier (Burns Points for Discount)
   */
  static async redeemPoints({
    customer_phone,
    customer_id = null,
    points_to_redeem,
    amount_inr,
    department = 'service',
    invoice_number = 'DMS-REC-' + Date.now(),
    branch_id = 1,
    remarks = 'API Counter Redemption',
    tenant_id = 'bellad_and_company',
    created_by = 'dms_api',
  }) {
    let ptsToBurn = points_to_redeem ? parseInt(points_to_redeem, 10) : 0;
    if (!ptsToBurn && amount_inr) {
      ptsToBurn = Math.round(Number(amount_inr) * 4); // 4 points = ₹1
    }

    if (ptsToBurn <= 0) {
      throw { statusCode: 400, message: 'Valid points_to_redeem or amount_inr greater than zero is required.' };
    }

    const cleanPhone = customer_phone ? String(customer_phone).replace(/[^\d]/g, '') : null;
    const p10 = cleanPhone && cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;

    const result = await RedemptionService.redeemPoints({
      phone: p10,
      customer_id,
      points: ptsToBurn,
      category: department,
      receipt_no: invoice_number,
      branch_id,
      created_by: parseInt(created_by, 10) || null,
      tenant_id,
    });

    return {
      status: 'success',
      redemption_id: result.redemption?.id || result.redemption_code,
      redemption_code: result.redemption_code,
      customer_id: result.customer_id,
      points_redeemed: result.points_redeemed,
      discount_amount_inr: result.discount_applied || (result.points_redeemed * 0.25),
      remaining_points_balance: result.updated_total_balance,
      remaining_balance_inr: (result.updated_total_balance || 0) * 0.25,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 9. RealBooks Sync Feed (RealBooks ERP pulls pending records)
   */
  static async getRealBooksSyncFeed({ tenantId = 'bellad_and_company', limit = 50 }) {
    const res = await pool.query(
      `SELECT 
        sl.sync_id,
        sl.created_at,
        sl.entity_type,
        sl.entity_id AS reference_code,
        sl.api_status AS status,
        sl.retry_count,
        COALESCE(r.discount_amount, 0) AS discount_amount_rupees,
        r.points_redeemed,
        r.customer_id,
        c.customer_name,
        COALESCE(c.ledger_code, c.customer_id) AS customer_ledger_account,
        COALESCE(b.branch_name, 'Central Hubballi') AS branch_name
      FROM realbooks_sync_log sl
      LEFT JOIN redemptions r ON sl.entity_id = r.redemption_code AND sl.tenant_id = r.tenant_id
      LEFT JOIN customers c ON r.customer_id = c.customer_id AND r.tenant_id = c.tenant_id
      LEFT JOIN branches b ON r.branch_id = b.branch_id
      WHERE sl.tenant_id = $1 AND sl.api_status IN ('pending', 'failed')
      ORDER BY sl.sync_id ASC
      LIMIT $2;`,
      [tenantId, Math.min(parseInt(limit, 10) || 50, 100)]
    );

    return {
      pending_count: res.rows.length,
      feed: res.rows.map((r) => ({
        sync_id: r.sync_id,
        date: r.created_at,
        entity_type: r.entity_type,
        redemption_code: r.reference_code,
        customer_name: r.customer_name || 'Valued Member',
        customer_ledger_account: r.customer_ledger_account,
        branch: r.branch_name,
        debit_account: 'Automobile Loyalty Discount Expense',
        credit_account: r.customer_ledger_account,
        amount_inr: parseFloat(r.discount_amount_rupees || 0),
        points_burned: parseInt(r.points_redeemed || 0, 10),
      })),
    };
  }

  /**
   * 10. RealBooks Sync Acknowledgment
   */
  static async acknowledgeRealBooksSync({ sync_ids = [], realbooks_voucher_no = '', tenantId = 'bellad_and_company' }) {
    if (!Array.isArray(sync_ids) || sync_ids.length === 0) {
      throw { statusCode: 400, message: 'sync_ids array is required.' };
    }

    const res = await pool.query(
      `UPDATE realbooks_sync_log
       SET 
         api_status = 'synced',
         response_payload = jsonb_build_object(
           'realbooks_voucher_no', $1::text,
           'synced_at', NOW()
         ),
         updated_at = NOW()
       WHERE sync_id = ANY($2::int[]) AND tenant_id = $3
       RETURNING sync_id, entity_id, api_status;`,
      [realbooks_voucher_no || 'RB-ACK-' + Date.now(), sync_ids, tenantId]
    );

    return {
      status: 'acknowledged',
      acknowledged_count: res.rows.length,
      synced_records: res.rows,
    };
  }

  /**
   * 11. List Integration API Keys
   */
  static async listApiKeys(tenantId = 'bellad_and_company') {
    const res = await pool.query(
      `SELECT key_id, name, client_type, api_key_prefix, scopes, is_active, rate_limit_per_minute, last_used_at, created_at
       FROM integration_api_keys
       WHERE tenant_id = $1
       ORDER BY key_id ASC;`,
      [tenantId]
    );
    return res.rows;
  }

  /**
   * 12. Generate New Integration API Key
   */
  static async createApiKey({
    name,
    client_type = 'custom',
    scopes = ['read', 'write', 'redeem'],
    tenantId = 'bellad_and_company',
  }) {
    if (!name || !name.trim()) {
      throw { statusCode: 400, message: 'name is required (e.g. "Hyundai Dharwad DMS").' };
    }

    const prefix = `bac_live_${client_type.toLowerCase()}`;
    const secretPart = crypto.randomBytes(12).toString('hex');
    const fullApiKey = `${prefix}_${secretPart}`;

    const res = await pool.query(
      `INSERT INTO integration_api_keys (
        tenant_id, name, client_type, api_key, api_key_prefix, scopes, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
      RETURNING key_id, name, client_type, api_key, api_key_prefix, scopes, is_active, created_at;`,
      [tenantId, name.trim(), client_type.toLowerCase(), fullApiKey, prefix, scopes]
    );

    return res.rows[0];
  }

  /**
   * 13. Revoke / Deactivate API Key
   */
  static async revokeApiKey(keyId, tenantId = 'bellad_and_company') {
    const res = await pool.query(
      `UPDATE integration_api_keys
       SET is_active = false, updated_at = NOW()
       WHERE key_id = $1 AND tenant_id = $2
       RETURNING key_id, name, is_active;`,
      [keyId, tenantId]
    );
    if (res.rows.length === 0) {
      throw { statusCode: 404, message: 'API key not found.' };
    }
    return res.rows[0];
  }
}

module.exports = IntegrationService;
