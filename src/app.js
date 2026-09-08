const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const customerRoutes = require('./routes/customer.routes');
const searchRoutes = require('./routes/search.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const branchRoutes = require('./routes/branch.routes');
const brandRoutes = require('./routes/brand.routes');
const pointsRoutes = require('./routes/points.routes');
const referralRoutes = require('./routes/referral.routes');
const redemptionRoutes = require('./routes/redemption.routes');
const adminRoutes = require('./routes/admin.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/redemptions', redemptionRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
