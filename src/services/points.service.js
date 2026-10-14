const { pool } = require('../config/db');
const NotificationService = require('./notification.service');
const AuditLogService = require('./audit.service');

class PointsService {
  /**
   * Calculates points using exact integer arithmetic and configurable rates from point_rules table
   */
  static async calculatePoints(type, amount, tenantId, client = pool, options = {}) {
    const category = (type || 'sale').toLowerCase();
    
    // Check if dynamic rule_versions table exists
    const hasRuleVersionsRes = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'rule_versions';`
    );
    
    if (hasRuleVersionsRes.rows.length > 0) {
      try {
        const RuleEngineService = require('./ruleEngine.service');
        const calcRes = await RuleEngineService.calculatePoints({
          tenant_id: tenantId,
          category,
          amount,
          brand_id: options.brand_id,
          branch_id: options.branch_id,
          vehicle_type: options.vehicle_type,
          model_id: options.model_id,
          transaction_type: options.transaction_type,
          invoice_data: options.invoice_data,
          client,
        });
        return calcRes.points;
      } catch (err) {
        console.warn(`[PointsService] Dynamic rule resolution fallback triggered: ${err.message}`);
      }
    }

    // Standard legacy fallback
    const colRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'point_rules';`
    );
    const colNames = colRes.rows.map(r => r.column_name);
    const typeCol = colNames.includes('rate_type') ? 'rate_type' : (colNames.includes('rule_type') ? 'rule_type' : 'rate_type');

    const ruleRes = await client.query(
      `SELECT * FROM point_rules WHERE LOWER(${typeCol}) = $1 AND tenant_id = $2;`,
      [category, tenantId]
    );

    let num = 1n;
    let den = 100n;

    const defaultRatios = {
      sale: { num: 1n, den: 100n },
      service: { num: 4n, den: 100n },
      accessory: { num: 2n, den: 100n },
      bodyshop: { num: 3n, den: 100n },
    };

    if (defaultRatios[category]) {
      num = defaultRatios[category].num;
      den = defaultRatios[category].den;
    }

    if (ruleRes.rows.length > 0) {
      const row = ruleRes.rows[0];
      if (row.multiplier_numerator != null && row.multiplier_denominator != null) {
        num = BigInt(row.multiplier_numerator);
        den = BigInt(row.multiplier_denominator);
      } else if (row.points_per_100 != null) {
        num = BigInt(Math.round(Number(row.points_per_100) * 100));
        den = 10000n;
      }
    }

    if (den === 0n) {
      throw new Error('Invalid point rule: denominator cannot be zero');
    }

    const amt = BigInt(amount);
    const points = (amt * num) / den;

    return Number(points);
  }

  /**
   * Records a points-earning transaction, writes immutable ledger row, updates tier snapshot,
   * logs audit trail, and asynchronously triggers non-blocking WhatsApp notification.
   */
  static async recordEarning({
    customer_id,
    vehicle_id,
    branch_id,
    amount,
    type,
    category,
    reference_id,
    description,
    created_by,
    tenant_id,
    idempotency_key,
  }) {
    const activeCategory = (category || type || 'sale').toLowerCase();
    const activeType = type || (activeCategory === 'sale' ? 'sale' : 'service');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 0. Idempotency & Deduplication Check (LOOP-09 Fix)
      if (idempotency_key || reference_id) {
        const checkRes = await client.query(
          `SELECT entry_id AS id, customer_id, points, created_at
           FROM points_ledger
           WHERE tenant_id = $1 AND (
             (idempotency_key IS NOT NULL AND idempotency_key = $2)
             OR (reference_id IS NOT NULL AND reference_id = $3 AND transaction_type = $4)
           )
           LIMIT 1;`,
          [tenant_id, idempotency_key || null, reference_id || null, activeType]
        );

        if (checkRes.rows.length > 0) {
          await client.query('ROLLBACK');
          console.log(`[Points Earning Deduplicated] Reference '${reference_id}' already processed.`);
          return {
            status: 'deduplicated',
            message: `Transaction '${reference_id}' was previously processed.`,
            ledger_entry: checkRes.rows[0],
            tier_snapshot: null,
          };
        }
      }

      // 1. Verify customer exists and get before-balance snapshot
      const custRes = await client.query(
        `SELECT c.customer_id, c.customer_name AS name
   FROM customers c
   WHERE c.customer_id = $1 AND c.tenant_id = $2;`,
        [customer_id, tenant_id]
      );
      if (custRes.rows.length === 0) {
        throw { statusCode: 404, message: `Customer '${customer_id}' not found in tenant '${tenant_id}'` };
      }

      // current_balance/lifetime_points are computed live from points_ledger
      const beforeAggRes = await client.query(
        `SELECT 
     COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) AS lifetime_points,
     GREATEST(0, COALESCE(SUM(points), 0)) AS current_balance
   FROM points_ledger
   WHERE customer_id = $1 AND tenant_id = $2;`,
        [customer_id, tenant_id]
      );
      const balanceBefore = Math.max(0, parseInt(beforeAggRes.rows[0].current_balance, 10));
      const lifetimeBefore = Math.max(0, parseInt(beforeAggRes.rows[0].lifetime_points, 10));

      // 2. Verify branch exists
      const branchRes = await client.query(
        `SELECT id, name FROM branches WHERE (id::text = $1::text OR code = $1::text) AND tenant_id = $2;`,
        [branch_id, tenant_id]
      );
      if (branchRes.rows.length === 0) {
        throw { statusCode: 404, message: `Branch ID '${branch_id}' not found in tenant '${tenant_id}'` };
      }

      // 3. Resolve Vehicle, Brand & Model details for master rule matching
      let vehicleType = 'ALL';
      let brandName = 'ALL';
      let modelName = 'ALL';
      let variantName = 'ALL';

      if (vehicle_id) {
        const vInfoRes = await client.query(
          `SELECT v.vehicle_type, v.model, v.variant, b.name AS brand_name
           FROM vehicles v
           LEFT JOIN brands b ON b.id = v.brand_id
           WHERE v.vehicle_id = $1 AND v.tenant_id = $2;`,
          [vehicle_id, tenant_id]
        );
        if (vInfoRes.rows.length > 0) {
          const vRow = vInfoRes.rows[0];
          vehicleType = vRow.vehicle_type || 'ALL';
          brandName = vRow.brand_name || 'ALL';
          modelName = vRow.model || 'ALL';
          variantName = vRow.variant || 'ALL';
        }
      }

      // Check Master Policy Engine (AppSheet Brain) for dynamic Director rules
      const MasterRuleEngineService = require('./masterRuleEngine.service');
      const matchedMasterRule = await MasterRuleEngineService.resolveRule({
        tenant_id,
        scheme_type: null,
        spend_type: activeCategory === 'sale' ? 'sale' : 'service',
        vehicle_type: vehicleType,
        brand_name: brandName,
        model_name: modelName,
        variant_name: variantName,
        branch_name: branchRes.rows[0]?.name || 'ALL',
        priority_tier: 'ALL',
        spend_amount: amount,
        transaction_date: new Date(),
        client,
      });

      let earnedPoints;
      let appliedRuleNotice = null;

      if (matchedMasterRule) {
        const outcome = MasterRuleEngineService.calculateOutcome({
          invoice_amount: amount,
          rule: matchedMasterRule,
        });
        earnedPoints = outcome.total_points;
        appliedRuleNotice = `Master Rule: ${matchedMasterRule.rule_name} (${matchedMasterRule.rule_code})`;
      } else {
        earnedPoints = await this.calculatePoints(activeCategory, amount, tenant_id, client);
      }

      // 4. Insert immutable record into points_ledger
      const ledgerTypeMap = {
        sale: 'earn_sale',
        service: 'earn_service',
        accessory: 'earn_service',
        bodyshop: 'earn_service',
        referral: 'earn_referral',
      };
      const ledgerType = ledgerTypeMap[activeCategory] || ledgerTypeMap[activeType] || 'earn_sale';
      const sourceRef = [reference_id, description, appliedRuleNotice].filter(Boolean).join(' | ') || `${activeCategory.toUpperCase()} transaction earning`;
      
      const colsRes = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'points_ledger';`
      );
      const cols = new Set(colsRes.rows.map(r => r.column_name));

      const typeCol = cols.has('type') ? 'type' : 'transaction_type';
      const refCol = cols.has('source_ref') ? 'source_ref' : 'reference_id';
      const actorCol = cols.has('cashier_id') ? 'cashier_id' : 'created_by';
      const hasCategoryCol = cols.has('transaction_category');
      const hasIdempotencyCol = cols.has('idempotency_key');
      const hasRateSnapshotCol = cols.has('redemption_rate_snapshot');

      let insertCols = ['customer_id', 'vehicle_id', 'branch_id', typeCol, 'points', refCol, actorCol, 'tenant_id'];
      let insertVals = [customer_id, vehicle_id || null, branch_id, ledgerType, earnedPoints, sourceRef, created_by || null, tenant_id];

      if (hasCategoryCol) {
        insertCols.push('transaction_category');
        insertVals.push(activeCategory);
      }
      if (hasIdempotencyCol) {
        insertCols.push('idempotency_key');
        insertVals.push(idempotency_key || null);
      }
      if (hasRateSnapshotCol) {
        insertCols.push('redemption_rate_snapshot');
        insertVals.push(0.2500);
      }

      const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(', ');
      const ledgerRes = await client.query(
        `INSERT INTO points_ledger (${insertCols.join(', ')}) VALUES (${placeholders}) RETURNING *;`,
        insertVals
      );

      const ledgerEntry = ledgerRes.rows[0];

      // 5. Calculate lifetime points and current balance from ledger
      const aggRes = await client.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) AS lifetime_points,
           GREATEST(0, COALESCE(SUM(points), 0)) AS current_balance
         FROM points_ledger
         WHERE customer_id = $1 AND tenant_id = $2;`,
        [customer_id, tenant_id]
      );

      const lifetimePoints = Math.max(0, parseInt(aggRes.rows[0].lifetime_points, 10));
      const currentBalance = Math.max(0, parseInt(aggRes.rows[0].current_balance, 10));

      // 6. Recalculate customer tier from TierService (expense & redemption based)
      const TierService = require('./tier.service');
      const snapRow = await TierService.updateCustomerTier(customer_id, tenant_id, client);
      const tierSnapshot = {
        customer_id: snapRow.customer_id,
        tier_name: snapRow.current_tier,
        lifetime_points: snapRow.lifetime_points,
        total_expense_amount: snapRow.total_expense_amount,
        updated_at: snapRow.updated_at,
        current_balance: currentBalance,
      };

      // 8. Log system audit event for points earning
      const actionName = type === 'sale' ? 'points_earn_sale' : (type === 'service' ? 'points_earn_service' : 'points_adjustment');
      await AuditLogService.logEvent({
        action: actionName,
        entity_type: 'customer',
        entity_id: customer_id,
        actor_user_id: created_by || null,
        before_values: { current_balance: balanceBefore, lifetime_points: lifetimeBefore },
        after_values: { current_balance: currentBalance, lifetime_points: lifetimePoints },
        metadata: {
          earned_points: earnedPoints,
          transaction_type: type,
          amount_paise: amount,
          reference_id: reference_id || null,
          branch_id,
          description: description || null,
        },
        tenant_id,
        client,
      });

      await client.query('COMMIT');

      // 8. Queue non-blocking WhatsApp notification (does not block HTTP response)
      NotificationService.queuePointsEarnedNotification({
        customer_id,
        points: earnedPoints,
        transaction_type: type,
        tenant_id,
      });

      return {
        ledger_entry: ledgerEntry,
        tier_snapshot: tierSnapshot,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Fetches full customer ledger history and current tier snapshot
   */
  static async getCustomerLedgerAndTier(customerId, tenantId, limit = 20, offset = 0) {
    // 1. Verify customer exists
    const custRes = await pool.query(
      `SELECT customer_id, customer_name AS name, NULL::text AS email FROM customers WHERE customer_id = $1 AND tenant_id = $2;`,
      [customerId, tenantId]
    );

    if (custRes.rows.length === 0) {
      return null;
    }

    const customer = custRes.rows[0];

    // 2. Fetch current tier snapshot
    // NEW
    let snapshotRes = await pool.query(
      `SELECT cts.customer_id, cts.current_tier AS tier_name, cts.lifetime_points, cts.updated_at
   FROM customer_tier_snapshot cts
   WHERE cts.customer_id = $1 AND cts.tenant_id = $2;`,
      [customerId, tenantId]
    );

    let tierSnapshot = snapshotRes.rows[0];

    // If no snapshot exists yet, construct default baseline
    if (!tierSnapshot) {
      tierSnapshot = {
        customer_id: customerId,
        tier_name: 'Silver',
        lifetime_points: 0,
        updated_at: new Date().toISOString(),
      };
    }

    // current_balance is no longer cached - compute it live from points_ledger
    const liveBalanceRes = await pool.query(
      `SELECT GREATEST(0, COALESCE(SUM(points), 0)) AS current_balance FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2;`,
      [customerId, tenantId]
    );
    tierSnapshot.current_balance = Math.max(0, parseInt(liveBalanceRes.rows[0].current_balance, 10));

    // tier_multiplier used to come from the tier_rules join - look up benefits_json instead
    const tierInfoRes = await pool.query(
      `SELECT benefits_json FROM tier_rules WHERE tenant_id = $1 AND tier_name = $2;`,
      [tenantId, tierSnapshot.tier_name]
    );
    const benefits = tierInfoRes.rows[0]?.benefits_json || {};
    tierSnapshot.tier_multiplier = Number(benefits.tier_multiplier) || 100;

    // 3. Total ledger records count
    const countRes = await pool.query(
      `SELECT COUNT(*) AS total FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2;`,
      [customerId, tenantId]
    );
    const totalCount = parseInt(countRes.rows[0].total, 10);

    // 4. Fetch paginated ledger entries
    const entriesRes = await pool.query(
      `SELECT pl.entry_id AS id, pl.customer_id, pl.branch_id, b.branch_name AS branch_name,
              pl.type AS transaction_type, pl.points, pl.source_ref AS reference_id,
              pl.cashier_id AS created_by, u.username AS created_by_username,
              pl.created_at
       FROM points_ledger pl
       LEFT JOIN branches b ON pl.branch_id = b.branch_id
       LEFT JOIN users u ON pl.cashier_id = u.user_id
       WHERE pl.customer_id = $1 AND pl.tenant_id = $2
       ORDER BY pl.created_at DESC, pl.entry_id DESC
       LIMIT $3 OFFSET $4;`,
      [customerId, tenantId, limit, offset]
    );

    return {
      customer: {
        customer_id: customer.customer_id,
        name: customer.name,
        email: customer.email,
      },
      current_tier: {
        tier_name: tierSnapshot.tier_name,
        lifetime_points: parseInt(tierSnapshot.lifetime_points, 10),
        current_balance: parseInt(tierSnapshot.current_balance, 10),
        tier_multiplier: tierSnapshot.tier_multiplier || 100,
        last_updated: tierSnapshot.updated_at,
      },
      pagination: {
        total: totalCount,
        limit,
        offset,
      },
      ledger_entries: entriesRes.rows,
    };
  }

  /**
   * Grants fixed bonus points (e.g., for in-house finance, insurance, exchange service bonus)
   */
  static async grantFixedBonus({
    customer_id,
    vehicle_id,
    branch_id = 1,
    points,
    category = 'service',
    type = 'earn_service',
    reference_id,
    description,
    created_by = null,
    tenant_id,
  }) {
    if (!points || points <= 0) return null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify customer exists
      const custRes = await client.query(
        `SELECT customer_id FROM customers WHERE customer_id = $1 AND tenant_id = $2;`,
        [customer_id, tenant_id]
      );
      if (custRes.rows.length === 0) {
        throw { statusCode: 404, message: `Customer '${customer_id}' not found in tenant '${tenant_id}'` };
      }

      // 2. Fetch before balance snapshot
      const beforeAggRes = await client.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) AS lifetime_points,
           GREATEST(0, COALESCE(SUM(points), 0)) AS current_balance
         FROM points_ledger
         WHERE customer_id = $1 AND tenant_id = $2;`,
        [customer_id, tenant_id]
      );
      const balanceBefore = Math.max(0, parseInt(beforeAggRes.rows[0].current_balance, 10));
      const lifetimeBefore = Math.max(0, parseInt(beforeAggRes.rows[0].lifetime_points, 10));

      // 3. Insert record into points_ledger
      const sourceRef = [reference_id, description].filter(Boolean).join(' | ') || 'In-house service bonus points';

      const hasCategoryColRes = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'points_ledger' AND column_name = 'transaction_category';`
      );
      const hasCategoryCol = hasCategoryColRes.rows.length > 0;

      let ledgerRes;
      if (hasCategoryCol) {
        ledgerRes = await client.query(
          `INSERT INTO points_ledger (
            customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, cashier_id, tenant_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING entry_id AS id, customer_id, vehicle_id, branch_id, type AS transaction_type, transaction_category, points,
                    source_ref AS reference_id, cashier_id AS created_by, tenant_id, created_at;`,
          [customer_id, vehicle_id || null, branch_id, type, category, points, sourceRef, created_by || null, tenant_id]
        );
      } else {
        ledgerRes = await client.query(
          `INSERT INTO points_ledger (
            customer_id, vehicle_id, branch_id, type, points, source_ref, cashier_id, tenant_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING entry_id AS id, customer_id, vehicle_id, branch_id, type AS transaction_type, points,
                    source_ref AS reference_id, cashier_id AS created_by, tenant_id, created_at;`,
          [customer_id, vehicle_id || null, branch_id, type, points, sourceRef, created_by || null, tenant_id]
        );
      }
      const ledgerEntry = ledgerRes.rows[0];

      // 4. Calculate updated lifetime points & current balance
      const aggRes = await client.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) AS lifetime_points,
           GREATEST(0, COALESCE(SUM(points), 0)) AS current_balance
         FROM points_ledger
         WHERE customer_id = $1 AND tenant_id = $2;`,
        [customer_id, tenant_id]
      );
      const lifetimePoints = Math.max(0, parseInt(aggRes.rows[0].lifetime_points, 10));
      const currentBalance = Math.max(0, parseInt(aggRes.rows[0].current_balance, 10));

      // 5. Recalculate customer tier
      const TierService = require('./tier.service');
      const snapRow = await TierService.updateCustomerTier(customer_id, tenant_id, client);
      const tierSnapshot = {
        customer_id: snapRow.customer_id,
        tier_name: snapRow.current_tier,
        lifetime_points: snapRow.lifetime_points,
        total_expense_amount: snapRow.total_expense_amount,
        updated_at: snapRow.updated_at,
        current_balance: currentBalance,
      };

      // 6. Log audit event
      await AuditLogService.logEvent({
        action: 'points_earn_bonus',
        entity_type: 'customer',
        entity_id: customer_id,
        actor_user_id: created_by || null,
        before_values: { current_balance: balanceBefore, lifetime_points: lifetimeBefore },
        after_values: { current_balance: currentBalance, lifetime_points: lifetimePoints },
        metadata: { earned_points: points, reference_id, branch_id, description },
        tenant_id,
        client,
      });

      await client.query('COMMIT');

      // 7. Queue non-blocking notification
      NotificationService.queuePointsEarnedNotification({
        customer_id,
        points,
        transaction_type: 'service_bonus',
        tenant_id,
      });

      return { ledger_entry: ledgerEntry, tier_snapshot: tierSnapshot };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = PointsService;
