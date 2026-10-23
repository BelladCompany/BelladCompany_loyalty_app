const GiftEngineService = require('../services/giftEngine.service');
const { pool } = require('../config/db');
const env = require('../config/env');
const crypto = require('crypto');

class GiftController {
  /**
   * POST /api/gifts/create-from-points
   * Sender gifts loyalty points
   */
  static async createGiftFromPoints(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenant_id || env.defaultTenantId || 'bellad_and_company';
      const senderCustomerId = req.user?.customer_id || req.body.sender_customer_id;
      const { points_to_share, sender_phone, sender_name, custom_message, card_theme } = req.body;

      if (!senderCustomerId && !sender_phone) {
        return res.status(400).json({ status: 'fail', error: 'Sender identity (customer ID or phone) is required.' });
      }

      const result = await GiftEngineService.createGiftFromPoints({
        sender_customer_id: senderCustomerId,
        sender_phone: sender_phone || req.user?.phone,
        sender_name: sender_name || req.user?.name,
        points_to_share,
        custom_message,
        card_theme,
        tenant_id: tenantId,
      });

      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/gifts/create-from-razorpay
   * Sender initiates cash gift via Razorpay
   */
  static async createGiftFromRazorpay(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenant_id || env.defaultTenantId || 'bellad_and_company';
      const senderCustomerId = req.user?.customer_id || req.body.sender_customer_id || null;
      const { amount_inr, sender_phone, sender_name, custom_message, card_theme } = req.body;

      const result = await GiftEngineService.createGiftFromRazorpay({
        sender_customer_id: senderCustomerId,
        sender_phone: sender_phone || req.user?.phone,
        sender_name: sender_name || req.user?.name,
        amount_inr,
        custom_message,
        card_theme,
        tenant_id: tenantId,
      });

      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/gifts/verify-razorpay-payment
   * Confirms payment and returns WhatsApp share link
   */
  static async verifyRazorpayPayment(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenant_id || env.defaultTenantId || 'bellad_and_company';
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, claim_token } = req.body;

      const result = await GiftEngineService.verifyRazorpayPayment({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        claim_token,
        tenant_id: tenantId,
      });

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/gifts/claim/:token
   * Public lookup for claim screen
   */
  static async getGiftByClaimToken(req, res, next) {
    try {
      const { token } = req.params;
      const tenantId = req.query.tenant_id || env.defaultTenantId || 'bellad_and_company';

      const result = await GiftEngineService.getGiftByClaimToken(token, tenantId);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/gifts/claim/:token
   * Receiver claims the gift
   */
  static async claimGift(req, res, next) {
    try {
      const { token } = req.params;
      const { receiver_phone, receiver_name, receiver_aadhaar, dpdp_consent } = req.body;
      const tenantId = req.body.tenant_id || env.defaultTenantId || 'bellad_and_company';

      const result = await GiftEngineService.claimGift({
        claim_token: token,
        receiver_phone,
        receiver_name,
        receiver_aadhaar,
        dpdp_consent: Boolean(dpdp_consent),
        tenant_id: tenantId,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      });

      if (!result.success) {
        return res.status(403).json({
          status: 'fail',
          code: result.status,
          message: result.message,
        });
      }

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/gifts/my-sent-gifts
   * Sender views their sent gifts
   */
  static async getMySentGifts(req, res, next) {
    try {
      const customerId = req.user?.customer_id;
      const phone = req.user?.phone || req.query.phone;
      const tenantId = req.tenantId || req.user?.tenant_id || env.defaultTenantId || 'bellad_and_company';

      if (!customerId && !phone) {
        return res.status(400).json({ status: 'fail', error: 'Customer identification required.' });
      }

      const resGifts = await pool.query(
        `SELECT gift_id, gift_code, funding_source, amount_inr, points_equivalent,
                payment_status, claim_status, receiver_name, receiver_phone, claimed_at,
                expires_at, reversion_status, reversion_reason, created_at
         FROM customer_gifts
         WHERE (sender_customer_id = $1 OR sender_phone = $2) AND tenant_id = $3
         ORDER BY created_at DESC
         LIMIT 50;`,
        [customerId || '', phone || '', tenantId]
      );

      res.status(200).json({
        status: 'success',
        data: resGifts.rows,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/gifts/webhooks/razorpay
   * Razorpay Webhook listener with HMAC verification
   */
  static async handleRazorpayWebhook(req, res, next) {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const webhookSignature = req.headers['x-razorpay-signature'];

      if (webhookSecret && webhookSignature) {
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(req.body))
          .digest('hex');

        if (expectedSignature !== webhookSignature) {
          return res.status(400).json({ status: 'fail', error: 'Invalid webhook signature.' });
        }
      }

      const event = req.body?.event;
      const payload = req.body?.payload;

      if (event === 'payment.captured' || event === 'order.paid') {
        const payment = payload?.payment?.entity;
        const orderId = payment?.order_id;
        const paymentId = payment?.id;

        if (orderId && paymentId) {
          await pool.query(
            `UPDATE customer_gifts
             SET payment_status = 'paid',
                 razorpay_payment_id = $1,
                 updated_at = NOW()
             WHERE razorpay_order_id = $2;`,
            [paymentId, orderId]
          );
        }
      }

      res.status(200).json({ status: 'ok' });
    } catch (err) {
      console.error('[Razorpay Webhook Error]:', err);
      res.status(500).json({ status: 'error', message: err.message });
    }
  }
}

module.exports = GiftController;
