const { pool } = require('../src/config/db');

async function testConflict() {
  try {
    const res = await pool.query(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'customer_phones';`
    );
    console.log('customer_phones indexes:', res.rows);

    const cRes = await pool.query(
      `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'customer_phones'::regclass;`
    );
    console.log('customer_phones constraints:', cRes.rows);

  } catch (err) {
    console.error('❌ Error stack:', err);
  } finally {
    await pool.end();
  }
}

testConflict();
