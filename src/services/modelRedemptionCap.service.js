/**
 * Model Redemption Cap Service ("The Dynamic Model % Setter Engine")
 *
 * Provides dynamic per-model and per-brand percentage cap configuration
 * for customer points redemption.
 *
 * Rules:
 *   - Tata models (e.g. Nexon, Harrier): configurable cap (e.g. 50%)
 *   - Hyundai models (e.g. Creta, Venue): configurable cap (e.g. 50%)
 *   - Hero models (e.g. Splendor+, HF Deluxe): configurable cap (e.g. 100% full)
 *   - Dynamic setter with interactive percentage scroll bar / slider in editor mode.
 *   - Auto-enforced during POS cashier counter transactions without changing cashier input.
 */

const { pool } = require('../config/db');

class ModelRedemptionCapService {
  /**
   * List all configured model redemption caps with optional filtering and summary statistics.
   */
  static async listCaps({ tenant_id = 'bellad_and_company', brand, search }) {
    let query = `
      SELECT *
      FROM model_redemption_caps
      WHERE tenant_id = $1
    `;
    const params = [tenant_id];

    if (brand && brand !== 'ALL') {
      params.push(brand);
      query += ` AND (LOWER(brand_name) = LOWER($${params.length}) OR brand_name = 'ALL')`;
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (
        LOWER(brand_name) LIKE $${params.length} OR
        LOWER(model_name) LIKE $${params.length} OR
        LOWER(description) LIKE $${params.length}
      )`;
    }

    query += ` ORDER BY brand_name ASC, model_name ASC;`;

    const res = await pool.query(query, params);
    const rows = res.rows;

    // Calculate summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*)::int AS total_caps,
        COUNT(CASE WHEN redemption_cap_percent < 100 AND is_active = true THEN 1 END)::int AS capped_models_count,
        COUNT(CASE WHEN redemption_cap_percent >= 100 AND is_active = true THEN 1 END)::int AS full_redemption_models_count,
        COUNT(DISTINCT brand_name)::int AS total_brands_count
      FROM model_redemption_caps
      WHERE tenant_id = $1;
    `;
    const statsRes = await pool.query(statsQuery, [tenant_id]);

    return {
      caps: rows,
      stats: statsRes.rows[0] || {
        total_caps: rows.length,
        capped_models_count: rows.filter((r) => Number(r.redemption_cap_percent) < 100).length,
        full_redemption_models_count: rows.filter((r) => Number(r.redemption_cap_percent) >= 100).length,
        total_brands_count: new Set(rows.map((r) => r.brand_name)).size,
      },
    };
  }

  /**
   * Resolves the effective redemption percentage cap for a given vehicle model and brand.
   *
   * Lookup resolution hierarchy:
   *  1. Exact Brand + Exact/Substring Model match (e.g. 'TATA MOTORS' + 'Nexon' -> 50%)
   *  2. Brand-level wildcard rule (e.g. 'TATA MOTORS' + 'ALL' -> 50%)
   *  3. Model-level wildcard rule (e.g. 'ALL' + 'Nexon' -> 50%)
   *  4. Global default rule ('ALL' + 'ALL' -> 100%)
   *  5. Hardcoded baseline (100.00%)
   */
  static async resolveCap({ tenant_id = 'bellad_and_company', brand_name = 'ALL', model_name = 'ALL' }) {
    const cleanBrand = String(brand_name || 'ALL').trim();
    const cleanModel = String(model_name || 'ALL').trim();

    const query = `
      SELECT *
      FROM model_redemption_caps
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY 
        CASE 
          WHEN brand_name != 'ALL' AND model_name != 'ALL' THEN 1
          WHEN brand_name != 'ALL' AND model_name = 'ALL' THEN 2
          WHEN brand_name = 'ALL' AND model_name != 'ALL' THEN 3
          ELSE 4
        END ASC,
        updated_at DESC;
    `;

    const res = await pool.query(query, [tenant_id]);
    const allRules = res.rows;

    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const nBrand = norm(cleanBrand);
    const nModel = norm(cleanModel);

    // 1. Try exact or fuzzy model match within matching brand
    let matchedRule = allRules.find((r) => {
      if (r.brand_name === 'ALL' || r.model_name === 'ALL') return false;
      const rb = norm(r.brand_name);
      const rm = norm(r.model_name);
      const brandMatch = rb === nBrand || (nBrand && (rb.includes(nBrand) || nBrand.includes(rb)));
      const modelMatch = rm === nModel || (nModel && (rm.includes(nModel) || nModel.includes(rm)));
      return brandMatch && modelMatch;
    });

    // 2. Try Brand-level rule (model = 'ALL')
    if (!matchedRule) {
      matchedRule = allRules.find((r) => {
        if (r.model_name !== 'ALL' || r.brand_name === 'ALL') return false;
        const rb = norm(r.brand_name);
        return rb === nBrand || (nBrand && (rb.includes(nBrand) || nBrand.includes(rb)));
      });
    }

    // 3. Try Model-level rule across all brands
    if (!matchedRule) {
      matchedRule = allRules.find((r) => {
        if (r.brand_name !== 'ALL' || r.model_name === 'ALL') return false;
        const rm = norm(r.model_name);
        return rm === nModel || (nModel && (rm.includes(nModel) || nModel.includes(rm)));
      });
    }

    // 4. Try Global Default rule ('ALL' + 'ALL')
    if (!matchedRule) {
      matchedRule = allRules.find((r) => r.brand_name === 'ALL' && r.model_name === 'ALL');
    }

    const capPercent = matchedRule ? Number(matchedRule.redemption_cap_percent) : 100.0;

    return {
      cap_percent: capPercent,
      is_capped: capPercent < 100,
      rule_id: matchedRule?.id || null,
      brand_name: matchedRule?.brand_name || cleanBrand,
      model_name: matchedRule?.model_name || cleanModel,
      description: matchedRule?.description || `Default ${capPercent}% redemption allowance`,
      is_fallback: !matchedRule,
    };
  }

  /**
   * Save or update a model redemption cap.
   */
  static async saveCap({
    tenant_id = 'bellad_and_company',
    brand_name,
    model_name,
    redemption_cap_percent,
    description,
    updated_by = 'Director',
  }) {
    if (!brand_name || !model_name) {
      throw new Error('Both brand_name and model_name are required.');
    }

    const capPercent = Math.max(0, Math.min(100, parseFloat(redemption_cap_percent) || 0));
    const cleanBrand = String(brand_name).trim();
    const cleanModel = String(model_name).trim();

    const query = `
      INSERT INTO model_redemption_caps (
        tenant_id,
        brand_name,
        model_name,
        redemption_cap_percent,
        description,
        updated_by,
        is_active,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
      ON CONFLICT (tenant_id, brand_name, model_name) DO UPDATE SET
        redemption_cap_percent = EXCLUDED.redemption_cap_percent,
        description = COALESCE(EXCLUDED.description, model_redemption_caps.description),
        updated_by = EXCLUDED.updated_by,
        is_active = true,
        updated_at = NOW()
      RETURNING *;
    `;

    const res = await pool.query(query, [
      tenant_id,
      cleanBrand,
      cleanModel,
      capPercent,
      description || `${cleanBrand} ${cleanModel}: ${capPercent}% points redemption cap`,
      updated_by,
    ]);

    return res.rows[0];
  }

  /**
   * Delete a model redemption cap by id.
   */
  static async deleteCap(id, tenant_id = 'bellad_and_company') {
    const res = await pool.query(
      `DELETE FROM model_redemption_caps WHERE id = $1 AND tenant_id = $2 RETURNING *;`,
      [id, tenant_id]
    );
    if (res.rowCount === 0) {
      throw new Error(`Model redemption cap with ID ${id} not found.`);
    }
    return res.rows[0];
  }

  /**
   * Pure calculation simulator for dynamic % testing and breakdown.
   */
  static calculateCappedRedemption({
    point_balance = 0,
    bill_amount = 0,
    cap_percent = 100,
    points_per_rupee = 0.25,
    earning_rate_per_100 = 4, // 4% default
  }) {
    const balance = Math.max(0, parseInt(point_balance, 10) || 0);
    const billAmt = Math.max(0, parseFloat(bill_amount) || 0);
    const capPct = Math.max(0, Math.min(100, parseFloat(cap_percent) || 0));

    // 1. Max allowed points under model percentage cap
    const maxRedeemablePoints = Math.floor(balance * (capPct / 100));
    const maxDiscountRupees = maxRedeemablePoints * points_per_rupee;
    const pointsProtected = balance - maxRedeemablePoints;

    // 2. Applied discount on bill
    const discountApplied = billAmt > 0 ? Math.min(maxDiscountRupees, billAmt) : 0;
    const pointsRedeemed = billAmt > 0 ? Math.min(maxRedeemablePoints, Math.round(discountApplied / points_per_rupee)) : 0;
    const cashPaid = Math.max(0, billAmt - discountApplied);
    const newPointsEarned = billAmt > 0 ? Math.floor((cashPaid / 100) * earning_rate_per_100) : 0;
    const projectedBalance = (balance - pointsRedeemed) + newPointsEarned;

    return {
      point_balance: balance,
      bill_amount: billAmt,
      cap_percent: capPct,
      points_per_rupee,
      max_redeemable_points: maxRedeemablePoints,
      max_discount_rupees: Math.round(maxDiscountRupees * 100) / 100,
      points_protected: pointsProtected,
      points_protected_rupees: Math.round(pointsProtected * points_per_rupee * 100) / 100,
      discount_applied: Math.round(discountApplied * 100) / 100,
      points_redeemed: pointsRedeemed,
      cash_paid: Math.round(cashPaid * 100) / 100,
      new_points_earned: newPointsEarned,
      projected_balance: projectedBalance,
      is_fully_redeemed: pointsRedeemed === balance,
      is_partially_capped: capPct < 100,
      summary_text: capPct < 100
        ? `Model cap enforced at ${capPct}%: Up to ${maxRedeemablePoints.toLocaleString()} points (₹${maxDiscountRupees.toFixed(2)}) can be redeemed. ${pointsProtected.toLocaleString()} points remain protected.`
        : `Full 100% redemption unlocked: All ${balance.toLocaleString()} points available for discount up to the bill amount.`,
    };
  }
}

module.exports = ModelRedemptionCapService;
