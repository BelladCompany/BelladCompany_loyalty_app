const { pool } = require('../config/db');

class TierService {
  /**
   * Calculates a customer's total expense metric:
   * Total spending (₹) across purchases & services + Total redemption discount (₹)
   */
  static async calculateCustomerExpenseMetric(customerId, tenantId, client = pool) {
    const query = `
      WITH cust_sales AS (
        SELECT 
          SUM(GREATEST(0, (st.ex_showroom_price_paise - COALESCE(st.dealer_cash_discount_paise, 0) - COALESCE(st.emps_discount_paise, 0) - COALESCE(st.oem_offers_amount_paise, 0)) / 100)) as sales_rs
        FROM sale_transactions st
        LEFT JOIN vehicles v ON st.vehicle_id = v.vehicle_id
        WHERE st.customer_id = $1 AND st.tenant_id = $2
          AND (v.purchase_date IS NULL OR v.purchase_date >= '2026-04-01')
          AND COALESCE(st.stage, '') <> 'pre_program_launch'
      ),
      cust_ledger_sales AS (
        SELECT 
          SUM(pl.points * 100) as ledger_sales_rs
        FROM points_ledger pl
        LEFT JOIN vehicles v ON pl.vehicle_id = v.vehicle_id
        WHERE pl.customer_id = $1 AND pl.tenant_id = $2 AND pl.type = 'earn_sale'
          AND (v.purchase_date IS NULL OR v.purchase_date >= '2026-04-01')
      ),
      cust_service AS (
        SELECT 
          SUM(st.bill_amount_paise / 100) as service_rs
        FROM service_transactions st
        WHERE st.customer_id = $1 AND st.tenant_id = $2
      ),
      cust_ledger_service AS (
        SELECT 
          SUM(pl.points * 25) as ledger_service_rs
        FROM points_ledger pl
        WHERE pl.customer_id = $1 AND pl.tenant_id = $2 AND pl.type IN ('earn_service', 'earn') AND pl.transaction_category = 'service'
      ),
      cust_redemptions AS (
        SELECT 
          SUM(r.discount_amount) as redemption_rs
        FROM redemptions r
        WHERE r.customer_id = $1 AND r.tenant_id = $2
      ),
      cust_ledger_redemptions AS (
        SELECT 
          SUM(ABS(pl.points) * 0.25) as ledger_redemption_rs
        FROM points_ledger pl
        WHERE pl.customer_id = $1 AND pl.tenant_id = $2 AND pl.type = 'redeem'
      )
      SELECT 
        ROUND(
          COALESCE(
            (SELECT sales_rs FROM cust_sales),
            (SELECT ledger_sales_rs FROM cust_ledger_sales),
            0
          ) +
          GREATEST(
            COALESCE((SELECT service_rs FROM cust_service), 0),
            COALESCE((SELECT ledger_service_rs FROM cust_ledger_service), 0)
          ) +
          GREATEST(
            COALESCE((SELECT redemption_rs FROM cust_redemptions), 0),
            COALESCE((SELECT ledger_redemption_rs FROM cust_ledger_redemptions), 0)
          ),
          2
        ) as total_metric_rs;
    `;

    const res = await client.query(query, [customerId, tenantId]);
    return parseFloat(res.rows[0]?.total_metric_rs || '0');
  }

  /**
   * Determines the customer tier based on expense metric and tier_rules.
   * Slabs:
   *   Silver:   Default (< ₹10,00,000)
   *   Gold:     ₹10,00,000 - ₹24,99,999.99
   *   Platinum: ₹25,00,000+
   */
  static async determineTier(totalMetricRs, tenantId, client = pool) {
    const rulesRes = await client.query(
      `SELECT tier_name, min_expense_amount
       FROM tier_rules
       WHERE tenant_id = $1 AND min_expense_amount <= $2
       ORDER BY min_expense_amount DESC
       LIMIT 1;`,
      [tenantId, totalMetricRs]
    );

    if (rulesRes.rows.length > 0) {
      return rulesRes.rows[0].tier_name;
    }

    if (totalMetricRs >= 2500000) return 'Platinum';
    if (totalMetricRs >= 1000000) return 'Gold';
    return 'Silver';
  }

  /**
   * Recalculates and updates customer_tier_snapshot based on total customer expense & redemptions.
   */
  static async updateCustomerTier(customerId, tenantId, client = pool) {
    const totalMetricRs = await this.calculateCustomerExpenseMetric(customerId, tenantId, client);
    const tierName = await this.determineTier(totalMetricRs, tenantId, client);

    const aggRes = await client.query(
      `SELECT COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) AS lifetime_points
       FROM points_ledger
       WHERE customer_id = $1 AND tenant_id = $2;`,
      [customerId, tenantId]
    );
    const lifetimePoints = Math.max(0, parseInt(aggRes.rows[0]?.lifetime_points || '0', 10));

    const snapRes = await client.query(
      `INSERT INTO customer_tier_snapshot (
         customer_id, tenant_id, current_tier, lifetime_points, total_expense_amount, updated_at
       ) VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (customer_id) DO UPDATE
       SET current_tier = EXCLUDED.current_tier,
           lifetime_points = EXCLUDED.lifetime_points,
           total_expense_amount = EXCLUDED.total_expense_amount,
           updated_at = NOW()
       RETURNING customer_id, current_tier, lifetime_points, total_expense_amount, updated_at;`,
      [customerId, tenantId, tierName, lifetimePoints, totalMetricRs]
    );

    return snapRes.rows[0];
  }

  /**
   * Fetches the current tier info for a customer, falling back to live calculation if absent.
   */
  static async getCustomerTier(customerId, tenantId, client = pool) {
    const res = await client.query(
      `SELECT customer_id, current_tier, lifetime_points, total_expense_amount, updated_at
       FROM customer_tier_snapshot
       WHERE customer_id = $1 AND tenant_id = $2;`,
      [customerId, tenantId]
    );

    if (res.rows.length > 0) {
      return res.rows[0];
    }

    return this.updateCustomerTier(customerId, tenantId, client);
  }
}

module.exports = TierService;
