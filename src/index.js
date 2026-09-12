const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/db');
const RealBooksService = require('./services/realbooks/realbooks.service');
const { startRedemptionStatusCron } = require('./cron/redemption_status_cron');
const { startAppSheetPullCron } = require('./cron/appsheet_pull_cron');

// Test DB connection before listening
pool.query('SELECT NOW()')
  .then((res) => {
    console.log('📦 PostgreSQL Connected successfully at:', res.rows[0].now);
    const server = app.listen(env.port, () => {
      console.log(`🚀 Loyalty Backend Server running on port ${env.port} [${env.nodeEnv}]`);
      
      // Start redemption status & expiry cron job
      startRedemptionStatusCron();

      // Start recurring AppSheet pull worker (pulls unsynced rows into PostgreSQL)
      startAppSheetPullCron();

      // Start RealBooks background retry worker interval (every 60 seconds)
      setInterval(() => {
        RealBooksService.processPendingRetryQueue().catch((err) =>
          console.error('Error running RealBooks retry worker in index:', err.message)
        );
      }, 60000);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${env.port} is already in use by another process. Please stop the existing process or restart.`);
      } else {
        console.error('❌ Server error:', err.message);
      }
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to PostgreSQL database:', err.message);
    console.log('⚠️ Please ensure PostgreSQL is running and your .env configuration is correct.');
    console.log(`Starting server anyway on port ${env.port}...`);
    const server = app.listen(env.port, () => {
      console.log(`🚀 Loyalty Backend Server running on port ${env.port} [${env.nodeEnv}] (DB Offline)`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${env.port} is already in use by another process.`);
      } else {
        console.error('❌ Server error:', err.message);
      }
    });
  });
