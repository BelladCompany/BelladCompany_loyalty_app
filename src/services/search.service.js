const { pool } = require('../config/db');
const CustomerService = require('./customer.service');

class SearchService {
  /**
   * Search by phone number (exact or prefix) resolving via customer_phones to owning customer_id
   */
  static async searchByPhone(phoneQuery, tenantId) {
    const cleanPhone = phoneQuery.trim();

    const phoneRes = await pool.query(
      `SELECT DISTINCT customer_id
       FROM customer_phones
       WHERE tenant_id = $1 AND (phone_number = $2 OR phone_number LIKE $3)
       LIMIT 20;`,
      [tenantId, cleanPhone, `%${cleanPhone}%`]
    );

    if (phoneRes.rows.length === 0) {
      return [];
    }

    const customers = [];
    for (const row of phoneRes.rows) {
      const fullCustomer = await CustomerService.getCustomerById(row.customer_id, tenantId);
      if (fullCustomer) {
        customers.push(fullCustomer);
      }
    }

    return customers;
  }

  /**
   * Search by vehicle identifier resolving to owning customer_id.
   * DB NOTE: the live `vehicles` table has no registration_number column at all (and no
   * equivalent under another name) - only `chassis_no` identifies a vehicle. We search that
   * single column; the API/search UI label ("Vehicle Reg") now effectively matches on chassis
   * number instead.
   */
  static async searchByVehicle(vehicleQuery, tenantId) {
    const cleanReg = vehicleQuery.trim();

    const vehRes = await pool.query(
      `SELECT DISTINCT customer_id
       FROM vehicles
       WHERE tenant_id = $1 AND chassis_no ILIKE $2
       LIMIT 20;`,
      [tenantId, `%${cleanReg}%`]
    );

    if (vehRes.rows.length === 0) {
      return [];
    }

    const customers = [];
    for (const row of vehRes.rows) {
      const fullCustomer = await CustomerService.getCustomerById(row.customer_id, tenantId);
      if (fullCustomer) {
        customers.push(fullCustomer);
      }
    }

    return customers;
  }

  /**
   * Search by name using PostgreSQL pg_trgm fuzzy matching
   */
  static async searchByName(nameQuery, tenantId, limit = 20, offset = 0) {
    const cleanName = nameQuery.trim();

    const res = await pool.query(
      `SELECT c.customer_id, c.customer_name AS name, NULL::text AS email, c.tenant_id, c.created_at,
          CASE
            WHEN c.customer_name ILIKE $3 THEN 1.0
            ELSE SIMILARITY(c.customer_name, $2)
          END AS match_score,
          COALESCE(
            json_agg(
              json_build_object('id', cp.phone_id, 'phone_number', cp.phone_number, 'is_primary', cp.is_verified)
            ) FILTER (WHERE cp.phone_id IS NOT NULL), '[]'
          ) as phones,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object('id', v.vehicle_id, 'registration_number', v.chassis_no, 'vin', v.chassis_no, 'model', v.model)
              )
              FROM vehicles v
              WHERE v.customer_id = c.customer_id AND v.tenant_id = c.tenant_id
            ), '[]'
          ) as vehicles
   FROM customers c
   LEFT JOIN customer_phones cp ON c.customer_id = cp.customer_id AND cp.tenant_id = c.tenant_id
   WHERE c.tenant_id = $1 
     AND (c.customer_name ILIKE $3 OR c.customer_name % $2 OR SIMILARITY(c.customer_name, $2) > 0.3)
   GROUP BY c.customer_id
   ORDER BY match_score DESC, c.customer_name ASC
   LIMIT $4 OFFSET $5;`,
      [tenantId, cleanName, `%${cleanName}%`, limit, offset]
    );

    return res.rows;
  }

  /**
   * Unified search across phone, vehicle chassis number, BAC- customer ID, and customer name
   */
  static async searchUnified(query, tenantId, limit = 20, offset = 0) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    // 1. Check if direct BAC customer ID
    if (cleanQuery.toUpperCase().startsWith('BAC-')) {
      const directCust = await CustomerService.getCustomerById(cleanQuery.toUpperCase(), tenantId);
      if (directCust) return [directCust];
    }

    // 2. Check if numeric digits (likely phone search)
    const isNumericOrPhone = /^\+?[0-9]{4,15}$/.test(cleanQuery.replace(/\s+/g, ''));
    if (isNumericOrPhone) {
      const phoneResults = await this.searchByPhone(cleanQuery.replace(/\s+/g, ''), tenantId);
      if (phoneResults.length > 0) return phoneResults;
    }

    // 3. Check if vehicle chassis number pattern
    const vehicleResults = await this.searchByVehicle(cleanQuery, tenantId);
    if (vehicleResults.length > 0) {
      return vehicleResults;
    }

    // 4. Fuzzy search by name using pg_trgm
    return this.searchByName(cleanQuery, tenantId, limit, offset);
  }
}

module.exports = SearchService;
