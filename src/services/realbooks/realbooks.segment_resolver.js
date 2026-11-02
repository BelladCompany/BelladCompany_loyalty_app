const { pool } = require('../../config/db');
const env = require('../../config/env');

/**
 * RealBooks Segment Resolver Service
 * Dynamically resolves CID (Company ID) and SEGID (Segment ID) based on:
 * - Vehicle Model (e.g., Creta, HF Deluxe, 744, i20, Splendor)
 * - Brand (Hero, Hyundai, Swaraj, Claas, etc.)
 * - Dealership Firm (Bellad & Company, etc.)
 * - Branch / City (Hubli, Dharwad, Gadag, Haveri)
 * - Transaction Category ('sale' -> Showroom SR, 'service'/'accessories' -> Workshop WS)
 */
class RealBooksSegmentResolver {
  /**
   * Known brand model patterns for ultra-fast, resilient resolution
   */
  static BRAND_PATTERNS = {
    Hero: [
      'hero',
      'hf deluxe',
      'h f deluxe',
      'splendor',
      'splendor+',
      'passion',
      'passion+',
      'glamour',
      'pleasure',
      'pleasure+',
      'xpulse',
      'destini',
      'maestro',
      'xtreme',
      'xoom',
      'vida',
      'deluxe',
      'sup spl',
      'hf 100',
      'hf100',
    ],
    Hyundai: [
      'hyundai',
      'creta',
      'new creta',
      'verna',
      'new verna',
      'venue',
      'new venue',
      'i20',
      'all new i20',
      'i10',
      'grand i10',
      'aura',
      'alcazar',
      'tucson',
      'exter',
      'kona',
      'ioniq',
      'santro',
      'prime sd',
    ],
    Swaraj: [
      'swaraj',
      '744',
      '742',
      '855',
      '735',
      '724',
      '733',
      '963',
      'duravator',
      'tractor',
      'target',
    ],
    Claas: ['claas'],
    Sony: ['sony'],
    'Used Cars': ['used car', 'pre-owned', 'exchange', 'second hand'],
    'Corporate Sales': ['corporate', 'fleet', 'b2b'],
    'Customer Care': ['customer care', 'crm', 'support'],
  };

  /**
   * Helper to normalize strings for comparison
   */
  static normalize(str) {
    return (str || '').toString().trim().toLowerCase();
  }

  /**
   * Infer Brand from Model string
   */
  static inferBrandFromModel(model) {
    if (!model) return null;
    const normModel = this.normalize(model);

    for (const [brand, keywords] of Object.entries(this.BRAND_PATTERNS)) {
      for (const kw of keywords) {
        if (normModel.includes(kw) || kw.includes(normModel)) {
          return brand;
        }
      }
    }

    return null;
  }

  /**
   * Infer City from Branch name or City string
   */
  static inferCity(branchText = '') {
    const text = this.normalize(branchText);
    if (text.includes('dharwad')) return 'Dharwad';
    if (text.includes('gadag')) return 'Gadag';
    if (text.includes('haveri')) return 'Haveri';
    if (text.includes('chitradurga')) return 'Chitradurga';
    if (text.includes('bangalore') || text.includes('bengaluru')) return 'Bangalore';
    if (text.includes('hubli') || text.includes('hubballi')) return 'Hubli';
    return 'Hubli'; // Default main headquarters location
  }

  /**
   * Main Dynamic Resolution Method
   */
  static async resolveSegment({
    model = null,
    brand = null,
    firm = null,
    branch_id = null,
    branch_name = null,
    category = 'service',
    vehicle_id = null,
    customer_id = null,
    tenant_id = 'bellad_and_company',
  } = {}) {
    let resolvedModel = model;
    let resolvedBrand = brand;
    let resolvedFirm = firm || 'Bellad and Company';
    let resolvedCity = this.inferCity(branch_name || '');

    // 0. If model was passed, immediately try to infer brand from model
    if (!resolvedBrand && resolvedModel) {
      resolvedBrand = this.inferBrandFromModel(resolvedModel);
    }

    // 1. If vehicle_id is provided, look up vehicle record from DB
    if (vehicle_id && (!resolvedModel || !resolvedBrand)) {
      try {
        const vRes = await pool.query(
          `SELECT v.model, v.brand_name, v.firm_name, v.branch_name, b.branch_city, b.branch_name as b_name
           FROM vehicles v
           LEFT JOIN branches b ON v.branch_id = b.branch_id
           WHERE v.vehicle_id = $1 AND v.tenant_id = $2
           LIMIT 1;`,
          [parseInt(vehicle_id, 10), tenant_id]
        );

        if (vRes.rows.length > 0) {
          const v = vRes.rows[0];
          resolvedModel = resolvedModel || v.model;
          resolvedBrand = resolvedBrand || v.brand_name;
          resolvedFirm = resolvedFirm || v.firm_name;
          resolvedCity = resolvedCity || this.inferCity(v.branch_city || v.b_name || v.branch_name);
        }
      } catch (e) {
        console.warn('[RealBooksSegmentResolver] Vehicle lookup error:', e.message);
      }
    }

    // 2. If model AND brand are still missing, check customer's most recent vehicle from DB
    if (customer_id && (!resolvedModel && !resolvedBrand)) {
      try {
        const cvRes = await pool.query(
          `SELECT v.model, v.brand_name, v.firm_name, v.branch_name, b.branch_city, b.branch_name as b_name
           FROM vehicles v
           LEFT JOIN branches b ON v.branch_id = b.branch_id
           WHERE v.customer_id = $1 AND v.tenant_id = $2
           ORDER BY v.purchase_date DESC NULLS LAST, v.vehicle_id DESC
           LIMIT 1;`,
          [customer_id, tenant_id]
        );

        if (cvRes.rows.length > 0) {
          const cv = cvRes.rows[0];
          resolvedModel = resolvedModel || cv.model;
          resolvedBrand = resolvedBrand || cv.brand_name;
          resolvedFirm = resolvedFirm || cv.firm_name;
          resolvedCity = resolvedCity || this.inferCity(cv.branch_city || cv.b_name || cv.branch_name);
        }
      } catch (e) {
        console.warn('[RealBooksSegmentResolver] Customer vehicle lookup error:', e.message);
      }
    }

    // 3. If branch_id is provided, resolve branch details
    if (branch_id && (!resolvedCity || resolvedCity === 'Hubli')) {
      try {
        const bRes = await pool.query(
          `SELECT branch_name, branch_city FROM branches WHERE branch_id = $1 LIMIT 1;`,
          [parseInt(branch_id, 10)]
        );
        if (bRes.rows.length > 0) {
          resolvedCity = this.inferCity(bRes.rows[0].branch_city || bRes.rows[0].branch_name);
        }
      } catch (_) { }
    }

    // 4. Infer brand from model name if brand is not directly identified
    if (!resolvedBrand && resolvedModel) {
      resolvedBrand = this.inferBrandFromModel(resolvedModel);

      // Try database lookup if static dictionary didn't catch it
      if (!resolvedBrand) {
        try {
          const dbBrand = await pool.query(
            `SELECT b.brand_name
             FROM master_models m
             JOIN brands b ON m.brand_id = b.brand_id
             WHERE LOWER(m.name) = LOWER($1) OR $1 ILIKE '%' || m.name || '%'
             LIMIT 1;`,
            [resolvedModel]
          );
          if (dbBrand.rows.length > 0) {
            resolvedBrand = dbBrand.rows[0].brand_name;
          }
        } catch (_) { }
      }
    }

    // Standardize brand name
    if (resolvedBrand) {
      const bNorm = this.normalize(resolvedBrand);
      if (bNorm.includes('hero')) resolvedBrand = 'Hero';
      else if (bNorm.includes('hyundai')) resolvedBrand = 'Hyundai';
      else if (bNorm.includes('swaraj')) resolvedBrand = 'Swaraj';
      else if (bNorm.includes('claas')) resolvedBrand = 'Claas';
      else if (bNorm.includes('sony')) resolvedBrand = 'Sony';
    }

    // 5. Determine Transaction Category Type:
    // 'sale' -> Showroom (SR)
    // 'service', 'bodyshop', 'accessories', etc. -> Workshop (WS)
    const normCat = this.normalize(category);
    const targetCategoryType = normCat === 'sale' ? 'sale' : 'service';

    // 6. Query realbooks_segments for best match
    try {
      // Priority 1: Match Brand + City + Category Type (Transaction Allowed)
      if (resolvedBrand) {
        const matchQuery = await pool.query(
          `SELECT cid, segid, company_name, firm_name, brand, sname, name as segment_name, city, is_txn_allowed
           FROM realbooks_segments
           WHERE LOWER(brand) = LOWER($1)
             AND LOWER(city) = LOWER($2)
             AND (category_type = $3 OR category_type = 'all')
             AND is_txn_allowed = TRUE
           ORDER BY (category_type = $3) DESC, id ASC
           LIMIT 1;`,
          [resolvedBrand, resolvedCity, targetCategoryType]
        );

        if (matchQuery.rows.length > 0) {
          const row = matchQuery.rows[0];
          return {
            cid: row.cid,
            segid: row.segid,
            company_name: row.company_name,
            firm_name: row.firm_name,
            brand: row.brand,
            sname: row.sname,
            segment_name: row.segment_name,
            city: row.city,
            model_matched: resolvedModel,
            category_matched: targetCategoryType,
            resolution_source: 'brand_city_category_match',
          };
        }

        // Priority 2: Match Brand + Hubli (Main Hub) + Category Type
        const hubliFallback = await pool.query(
          `SELECT cid, segid, company_name, firm_name, brand, sname, name as segment_name, city, is_txn_allowed
           FROM realbooks_segments
           WHERE LOWER(brand) = LOWER($1)
             AND LOWER(city) = 'hubli'
             AND (category_type = $2 OR category_type = 'all')
             AND is_txn_allowed = TRUE
           ORDER BY (category_type = $2) DESC, id ASC
           LIMIT 1;`,
          [resolvedBrand, targetCategoryType]
        );

        if (hubliFallback.rows.length > 0) {
          const row = hubliFallback.rows[0];
          return {
            cid: row.cid,
            segid: row.segid,
            company_name: row.company_name,
            firm_name: row.firm_name,
            brand: row.brand,
            sname: row.sname,
            segment_name: row.segment_name,
            city: row.city,
            model_matched: resolvedModel,
            category_matched: targetCategoryType,
            resolution_source: 'brand_hubli_fallback',
          };
        }

        // Priority 3: Match Brand Parent Segment
        const brandParent = await pool.query(
          `SELECT cid, segid, company_name, firm_name, brand, sname, name as segment_name, city
           FROM realbooks_segments
           WHERE LOWER(brand) = LOWER($1)
           ORDER BY id ASC
           LIMIT 1;`,
          [resolvedBrand]
        );

        if (brandParent.rows.length > 0) {
          const row = brandParent.rows[0];
          return {
            cid: row.cid,
            segid: row.segid,
            company_name: row.company_name,
            firm_name: row.firm_name,
            brand: row.brand,
            sname: row.sname,
            segment_name: row.segment_name,
            city: row.city,
            model_matched: resolvedModel,
            category_matched: targetCategoryType,
            resolution_source: 'brand_parent_segment',
          };
        }
      }
    } catch (err) {
      console.warn('[RealBooksSegmentResolver] Segment resolution query error:', err.message);
    }

    // Default Fallback (Hero Hubli WS_Demo / Default from config)
    const defaultCid = env.realbooks?.cid || '6460';
    const defaultSegid = env.realbooks?.segid || '6476';

    return {
      cid: defaultCid,
      segid: defaultSegid,
      company_name: 'Bellad and Company_Demo',
      firm_name: 'Bellad and Company',
      brand: resolvedBrand || 'Hero',
      sname: 'HHWS_D',
      segment_name: 'Hero Hubli WS_Demo (Default Fallback)',
      city: resolvedCity || 'Hubli',
      model_matched: resolvedModel,
      category_matched: targetCategoryType,
      resolution_source: 'default_fallback',
    };
  }

  /**
   * Helper to fetch all segments grouped by Brand & Firm for UI or API inspection
   */
  static async getAllSegments(tenantId = 'bellad_and_company') {
    const res = await pool.query(
      `SELECT id, cid, segid, company_name, firm_name, brand, sname, name as segment_name,
              city, state, gstin, branch_ledger, is_txn_allowed, is_sub_segment_allowed,
              category_type, model_keywords
       FROM realbooks_segments
       ORDER BY cid, brand, city, id;`
    );
    return res.rows;
  }
}

module.exports = RealBooksSegmentResolver;
