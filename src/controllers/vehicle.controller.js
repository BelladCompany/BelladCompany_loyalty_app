const { pool } = require('../config/db');

// DB NOTE: vehicles.id -> vehicle_id, vin -> chassis_no, and registration_number no longer
// exists as a column at all. We keep accepting `registration_number` and `vin` on the API
// (either one satisfies "the vehicle identifier") and store whichever is provided into the
// single chassis_no column. Responses mirror chassis_no back into both `vin` and
// `registration_number` fields so existing frontend code keeps reading the same shape.
function resolveChassisNo(body) {
  return body.chassis_no || body.registration_number || body.vin || null;
}

class VehicleController {
  static async createVehicle(req, res, next) {
    try {
      const { customer_id, brand_id, model } = req.body;
      const chassisNo = resolveChassisNo(req.body);
      const tenantId = req.tenantId;

      if (!chassisNo) {
        return res.status(400).json({
          status: 'fail',
          error: 'A vehicle identifier is required (registration_number, vin, or chassis_no).',
        });
      }

      // Verify customer exists
      const custRes = await pool.query(
        `SELECT customer_id FROM customers WHERE customer_id = $1 AND tenant_id = $2;`,
        [customer_id, tenantId]
      );
      if (custRes.rows.length === 0) {
        return res.status(404).json({
          status: 'fail',
          error: `Customer not found with customer_id: '${customer_id}'`,
        });
      }

      const vehicleRes = await pool.query(
        `INSERT INTO vehicles (customer_id, brand_id, chassis_no, model, tenant_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING vehicle_id AS id, customer_id, brand_id, chassis_no AS registration_number,
                   chassis_no AS vin, model, tenant_id, created_at, updated_at;`,
        [customer_id, brand_id || null, chassisNo, model || null, tenantId]
      );

      res.status(201).json({
        status: 'success',
        message: 'Vehicle registered successfully.',
        data: vehicleRes.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  static async listVehicles(req, res, next) {
    try {
      const tenantId = req.tenantId;
      const customerId = req.query.customer_id;

      let query = `
        SELECT v.vehicle_id AS id, v.customer_id, v.brand_id, b.brand_name AS brand_name,
               v.chassis_no AS registration_number, v.chassis_no AS vin, v.model,
               v.tenant_id, v.created_at, v.updated_at
        FROM vehicles v
        LEFT JOIN brands b ON v.brand_id = b.brand_id
        WHERE v.tenant_id = $1
      `;
      const params = [tenantId];

      if (customerId) {
        query += ` AND v.customer_id = $2`;
        params.push(customerId);
      }

      query += ` ORDER BY v.created_at DESC;`;

      const resVehicles = await pool.query(query, params);

      res.status(200).json({
        status: 'success',
        results: resVehicles.rows.length,
        data: resVehicles.rows,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVehicle(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      const resVehicle = await pool.query(
        `SELECT v.vehicle_id AS id, v.customer_id, v.brand_id, b.brand_name AS brand_name,
                v.chassis_no AS registration_number, v.chassis_no AS vin, v.model,
                v.tenant_id, v.created_at, v.updated_at
         FROM vehicles v
         LEFT JOIN brands b ON v.brand_id = b.brand_id
         WHERE v.vehicle_id = $1 AND v.tenant_id = $2;`,
        [id, tenantId]
      );

      if (resVehicle.rows.length === 0) {
        return res.status(404).json({
          status: 'fail',
          error: `Vehicle not found with ID: ${id}`,
        });
      }

      res.status(200).json({
        status: 'success',
        data: resVehicle.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateVehicle(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      const { brand_id, model } = req.body;
      const chassisNo = resolveChassisNo(req.body);

      const fields = [];
      const values = [];
      let idx = 1;

      if (brand_id !== undefined) {
        fields.push(`brand_id = $${idx++}`);
        values.push(brand_id);
      }
      if (chassisNo) {
        fields.push(`chassis_no = $${idx++}`);
        values.push(chassisNo);
      }
      if (model !== undefined) {
        fields.push(`model = $${idx++}`);
        values.push(model);
      }

      if (fields.length === 0) {
        return res.status(400).json({ status: 'fail', error: 'No fields provided for update.' });
      }

      fields.push(`updated_at = NOW()`);
      values.push(id, tenantId);

      const updateRes = await pool.query(
        `UPDATE vehicles
         SET ${fields.join(', ')}
         WHERE vehicle_id = $${idx++} AND tenant_id = $${idx++}
         RETURNING vehicle_id AS id, customer_id, brand_id, chassis_no AS registration_number,
                   chassis_no AS vin, model, tenant_id, updated_at;`,
        values
      );

      if (updateRes.rows.length === 0) {
        return res.status(404).json({
          status: 'fail',
          error: `Vehicle not found with ID: ${id}`,
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Vehicle updated successfully.',
        data: updateRes.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteVehicle(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      const deleteRes = await pool.query(
        `DELETE FROM vehicles WHERE vehicle_id = $1 AND tenant_id = $2 RETURNING vehicle_id AS id;`,
        [id, tenantId]
      );

      if (deleteRes.rows.length === 0) {
        return res.status(404).json({
          status: 'fail',
          error: `Vehicle not found with ID: ${id}`,
        });
      }

      res.status(200).json({
        status: 'success',
        message: `Vehicle ${id} deleted successfully.`,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = VehicleController;
