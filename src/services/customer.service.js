const { pool } = require('../config/db');

class CustomerService {
  /**
   * Creates a new customer with auto-generated BAC-100001 ID and links initial phone numbers
   *
   * DB NOTE: customers.name -> customers.customer_name, customers.email column no longer
   * exists in the live schema. We keep accepting/returning `email` on the API for backward
   * compatibility, but it is not persisted (always returned as null).
   */
  static async createCustomer({ name, email, phone_numbers, vehicle, opening_points, created_by, tenant_id }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert customer with system-generated BAC-100001 ID via sequence default
      const customerRes = await client.query(
        `INSERT INTO customers (customer_name, tenant_id)
         VALUES ($1, $2)
         RETURNING customer_id, customer_name AS name, NULL::text AS email, tenant_id, created_at, updated_at;`,
        [name, tenant_id]
      );

      const customer = customerRes.rows[0];

      // 2. Insert phone numbers linked to the new customer_id
      // DB NOTE: customer_phones.id -> phone_id, is_primary -> is_verified, created_at -> added_at
      const phoneRows = [];
      for (let i = 0; i < phone_numbers.length; i++) {
        const isPrimary = i === 0;
        const phoneRes = await client.query(
          `INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
           VALUES ($1, $2, $3, $4)
           RETURNING phone_id AS id, customer_id, phone_number, is_verified AS is_primary, added_at AS created_at;`,
          [customer.customer_id, phone_numbers[i], isPrimary, tenant_id]
        );
        phoneRows.push(phoneRes.rows[0]);
      }

      // 3. Optionally insert vehicle record
      let vehicleRow = null;
      if (vehicle && (vehicle.registration_number || vehicle.chassis_no || vehicle.vin)) {
        const chassisNo = vehicle.registration_number || vehicle.chassis_no || vehicle.vin;
        // ex_showroom_price stored in paise (rupees * 100) for integer precision
        const exShowroomPaise = vehicle.ex_showroom_price
          ? Math.round(Number(vehicle.ex_showroom_price) * 100)
          : null;

        const vehRes = await client.query(
          `INSERT INTO vehicles (
             customer_id, brand_id, chassis_no, model,
             purchase_date, ex_showroom_price, vehicle_city, tenant_id
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING vehicle_id AS id, chassis_no AS registration_number, chassis_no AS vin, model,
                     purchase_date, ex_showroom_price, vehicle_city, created_at;`,
          [
            customer.customer_id,
            vehicle.brand_id || null,
            chassisNo,
            vehicle.model || null,
            vehicle.purchase_date || null,
            exShowroomPaise,
            vehicle.vehicle_city || null,
            tenant_id,
          ]
        );
        vehicleRow = vehRes.rows[0];
      }

      // 4. Optionally record opening points balance as a ledger entry
      const openingPts = parseInt(opening_points || '0', 10);
      if (openingPts > 0) {
        // Requires a branch_id — use the first available branch for this tenant as a fallback
        const branchRes = await client.query(
          `SELECT branch_id FROM branches WHERE tenant_id = $1 ORDER BY branch_id ASC LIMIT 1;`,
          [tenant_id]
        );
        const branchId = branchRes.rows[0]?.branch_id || null;

        await client.query(
          `INSERT INTO points_ledger (
             customer_id, branch_id, type, points, source_ref, cashier_id, tenant_id
           )
           VALUES ($1, $2, 'earn_sale', $3, $4, $5, $6);`,
          [
            customer.customer_id,
            branchId,
            openingPts,
            'Opening balance assigned at customer registration',
            created_by || null,
            tenant_id,
          ]
        );

        // Also upsert customer_tier_snapshot
        await client.query(
          `INSERT INTO customer_tier_snapshot (customer_id, current_tier, lifetime_points, tenant_id, updated_at)
           VALUES ($1, 'Silver', $2, $3, NOW())
           ON CONFLICT (customer_id) DO UPDATE
             SET lifetime_points = EXCLUDED.lifetime_points, updated_at = NOW();`,
          [customer.customer_id, openingPts, tenant_id]
        );
      }

      await client.query('COMMIT');

      return {
        ...customer,
        phones: phoneRows,
        vehicles: vehicleRow ? [vehicleRow] : [],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves a full customer profile with all linked phones and vehicles
   */
  static async getCustomerById(customerId, tenantId) {
    const customerRes = await pool.query(
      `SELECT customer_id, customer_name AS name, NULL::text AS email, tenant_id, created_at, updated_at
       FROM customers
       WHERE customer_id = $1 AND tenant_id = $2;`,
      [customerId, tenantId]
    );

    if (customerRes.rows.length === 0) {
      return null;
    }

    const customer = customerRes.rows[0];

    const phonesRes = await pool.query(
      `SELECT phone_id AS id, phone_number, is_verified AS is_primary, added_at AS created_at
       FROM customer_phones
       WHERE customer_id = $1 AND tenant_id = $2
       ORDER BY is_verified DESC, phone_id ASC;`,
      [customerId, tenantId]
    );

    // DB NOTE: vehicles.id -> vehicle_id, vin -> chassis_no, registration_number column no
    // longer exists at all; chassis_no is mirrored into both `vin` and `registration_number`
    // in the API response so existing frontend code keeps working.
    const vehiclesRes = await pool.query(
      `SELECT v.vehicle_id AS id, v.brand_id, b.brand_name AS brand_name,
              v.chassis_no AS registration_number, v.chassis_no AS vin, v.chassis_no,
              v.model, v.purchase_date, v.ex_showroom_price, v.vehicle_city, v.created_at
       FROM vehicles v
       LEFT JOIN brands b ON v.brand_id = b.brand_id
       WHERE v.customer_id = $1 AND v.tenant_id = $2
       ORDER BY v.vehicle_id ASC;`,
      [customerId, tenantId]
    );

    return {
      ...customer,
      phones: phonesRes.rows,
      vehicles: vehiclesRes.rows,
    };
  }

  /**
   * Lists customers with pagination
   */
  static async listCustomers(tenantId, limit = 20, offset = 0) {
    const res = await pool.query(
      `SELECT c.customer_id, c.customer_name AS name, NULL::text AS email, c.tenant_id, c.created_at,
              COALESCE(
                json_agg(
                  json_build_object('id', cp.phone_id, 'phone_number', cp.phone_number, 'is_primary', cp.is_verified)
                ) FILTER (WHERE cp.phone_id IS NOT NULL), '[]'
              ) as phones
       FROM customers c
       LEFT JOIN customer_phones cp ON c.customer_id = cp.customer_id AND cp.tenant_id = c.tenant_id
       WHERE c.tenant_id = $1
       GROUP BY c.customer_id
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3;`,
      [tenantId, limit, offset]
    );

    return res.rows;
  }

  /**
   * Updates basic customer info (name, email)
   * DB NOTE: email is no longer persisted (column removed); the value is accepted for API
   * compatibility but silently ignored.
   */
  static async updateCustomer(customerId, { name, email }, tenantId) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`customer_name = $${idx++}`);
      values.push(name);
    }

    if (fields.length === 0) {
      return this.getCustomerById(customerId, tenantId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(customerId, tenantId);

    const res = await pool.query(
      `UPDATE customers
       SET ${fields.join(', ')}
       WHERE customer_id = $${idx++} AND tenant_id = $${idx++}
       RETURNING customer_id, customer_name AS name, NULL::text AS email, tenant_id, created_at, updated_at;`,
      values
    );

    if (res.rows.length === 0) return null;
    return this.getCustomerById(customerId, tenantId);
  }

  /**
   * Adds a new phone number to an existing customer
   */
  static async addPhone(customerId, { phone_number, is_primary = false }, tenantId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify customer exists
      const custCheck = await client.query(
        `SELECT customer_id FROM customers WHERE customer_id = $1 AND tenant_id = $2;`,
        [customerId, tenantId]
      );
      if (custCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      if (is_primary) {
        await client.query(
          `UPDATE customer_phones SET is_verified = FALSE WHERE customer_id = $1 AND tenant_id = $2;`,
          [customerId, tenantId]
        );
      }

      const res = await client.query(
        `INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
         VALUES ($1, $2, $3, $4)
         RETURNING phone_id AS id, customer_id, phone_number, is_verified AS is_primary, added_at AS created_at;`,
        [customerId, phone_number, is_primary, tenantId]
      );

      await client.query('COMMIT');
      return res.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Deletes a phone number from a customer
   */
  static async removePhone(customerId, phoneId, tenantId) {
    const res = await pool.query(
      `DELETE FROM customer_phones
       WHERE phone_id = $1 AND customer_id = $2 AND tenant_id = $3
       RETURNING phone_id AS id;`,
      [phoneId, customerId, tenantId]
    );
    return res.rowCount > 0;
  }

  /**
   * Deletes customer (admin only)
   */
  static async deleteCustomer(customerId, tenantId) {
    const res = await pool.query(
      `DELETE FROM customers WHERE customer_id = $1 AND tenant_id = $2 RETURNING customer_id;`,
      [customerId, tenantId]
    );
    return res.rowCount > 0;
  }
}

module.exports = CustomerService;
