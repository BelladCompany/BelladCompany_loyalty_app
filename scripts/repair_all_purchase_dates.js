const { pool } = require('../src/config/db');

function parseDateRobust(val) {
  if (val === null || val === undefined || val === '') return null;

  // 1. Excel serial date (e.g. 45508 or "45508.00011574074")
  const num = Number(val);
  if (!isNaN(num) && num >= 30000 && num <= 65000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = Math.round(num * 86400 * 1000);
    const d = new Date(excelEpoch.getTime() + ms);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }

  const str = String(val).trim();
  // 2. YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(str)) {
    const parts = str.split(/[-/.]/);
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    return isNaN(dateObj.getTime()) ? null : dateObj.toISOString().split('T')[0];
  }

  // 3. DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(str)) {
    const parts = str.split(/[-/.]/);
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);

    let day = p1;
    let month = p2;
    if (p2 > 12 && p1 <= 12) {
      day = p2;
      month = p1;
    }
    const dateObj = new Date(Date.UTC(y, month - 1, day));
    return isNaN(dateObj.getTime()) ? null : dateObj.toISOString().split('T')[0];
  }

  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback.toISOString().split('T')[0];
}

async function runRepair() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting full database purchase date & redemption eligibility repair...');
    await client.query('BEGIN');

    // 1. Remove any forfeiture points entries in points_ledger
    const delForfeits = await client.query(`
      DELETE FROM points_ledger WHERE type = 'expire';
    `);
    console.log(`✅ Removed ${delForfeits.rowCount} expired/forfeiture ledger entries (points never expire).`);

    // 2. Clear redemption_expires_at on all vehicles
    await client.query(`
      UPDATE vehicles SET redemption_expires_at = NULL;
    `);

    // 3. Fetch all vehicles with dms_invoice_date or purchase_date
    const res = await client.query(`
      SELECT vehicle_id, dms_invoice_date, purchase_date
      FROM vehicles;
    `);
    console.log(`📋 Scanning ${res.rows.length} vehicles...`);

    const now = new Date();
    let updatedDates = 0;
    let eligibleCount = 0;
    let lockedCount = 0;

    // Use batch updates for high performance
    const BATCH_SIZE = 1000;
    for (let i = 0; i < res.rows.length; i += BATCH_SIZE) {
      const chunk = res.rows.slice(i, i + BATCH_SIZE);
      const updates = [];

      for (const row of chunk) {
        let parsed = parseDateRobust(row.dms_invoice_date);
        if (!parsed && row.purchase_date) {
          parsed = row.purchase_date.toISOString().split('T')[0];
        }

        if (parsed) {
          const pDate = new Date(parsed);
          const eligDate = new Date(pDate);
          eligDate.setMonth(eligDate.getMonth() + 12);
          const status = now >= eligDate ? 'eligible' : 'locked';

          if (status === 'eligible') eligibleCount++;
          else lockedCount++;

          updates.push({
            id: row.vehicle_id,
            purchase_date: parsed,
            eligible_at: eligDate.toISOString(),
            status,
          });
          updatedDates++;
        }
      }

      if (updates.length > 0) {
        // Execute batch update using VALUES
        const values = updates.map((u, idx) =>
          `($${idx * 4 + 1}::int, $${idx * 4 + 2}::date, $${idx * 4 + 3}::timestamptz, $${idx * 4 + 4}::varchar)`
        ).join(', ');

        const flatParams = [];
        updates.forEach(u => {
          flatParams.push(u.id, u.purchase_date, u.eligible_at, u.status);
        });

        await client.query(`
          UPDATE vehicles AS v
          SET purchase_date = u.purchase_date,
              redemption_eligible_at = u.eligible_at,
              redemption_status = u.status,
              redemption_expires_at = NULL,
              updated_at = NOW()
          FROM (VALUES ${values}) AS u(id, purchase_date, eligible_at, status)
          WHERE v.vehicle_id = u.id;
        `, flatParams);
      }
    }

    await client.query('COMMIT');
    console.log(`\n🎉 Repair Complete!`);
    console.log(`- Vehicles Updated: ${updatedDates}`);
    console.log(`- Vehicles Now ELIGIBLE: ${eligibleCount}`);
    console.log(`- Vehicles LOCKED (<12 months): ${lockedCount}`);

    // Verify key test cases requested by user
    const verifySpecific = await pool.query(`
      SELECT c.customer_name, v.vehicle_id, v.model, v.purchase_date, v.dms_invoice_date, v.redemption_status, v.redemption_eligible_at, v.redemption_expires_at
      FROM customers c
      JOIN vehicles v ON c.customer_id = v.customer_id
      WHERE c.customer_name ILIKE '%ramesh%betageri%' 
         OR c.customer_name ILIKE '%megha%meharwade%' 
         OR c.customer_name ILIKE '%prajwal%wadekar%'
         OR c.customer_name ILIKE '%bharati%sanjay%meharwade%'
         OR c.customer_name ILIKE '%siddharth%c%meharwade%';
    `);

    console.log('\n🔍 Verification of specific customers:');
    console.table(verifySpecific.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Repair failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runRepair();
