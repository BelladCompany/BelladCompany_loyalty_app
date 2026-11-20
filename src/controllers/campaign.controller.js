/**
 * Campaign Add-on Controller
 * automobile-loyalty-backend (v2)
 *
 * Role: Director / Admin Campaign API Controller
 * Purpose: Full lifecycle management for promotional campaign add-ons.
 */
const { pool } = require('../config/db');
const CampaignEngineService = require('../services/campaignEngine.service');

class CampaignController {
  /**
   * Helper to write audit log entries
   */
  static async logAudit({ campaign_id, action, changed_by, before_json = null, after_json = null, client = pool }) {
    try {
      await client.query(`
        INSERT INTO campaign_audit_log (campaign_id, action, changed_by, before_json, after_json, at)
        VALUES ($1, $2, $3, $4, $5, NOW());
      `, [
        campaign_id,
        action,
        changed_by || 'system',
        before_json ? JSON.stringify(before_json) : null,
        after_json ? JSON.stringify(after_json) : null
      ]);
    } catch (err) {
      console.warn('[CampaignAuditLog Warning]', err.message);
    }
  }

  /**
   * List all campaigns with derived status and aggregated metrics
   * GET /api/campaigns
   */
  static async listCampaigns(req, res) {
    try {
      const tenant_id = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';

      const query = `
        SELECT c.*,
               COALESCE(ARRAY_AGG(DISTINCT cm.model_id) FILTER (WHERE cm.model_id IS NOT NULL), '{}') AS models,
               COALESCE(ARRAY_AGG(DISTINCT cb.branch_id) FILTER (WHERE cb.branch_id IS NOT NULL), '{}') AS branches,
               COALESCE(SUM(CASE WHEN pl.points > 0 THEN pl.points ELSE 0 END), 0)::bigint AS bonus_points_issued,
               COUNT(DISTINCT pl.source_ref) FILTER (WHERE pl.points > 0)::int AS invoices_count
        FROM campaigns c
        LEFT JOIN campaign_models cm ON c.id = cm.campaign_id
        LEFT JOIN campaign_branches cb ON c.id = cb.campaign_id
        LEFT JOIN points_ledger pl ON pl.campaign_id = c.id AND pl.source_type = 'CAMPAIGN' AND pl.tenant_id = c.tenant_id
        WHERE c.tenant_id = $1
        GROUP BY c.id
        ORDER BY c.priority ASC, c.id DESC;
      `;

      const result = await pool.query(query, [tenant_id]);

      const campaigns = result.rows.map(row => {
        const derivedStatus = CampaignEngineService.deriveStatus(row);
        const bonusIssued = parseInt(row.bonus_points_issued || 0, 10);
        const rupeeValue = Number((bonusIssued / 4).toFixed(2));

        return {
          ...row,
          derived_status: derivedStatus,
          bonus_points_issued: bonusIssued,
          invoices_count: parseInt(row.invoices_count || 0, 10),
          rupee_value: rupeeValue,
          start_date_formatted: CampaignEngineService.normalizeDate(row.start_date),
          end_date_formatted: CampaignEngineService.normalizeDate(row.end_date)
        };
      });

      return res.status(200).json({
        success: true,
        campaigns_enabled: CampaignEngineService.isEnabled(),
        count: campaigns.length,
        campaigns,
        data: campaigns
      });
    } catch (err) {
      console.error('[CampaignController.listCampaigns Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get single campaign details with audit history
   * GET /api/campaigns/:id
   */
  static async getCampaign(req, res) {
    try {
      const tenant_id = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
      const id = parseInt(req.params.id, 10);

      const query = `
        SELECT c.*,
               COALESCE(ARRAY_AGG(DISTINCT cm.model_id) FILTER (WHERE cm.model_id IS NOT NULL), '{}') AS models,
               COALESCE(ARRAY_AGG(DISTINCT cb.branch_id) FILTER (WHERE cb.branch_id IS NOT NULL), '{}') AS branches,
               COALESCE(SUM(CASE WHEN pl.points > 0 THEN pl.points ELSE 0 END), 0)::bigint AS bonus_points_issued,
               COUNT(DISTINCT pl.source_ref) FILTER (WHERE pl.points > 0)::int AS invoices_count
        FROM campaigns c
        LEFT JOIN campaign_models cm ON c.id = cm.campaign_id
        LEFT JOIN campaign_branches cb ON c.id = cb.campaign_id
        LEFT JOIN points_ledger pl ON pl.campaign_id = c.id AND pl.source_type = 'CAMPAIGN' AND pl.tenant_id = c.tenant_id
        WHERE c.id = $1 AND c.tenant_id = $2
        GROUP BY c.id;
      `;

      const result = await pool.query(query, [id, tenant_id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Campaign not found.' });
      }

      const campaign = result.rows[0];
      campaign.derived_status = CampaignEngineService.deriveStatus(campaign);

      // Audit logs
      const auditRes = await pool.query(`
        SELECT * FROM campaign_audit_log WHERE campaign_id = $1 ORDER BY at DESC;
      `, [id]);

      return res.status(200).json({
        success: true,
        campaign,
        audit_logs: auditRes.rows
      });
    } catch (err) {
      console.error('[CampaignController.getCampaign Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Create a new campaign (Draft or Active)
   * POST /api/campaigns
   */
  static async createCampaign(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const tenant_id = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
      const creator = req.user?.username || 'director';

      const {
        name,
        type,
        value,
        max_bonus_per_invoice,
        vehicle_type = 'ALL',
        spend_category = 'sale',
        brand = 'ALL',
        all_models = false,
        all_branches = false,
        models = [],
        branches = [],
        customer_tier = 'ALL',
        min_spend = 0,
        max_spend = null,
        start_date,
        end_date,
        date_basis = 'INVOICE',
        stacking = 'STACK',
        priority = 100,
        redeem_lock_days = null,
        status = 'DRAFT',
        notes = ''
      } = req.body;

      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Campaign name is required.' });
      }
      if (!type || !['PCT_OF_STANDARD', 'FLAT_POINTS', 'EXTRA_PER_100'].includes(type)) {
        return res.status(400).json({ success: false, error: 'Valid campaign type is required.' });
      }
      if (value == null || Number(value) <= 0) {
        return res.status(400).json({ success: false, error: 'Benefit value must be greater than 0.' });
      }
      if (!all_models && (!Array.isArray(models) || models.length === 0)) {
        return res.status(400).json({ success: false, error: 'Select at least one model or enable All Models.' });
      }
      if (!all_branches && (!Array.isArray(branches) || branches.length === 0)) {
        return res.status(400).json({ success: false, error: 'Select at least one branch or enable All Branches.' });
      }
      if (!start_date || !end_date) {
        return res.status(400).json({ success: false, error: 'Start date and end date are required.' });
      }
      const startStr = CampaignEngineService.normalizeDate(start_date);
      const endStr = CampaignEngineService.normalizeDate(end_date);
      if (endStr < startStr) {
        return res.status(400).json({ success: false, error: 'End date must be on or after start date.' });
      }
      if (max_spend != null && Number(max_spend) < Number(min_spend)) {
        return res.status(400).json({ success: false, error: 'Maximum spend cannot be lower than minimum spend.' });
      }

      const code = await CampaignEngineService.generateCampaignCode(client);
      const initialStatus = status === 'ACTIVE' ? 'ACTIVE' : 'DRAFT';

      const insRes = await client.query(`
        INSERT INTO campaigns (
          code, name, type, value, max_bonus_per_invoice, vehicle_type,
          spend_category, brand, all_models, all_branches, customer_tier,
          min_spend, max_spend, start_date, end_date, date_basis,
          stacking, priority, redeem_lock_days, status, notes,
          created_by, activated_by, tenant_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21,
          $22, $23, $24, NOW(), NOW()
        ) RETURNING *;
      `, [
        code, name.trim(), type, Number(value),
        max_bonus_per_invoice != null && max_bonus_per_invoice !== '' ? Number(max_bonus_per_invoice) : null,
        vehicle_type, spend_category, brand, Boolean(all_models), Boolean(all_branches), customer_tier,
        Number(min_spend || 0),
        max_spend != null && max_spend !== '' ? Number(max_spend) : null,
        startStr, endStr, date_basis,
        stacking, parseInt(priority || 100, 10),
        redeem_lock_days != null && redeem_lock_days !== '' ? parseInt(redeem_lock_days, 10) : null,
        initialStatus, notes,
        creator, initialStatus === 'ACTIVE' ? creator : null, tenant_id
      ]);

      const campaign = insRes.rows[0];

      // Associate models
      if (!all_models && Array.isArray(models)) {
        for (const m of models) {
          if (m && String(m).trim()) {
            await client.query(`
              INSERT INTO campaign_models (campaign_id, model_id, tenant_id)
              VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;
            `, [campaign.id, String(m).trim(), tenant_id]);
          }
        }
      }

      // Associate branches
      if (!all_branches && Array.isArray(branches)) {
        for (const b of branches) {
          const bId = parseInt(b, 10);
          if (!isNaN(bId)) {
            await client.query(`
              INSERT INTO campaign_branches (campaign_id, branch_id, tenant_id)
              VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;
            `, [campaign.id, bId, tenant_id]);
          }
        }
      }

      await CampaignController.logAudit({
        campaign_id: campaign.id,
        action: initialStatus === 'ACTIVE' ? 'ACTIVATE' : 'CREATE',
        changed_by: creator,
        after_json: campaign,
        client
      });

      // Check overlap warning
      const overlapWarnings = await CampaignEngineService.checkOverlapWarning({
        ...campaign,
        models,
        branches,
        tenant_id
      }, campaign.id, client);

      // Synchronize active campaigns to dummy model customers
      try {
        await CampaignEngineService.syncDummyCustomers(client, tenant_id);
      } catch (syncErr) {
        console.warn('[syncDummyCustomers Warning on Create]', syncErr.message);
      }

      await client.query('COMMIT');

      return res.status(201).json({
        success: true,
        message: `Campaign ${campaign.code} created successfully.`,
        campaign,
        overlap_warnings: overlapWarnings
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[CampaignController.createCampaign Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    } finally {
      client.release();
    }
  }

  /**
   * Edit campaign (Restricted fields if status is ACTIVE)
   * Once ACTIVE, locked: type, value, brand, models, branches, category, tier, spend range.
   * Editable: end_date, max_bonus_per_invoice, notes, cancel.
   * PATCH /api/campaigns/:id
   */
  static async updateCampaign(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const tenant_id = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
      const id = parseInt(req.params.id, 10);
      const editor = req.user?.username || 'director';

      const existingRes = await client.query(`
        SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2;
      `, [id, tenant_id]);

      if (existingRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Campaign not found.' });
      }

      const existing = existingRes.rows[0];

      if (existing.status === 'CANCELLED') {
        return res.status(400).json({ success: false, error: 'Cancelled campaigns cannot be edited.' });
      }

      // Allow editing all fields (Directors/Admins have full editing freedom)
      const newName = req.body.name ? req.body.name.trim() : existing.name;
      const newType = req.body.type || existing.type;
      const newValue = req.body.value !== undefined ? Number(req.body.value) : existing.value;
      const newVehicleType = req.body.vehicle_type || existing.vehicle_type;
      const newSpendCategory = req.body.spend_category || existing.spend_category;
      const newBrand = req.body.brand || existing.brand;
      const newCustomerTier = req.body.customer_tier || existing.customer_tier;
      const newMinSpend = req.body.min_spend !== undefined ? Number(req.body.min_spend || 0) : existing.min_spend;
      const newMaxSpend = req.body.max_spend !== undefined
        ? (req.body.max_spend !== null && req.body.max_spend !== '' ? Number(req.body.max_spend) : null)
        : existing.max_spend;
      const newStartDate = req.body.start_date
        ? CampaignEngineService.normalizeDate(req.body.start_date)
        : existing.start_date;
      const newEndDate = req.body.end_date
        ? CampaignEngineService.normalizeDate(req.body.end_date)
        : existing.end_date;
      const newDateBasis = req.body.date_basis || existing.date_basis;
      const newStacking = req.body.stacking || existing.stacking;
      const newPriority = req.body.priority !== undefined ? parseInt(req.body.priority, 10) : existing.priority;
      const newMaxBonus = req.body.max_bonus_per_invoice !== undefined
        ? (req.body.max_bonus_per_invoice !== null && req.body.max_bonus_per_invoice !== '' ? Number(req.body.max_bonus_per_invoice) : null)
        : existing.max_bonus_per_invoice;
      const newRedeemLockDays = req.body.redeem_lock_days !== undefined
        ? (req.body.redeem_lock_days !== null && req.body.redeem_lock_days !== '' ? parseInt(req.body.redeem_lock_days, 10) : null)
        : existing.redeem_lock_days;
      const newAllModels = req.body.all_models !== undefined ? Boolean(req.body.all_models) : existing.all_models;
      const newAllBranches = req.body.all_branches !== undefined ? Boolean(req.body.all_branches) : existing.all_branches;
      const newNotes = req.body.notes !== undefined ? req.body.notes : existing.notes;
      const newStatus = req.body.status || existing.status;

      if (newEndDate < newStartDate) {
        return res.status(400).json({ success: false, error: 'End date must be on or after start date.' });
      }

      // Update fields
      const updRes = await client.query(`
        UPDATE campaigns
        SET name = $1,
            type = $2,
            value = $3,
            vehicle_type = $4,
            spend_category = $5,
            brand = $6,
            customer_tier = $7,
            min_spend = $8,
            max_spend = $9,
            start_date = $10,
            end_date = $11,
            date_basis = $12,
            stacking = $13,
            priority = $14,
            max_bonus_per_invoice = $15,
            redeem_lock_days = $16,
            all_models = $17,
            all_branches = $18,
            notes = $19,
            status = $20,
            updated_at = NOW()
        WHERE id = $21 AND tenant_id = $22
        RETURNING *;
      `, [
        newName, newType, newValue, newVehicleType, newSpendCategory, newBrand,
        newCustomerTier, newMinSpend, newMaxSpend, newStartDate, newEndDate,
        newDateBasis, newStacking, newPriority, newMaxBonus, newRedeemLockDays,
        newAllModels, newAllBranches, newNotes, newStatus, id, tenant_id
      ]);

      const updated = updRes.rows[0];

      // Update models
      if (req.body.models !== undefined && Array.isArray(req.body.models)) {
        await client.query(`DELETE FROM campaign_models WHERE campaign_id = $1;`, [id]);
        if (!newAllModels) {
          for (const m of req.body.models) {
            if (m && String(m).trim()) {
              await client.query(`
                INSERT INTO campaign_models (campaign_id, model_id, tenant_id)
                VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;
              `, [id, String(m).trim(), tenant_id]);
            }
          }
        }
      }

      // Update branches
      if (req.body.branches !== undefined && Array.isArray(req.body.branches)) {
        await client.query(`DELETE FROM campaign_branches WHERE campaign_id = $1;`, [id]);
        if (!newAllBranches) {
          for (const b of req.body.branches) {
            const bId = parseInt(b, 10);
            if (!isNaN(bId)) {
              await client.query(`
                INSERT INTO campaign_branches (campaign_id, branch_id, tenant_id)
                VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;
              `, [id, bId, tenant_id]);
            }
          }
        }
      }

      await CampaignController.logAudit({
        campaign_id: id,
        action: 'EDIT',
        changed_by: editor,
        before_json: existing,
        after_json: updated,
        client
      });

      // Synchronize changes to dummy model customers
      try {
        await CampaignEngineService.syncDummyCustomers(client, tenant_id);
      } catch (syncErr) {
        console.warn('[syncDummyCustomers Warning on Edit]', syncErr.message);
      }

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        message: `Campaign ${updated.code} updated successfully.`,
        campaign: updated
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[CampaignController.updateCampaign Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    } finally {
      client.release();
    }
  }

  /**
   * Activate campaign (DRAFT -> ACTIVE)
   * POST /api/campaigns/:id/activate
   */
  static async activateCampaign(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tenant_id = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
      const id = parseInt(req.params.id, 10);
      const activator = req.user?.username || 'director';

      const existingRes = await client.query(`
        SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2;
      `, [id, tenant_id]);

      if (existingRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Campaign not found.' });
      }

      const existing = existingRes.rows[0];
      if (existing.status === 'ACTIVE') {
        return res.status(400).json({ success: false, error: 'Campaign is already active.' });
      }
      if (existing.status === 'CANCELLED') {
        return res.status(400).json({ success: false, error: 'Cancelled campaign cannot be activated.' });
      }

      const updRes = await client.query(`
        UPDATE campaigns
        SET status = 'ACTIVE',
            activated_by = $1,
            updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
        RETURNING *;
      `, [activator, id, tenant_id]);

      const activated = updRes.rows[0];

      await CampaignController.logAudit({
        campaign_id: id,
        action: 'ACTIVATE',
        changed_by: activator,
        before_json: existing,
        after_json: activated,
        client
      });

      // Overlap warning on activate
      const warnings = await CampaignEngineService.checkOverlapWarning(activated, id, client);

      // Synchronize active campaigns to dummy model customers
      try {
        await CampaignEngineService.syncDummyCustomers(client, tenant_id);
      } catch (syncErr) {
        console.warn('[syncDummyCustomers Warning on Activate]', syncErr.message);
      }

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        message: `Campaign ${activated.code} (${activated.name}) is now ACTIVE.`,
        campaign: activated,
        overlap_warnings: warnings
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[CampaignController.activateCampaign Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    } finally {
      client.release();
    }
  }

  /**
   * Cancel campaign
   * POST /api/campaigns/:id/cancel
   */
  static async cancelCampaign(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tenant_id = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
      const id = parseInt(req.params.id, 10);
      const canceller = req.user?.username || 'director';

      const existingRes = await client.query(`
        SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2;
      `, [id, tenant_id]);

      if (existingRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Campaign not found.' });
      }

      const existing = existingRes.rows[0];

      const updRes = await client.query(`
        UPDATE campaigns
        SET status = 'CANCELLED',
            updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING *;
      `, [id, tenant_id]);

      const cancelled = updRes.rows[0];

      await CampaignController.logAudit({
        campaign_id: id,
        action: 'CANCEL',
        changed_by: canceller,
        before_json: existing,
        after_json: cancelled,
        client
      });

      // Synchronize active campaigns to dummy model customers
      try {
        await CampaignEngineService.syncDummyCustomers(client, tenant_id);
      } catch (syncErr) {
        console.warn('[syncDummyCustomers Warning on Cancel]', syncErr.message);
      }

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        message: `Campaign ${cancelled.code} has been CANCELLED.`,
        campaign: cancelled
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[CampaignController.cancelCampaign Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    } finally {
      client.release();
    }
  }

  /**
   * Duplicate campaign
   * POST /api/campaigns/:id/duplicate
   */
  static async duplicateCampaign(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tenant_id = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
      const id = parseInt(req.params.id, 10);
      const creator = req.user?.username || 'director';

      const existingRes = await client.query(`
        SELECT c.*,
               COALESCE(ARRAY_AGG(DISTINCT cm.model_id) FILTER (WHERE cm.model_id IS NOT NULL), '{}') AS models,
               COALESCE(ARRAY_AGG(DISTINCT cb.branch_id) FILTER (WHERE cb.branch_id IS NOT NULL), '{}') AS branches
        FROM campaigns c
        LEFT JOIN campaign_models cm ON c.id = cm.campaign_id
        LEFT JOIN campaign_branches cb ON c.id = cb.campaign_id
        WHERE c.id = $1 AND c.tenant_id = $2
        GROUP BY c.id;
      `, [id, tenant_id]);

      if (existingRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Campaign not found.' });
      }

      const orig = existingRes.rows[0];
      const newCode = await CampaignEngineService.generateCampaignCode(client);
      const newName = `Copy of ${orig.name}`;

      const insRes = await client.query(`
        INSERT INTO campaigns (
          code, name, type, value, max_bonus_per_invoice, vehicle_type,
          spend_category, brand, all_models, all_branches, customer_tier,
          min_spend, max_spend, start_date, end_date, date_basis,
          stacking, priority, redeem_lock_days, status, notes,
          created_by, tenant_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19, 'DRAFT', $20,
          $21, $22, NOW(), NOW()
        ) RETURNING *;
      `, [
        newCode, newName, orig.type, orig.value, orig.max_bonus_per_invoice, orig.vehicle_type,
        orig.spend_category, orig.brand, orig.all_models, orig.all_branches, orig.customer_tier,
        orig.min_spend, orig.max_spend, orig.start_date, orig.end_date, orig.date_basis,
        orig.stacking, orig.priority, orig.redeem_lock_days, orig.notes,
        creator, tenant_id
      ]);

      const duplicated = insRes.rows[0];

      // Duplicate models
      if (!orig.all_models && Array.isArray(orig.models)) {
        for (const m of orig.models) {
          await client.query(`
            INSERT INTO campaign_models (campaign_id, model_id, tenant_id)
            VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;
          `, [duplicated.id, m, tenant_id]);
        }
      }

      // Duplicate branches
      if (!orig.all_branches && Array.isArray(orig.branches)) {
        for (const b of orig.branches) {
          await client.query(`
            INSERT INTO campaign_branches (campaign_id, branch_id, tenant_id)
            VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;
          `, [duplicated.id, b, tenant_id]);
        }
      }

      await CampaignController.logAudit({
        campaign_id: duplicated.id,
        action: 'DUPLICATE',
        changed_by: creator,
        after_json: duplicated,
        client
      });

      await client.query('COMMIT');

      return res.status(201).json({
        success: true,
        message: `Campaign duplicated as ${duplicated.code} (Draft).`,
        campaign: duplicated
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[CampaignController.duplicateCampaign Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    } finally {
      client.release();
    }
  }

  /**
   * Dry-run Preview Simulator (No database writes)
   * POST /api/campaigns/preview
   */
  static async previewSaleTest(req, res) {
    try {
      const tenant_id = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
      const inv = req.body.invoice || {};
      const amount = req.body.amount ?? inv.net_ex_showroom_price ?? inv.amount ?? 0;
      const brand = req.body.brand ?? inv.brand ?? 'ALL';
      const model = req.body.model ?? inv.model ?? 'ALL';
      const branch_id = req.body.branch_id ?? inv.branch_id ?? 1;
      const date = req.body.date ?? inv.invoice_date ?? new Date().toISOString().slice(0, 10);
      const tier = req.body.tier ?? inv.customer_tier ?? 'silver';
      const spend_category = req.body.spend_category ?? inv.spend_category ?? 'sale';
      const vehicle_type = req.body.vehicle_type ?? inv.vehicle_type ?? '2W';
      const draft_campaign = req.body.draft_campaign || req.body.overrideCampaign || null;

      const result = await CampaignEngineService.simulateSaleTest({
        amount,
        brand,
        model,
        branch_id,
        date,
        tier,
        spend_category,
        vehicle_type,
        draft_campaign,
        tenant_id
      });

      return res.status(200).json({
        success: true,
        data: result,
        ...result
      });
    } catch (err) {
      console.error('[CampaignController.previewSaleTest Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Manually trigger re-sync of all active campaigns to dummy model customers
   * POST /api/campaigns/sync-dummy-customers
   */
  static async syncDummyCustomers(req, res) {
    try {
      const tenant_id = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
      const result = await CampaignEngineService.syncDummyCustomers(pool, tenant_id);
      return res.status(200).json({
        success: true,
        message: `Synced ${result.synced_count} dummy customer models with active campaigns.`,
        data: result
      });
    } catch (err) {
      console.error('[CampaignController.syncDummyCustomers Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Detailed Campaign Performance Report (invoices, bonus points, liability, CSV export)
   * GET /api/campaigns/:id/report
   */
  static async getCampaignReport(req, res) {
    try {
      const tenant_id = req.headers['x-tenant-id'] || req.user?.tenant_id || 'bellad_and_company';
      const id = parseInt(req.params.id, 10);
      const isExportCsv = req.query.format === 'csv';

      const campRes = await pool.query(`
        SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2;
      `, [id, tenant_id]);

      if (campRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Campaign not found.' });
      }

      const campaign = campRes.rows[0];

      // Invoices issued under this campaign
      const invoicesRes = await pool.query(`
        SELECT pl.entry_id, pl.source_ref AS invoice_id, pl.customer_id, c.customer_name,
               pl.branch_id, b.branch_name, pl.vehicle_id, v.model,
               pl.points AS bonus_points, (pl.points / 4.0)::numeric(12,2) AS rupee_value,
               pl.created_at, pl.reason_text
        FROM points_ledger pl
        LEFT JOIN customers c ON c.customer_id = pl.customer_id AND c.tenant_id = pl.tenant_id
        LEFT JOIN branches b ON b.branch_id = pl.branch_id AND b.tenant_id = pl.tenant_id
        LEFT JOIN vehicles v ON v.vehicle_id = pl.vehicle_id AND v.tenant_id = pl.tenant_id
        WHERE pl.campaign_id = $1 
          AND pl.source_type = 'CAMPAIGN'
          AND pl.tenant_id = $2
          AND pl.points > 0
        ORDER BY pl.entry_id DESC;
      `, [id, tenant_id]);

      const rows = invoicesRes.rows;
      const totalBonusPoints = rows.reduce((sum, r) => sum + parseInt(r.bonus_points || 0, 10), 0);
      const totalInvoices = rows.length;
      const totalRupeeValue = Number((totalBonusPoints / 4).toFixed(2));

      // Calculate unredeemed bonus liability (approximate via customer current balances)
      const customerIds = [...new Set(rows.map(r => r.customer_id))];
      let unredeemedBonusEstimate = totalBonusPoints;
      if (customerIds.length > 0) {
        const balRes = await pool.query(`
          SELECT COALESCE(SUM(points), 0) AS total_balance 
          FROM points_ledger 
          WHERE tenant_id = $1 AND customer_id = ANY($2::varchar[]);
        `, [tenant_id, customerIds]);
        const totalLiveBalance = parseInt(balRes.rows[0].total_balance || 0, 10);
        unredeemedBonusEstimate = Math.min(totalBonusPoints, totalLiveBalance);
      }

      const liabilityRupees = Number((unredeemedBonusEstimate / 4).toFixed(2));

      if (isExportCsv) {
        const csvHeader = 'Entry ID,Invoice / Ref ID,Customer ID,Customer Name,Branch,Model,Bonus Points,Rupee Value (INR),Date\n';
        const csvRows = rows.map(r => [
          r.entry_id,
          `"${r.invoice_id || ''}"`,
          `"${r.customer_id || ''}"`,
          `"${(r.customer_name || '').replace(/"/g, '""')}"`,
          `"${(r.branch_name || '').replace(/"/g, '""')}"`,
          `"${(r.model || '').replace(/"/g, '""')}"`,
          r.bonus_points,
          r.rupee_value,
          r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : ''
        ].join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=Campaign_${campaign.code}_Report.csv`);
        return res.status(200).send(csvHeader + csvRows);
      }

      return res.status(200).json({
        success: true,
        campaign: {
          id: campaign.id,
          code: campaign.code,
          name: campaign.name,
          status: CampaignEngineService.deriveStatus(campaign)
        },
        summary: {
          total_invoices: totalInvoices,
          total_bonus_points_issued: totalBonusPoints,
          total_rupee_value: totalRupeeValue,
          unredeemed_bonus_points: unredeemedBonusEstimate,
          liability_rupees: liabilityRupees
        },
        invoices: rows
      });
    } catch (err) {
      console.error('[CampaignController.getCampaignReport Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = CampaignController;
