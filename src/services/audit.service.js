const { pool } = require('../config/db');

class AuditLogService {
  /**
   * Logs an audit record for points adjustment, merge, redemption, or general system events
   * @param {Object} params
   * @param {string} params.action - Event action name
   * @param {string} params.entity_type - Resource type (customer, points_ledger, redemption, merge)
   * @param {string} params.entity_id - Key identifier (e.g. customer_id)
   * @param {number|null} [params.actor_user_id] - User ID of actor initiating change
   * @param {Object|null} [params.before_values] - State snapshot before action
   * @param {Object|null} [params.after_values] - State snapshot after action
   * @param {Object|null} [params.metadata] - Additional contextual details
   * @param {string} [params.tenant_id] - Tenant ID
   * @param {Object|null} [params.client] - Optional active DB transaction client
   */
  static async logEvent({
    action,
    entity_type,
    entity_id,
    actor_user_id = null,
    before_values = null,
    after_values = null,
    metadata = null,
    tenant_id = 'BAC-MAIN',
    client = null,
  }) {
    const dbClient = client || pool;

    const afterObj = after_values || {};
    const combinedAfter = metadata ? { ...afterObj, metadata } : afterObj;

    const res = await dbClient.query(
      `INSERT INTO audit_log (
         action, entity_type, entity_id, actor_user_id,
         before_json, after_json, tenant_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING audit_id AS id, action, entity_type, entity_id, actor_user_id, created_at;`,
      [
        action,
        entity_type,
        entity_id,
        actor_user_id || null,
        before_values ? JSON.stringify(before_values) : null,
        combinedAfter ? JSON.stringify(combinedAfter) : null,
        tenant_id || 'BAC-MAIN',
      ]
    );

    return res.rows[0];
  }

  /**
   * List audit log history for a specific customer or entity
   */
  static async getEntityAuditLogs(entityId, tenantId, limit = 50, offset = 0) {
    const res = await pool.query(
      `SELECT al.*, u.username AS actor_username, u.role AS actor_role
       FROM audit_log al
       LEFT JOIN users u ON al.actor_user_id = u.user_id
       WHERE al.entity_id = $1 AND al.tenant_id = $2
       ORDER BY al.created_at DESC
       LIMIT $3 OFFSET $4;`,
      [entityId, tenantId, limit, offset]
    );
    return res.rows;
  }
}

module.exports = AuditLogService;
