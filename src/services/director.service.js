const { pool } = require('../config/db');

class DirectorService {
  /**
   * Executive Overview & Dynamic Real-Time Metrics for Director & Management
   */
  static async getOverview({ tenantId = 'bellad_and_company', startDate = null, endDate = null }) {
    const client = await pool.connect();
    try {
      let dateFilter = '';
      const queryParams = [tenantId];
      let pIdx = 2;

      if (startDate) {
        dateFilter += ` AND pl.created_at >= $${pIdx++}`;
        queryParams.push(new Date(startDate));
      }
      if (endDate) {
        dateFilter += ` AND pl.created_at <= $${pIdx++}`;
        queryParams.push(new Date(endDate));
      }

      // 1. Overall Executive KPIs from points_ledger
      const ledgerKpiRes = await client.query(
        `SELECT 
          COUNT(pl.entry_id) AS total_transactions,
          COUNT(DISTINCT pl.customer_id) AS active_customers_in_period,
          COALESCE(SUM(CASE WHEN pl.points > 0 THEN pl.points ELSE 0 END), 0) AS total_points_issued,
          COALESCE(SUM(CASE WHEN pl.points < 0 THEN ABS(pl.points) ELSE 0 END), 0) AS total_points_redeemed,
          COALESCE(SUM(pl.points), 0) AS net_points_liability,
          COALESCE(SUM(
            CASE 
              WHEN pl.calc_snapshot->>'bill_amount' IS NOT NULL 
                THEN (pl.calc_snapshot->>'bill_amount')::numeric
              WHEN pl.calc_snapshot->>'amount_paise' IS NOT NULL 
                THEN (pl.calc_snapshot->>'amount_paise')::numeric / 100
              ELSE 0 
            END
          ), 0) AS total_invoiced_revenue
        FROM points_ledger pl
        WHERE pl.tenant_id = $1 ${dateFilter};`,
        queryParams
      );
      const kpis = ledgerKpiRes.rows[0] || {};

      // 2. Customer & Vehicle Master Totals
      const custTotRes = await client.query(
        `SELECT 
          COUNT(customer_id) AS total_customers,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS new_customers_30d
        FROM customers
        WHERE tenant_id = $1;`,
        [tenantId]
      );
      const custKpis = custTotRes.rows[0] || {};

      const vehTotRes = await client.query(
        `SELECT COUNT(vehicle_id) AS total_vehicles FROM vehicles WHERE tenant_id = $1;`,
        [tenantId]
      );
      const vehKpis = vehTotRes.rows[0] || {};

      // 3. Gift Card Performance Totals
      const giftRes = await client.query(
        `SELECT 
          COUNT(gift_id) AS total_gifts,
          COUNT(CASE WHEN claim_status = 'claimed' THEN 1 END) AS claimed_gifts,
          COUNT(CASE WHEN claim_status = 'unclaimed' AND payment_status = 'paid' THEN 1 END) AS active_unclaimed_gifts,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount_inr ELSE 0 END), 0) AS total_gift_volume_inr
        FROM customer_gifts
        WHERE tenant_id = $1;`,
        [tenantId]
      );
      const giftKpis = giftRes.rows[0] || {};

      // 4. Referral Conversion Engine Totals
      let refKpis = { total_referrals: 0, purchased_referrals: 0, referral_points_awarded: 0 };
      try {
        const refRes = await client.query(
          `SELECT 
            COUNT(referral_id) AS total_referrals,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) AS purchased_referrals,
            COALESCE(SUM(COALESCE(points_credited, 0)), 0) AS referral_points_awarded
          FROM referrals
          WHERE tenant_id = $1;`,
          [tenantId]
        );
        refKpis = refRes.rows[0] || refKpis;
      } catch (e) {
        // Fallback if schema differences
      }

      // 5. RealBooks Accounting Sync Metrics
      let realBooksMetrics = { total_synced: 0, total_failed: 0, sync_rate: 100 };
      try {
        const rbRes = await client.query(
          `SELECT 
            COUNT(CASE WHEN status = 'synced' THEN 1 END) AS total_synced,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) AS total_failed,
            COUNT(id) AS total_logged
          FROM realbooks_sync_logs
          WHERE tenant_id = $1;`,
          [tenantId]
        );
        const rbRow = rbRes.rows[0] || {};
        const totalLogged = parseInt(rbRow.total_logged || 0, 10);
        const totalSynced = parseInt(rbRow.total_synced || 0, 10);
        const rate = totalLogged > 0 ? ((totalSynced / totalLogged) * 100).toFixed(1) : 100;
        realBooksMetrics = {
          total_synced: totalSynced,
          total_failed: parseInt(rbRow.total_failed || 0, 10),
          sync_rate: parseFloat(rate),
        };
      } catch (e) {
        // Table might be optional
      }

      // 6. Branch-by-Branch Performance Breakdown
      const branchRes = await client.query(
        `SELECT 
          b.branch_id,
          COALESCE(b.branch_name, 'Central Hubballi') AS branch_name,
          COALESCE(b.branch_city, 'Hubballi') AS branch_city,
          COUNT(pl.entry_id) AS transactions_count,
          COUNT(DISTINCT pl.customer_id) AS customer_count,
          COALESCE(SUM(CASE WHEN pl.points > 0 THEN pl.points ELSE 0 END), 0) AS points_issued,
          COALESCE(SUM(CASE WHEN pl.points < 0 THEN ABS(pl.points) ELSE 0 END), 0) AS points_redeemed,
          COALESCE(SUM(pl.points), 0) AS net_points,
          COALESCE(SUM(
            CASE 
              WHEN pl.calc_snapshot->>'bill_amount' IS NOT NULL 
                THEN (pl.calc_snapshot->>'bill_amount')::numeric
              WHEN pl.calc_snapshot->>'amount_paise' IS NOT NULL 
                THEN (pl.calc_snapshot->>'amount_paise')::numeric / 100
              ELSE 0 
            END
          ), 0) AS total_revenue
        FROM branches b
        LEFT JOIN points_ledger pl ON b.branch_id = pl.branch_id AND pl.tenant_id = $1 ${dateFilter}
        GROUP BY b.branch_id, b.branch_name, b.branch_city
        ORDER BY total_revenue DESC, points_issued DESC;`,
        queryParams
      );

      // 7. Department / Category Performance
      const deptRes = await client.query(
        `SELECT 
          COALESCE(pl.transaction_category, 'other') AS category,
          COUNT(pl.entry_id) AS transactions_count,
          COUNT(DISTINCT pl.customer_id) AS customer_count,
          COALESCE(SUM(CASE WHEN pl.points > 0 THEN pl.points ELSE 0 END), 0) AS points_issued,
          COALESCE(SUM(CASE WHEN pl.points < 0 THEN ABS(pl.points) ELSE 0 END), 0) AS points_redeemed,
          COALESCE(SUM(
            CASE 
              WHEN pl.calc_snapshot->>'bill_amount' IS NOT NULL 
                THEN (pl.calc_snapshot->>'bill_amount')::numeric
              WHEN pl.calc_snapshot->>'amount_paise' IS NOT NULL 
                THEN (pl.calc_snapshot->>'amount_paise')::numeric / 100
              ELSE 0 
            END
          ), 0) AS revenue_volume
        FROM points_ledger pl
        WHERE pl.tenant_id = $1 ${dateFilter}
        GROUP BY pl.transaction_category
        ORDER BY points_issued DESC;`,
        queryParams
      );

      // 8. VIP Tier Distribution (Silver Baseline, Gold, Platinum)
      // All customers are currently enrolled in Silver baseline until expense-based tier upgrade is triggered
      const totalCust = parseInt(custKpis.total_customers || 0, 10);
      const tierCounts = { Silver: totalCust, Gold: 0, Platinum: 0 };

      // 9. Recent 10 Live Network Transactions
      const recentTxRes = await client.query(
        `SELECT 
          pl.entry_id,
          pl.customer_id,
          COALESCE(c.customer_name, 'Valued Member') AS customer_name,
          COALESCE(cp.phone_number, 'N/A') AS customer_phone,
          COALESCE(b.branch_name, 'Central Hubballi') AS branch_name,
          COALESCE(pl.transaction_category, 'other') AS category,
          pl.type,
          pl.points,
          COALESCE(
            (pl.calc_snapshot->>'bill_amount')::numeric,
            (pl.calc_snapshot->>'amount_paise')::numeric / 100,
            CASE WHEN pl.points < 0 THEN ABS(pl.points) * 0.25 ELSE 0 END
          ) AS bill_amount,
          pl.receipt_no,
          pl.reason_text,
          pl.created_at
        FROM points_ledger pl
        LEFT JOIN customers c ON pl.customer_id = c.customer_id AND pl.tenant_id = c.tenant_id
        LEFT JOIN branches b ON pl.branch_id = b.branch_id
        LEFT JOIN LATERAL (
          SELECT phone_number FROM customer_phones 
          WHERE customer_id = pl.customer_id AND tenant_id = pl.tenant_id 
          LIMIT 1
        ) cp ON true
        WHERE pl.tenant_id = $1
        ORDER BY pl.entry_id DESC
        LIMIT 10;`,
        [tenantId]
      );

      const totalPointsIssued = parseInt(kpis.total_points_issued || 0, 10);
      const totalPointsRedeemed = parseInt(kpis.total_points_redeemed || 0, 10);
      const netPointsLiability = parseInt(kpis.net_points_liability || 0, 10);
      const totalInvoicedRevenue = parseFloat(kpis.total_invoiced_revenue || 0);

      const totalReferrals = parseInt(refKpis.total_referrals || 0, 10);
      const purchasedReferrals = parseInt(refKpis.purchased_referrals || 0, 10);
      const referralConversionRate = totalReferrals > 0 
        ? ((purchasedReferrals / totalReferrals) * 100).toFixed(1) 
        : '0.0';

      return {
        kpis: {
          total_customers: totalCust,
          new_customers_30d: parseInt(custKpis.new_customers_30d || 0, 10),
          total_vehicles: parseInt(vehKpis.total_vehicles || 0, 10),
          bellad_vehicles: parseInt(vehKpis.bellad_vehicles || 0, 10),
          total_transactions: parseInt(kpis.total_transactions || 0, 10),
          total_invoiced_revenue: totalInvoicedRevenue,
          total_points_issued: totalPointsIssued,
          total_points_redeemed: totalPointsRedeemed,
          net_points_liability: netPointsLiability,
          liability_inr: Math.round(netPointsLiability * 0.25),
          discount_delivered_inr: Math.round(totalPointsRedeemed * 0.25),
          gift_cards: {
            total_cards: parseInt(giftKpis.total_gifts || 0, 10),
            claimed_cards: parseInt(giftKpis.claimed_gifts || 0, 10),
            active_unclaimed: parseInt(giftKpis.active_unclaimed_gifts || 0, 10),
            total_volume_inr: parseFloat(giftKpis.total_gift_volume_inr || 0),
          },
          referrals: {
            total: totalReferrals,
            purchased_vehicles: purchasedReferrals,
            conversion_rate_pct: parseFloat(referralConversionRate),
            points_awarded: parseInt(refKpis.referral_points_awarded || 0, 10),
          },
          realbooks_sync: realBooksMetrics,
        },
        branches: branchRes.rows.map((r) => ({
          branch_id: r.branch_id,
          branch_name: r.branch_name,
          branch_city: r.branch_city,
          transactions_count: parseInt(r.transactions_count || 0, 10),
          customer_count: parseInt(r.customer_count || 0, 10),
          points_issued: parseInt(r.points_issued || 0, 10),
          points_redeemed: parseInt(r.points_redeemed || 0, 10),
          net_points: parseInt(r.net_points || 0, 10),
          liability_inr: Math.round(parseInt(r.net_points || 0, 10) * 0.25),
          total_revenue: parseFloat(r.total_revenue || 0),
        })),
        departments: deptRes.rows.map((r) => ({
          category: r.category,
          transactions_count: parseInt(r.transactions_count || 0, 10),
          customer_count: parseInt(r.customer_count || 0, 10),
          points_issued: parseInt(r.points_issued || 0, 10),
          points_redeemed: parseInt(r.points_redeemed || 0, 10),
          revenue_volume: parseFloat(r.revenue_volume || 0),
        })),
        tiers: {
          Silver: tierCounts.Silver,
          Gold: tierCounts.Gold,
          Platinum: tierCounts.Platinum,
          total: totalCust,
        },
        recent_activity: recentTxRes.rows.map((r) => ({
          entry_id: r.entry_id,
          customer_id: r.customer_id,
          customer_name: r.customer_name,
          customer_phone: r.customer_phone,
          branch_name: r.branch_name,
          category: r.category,
          type: r.type,
          points: parseInt(r.points, 10),
          points_formatted: (r.points >= 0 ? `+${r.points}` : `${r.points}`),
          bill_amount: parseFloat(r.bill_amount || 0),
          receipt_no: r.receipt_no,
          reason_text: r.reason_text,
          created_at: r.created_at,
        })),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Dynamic Filterable Records Ledger for Director Deep-Dive
   */
  static async getRecords({
    tenantId = 'bellad_and_company',
    search = '',
    branchId = null,
    category = null,
    type = null,
    startDate = null,
    endDate = null,
    limit = 50,
    offset = 0,
  }) {
    let whereClauses = ['pl.tenant_id = $1'];
    let queryParams = [tenantId];
    let pIdx = 2;

    if (branchId && branchId !== 'all') {
      whereClauses.push(`pl.branch_id = $${pIdx++}`);
      queryParams.push(parseInt(branchId, 10));
    }

    if (category && category !== 'all') {
      whereClauses.push(`pl.transaction_category ILIKE $${pIdx++}`);
      queryParams.push(`%${category}%`);
    }

    if (type && type !== 'all') {
      if (type === 'earn') {
        whereClauses.push(`pl.points > 0`);
      } else if (type === 'redeem') {
        whereClauses.push(`(pl.points < 0 OR pl.type = 'redeem')`);
      }
    }

    if (startDate) {
      whereClauses.push(`pl.created_at >= $${pIdx++}`);
      queryParams.push(new Date(startDate));
    }

    if (endDate) {
      whereClauses.push(`pl.created_at <= $${pIdx++}`);
      queryParams.push(new Date(endDate));
    }

    if (typeof search === 'string' && search.trim()) {
      const s = `%${search.trim()}%`;
      whereClauses.push(
        `(c.customer_name ILIKE $${pIdx} OR pl.customer_id ILIKE $${pIdx} OR cp.phone_number ILIKE $${pIdx} OR pl.receipt_no ILIKE $${pIdx} OR v.registration_number ILIKE $${pIdx} OR v.chassis_no ILIKE $${pIdx})`
      );
      pIdx++;
      queryParams.push(s);
    }

    const whereSql = whereClauses.join(' AND ');

    // Count Total
    const countSql = `
      SELECT COUNT(pl.entry_id) AS total_count
      FROM points_ledger pl
      LEFT JOIN customers c ON pl.customer_id = c.customer_id AND pl.tenant_id = c.tenant_id
      LEFT JOIN vehicles v ON (pl.vehicle_id = v.vehicle_id OR (pl.vehicle_id IS NULL AND v.vehicle_id = (SELECT v2.vehicle_id FROM vehicles v2 WHERE v2.customer_id = pl.customer_id LIMIT 1)))
      LEFT JOIN LATERAL (
        SELECT phone_number FROM customer_phones 
        WHERE customer_id = pl.customer_id AND tenant_id = pl.tenant_id 
        LIMIT 1
      ) cp ON true
      WHERE ${whereSql};
    `;
    const countRes = await pool.query(countSql, queryParams);
    const totalRecords = parseInt(countRes.rows[0]?.total_count || 0, 10);

    // Records Query
    const recordsSql = `
      SELECT 
        pl.entry_id,
        pl.created_at,
        pl.customer_id,
        COALESCE(c.customer_name, 'Valued Member') AS customer_name,
        COALESCE(cp.phone_number, 'N/A') AS customer_phone,
        'Silver' AS customer_tier,
        COALESCE(b.branch_name, 'Central Hubballi') AS branch_name,
        COALESCE(b.branch_city, 'Hubballi') AS branch_city,
        COALESCE(v.registration_number, v.chassis_no, v.vin, 'Registered Vehicle') AS registration_no,
        COALESCE(v.model, 'Vehicle') AS vehicle_model,
        COALESCE(pl.transaction_category, 'other') AS category,
        pl.type,
        pl.points,
        COALESCE(
          (pl.calc_snapshot->>'bill_amount')::numeric,
          (pl.calc_snapshot->>'amount_paise')::numeric / 100,
          CASE WHEN pl.points < 0 THEN ABS(pl.points) * 0.25 ELSE 0 END
        ) AS bill_amount,
        pl.receipt_no,
        pl.reason_text,
        pl.source_ref,
        pl.calc_snapshot
      FROM points_ledger pl
      LEFT JOIN customers c ON pl.customer_id = c.customer_id AND pl.tenant_id = c.tenant_id
      LEFT JOIN branches b ON pl.branch_id = b.branch_id
      LEFT JOIN vehicles v ON (pl.vehicle_id = v.vehicle_id OR (pl.vehicle_id IS NULL AND v.vehicle_id = (SELECT v2.vehicle_id FROM vehicles v2 WHERE v2.customer_id = pl.customer_id LIMIT 1)))
      LEFT JOIN LATERAL (
        SELECT phone_number FROM customer_phones 
        WHERE customer_id = pl.customer_id AND tenant_id = pl.tenant_id 
        LIMIT 1
      ) cp ON true
      WHERE ${whereSql}
      ORDER BY pl.entry_id DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++};
    `;
    queryParams.push(limit);
    queryParams.push(offset);

    const recordsRes = await pool.query(recordsSql, queryParams);

    return {
      total: totalRecords,
      limit,
      offset,
      records: recordsRes.rows.map((r) => ({
        entry_id: r.entry_id,
        date: r.created_at,
        customer_id: r.customer_id,
        customer_name: r.customer_name,
        customer_phone: r.customer_phone,
        customer_tier: r.customer_tier,
        branch_name: r.branch_name,
        branch_city: r.branch_city,
        registration_no: r.registration_no,
        vehicle_model: r.vehicle_model,
        category: r.category,
        type: r.type,
        points: parseInt(r.points, 10),
        points_formatted: (r.points >= 0 ? `+${Number(r.points).toLocaleString('en-IN')}` : `${Number(r.points).toLocaleString('en-IN')}`),
        equivalent_inr: Math.abs(parseInt(r.points, 10)) * 0.25,
        bill_amount: parseFloat(r.bill_amount || 0),
        receipt_no: r.receipt_no || '—',
        reason_text: r.reason_text || '—',
        source_ref: r.source_ref,
        calc_snapshot: r.calc_snapshot,
      })),
    };
  }
}

module.exports = DirectorService;
