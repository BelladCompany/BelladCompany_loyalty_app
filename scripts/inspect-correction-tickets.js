const { pool } = require('../src/config/db');

async function inspectCorrectionTickets() {
  console.log('Inspecting correction_requests table...');

  const tickets = await pool.query(
    `SELECT id, customer_id, points_ledger_reference, wrong_bill_amount, correct_bill_amount, status, cashier_user_id, tenant_id, created_at
     FROM correction_requests
     ORDER BY created_at DESC;`
  );

  console.log('Correction Tickets in DB:', tickets.rows);

  await pool.end();
}

inspectCorrectionTickets().catch((err) => {
  console.error(err);
  process.exit(1);
});
