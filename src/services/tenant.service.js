const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

class TenantService {
  /**
   * List all client firms / tenants
   */
  static async listFirms() {
    const res = await pool.query(
      `SELECT 
        f.firm_id,
        f.tenant_id,
        f.firm_name,
        f.legal_name,
        f.brand_slug,
        f.logo_url,
        f.theme_color,
        f.accent_color,
        f.point_to_rupee_rate,
        f.contact_phone,
        f.contact_email,
        f.address,
        f.is_active,
        f.created_at,
        (SELECT COUNT(*)::int FROM customers c WHERE c.tenant_id = f.tenant_id) AS total_customers,
        (SELECT COUNT(*)::int FROM branches b WHERE b.tenant_id = f.tenant_id) AS total_branches,
        (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = f.tenant_id) AS total_users
       FROM firms f
       ORDER BY f.firm_id ASC;`
    );
    return res.rows;
  }

  /**
   * Onboard a brand-new Client Firm in 1 Click!
   * Automatically provisions:
   * - Firm record
   * - Default Branch (Main Showroom)
   * - Initial Firm Admin user
   * - Standard 2W & 4W In-house point rules
   * - Silver, Gold, Platinum tier rules
   */
  static async createFirm({
    tenant_id,
    firm_name,
    legal_name,
    brand_slug,
    logo_url,
    theme_color = '#0f172a',
    accent_color = '#2563eb',
    point_to_rupee_rate = 0.25,
    contact_phone,
    contact_email,
    address,
    admin_username,
    admin_password,
    default_branch_name = 'Main Showroom',
    default_branch_city = 'Bangalore',
  }) {
    if (!tenant_id || !firm_name) {
      throw { statusCode: 400, message: 'Tenant ID and Firm Name are required.' };
    }

    const cleanTenantId = tenant_id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert Firm
      const firmRes = await client.query(
        `INSERT INTO firms (
          tenant_id, firm_name, legal_name, brand_slug, logo_url, theme_color,
          accent_color, point_to_rupee_rate, contact_phone, contact_email, address, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE)
        ON CONFLICT (tenant_id) DO UPDATE
        SET firm_name = EXCLUDED.firm_name,
            legal_name = EXCLUDED.legal_name,
            theme_color = EXCLUDED.theme_color,
            accent_color = EXCLUDED.accent_color,
            point_to_rupee_rate = EXCLUDED.point_to_rupee_rate,
            updated_at = NOW()
        RETURNING *;`,
        [
          cleanTenantId,
          firm_name,
          legal_name || firm_name,
          brand_slug || cleanTenantId,
          logo_url || null,
          theme_color,
          accent_color,
          point_to_rupee_rate,
          contact_phone || null,
          contact_email || null,
          address || null,
        ]
      );

      // 2. Provision Default Branch
      let branchId = 1;
      const branchRes = await client.query(
        `INSERT INTO branches (branch_name, branch_city, tenant_id)
         VALUES ($1, $2, $3)
         RETURNING branch_id;`,
        [default_branch_name, default_branch_city, cleanTenantId]
      );
      if (branchRes.rows.length > 0) {
        branchId = branchRes.rows[0].branch_id;
      }

      // 3. Provision Admin User for this Firm
      const username = admin_username || `${cleanTenantId}_admin`;
      const password = admin_password || 'Admin@123';
      const passwordHash = await bcrypt.hash(password, 10);

      await client.query(
        `INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
         VALUES ($1, $2, 'admin', $3, $4)
         ON CONFLICT (username) DO NOTHING;`,
        [username, passwordHash, branchId, cleanTenantId]
      );

      // 4. Provision Standard Point Rules
      const colCheck = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'point_rules';`
      );
      const colNames = colCheck.rows.map((r) => r.column_name);
      const typeCol = colNames.includes('rule_type') ? 'rule_type' : 'rate_type';

      await client.query(
        `INSERT INTO point_rules (tenant_id, ${typeCol}, vehicle_type, service_type, condition_value, points, multiplier_numerator, multiplier_denominator, description)
         VALUES
           ($1, 'sale', 'all', NULL, NULL, 0, 1, 100, 'Vehicle sale 1 pt per ₹100 net ex-showroom'),
           ($1, 'service', 'all', NULL, NULL, 0, 1, 100, 'Service 1 pt per ₹100'),
           ($1, 'finance', '2W', 'finance', 'in_house', 100, 100, 1, 'In-house finance bonus - 2W'),
           ($1, 'insurance', '2W', 'insurance', 'in_house', 50, 50, 1, 'In-house insurance bonus - 2W'),
           ($1, 'exchange', '2W', 'exchange', 'yes', 200, 200, 1, 'Exchange bonus - 2W'),
           ($1, 'finance', '4W', 'finance', 'in_house', 100, 100, 1, 'In-house finance bonus - 4W'),
           ($1, 'insurance', '4W', 'insurance', 'in_house', 50, 50, 1, 'In-house insurance bonus - 4W'),
           ($1, 'exchange', '4W', 'exchange', 'yes', 200, 200, 1, 'Exchange bonus - 4W')
         ON CONFLICT DO NOTHING;`,
        [cleanTenantId]
      );

      // 5. Provision Standard Tiers
      await client.query(
        `INSERT INTO tier_rules (tenant_id, tier_name, min_lifetime_points)
         VALUES
           ($1, 'Silver', 0),
           ($1, 'Gold', 5000),
           ($1, 'Platinum', 15000),
           ($1, 'Diamond', 35000)
         ON CONFLICT DO NOTHING;`,
        [cleanTenantId]
      );

      await client.query('COMMIT');

      return {
        firm: firmRes.rows[0],
        admin_credentials: {
          username,
          password: admin_password ? '***' : 'Admin@123 (Default password)',
          branch_id: branchId,
        },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update Firm settings
   */
  static async updateFirm(tenantId, updates) {
    const {
      firm_name,
      legal_name,
      theme_color,
      accent_color,
      logo_url,
      point_to_rupee_rate,
      contact_phone,
      contact_email,
      address,
      is_active,
    } = updates;

    const res = await pool.query(
      `UPDATE firms
       SET firm_name = COALESCE($1, firm_name),
           legal_name = COALESCE($2, legal_name),
           theme_color = COALESCE($3, theme_color),
           accent_color = COALESCE($4, accent_color),
           logo_url = COALESCE($5, logo_url),
           point_to_rupee_rate = COALESCE($6, point_to_rupee_rate),
           contact_phone = COALESCE($7, contact_phone),
           contact_email = COALESCE($8, contact_email),
           address = COALESCE($9, address),
           is_active = COALESCE($10, is_active),
           updated_at = NOW()
       WHERE tenant_id = $11
       RETURNING *;`,
      [
        firm_name,
        legal_name,
        theme_color,
        accent_color,
        logo_url,
        point_to_rupee_rate,
        contact_phone,
        contact_email,
        address,
        is_active,
        tenantId,
      ]
    );

    return res.rows[0];
  }
}

module.exports = TenantService;
