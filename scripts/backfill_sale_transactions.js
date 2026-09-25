/**
 * Script to backfill sale_transactions from points_ledger reason_text / vehicles
 * Ensures all vehicle sales have a corresponding sale_transactions row with complete discount details.
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function backfill() {
  console.log('🚀 [Backfill] Starting sale_transactions backfill from points_ledger reason_text...');

  const ledgerRes = await pool.query(`
    SELECT pl.entry_id, pl.customer_id, pl.vehicle_id, pl.tenant_id, pl.reason_text, pl.points, pl.source_ref,
           v.ex_showroom_price AS vehicle_ex_paise, v.chassis_no, v.vin
    FROM points_ledger pl
    JOIN vehicles v ON pl.vehicle_id = v.vehicle_id
    WHERE (pl.type = 'earn_sale' OR pl.transaction_category = 'sale')
      AND pl.reason_text ILIKE '%=%'
  `);

  console.log(`Found ${ledgerRes.rows.length} vehicle sale points_ledger entries.`);

  let updatedCount = 0;
  let insertedCount = 0;

  for (const row of ledgerRes.rows) {
    const reasonText = row.reason_text || '';
    
    // Parse values from reason_text:
    // Format: "Vehicle purchase — ex-showroom ₹9,99,990 − dealer discount ₹0 − EMPS ₹4,000 − OEM offers ₹10,000 = ₹9,85,990 → +9,859 pts"
    const grossMatch = reasonText.match(/ex-showroom\s*₹\s*([0-9,]+)/i);
    const dealerMatch = reasonText.match(/dealer discount\s*₹\s*([0-9,]+)/i);
    const empsMatch = reasonText.match(/EMPS\s*₹\s*([0-9,]+)/i);
    const oemMatch = reasonText.match(/OEM offers\s*₹\s*([0-9,]+)/i);

    const grossRupees = grossMatch ? Number(grossMatch[1].replace(/,/g, '')) : Math.round(Number(row.vehicle_ex_paise || 0) / 100);
    const dealerRupees = dealerMatch ? Number(dealerMatch[1].replace(/,/g, '')) : 0;
    const empsRupees = empsMatch ? Number(empsMatch[1].replace(/,/g, '')) : 0;
    const oemRupees = oemMatch ? Number(oemMatch[1].replace(/,/g, '')) : 0;

    const grossPaise = Math.round(grossRupees * 100);
    const dealerPaise = Math.round(dealerRupees * 100);
    const empsPaise = Math.round(empsRupees * 100);
    const oemPaise = Math.round(oemRupees * 100);

    const refId = `VEH-${row.vehicle_id}`.slice(0, 20);

    // Check if sale_transactions row exists
    const existingSt = await pool.query(
      `SELECT id FROM sale_transactions WHERE vehicle_id = $1 AND tenant_id = $2 LIMIT 1;`,
      [row.vehicle_id, row.tenant_id]
    );

    if (existingSt.rows.length > 0) {
      await pool.query(
        `UPDATE sale_transactions
         SET ex_showroom_price_paise = $1,
             dealer_cash_discount_paise = $2,
             emps_discount_paise = $3,
             oem_offers_amount_paise = $4,
             points_calculated = true,
             updated_at = NOW()
         WHERE id = $5;`,
        [grossPaise, dealerPaise, empsPaise, oemPaise, existingSt.rows[0].id]
      );
      updatedCount++;
    } else {
      await pool.query(
        `INSERT INTO sale_transactions (
           tenant_id, customer_id, vehicle_id, branch_id, reference_id,
           ex_showroom_price_paise, dealer_cash_discount_paise, emps_discount_paise, oem_offers_amount_paise,
           points_calculated, is_invoice_finalized, stage, source, created_at, updated_at
         )
         VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8, true, true, 'finalized', 'appsheet_bot', NOW(), NOW())
         ON CONFLICT (tenant_id, reference_id) DO UPDATE
         SET ex_showroom_price_paise = EXCLUDED.ex_showroom_price_paise,
             dealer_cash_discount_paise = EXCLUDED.dealer_cash_discount_paise,
             emps_discount_paise = EXCLUDED.emps_discount_paise,
             oem_offers_amount_paise = EXCLUDED.oem_offers_amount_paise,
             updated_at = NOW();`,
        [
          row.tenant_id,
          row.customer_id,
          row.vehicle_id,
          refId,
          grossPaise,
          dealerPaise,
          empsPaise,
          oemPaise,
        ]
      );
      insertedCount++;
    }
  }

  console.log(`✅ [Backfill Complete] Inserted: ${insertedCount}, Updated: ${updatedCount} sale_transactions records.`);
  await pool.end();
}

backfill().catch((err) => {
  console.error('❌ [Backfill Error]', err);
  process.exit(1);
});
