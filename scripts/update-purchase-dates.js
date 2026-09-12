// scripts/update-purchase-dates.js
const { pool } = require('../src/config/db');

function parseDmsDate(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
    const parts = trimmed.split('/');
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (p1 > 12) {
      // DD/MM/YYYY
      const d = new Date(y, p2 - 1, p1);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    }
    // MM/DD/YYYY
    const d = new Date(y, p1 - 1, p2);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

async function updatePurchaseDates() {
  const client = await pool.connect();
  try {
    console.log('Fetching vehicles with dms_invoice_date...');
    const res = await client.query(
      `SELECT vehicle_id, dms_invoice_date, purchase_date FROM vehicles WHERE dms_invoice_date IS NOT NULL AND dms_invoice_date != '';`
    );

    console.log(`Found ${res.rows.length} vehicles with DMS invoice dates.`);

    let updatedCount = 0;
    for (const v of res.rows) {
      const parsedDateStr = parseDmsDate(v.dms_invoice_date);
      if (parsedDateStr) {
        await client.query(
          `UPDATE vehicles
           SET purchase_date = $1,
               redemption_eligible_at = COALESCE(redemption_eligible_at, ($1::date + INTERVAL '12 months')::TIMESTAMPTZ),
               redemption_expires_at  = COALESCE(redemption_expires_at, ($1::date + INTERVAL '24 months')::TIMESTAMPTZ)
           WHERE vehicle_id = $2;`,
          [parsedDateStr, v.vehicle_id]
        );
        updatedCount++;
      }
    }

    console.log(`✅ Updated purchase_date for ${updatedCount} vehicles.`);
  } catch (err) {
    console.error('❌ Failed to update purchase dates:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

updatePurchaseDates();
