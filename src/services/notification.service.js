const { pool } = require('../config/db');
const { getWhatsAppProvider } = require('./whatsapp/whatsapp.provider');

/**
 * NotificationService
 *
 * Central service for all WhatsApp message dispatches.
 * All sends use APPROVED WhatsApp templates with ordered params ({{1}}, {{2}}, ...).
 * All sends are logged to the `whatsapp_message_log` table for delivery auditing.
 * All public queue* methods are non-blocking (fire-and-forget via setImmediate).
 */
class NotificationService {
  // ─── Message formatters (used ONLY for the audit log's human-readable copy,
  //     NOT sent to the WhatsApp API — the API only receives `params`) ───────

  static formatPointsEarnedMessage({ points, transactionType, totalPoints, value }) {
    return (
      `🎉 Congratulations!\n` +
      `You have earned ${points} loyalty points from your recent ${transactionType} transaction.\n` +
      `⭐ Points earned: ${points}\n` +
      `💰 New total balance: ${totalPoints} points (Worth ₹${value})\n` +
      `💡 How to redeem: Every 4 points = ₹1 discount on your next service or purchase. Simply quote your registered phone number at the counter!\n` +
      `Thank you for choosing Bellad & Company!`
    );
  }

  static formatOtpMessage({ otp, customerName }) {
    return (
      `🔐 Your BAC Loyalty OTP\n` +
      `Hi ${customerName || 'Valued Customer'},\n` +
      `Your one-time verification code is: *${otp}*\n` +
      `This OTP is valid for 5 minutes and is single-use only.\n` +
      `Do not share this code with anyone.\n` +
      `— Bellad & Company Loyalty Program`
    );
  }

  static formatRedemptionMessage({ pointsRedeemed, discountRupees, remainingBalance }) {
    return (
      `✅ Redemption Confirmed Successfully!\n` +
      `🎟️ Points redeemed: ${pointsRedeemed} PTS\n` +
      `💰 Discount amount applied: ₹${discountRupees}\n` +
      `📊 Remaining points balance: ${remainingBalance} PTS (≈ ₹${Math.floor(remainingBalance / 4)})\n` +
      `Thank you for choosing Bellad & Company! Visit us again soon.`
    );
  }

  // ─── Internal: log every send attempt to whatsapp_message_log ─────────────

  static async _logMessageAttempt({
    customer_id,
    phone_number,
    template_name,
    message_body,
    status,
    error_message,
    provider,
    tenant_id,
  }) {
    try {
      await pool.query(
        `INSERT INTO whatsapp_message_log
           (customer_id, phone_number, template_name, message_body, status, error_message, provider, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [
          customer_id || null,
          phone_number,
          template_name,
          message_body || null,
          status,
          error_message || null,
          provider || 'unknown',
          tenant_id,
        ]
      );
    } catch (logErr) {
      // Logging failures must never propagate — just warn
      console.warn('[NotificationService] Failed to write to whatsapp_message_log:', logErr.message);
    }
  }

  // ─── Internal: resolve primary phone for a customer ───────────────────────

  static async _resolvePrimaryPhone(customer_id, tenant_id) {
    const res = await pool.query(
      `SELECT phone_number
       FROM customer_phones
       WHERE customer_id = $1 AND tenant_id = $2
       ORDER BY is_verified DESC, phone_id ASC
       LIMIT 1;`,
      [customer_id, tenant_id]
    );
    return res.rows.length > 0 ? res.rows[0].phone_number : null;
  }

  // ─── Internal: resolve customer name ──────────────────────────────────────

  static async _resolveCustomerName(customer_id, tenant_id) {
    const res = await pool.query(
      `SELECT customer_name FROM customers WHERE customer_id = $1 AND tenant_id = $2 LIMIT 1;`,
      [customer_id, tenant_id]
    );
    return res.rows.length > 0 ? res.rows[0].customer_name : 'Valued Customer';
  }

  // ─── OTP Notification ─────────────────────────────────────────────────────

  /**
   * Sends OTP to the specified phone number via WhatsApp.
   * Returns { success, error? } — never throws.
   */
  static async sendOtpNotification({ customer_id, phone, otp, tenant_id }) {
    const templateName = 'otp_verification'; // exact approved template name from Reltigrow dashboard
    let messageBody = '';
    let providerName = 'unknown';

    try {
      const customerName = await this._resolveCustomerName(customer_id, tenant_id);
      messageBody = this.formatOtpMessage({ otp, customerName }); // kept only for the audit log

      const provider = getWhatsAppProvider();
      providerName = provider.name;

      const result = await provider.sendMessage({
        toPhone: phone,
        templateName,
        params: [otp], // fills {{1}} in your approved otp_verification template
      });

      await this._logMessageAttempt({
        customer_id,
        phone_number: phone,
        template_name: templateName,
        message_body: messageBody,
        status: result.success ? 'sent' : 'failed',
        error_message: result.success ? null : (result.error || 'Provider returned failure'),
        provider: result.provider || providerName,
        tenant_id,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'WhatsApp OTP delivery failed' };
      }

      return { success: true, messageId: result.messageId };
    } catch (err) {
      console.error(`❌ [OTP Notification] Failed for customer '${customer_id}' phone '${phone}':`, err.message);

      await this._logMessageAttempt({
        customer_id,
        phone_number: phone,
        template_name: templateName,
        message_body: messageBody,
        status: 'failed',
        error_message: err.message,
        provider: providerName,
        tenant_id,
      });

      return { success: false, error: err.message };
    }
  }

  // ─── Points Earned Notification ───────────────────────────────────────────

  /**
   * Sends "points earned" WhatsApp message with live balance.
   * Reads live balance from points_ledger at send time (never cached).
   */
  static async sendPointsEarnedNotification({ customer_id, points, transaction_type, tenant_id }) {
    const templateName = 'points_earned'; // <-- CONFIRM this exact name + var count in Reltigrow dashboard
    let messageBody = '';
    let providerName = 'unknown';
    let toPhone = null;

    try {
      toPhone = await this._resolvePrimaryPhone(customer_id, tenant_id);
      if (!toPhone) {
        console.warn(`⚠️ [Notification] No phone for customer '${customer_id}'. Skipping WhatsApp.`);
        return { success: false, reason: 'No phone number registered' };
      }

      // Live balance (never cached)
      const balanceRes = await pool.query(
        `SELECT COALESCE(SUM(points), 0) AS total_points
         FROM points_ledger
         WHERE customer_id = $1 AND tenant_id = $2;`,
        [customer_id, tenant_id]
      );
      const totalPoints = parseInt(balanceRes.rows[0].total_points, 10);
      const valueRupees = Math.floor(totalPoints / 4);
      const displayTxType = transaction_type === 'earn_referral' ? 'referral' : transaction_type;

      messageBody = this.formatPointsEarnedMessage({
        points,
        transactionType: displayTxType,
        totalPoints,
        value: valueRupees,
      }); // kept only for the audit log

      const provider = getWhatsAppProvider();
      providerName = provider.name;

      const result = await provider.sendMessage({
        toPhone,
        templateName,
        // Order these to match your approved template's {{1}}, {{2}}, {{3}} exactly.
        // Adjust the array (add/remove entries) once you confirm the template's variable count.
        params: [
          String(points),        // {{1}}
          String(totalPoints),   // {{2}}
          String(valueRupees),   // {{3}}
        ],
      });

      await this._logMessageAttempt({
        customer_id,
        phone_number: toPhone,
        template_name: templateName,
        message_body: messageBody,
        status: result.success ? 'sent' : 'failed',
        error_message: result.success ? null : (result.error || 'Provider returned failure'),
        provider: result.provider || providerName,
        tenant_id,
      });

      return {
        success: result.success,
        customer_id,
        to_phone: toPhone,
        total_points_live: totalPoints,
        loyalty_value_rupees: valueRupees,
        message_body: messageBody,
      };
    } catch (error) {
      console.error(`❌ [Points Earned Notification] Failed for customer '${customer_id}':`, error.message);

      await this._logMessageAttempt({
        customer_id,
        phone_number: toPhone || 'unknown',
        template_name: templateName,
        message_body: messageBody,
        status: 'failed',
        error_message: error.message,
        provider: providerName,
        tenant_id,
      });

      return { success: false, error: error.message };
    }
  }

  // ─── Redemption Confirmation Notification ─────────────────────────────────

  /**
   * Sends "redemption confirmed" WhatsApp message after successful redemption.
   */
  static async sendRedemptionNotification({ customer_id, phone, pointsRedeemed, discountRupees, remainingBalance, tenant_id }) {
    const templateName = 'loyalty_program_reedemption_msg'; // exact name from your Reltigrow dashboard (APPROVED)
    let messageBody = '';
    let providerName = 'unknown';
    let toPhone = phone;

    try {
      if (!toPhone) {
        toPhone = await this._resolvePrimaryPhone(customer_id, tenant_id);
      }
      if (!toPhone) {
        console.warn(`⚠️ [Redemption Notification] No phone for customer '${customer_id}'. Skipping.`);
        return { success: false, reason: 'No phone number registered' };
      }

      messageBody = this.formatRedemptionMessage({ pointsRedeemed, discountRupees, remainingBalance }); // kept only for the audit log

      const provider = getWhatsAppProvider();
      providerName = provider.name;

      const result = await provider.sendMessage({
        toPhone,
        templateName,
        params: [
          String(pointsRedeemed),   // {{1}}
          String(discountRupees),   // {{2}}
          String(remainingBalance), // {{3}}
          'Bellad & Company',       // {{4}}
        ],
      });

      await this._logMessageAttempt({
        customer_id,
        phone_number: toPhone,
        template_name: templateName,
        message_body: messageBody,
        status: result.success ? 'sent' : 'failed',
        error_message: result.success ? null : (result.error || 'Provider returned failure'),
        provider: result.provider || providerName,
        tenant_id,
      });

      return { success: result.success, messageId: result.messageId };
    } catch (err) {
      console.error(`❌ [Redemption Notification] Failed for customer '${customer_id}':`, err.message);

      await this._logMessageAttempt({
        customer_id,
        phone_number: toPhone || 'unknown',
        template_name: templateName,
        message_body: messageBody,
        status: 'failed',
        error_message: err.message,
        provider: providerName,
        tenant_id,
      });

      return { success: false, error: err.message };
    }
  }

  // ─── Non-blocking queue wrappers ──────────────────────────────────────────

  /** Fire-and-forget: points earned notification */
  static queuePointsEarnedNotification(data) {
    setImmediate(() => {
      this.sendPointsEarnedNotification(data).catch((err) =>
        console.error('[NotificationService] Async points-earned worker error:', err)
      );
    });
  }

  /** Fire-and-forget: OTP notification */
  static queueOtpNotification(data) {
    setImmediate(() => {
      this.sendOtpNotification(data).catch((err) =>
        console.error('[NotificationService] Async OTP notification worker error:', err)
      );
    });
  }

  /** Fire-and-forget: redemption confirmation notification */
  static queueRedemptionNotification(data) {
    setImmediate(() => {
      this.sendRedemptionNotification(data).catch((err) =>
        console.error('[NotificationService] Async redemption notification worker error:', err)
      );
    });
  }
}

module.exports = NotificationService;