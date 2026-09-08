const { pool } = require('../config/db');

// DB NOTE: brands.id -> brand_id, name -> brand_name, and the `code` column no longer exists
// (a new, unrelated `model` column exists instead but isn't used by this app). We keep
// accepting `code` on the API for compatibility but it is not persisted; responses always
// return `code: null`.

class BrandController {
  static async createBrand(req, res, next) {
    try {
      const { name } = req.body;
      const tenantId = req.tenantId;

      const brandRes = await pool.query(
        `INSERT INTO brands (brand_name, tenant_id)
         VALUES ($1, $2)
         RETURNING brand_id AS id, brand_name AS name, NULL::text AS code, tenant_id, created_at, updated_at;`,
        [name, tenantId]
      );

      res.status(201).json({
        status: 'success',
        message: 'Brand created successfully.',
        data: brandRes.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  static async listBrands(req, res, next) {
    try {
      const tenantId = req.tenantId;

      const brandsRes = await pool.query(
        `SELECT brand_id AS id, brand_name AS name, NULL::text AS code, tenant_id, created_at, updated_at
         FROM brands
         WHERE tenant_id = $1
         ORDER BY brand_id ASC;`,
        [tenantId]
      );

      res.status(200).json({
        status: 'success',
        results: brandsRes.rows.length,
        data: brandsRes.rows,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBrand(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      const brandRes = await pool.query(
        `SELECT brand_id AS id, brand_name AS name, NULL::text AS code, tenant_id, created_at, updated_at
         FROM brands
         WHERE brand_id = $1 AND tenant_id = $2;`,
        [id, tenantId]
      );

      if (brandRes.rows.length === 0) {
        return res.status(404).json({
          status: 'fail',
          error: `Brand not found with ID: ${id}`,
        });
      }

      res.status(200).json({
        status: 'success',
        data: brandRes.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateBrand(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      const { name } = req.body;

      const fields = [];
      const values = [];
      let idx = 1;

      if (name !== undefined) {
        fields.push(`brand_name = $${idx++}`);
        values.push(name);
      }

      if (fields.length === 0) {
        return res.status(400).json({ status: 'fail', error: 'No fields provided for update.' });
      }

      fields.push(`updated_at = NOW()`);
      values.push(id, tenantId);

      const updateRes = await pool.query(
        `UPDATE brands
         SET ${fields.join(', ')}
         WHERE brand_id = $${idx++} AND tenant_id = $${idx++}
         RETURNING brand_id AS id, brand_name AS name, NULL::text AS code, tenant_id, updated_at;`,
        values
      );

      if (updateRes.rows.length === 0) {
        return res.status(404).json({
          status: 'fail',
          error: `Brand not found with ID: ${id}`,
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Brand updated successfully.',
        data: updateRes.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteBrand(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      const deleteRes = await pool.query(
        `DELETE FROM brands WHERE brand_id = $1 AND tenant_id = $2 RETURNING brand_id AS id;`,
        [id, tenantId]
      );

      if (deleteRes.rows.length === 0) {
        return res.status(404).json({
          status: 'fail',
          error: `Brand not found with ID: ${id}`,
        });
      }

      res.status(200).json({
        status: 'success',
        message: `Brand ${id} deleted successfully.`,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BrandController;
