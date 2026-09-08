const { pool } = require('../config/db');

// DB NOTE: branches.id -> branch_id, name -> branch_name, address -> branch_city, and the
// `code` column no longer exists. We keep accepting `code` on the API for compatibility but
// it is not persisted; responses always return `code: null`.

class BranchController {
  static async createBranch(req, res, next) {
    try {
      const { name, address } = req.body;
      const tenantId = req.tenantId;

      const branchRes = await pool.query(
        `INSERT INTO branches (branch_name, branch_city, tenant_id)
         VALUES ($1, $2, $3)
         RETURNING branch_id AS id, branch_name AS name, NULL::text AS code, branch_city AS address,
                   tenant_id, created_at, updated_at;`,
        [name, address || null, tenantId]
      );

      res.status(201).json({
        status: 'success',
        message: 'Branch created successfully.',
        data: branchRes.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  static async listBranches(req, res, next) {
    try {
      const tenantId = req.tenantId;

      const branchesRes = await pool.query(
        `SELECT branch_id AS id, branch_name AS name, NULL::text AS code, branch_city AS address,
                tenant_id, created_at, updated_at
         FROM branches
         WHERE tenant_id = $1
         ORDER BY branch_id ASC;`,
        [tenantId]
      );

      res.status(200).json({
        status: 'success',
        results: branchesRes.rows.length,
        data: branchesRes.rows,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBranch(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      const branchRes = await pool.query(
        `SELECT branch_id AS id, branch_name AS name, NULL::text AS code, branch_city AS address,
                tenant_id, created_at, updated_at
         FROM branches
         WHERE branch_id = $1 AND tenant_id = $2;`,
        [id, tenantId]
      );

      if (branchRes.rows.length === 0) {
        return res.status(404).json({
          status: 'fail',
          error: `Branch not found with ID: ${id}`,
        });
      }

      res.status(200).json({
        status: 'success',
        data: branchRes.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateBranch(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      const { name, address } = req.body;

      const fields = [];
      const values = [];
      let idx = 1;

      if (name !== undefined) {
        fields.push(`branch_name = $${idx++}`);
        values.push(name);
      }
      if (address !== undefined) {
        fields.push(`branch_city = $${idx++}`);
        values.push(address);
      }

      if (fields.length === 0) {
        return res.status(400).json({ status: 'fail', error: 'No fields provided for update.' });
      }

      fields.push(`updated_at = NOW()`);
      values.push(id, tenantId);

      const updateRes = await pool.query(
        `UPDATE branches
         SET ${fields.join(', ')}
         WHERE branch_id = $${idx++} AND tenant_id = $${idx++}
         RETURNING branch_id AS id, branch_name AS name, NULL::text AS code, branch_city AS address,
                   tenant_id, updated_at;`,
        values
      );

      if (updateRes.rows.length === 0) {
        return res.status(404).json({
          status: 'fail',
          error: `Branch not found with ID: ${id}`,
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Branch updated successfully.',
        data: updateRes.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteBranch(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      const deleteRes = await pool.query(
        `DELETE FROM branches WHERE branch_id = $1 AND tenant_id = $2 RETURNING branch_id AS id;`,
        [id, tenantId]
      );

      if (deleteRes.rows.length === 0) {
        return res.status(404).json({
          status: 'fail',
          error: `Branch not found with ID: ${id}`,
        });
      }

      res.status(200).json({
        status: 'success',
        message: `Branch ${id} deleted successfully.`,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BranchController;
