const { pool } = require('../config/db');
const VehiclePointsEngine = require('./vehiclePointsEngine.service');
const NotificationService = require('./notification.service');
const AuditLogService = require('./audit.service');

class VehicleSalesPointsService {
  /**
   * Reads rate rule for tenant dynamically from point_rules table.
   * @param {string} tenantId 
   * @param {Object} [client=pool] 
   * @returns {Promise<Object>}
   */
  static async getTenantRate(tenantId, client = pool) {
    const colRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'point_rules';`
    );
    const colNames = colRes.rows.map((r) => r.column_name);
    const typeCol = colNames.includes('rule_type') ? 'rule_type' : 'rate_type';

    const ruleRes = await client.query(
      `SELECT * FROM point_rules WHERE LOWER(${typeCol}) = 'sale' AND tenant_id = $1 LIMIT 1;`,
      [tenantId]
    );

    if (ruleRes.rows.length > 0) {
      return ruleRes.rows[0];
    }

    // Default fallback if tenant rule is not yet seeded
    return { multiplier_numerator: 1, multiplier_denominator: 100, description: 'Default sale rate: 1/100' };
  }

  /**
   * Recalculates tier snapshot and lifetime points for a customer
   */
  static async updateCustomerTierSnapshot(customerId, tenantId, client = pool) {
    const TierService = require('./tier.service');
    return TierService.updateCustomerTier(customerId, tenantId, client);
  }

  /**
   * Process points calculation for a vehicle sale transaction idempotently.
   * Supports initial issuance (reason_type = "purchase") and corrections (reason_type = "manual_adjustment").
   */
  static async processSaleTransaction(saleData, dbClient = null) {
    const client = dbClient || (await pool.connect());
    const isOwnClient = !dbClient;

    try {
      if (isOwnClient) await client.query('BEGIN');

      const {
        transaction_id,
        reference_id,
        customer_id,
        vehicle_id,
        branch_id = 1,
        tenant_id,
        tenantId: explicitTenantId,
        ex_showroom_price = 0,
        tcs_amount = 0,
        dealer_cash_discount = 0,
        emps_discount = 0,
        oem_offers_amount = 0,
        additional_discounts = [],
        is_invoice_finalized = true,
        stage = 'finalized',
        created_by = null,
      } = saleData;

      const tenantId = tenant_id || explicitTenantId || 'bellad_and_company';

      const txRef = reference_id || transaction_id;
      if (!txRef) {
        throw new Error('Transaction reference_id or transaction_id is required for vehicle sales points calculation.');
      }

      // RULE 4: Compute at invoice finalization, not at booking stage
      const finalized = is_invoice_finalized === true && String(stage).toLowerCase() !== 'booking';
      if (!finalized) {
        if (isOwnClient) await client.query('COMMIT');
        return {
          status: 'skipped_not_finalized',
          message: `Transaction '${txRef}' is at booking stage / not finalized. Points deferred.`,
        };
      }

      // RULE 5: Program Inception Policy (April 1, 2026)
      // Only vehicles purchased on or after April 1, 2026 receive loyalty points and enroll in loyalty rewards.
      let vehiclePurchaseDate = saleData.purchase_date || saleData.dms_invoice_date || null;
      if (!vehiclePurchaseDate && vehicle_id) {
        const vDateRes = await client.query(
          `SELECT purchase_date, dms_invoice_date FROM vehicles WHERE vehicle_id = $1 AND tenant_id = $2;`,
          [vehicle_id, tenantId]
        );
        if (vDateRes.rows.length > 0) {
          vehiclePurchaseDate = vDateRes.rows[0].purchase_date || vDateRes.rows[0].dms_invoice_date;
        }
      }

      if (vehiclePurchaseDate && new Date(vehiclePurchaseDate) < new Date('2026-04-01')) {
        if (isOwnClient) await client.query('COMMIT');
        return {
          status: 'skipped_pre_april_2026',
          message: `Vehicle purchase date (${vehiclePurchaseDate}) is prior to loyalty program launch (April 1, 2026). No loyalty points awarded.`,
          points: 0,
        };
      }

      // RULE 6: Read rate dynamically from point_rules config table scoped per tenant
      const rateConfig = await this.getTenantRate(tenantId, client);

      // FORMULA & RULES: Calculate points via pure calculation engine
      const calcResult = VehiclePointsEngine.calculatePoints(
        {
          ex_showroom_price,
          tcs_amount,
          dealer_cash_discount,
          emps_discount,
          oem_offers_amount,
          additional_discounts,
        },
        rateConfig
      );

      // Check Master Policy Engine for model-specific sales rules
      let vehicleType = 'ALL';
      let brandName = 'ALL';
      let modelName = 'ALL';

      if (vehicle_id) {
        const vInfo = await client.query(
          `SELECT v.vehicle_type, v.model, COALESCE(v.brand_name, b.brand_name) AS brand_name
           FROM vehicles v LEFT JOIN brands b ON b.brand_id = v.brand_id
           WHERE v.vehicle_id = $1 AND v.tenant_id = $2;`,
          [vehicle_id, tenantId]
        );
        if (vInfo.rows.length > 0) {
          vehicleType = vInfo.rows[0].vehicle_type || 'ALL';
          brandName = vInfo.rows[0].brand_name || 'ALL';
          modelName = vInfo.rows[0].model || 'ALL';
        }
      }

      const MasterRuleEngineService = require('./masterRuleEngine.service');
      const matchedMasterRule = await MasterRuleEngineService.resolveRule({
        tenant_id: tenantId,
        scheme_type: null,
        spend_type: 'sale',
        vehicle_type: vehicleType,
        brand_name: brandName,
        model_name: modelName,
        spend_amount: ex_showroom_price,
        transaction_date: new Date(),
        client,
      });

      let finalPoints = calcResult.points;
      let ruleReason = calcResult.reason_text;

      if (matchedMasterRule) {
        const outcome = MasterRuleEngineService.calculateOutcome({
          invoice_amount: ex_showroom_price,
          rule: matchedMasterRule,
        });
        finalPoints = outcome.total_points;
        ruleReason = `Master Rule: ${matchedMasterRule.rule_name} (${matchedMasterRule.rule_code}) - ${outcome.reason}`;
      }

      // Check existing ledger records for this source_ref (including legacy prefixes like 'PR Done Sales Sync: ')
      const existingLedgerRes = await client.query(
        `SELECT entry_id, points, reason_type FROM points_ledger WHERE tenant_id = $1 AND (source_ref = $2 OR source_ref LIKE '%' || $2) ORDER BY entry_id ASC;`,
        [tenantId, txRef]
      );

      const existingEntries = existingLedgerRes.rows;

      if (existingEntries.length === 0) {
        // --- INITIAL ISSUANCE ---
        // OUTPUT: Write one immutable row to points_ledger per transaction
        const hasCols = await client.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = 'points_ledger';`
        );
        const colList = hasCols.rows.map((r) => r.column_name);

        const fields = ['customer_id', 'vehicle_id', 'branch_id', 'type', 'transaction_category', 'points', 'source_ref', 'tenant_id'];
        const vals = [customer_id, vehicle_id || null, branch_id, 'earn_sale', 'sale', finalPoints, txRef, tenantId];

        if (colList.includes('reason_type')) {
          fields.push('reason_type');
          vals.push('purchase');
        }
        if (colList.includes('reason_text')) {
          fields.push('reason_text');
          vals.push(ruleReason);
        }
        if (colList.includes('reason')) {
          fields.push('reason');
          vals.push(ruleReason);
        }
        if (colList.includes('amount_paise')) {
          fields.push('amount_paise');
          vals.push(Math.round(calcResult.points_base * 100));
        }
        if (colList.includes('cashier_id')) {
          fields.push('cashier_id');
          vals.push(created_by || null);
        }

        const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
        const ledgerIns = await client.query(
          `INSERT INTO points_ledger (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *;`,
          vals
        );

        // Update sale_transactions points_calculated flag
        await client.query(
          `UPDATE sale_transactions
           SET points_calculated = TRUE, last_processed_at = NOW()
           WHERE tenant_id = $1 AND reference_id = $2;`,
          [tenantId, txRef]
        );

        // Update tier snapshot
        await this.updateCustomerTierSnapshot(customer_id, tenantId, client);

        if (isOwnClient) await client.query('COMMIT');

        // Non-blocking notification
        NotificationService.queuePointsEarnedNotification({
          customer_id,
          points: calcResult.points,
          transaction_type: 'sale',
          tenant_id: tenantId,
        });

        return {
          status: 'credited',
          points: calcResult.points,
          reason_type: 'purchase',
          reason_text: calcResult.reason_text,
          ledger_entry: ledgerIns.rows[0],
        };
      } else {
        // --- APPEND-ONLY ADJUSTMENT FOR EXISTING SALE TRANSACTION (LOOP-05 FIX) ---
        const primaryEntry = existingEntries.find((r) => r.reason_type === 'purchase') || existingEntries[0];
        const existingPoints = parseInt(primaryEntry.points || 0, 10);
        const pointDelta = calcResult.points - existingPoints;
        let ledgerResultRow = primaryEntry;

        if (pointDelta !== 0) {
          let effectiveDelta = pointDelta;
          if (pointDelta < 0) {
            const balRes = await client.query(
              `SELECT GREATEST(0, COALESCE(SUM(points), 0)) AS current_balance FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2;`,
              [customer_id, tenantId]
            );
            const currentBal = parseInt(balRes.rows[0].current_balance, 10);
            effectiveDelta = Math.max(-currentBal, pointDelta);
          }

          if (effectiveDelta !== 0) {
            const adjIns = await client.query(
              `INSERT INTO points_ledger (
                 customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, reason_type, reason_text, tenant_id
               ) VALUES ($1, $2, $3, 'adjust', 'sale', $4, $5, 'manual_adjustment', $6, $7)
               RETURNING *;`,
              [
                customer_id,
                vehicle_id || null,
                branch_id,
                effectiveDelta,
                `ADJ-${reference_id}`,
                `Adjustment for sale transaction #${reference_id}: ${calcResult.reason_text}`,
                tenantId,
              ]
            );
            ledgerResultRow = adjIns.rows[0];
          }
        }

        await client.query(
          `UPDATE sale_transactions
           SET points_calculated = TRUE, last_processed_at = NOW()
           WHERE tenant_id = $1 AND reference_id = $2;`,
          [tenantId, txRef]
        );

        await this.updateCustomerTierSnapshot(customer_id, tenantId, client);

        if (isOwnClient) await client.query('COMMIT');

        return {
          status: pointDelta === 0 ? 'already_processed' : 'updated_in_place',
          points: calcResult.points,
          reason_text: calcResult.reason_text,
          ledger_entry: ledgerResultRow,
        };
      }
    } catch (err) {
      if (isOwnClient) await client.query('ROLLBACK');
      throw err;
    } finally {
      if (isOwnClient) client.release();
    }
  }

  /**
   * Batch process sales transactions during sync cycle
   */
  static async batchProcessSales(tenantId = 'bellad_and_company', limit = 100) {
    const client = await pool.connect();
    try {
      const salesRes = await client.query(
        `SELECT st.*
         FROM sale_transactions st
         WHERE st.tenant_id = $1
           AND st.is_invoice_finalized = TRUE
           AND (st.points_calculated = FALSE OR st.last_processed_at IS NULL)
         ORDER BY st.created_at ASC
         LIMIT $2;`,
        [tenantId, limit]
      );

      const rows = salesRes.rows;
      console.log(`[VehicleSalesPoints] Batch processing ${rows.length} sale transactions for tenant '${tenantId}'...`);

      let processedCount = 0;
      let creditedCount = 0;
      let adjustedCount = 0;

      for (const st of rows) {
        // Fetch generic discounts sub-table rows for this sale transaction
        const discRes = await client.query(
          `SELECT discount_type, discount_name, amount_paise / 100.0 AS amount
           FROM sale_transaction_discounts
           WHERE tenant_id = $1 AND (reference_id = $2 OR sale_transaction_id = $3);`,
          [tenantId, st.reference_id, st.id]
        );

        const exPrice = Number(st.ex_showroom_price_paise || 0) / 100;
        const tcs = Number(st.tcs_amount_paise || 0) / 100;
        const dealer = Number(st.dealer_cash_discount_paise || 0) / 100;
        const emps = Number(st.emps_discount_paise || 0) / 100;
        const oem = Number(st.oem_offers_amount_paise || 0) / 100;

        const res = await this.processSaleTransaction({
          transaction_id: st.reference_id,
          reference_id: st.reference_id,
          customer_id: st.customer_id,
          vehicle_id: st.vehicle_id,
          branch_id: st.branch_id || 1,
          tenant_id: tenantId,
          ex_showroom_price: exPrice,
          tcs_amount: tcs,
          dealer_cash_discount: dealer,
          emps_discount: emps,
          oem_offers_amount: oem,
          additional_discounts: discRes.rows,
          is_invoice_finalized: st.is_invoice_finalized,
          stage: st.stage,
        });

        processedCount++;
        if (res.status === 'credited') creditedCount++;
        if (res.status === 'adjusted') adjustedCount++;
      }

      return {
        totalBatch: rows.length,
        processedCount,
        creditedCount,
        adjustedCount,
      };
    } finally {
      client.release();
    }
  }
}

module.exports = VehicleSalesPointsService;
