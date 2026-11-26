const { pool } = require('../src/config/db');

async function run() {
  try {
    const res = await pool.query(`
      SELECT sync_id, entity_type, entity_id, api_status, cid, segid, segment_name, created_at, request_payload, last_error
      FROM realbooks_sync_log
      ORDER BY sync_id DESC
      LIMIT 25;
    `);
    console.log(`Last 25 entries in realbooks_sync_log:`);
    console.table(res.rows.map(r => ({
      sync_id: r.sync_id,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      api_status: r.api_status,
      cid: r.cid,
      segid: r.segid,
      segment_name: r.segment_name,
      last_error: r.last_error?.slice(0, 40)
    })));

    // Print full request_payload for the latest 3 logs
    console.log('\nLatest 3 request payloads:');
    for (let i = 0; i < Math.min(3, res.rows.length); i++) {
      console.log(`Log ${res.rows[i].sync_id}:`, res.rows[i].request_payload);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
