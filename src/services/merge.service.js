const { pool } = require('../config/db');
const CustomerService = require('./customer.service');
const AuditLogService = require('./audit.service');

class MergeService {
  /**
   * Detects duplicate customer candidates based on phone overlap or high name similarity
   */
  static async detectDuplicates(tenantId) {
    // 1. Find pairs with phone number overlap or suffix match
    const phoneOverlapRes = await pool.query(
      `SELECT DISTINCT cp1.customer_id AS id_a, cp2.customer_id AS id_b,
              'phone_overlap' AS match_reason,
              cp1.phone_number AS matched_phone
       FROM customer_phones cp1
       JOIN customer_phones cp2 ON cp1.tenant_id = cp2.tenant_id 
                               AND (cp1.phone_number = cp2.phone_number OR cp1.phone_number LIKE ('%' || cp2.phone_number))
                               AND cp1.customer_id < cp2.customer_id
       JOIN customers c1 ON cp1.customer_id = c1.customer_id AND c1.is_merged = FALSE
       JOIN customers c2 ON cp2.customer_id = c2.customer_id AND c2.is_merged = FALSE
       WHERE cp1.tenant_id = $1
       LIMIT 25;`,
      [tenantId]
    );

    // 2. Find pairs with high name similarity using pg_trgm
    const nameSimilarityRes = await pool.query(
      `SELECT c1.customer_id AS id_a, c2.customer_id AS id_b,
              'name_similarity' AS match_reason,
              SIMILARITY(c1.customer_name, c2.customer_name) AS similarity_score
       FROM customers c1
       JOIN customers c2 ON c1.tenant_id = c2.tenant_id 
                        AND c1.customer_id < c2.customer_id
                        AND c1.is_merged = FALSE 
                        AND c2.is_merged = FALSE
                        AND (SIMILARITY(c1.customer_name, c2.customer_name) >= 0.35 OR c1.customer_name % c2.customer_name)
       WHERE c1.tenant_id = $1
       ORDER BY similarity_score DESC
       LIMIT 25;`,
      [tenantId]
    );

    const pairMap = new Map();

    const addPair = (idA, idB, reason, score = 0, detail = '') => {
      const key = `${idA}:${idB}`;
      if (!pairMap.has(key)) {
        pairMap.set(key, { id_a: idA, id_b: idB, reason, score, detail });
      }
    };

    phoneOverlapRes.rows.forEach((r) =>
      addPair(r.id_a, r.id_b, 'Phone Number Match', 1.0, `Matched phone: ${r.matched_phone}`)
    );

    nameSimilarityRes.rows.forEach((r) =>
      addPair(
        r.id_a,
        r.id_b,
        `High Name Similarity (${Math.round(r.similarity_score * 100)}%)`,
        r.similarity_score,
        'Matching name trigrams'
      )
    );

    // Fetch full profiles for candidate pairs
    const candidates = [];
    for (const item of pairMap.values()) {
      const [custA, custB] = await Promise.all([
        CustomerService.getCustomerById(item.id_a, tenantId),
        CustomerService.getCustomerById(item.id_b, tenantId),
      ]);

      if (custA && custB && !custA.is_merged && !custB.is_merged) {
        // Get current point balance for each
        const [balARes, balBRes] = await Promise.all([
          pool.query(`SELECT COALESCE(SUM(points), 0) as bal FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2`, [custA.customer_id, tenantId]),
          pool.query(`SELECT COALESCE(SUM(points), 0) as bal FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2`, [custB.customer_id, tenantId]),
        ]);

        candidates.push({
          candidate_id: `${custA.customer_id}-${custB.customer_id}`,
          match_reason: item.reason,
          similarity_score: item.score,
          detail: item.detail,
          customer_a: {
            ...custA,
            current_balance: parseInt(balARes.rows[0]?.bal || 0, 10),
          },
          customer_b: {
            ...custB,
            current_balance: parseInt(balBRes.rows[0]?.bal || 0, 10),
          },
        });
      }
    }

    return candidates;
  }

  /**
   * Transactional customer merge: combines points_ledger, phones, vehicles under surviving customer_id,
   * marks old customer as merged (never deletes), and writes permanent entry to customer_merge_log.
   */
  static async executeMerge({
    surviving_customer_id,
    merged_customer_id,
    reason,
    admin_user_id,
    tenant_id,
  }) {
    if (surviving_customer_id === merged_customer_id) {
      throw { statusCode: 400, message: 'Surviving and merged customer IDs must be distinct.' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Enable trigger bypass for merge reassociation
      await client.query("SET LOCAL loyalty.allow_merge = 'on';");

      // 1. Verify surviving customer
      const survRes = await client.query(
        `SELECT customer_id, customer_name AS name, is_merged FROM customers WHERE customer_id = $1 AND tenant_id = $2 FOR UPDATE;`,
        [surviving_customer_id, tenant_id]
      );
      if (survRes.rows.length === 0) {
        throw { statusCode: 404, message: `Surviving customer '${surviving_customer_id}' not found.` };
      }
      if (survRes.rows[0].is_merged) {
        throw { statusCode: 400, message: `Surviving customer '${surviving_customer_id}' is already marked as merged.` };
      }

      // 2. Verify customer to be merged
      const mergeRes = await client.query(
        `SELECT customer_id, customer_name AS name, is_merged FROM customers WHERE customer_id = $1 AND tenant_id = $2 FOR UPDATE;`,
        [merged_customer_id, tenant_id]
      );
      if (mergeRes.rows.length === 0) {
        throw { statusCode: 404, message: `Customer to merge '${merged_customer_id}' not found.` };
      }
      if (mergeRes.rows[0].is_merged) {
        throw { statusCode: 400, message: `Customer '${merged_customer_id}' has already been merged.` };
      }

      // Fetch surviving balance before merge
      const survBalRes = await client.query(
        `SELECT COALESCE(SUM(points), 0) AS bal FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2;`,
        [surviving_customer_id, tenant_id]
      );
      const survivingBalanceBefore = parseInt(survBalRes.rows[0].bal, 10);

      // 3. Count assets before reassociation
      const [ptsRes, phonesCountRes, vehCountRes] = await Promise.all([
        client.query(`SELECT COALESCE(SUM(points), 0) as total FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2;`, [merged_customer_id, tenant_id]),
        client.query(`SELECT COUNT(*) as count FROM customer_phones WHERE customer_id = $1 AND tenant_id = $2;`, [merged_customer_id, tenant_id]),
        client.query(`SELECT COUNT(*) as count FROM vehicles WHERE customer_id = $1 AND tenant_id = $2;`, [merged_customer_id, tenant_id]),
      ]);

      const transferredPoints = parseInt(ptsRes.rows[0].total, 10);
      const transferredPhones = parseInt(phonesCountRes.rows[0].count, 10);
      const transferredVehicles = parseInt(vehCountRes.rows[0].count, 10);

      // 4. Reassociate points_ledger records to surviving_customer_id
      await client.query(
        `UPDATE points_ledger
         SET customer_id = $1, updated_at = NOW()
         WHERE customer_id = $2 AND tenant_id = $3;`,
        [surviving_customer_id, merged_customer_id, tenant_id]
      );

      // 5. Reassociate vehicles to surviving_customer_id
      await client.query(
        `UPDATE vehicles
         SET customer_id = $1, updated_at = NOW()
         WHERE customer_id = $2 AND tenant_id = $3;`,
        [surviving_customer_id, merged_customer_id, tenant_id]
      );

      // 6. Reassociate phones to surviving_customer_id (handling duplicates)
      const mergedPhones = await client.query(
        `SELECT phone_id AS id, phone_number FROM customer_phones WHERE customer_id = $1 AND tenant_id = $2;`,
        [merged_customer_id, tenant_id]
      );

      for (const phoneRow of mergedPhones.rows) {
        // Check if surviving customer already has this phone
        const existingPhone = await client.query(
          `SELECT phone_id AS id FROM customer_phones WHERE customer_id = $1 AND phone_number = $2 AND tenant_id = $3;`,
          [surviving_customer_id, phoneRow.phone_number, tenant_id]
        );

        if (existingPhone.rows.length > 0) {
          // Remove duplicate phone record from merged customer
          await client.query(`DELETE FROM customer_phones WHERE phone_id = $1;`, [phoneRow.id]);
        } else {
          // Reassign phone to surviving customer
          await client.query(
            `UPDATE customer_phones SET customer_id = $1, is_verified = FALSE WHERE phone_id = $2;`,
            [surviving_customer_id, phoneRow.id]
          );
        }
      }

      // 7. Mark old customer as merged (NEVER delete)
      await client.query(
        `UPDATE customers
         SET is_merged = TRUE,
             merged_into_customer_id = $1,
             updated_at = NOW()
         WHERE customer_id = $2 AND tenant_id = $3;`,
        [surviving_customer_id, merged_customer_id, tenant_id]
      );

      // 8. Permanent audit record in customer_merge_log
      const logRes = await client.query(
        `INSERT INTO customer_merge_log (
           surviving_customer_id, merged_customer_id, approved_by, reason,
           transferred_points, transferred_phones, transferred_vehicles, tenant_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, surviving_customer_id, merged_customer_id, approved_by,
                   reason, transferred_points, transferred_phones, transferred_vehicles, created_at;`,
        [
          surviving_customer_id,
          merged_customer_id,
          admin_user_id || null,
          reason.trim(),
          transferredPoints,
          transferredPhones,
          transferredVehicles,
          tenant_id,
        ]
      );

      const mergeLog = logRes.rows[0];

      // 9. Recalculate lifetime points and update tier snapshot for surviving customer
      const aggRes = await client.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) AS lifetime_points,
           COALESCE(SUM(points), 0) AS current_balance
         FROM points_ledger
         WHERE customer_id = $1 AND tenant_id = $2;`,
        [surviving_customer_id, tenant_id]
      );

      const lifetimePoints = parseInt(aggRes.rows[0].lifetime_points, 10);
      const currentBalance = parseInt(aggRes.rows[0].current_balance, 10);

      // NEW
      const tierRes = await client.query(
        `SELECT tier_name FROM tier_rules WHERE tenant_id = $1 AND min_lifetime_points <= $2 ORDER BY min_lifetime_points DESC LIMIT 1;`,
        [tenant_id, lifetimePoints]
      );
      const tier = tierRes.rows.length > 0 ? tierRes.rows[0] : { tier_name: 'Standard' };

      await client.query(
        `INSERT INTO customer_tier_snapshot (
     customer_id, current_tier, lifetime_points, tenant_id, updated_at
   )
   VALUES ($1, $2, $3, $4, NOW())
   ON CONFLICT (customer_id) DO UPDATE
   SET current_tier = EXCLUDED.current_tier,
       lifetime_points = EXCLUDED.lifetime_points,
       updated_at = NOW();`,
        [surviving_customer_id, tier.tier_name, lifetimePoints, tenant_id]
      );

      // System audit log entry for customer merge
      await AuditLogService.logEvent({
        action: 'customer_merge',
        entity_type: 'customer',
        entity_id: surviving_customer_id,
        actor_user_id: admin_user_id || null,
        before_values: {
          surviving_customer_id,
          surviving_balance: survivingBalanceBefore,
          merged_customer_id,
          merged_balance: transferredPoints,
        },
        after_values: {
          surviving_customer_id,
          surviving_balance: currentBalance,
          merged_customer_id,
          is_merged: true,
        },
        metadata: {
          reason: reason.trim(),
          merge_log_id: mergeLog.id,
          transferred_points: transferredPoints,
          transferred_phones: transferredPhones,
          transferred_vehicles: transferredVehicles,
        },
        tenant_id,
        client,
      });

      await client.query('COMMIT');

      const updatedSurvivingCustomer = await CustomerService.getCustomerById(surviving_customer_id, tenant_id);

      return {
        merge_log: mergeLog,
        surviving_customer: {
          ...updatedSurvivingCustomer,
          current_balance: currentBalance,
          lifetime_points: lifetimePoints,
          tier_name: tier.tier_name,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves permanent customer merge audit history
   */
  static async listMergeLogs(tenantId, limit = 50, offset = 0) {
    const res = await pool.query(
      `SELECT cml.id, cml.surviving_customer_id, c1.customer_name AS surviving_customer_name,
              cml.merged_customer_id, c2.customer_name AS merged_customer_name,
              cml.approved_by, u.username AS approved_by_username,
              cml.reason, cml.transferred_points, cml.transferred_phones,
              cml.transferred_vehicles, cml.created_at
       FROM customer_merge_log cml
       JOIN customers c1 ON cml.surviving_customer_id = c1.customer_id AND cml.tenant_id = c1.tenant_id
       JOIN customers c2 ON cml.merged_customer_id = c2.customer_id AND cml.tenant_id = c2.tenant_id
       LEFT JOIN users u ON cml.approved_by = u.user_id
       WHERE cml.tenant_id = $1
       ORDER BY cml.created_at DESC
       LIMIT $2 OFFSET $3;`,
      [tenantId, limit, offset]
    );

    return res.rows;
  }
}

module.exports = MergeService;
