const { pool } = require('../config/db');

class AuditLogService {
  static _columns = null;

  /**
   * Logs an audit record for points adjustment, merge, redemption, or general system events
   * Dynamically adapts to columns (before_values vs before_json, id vs audit_id) so it runs
   * reliably across local, Render, and Vercel environments.
   *
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
    tenant_id = 'bellad_and_company',
    client = null,
  }) {
    const dbClient = client || pool;

    try {
      if (!AuditLogService._columns) {
        const colsRes = await dbClient.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_log';`
        );
        AuditLogService._columns = new Set(colsRes.rows.map((r) => r.column_name));
      }
      const cols = AuditLogService._columns;

      const insertCols = ['action', 'entity_type', 'entity_id', 'tenant_id'];
      const insertVals = [action, entity_type, String(entity_id), tenant_id || 'bellad_and_company'];

      if (cols.has('actor_user_id')) {
        insertCols.push('actor_user_id');
        insertVals.push(actor_user_id ? parseInt(actor_user_id, 10) : null);
      }

      const beforeStr = before_values ? JSON.stringify(before_values) : null;
      if (cols.has('before_json')) {
        insertCols.push('before_json');
        insertVals.push(beforeStr);
      }
      if (cols.has('before_values')) {
        insertCols.push('before_values');
        insertVals.push(beforeStr);
      }

      const afterObj = after_values || {};
      const combinedAfter = metadata ? { ...afterObj, metadata } : afterObj;
      const afterStr = combinedAfter ? JSON.stringify(combinedAfter) : null;

      if (cols.has('after_json')) {
        insertCols.push('after_json');
        insertVals.push(afterStr);
      }
      if (cols.has('after_values')) {
        insertCols.push('after_values');
        insertVals.push(afterStr);
      }

      if (cols.has('metadata')) {
        insertCols.push('metadata');
        insertVals.push(metadata ? JSON.stringify(metadata) : null);
      }

      const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(', ');
      const pkey = cols.has('audit_id') ? 'audit_id' : 'id';

      const res = await dbClient.query(
        `INSERT INTO audit_log (${insertCols.join(', ')})
         VALUES (${placeholders})
         RETURNING ${pkey} AS id, action, entity_type, entity_id, created_at;`,
        insertVals
      );

      return res.rows[0];
    } catch (err) {
      // Non-fatal warning: never abort financial transaction due to secondary audit log failure
      console.warn(`[AuditLogService] Warning: Could not write audit log entry (${action}):`, err.message);
      return { id: null, action, entity_type, entity_id, warning: err.message };
    }
  }

  /**
   * List audit log history for a specific customer or entity
   */
  static async getEntityAuditLogs(entityId, tenantId, limit = 50, offset = 0) {
    try {
      const res = await pool.query(
        `SELECT al.*, 
                COALESCE(al.before_json, al.before_values) AS before_values,
                COALESCE(al.after_json, al.after_values) AS after_values,
                u.username AS actor_username, u.role AS actor_role
         FROM audit_log al
         LEFT JOIN users u ON al.actor_user_id = u.user_id
         WHERE al.entity_id = $1 AND al.tenant_id = $2
         ORDER BY al.created_at DESC
         LIMIT $3 OFFSET $4;`,
        [entityId, tenantId, limit, offset]
      );
      return res.rows;
    } catch (err) {
      console.warn('[AuditLogService] Warning in getEntityAuditLogs:', err.message);
      return [];
    }
  }
}

module.exports = AuditLogService;
