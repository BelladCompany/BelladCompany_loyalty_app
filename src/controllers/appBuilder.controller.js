const { pool } = require('../config/db');

class AppBuilderController {
  /**
   * Get App Builder Configuration for a tenant
   */
  static async getConfig(req, res, next) {
    try {
      const tenantId = req.params.tenantId || req.user?.tenant_id || 'bellad_and_company';
      
      const query = `
        SELECT 
          id,
          tenant_id,
          theme_config,
          tabs_config,
          buttons_config,
          logic_config,
          is_published,
          published_at,
          created_at,
          updated_at
        FROM app_builder_configs
        WHERE tenant_id = $1
        LIMIT 1;
      `;
      const result = await pool.query(query, [tenantId]);

      if (result.rows.length === 0) {
        // Return default configuration
        return res.status(200).json({
          status: 'success',
          data: {
            tenant_id: tenantId,
            theme_config: {
              dealership_name: 'Bellad & Company',
              tagline: 'Tata Motors & MG Motors Authorised Dealership Group',
              logo_url: '/bellad-logo.png',
              primary_color: '#1e40af',
              secondary_color: '#3b82f6',
              accent_color: '#10b981',
              surface_mode: 'light',
              card_radius: 'lg',
              font_family: 'Plus Jakarta Sans',
              header_banner_text: 'Customer Loyalty & Rewards Suite',
              show_header_banner: true
            },
            tabs_config: [
              { id: 'dashboard', label: 'Customer Search & 360', icon: 'LayoutDashboard', group: 'Counter POS', order: 1, visible: true, role_access: 'all' },
              { id: 'corrections_queue', label: 'Bill Correction Queue', icon: 'FileText', group: 'Managerial Approvals', order: 2, visible: true, role_access: 'manager' },
              { id: 'customer_redemptions', label: 'Customer Redemptions', icon: 'Sparkles', group: 'Loyalty Rewards', order: 3, visible: true, role_access: 'cashier' },
              { id: 'referrals', label: 'Referral Rewards', icon: 'Users', group: 'Rewards & Referrals', order: 4, visible: true, role_access: 'cashier' },
              { id: 'gift_cards', label: 'Gift Card Rewards', icon: 'Gift', group: 'Rewards & Referrals', order: 5, visible: true, role_access: 'cashier' },
              { id: 'director_command_center', label: 'Director Command Center', icon: 'Crown', group: 'Executive Suite', order: 6, visible: true, role_access: 'director' },
              { id: 'kyc_approvals', label: 'KYC Approvals', icon: 'ShieldCheck', group: 'Loyalty Rewards', order: 7, visible: true, role_access: 'manager' },
              { id: 'reports', label: 'Reports & Analytics', icon: 'BarChart3', group: 'Analytics', order: 8, visible: true, role_access: 'manager' }
            ],
            buttons_config: [
              { id: 'btn_add_receipt', label: 'Add Receipt', icon: 'Plus', style: 'solid', placement: 'header', action_type: 'open_receipt_modal', color: 'emerald', enabled: true, order: 1 },
              { id: 'btn_bill_correction', label: 'Bill Correction', icon: 'FileText', style: 'solid', placement: 'header', action_type: 'open_bill_correction_modal', color: 'amber', enabled: true, order: 2 },
              { id: 'btn_redeem', label: 'Redeem Discount', icon: 'Sparkles', style: 'solid', placement: 'customer_card', action_type: 'open_redemption_modal', color: 'indigo', enabled: true, order: 3 },
              { id: 'btn_whatsapp_pass', label: 'Send WhatsApp Pass', icon: 'Share2', style: 'outline', placement: 'customer_card', action_type: 'send_whatsapp', color: 'emerald', enabled: true, order: 4 },
              { id: 'btn_quick_referral', label: 'Add Referral', icon: 'Users', style: 'soft', placement: 'customer_card', action_type: 'open_referral_modal', color: 'primary', enabled: true, order: 5 },
              { id: 'btn_appsheet_sync', label: 'Sync AppSheet', icon: 'RefreshCw', style: 'outline', placement: 'header', action_type: 'sync_appsheet', color: 'slate', enabled: true, order: 6 }
            ],
            logic_config: {
              sales_net_ex_pct: 1.0,
              service_points_pct: 2.5,
              bodyshop_points_pct: 1.5,
              accessories_points_pct: 3.0,
              points_to_inr_ratio: 0.25,
              lock_in_months: 12,
              expiry_policy: 'FIFO_12_MONTHS',
              max_redemption_pct: 50,
              min_points_to_redeem: 500,
              bill_correction_enabled: true,
              bill_correction_window_hours: 24,
              manager_approval_threshold: 5000,
              welcome_bonus_points: 250,
              birthday_multiplier: 2.0
            },
            is_published: false
          }
        });
      }

      res.status(200).json({
        status: 'success',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save or Publish App Builder Configuration
   */
  static async saveConfig(req, res, next) {
    try {
      const tenantId = req.params.tenantId || req.body.tenant_id || req.user?.tenant_id || 'bellad_and_company';
      const {
        theme_config,
        tabs_config,
        buttons_config,
        logic_config,
        is_published = false
      } = req.body;

      const upsertQuery = `
        INSERT INTO app_builder_configs (
          tenant_id,
          theme_config,
          tabs_config,
          buttons_config,
          logic_config,
          is_published,
          published_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $6 = TRUE THEN NOW() ELSE NULL END, NOW())
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          theme_config = EXCLUDED.theme_config,
          tabs_config = EXCLUDED.tabs_config,
          buttons_config = EXCLUDED.buttons_config,
          logic_config = EXCLUDED.logic_config,
          is_published = EXCLUDED.is_published,
          published_at = CASE WHEN EXCLUDED.is_published = TRUE THEN NOW() ELSE app_builder_configs.published_at END,
          updated_at = NOW()
        RETURNING *;
      `;

      const values = [
        tenantId,
        JSON.stringify(theme_config || {}),
        JSON.stringify(tabs_config || []),
        JSON.stringify(buttons_config || []),
        JSON.stringify(logic_config || {}),
        Boolean(is_published)
      ];

      const result = await pool.query(upsertQuery, values);

      res.status(200).json({
        status: 'success',
        message: is_published
          ? 'Configuration successfully published to live loyalty app!'
          : 'App draft successfully saved.',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Published Config (for runtime application hydration)
   */
  static async getPublishedConfig(req, res, next) {
    try {
      const tenantId = req.params.tenantId || req.query.tenant_id || 'bellad_and_company';
      const result = await pool.query(
        `SELECT 
          tenant_id,
          theme_config,
          tabs_config,
          buttons_config,
          logic_config,
          published_at
         FROM app_builder_configs
         WHERE tenant_id = $1 AND is_published = TRUE
         LIMIT 1;`,
        [tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(200).json({
          status: 'success',
          published: false,
          data: null
        });
      }

      res.status(200).json({
        status: 'success',
        published: true,
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset configuration back to standard defaults
   */
  static async resetConfig(req, res, next) {
    try {
      const tenantId = req.params.tenantId || req.user?.tenant_id || 'bellad_and_company';
      
      const resetQuery = `
        DELETE FROM app_builder_configs
        WHERE tenant_id = $1;
      `;
      await pool.query(resetQuery, [tenantId]);

      // Re-insert factory defaults
      const reinsert = `
        INSERT INTO app_builder_configs (tenant_id, is_published, published_at)
        VALUES ($1, TRUE, NOW())
        RETURNING *;
      `;
      const result = await pool.query(reinsert, [tenantId]);

      res.status(200).json({
        status: 'success',
        message: 'Configuration successfully reset to factory defaults.',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AppBuilderController;
