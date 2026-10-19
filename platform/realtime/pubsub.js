/**
 * Real-Time Rule Invalidation & SSE Broadcast Engine (< 500ms propagation)
 * 
 * Uses PostgreSQL LISTEN/NOTIFY ('loyalty_rule_published') to invalidate
 * local in-memory LRU rules caches across stateless instances, and broadcasts
 * Server-Sent Events (SSE) to connected browser clients.
 */

const { pool } = require('../../src/config/db');

class RealtimeRulePubSub {
  constructor() {
    this.cache = new Map(); // tenant_id -> { ruleset, version, etag, loaded_at }
    this.sseClients = new Set(); // Set of active SSE response streams
    this.pgClient = null;
    this.isListening = false;
  }

  /**
   * Initializes dedicated PostgreSQL LISTEN client.
   */
  async initializeListener() {
    if (this.isListening) return;

    try {
      this.pgClient = await pool.connect();
      await this.pgClient.query('LISTEN loyalty_rule_published;');
      this.isListening = true;

      this.pgClient.on('notification', (msg) => {
        if (msg.channel === 'loyalty_rule_published') {
          try {
            const payload = JSON.parse(msg.payload);
            this.handleRulePublishedEvent(payload);
          } catch (err) {
            console.error('[PubSub] Failed to parse notification payload:', err);
          }
        }
      });

      this.pgClient.on('error', (err) => {
        console.error('[PubSub] PG Listener client error:', err);
        this.isListening = false;
        setTimeout(() => this.initializeListener(), 5000);
      });

      console.log('📡 [RealtimeRulePubSub] PostgreSQL LISTEN loyalty_rule_published active.');
    } catch (err) {
      console.warn('[PubSub] Could not initialize LISTEN connection:', err.message);
      this.isListening = false;
    }
  }

  /**
   * Invalidate local cache and push updates via SSE.
   */
  handleRulePublishedEvent(eventPayload) {
    const { tenant_id, version_number } = eventPayload;
    console.log(`⚡ [RealtimePubSub] Invalidation event received for tenant '${tenant_id}' (v${version_number})`);

    // 1. Invalidate local in-memory cache
    if (tenant_id) {
      this.cache.delete(tenant_id);
    }

    // 2. Broadcast to all connected SSE clients
    const sseMessage = `data: ${JSON.stringify({
      type: 'RULESET_UPDATED',
      tenant_id,
      version: version_number,
      timestamp: new Date().toISOString(),
    })}\n\n`;

    for (const client of this.sseClients) {
      try {
        client.res.write(sseMessage);
      } catch (err) {
        this.sseClients.delete(client);
      }
    }
  }

  /**
   * Fetches active published ruleset for a tenant (cached in-memory).
   */
  async getActiveRuleset(tenant_id) {
    const cached = this.cache.get(tenant_id);
    if (cached) {
      return cached;
    }

    const res = await pool.query(
      `SELECT version_id, version_number, status, ruleset_payload, checksum, published_at, updated_at
       FROM tenant_loyalty_rule_versions
       WHERE tenant_id = $1 AND is_active = true AND status = 'published'
       ORDER BY version_number DESC
       LIMIT 1;`,
      [tenant_id]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    const etag = `W/"${tenant_id}-v${row.version_number}-${new Date(row.updated_at).getTime()}"`;

    const entry = {
      version_id: row.version_id,
      version_number: row.version_number,
      ruleset: row.ruleset_payload,
      checksum: row.checksum,
      published_at: row.published_at,
      etag,
      loaded_at: Date.now(),
    };

    this.cache.set(tenant_id, entry);
    return entry;
  }

  /**
   * Manually invalidate cache for a tenant.
   */
  invalidateCache(tenant_id) {
    this.cache.delete(tenant_id);
  }

  /**
   * SSE Stream Handler for frontend push updates.
   */
  handleSseStream(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders?.();

    const clientRef = { req, res, tenant_id: req.query.tenant_id || req.tenantId };
    this.sseClients.add(clientRef);

    // Initial ping
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

    req.on('close', () => {
      this.sseClients.delete(clientRef);
    });
  }
}

// Singleton instance
const pubSubInstance = new RealtimeRulePubSub();
pubSubInstance.initializeListener();

module.exports = pubSubInstance;
