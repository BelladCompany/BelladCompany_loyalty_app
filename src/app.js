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
const customerPortalRoutes = require('./routes/customerPortal.routes');
const giftCardRoutes = require('./routes/giftCard.routes');
const tenantRoutes = require('./routes/tenant.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Allowed origins configuration (CORS_ORIGINS comma-separated, FRONTEND_URL, or defaults)
const defaultOrigins = [
  'https://bellad-company-loyalty-app.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

const envCorsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const envFrontendUrl = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([...defaultOrigins, ...envCorsOrigins, ...envFrontendUrl])
).map((o) => o.replace(/\/+$/, ''));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(cleanOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy violation: Origin '${origin}' is not allowed.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'X-Tenant-ID', 'X-Requested-With', 'Accept'],
  credentials: false,
  optionsSuccessStatus: 200,
};

// CORS middleware MUST be registered BEFORE express.json() and before all routes
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Security and utility middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint (lightweight check without DB contact)
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

// API Routes
app.use('/api/v1', customerPortalRoutes);
app.use('/api/v1/gift-cards', giftCardRoutes);
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
app.use('/api/gift-cards', giftCardRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/tenants', tenantRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/appsheet', appsheetRoutes);
app.use('/api/corrections', correctionRoutes);
app.use('/api/admin/corrections', correctionRoutes);
app.use('/api/public', publicBalanceRoutes);
app.use('/api/public', publicReferralRoutes);
app.use('/api', publicBalanceRoutes);
app.use('/api', kycRoutes);

// Serve static client assets if client/dist exists (production fullstack deploy)
const fs = require('fs');
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (
      req.originalUrl.startsWith('/api') ||
      req.originalUrl.startsWith('/health') ||
      req.originalUrl.startsWith('/uploads')
    ) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Catch-all 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
