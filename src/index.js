const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/db');
const RealBooksService = require('./services/realbooks/realbooks.service');
const { startRedemptionStatusCron } = require('./cron/redemption_status_cron');
const { startAppSheetPullCron } = require('./cron/appsheet_pull_cron');
const { startGiftExpiryCron } = require('./cron/gift_expiry_cron');

// 1. Immediately bind and start listening so Render, Vercel proxy & health checks succeed instantly
const server = app.listen(env.port, '0.0.0.0', () => {
  console.log(`🚀 Loyalty Backend Server running on port ${env.port} [${env.nodeEnv}]`);

  // 2. Initialize database connection, migrations & background workers asynchronously
  pool.query('SELECT NOW()')
    .then(async (res) => {
      console.log('📦 PostgreSQL Connected successfully at:', res.rows[0].now);

      // Run pending migrations safely in background
      try {
        const runMigrations = require('./db/migrate');
        if (typeof runMigrations === 'function') {
          await runMigrations();
        }
      } catch (migErr) {
        console.warn('⚠️ Background database migration note:', migErr.message);
      }

      // Start redemption status & expiry cron job
      startRedemptionStatusCron();

      // Start recurring AppSheet pull worker (pulls unsynced rows into PostgreSQL)
      startAppSheetPullCron();

      // Start gift expiry & auto-reversion worker (checks every 1 hour)
      startGiftExpiryCron();

      // Start RealBooks background retry worker interval (every 60 seconds)
      setInterval(() => {
        RealBooksService.processPendingRetryQueue().catch((err) =>
          console.error('Error running RealBooks retry worker in index:', err.message)
        );
      }, 60000);
    })
    .catch((err) => {
      console.error('❌ Failed to connect to PostgreSQL database:', err.message);
      console.log(`⚠️ Server remains online on port ${env.port} and will accept requests when DB is ready.`);
    });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${env.port} is already in use by another process. Please stop the existing process or restart.`);
  } else {
    console.error('❌ Server error:', err.message);
  }
});
