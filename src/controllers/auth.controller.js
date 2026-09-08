const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const env = require('../config/env');

class AuthController {
  static async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const tenantId = req.headers['x-tenant-id'] || env.defaultTenantId;

      const userRes = await pool.query(
        `SELECT user_id, username, password_hash, role, branch_id, tenant_id
         FROM users
         WHERE username = $1 AND tenant_id = $2;`,
        [username, tenantId]
      );

      if (userRes.rows.length === 0) {
        return res.status(401).json({
          status: 'fail',
          error: 'Invalid username or password.',
        });
      }

      const user = userRes.rows[0];
      let isMatch = false;

      // Safe password verification: handle standard bcrypt hash or plain-text fallback
      if (user.password_hash && (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$'))) {
        isMatch = await bcrypt.compare(password, user.password_hash);
      } else if (user.password_hash === password) {
        // Plain text match fallback (e.g. if manually inserted into DB)
        isMatch = true;
        // Auto-upgrade password hash in DB to proper bcrypt hash
        const newHash = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2;', [newHash, user.user_id]);
      }

      if (!isMatch) {
        return res.status(401).json({
          status: 'fail',
          error: 'Invalid username or password.',
        });
      }

      const tokenPayload = {
        id: user.user_id,
        username: user.username,
        role: user.role,
        branch_id: user.branch_id,
        tenant_id: user.tenant_id,
      };

      const token = jwt.sign(tokenPayload, env.jwtSecret, {
        expiresIn: env.jwtExpiresIn,
      });

      res.status(200).json({
        status: 'success',
        data: {
          token,
          user: {
            id: user.user_id,
            username: user.username,
            role: user.role,
            branch_id: user.branch_id,
            tenant_id: user.tenant_id,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async register(req, res, next) {
    try {
      const { username, password, role, branch_id } = req.body;
      const tenantId = req.headers['x-tenant-id'] || env.defaultTenantId;

      const passwordHash = await bcrypt.hash(password, 10);

      const userRes = await pool.query(
        `INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING user_id, username, role, branch_id, tenant_id, created_at;`,
        [username, passwordHash, role, branch_id || null, tenantId]
      );

      res.status(201).json({
        status: 'success',
        message: 'User created successfully.',
        data: userRes.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req, res, next) {
    try {
      res.status(200).json({
        status: 'success',
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
