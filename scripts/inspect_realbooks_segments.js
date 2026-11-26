const { pool } = require('../src/config/db');

async function run() {
  try {
    const res = await pool.query(`
      SELECT DISTINCT brand, cid, segid, company_name, city, category_type, name 
      FROM realbooks_segments 
      ORDER BY brand, city;
    `);
    console.table(res.rows);

    // Let's also check what Hero segments exist!
    const heroRes = await pool.query(`
      SELECT * FROM realbooks_segments WHERE LOWER(brand) LIKE '%hero%' OR LOWER(name) LIKE '%hero%';
    `);
    console.log('\nHero segments:');
    console.table(heroRes.rows);

    // Let's also check where "hero demo ws" is in the database!
    const demoRes = await pool.query(`
      SELECT * FROM realbooks_segments WHERE LOWER(name) LIKE '%demo%' OR LOWER(company_name) LIKE '%demo%';
    `);
    console.log('\nDemo segments:');
    console.table(demoRes.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
