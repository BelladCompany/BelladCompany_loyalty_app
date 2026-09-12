const { pool } = require('../config/db');

class ReportService {
  /**
   * Helper utility to convert array of JSON objects to CSV string
   */
  static convertToCsv(dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return '';
    }

    const headers = Object.keys(dataArray[0]);
    const csvRows = [];

    // Header row
    csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

    // Data rows
    for (const row of dataArray) {
      const values = headers.map((header) => {
        const val = row[header];
        if (val === null || val === undefined) return '""';
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * 1. Points Summary Report (Issued vs Redeemed by Branch, Brand, Category & Date Range)
   */
  static async getPointsSummaryReport({
    tenantId = 'bellad_and_company',
    branchId = null,
    brandId = null,
    vehicleType = null,
    category = null,
    startDate = null,
    endDate = null,
  }) {
    let whereClauses = ['pl.tenant_id = $1'];
    let queryParams = [tenantId];
    let paramIdx = 2;

    if (branchId) {
      whereClauses.push(`pl.branch_id = $${paramIdx++}`);
      queryParams.push(branchId);
    }
    if (category) {
      whereClauses.push(`pl.transaction_category = $${paramIdx++}`);
      queryParams.push(category);
    }
    if (startDate) {
      whereClauses.push(`pl.created_at >= $${paramIdx++}`);
      queryParams.push(new Date(startDate));
    }
    if (endDate) {
      whereClauses.push(`pl.created_at <= $${paramIdx++}`);
      queryParams.push(new Date(endDate));
    }
    if (vehicleType) {
      whereClauses.push(`v.vehicle_type = $${paramIdx++}`);
      queryParams.push(vehicleType);
    }
    if (brandId) {
      whereClauses.push(`v.brand_id = $${paramIdx++}`);
      queryParams.push(brandId);
    }

    const whereSql = whereClauses.join(' AND ');

    const sql = `
      SELECT 
        COALESCE(b.branch_name, 'Unassigned Branch') AS branch_name,
        COALESCE(br.brand_name, 'General') AS brand_name,
        COALESCE(pl.transaction_category, 'other') AS category,
        COUNT(pl.entry_id) AS total_transactions,
        COALESCE(SUM(CASE WHEN pl.points > 0 THEN pl.points ELSE 0 END), 0) AS total_points_issued,
        COALESCE(SUM(CASE WHEN pl.points < 0 THEN ABS(pl.points) ELSE 0 END), 0) AS total_points_redeemed,
        COALESCE(SUM(pl.points), 0) AS net_points_balance
      FROM points_ledger pl
      LEFT JOIN branches b ON pl.branch_id = b.branch_id
      LEFT JOIN vehicles v ON pl.vehicle_id = v.vehicle_id
      LEFT JOIN brands br ON v.brand_id = br.brand_id
      WHERE ${whereSql}
      GROUP BY b.branch_name, br.brand_name, pl.transaction_category
      ORDER BY b.branch_name ASC, total_points_issued DESC;
    `;

    const res = await pool.query(sql, queryParams);

    const rows = res.rows.map((r) => ({
      branch_name: r.branch_name,
      brand_name: r.brand_name,
      category: r.category,
      total_transactions: parseInt(r.total_transactions, 10),
      total_points_issued: parseInt(r.total_points_issued, 10),
      total_points_redeemed: parseInt(r.total_points_redeemed, 10),
      net_points_balance: parseInt(r.net_points_balance, 10),
      equivalent_issued_rs: Math.floor(parseInt(r.total_points_issued, 10) / 4),
      equivalent_redeemed_rs: Math.floor(parseInt(r.total_points_redeemed, 10) / 4),
    }));

    return rows;
  }

  /**
   * 2. Customer Distribution Report (Customer count by Branch & Vehicle Model / Brand pivot)
   */
  static async getCustomerDistributionReport({
    tenantId = 'bellad_and_company',
    branchId = null,
    brandId = null,
    vehicleType = null,
  }) {
    let whereClauses = ['c.tenant_id = $1'];
    let queryParams = [tenantId];
    let paramIdx = 2;

    if (branchId) {
      whereClauses.push(`v.branch_id = $${paramIdx++}`);
      queryParams.push(branchId);
    }
    if (brandId) {
      whereClauses.push(`v.brand_id = $${paramIdx++}`);
      queryParams.push(brandId);
    }
    if (vehicleType) {
      whereClauses.push(`v.vehicle_type = $${paramIdx++}`);
      queryParams.push(vehicleType);
    }

    const whereSql = whereClauses.join(' AND ');

    const sql = `
      SELECT 
        COALESCE(b.branch_name, 'Unassigned Branch') AS branch_name,
        COALESCE(br.brand_name, 'General') AS brand_name,
        COALESCE(v.model, 'Unknown Model') AS model_name,
        COALESCE(v.vehicle_type, '4W') AS vehicle_type,
        COUNT(DISTINCT c.customer_id) AS customer_count,
        COUNT(DISTINCT v.vehicle_id) AS vehicle_count
      FROM customers c
      INNER JOIN vehicles v ON c.customer_id = v.customer_id
      LEFT JOIN branches b ON v.branch_id = b.branch_id
      LEFT JOIN brands br ON v.brand_id = br.brand_id
      WHERE ${whereSql}
      GROUP BY b.branch_name, br.brand_name, v.model, v.vehicle_type
      ORDER BY b.branch_name ASC, customer_count DESC;
    `;

    const res = await pool.query(sql, queryParams);

    return res.rows.map((r) => ({
      branch_name: r.branch_name,
      brand_name: r.brand_name,
      model_name: r.model_name,
      vehicle_type: r.vehicle_type,
      customer_count: parseInt(r.customer_count, 10),
      vehicle_count: parseInt(r.vehicle_count, 10),
    }));
  }

  /**
   * 3. Points Liability Report (Unredeemed balance x ₹ value & Expiring Risk Buckets)
   */
  static async getPointsLiabilityReport({
    tenantId = 'bellad_and_company',
    branchId = null,
  }) {
    let branchFilter = '';
    let params = [tenantId];
    if (branchId) {
      branchFilter = 'AND pl.branch_id = $2';
      params.push(branchId);
    }

    // 1. Overall Balance & Liability
    const totalSql = `
      SELECT 
        COALESCE(SUM(points), 0) AS total_unredeemed_points
      FROM points_ledger pl
      WHERE pl.tenant_id = $1 ${branchFilter};
    `;
    const totalRes = await pool.query(totalSql, params);
    const totalUnredeemedPoints = parseInt(totalRes.rows[0].total_unredeemed_points, 10);
    const totalLiabilityRs = Math.floor(totalUnredeemedPoints / 4);

    // 2. Expiring-soon Buckets (points created 21-24 months ago)
    const expiryBucketsSql = `
      SELECT 
        COALESCE(SUM(CASE WHEN created_at <= NOW() - INTERVAL '23 months' AND created_at > NOW() - INTERVAL '24 months' AND points > 0 THEN points ELSE 0 END), 0) AS expiring_30d_points,
        COALESCE(SUM(CASE WHEN created_at <= NOW() - INTERVAL '22 months' AND created_at > NOW() - INTERVAL '23 months' AND points > 0 THEN points ELSE 0 END), 0) AS expiring_60d_points,
        COALESCE(SUM(CASE WHEN created_at <= NOW() - INTERVAL '21 months' AND created_at > NOW() - INTERVAL '22 months' AND points > 0 THEN points ELSE 0 END), 0) AS expiring_90d_points
      FROM points_ledger pl
      WHERE pl.tenant_id = $1 ${branchFilter} AND pl.type != 'expire';
    `;
    const expiryRes = await pool.query(expiryBucketsSql, params);
    const expRow = expiryRes.rows[0];

    const exp30d = parseInt(expRow.expiring_30d_points, 10);
    const exp60d = parseInt(expRow.expiring_60d_points, 10);
    const exp90d = parseInt(expRow.expiring_90d_points, 10);

    return {
      total_unredeemed_points: totalUnredeemedPoints,
      total_liability_rupees: totalLiabilityRs,
      points_conversion_rate: '4 points = ₹1',
      expiring_risk_buckets: {
        expiring_in_30_days: { points: exp30d, liability_rs: Math.floor(exp30d / 4) },
        expiring_in_60_days: { points: exp60d, liability_rs: Math.floor(exp60d / 4) },
        expiring_in_90_days: { points: exp90d, liability_rs: Math.floor(exp90d / 4) },
      },
    };
  }

  /**
   * 4. Referral Conversion & Override Audit Report (Status breakdown, auto-suggested vs final approved delta)
   */
  static async getReferralConversionReport({
    tenantId = 'bellad_and_company',
    startDate = null,
    endDate = null,
  }) {
    let whereClauses = ['r.tenant_id = $1'];
    let queryParams = [tenantId];
    let paramIdx = 2;

    if (startDate) {
      whereClauses.push(`r.created_at >= $${paramIdx++}`);
      queryParams.push(new Date(startDate));
    }
    if (endDate) {
      whereClauses.push(`r.created_at <= $${paramIdx++}`);
      queryParams.push(new Date(endDate));
    }

    const whereSql = whereClauses.join(' AND ');

    const sql = `
      SELECT 
        r.status,
        COUNT(r.referral_id) AS total_count,
        COALESCE(SUM(COALESCE(r.suggested_points, 0)), 0) AS total_suggested_points,
        COALESCE(SUM(COALESCE(r.points_credited, 0)), 0) AS total_credited_points,
        COALESCE(SUM(CASE WHEN r.suggested_points IS NOT NULL AND r.suggested_points != r.points_credited THEN 1 ELSE 0 END), 0) AS override_count
      FROM referrals r
      WHERE ${whereSql}
      GROUP BY r.status;
    `;

    const res = await pool.query(sql, queryParams);

    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let totalSuggested = 0;
    let totalCredited = 0;
    let overrideCount = 0;

    const breakdown = res.rows.map((r) => {
      const count = parseInt(r.total_count, 10);
      const suggested = parseInt(r.total_suggested_points, 10);
      const credited = parseInt(r.total_credited_points, 10);
      const overrides = parseInt(r.override_count, 10);

      if (r.status === 'pending') pendingCount += count;
      if (r.status === 'approved') approvedCount += count;
      if (r.status === 'rejected') rejectedCount += count;

      totalSuggested += suggested;
      totalCredited += credited;
      overrideCount += overrides;

      return {
        status: r.status,
        count,
        total_suggested_points: suggested,
        total_credited_points: credited,
        override_count: overrides,
        delta_points: credited - suggested,
      };
    });

    const totalReferrals = pendingCount + approvedCount + rejectedCount;
    const conversionRate = totalReferrals > 0 ? Number(((approvedCount / totalReferrals) * 100).toFixed(2)) : 0;
    const overrideRate = approvedCount > 0 ? Number(((overrideCount / approvedCount) * 100).toFixed(2)) : 0;

    return {
      summary: {
        total_referrals: totalReferrals,
        pending_count: pendingCount,
        approved_count: approvedCount,
        rejected_count: rejectedCount,
        conversion_rate_pct: conversionRate,
        total_suggested_points: totalSuggested,
        total_credited_points: totalCredited,
        overall_delta_points: totalCredited - totalSuggested,
        override_count: overrideCount,
        override_rate_pct: overrideRate,
      },
      status_breakdown: breakdown,
    };
  }

  /**
   * 5. KYC Change Request Audit Report (Approved/Rejected by Branch & Cashier volume)
   */
  static async getKycAuditReport({
    tenantId = 'bellad_and_company',
    branchId = null,
    startDate = null,
    endDate = null,
  }) {
    let whereClauses = ['k.tenant_id = $1'];
    let queryParams = [tenantId];
    let paramIdx = 2;

    if (branchId) {
      whereClauses.push(`u.branch_id = $${paramIdx++}`);
      queryParams.push(branchId);
    }
    if (startDate) {
      whereClauses.push(`k.created_at >= $${paramIdx++}`);
      queryParams.push(new Date(startDate));
    }
    if (endDate) {
      whereClauses.push(`k.created_at <= $${paramIdx++}`);
      queryParams.push(new Date(endDate));
    }

    const whereSql = whereClauses.join(' AND ');

    const sql = `
      SELECT 
        COALESCE(b.branch_name, 'Unassigned Branch') AS branch_name,
        COALESCE(u.username, 'System Cashier') AS cashier_username,
        COUNT(k.id) AS total_requests,
        COALESCE(SUM(CASE WHEN k.status = 'approved' THEN 1 ELSE 0 END), 0) AS approved_count,
        COALESCE(SUM(CASE WHEN k.status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected_count,
        COALESCE(SUM(CASE WHEN k.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count
      FROM kyc_change_requests k
      LEFT JOIN users u ON k.requested_by = u.user_id
      LEFT JOIN branches b ON u.branch_id = b.branch_id
      WHERE ${whereSql}
      GROUP BY b.branch_name, u.username
      ORDER BY total_requests DESC;
    `;

    const res = await pool.query(sql, queryParams);

    return res.rows.map((r) => {
      const total = parseInt(r.total_requests, 10);
      return {
        branch_name: r.branch_name,
        cashier_username: r.cashier_username,
        total_requests: total,
        approved_count: parseInt(r.approved_count, 10),
        rejected_count: parseInt(r.rejected_count, 10),
        pending_count: parseInt(r.pending_count, 10),
        high_volume_flag: total >= 5,
      };
    });
  }
}

module.exports = ReportService;
