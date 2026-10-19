/**
 * Cashier Invite & Management Service
 * automobile-loyalty-backend
 * 
 * Role: Senior Full-Stack Engineer / Principal Architect
 * Purpose: Generates tokenized invitation links for cashiers (invitation link valid for 48h),
 *          validates tokenized invites, and completes self-service signup.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

class CashierInviteService {
  /**
   * Generates a 48-hour tokenized invitation link for a cashier.
   */
  static async createInvite({ tenant_id, branch_id, phone, role = 'cashier', created_by, client = pool }) {
    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const createdByStr = created_by != null ? String(created_by) : null;

    const res = await client.query(
      `INSERT INTO user_invites (
        tenant_id, branch_id, phone, role, token_hash, expires_at, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING invite_id, tenant_id, branch_id, phone, role, expires_at, created_at;`,
      [tenant_id, String(branch_id), phone, role, tokenHash, expiresAt, createdByStr]
    );

    const invite = res.rows[0];
    const inviteUrl = `/invite/accept?token=${token}&tenant=${tenant_id}`;

    return {
      invite,
      token,
      invite_url: inviteUrl,
    };
  }

  /**
   * Validates a cashier invite token.
   */
  static async validateInviteToken(token, tenant_id, client = pool) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const res = await client.query(
      `SELECT invite_id, tenant_id, branch_id, phone, role, expires_at, used_at
       FROM user_invites
       WHERE token_hash = $1 AND tenant_id = $2;`,
      [tokenHash, tenant_id]
    );

    if (res.rows.length === 0) {
      throw { statusCode: 404, message: 'Invalid or expired invitation token.' };
    }

    const invite = res.rows[0];

    if (invite.used_at) {
      throw { statusCode: 400, message: 'This invitation token has already been used.' };
    }

    if (new Date(invite.expires_at) < new Date()) {
      throw { statusCode: 400, message: 'This invitation token has expired (validity 48 hours).' };
    }

    return invite;
  }

  /**
   * Accepts invitation and creates user account.
   */
  static async acceptInvite({ token, tenant_id, username, password, client = pool }) {
    const invite = await this.validateInviteToken(token, tenant_id, client);

    const passwordHash = await bcrypt.hash(password, 10);
    const branchIdNum = parseInt(invite.branch_id, 10) || null;

    // 1. Create user account
    const userRes = await client.query(
      `INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, username, role, branch_id, tenant_id, created_at;`,
      [username, passwordHash, invite.role, branchIdNum, tenant_id]
    );

    // 2. Mark invite as used
    await client.query(
      `UPDATE user_invites SET used_at = NOW() WHERE invite_id = $1;`,
      [invite.invite_id]
    );

    return userRes.rows[0];
  }
}

module.exports = CashierInviteService;
