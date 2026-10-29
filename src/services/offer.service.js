const { pool } = require('../config/db');

class OfferService {
  /**
   * Fetch offers with dynamic filters and aggregate metadata for frontend dropdowns
   */
  static async getOffers(filters = {}) {
    const tenantId = filters.tenantId || 'bellad_and_company';
    const conditions = ['tenant_id = $1'];
    const values = [tenantId];
    let valIndex = 2;

    if (!filters.includeInactive) {
      conditions.push('is_active = true');
    }

    if (filters.brand && filters.brand !== 'all' && filters.brand !== 'All Brands') {
      conditions.push(`brand_name ILIKE $${valIndex++}`);
      values.push(`%${filters.brand}%`);
    }

    if (filters.category && filters.category !== 'all' && filters.category !== 'All Categories') {
      conditions.push(`category = $${valIndex++}`);
      values.push(filters.category);
    }

    if (filters.branch && filters.branch !== 'all' && filters.branch !== 'All Branches') {
      conditions.push(`(branch_name ILIKE $${valIndex} OR branch_name = 'All Branches' OR city ILIKE $${valIndex})`);
      values.push(`%${filters.branch}%`);
      valIndex++;
    }

    if (filters.month && filters.month !== 'all' && filters.month !== 'All Months') {
      conditions.push(`valid_month ILIKE $${valIndex++}`);
      values.push(`%${filters.month}%`);
    }

    if (filters.search) {
      conditions.push(`(title ILIKE $${valIndex} OR model_name ILIKE $${valIndex} OR description ILIKE $${valIndex} OR code ILIKE $${valIndex})`);
      values.push(`%${filters.search}%`);
      valIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const query = `
      SELECT 
        offer_id, tenant_id, brand_name, model_name, category,
        branch_name, city, title, benefit, description, highlights,
        code, valid_month, valid_till, badge, badge_color, image_url,
        whatsapp_number, whatsapp_msg, is_active, priority,
        created_at, updated_at
      FROM dealership_offers
      WHERE ${whereClause}
      ORDER BY priority DESC, created_at DESC;
    `;

    const { rows: offers } = await pool.query(query, values);

    // Fetch dynamic metadata for filter menus (brands, branches, months, categories)
    const metaQuery = `
      SELECT 
        ARRAY_AGG(DISTINCT brand_name) FILTER (WHERE brand_name IS NOT NULL) AS brands,
        ARRAY_AGG(DISTINCT model_name) FILTER (WHERE model_name IS NOT NULL) AS models,
        ARRAY_AGG(DISTINCT branch_name) FILTER (WHERE branch_name IS NOT NULL) AS branches,
        ARRAY_AGG(DISTINCT valid_month) FILTER (WHERE valid_month IS NOT NULL) AS months,
        ARRAY_AGG(DISTINCT category) FILTER (WHERE category IS NOT NULL) AS categories
      FROM dealership_offers
      WHERE tenant_id = $1 AND (is_active = true OR $2 = true);
    `;
    const { rows: metaRows } = await pool.query(metaQuery, [tenantId, Boolean(filters.includeInactive)]);
    const meta = metaRows[0] || { brands: [], models: [], branches: [], months: [], categories: [] };

    return {
      offers,
      meta: {
        brands: (meta.brands || []).sort(),
        models: (meta.models || []).sort(),
        branches: (meta.branches || []).sort(),
        months: (meta.months || []).sort(),
        categories: (meta.categories || []).sort(),
      },
    };
  }

  static async getOfferById(offerId, tenantId = 'bellad_and_company') {
    const query = `
      SELECT * FROM dealership_offers
      WHERE offer_id = $1 AND tenant_id = $2;
    `;
    const { rows } = await pool.query(query, [offerId, tenantId]);
    return rows[0] || null;
  }

  static async createOffer(offerData, tenantId = 'bellad_and_company') {
    const {
      brand_name,
      model_name,
      category = 'new_vehicle',
      branch_name = 'All Branches',
      city = 'All Cities',
      title,
      benefit,
      description = '',
      highlights = [],
      code = '',
      valid_month = 'November 2026',
      valid_till = '',
      badge = 'MONTHLY SPECIAL',
      badge_color = 'bg-amber-500 text-slate-950 font-black',
      image_url = '',
      whatsapp_number = '918197348730',
      whatsapp_msg = '',
      is_active = true,
      priority = 0,
    } = offerData;

    const highlightsJson = Array.isArray(highlights) ? JSON.stringify(highlights) : JSON.stringify([]);

    const query = `
      INSERT INTO dealership_offers (
        tenant_id, brand_name, model_name, category, branch_name, city,
        title, benefit, description, highlights, code, valid_month, valid_till,
        badge, badge_color, image_url, whatsapp_number, whatsapp_msg, is_active, priority
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *;
    `;

    const values = [
      tenantId,
      brand_name,
      model_name,
      category,
      branch_name,
      city,
      title,
      benefit,
      description,
      highlightsJson,
      code,
      valid_month,
      valid_till,
      badge,
      badge_color,
      image_url,
      whatsapp_number,
      whatsapp_msg,
      is_active,
      priority,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async updateOffer(offerId, offerData, tenantId = 'bellad_and_company') {
    const existing = await this.getOfferById(offerId, tenantId);
    if (!existing) {
      throw new Error(`Offer with ID ${offerId} not found.`);
    }

    const {
      brand_name = existing.brand_name,
      model_name = existing.model_name,
      category = existing.category,
      branch_name = existing.branch_name,
      city = existing.city,
      title = existing.title,
      benefit = existing.benefit,
      description = existing.description,
      highlights = existing.highlights,
      code = existing.code,
      valid_month = existing.valid_month,
      valid_till = existing.valid_till,
      badge = existing.badge,
      badge_color = existing.badge_color,
      image_url = existing.image_url,
      whatsapp_number = existing.whatsapp_number,
      whatsapp_msg = existing.whatsapp_msg,
      is_active = existing.is_active,
      priority = existing.priority,
    } = offerData;

    const highlightsJson = Array.isArray(highlights) ? JSON.stringify(highlights) : JSON.stringify(existing.highlights || []);

    const query = `
      UPDATE dealership_offers
      SET 
        brand_name = $1,
        model_name = $2,
        category = $3,
        branch_name = $4,
        city = $5,
        title = $6,
        benefit = $7,
        description = $8,
        highlights = $9::jsonb,
        code = $10,
        valid_month = $11,
        valid_till = $12,
        badge = $13,
        badge_color = $14,
        image_url = $15,
        whatsapp_number = $16,
        whatsapp_msg = $17,
        is_active = $18,
        priority = $19,
        updated_at = NOW()
      WHERE offer_id = $20 AND tenant_id = $21
      RETURNING *;
    `;

    const values = [
      brand_name,
      model_name,
      category,
      branch_name,
      city,
      title,
      benefit,
      description,
      highlightsJson,
      code,
      valid_month,
      valid_till,
      badge,
      badge_color,
      image_url,
      whatsapp_number,
      whatsapp_msg,
      is_active,
      priority,
      offerId,
      tenantId,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async toggleOfferStatus(offerId, tenantId = 'bellad_and_company') {
    const query = `
      UPDATE dealership_offers
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE offer_id = $1 AND tenant_id = $2
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [offerId, tenantId]);
    return rows[0] || null;
  }

  static async deleteOffer(offerId, tenantId = 'bellad_and_company') {
    const query = `
      DELETE FROM dealership_offers
      WHERE offer_id = $1 AND tenant_id = $2
      RETURNING offer_id;
    `;
    const { rows } = await pool.query(query, [offerId, tenantId]);
    return rows.length > 0;
  }

  static async createEnquiry(enquiryData, tenantId = 'bellad_and_company') {
    const {
      offer_id = null,
      brand_name = '',
      model_name = '',
      customer_name,
      phone,
      city_or_branch = 'Hubli',
      notes = '',
    } = enquiryData;

    const query = `
      INSERT INTO offer_enquiries (
        tenant_id, offer_id, brand_name, model_name, customer_name, phone, city_or_branch, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new')
      RETURNING *;
    `;
    const values = [
      tenantId,
      offer_id,
      brand_name,
      model_name,
      customer_name,
      phone,
      city_or_branch,
      notes,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }
}

module.exports = OfferService;

