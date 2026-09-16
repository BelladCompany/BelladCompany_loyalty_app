const AppSheetPullService = require('../services/appsheetPull.service');

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

function startAppSheetPullCron() {
  const intervalMs = parseInt(process.env.APPSHEET_PULL_INTERVAL_MS || String(DEFAULT_INTERVAL_MS), 10);
  const intervalMinutes = (intervalMs / 60000).toFixed(1);

  console.log(`📅 [AppSheetPullCron] Scheduled AppSheet recurring pull worker (every ${intervalMinutes} mins).`);

  // Initial pull run 15 seconds after server startup
  setTimeout(() => {
    AppSheetPullService.executePullCycle().catch((err) =>
      console.error('❌ [AppSheetPullCron] Initial pull cycle error:', err.message || err)
    );

    // Schedule recurring pull cycles
    setInterval(() => {
      AppSheetPullService.executePullCycle().catch((err) =>
        console.error('❌ [AppSheetPullCron] Recurring pull cycle error:', err.message || err)
      );
    }, intervalMs);
  }, 15_000);
}

module.exports = { startAppSheetPullCron };
