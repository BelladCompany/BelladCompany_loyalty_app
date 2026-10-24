const { pool } = require('../config/db');
const MergeService = require('../services/merge.service');
const RealBooksService = require('../services/realbooks/realbooks.service');

class AdminController {
  /**
   * Get duplicate candidate customer pairs queue
   */
  static async getDuplicateQueue(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const candidates = await MergeService.detectDuplicates(tenantId);

      res.status(200).json({
        status: 'success',
        count: candidates.length,
        data: candidates,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve and execute customer merge
   */
  static async approveMerge(req, res, next) {
    try {
      const { surviving_customer_id, merged_customer_id, reason } = req.body;
      const tenantId = req.tenantId;
      const adminUserId = req.user.id;

      const result = await MergeService.executeMerge({
        surviving_customer_id,
        merged_customer_id,
        reason,
        admin_user_id: adminUserId,
        tenant_id: tenantId,
      });

      res.status(200).json({
        status: 'success',
        message: `Customer ${merged_customer_id} successfully merged into ${surviving_customer_id}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List customer merge audit logs
   */
  static async getMergeLogs(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const logs = await MergeService.listMergeLogs(tenantId, limit, offset);

      res.status(200).json({
        status: 'success',
        results: logs.length,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * View RealBooks sync failures
   */
  static async getRealBooksSyncFailures(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const failures = await RealBooksService.getSyncFailures(tenantId, limit, offset);

      res.status(200).json({
        status: 'success',
        count: failures.length,
        data: failures,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually trigger retry for a failed RealBooks sync log
   */
  static async retryRealBooksSync(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      const result = await RealBooksService.manuallyRetrySync(id, tenantId);

      res.status(200).json({
        status: 'success',
        message: `RealBooks sync log '${id}' retry initiated.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List WhatsApp delivery audit logs
   */
  static async getWhatsAppLogs(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);
      const status = req.query.status;

      let query = `
        SELECT id, customer_id, phone_number, template_name, message_body,
               status, error_message, provider, tenant_id, created_at
        FROM whatsapp_message_log
        WHERE tenant_id = $1
      `;
      const params = [tenantId];
      if (status) {
        query += ` AND status = $2`;
        params.push(status);
      }
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
      params.push(limit, offset);

      const logsRes = await pool.query(query, params);
      res.status(200).json({
        status: 'success',
        results: logsRes.rows.length,
        data: logsRes.rows,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List last 50 AppSheet webhook transaction log entries with status
   */
  static async getAppSheetWebhookLogs(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const logsRes = await pool.query(
        `SELECT id, appsheet_row_id, payload, result, error_message, tenant_id, received_at
         FROM appsheet_webhook_log
         WHERE tenant_id = $1
         ORDER BY received_at DESC
         LIMIT $2 OFFSET $3;`,
        [tenantId, limit, offset]
      );

      res.status(200).json({
        status: 'success',
        results: logsRes.rows.length,
        data: logsRes.rows,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List Google Sheets auto-sync logs
   */
  static async getGoogleSheetsLogs(req, res, next) {
    try {
      const GoogleSheetsService = require('../services/googleSheets.service');
      const tenantId = req.tenantId;
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);

      const logs = await GoogleSheetsService.getSyncLogs(tenantId, limit, offset);

      res.status(200).json({
        status: 'success',
        results: logs.length,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create tokenized invitation link for cashier (valid 48h)
   */
  static async createCashierInvite(req, res, next) {
    try {
      const CashierInviteService = require('../services/cashierInvite.service');
      const { branch_id, phone, role } = req.body;
      const tenantId = req.tenantId;
      const adminUserId = req.user.id || req.user.user_id || null;

      const result = await CashierInviteService.createInvite({
        tenant_id: tenantId,
        branch_id: branch_id || 1,
        phone,
        role: role || 'cashier',
        created_by: adminUserId,
      });

      res.status(201).json({
        status: 'success',
        message: 'Cashier invitation created successfully (valid for 48 hours).',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 10. Get customer redemptions list (Admin dashboard only)
   */
  static async getCustomerRedemptions(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const { search, branch_id, start_date, end_date, limit = '100', offset = '0' } = req.query;

      const whereClauses = [
        'pl.tenant_id = $1',
        "(pl.points < 0 OR pl.type = 'redeem' OR pl.transaction_category = 'redemption')"
      ];
      const queryParams = [tenantId];
      let paramIdx = 2;

      if (branch_id && branch_id !== 'all') {
        whereClauses.push(`pl.branch_id = $${paramIdx++}`);
        queryParams.push(branch_id);
      }

      if (start_date) {
        whereClauses.push(`pl.created_at >= $${paramIdx++}`);
        queryParams.push(new Date(start_date));
      }

      if (end_date) {
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        whereClauses.push(`pl.created_at <= $${paramIdx++}`);
        queryParams.push(end);
      }

      if (search && search.trim()) {
        const term = `%${search.trim().toLowerCase()}%`;
        whereClauses.push(`(
          LOWER(c.customer_name) LIKE $${paramIdx} OR
          LOWER(pl.customer_id) LIKE $${paramIdx} OR
          LOWER(COALESCE(cp.phone_number, '')) LIKE $${paramIdx} OR
          LOWER(COALESCE(pl.receipt_no, '')) LIKE $${paramIdx} OR
          LOWER(COALESCE(r.receipt_no, '')) LIKE $${paramIdx} OR
          LOWER(COALESCE(r.redemption_code, '')) LIKE $${paramIdx} OR
          LOWER(COALESCE(v.registration_number, '')) LIKE $${paramIdx}
        )`);
        paramIdx++;
        queryParams.push(term);
      }

      const whereSql = whereClauses.join(' AND ');

      // Summary totals for KPI cards
      const totalsSql = `
        SELECT
          COUNT(pl.entry_id) AS total_redemptions,
          COUNT(DISTINCT pl.customer_id) AS total_customers_redeemed,
          COALESCE(SUM(ABS(pl.points)), 0) AS total_points_redeemed,
          COALESCE(SUM(COALESCE(r.discount_amount, ABS(pl.points) * 0.25)), 0) AS total_discount_given,
          COUNT(CASE WHEN pl.created_at >= CURRENT_DATE THEN 1 END) AS today_redemptions
        FROM points_ledger pl
        LEFT JOIN redemptions r ON (pl.customer_id = r.customer_id AND ABS(pl.points) = r.points_redeemed AND pl.created_at >= r.created_at - INTERVAL '10 seconds' AND pl.created_at <= r.created_at + INTERVAL '10 seconds')
        LEFT JOIN customers c ON pl.customer_id = c.customer_id AND pl.tenant_id = c.tenant_id
        LEFT JOIN LATERAL (
          SELECT phone_number FROM customer_phones WHERE customer_id = pl.customer_id AND tenant_id = pl.tenant_id ORDER BY is_verified DESC, phone_id ASC LIMIT 1
        ) cp ON true
        LEFT JOIN vehicles v ON (pl.vehicle_id = v.vehicle_id OR (pl.vehicle_id IS NULL AND v.vehicle_id = (SELECT v2.vehicle_id FROM vehicles v2 WHERE v2.customer_id = pl.customer_id LIMIT 1)))
        WHERE ${whereSql};
      `;
      const totalsRes = await pool.query(totalsSql, queryParams);
      const totals = totalsRes.rows[0] || {};

      // Data query
      const parsedLimit = Math.min(parseInt(limit, 10) || 100, 500);
      const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

      const dataSql = `
        WITH ranked_redemptions AS (
          SELECT 
            pl.entry_id,
            pl.customer_id,
            COALESCE(c.customer_name, 'Valued Customer') AS customer_name,
            COALESCE(cp.phone_number, '') AS phone_number,
            COALESCE(b.branch_name, 'Central Dealership') AS branch_name,
            COALESCE(b.branch_city, 'Karnataka') AS branch_city,
            COALESCE(v.registration_number, v.vin, '') AS vehicle_reg,
            COALESCE(v.brand_name, br.brand_name, '') AS brand_name,
            COALESCE(v.model, '') AS model,
            ABS(pl.points) AS points_redeemed,
            COALESCE(r.discount_amount, ABS(pl.points) * 0.25) AS discount_amount,
            COALESCE(r.receipt_no, pl.receipt_no, '') AS receipt_no,
            COALESCE(r.account_ledger_no, pl.account_ledger_no, '') AS account_ledger_no,
            COALESCE(r.redemption_code, pl.source_ref, '') AS redemption_code,
            COALESCE(u.username, 'System Cashier') AS cashier_username,
            pl.created_at,
            ROW_NUMBER() OVER (
              PARTITION BY pl.customer_id 
              ORDER BY pl.created_at DESC, pl.entry_id DESC
            ) AS rn,
            COUNT(*) OVER (PARTITION BY pl.customer_id) AS total_redemptions_by_customer,
            SUM(ABS(pl.points)) OVER (PARTITION BY pl.customer_id) AS total_points_burned_by_customer
          FROM points_ledger pl
          LEFT JOIN redemptions r ON (pl.customer_id = r.customer_id AND ABS(pl.points) = r.points_redeemed AND pl.created_at >= r.created_at - INTERVAL '10 seconds' AND pl.created_at <= r.created_at + INTERVAL '10 seconds')
          LEFT JOIN customers c ON pl.customer_id = c.customer_id AND pl.tenant_id = c.tenant_id
          LEFT JOIN LATERAL (
            SELECT phone_number FROM customer_phones WHERE customer_id = pl.customer_id AND tenant_id = pl.tenant_id ORDER BY is_verified DESC, phone_id ASC LIMIT 1
          ) cp ON true
          LEFT JOIN branches b ON pl.branch_id = b.branch_id
          LEFT JOIN vehicles v ON (pl.vehicle_id = v.vehicle_id OR (pl.vehicle_id IS NULL AND v.vehicle_id = (SELECT v2.vehicle_id FROM vehicles v2 WHERE v2.customer_id = pl.customer_id LIMIT 1)))
          LEFT JOIN brands br ON v.brand_id = br.brand_id
          LEFT JOIN users u ON (pl.cashier_id = u.id OR r.cashier_id = u.id)
          WHERE ${whereSql}
        )
        SELECT *
        FROM ranked_redemptions
        WHERE rn = 1
        ORDER BY created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++};
      `;
      queryParams.push(parsedLimit, parsedOffset);

      const dataRes = await pool.query(dataSql, queryParams);

      res.status(200).json({
        status: 'success',
        count: dataRes.rows.length,
        totals: {
          total_redemptions: parseInt(totals.total_redemptions || 0, 10),
          total_customers_redeemed: parseInt(totals.total_customers_redeemed || 0, 10),
          total_points_redeemed: parseInt(totals.total_points_redeemed || 0, 10),
          total_discount_given: parseFloat(totals.total_discount_given || 0),
          today_redemptions: parseInt(totals.today_redemptions || 0, 10),
        },
        data: dataRes.rows,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 11. Get Gift Card Rewards Audit List (Admin dashboard only)
   * Shows customer details who sent gift card, money amount sent in ₹, recipient details, and claim status
   */
  static async getAdminGiftCards(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const { search, status, limit, offset } = req.query;

      let whereConditions = [`cg.tenant_id = $1`];
      let queryParams = [tenantId];
      let paramIdx = 2;

      if (status && status !== 'all') {
        whereConditions.push(`cg.claim_status = $${paramIdx++}`);
        queryParams.push(status.toLowerCase());
      }

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        whereConditions.push(`(
          cg.gift_code ILIKE $${paramIdx} OR
          cg.sender_customer_id ILIKE $${paramIdx} OR
          cg.sender_name ILIKE $${paramIdx} OR
          cg.sender_phone ILIKE $${paramIdx} OR
          cg.receiver_name ILIKE $${paramIdx} OR
          cg.receiver_phone ILIKE $${paramIdx} OR
          c.customer_name ILIKE $${paramIdx}
        )`);
        queryParams.push(term);
        paramIdx++;
      }

      const whereSql = whereConditions.join(' AND ');

      // Summary totals
      const totalsRes = await pool.query(`
        SELECT 
          COUNT(*)::int AS total_cards,
          COALESCE(SUM(amount_inr), 0)::numeric AS total_amount_inr,
          COUNT(CASE WHEN claim_status = 'claimed' THEN 1 END)::int AS total_claimed,
          COUNT(CASE WHEN claim_status = 'unclaimed' THEN 1 END)::int AS total_unclaimed,
          COUNT(CASE WHEN claim_status = 'expired' THEN 1 END)::int AS total_expired
        FROM customer_gifts cg
        LEFT JOIN customers c ON cg.sender_customer_id = c.customer_id AND cg.tenant_id = c.tenant_id
        WHERE ${whereSql};
      `, queryParams);

      const totals = totalsRes.rows[0] || {};

      // Data query
      const parsedLimit = parseInt(limit || '50', 10);
      const parsedOffset = parseInt(offset || '0', 10);

      const dataSql = `
        SELECT 
          cg.gift_id::text AS id,
          cg.gift_code,
          cg.sender_customer_id,
          COALESCE(cg.sender_name, c.customer_name, 'Loyal Member') AS sender_name,
          COALESCE(cg.sender_phone, cp.phone_number, '—') AS sender_phone,
          cg.amount_inr::numeric AS amount_inr,
          cg.points_equivalent,
          cg.points_deducted,
          cg.funding_source,
          cg.payment_status,
          cg.receiver_customer_id,
          COALESCE(cg.receiver_name, 'Shared via Link / WhatsApp') AS receiver_name,
          COALESCE(cg.receiver_phone, '—') AS receiver_phone,
          cg.claim_status,
          cg.created_at,
          cg.expires_at,
          cg.claimed_at,
          cg.custom_message
        FROM customer_gifts cg
        LEFT JOIN customers c ON cg.sender_customer_id = c.customer_id AND cg.tenant_id = c.tenant_id
        LEFT JOIN LATERAL (
          SELECT phone_number FROM customer_phones 
          WHERE customer_id = cg.sender_customer_id AND tenant_id = cg.tenant_id 
          ORDER BY is_verified DESC, phone_id ASC LIMIT 1
        ) cp ON true
        WHERE ${whereSql}
        ORDER BY cg.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++};
      `;
      queryParams.push(parsedLimit, parsedOffset);

      const dataRes = await pool.query(dataSql, queryParams);

      res.status(200).json({
        status: 'success',
        count: dataRes.rows.length,
        totals: {
          total_cards: parseInt(totals.total_cards || 0, 10),
          total_amount_inr: parseFloat(totals.total_amount_inr || 0),
          total_claimed: parseInt(totals.total_claimed || 0, 10),
          total_unclaimed: parseInt(totals.total_unclaimed || 0, 10),
          total_expired: parseInt(totals.total_expired || 0, 10),
        },
        data: dataRes.rows,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 12. Get Referral Rewards Details (Admin view with vehicle purchase and PR checks)
   */
  static async getAdminReferrals(req, res, next) {
    try {
      const tenantId = req.tenantId || 'bellad_and_company';
      const { search, status, limit, offset } = req.query;

      let whereConditions = [`r.tenant_id = $1`];
      let queryParams = [tenantId];
      let paramIdx = 2;

      if (status && status !== 'all') {
        whereConditions.push(`r.status = $${paramIdx++}`);
        queryParams.push(status.toLowerCase());
      }

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        whereConditions.push(`(
          r.referrer_customer_id ILIKE $${paramIdx} OR
          rc.customer_name ILIKE $${paramIdx} OR
          rcp.phone_number ILIKE $${paramIdx} OR
          r.referred_customer_id ILIKE $${paramIdx} OR
          refc.customer_name ILIKE $${paramIdx} OR
          refcp.phone_number ILIKE $${paramIdx}
        )`);
        queryParams.push(term);
        paramIdx++;
      }

      const whereSql = whereConditions.join(' AND ');

      // Referral records query
      const parsedLimit = parseInt(limit || '50', 10);
      const parsedOffset = parseInt(offset || '0', 10);

      const sql = `
        SELECT 
          r.referral_id AS id,
          r.referral_id,
          r.referrer_customer_id,
          rc.customer_name AS referrer_name,
          COALESCE(rcp.phone_number, '—') AS referrer_phone,
          r.referred_customer_id,
          refc.customer_name AS referred_name,
          COALESCE(refcp.phone_number, '—') AS referred_phone,
          r.status,
          r.points_credited,
          r.suggested_points,
          r.points_awarded,
          r.reason AS approval_reason,
          r.approved_at,
          r.created_at,
          v.vehicle_id,
          v.model AS vehicle_model,
          COALESCE(v.registration_number, v.vin, '') AS registration_number,
          v.chassis_no,
          v.dms_invoice_number,
          v.dms_invoice_date,
          v.purchase_date,
          COALESCE(b.branch_name, v.branch_name, 'Central Dealership') AS branch_name,
          -- Whether purchased from our dealers:
          CASE 
            WHEN v.vehicle_id IS NOT NULL AND (v.branch_id IS NOT NULL OR v.dms_invoice_number IS NOT NULL OR v.branch_name IS NOT NULL) THEN true
            ELSE false
          END AS is_dealer_purchased,
          -- Whether PR is completed:
          CASE 
            WHEN v.vehicle_id IS NOT NULL AND (v.registration_number IS NOT NULL OR v.dms_invoice_number IS NOT NULL) THEN true
            ELSE false
          END AS is_pr_done
        FROM referrals r
        LEFT JOIN customers rc ON r.referrer_customer_id = rc.customer_id AND r.tenant_id = rc.tenant_id
        LEFT JOIN LATERAL (
          SELECT phone_number FROM customer_phones 
          WHERE customer_id = r.referrer_customer_id AND tenant_id = r.tenant_id 
          ORDER BY is_verified DESC, phone_id ASC LIMIT 1
        ) rcp ON true
        LEFT JOIN customers refc ON r.referred_customer_id = refc.customer_id AND r.tenant_id = refc.tenant_id
        LEFT JOIN LATERAL (
          SELECT phone_number FROM customer_phones 
          WHERE customer_id = r.referred_customer_id AND tenant_id = r.tenant_id 
          ORDER BY is_verified DESC, phone_id ASC LIMIT 1
        ) refcp ON true
        LEFT JOIN LATERAL (
          SELECT * FROM vehicles 
          WHERE customer_id = r.referred_customer_id AND tenant_id = r.tenant_id 
          ORDER BY purchase_date DESC NULLS LAST, vehicle_id DESC LIMIT 1
        ) v ON true
        LEFT JOIN branches b ON v.branch_id = b.branch_id
        WHERE ${whereSql}
        ORDER BY r.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++};
      `;
      queryParams.push(parsedLimit, parsedOffset);

      const resReferrals = await pool.query(sql, queryParams);

      // Summary totals
      const totalsRes = await pool.query(`
        SELECT 
          COUNT(*)::int AS total_referrals,
          COUNT(CASE WHEN r.status = 'approved' THEN 1 END)::int AS total_approved,
          COUNT(CASE WHEN r.status = 'pending' THEN 1 END)::int AS total_pending,
          COALESCE(SUM(CASE WHEN r.status = 'approved' THEN r.points_credited ELSE 0 END), 0)::bigint AS total_points_credited
        FROM referrals r
        WHERE r.tenant_id = $1;
      `, [tenantId]);

      const totals = totalsRes.rows[0] || {};

      res.status(200).json({
        status: 'success',
        count: resReferrals.rows.length,
        totals: {
          total_referrals: parseInt(totals.total_referrals || 0, 10),
          total_approved: parseInt(totals.total_approved || 0, 10),
          total_pending: parseInt(totals.total_pending || 0, 10),
          total_points_credited: parseInt(totals.total_points_credited || 0, 10),
        },
        data: resReferrals.rows,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;


