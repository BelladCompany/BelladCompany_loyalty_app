// scripts/appsheet-pull.js
// ---------------------------------------------------------------------------
// Pulls unsynced billing rows from AppSheet into PostgreSQL, auto-resolves or
// creates customers & vehicles, syncs transactions idempotently, updates
// SyncedToLoyalty=true in AppSheet, and logs metrics to appsheet_pull_log.
//
// Usage:
//   node scripts/appsheet-pull.js
// ---------------------------------------------------------------------------

require('dotenv').config();
const AppSheetPullService = require('../src/services/appsheetPull.service');

async function main() {
  try {
    const summary = await AppSheetPullService.executePullCycle();
    console.log('✅ Manual AppSheet pull finished successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Manual AppSheet pull failed:', err.message || err);
    process.exit(1);
  }
}

main();
