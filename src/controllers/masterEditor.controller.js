const { pool } = require('../config/db');
const MasterRuleEngineService = require('../services/masterRuleEngine.service');

class MasterEditorController {
  /**
   * List all master loyalty rules with multi-filter capability.
   */
  static async listRules(req, res) {
    try {
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const {
        scheme_type,
        spend_type,
        vehicle_type,
        priority_tier,
        approval_status,
        search,
      } = req.query;

      let query = `
        SELECT 
          r.*,
          CASE 
            WHEN r.applicable_upto < NOW() THEN 'expired'
            WHEN r.applicable_from > NOW() THEN 'upcoming'
            ELSE 'active'
          END AS validity_state
        FROM master_loyalty_rules r
        WHERE r.tenant_id = $1
      `;
      const params = [tenant_id];

      if (scheme_type && scheme_type !== 'ALL') {
        params.push(scheme_type);
        query += ` AND r.scheme_type = $${params.length}`;
      }

      if (spend_type && spend_type !== 'ALL') {
        params.push(spend_type);
        query += ` AND r.spend_type = $${params.length}`;
      }

      if (vehicle_type && vehicle_type !== 'ALL') {
        params.push(vehicle_type);
        query += ` AND (r.vehicle_type = $${params.length} OR r.vehicle_type = 'ALL')`;
      }

      if (priority_tier && priority_tier !== 'ALL') {
        params.push(priority_tier);
        query += ` AND (r.priority_tier = $${params.length} OR r.priority_tier = 'ALL')`;
      }

      if (approval_status && approval_status !== 'ALL') {
        params.push(approval_status);
        query += ` AND r.approval_status = $${params.length}`;
      }

      if (search) {
        params.push(`%${search.trim().toLowerCase()}%`);
        query += ` AND (
          LOWER(r.rule_name) LIKE $${params.length} OR
          LOWER(r.rule_code) LIKE $${params.length} OR
          LOWER(r.brand_name) LIKE $${params.length} OR
          LOWER(r.models::text) LIKE $${params.length} OR
          LOWER(r.description) LIKE $${params.length}
        )`;
      }

      query += ` ORDER BY r.priority_weight DESC, r.created_at DESC;`;

      const result = await pool.query(query, params);

      // Return summary stats for header KPI cards
      const statsQuery = `
        SELECT 
          COUNT(*)::int AS total_rules,
          COUNT(CASE WHEN approval_status = 'approved' AND is_active = true AND applicable_from <= NOW() AND applicable_upto >= NOW() THEN 1 END)::int AS active_rules,
          COUNT(CASE WHEN approval_status = 'pending_approval' THEN 1 END)::int AS pending_approvals,
          COUNT(CASE WHEN vehicle_type = '2W' THEN 1 END)::int AS two_wheeler_rules,
          COUNT(CASE WHEN vehicle_type = '4W' THEN 1 END)::int AS four_wheeler_rules
        FROM master_loyalty_rules
        WHERE tenant_id = $1;
      `;
      const statsResult = await pool.query(statsQuery, [tenant_id]);

      return res.status(200).json({
        success: true,
        data: result.rows,
        stats: statsResult.rows[0] || {},
      });
    } catch (error) {
      console.error('Error listing master rules:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get single rule with its audit logs.
   */
  static async getRuleById(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';

      const ruleResult = await pool.query(
        `SELECT * FROM master_loyalty_rules WHERE rule_id = $1 AND tenant_id = $2;`,
        [id, tenant_id]
      );

      if (ruleResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Rule not found' });
      }

      const auditResult = await pool.query(
        `SELECT * FROM master_loyalty_rule_audit_logs WHERE rule_id = $1 ORDER BY created_at DESC;`,
        [id]
      );

      return res.status(200).json({
        success: true,
        data: ruleResult.rows[0],
        audit_logs: auditResult.rows,
      });
    } catch (error) {
      console.error('Error getting rule by id:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Create a new rule.
   */
  static async createRule(req, res) {
    try {
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const currentUser = req.user?.username || 'director';

      const {
        rule_code,
        rule_name,
        description,
        scheme_type,
        spend_type,
        vehicle_type = 'ALL',
        brand_name = 'ALL',
        models = ['ALL'],
        variants = ['ALL'],
        branches = ['ALL'],
        priority_tier = 'ALL',
        priority_weight = 100,
        min_spend_paise = 0,
        max_spend_paise = null,
        discount_type = 'percentage',
        discount_value = 0,
        max_discount_paise = null,
        discount_deductible_from_base = true,
        points_multiplier_numerator = 1,
        points_multiplier_denominator = 100,
        bonus_points = 0,
        redemption_rate_rupees_per_point = 0.2500,
        applicable_from,
        applicable_upto,
        approval_status = 'approved', // If created by admin/director, auto-approve or keep draft
        approved_by = currentUser,
      } = req.body;

      if (!rule_code || !rule_name || !scheme_type || !spend_type || !applicable_from || !applicable_upto) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: rule_code, rule_name, scheme_type, spend_type, applicable_from, applicable_upto',
        });
      }

      const cleanModels = Array.isArray(models) ? models : [models];
      const cleanVariants = Array.isArray(variants) ? variants : [variants];
      const cleanBranches = Array.isArray(branches) ? branches : [branches];

      // Security check: Only Director Agastya Sir can create rules that are pre-approved
      const creatorUsername = (req.user?.username || currentUser || '').toLowerCase();
      const creatorRole = (req.user?.role || '').toLowerCase();
      const isDirector = (creatorUsername === 'agstya' || creatorUsername === 'agastya' || creatorRole === 'director');

      // Rules created by managers/admins must sit in pending_approval state and is_active = false
      const finalApprovalStatus = isDirector && approval_status === 'approved' ? 'approved' : 'pending_approval';
      const finalIsActive = finalApprovalStatus === 'approved';
      const finalApprovedBy = finalApprovalStatus === 'approved' ? 'Director Agastya Bellad' : null;
      const finalApprovedAt = finalApprovalStatus === 'approved' ? new Date() : null;

      const insertQuery = `
        INSERT INTO master_loyalty_rules (
          tenant_id,
          rule_code,
          rule_name,
          description,
          scheme_type,
          spend_type,
          vehicle_type,
          brand_name,
          models,
          variants,
          branches,
          priority_tier,
          priority_weight,
          min_spend_paise,
          max_spend_paise,
          discount_type,
          discount_value,
          max_discount_paise,
          discount_deductible_from_base,
          points_multiplier_numerator,
          points_multiplier_denominator,
          bonus_points,
          redemption_rate_rupees_per_point,
          applicable_from,
          applicable_upto,
          approval_status,
          approved_by,
          approved_at,
          created_by,
          is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
        )
        RETURNING *;
      `;

      const values = [
        tenant_id,
        rule_code.trim().toUpperCase(),
        rule_name.trim(),
        description || '',
        scheme_type,
        spend_type,
        vehicle_type,
        brand_name,
        JSON.stringify(cleanModels),
        JSON.stringify(cleanVariants),
        JSON.stringify(cleanBranches),
        priority_tier,
        Number(priority_weight || 100),
        Number(min_spend_paise || 0),
        max_spend_paise != null ? Number(max_spend_paise) : null,
        discount_type,
        Number(discount_value || 0),
        max_discount_paise != null ? Number(max_discount_paise) : null,
        Boolean(discount_deductible_from_base),
        Number(points_multiplier_numerator || 1),
        Number(points_multiplier_denominator || 100),
        Number(bonus_points || 0),
        Number(redemption_rate_rupees_per_point || 0.2500),
        new Date(applicable_from),
        new Date(applicable_upto),
        finalApprovalStatus,
        finalApprovedBy,
        finalApprovedAt,
        currentUser,
        finalIsActive,
      ];

      const insertResult = await pool.query(insertQuery, values);
      const newRule = insertResult.rows[0];

      // Audit log
      await pool.query(
        `INSERT INTO master_loyalty_rule_audit_logs (rule_id, tenant_id, action, performed_by, new_data)
         VALUES ($1, $2, 'created', $3, $4);`,
        [newRule.rule_id, tenant_id, currentUser, JSON.stringify(newRule)]
      );

      return res.status(201).json({
        success: true,
        message: 'Master rule created successfully',
        data: newRule,
      });
    } catch (error) {
      console.error('Error creating master rule:', error);
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: 'Rule code already exists in this tenant' });
      }
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Update an existing rule.
   */
  static async updateRule(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const currentUser = req.user?.username || 'director';

      const existingRes = await pool.query(
        `SELECT * FROM master_loyalty_rules WHERE rule_id = $1 AND tenant_id = $2;`,
        [id, tenant_id]
      );

      if (existingRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Rule not found' });
      }

      const oldRule = existingRes.rows[0];

      const {
        rule_name = oldRule.rule_name,
        description = oldRule.description,
        scheme_type = oldRule.scheme_type,
        spend_type = oldRule.spend_type,
        vehicle_type = oldRule.vehicle_type,
        brand_name = oldRule.brand_name,
        models = oldRule.models,
        variants = oldRule.variants,
        branches = oldRule.branches,
        priority_tier = oldRule.priority_tier,
        priority_weight = oldRule.priority_weight,
        min_spend_paise = oldRule.min_spend_paise,
        max_spend_paise = oldRule.max_spend_paise,
        discount_type = oldRule.discount_type,
        discount_value = oldRule.discount_value,
        max_discount_paise = oldRule.max_discount_paise,
        discount_deductible_from_base = oldRule.discount_deductible_from_base,
        points_multiplier_numerator = oldRule.points_multiplier_numerator,
        points_multiplier_denominator = oldRule.points_multiplier_denominator,
        bonus_points = oldRule.bonus_points,
        redemption_rate_rupees_per_point = oldRule.redemption_rate_rupees_per_point,
        applicable_from = oldRule.applicable_from,
        applicable_upto = oldRule.applicable_upto,
        approval_status = oldRule.approval_status,
        is_active = oldRule.is_active,
      } = req.body;

      const cleanModels = Array.isArray(models) ? models : [models];
      const cleanVariants = Array.isArray(variants) ? variants : [variants];
      const cleanBranches = Array.isArray(branches) ? branches : [branches];

      const updateQuery = `
        UPDATE master_loyalty_rules SET
          rule_name = $1,
          description = $2,
          scheme_type = $3,
          spend_type = $4,
          vehicle_type = $5,
          brand_name = $6,
          models = $7,
          variants = $8,
          branches = $9,
          priority_tier = $10,
          priority_weight = $11,
          min_spend_paise = $12,
          max_spend_paise = $13,
          discount_type = $14,
          discount_value = $15,
          max_discount_paise = $16,
          discount_deductible_from_base = $17,
          points_multiplier_numerator = $18,
          points_multiplier_denominator = $19,
          bonus_points = $20,
          redemption_rate_rupees_per_point = $21,
          applicable_from = $22,
          applicable_upto = $23,
          approval_status = $24,
          is_active = $25,
          updated_at = NOW()
        WHERE rule_id = $26 AND tenant_id = $27
        RETURNING *;
      `;

      const values = [
        rule_name,
        description,
        scheme_type,
        spend_type,
        vehicle_type,
        brand_name,
        JSON.stringify(cleanModels),
        JSON.stringify(cleanVariants),
        JSON.stringify(cleanBranches),
        priority_tier,
        Number(priority_weight),
        Number(min_spend_paise),
        max_spend_paise != null ? Number(max_spend_paise) : null,
        discount_type,
        Number(discount_value),
        max_discount_paise != null ? Number(max_discount_paise) : null,
        Boolean(discount_deductible_from_base),
        Number(points_multiplier_numerator),
        Number(points_multiplier_denominator),
        Number(bonus_points),
        Number(redemption_rate_rupees_per_point),
        new Date(applicable_from),
        new Date(applicable_upto),
        approval_status,
        Boolean(is_active),
        id,
        tenant_id,
      ];

      const updateResult = await pool.query(updateQuery, values);
      const updatedRule = updateResult.rows[0];

      // Audit log
      await pool.query(
        `INSERT INTO master_loyalty_rule_audit_logs (rule_id, tenant_id, action, performed_by, old_data, new_data)
         VALUES ($1, $2, 'updated', $3, $4, $5);`,
        [id, tenant_id, currentUser, JSON.stringify(oldRule), JSON.stringify(updatedRule)]
      );

      return res.status(200).json({
        success: true,
        message: 'Master rule updated successfully',
        data: updatedRule,
      });
    } catch (error) {
      console.error('Error updating master rule:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Director One-Click Approval & Publishing.
   */
  static async approveRule(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      
      const callerUsername = (req.user?.username || req.body.username || '').toLowerCase();
      const callerRole = (req.user?.role || req.body.role || '').toLowerCase();
      const isDirector = (callerUsername === 'agstya' || callerUsername === 'agastya' || callerRole === 'director' || callerRole === 'admin');

      if (!isDirector) {
        return res.status(403).json({
          success: false,
          error: "Access Denied: Only Director accounts have authorization to approve rules.",
        });
      }

      const directorName = 'Director Agastya Bellad';
      const notes = req.body.approval_notes || 'Approved by Director';

      const updateResult = await pool.query(
        `UPDATE master_loyalty_rules
         SET approval_status = 'approved',
             approved_by = $1,
             approved_at = NOW(),
             approval_notes = $2,
             is_active = true,
             updated_at = NOW()
         WHERE rule_id = $3 AND tenant_id = $4
         RETURNING *;`,
        [directorName, notes, id, tenant_id]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Rule not found' });
      }

      const approvedRule = updateResult.rows[0];

      await pool.query(
        `INSERT INTO master_loyalty_rule_audit_logs (rule_id, tenant_id, action, performed_by, new_data)
         VALUES ($1, $2, 'approved', $3, $4);`,
        [id, tenant_id, directorName, JSON.stringify(approvedRule)]
      );

      return res.status(200).json({
        success: true,
        message: `Rule "${approvedRule.rule_name}" approved successfully.`,
        data: approvedRule,
      });
    } catch (error) {
      console.error('Error approving master rule:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Reject rule with reasons.
   */
  static async rejectRule(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      
      const callerUsername = (req.user?.username || req.body.username || '').toLowerCase();
      const callerRole = (req.user?.role || req.body.role || '').toLowerCase();
      const isDirector = (callerUsername === 'agstya' || callerUsername === 'agastya' || callerRole === 'director' || callerRole === 'admin');

      if (!isDirector) {
        return res.status(403).json({
          success: false,
          error: "Access Denied: Only Director accounts have authorization to reject rules.",
        });
      }

      const directorName = 'Director Agastya Bellad';
      const reason = req.body.rejection_reason || 'Rejected by Director';

      const updateResult = await pool.query(
        `UPDATE master_loyalty_rules
         SET approval_status = 'rejected',
             rejection_reason = $1,
             is_active = false,
             updated_at = NOW()
         WHERE rule_id = $2 AND tenant_id = $3
         RETURNING *;`,
        [reason, id, tenant_id]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Rule not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Rule rejected.',
        data: updateResult.rows[0],
      });
    } catch (error) {
      console.error('Error rejecting master rule:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Toggle rule active state.
   */
  static async toggleActive(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const currentUser = req.user?.username || 'admin';

      const updateResult = await pool.query(
        `UPDATE master_loyalty_rules
         SET is_active = NOT is_active,
             updated_at = NOW()
         WHERE rule_id = $1 AND tenant_id = $2
         RETURNING *;`,
        [id, tenant_id]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Rule not found' });
      }

      return res.status(200).json({
        success: true,
        message: `Rule status updated to ${updateResult.rows[0].is_active ? 'Active' : 'Inactive'}`,
        data: updateResult.rows[0],
      });
    } catch (error) {
      console.error('Error toggling rule status:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Delete rule.
   */
  static async deleteRule(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';

      const deleteResult = await pool.query(
        `DELETE FROM master_loyalty_rules WHERE rule_id = $1 AND tenant_id = $2 RETURNING *;`,
        [id, tenant_id]
      );

      if (deleteResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Rule not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Rule deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting rule:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Test Sandbox Simulator: Live dry-run calculation.
   */
  static async simulateRule(req, res) {
    try {
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const {
        scheme_type,
        spend_type = 'sale',
        vehicle_type = 'ALL',
        brand_name = 'ALL',
        model_name = 'ALL',
        variant_name = 'ALL',
        branch_name = 'ALL',
        priority_tier = 'ALL',
        spend_amount = 0,
        transaction_date = new Date(),
      } = req.body;

      const simulationResult = await MasterRuleEngineService.simulateRuleCalculation({
        tenant_id,
        scheme_type,
        spend_type,
        vehicle_type,
        brand_name,
        model_name,
        variant_name,
        branch_name,
        priority_tier,
        spend_amount,
        transaction_date,
      });

      return res.status(200).json({
        success: true,
        data: simulationResult,
      });
    } catch (error) {
      console.error('Error simulating rule:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Fetch distinct lookup options (models, branches, variants, brands) from existing data.
   */
  static async getLookups(req, res) {
    try {
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';

      // 1. Get models from vehicles
      const modelsRes = await pool.query(
        `SELECT DISTINCT model FROM vehicles WHERE tenant_id = $1 AND model IS NOT NULL AND TRIM(model) != '' ORDER BY model;`,
        [tenant_id]
      );

      // 2. Get variants from vehicles
      const variantsRes = await pool.query(
        `SELECT DISTINCT variant FROM vehicles WHERE tenant_id = $1 AND variant IS NOT NULL AND TRIM(variant) != '' ORDER BY variant;`,
        [tenant_id]
      );

      // 3. Get branches from branches table
      const branchesRes = await pool.query(
        `SELECT DISTINCT branch_name, branch_city FROM branches WHERE tenant_id = $1 ORDER BY branch_name;`,
        [tenant_id]
      );

      // 4. Get brands
      const brandsRes = await pool.query(
        `SELECT DISTINCT brand_name FROM brands WHERE tenant_id = $1 ORDER BY brand_name;`,
        [tenant_id]
      );

      // 5. Dynamic Scheme Types (Standard + Director Custom Schemes)
      const customSchemesRes = await pool.query(
        `SELECT scheme_code, scheme_name FROM master_custom_schemes WHERE tenant_id = $1 ORDER BY scheme_name;`,
        [tenant_id]
      ).catch(() => ({ rows: [] }));

      const existingRuleSchemesRes = await pool.query(
        `SELECT DISTINCT scheme_type FROM master_loyalty_rules WHERE tenant_id = $1 ORDER BY scheme_type;`,
        [tenant_id]
      ).catch(() => ({ rows: [] }));

      const baseSchemes = [
        { id: 'gift_cards', label: 'Gift Cards' },
        { id: 'referral', label: 'Referral' },
        { id: 'inhouse_exchange', label: 'Inhouse Exchange' },
        { id: 'inhouse_insurance', label: 'Inhouse Insurance' },
        { id: 'inhouse_finance', label: 'Inhouse Finance' },
        { id: 'google_rating', label: 'Google Rating' },
        { id: 'festive', label: 'Festive Offer' },
        { id: 'standard', label: 'Standard Evergreen' },
        { id: 'corporate', label: 'Corporate Scheme' },
      ];

      const customSchemes = (customSchemesRes.rows || []).map((s) => ({
        id: s.scheme_code,
        label: s.scheme_name || s.scheme_code,
      }));

      const dynamicSchemes = (existingRuleSchemesRes.rows || [])
        .map((r) => r.scheme_type)
        .filter((code) => code && !baseSchemes.some((b) => b.id === code) && !customSchemes.some((c) => c.id === code))
        .map((code) => ({ id: code, label: code.toUpperCase() }));

      const mergedSchemeTypes = [...baseSchemes, ...customSchemes, ...dynamicSchemes];

      const defaultModels = [
        'MG ZS EV', 'Comet EV', 'Windsor EV',
        'Splendor', 'HF Deluxe', 'Passion', 'Glamour', 'Xpulse',
        'Nexon', 'Curvv', 'Harrier', 'Safari', 'Altroz', 'Punch', 'Tiago', 'Tigor',
        'ALL'
      ];
      const defaultBranches = [
        'Belagavi', 'Belagavi Central', 'Belgaum',
        'Hubballi Central', 'Bengaluru South', 'Dharwad Showroom', 'Gadag Main',
        'ALL'
      ];
      const defaultBrands = ['MG Motors', 'Tata Motors', 'Hero', 'Vida', 'Mahindra', 'Maruti Suzuki', 'Hyundai', 'ALL'];

      const models = Array.from(new Set([...defaultModels, ...modelsRes.rows.map((r) => r.model)]));
      const branches = Array.from(new Set([...defaultBranches, ...branchesRes.rows.map((r) => r.branch_name)]));
      const variants = Array.from(new Set(['ALL', 'Base', 'Mid', 'Top', 'Exclusive Pro', 'Excite', 'XE', 'XM', 'XT', 'XZ', 'XZ+', 'Dark Edition', ...variantsRes.rows.map((r) => r.variant)]));
      const brands = Array.from(new Set([...defaultBrands, ...brandsRes.rows.map((r) => r.brand_name)]));

      return res.status(200).json({
        success: true,
        data: {
          scheme_types: mergedSchemeTypes,
          spend_types: [
            { id: 'sale', label: 'Vehicle & Equipment Sales (Ex-Showroom)' },
            { id: 'service', label: 'Workshop & Routine Service' },
            { id: 'bodyshop', label: 'Bodyshop & Accidental Repairs' },
            { id: 'accessories', label: 'Genuine Accessories' },
            { id: 'spares', label: 'Spare Parts & Consumables' },
            { id: 'gift_cards', label: 'Gift Cards & Referral Vouchers' },
            { id: 'redemption', label: 'Redemption & Voucher' },
          ],
          vehicle_types: [
            { id: 'Commercial', label: 'Commercial Vehicles (Trucks / Buses / SCV)' },
            { id: 'Machinery & Agriculture', label: 'Machinery & Agriculture Equipment' },
            { id: '4W', label: 'Four-Wheeler (4W)' },
            { id: '2W', label: 'Two-Wheeler (2W)' },
            { id: 'EV', label: 'Electric Vehicle (EV)' },
            { id: 'ALL', label: 'All Vehicle & Equipment Types' },
          ],
          priority_tiers: [
            { id: 'ALL', label: 'All Tiers' },
            { id: 'silver', label: 'Silver Tier' },
            { id: 'gold', label: 'Gold Tier' },
            { id: 'platinum', label: 'Platinum / VIP Tier' },
          ],
          models,
          variants,
          branches,
          brands,
        },
      });
    } catch (error) {
      console.error('Error fetching lookups:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * User Control Access: Get all users with their current roles
   */
  static async getUsers(req, res) {
    try {
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const result = await pool.query(
        `SELECT id, user_id, username, role, branch_id, created_at 
         FROM users 
         WHERE tenant_id = $1 
         ORDER BY id ASC;`,
        [tenant_id]
      );
      return res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * User Control Access: 1-Click Role Switch (cashier, branch_manager, admin)
   */
  static async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const validRoles = ['cashier', 'branch_manager', 'regional_admin', 'admin', 'super_admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, error: `Invalid role. Allowed: ${validRoles.join(', ')}` });
      }

      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const result = await pool.query(
        `UPDATE users 
         SET role = $1 
         WHERE (id = $2 OR user_id = $2) AND tenant_id = $3 
         RETURNING id, username, role, branch_id;`,
        [role, id, tenant_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }

      return res.status(200).json({
        success: true,
        message: `Updated ${result.rows[0].username} role to ${role.replace('_', ' ').toUpperCase()} successfully.`,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * User Control Access: 2-Click Add Staff User
   */
  static async createUser(req, res) {
    try {
      const { username, password, role = 'cashier', branch_id = 1 } = req.body;
      if (!username) {
        return res.status(400).json({ success: false, error: 'Username is required.' });
      }

      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash(password || 'Staff@123', 10);

      const insert = await pool.query(
        `INSERT INTO users (tenant_id, username, password_hash, role, branch_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, role, branch_id, created_at;`,
        [tenant_id, username.trim().toLowerCase(), hash, role, Number(branch_id) || 1]
      );

      return res.status(201).json({
        success: true,
        message: `Staff user '${username}' created with ${role} control.`,
        data: insert.rows[0],
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Register a new custom scheme dynamically on the fly
   */
  static async registerCustomScheme(req, res) {
    try {
      const { scheme_code, scheme_name, description } = req.body;
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';

      if (!scheme_code && !scheme_name) {
        return res.status(400).json({ success: false, error: 'Scheme name or code required.' });
      }

      const cleanCode = (scheme_code || scheme_name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '_');

      const name = scheme_name || cleanCode.replace(/_/g, ' ').toUpperCase();

      const insert = await pool.query(
        `INSERT INTO master_custom_schemes (tenant_id, scheme_code, scheme_name, description, created_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (scheme_code) DO UPDATE SET scheme_name = EXCLUDED.scheme_name, description = EXCLUDED.description
         RETURNING *;`,
        [tenant_id, cleanCode, name, description || '', req.user?.username || 'Director']
      );

      return res.status(201).json({
        success: true,
        message: `Custom scheme '${name}' successfully registered for the engine!`,
        data: insert.rows[0],
      });
    } catch (error) {
      console.error('Error registering custom scheme:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Customer Priority Tiers: Dynamic Slabs (Silver, Gold, Platinum/VIP)
   * Supports:
   * - eval_basis: 'expenses_based' | 'points_based' | 'spend_range'
   * - thresholds: min_expense_amount, max_expense_amount, min_lifetime_points
   * - multiplier: 100 = 1.0x, 125 = 1.25x, 150 = 1.5x
   * - discounts_json: category discounts (sales, service, bodyshop, accessories, spares)
   */
  static async getPriorityTiers(req, res) {
    try {
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const tierRes = await pool.query(
        `SELECT id, tier_name, min_lifetime_points, min_expense_amount, max_expense_amount, multiplier, eval_basis, discounts_json, applicable_from, applicable_upto, approval_status, approved_by, benefits_json
         FROM tier_rules
         WHERE tenant_id = $1
         ORDER BY min_expense_amount ASC, min_lifetime_points ASC;`,
        [tenant_id]
      );

      let rows = tierRes.rows;
      if (!rows || rows.length === 0) {
        rows = [
          {
            tier_id: 'silver',
            tier_name: 'Silver Tier',
            subtitle: 'Base Customer Entry Slab',
            eval_basis: 'expenses_based',
            min_expense_amount: 0,
            max_expense_amount: 49999,
            min_lifetime_points: 0,
            multiplier: 100,
            discounts_json: { sales: 0, service: 0, bodyshop: 10, accessories: 5, spares: 0 },
            applicable_from: new Date().toISOString().slice(0, 10),
            applicable_upto: new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
            approval_status: 'approved',
            approved_by: 'Director',
          },
          {
            tier_id: 'gold',
            tier_name: 'Gold Tier',
            subtitle: 'Accelerated Priority Slab',
            eval_basis: 'expenses_based',
            min_expense_amount: 50000,
            max_expense_amount: 199999,
            min_lifetime_points: 5000,
            multiplier: 125,
            discounts_json: { sales: 1, service: 5, bodyshop: 25, accessories: 10, spares: 5 },
            applicable_from: new Date().toISOString().slice(0, 10),
            applicable_upto: new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
            approval_status: 'approved',
            approved_by: 'Director',
          },
          {
            tier_id: 'platinum',
            tier_name: 'Platinum / VIP Tier',
            subtitle: 'Executive Leadership Club',
            eval_basis: 'expenses_based',
            min_expense_amount: 200000,
            max_expense_amount: null,
            min_lifetime_points: 15000,
            multiplier: 150,
            discounts_json: { sales: 2, service: 10, bodyshop: 40, accessories: 15, spares: 10 },
            applicable_from: new Date().toISOString().slice(0, 10),
            applicable_upto: new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
            approval_status: 'approved',
            approved_by: 'Director',
          },
        ];
      }

      return res.status(200).json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching priority tiers:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async savePriorityTier(req, res) {
    try {
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const {
        tier_name,
        eval_basis = 'expenses_based',
        min_expense_amount = 0,
        max_expense_amount = null,
        min_lifetime_points = 0,
        multiplier = 100,
        discounts_json = {},
        applicable_from = new Date(),
        applicable_upto = new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000),
        approval_status = 'approved',
        approved_by = 'Director',
      } = req.body;

      if (!tier_name) {
        return res.status(400).json({ success: false, error: 'Tier name is required.' });
      }

      const upsertQuery = `
        INSERT INTO tier_rules (
          tenant_id,
          tier_name,
          min_points,
          min_lifetime_points,
          min_expense_amount,
          max_expense_amount,
          multiplier,
          eval_basis,
          discounts_json,
          applicable_from,
          applicable_upto,
          approval_status,
          approved_by,
          updated_at
        ) VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (tenant_id, tier_name) DO UPDATE SET
          min_points = EXCLUDED.min_points,
          min_lifetime_points = EXCLUDED.min_lifetime_points,
          min_expense_amount = EXCLUDED.min_expense_amount,
          max_expense_amount = EXCLUDED.max_expense_amount,
          multiplier = EXCLUDED.multiplier,
          eval_basis = EXCLUDED.eval_basis,
          discounts_json = EXCLUDED.discounts_json,
          applicable_from = EXCLUDED.applicable_from,
          applicable_upto = EXCLUDED.applicable_upto,
          approval_status = EXCLUDED.approval_status,
          approved_by = EXCLUDED.approved_by,
          updated_at = NOW()
        RETURNING *;
      `;

      const values = [
        tenant_id,
        tier_name.trim(),
        Number(min_lifetime_points || 0),
        Number(min_expense_amount || 0),
        max_expense_amount != null ? Number(max_expense_amount) : null,
        Number(multiplier || 100),
        eval_basis,
        JSON.stringify(discounts_json),
        new Date(applicable_from),
        new Date(applicable_upto),
        approval_status,
        approved_by,
      ];

      const result = await pool.query(upsertQuery, values);

      // Also ensure corresponding rule exists in master_loyalty_rules
      const ruleCode = `${tenant_id.slice(0, 6).toUpperCase()}-TIER-${tier_name.toUpperCase().replace(/\s+/g, '_')}`;
      await pool.query(
        `INSERT INTO master_loyalty_rules (
          tenant_id, rule_code, rule_name, description, scheme_type, spend_type, vehicle_type,
          priority_tier, priority_weight, min_spend_paise, max_spend_paise, discount_type, discount_value,
          points_multiplier_numerator, points_multiplier_denominator, applicable_from, applicable_upto,
          approval_status, approved_by, approved_at, is_active
        ) VALUES (
          $1, $2, $3, $4, 'standard', 'sale', 'ALL',
          $5, 150, $6, $7, 'percentage', $8,
          $9, 100, $10, $11,
          $12, $13, NOW(), true
        )
        ON CONFLICT (tenant_id, rule_code) DO UPDATE SET
          min_spend_paise = EXCLUDED.min_spend_paise,
          max_spend_paise = EXCLUDED.max_spend_paise,
          discount_value = EXCLUDED.discount_value,
          points_multiplier_numerator = EXCLUDED.points_multiplier_numerator,
          applicable_from = EXCLUDED.applicable_from,
          applicable_upto = EXCLUDED.applicable_upto,
          approval_status = EXCLUDED.approval_status,
          updated_at = NOW();`,
        [
          tenant_id,
          ruleCode,
          `Customer Priority Tier: ${tier_name}`,
          `Evaluation basis: ${eval_basis}. Min expense/points: ${min_expense_amount || min_lifetime_points}`,
          tier_name.toLowerCase(),
          Math.round(Number(min_expense_amount || 0) * 100),
          max_expense_amount != null ? Math.round(Number(max_expense_amount) * 100) : null,
          Number(discounts_json?.bodyshop || discounts_json?.service || 0),
          Number(multiplier || 100),
          new Date(applicable_from),
          new Date(applicable_upto),
          approval_status,
          approved_by,
        ]
      ).catch((err) => console.warn('[savePriorityTier] Warning syncing master rule:', err.message));

      return res.status(200).json({
        success: true,
        message: `Customer priority slab '${tier_name}' saved successfully.`,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error saving priority tier:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Dealership-specific Policy & Active Modules Control
   * E.g. Trident Automobiles can have only Sales & Service active, and Tier Policy disabled!
   */
  static async getDealershipPolicy(req, res) {
    try {
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const firmRes = await pool.query(
        `SELECT firm_id, tenant_id, firm_name, legal_name, brand_slug, point_to_rupee_rate, modules_config, rules_config, is_active
         FROM firms
         WHERE tenant_id = $1;`,
        [tenant_id]
      );

      if (firmRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Dealership not found.' });
      }

      const defaultModules = {
        sales: true,
        service: true,
        bodyshop: true,
        accessories: true,
        spares: true,
        gift_cards: true,
        tier_policy: true,
      };

      const firm = firmRes.rows[0];
      firm.modules_config = firm.modules_config || defaultModules;

      return res.status(200).json({ success: true, data: firm });
    } catch (error) {
      console.error('Error getting dealership policy:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async saveDealershipPolicy(req, res) {
    try {
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const { modules_config, rules_config, point_to_rupee_rate } = req.body;

      const updateRes = await pool.query(
        `UPDATE firms SET
          modules_config = COALESCE($1, modules_config),
          rules_config = COALESCE($2, rules_config),
          point_to_rupee_rate = COALESCE($3, point_to_rupee_rate),
          updated_at = NOW()
         WHERE tenant_id = $4
         RETURNING *;`,
        [
          modules_config ? JSON.stringify(modules_config) : null,
          rules_config ? JSON.stringify(rules_config) : null,
          point_to_rupee_rate != null ? Number(point_to_rupee_rate) : null,
          tenant_id,
        ]
      );

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Dealership not found.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Dealership policy configuration updated successfully.',
        data: updateRes.rows[0],
      });
    } catch (error) {
      console.error('Error saving dealership policy:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Points Gain Formulas across all 6 core business categories:
   * 1. Vehicle & Equipment Sales (Price base: Net Ex-Showroom)
   * 2. Service
   * 3. Spares
   * 4. Accessories
   * 5. Bodyshop
   * 6. Gift Cards / Referral Advocacy
   */
  static async getPointsFormulas(req, res) {
    try {
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';

      // Fetch dynamic active rules for this tenant to provide live values
      const rulesRes = await pool.query(
        `SELECT DISTINCT ON (spend_type) spend_type, points_multiplier_numerator, points_multiplier_denominator, bonus_points, discount_value, min_spend_paise, max_spend_paise
         FROM master_loyalty_rules
         WHERE tenant_id = $1 AND is_active = true
         ORDER BY spend_type, priority_weight DESC;`,
        [tenant_id]
      ).catch(() => ({ rows: [] }));

      const ruleMap = {};
      (rulesRes.rows || []).forEach((r) => {
        ruleMap[r.spend_type] = r;
      });

      const formulas = [
        {
          category: 'sale',
          title: 'Vehicle & Equipment Sales',
          price_base: 'Net Ex-Showroom Price (Ex-Showroom Price − Deductions)',
          earning_ratio: `${ruleMap.sale?.points_multiplier_numerator || 1} Pt per ₹100 (${ruleMap.sale?.points_multiplier_numerator || 1}%)`,
          earning_pct: Number(ruleMap.sale?.points_multiplier_numerator || 1),
          spend_range: 'Calculated on Net Ex-Showroom pricing for 2W, 4W, EV, Commercial & Agri Machinery',
          description: 'Points are strictly calculated on the Ex-Showroom baseline, excluding road tax and insurance.',
        },
        {
          category: 'service',
          title: 'Workshop & Routine Service',
          price_base: 'Service Invoice Bill (Labour + Scheduled Maintenance)',
          earning_ratio: `${ruleMap.service?.points_multiplier_numerator || 4} Pts per ₹100 (${ruleMap.service?.points_multiplier_numerator || 4}%)`,
          earning_pct: Number(ruleMap.service?.points_multiplier_numerator || 4),
          spend_range: 'All workshop job-cards and periodic service invoices',
          description: 'Calculated on the net service invoice bill value.',
        },
        {
          category: 'spares',
          title: 'Spare Parts & Consumables',
          price_base: 'Spares Counter & Parts Invoice',
          earning_ratio: `${ruleMap.spares?.points_multiplier_numerator || 2} Pts per ₹100 (${ruleMap.spares?.points_multiplier_numerator || 2}%)`,
          earning_pct: Number(ruleMap.spares?.points_multiplier_numerator || 2),
          spend_range: 'Over-the-counter and workshop genuine parts billing',
          description: 'Earned on genuine OEM spares, oils, filters, and mechanical components.',
        },
        {
          category: 'accessories',
          title: 'Genuine Accessories',
          price_base: 'Accessories Invoice Amount',
          earning_ratio: `${ruleMap.accessories?.points_multiplier_numerator || 2} Pts per ₹100 (${ruleMap.accessories?.points_multiplier_numerator || 2}%)`,
          earning_pct: Number(ruleMap.accessories?.points_multiplier_numerator || 2),
          spend_range: 'All dealership styling and utility accessories',
          description: 'Earned on official accessories purchased during or after vehicle delivery.',
        },
        {
          category: 'bodyshop',
          title: 'Bodyshop & Accidental Repairs',
          price_base: 'Customer Paid / Deductible Bodyshop Amount',
          earning_ratio: `${ruleMap.bodyshop?.points_multiplier_numerator || 3} Pts per ₹100 (${ruleMap.bodyshop?.points_multiplier_numerator || 3}%)`,
          earning_pct: Number(ruleMap.bodyshop?.points_multiplier_numerator || 3),
          spend_range: 'Accidental denting, painting and insurance deductible customer pay',
          description: 'Earned on customer-borne portion of bodyshop and accident claims.',
        },
        {
          category: 'gift_cards',
          title: 'Gift Cards & Referral Advocacy',
          price_base: 'Electronic Showroom Voucher / Referral Vehicle Delivery',
          earning_ratio: '2,500 Bonus Points per verified vehicle delivery by new customer',
          earning_pct: 2.5,
          spend_range: 'Purchased by a brand-new customer (not existing account)',
          description: 'Advocate receives points upon delivery when a new customer redeems the gift voucher.',
        },
      ];

      return res.status(200).json({ success: true, data: formulas });
    } catch (error) {
      console.error('Error fetching points formulas:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async savePointsFormula(req, res) {
    try {
      const tenant_id = req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const { category, numerator = 1, denominator = 100 } = req.body;

      if (!category) {
        return res.status(400).json({ success: false, error: 'Category is required.' });
      }

      await pool.query(
        `UPDATE master_loyalty_rules
         SET points_multiplier_numerator = $1,
             points_multiplier_denominator = $2,
             updated_at = NOW()
         WHERE tenant_id = $3 AND spend_type = $4;`,
        [Number(numerator), Number(denominator), tenant_id, category]
      );

      return res.status(200).json({
        success: true,
        message: `Points formula for '${category}' updated to ${numerator}/${denominator}.`,
      });
    } catch (error) {
      console.error('Error saving points formula:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = MasterEditorController;

