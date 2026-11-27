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

    // Location / City targeted filtering
    let cityParamIndex = null;
    if (filters.city && filters.city !== 'all' && filters.city !== 'All Cities') {
      cityParamIndex = valIndex;
      conditions.push(`(
        $${valIndex} = ANY(target_cities)
        OR 'All Cities' = ANY(target_cities)
        OR is_statewide = true
        OR city ILIKE '%' || $${valIndex} || '%'
        OR branch_name ILIKE '%' || $${valIndex} || '%'
      )`);
      values.push(filters.city);
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
    const orderClause = cityParamIndex
      ? `ORDER BY 
          CASE 
            WHEN $${cityParamIndex} = ANY(target_cities) OR city ILIKE '%' || $${cityParamIndex} || '%' THEN 1
            WHEN is_statewide = true OR 'All Cities' = ANY(target_cities) THEN 2
            ELSE 3
          END ASC, 
          priority DESC, created_at DESC`
      : 'ORDER BY priority DESC, created_at DESC';

    const query = `
      SELECT 
        offer_id, tenant_id, brand_name, model_name, category,
        branch_name, city, target_cities, discount_percent, is_statewide,
        geofence_lat, geofence_lng, radius_km,
        title, benefit, description, highlights,
        code, valid_month, valid_till, badge, badge_color, image_url,
        whatsapp_number, whatsapp_msg, is_active, priority,
        created_at, updated_at
      FROM dealership_offers
      WHERE ${whereClause}
      ${orderClause};
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
      target_cities,
      discount_percent = null,
      is_statewide = false,
      geofence_lat = null,
      geofence_lng = null,
      radius_km = 50.0,
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
      whatsapp_number = '919035354159',
      whatsapp_msg = '',
      is_active = true,
      priority = 0,
    } = offerData;

    const highlightsJson = Array.isArray(highlights) ? JSON.stringify(highlights) : JSON.stringify([]);
    const normalizedCities = Array.isArray(target_cities) && target_cities.length > 0
      ? target_cities
      : (city && city !== 'All Cities' ? city.split(',').map((c) => c.trim()).filter(Boolean) : ['All Cities']);

    const query = `
      INSERT INTO dealership_offers (
        tenant_id, brand_name, model_name, category, branch_name, city,
        target_cities, discount_percent, is_statewide, geofence_lat, geofence_lng, radius_km,
        title, benefit, description, highlights, code, valid_month, valid_till,
        badge, badge_color, image_url, whatsapp_number, whatsapp_msg, is_active, priority
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
      RETURNING *;
    `;

    const values = [
      tenantId,
      brand_name,
      model_name,
      category,
      branch_name,
      city,
      normalizedCities,
      discount_percent ? parseFloat(discount_percent) : null,
      Boolean(is_statewide || normalizedCities.includes('All Cities')),
      geofence_lat ? parseFloat(geofence_lat) : null,
      geofence_lng ? parseFloat(geofence_lng) : null,
      radius_km ? parseFloat(radius_km) : 50.0,
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
      target_cities = existing.target_cities,
      discount_percent = existing.discount_percent,
      is_statewide = existing.is_statewide,
      geofence_lat = existing.geofence_lat,
      geofence_lng = existing.geofence_lng,
      radius_km = existing.radius_km,
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
    const normalizedCities = Array.isArray(target_cities) && target_cities.length > 0
      ? target_cities
      : (city && city !== 'All Cities' ? city.split(',').map((c) => c.trim()).filter(Boolean) : existing.target_cities || ['All Cities']);

    const query = `
      UPDATE dealership_offers
      SET 
        brand_name = $1,
        model_name = $2,
        category = $3,
        branch_name = $4,
        city = $5,
        target_cities = $6,
        discount_percent = $7,
        is_statewide = $8,
        geofence_lat = $9,
        geofence_lng = $10,
        radius_km = $11,
        title = $12,
        benefit = $13,
        description = $14,
        highlights = $15::jsonb,
        code = $16,
        valid_month = $17,
        valid_till = $18,
        badge = $19,
        badge_color = $20,
        image_url = $21,
        whatsapp_number = $22,
        whatsapp_msg = $23,
        is_active = $24,
        priority = $25,
        updated_at = NOW()
      WHERE offer_id = $26 AND tenant_id = $27
      RETURNING *;
    `;

    const values = [
      brand_name,
      model_name,
      category,
      branch_name,
      city,
      normalizedCities,
      discount_percent != null && discount_percent !== '' ? parseFloat(discount_percent) : null,
      Boolean(is_statewide || normalizedCities.includes('All Cities')),
      geofence_lat ? parseFloat(geofence_lat) : null,
      geofence_lng ? parseFloat(geofence_lng) : null,
      radius_km ? parseFloat(radius_km) : 50.0,
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

