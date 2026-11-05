const AppSheetSyncEngine = require('../services/appsheetSyncEngine.service');

// Default sync interval: 12 Hours (never polls repeatedly in short cycles)
const DEFAULT_INTERVAL_MS = 12 * 60 * 60 * 1000;

function startAppSheetPullCron() {
  const intervalMs = parseInt(process.env.APPSHEET_PULL_INTERVAL_MS || String(DEFAULT_INTERVAL_MS), 10);
  const intervalHours = (intervalMs / (60 * 60 * 1000)).toFixed(1);

  console.log(`📅 [AppSheetPullCron] Scheduled AppSheet PR Done recurring pull worker (every ${intervalHours} hours, Cutoff: >= 2026-04-01). Strictly pull-only.`);

  // Initial pull run 30 seconds after server startup
  setTimeout(() => {
    AppSheetSyncEngine.syncAllPrDoneFromCutoff().catch((err) =>
      console.error('❌ [AppSheetPullCron] Initial pull cycle error:', err.message || err)
    );

    // Schedule recurring pull cycles (every 12 to 24 hours)
    setInterval(() => {
      AppSheetSyncEngine.syncAllPrDoneFromCutoff().catch((err) =>
        console.error('❌ [AppSheetPullCron] Recurring pull cycle error:', err.message || err)
      );
    }, intervalMs);
  }, 30_000);
}

module.exports = { startAppSheetPullCron };
