const path = require('path');
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
const transactionRoutes = require('./routes/transaction.routes');
const referralRoutes = require('./routes/referral.routes');
const redemptionRoutes = require('./routes/redemption.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');
const kycRoutes = require('./routes/kyc.routes');
const publicBalanceRoutes = require('./routes/publicBalance.routes');
const reportRoutes = require('./routes/report.routes');
const appsheetRoutes = require('./routes/appsheet.routes');
const correctionRoutes = require('./routes/correction.routes');
const publicReferralRoutes = require('./routes/public_referral.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security and utility middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
app.use('/api/transactions', transactionRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/redemptions', redemptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/appsheet', appsheetRoutes);
app.use('/api/corrections', correctionRoutes);
app.use('/api/admin/corrections', correctionRoutes);
app.use('/api/public', publicBalanceRoutes);
app.use('/api/public', publicReferralRoutes);
app.use('/api', publicBalanceRoutes);
app.use('/api', kycRoutes);

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
