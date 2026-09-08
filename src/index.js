const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/db');
const RealBooksService = require('./services/realbooks/realbooks.service');

// Test DB connection before listening
pool.query('SELECT NOW()')
  .then((res) => {
    console.log('📦 PostgreSQL Connected successfully at:', res.rows[0].now);
    app.listen(env.port, () => {
      console.log(`🚀 Loyalty Backend Server running on port ${env.port} [${env.nodeEnv}]`);
      
      // Start RealBooks background retry worker interval (every 60 seconds)
      setInterval(() => {
        RealBooksService.processPendingRetryQueue().catch((err) =>
          console.error('Error running RealBooks retry worker in index:', err.message)
        );
      }, 60000);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to PostgreSQL database:', err.message);
    console.log('⚠️ Please ensure PostgreSQL is running and your .env configuration is correct.');
    console.log(`Starting server anyway on port ${env.port}...`);
    app.listen(env.port, () => {
      console.log(`🚀 Loyalty Backend Server running on port ${env.port} [${env.nodeEnv}] (DB Offline)`);
    });
  });
