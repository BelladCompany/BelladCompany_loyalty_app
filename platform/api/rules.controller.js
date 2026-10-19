const crypto = require('crypto');
const { pool } = require('../../src/config/db');
const { RulesetPayloadSchema } = require('../engine/schema');
const RuleSimulator = require('../engine/simulator');
const pubSub = require('../realtime/pubsub');

class PlatformRulesController {
  /**
   * GET /api/v1/platform/rules/active
   * Returns active published ruleset with ETag caching.
   */
  static async getActiveRuleset(req, res) {
    try {
      const tenantId = req.query.tenant_id || req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const activeData = await pubSub.getActiveRuleset(tenantId);

      if (!activeData) {
        return res.status(404).json({
          status: 'fail',
          error: `No published ruleset found for tenant '${tenantId}'`,
        });
      }

      // Check ETag for 304 Not Modified
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag && clientEtag === activeData.etag) {
        return res.status(304).end();
      }

      res.setHeader('ETag', activeData.etag);
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

      return res.status(200).json({
        status: 'success',
        data: activeData,
      });
    } catch (err) {
      console.error('Error getting active ruleset:', err);
      return res.status(500).json({ status: 'error', error: err.message });
    }
  }

  /**
   * GET /api/v1/platform/rules/versions
   * Lists all versions with metadata and audit trail.
   */
  static async listVersions(req, res) {
    try {
      const tenantId = req.query.tenant_id || req.tenantId || req.user?.tenant_id || 'bellad_and_company';

      const versionsRes = await pool.query(
        `SELECT version_id, version_number, status, is_active, checksum,
                published_by, published_at, approved_by, approved_at, release_notes,
                created_at, updated_at,
                jsonb_array_length(ruleset_payload->'rules') AS total_rules_count
         FROM tenant_loyalty_rule_versions
         WHERE tenant_id = $1
         ORDER BY version_number DESC;`,
        [tenantId]
      );

      const auditRes = await pool.query(
        `SELECT audit_id, version_id, version_number, action, performed_by, diff_summary, created_at
         FROM tenant_rule_audit_trail
         WHERE tenant_id = $1
         ORDER BY created_at DESC
         LIMIT 20;`,
        [tenantId]
      );

      return res.status(200).json({
        status: 'success',
        data: {
          versions: versionsRes.rows,
          recent_audit_trail: auditRes.rows,
        },
      });
    } catch (err) {
      console.error('Error listing versions:', err);
      return res.status(500).json({ status: 'error', error: err.message });
    }
  }

  /**
   * GET /api/v1/platform/rules/versions/:version_number
   * Fetches full ruleset payload for a specific version.
   */
  static async getVersionByNumber(req, res) {
    try {
      const tenantId = req.query.tenant_id || req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const versionNum = parseInt(req.params.version_number, 10);

      const resRow = await pool.query(
        `SELECT * FROM tenant_loyalty_rule_versions
         WHERE tenant_id = $1 AND version_number = $2
         LIMIT 1;`,
        [tenantId, versionNum]
      );

      if (resRow.rows.length === 0) {
        return res.status(404).json({ status: 'fail', error: `Version ${versionNum} not found.` });
      }

      return res.status(200).json({ status: 'success', data: resRow.rows[0] });
    } catch (err) {
      return res.status(500).json({ status: 'error', error: err.message });
    }
  }

  /**
   * POST /api/v1/platform/rules/draft
   * Creates or updates a draft ruleset version.
   */
  static async saveDraft(req, res) {
    try {
      const tenantId = req.body.tenant_id || req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const rawRuleset = req.body.ruleset || req.body;
      const releaseNotes = req.body.release_notes || 'Draft updates';
      const performedBy = req.user?.username || req.user?.email || 'admin';

      // 1. Validate payload against Zod schema
      const parseResult = RulesetPayloadSchema.safeParse(rawRuleset);
      if (!parseResult.success) {
        return res.status(400).json({
          status: 'fail',
          error: 'Ruleset validation failed against JSON schema.',
          details: parseResult.error.errors,
        });
      }
      const validatedRuleset = parseResult.data;

      // 2. Compute SHA-256 checksum
      const checksum = crypto
        .createHash('sha256')
        .update(JSON.stringify(validatedRuleset))
        .digest('hex');

      // 3. Find if draft already exists or determine next version number
      const existingDraft = await pool.query(
        `SELECT version_id, version_number FROM tenant_loyalty_rule_versions
         WHERE tenant_id = $1 AND status = 'draft'
         ORDER BY version_number DESC LIMIT 1;`,
        [tenantId]
      );

      let savedVersion;

      if (existingDraft.rows.length > 0) {
        // Update existing draft
        const draftRow = existingDraft.rows[0];
        const updateRes = await pool.query(
          `UPDATE tenant_loyalty_rule_versions
           SET ruleset_payload = $1, checksum = $2, release_notes = $3, updated_at = NOW()
           WHERE version_id = $4
           RETURNING *;`,
          [validatedRuleset, checksum, releaseNotes, draftRow.version_id]
        );
        savedVersion = updateRes.rows[0];

        // Audit log
        await pool.query(
          `INSERT INTO tenant_rule_audit_trail (tenant_id, version_id, version_number, action, performed_by, diff_summary)
           VALUES ($1, $2, $3, 'draft_updated', $4, $5);`,
          [tenantId, savedVersion.version_id, savedVersion.version_number, performedBy, { checksum, releaseNotes }]
        );
      } else {
        // Determine next version number
        const maxVRes = await pool.query(
          `SELECT COALESCE(MAX(version_number), 0) AS max_v FROM tenant_loyalty_rule_versions WHERE tenant_id = $1;`,
          [tenantId]
        );
        const nextVersionNumber = parseInt(maxVRes.rows[0].max_v, 10) + 1;
        validatedRuleset.version = nextVersionNumber;

        const insertRes = await pool.query(
          `INSERT INTO tenant_loyalty_rule_versions (
             tenant_id, version_number, status, ruleset_payload, checksum, release_notes, is_active
           )
           VALUES ($1, $2, 'draft', $3, $4, $5, false)
           RETURNING *;`,
          [tenantId, nextVersionNumber, validatedRuleset, checksum, releaseNotes]
        );
        savedVersion = insertRes.rows[0];

        // Audit log
        await pool.query(
          `INSERT INTO tenant_rule_audit_trail (tenant_id, version_id, version_number, action, performed_by, diff_summary)
           VALUES ($1, $2, $3, 'draft_created', $4, $5);`,
          [tenantId, savedVersion.version_id, savedVersion.version_number, performedBy, { checksum, releaseNotes }]
        );
      }

      return res.status(200).json({
        status: 'success',
        message: `Draft Version ${savedVersion.version_number} saved successfully.`,
        data: savedVersion,
      });
    } catch (err) {
      console.error('Error saving draft:', err);
      return res.status(500).json({ status: 'error', error: err.message });
    }
  }

  /**
   * POST /api/v1/platform/rules/simulate
   * Simulates an arbitrary bill and customer against either a specific version or draft.
   */
  static async simulate(req, res) {
    try {
      const tenantId = req.body.tenant_id || req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const { customer_profile, transaction_context, version_number } = req.body;

      let targetRuleset = req.body.ruleset_override;

      if (!targetRuleset) {
        if (version_number) {
          const vRes = await pool.query(
            `SELECT ruleset_payload FROM tenant_loyalty_rule_versions WHERE tenant_id = $1 AND version_number = $2;`,
            [tenantId, version_number]
          );
          if (vRes.rows.length === 0) {
            return res.status(404).json({ status: 'fail', error: `Version ${version_number} not found.` });
          }
          targetRuleset = vRes.rows[0].ruleset_payload;
        } else {
          // Default to active published ruleset
          const active = await pubSub.getActiveRuleset(tenantId);
          if (!active) {
            return res.status(404).json({ status: 'fail', error: 'No active ruleset found for simulation.' });
          }
          targetRuleset = active.ruleset;
        }
      }

      const outcome = RuleSimulator.simulate({
        customer_profile: customer_profile || {},
        transaction_context: transaction_context || {},
        ruleset: targetRuleset,
      });

      return res.status(200).json({
        status: 'success',
        data: outcome,
      });
    } catch (err) {
      console.error('Error simulating rules:', err);
      return res.status(500).json({ status: 'error', error: err.message });
    }
  }

  /**
   * POST /api/v1/platform/rules/publish
   * Publishes draft or pending version live within ~1 second.
   */
  static async publish(req, res) {
    const tenantId = req.body.tenant_id || req.tenantId || req.user?.tenant_id || 'bellad_and_company';
    const versionNumber = parseInt(req.body.version_number, 10);
    const publisher = req.user?.username || req.user?.email || 'admin';

    if (!versionNumber) {
      return res.status(400).json({ status: 'fail', error: 'version_number is required to publish.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify target version exists
      const targetRes = await client.query(
        `SELECT * FROM tenant_loyalty_rule_versions WHERE tenant_id = $1 AND version_number = $2 FOR UPDATE;`,
        [tenantId, versionNumber]
      );
      if (targetRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ status: 'fail', error: `Version ${versionNumber} not found.` });
      }

      const targetVersion = targetRes.rows[0];

      // 2. Validate payload once more
      const parsed = RulesetPayloadSchema.safeParse(targetVersion.ruleset_payload);
      if (!parsed.success) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          status: 'fail',
          error: 'Cannot publish: Ruleset payload failed strict JSON schema validation.',
          details: parsed.error.errors,
        });
      }

      // 3. Demote existing published active version(s) to 'archived'
      await client.query(
        `UPDATE tenant_loyalty_rule_versions
         SET is_active = false, status = 'archived', updated_at = NOW()
         WHERE tenant_id = $1 AND is_active = true;`,
        [tenantId]
      );

      // 4. Promote target version to 'published' and is_active = true
      const publishRes = await client.query(
        `UPDATE tenant_loyalty_rule_versions
         SET status = 'published', is_active = true, published_by = $1, published_at = NOW(), approved_by = $1, approved_at = NOW(), updated_at = NOW()
         WHERE version_id = $2
         RETURNING *;`,
        [publisher, targetVersion.version_id]
      );

      const publishedVersion = publishRes.rows[0];

      // 5. Insert audit log
      await client.query(
        `INSERT INTO tenant_rule_audit_trail (tenant_id, version_id, version_number, action, performed_by, diff_summary)
         VALUES ($1, $2, $3, 'published', $4, $5);`,
        [tenantId, publishedVersion.version_id, publishedVersion.version_number, publisher, { release_notes: publishedVersion.release_notes }]
      );

      await client.query('COMMIT');

      // 6. Immediate in-memory cache invalidation
      pubSub.invalidateCache(tenantId);

      return res.status(200).json({
        status: 'success',
        message: `Version ${publishedVersion.version_number} successfully published live! Real-time notifications dispatched.`,
        data: publishedVersion,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error publishing ruleset:', err);
      return res.status(500).json({ status: 'error', error: err.message });
    } finally {
      client.release();
    }
  }

  /**
   * POST /api/v1/platform/rules/rollback
   * One-click rollback to any historical version by generating a new version bump (N+1).
   */
  static async rollback(req, res) {
    const tenantId = req.body.tenant_id || req.tenantId || req.user?.tenant_id || 'bellad_and_company';
    const targetVersionNumber = parseInt(req.body.target_version_number, 10);
    const performedBy = req.user?.username || req.user?.email || 'admin';

    if (!targetVersionNumber) {
      return res.status(400).json({ status: 'fail', error: 'target_version_number is required for rollback.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch historical version payload
      const histRes = await client.query(
        `SELECT ruleset_payload FROM tenant_loyalty_rule_versions WHERE tenant_id = $1 AND version_number = $2;`,
        [tenantId, targetVersionNumber]
      );
      if (histRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ status: 'fail', error: `Target rollback version ${targetVersionNumber} not found.` });
      }

      const historicalPayload = histRes.rows[0].ruleset_payload;

      // 2. Next version number
      const maxVRes = await client.query(
        `SELECT COALESCE(MAX(version_number), 0) AS max_v FROM tenant_loyalty_rule_versions WHERE tenant_id = $1;`,
        [tenantId]
      );
      const nextVersionNumber = parseInt(maxVRes.rows[0].max_v, 10) + 1;
      historicalPayload.version = nextVersionNumber;

      const checksum = crypto.createHash('sha256').update(JSON.stringify(historicalPayload)).digest('hex');

      // 3. Demote currently active version
      await client.query(
        `UPDATE tenant_loyalty_rule_versions SET is_active = false, status = 'archived', updated_at = NOW() WHERE tenant_id = $1 AND is_active = true;`,
        [tenantId]
      );

      // 4. Insert new published version
      const rollbackRes = await client.query(
        `INSERT INTO tenant_loyalty_rule_versions (
           tenant_id, version_number, status, ruleset_payload, checksum,
           published_by, published_at, approved_by, approved_at, release_notes, is_active
         )
         VALUES ($1, $2, 'published', $3, $4, $5, NOW(), $5, NOW(), $6, true)
         RETURNING *;`,
        [
          tenantId,
          nextVersionNumber,
          historicalPayload,
          checksum,
          performedBy,
          `One-click rollback to Version ${targetVersionNumber} payload.`,
        ]
      );

      const rollbackVersion = rollbackRes.rows[0];

      // 5. Audit log
      await client.query(
        `INSERT INTO tenant_rule_audit_trail (tenant_id, version_id, version_number, action, performed_by, diff_summary)
         VALUES ($1, $2, $3, 'rolled_back', $4, $5);`,
        [tenantId, rollbackVersion.version_id, rollbackVersion.version_number, performedBy, { rolled_back_to_version: targetVersionNumber }]
      );

      await client.query('COMMIT');
      pubSub.invalidateCache(tenantId);

      return res.status(200).json({
        status: 'success',
        message: `Successfully rolled back to Version ${targetVersionNumber}! Published as new active Version ${rollbackVersion.version_number}.`,
        data: rollbackVersion,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(500).json({ status: 'error', error: err.message });
    } finally {
      client.release();
    }
  }

  /**
   * GET /api/v1/platform/branding
   */
  static async getBranding(req, res) {
    try {
      const tenantId = req.query.tenant_id || req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const resRow = await pool.query(
        `SELECT * FROM tenant_branding_configs WHERE tenant_id = $1;`,
        [tenantId]
      );
      if (resRow.rows.length === 0) {
        return res.status(200).json({
          status: 'success',
          data: {
            tenant_id: tenantId,
            portal_title: 'Loyalty Rewards Program',
            primary_color: '#0F172A',
            accent_color: '#2563EB',
            i18n_default_language: 'en-IN',
            supported_languages: ['en-IN', 'kn-IN'],
          },
        });
      }
      return res.status(200).json({ status: 'success', data: resRow.rows[0] });
    } catch (err) {
      return res.status(500).json({ status: 'error', error: err.message });
    }
  }

  /**
   * PUT /api/v1/platform/branding
   */
  static async updateBranding(req, res) {
    try {
      const tenantId = req.body.tenant_id || req.tenantId || req.user?.tenant_id || 'bellad_and_company';
      const {
        portal_title,
        logo_url,
        primary_color,
        accent_color,
        custom_domain,
        i18n_default_language,
        contact_email,
        contact_phone,
      } = req.body;

      const resRow = await pool.query(
        `INSERT INTO tenant_branding_configs (
           tenant_id, portal_title, logo_url, primary_color, accent_color,
           custom_domain, i18n_default_language, contact_email, contact_phone, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (tenant_id) DO UPDATE SET
           portal_title = COALESCE(EXCLUDED.portal_title, tenant_branding_configs.portal_title),
           logo_url = COALESCE(EXCLUDED.logo_url, tenant_branding_configs.logo_url),
           primary_color = COALESCE(EXCLUDED.primary_color, tenant_branding_configs.primary_color),
           accent_color = COALESCE(EXCLUDED.accent_color, tenant_branding_configs.accent_color),
           custom_domain = COALESCE(EXCLUDED.custom_domain, tenant_branding_configs.custom_domain),
           i18n_default_language = COALESCE(EXCLUDED.i18n_default_language, tenant_branding_configs.i18n_default_language),
           contact_email = COALESCE(EXCLUDED.contact_email, tenant_branding_configs.contact_email),
           contact_phone = COALESCE(EXCLUDED.contact_phone, tenant_branding_configs.contact_phone),
           updated_at = NOW()
         RETURNING *;`,
        [
          tenantId,
          portal_title,
          logo_url,
          primary_color,
          accent_color,
          custom_domain,
          i18n_default_language,
          contact_email,
          contact_phone,
        ]
      );

      return res.status(200).json({ status: 'success', data: resRow.rows[0] });
    } catch (err) {
      return res.status(500).json({ status: 'error', error: err.message });
    }
  }
}

module.exports = PlatformRulesController;
