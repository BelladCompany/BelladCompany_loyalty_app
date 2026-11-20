/**
 * Campaign Add-on Engine Service
 * automobile-loyalty-backend (v2)
 *
 * Role: Principal Systems Architect
 * Purpose: Decoupled Campaign Add-on Engine that evaluates time-boxed promotional
 *          bonuses on top of untouched standard loyalty points.
 *
 * HARD RULES:
 * 1. Standard calculation runs first and unchanged. This engine is called after it.
 * 2. Entire engine execution is wrapped in try/catch; an invoice NEVER fails or delays
 *    because of campaign evaluation.
 * 3. Feature flag CAMPAIGNS_ENABLED defaults to OFF. With flag off, standard points only.
 * 4. When no campaign matches, the output is byte-for-byte identical.
 */
const { pool } = require('../config/db');

class CampaignEngineService {
  /**
   * Check if campaigns feature is enabled via environment variable
   */
  static isEnabled() {
    return process.env.CAMPAIGNS_ENABLED === 'true';
  }

  /**
   * Helper to normalize date string to YYYY-MM-DD
   */
  static normalizeDate(dateVal) {
    if (!dateVal) {
      // Default to today in Asia/Kolkata
      const now = new Date();
      return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    }
    if (dateVal instanceof Date) {
      return dateVal.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    }
    const str = String(dateVal).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.slice(0, 10);
    }
    // Attempt parse
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    }
    return str;
  }

  /**
   * Generate next sequential Campaign Code: CAMP-0001 style
   */
  static async generateCampaignCode(client = pool) {
    const res = await client.query(`
      SELECT code FROM campaigns 
      WHERE code ~ '^CAMP-[0-9]+$' 
      ORDER BY id DESC LIMIT 1;
    `);

    if (res.rows.length === 0) {
      return 'CAMP-0001';
    }

    const lastCode = res.rows[0].code;
    const numPart = parseInt(lastCode.replace('CAMP-', ''), 10);
    const nextNum = isNaN(numPart) ? 1 : numPart + 1;
    return `CAMP-${String(nextNum).padStart(4, '0')}`;
  }

  /**
   * Derive campaign status based on current date:
   * - If status is CANCELLED -> 'CANCELLED'
   * - If status is DRAFT -> 'DRAFT'
   * - If status is ACTIVE:
   *     - today < start_date -> 'SCHEDULED'
   *     - today > end_date   -> 'EXPIRED'
   *     - start_date <= today <= end_date -> 'LIVE'
   */
  static deriveStatus(campaign, todayStr = null) {
    if (campaign.status === 'CANCELLED') return 'CANCELLED';
    if (campaign.status === 'DRAFT') return 'DRAFT';

    const today = todayStr || this.normalizeDate(new Date());
    const start = this.normalizeDate(campaign.start_date);
    const end = this.normalizeDate(campaign.end_date);

    if (today < start) return 'SCHEDULED';
    if (today > end) return 'EXPIRED';
    return 'LIVE';
  }

  /**
   * Check for potential campaign overlap warnings:
   * Warns if another SCHEDULED or LIVE campaign shares category, overlapping dates,
   * a shared model and a shared branch.
   */
  static async checkOverlapWarning(campaignData, excludeCampaignId = null, client = pool) {
    const warnings = [];
    const tenantId = campaignData.tenant_id || 'bellad_and_company';
    const startDate = this.normalizeDate(campaignData.start_date);
    const endDate = this.normalizeDate(campaignData.end_date);
    const category = (campaignData.spend_category || 'sale').toLowerCase();

    // Query active campaigns in same tenant with overlapping date ranges
    let query = `
      SELECT c.*,
             COALESCE(ARRAY_AGG(DISTINCT cm.model_id) FILTER (WHERE cm.model_id IS NOT NULL), '{}') AS models,
             COALESCE(ARRAY_AGG(DISTINCT cb.branch_id) FILTER (WHERE cb.branch_id IS NOT NULL), '{}') AS branches
      FROM campaigns c
      LEFT JOIN campaign_models cm ON c.id = cm.campaign_id
      LEFT JOIN campaign_branches cb ON c.id = cb.campaign_id
      WHERE c.tenant_id = $1
        AND c.status = 'ACTIVE'
        AND c.start_date <= $3::date
        AND c.end_date >= $2::date
    `;
    const params = [tenantId, startDate, endDate];

    if (excludeCampaignId) {
      params.push(excludeCampaignId);
      query += ` AND c.id != $${params.length}`;
    }

    query += ` GROUP BY c.id;`;

    const res = await client.query(query, params);

    for (const other of res.rows) {
      const otherCategory = (other.spend_category || 'sale').toLowerCase();
      const categoryMatches = category === 'all' || otherCategory === 'all' || category === otherCategory;
      if (!categoryMatches) continue;

      // Check model overlap
      const newModels = campaignData.all_models ? ['ALL'] : (campaignData.models || []);
      const otherModels = other.all_models ? ['ALL'] : (other.models || []);
      const hasModelOverlap = newModels.includes('ALL') || otherModels.includes('ALL') ||
        newModels.some(m => otherModels.includes(m));

      // Check branch overlap
      const newBranches = campaignData.all_branches ? ['ALL'] : (campaignData.branches || []).map(Number);
      const otherBranches = other.all_branches ? ['ALL'] : (other.branches || []).map(Number);
      const hasBranchOverlap = newBranches.includes('ALL') || otherBranches.includes('ALL') ||
        newBranches.some(b => otherBranches.includes(b));

      if (hasModelOverlap && hasBranchOverlap) {
        warnings.push({
          other_campaign_id: other.id,
          other_campaign_code: other.code,
          other_campaign_name: other.name,
          message: `Campaign '${other.name}' (${other.code}) overlaps between ${this.normalizeDate(other.start_date)} and ${this.normalizeDate(other.end_date)} with shared category, branch, and models.`
        });
      }
    }

    return warnings;
  }

  /**
   * Main Campaign Evaluation Engine
   * Evaluates matching campaigns on top of standard_points.
   *
   * @param {Object} params
   * @param {number} params.standard_points Untouched points from standard calculation
   * @param {Object} params.invoice Invoice details
   * @param {string} params.tenant_id
   * @param {Object} params.client Database connection (optional)
   * @returns {Promise<Object>} { standard_points, bonus_points, total_points, campaigns_applied }
   */
  static async evaluateCampaigns({
    standard_points = 0,
    invoice = {},
    tenant_id = 'bellad_and_company',
    overrideCampaign = null, // Used for dry-run simulation of draft campaigns
    client = pool
  }) {
    const stdPoints = Math.max(0, parseInt(standard_points, 10) || 0);

    // Hard Rule 3: If feature flag is OFF and no override campaign passed, return standard points only
    if (!this.isEnabled() && !overrideCampaign) {
      return {
        standard_points: stdPoints,
        bonus_points: 0,
        total_points: stdPoints,
        campaigns_applied: [],
        enabled: false
      };
    }

    try {
      // Extract invoice dimensions
      const invCategory = String(invoice.spend_category || invoice.category || 'sale').toLowerCase();
      const invAmount = Number(
        invoice.net_ex_showroom_price != null
          ? invoice.net_ex_showroom_price
          : (invoice.ex_showroom_price != null
            ? invoice.ex_showroom_price
            : (invoice.amount != null ? invoice.amount : 0))
      );
      const invBrand = String(invoice.brand || invoice.brand_name || '').trim().toUpperCase();
      const invVehicleType = String(invoice.vehicle_type || '').trim().toUpperCase();
      const invModel = String(invoice.model || invoice.model_name || '').trim();
      const invBranchId = invoice.branch_id ? parseInt(invoice.branch_id, 10) : null;
      const invTier = String(invoice.customer_tier || invoice.tier || 'silver').trim().toLowerCase();

      // Resolve effective date based on date_basis
      const invoiceDateStr = this.normalizeDate(invoice.invoice_date || invoice.dms_invoice_date || invoice.date);
      const bookingDateStr = this.normalizeDate(invoice.booking_date || invoice.dms_booking_date || invoiceDateStr);
      const deliveryDateStr = this.normalizeDate(invoice.delivery_date || invoiceDateStr);

      // Fetch active campaigns for this tenant
      let candidates = [];

      if (overrideCampaign) {
        // Direct simulation mode
        candidates = [overrideCampaign];
      } else {
        const query = `
          SELECT c.*,
                 COALESCE(ARRAY_AGG(DISTINCT cm.model_id) FILTER (WHERE cm.model_id IS NOT NULL), '{}') AS models,
                 COALESCE(ARRAY_AGG(DISTINCT cb.branch_id) FILTER (WHERE cb.branch_id IS NOT NULL), '{}') AS branches
          FROM campaigns c
          LEFT JOIN campaign_models cm ON c.id = cm.campaign_id
          LEFT JOIN campaign_branches cb ON c.id = cb.campaign_id
          WHERE c.tenant_id = $1 AND c.status = 'ACTIVE'
          GROUP BY c.id
          ORDER BY c.priority ASC, c.id ASC;
        `;
        const res = await client.query(query, [tenant_id]);
        candidates = res.rows;
      }

      // Step 1: Filter matching campaigns
      const matchedCampaigns = [];

      for (const camp of candidates) {
        const checks = {
          status: (camp.status || '').toUpperCase() === 'ACTIVE',
          date: false,
          brand: false,
          vehicle_type: false,
          spend_category: false,
          branch: false,
          model: false,
          tier: false,
          spend_range: false,
        };

        // Date Basis Check
        let targetDateStr = invoiceDateStr;
        const dateBasis = (camp.date_basis || 'INVOICE').toUpperCase();
        if (dateBasis === 'BOOKING') targetDateStr = bookingDateStr;
        else if (dateBasis === 'DELIVERY') targetDateStr = deliveryDateStr;

        const startDate = this.normalizeDate(camp.start_date);
        const endDate = this.normalizeDate(camp.end_date);
        if (targetDateStr >= startDate && targetDateStr <= endDate) {
          checks.date = true;
        }

        // Model Check (Evaluated first to allow specific model targeting)
        if (camp.all_models) {
          checks.model = true;
        } else if (invModel) {
          const campModels = (camp.models || []).map(m => String(m).trim().toLowerCase());
          const cleanInvModel = invModel.toLowerCase();
          const matches = campModels.some(m => m === cleanInvModel || cleanInvModel.includes(m) || m.includes(cleanInvModel));
          if (matches) {
            checks.model = true;
          }
        }

        // Brand Check (ALL, exact/partial match, or if specific model was explicitly selected)
        const campBrand = String(camp.brand || 'ALL').trim().toUpperCase();
        if (
          campBrand === 'ALL' ||
          campBrand === invBrand ||
          invBrand.includes(campBrand) ||
          campBrand.includes(invBrand) ||
          (!camp.all_models && checks.model) // Explicit model targeting overrides generic brand selection
        ) {
          checks.brand = true;
        }

        // Vehicle Type Check (ALL, 2W, 4W, or if specific model was explicitly selected)
        const campVType = String(camp.vehicle_type || 'ALL').trim().toUpperCase();
        if (campVType === 'ALL' || campVType === invVehicleType || (!camp.all_models && checks.model)) {
          checks.vehicle_type = true;
        }

        // Spend Category Check
        const campCategory = String(camp.spend_category || 'ALL').trim().toLowerCase();
        if (campCategory === 'all' || campCategory === invCategory) {
          checks.spend_category = true;
        }

        // Branch Check
        if (camp.all_branches) {
          checks.branch = true;
        } else if (invBranchId) {
          const campBranches = (camp.branches || []).map(Number);
          if (campBranches.includes(invBranchId)) {
            checks.branch = true;
          }
        }

        // Customer Tier Check
        const campTier = String(camp.customer_tier || 'ALL').trim().toLowerCase();
        if (campTier === 'all' || campTier === invTier) {
          checks.tier = true;
        }

        // Spend Range Check
        const minSpend = Number(camp.min_spend || 0);
        const maxSpend = camp.max_spend != null ? Number(camp.max_spend) : null;
        if (invAmount >= minSpend && (maxSpend === null || invAmount <= maxSpend)) {
          checks.spend_range = true;
        }

        const isFullyMatched = Object.values(checks).every(Boolean);

        if (isFullyMatched) {
          matchedCampaigns.push({
            campaign: camp,
            checks
          });
        }
      }

      // If no campaigns matched, return standard points
      if (matchedCampaigns.length === 0) {
        return {
          standard_points: stdPoints,
          bonus_points: 0,
          total_points: stdPoints,
          campaigns_applied: []
        };
      }

      // Step 2: Calculate bonus per matched campaign
      const calculatedBonuses = [];

      for (const item of matchedCampaigns) {
        const c = item.campaign;
        const val = Number(c.value || 0);
        let rawBonus = 0;

        switch (c.type) {
          case 'PCT_OF_STANDARD':
            rawBonus = Math.floor((stdPoints * val) / 100);
            break;
          case 'FLAT_POINTS':
            rawBonus = Math.floor(val);
            break;
          case 'EXTRA_PER_100':
            rawBonus = Math.floor((invAmount * val) / 100);
            break;
          default:
            rawBonus = 0;
        }

        // Apply max bonus cap per invoice if set
        if (c.max_bonus_per_invoice != null && Number(c.max_bonus_per_invoice) > 0) {
          rawBonus = Math.min(rawBonus, Math.floor(Number(c.max_bonus_per_invoice)));
        }

        // Never negative, always floor
        const bonusPoints = Math.max(0, Math.floor(rawBonus));

        if (bonusPoints > 0) {
          calculatedBonuses.push({
            campaign_id: c.id,
            campaign_code: c.code,
            campaign_name: c.name,
            bonus_points: bonusPoints,
            stacking: (c.stacking || 'STACK').toUpperCase(),
            priority: parseInt(c.priority || 100, 10),
            redeem_lock_days: c.redeem_lock_days != null ? parseInt(c.redeem_lock_days, 10) : null
          });
        }
      }

      if (calculatedBonuses.length === 0) {
        return {
          standard_points: stdPoints,
          bonus_points: 0,
          total_points: stdPoints,
          campaigns_applied: []
        };
      }

      // Step 3: Combine Stacking vs HIGHEST_ONLY
      let finalBonuses = [];
      const hasHighestOnly = calculatedBonuses.some(b => b.stacking === 'HIGHEST_ONLY');

      if (hasHighestOnly) {
        // Pick only the single campaign with the highest bonus.
        // Tie-breaker: lowest priority number (ascending), then highest id
        calculatedBonuses.sort((a, b) => {
          if (b.bonus_points !== a.bonus_points) {
            return b.bonus_points - a.bonus_points; // highest bonus first
          }
          return a.priority - b.priority; // lowest priority number first
        });
        finalBonuses = [calculatedBonuses[0]];
      } else {
        // All are STACK -> apply all
        finalBonuses = calculatedBonuses;
      }

      const totalBonusPoints = finalBonuses.reduce((sum, b) => sum + b.bonus_points, 0);
      const totalPoints = stdPoints + totalBonusPoints;

      return {
        standard_points: stdPoints,
        bonus_points: totalBonusPoints,
        total_points: totalPoints,
        campaigns_applied: finalBonuses.map(b => ({
          campaign_id: b.campaign_id,
          campaign_code: b.campaign_code,
          campaign_name: b.campaign_name,
          bonus_points: b.bonus_points,
          redeem_lock_days: b.redeem_lock_days
        }))
      };
    } catch (err) {
      // Hard Rule 2: Wrap in try/catch. An invoice must never fail or be delayed because of a campaign.
      console.error('❌ [CampaignEngine Error] Safe fallback to standard points:', err.message || err);
      return {
        standard_points: stdPoints,
        bonus_points: 0,
        total_points: stdPoints,
        campaigns_applied: [],
        error_fallback: true
      };
    }
  }

  /**
   * Dry Run Simulator for "Test a Sale" UI panel
   * Evaluates all eligibility checks pass/fail and shows step-by-step breakdown.
   */
  static async simulateSaleTest(testParams, client = pool) {
    const invAmount = Number(testParams.amount || 0);
    const invBrand = String(testParams.brand || '').trim();
    const invModel = String(testParams.model || '').trim();
    const invBranchId = testParams.branch_id ? parseInt(testParams.branch_id, 10) : null;
    const invDate = this.normalizeDate(testParams.date || new Date());
    const invTier = String(testParams.tier || 'silver').trim().toLowerCase();
    const invCategory = String(testParams.spend_category || 'sale').toLowerCase();
    const invVehicleType = String(testParams.vehicle_type || '2W').trim();

    // Standard points (Sales: 1 pt per Rs.100 Net Ex-Showroom)
    const standardPoints = Math.floor(invAmount / 100);

    const invoice = {
      amount: invAmount,
      net_ex_showroom_price: invAmount,
      brand: invBrand,
      model: invModel,
      branch_id: invBranchId,
      invoice_date: invDate,
      customer_tier: invTier,
      spend_category: invCategory,
      vehicle_type: invVehicleType
    };

    let overrideCamp = null;
    if (testParams.draft_campaign) {
      overrideCamp = {
        ...testParams.draft_campaign,
        id: testParams.draft_campaign.id || 999999,
        code: testParams.draft_campaign.code || 'CAMP-TEST',
        name: testParams.draft_campaign.name || 'Test Simulation Campaign',
        status: 'ACTIVE' // Active for dry run simulation
      };
    }

    const result = await this.evaluateCampaigns({
      standard_points: standardPoints,
      invoice,
      tenant_id: testParams.tenant_id || 'bellad_and_company',
      overrideCampaign: overrideCamp,
      client
    });

    const totalPoints = result.total_points;
    const rupeeValue = Number((totalPoints / 4).toFixed(2));

    return {
      success: true,
      standard_points: result.standard_points,
      bonus_points: result.bonus_points,
      total_points: totalPoints,
      rupee_value: rupeeValue,
      campaigns_applied: result.campaigns_applied,
      test_invoice: invoice
    };
  }

  /**
   * Reverse Campaign Bonus Entries on invoice cancellation / return
   */
  static async reverseCampaignBonus({
    source_ref,
    customer_id,
    branch_id,
    vehicle_id = null,
    tenant_id = 'bellad_and_company',
    created_by = null,
    client = pool
  }) {
    // Find all positive bonus entries for this invoice
    const bonusEntries = await client.query(`
      SELECT * FROM points_ledger 
      WHERE tenant_id = $1 
        AND source_ref = $2 
        AND source_type = 'CAMPAIGN'
        AND points > 0;
    `, [tenant_id, source_ref]);

    const reversals = [];

    for (const entry of bonusEntries.rows) {
      const revPoints = -Math.abs(entry.points);
      const revRes = await client.query(`
        INSERT INTO points_ledger (
          customer_id, vehicle_id, branch_id, type, transaction_category,
          points, source_ref, reason_type, reason_text, source_type,
          campaign_id, parent_entry_id, cashier_id, tenant_id, created_at
        ) VALUES (
          $1, $2, $3, 'reversal_campaign', $4,
          $5, $6, 'reversal', $7, 'CAMPAIGN',
          $8, $9, $10, $11, NOW()
        ) RETURNING *;
      `, [
        customer_id,
        vehicle_id || entry.vehicle_id,
        branch_id || entry.branch_id,
        entry.transaction_category || 'sale',
        revPoints,
        source_ref,
        `Reversal of Bonus: ${entry.reason_text || 'Campaign Bonus'}`,
        entry.campaign_id,
        entry.entry_id, // parent_entry_id link
        created_by,
        tenant_id
      ]);
      reversals.push(revRes.rows[0]);
    }

    return reversals;
  }

  /**
   * Sync active campaigns to all dummy customers
   * Recalculates standard and bonus points for dummy customers so changes reflect live in Customer Search.
   */
  /**
   * Sync active campaigns to all dummy customers
   * Recalculates standard and bonus points for dummy customers so changes reflect live in Customer Search.
   */
  static async syncDummyCustomers(client = pool, tenant_id = 'bellad_and_company') {
    // Always use dedicated connection and transaction for clean, isolated session_replication_role
    const conn = await pool.connect();

    try {
      await conn.query('BEGIN');
      // Temporarily set session_replication_role to replica to allow cleanly resetting dummy model ledger
      await conn.query("SET LOCAL session_replication_role = 'replica';");

      const dummyCusts = await conn.query(`
        SELECT c.customer_id, c.customer_name, c.branch_name,
               v.vehicle_id, v.brand_name, v.model, v.vehicle_type,
               v.ex_showroom_price, v.branch_id
        FROM customers c
        LEFT JOIN vehicles v ON c.customer_id = v.customer_id AND v.tenant_id = c.tenant_id
        WHERE c.tenant_id = $1 
          AND (c.customer_id LIKE 'BAC-DUMMY-%' OR c.customer_id LIKE 'BAC-DEMO-%');
      `, [tenant_id]);

      const results = [];
      const today = new Date().toISOString().slice(0, 10);

      for (const cust of dummyCusts.rows) {
        // Determine net ex-showroom price (stored in paise in vehicles, or default to 80,000)
        const rawPrice = cust.ex_showroom_price ? Number(cust.ex_showroom_price) : 8000000;
        const netExShowroom = rawPrice > 100000 ? Math.floor(rawPrice / 100) : rawPrice;
        const stdPoints = Math.floor(netExShowroom / 100);

        const invoice = {
          amount: netExShowroom,
          net_ex_showroom_price: netExShowroom,
          brand: cust.brand_name || 'Hero',
          model: cust.model || 'SPLENDOR+',
          vehicle_type: cust.vehicle_type || '2W',
          branch_id: cust.branch_id || 1,
          invoice_date: today,
          customer_tier: 'silver',
          spend_category: 'sale'
        };

        const evalRes = await this.evaluateCampaigns({
          standard_points: stdPoints,
          invoice,
          tenant_id,
          client: conn
        });

        const invRef = `INV-${cust.customer_id}`;

        // Reset ledger rows for this dummy customer
        await conn.query(`DELETE FROM points_ledger WHERE customer_id = $1 AND tenant_id = $2;`, [cust.customer_id, tenant_id]);

        // Insert Standard points row
        const stdRes = await conn.query(`
          INSERT INTO points_ledger (
            customer_id, vehicle_id, branch_id, type, transaction_category, points,
            source_ref, tenant_id, source_type, reason_type, reason_text, amount_paise, created_at
          ) VALUES (
            $1, $2, $3, 'earn_sale', 'sale', $4,
            $5, $6, 'STANDARD', 'purchase',
            $7, $8, NOW() - INTERVAL '1 hour'
          ) RETURNING entry_id;
        `, [
          cust.customer_id,
          cust.vehicle_id,
          cust.branch_id || 1,
          stdPoints,
          invRef,
          tenant_id,
          `Vehicle Purchase (${cust.model || 'Vehicle'} - Ex-Showroom ₹${netExShowroom.toLocaleString('en-IN')})`,
          netExShowroom * 100
        ]);

        const stdEntryId = stdRes.rows[0].entry_id;

        // Insert Campaign Bonus rows
        for (const camp of evalRes.campaigns_applied) {
          await conn.query(`
            INSERT INTO points_ledger (
              customer_id, vehicle_id, branch_id, type, transaction_category, points,
              source_ref, tenant_id, source_type, campaign_id, parent_entry_id, reason_type, reason_text, amount_paise, created_at
            ) VALUES (
              $1, $2, $3, 'earn_sale', 'sale', $4,
              $5, $6, 'CAMPAIGN', $7, $8, 'campaign_bonus',
              $9, $10, NOW()
            );
          `, [
            cust.customer_id,
            cust.vehicle_id,
            cust.branch_id || 1,
            camp.bonus_points,
            invRef,
            tenant_id,
            camp.campaign_id,
            stdEntryId,
            `${camp.campaign_name} (+${camp.bonus_points} pts [Bonus])`,
            netExShowroom * 100
          ]);
        }

        results.push({
          customer_id: cust.customer_id,
          customer_name: cust.customer_name,
          model: cust.model,
          brand: cust.brand_name,
          price: netExShowroom,
          standard_points: stdPoints,
          bonus_points: evalRes.bonus_points,
          total_points: evalRes.total_points,
          campaigns_applied: evalRes.campaigns_applied
        });
      }

      await conn.query('COMMIT');

      return {
        synced_count: results.length,
        customers: results
      };
    } catch (err) {
      await conn.query('ROLLBACK');
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = CampaignEngineService;
