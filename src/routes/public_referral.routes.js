const express = require('express');
const router = express.Router();
const ReferralService = require('../services/referral.service');
const cryptoUtil = require('../utils/crypto.util');
const { pool } = require('../config/db');

// In-memory sliding window IP rate limiter (5 requests / hour per IP)
const ipRateLimitStore = new Map();

function rateLimitPublicLeads(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour

  let record = ipRateLimitStore.get(ip);
  if (!record) {
    record = { count: 1, startTime: now };
    ipRateLimitStore.set(ip, record);
    return next();
  }

  if (now - record.startTime > windowMs) {
    record.count = 1;
    record.startTime = now;
    return next();
  }

  if (record.count >= 5) {
    return res.status(429).json({
      success: false,
      message: 'Too many referral lead registration requests from your IP. Please try again in an hour.',
    });
  }

  record.count += 1;
  next();
}

/**
 * GET /api/public/referral-info/:referrerCode
 * Public endpoint to fetch referrer customer details (Name & Code)
 */
router.get('/referral-info/:referrerCode', async (req, res, next) => {
  try {
    const { referrerCode } = req.params;
    const tenantId = req.headers['x-tenant-id'] || 'bellad_and_company';

    const CustomerService = require('../services/customer.service');
    const referrer = await CustomerService.getCustomerByReferralCode(referrerCode, tenantId);

    res.json({
      success: true,
      data: {
        referrer_customer_id: referrer.customer_id,
        referrer_name: referrer.customer_name,
        referrer_code: referrerCode.toUpperCase(),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/public/referral-leads/request-otp
 * Accepts referrerCode, name, phone, aadhaar.
 * Validates Aadhaar format, checks existing customer / lead, sends OTP to phone.
 */
router.post('/referral-leads/request-otp', rateLimitPublicLeads, async (req, res, next) => {
  try {
    const { referrer_code, lead_name, lead_phone, lead_aadhaar } = req.body;
    const tenantId = req.headers['x-tenant-id'] || 'bellad_and_company';

    if (!referrer_code || !lead_name || !lead_phone || !lead_aadhaar) {
      return res.status(400).json({
        success: false,
        message: 'Referrer Code, Lead Name, Phone Number, and 12-digit Aadhaar Number are all required.',
      });
    }

    const cleanAadhaar = String(lead_aadhaar).replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar Number must be exactly 12 numeric digits.',
      });
    }

    const cleanPhone = String(lead_phone).trim();
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
      });
    }

    const result = await ReferralService.requestPublicLeadOtp({
      referrer_code: String(referrer_code).trim(),
      lead_name: String(lead_name).trim(),
      lead_phone: cleanPhone,
      lead_aadhaar: cleanAadhaar,
      tenant_id: tenantId,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/public/referral-leads/verify-otp
 * Accepts referrerCode, name, phone, aadhaar, otp.
 * Verifies OTP, generates unique generated_code, creates referral_leads row, sends code via WhatsApp/SMS.
 */
router.post('/referral-leads/verify-otp', rateLimitPublicLeads, async (req, res, next) => {
  try {
    const { referrer_code, lead_name, lead_phone, lead_aadhaar, otp } = req.body;
    const tenantId = req.headers['x-tenant-id'] || 'bellad_and_company';

    if (!referrer_code || !lead_name || !lead_phone || !lead_aadhaar || !otp) {
      return res.status(400).json({
        success: false,
        message: 'All fields including OTP are required.',
      });
    }

    const cleanAadhaar = String(lead_aadhaar).replace(/\D/g, '');
    const cleanPhone = String(lead_phone).trim();
    const cleanOtp = String(otp).trim();

    const result = await ReferralService.verifyPublicLeadOtpAndGenerateCode({
      referrer_code: String(referrer_code).trim(),
      lead_name: String(lead_name).trim(),
      lead_phone: cleanPhone,
      lead_aadhaar: cleanAadhaar,
      otp: cleanOtp,
      tenant_id: tenantId,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
