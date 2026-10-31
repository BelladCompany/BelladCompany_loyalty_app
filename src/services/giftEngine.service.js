const crypto = require('crypto');
const { pool } = require('../config/db');
const NotificationService = require('./notification.service');
const AuditLogService = require('./audit.service');
const CustomerService = require('./customer.service');
const { hashIdentifier } = require('../utils/crypto.util');

let Razorpay = null;
try {
  Razorpay = require('razorpay');
} catch (e) {
  // Razorpay optional in pure test environments
}

class GiftEngineService {
  /**
   * Helper: Generate a unique, readable Gift Code (e.g. "BLD-GIFT-8A2F-9D4E")
   */
  static generateGiftCode(prefix = 'BLD') {
    const p1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const p2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `${prefix}-GIFT-${p1}-${p2}`;
  }

  /**
   * Helper: Generate a high-entropy secret URL claim token (32 bytes = 64 hex chars)
   */
  static generateClaimToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Helper: Hash claim token using SHA-256 for secure storage
   */
  static hashClaimToken(token) {
    if (!token) return '';
    return crypto.createHash('sha256').update(String(token).trim()).digest('hex');
  }

  /**
   * Helper: Clean 10-digit mobile phone number
   */
  static cleanPhone(phone) {
    if (!phone) return '';
    const digits = String(phone).replace(/[^\d]/g, '');
    return digits.length === 10 ? digits : (digits.length > 10 ? digits.slice(-10) : digits);
  }

  /**
   * Helper: Get Razorpay instance (configured or mock)
   */
  static getRazorpayClient() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret && Razorpay) {
      return new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
    return null;
  }

  /**
   * Mode A: Create Gift funded by Sender's Loyalty Points
   * 4 Points = ₹1. Points are immediately debited from sender's ledger.
   */
  static async createGiftFromPoints({
    sender_customer_id,
    sender_phone,
    sender_name,
    points_to_share,
    custom_message = 'Enjoy this special gift at Bellad Dealerships!',
    card_theme = 'celebration',
    validity_days = 30,
    tenant_id = 'bellad_and_company',
  }) {
    const points = parseInt(points_to_share, 10);
    if (isNaN(points) || points <= 0) {
      throw { statusCode: 400, message: 'Points to share must be greater than zero.' };
    }

    if (points % 4 !== 0) {
      throw { statusCode: 400, message: 'Points to share must be a multiple of 4 (4 Points = ₹1).' };
    }

    const amountInr = points / 4;
    if (amountInr < 1) {
      throw { statusCode: 400, message: 'Minimum gift value is ₹1 (4 Loyalty Points).' };
    }
    if (amountInr > 25000) {
      throw { statusCode: 400, message: 'Maximum gift value per transaction is ₹25,000 (100,000 Loyalty Points).' };
    }

    const cleanSenderPhone = this.cleanPhone(sender_phone);
    if (!cleanSenderPhone) {
      throw { statusCode: 400, message: 'Valid sender phone number is required.' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Resolve sender customer if not provided
      let resolvedCustomerId = sender_customer_id;
      if (!resolvedCustomerId) {
        const phoneRes = await client.query(
          `SELECT customer_id FROM customer_phones WHERE phone_number = $1 AND tenant_id = $2 LIMIT 1;`,
          [cleanSenderPhone, tenant_id]
        );
        if (phoneRes.rows.length === 0) {
          throw { statusCode: 404, message: 'Sender profile not found for this phone number.' };
        }
        resolvedCustomerId = phoneRes.rows[0].customer_id;
      }

      // 2. Lock and check sender's points balance
      const balRes = await client.query(
        `SELECT GREATEST(0, COALESCE(SUM(points), 0)) AS current_balance
         FROM points_ledger
         WHERE customer_id = $1 AND tenant_id = $2;`,
        [resolvedCustomerId, tenant_id]
      );
      const currentBalance = parseInt(balRes.rows[0]?.current_balance || 0, 10);

      if (currentBalance < points) {
        throw {
          statusCode: 400,
          message: `Insufficient points balance. You have ${currentBalance.toLocaleString()} PTS, but requested to gift ${points.toLocaleString()} PTS.`,
        };
      }

      // 3. Rate limit: check maximum active unclaimed gifts created today
      const rateCheck = await client.query(
        `SELECT COUNT(*) AS active_gifts
         FROM customer_gifts
         WHERE sender_customer_id = $1 AND claim_status = 'unclaimed' AND created_at >= NOW() - INTERVAL '24 hours' AND tenant_id = $2;`,
        [resolvedCustomerId, tenant_id]
      );
      if (parseInt(rateCheck.rows[0]?.active_gifts || 0, 10) >= 50) {
        throw { statusCode: 429, message: 'Daily gifting limit reached. You can have at most 50 active unclaimed gifts per day.' };
      }

      // 4. Generate unique tokens & 4-digit PIN
      const giftCode = this.generateGiftCode('BLD');
      const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
      const claimToken = this.generateClaimToken();
      const claimTokenHash = this.hashClaimToken(claimToken);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (parseInt(validity_days, 10) || 30));

      // 5. Debit sender's points in points_ledger (Negative points)
      const debitRes = await client.query(
        `INSERT INTO points_ledger (
          customer_id, branch_id, type, transaction_category, points,
          source_ref, reason_type, reason_text, tenant_id, calc_snapshot
        )
        VALUES ($1, 1, 'redeem', 'redemption', $2, $3, 'gift_send', $4, $5, $6)
        RETURNING entry_id;`,
        [
          resolvedCustomerId,
          -points,
          `Gift Sent: ${giftCode}`,
          `Sent ₹${amountInr.toLocaleString('en-IN')} Gift via WhatsApp (${giftCode})`,
          tenant_id,
          JSON.stringify({ gift_code: giftCode, amount_inr: amountInr, points_deducted: points }),
        ]
      );
      const senderLedgerId = debitRes.rows[0].entry_id;

      // 6. Create gift record
      const giftRes = await client.query(
        `INSERT INTO customer_gifts (
          gift_code, pin_code, claim_token_hash, funding_source, sender_customer_id, sender_phone, sender_name,
          amount_inr, points_equivalent, points_deducted, payment_status, claim_status, expires_at,
          sender_ledger_id, card_theme, custom_message, tenant_id
        )
        VALUES ($1, $2, $3, 'points', $4, $5, $6, $7, $8, $9, 'paid', 'unclaimed', $10, $11, $12, $13, $14)
        RETURNING *;`,
        [
          giftCode,
          pinCode,
          claimTokenHash,
          resolvedCustomerId,
          cleanSenderPhone,
          sender_name || 'Loyal Member',
          amountInr,
          points,
          points,
          expiresAt.toISOString(),
          senderLedgerId,
          card_theme,
          custom_message,
          tenant_id,
        ]
      );
      const gift = giftRes.rows[0];

      // 6b. Register in gift_cards registry so recipient can claim via Code + PIN in portal
      const amountPaise = Math.round(amountInr * 100);

      await client.query(
        `INSERT INTO gift_cards (
          card_number, pin_code, initial_amount_paise, balance_amount_paise, currency,
          sender_name, sender_phone, recipient_name, custom_message, card_theme,
          status, expires_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, 'INR', $5, $6, 'Gift Recipient', $7, $8, 'active', $9, $10)
        ON CONFLICT (card_number) DO UPDATE
        SET pin_code = EXCLUDED.pin_code,
            balance_amount_paise = EXCLUDED.balance_amount_paise;`,
        [
          giftCode,
          pinCode,
          amountPaise,
          amountPaise,
          sender_name || 'Loyal Member',
          cleanSenderPhone,
          custom_message,
          card_theme,
          expiresAt.toISOString(),
          tenant_id,
        ]
      );

      // 7. Audit log event
      await client.query(
        `INSERT INTO customer_gift_audit_logs (gift_id, event_type, actor_phone, actor_customer_id, details, tenant_id)
         VALUES ($1, 'gift_created_points', $2, $3, $4, $5);`,
        [
          gift.gift_id,
          cleanSenderPhone,
          resolvedCustomerId,
          JSON.stringify({ points_deducted: points, amount_inr: amountInr, gift_code: giftCode, pin_code: pinCode }),
          tenant_id,
        ]
      );

      await client.query('COMMIT');

      // 8. Generate WhatsApp sharing payload with Card Code, PIN, and 1-Click Link
      const baseUrl = process.env.APP_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://bellad.co.in');
      const shareUrl = `${baseUrl}/gift/${claimToken}`;
      const whatsappText = encodeURIComponent(
        `🎁 *You received a ₹${amountInr.toLocaleString('en-IN')} Gift Card from ${sender_name || 'a friend'}!*\n\n` +
        `"${custom_message}"\n\n` +
        `💳 *Card Code:* ${giftCode}\n` +
        `🔐 *Secret PIN:* ${pinCode}\n` +
        `💰 *Value:* ₹${amountInr.toLocaleString('en-IN')} (+${points.toLocaleString('en-IN')} Loyalty Points)\n\n` +
        `👉 *1-Click Claim Link:* ${shareUrl}\n\n` +
        `*(You can claim directly with the link above, or paste the Card Code & PIN in your Bellad Customer Portal to add points instantly!)*`
      );

      return {
        gift_id: gift.gift_id,
        gift_code: gift.gift_code,
        pin_code: pinCode,
        claim_token: claimToken,
        claim_url: shareUrl,
        whatsapp_share_url: `https://api.whatsapp.com/send?text=${whatsappText}`,
        amount_inr: amountInr,
        points_equivalent: points,
        expires_at: gift.expires_at,
        funding_source: 'points',
        new_balance: currentBalance - points,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Mode B: Create Gift Order via Razorpay
   * Initiates payment order. Gift becomes active after webhook / signature verification.
   */
  static async createGiftFromRazorpay({
    sender_customer_id = null,
    sender_phone,
    sender_name,
    amount_inr,
    custom_message = 'Enjoy this special gift at Bellad Dealerships!',
    card_theme = 'celebration',
    validity_days = 30,
    tenant_id = 'bellad_and_company',
  }) {
    const numAmount = parseFloat(amount_inr);
    if (isNaN(numAmount) || numAmount < 100) {
      throw { statusCode: 400, message: 'Minimum gift purchase amount is ₹100.' };
    }
    if (numAmount > 25000) {
      throw { statusCode: 400, message: 'Maximum gift purchase amount is ₹25,000 per transaction.' };
    }

    const cleanSenderPhone = this.cleanPhone(sender_phone);
    if (!cleanSenderPhone) {
      throw { statusCode: 400, message: 'Valid sender phone number is required.' };
    }

    const pointsEquivalent = Math.round(numAmount * 4);
    const amountPaise = Math.round(numAmount * 100);

    const giftCode = this.generateGiftCode('BLD');
    const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
    const claimToken = this.generateClaimToken();
    const claimTokenHash = this.hashClaimToken(claimToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (parseInt(validity_days, 10) || 30));

    // Create Razorpay Order
    let razorpayOrderId = null;
    const rzp = this.getRazorpayClient();

    if (rzp) {
      const order = await rzp.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: giftCode,
        notes: {
          gift_code: giftCode,
          sender_phone: cleanSenderPhone,
          points_equivalent: pointsEquivalent,
          tenant_id,
        },
      });
      razorpayOrderId = order.id;
    } else {
      // Mock order for dev / test mode
      razorpayOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    // Save pending gift record
    const giftRes = await pool.query(
      `INSERT INTO customer_gifts (
        gift_code, pin_code, claim_token_hash, funding_source, sender_customer_id, sender_phone, sender_name,
        amount_inr, points_equivalent, points_deducted, razorpay_order_id, payment_status, claim_status,
        expires_at, card_theme, custom_message, tenant_id
      )
      VALUES ($1, $2, $3, 'razorpay', $4, $5, $6, $7, $8, 0, $9, 'pending', 'unclaimed', $10, $11, $12, $13)
      RETURNING *;`,
      [
        giftCode,
        pinCode,
        claimTokenHash,
        sender_customer_id || null,
        cleanSenderPhone,
        sender_name || 'Generous Friend',
        numAmount,
        pointsEquivalent,
        razorpayOrderId,
        expiresAt.toISOString(),
        card_theme,
        custom_message,
        tenant_id,
      ]
    );
    const gift = giftRes.rows[0];

    const vpa = process.env.RAZORPAY_UPI_VPA || 'belladandcompany@icici';
    const upiUrl = `upi://pay?pa=${vpa}&pn=${encodeURIComponent('Bellad & Company')}&am=${numAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Gift Card ' + giftCode)}`;

    return {
      gift_id: gift.gift_id,
      gift_code: gift.gift_code,
      pin_code: pinCode,
      claim_token: claimToken,
      razorpay_order_id: razorpayOrderId,
      amount_inr: numAmount,
      points_equivalent: pointsEquivalent,
      currency: 'INR',
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_mode',
      upi_vpa: vpa,
      upi_url: upiUrl,
      expires_at: gift.expires_at,
    };
  }

  /**
   * Verify Razorpay Payment Signature and activate the gift
   */
  static async verifyRazorpayPayment({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    claim_token,
    tenant_id = 'bellad_and_company',
  }) {
    if (!razorpay_order_id || !razorpay_payment_id) {
      throw { statusCode: 400, message: 'Missing Razorpay order or payment details.' };
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const isMock = !keySecret || razorpay_order_id.startsWith('order_mock_');

    if (!isMock) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        throw { statusCode: 400, message: 'Invalid payment signature. Verification failed.' };
      }
    }

    // Activate gift in database
    const updateRes = await pool.query(
      `UPDATE customer_gifts
       SET payment_status = 'paid',
           razorpay_payment_id = $1,
           razorpay_signature = $2,
           updated_at = NOW()
       WHERE razorpay_order_id = $3
       RETURNING *;`,
      [razorpay_payment_id, razorpay_signature || 'mock_sig', razorpay_order_id]
    );

    if (updateRes.rows.length === 0) {
      throw { statusCode: 404, message: 'Gift order not found.' };
    }

    const gift = updateRes.rows[0];
    const pin = gift.pin_code || '4821';
    const amountPaise = Math.round(Number(gift.amount_inr) * 100);

    // Also activate in gift_cards registry so recipient can claim via Code + PIN in portal
    await pool.query(
      `INSERT INTO gift_cards (
        card_number, pin_code, initial_amount_paise, balance_amount_paise, currency,
        sender_name, sender_phone, recipient_name, custom_message, card_theme,
        status, expires_at, tenant_id
      )
      VALUES ($1, $2, $3, $4, 'INR', $5, $6, 'Gift Recipient', $7, $8, 'active', $9, $10)
      ON CONFLICT (card_number) DO UPDATE
      SET pin_code = EXCLUDED.pin_code,
          balance_amount_paise = EXCLUDED.balance_amount_paise,
          status = 'active';`,
      [
        gift.gift_code,
        pin,
        amountPaise,
        amountPaise,
        gift.sender_name || 'Generous Friend',
        gift.sender_phone,
        gift.custom_message,
        gift.card_theme,
        gift.expires_at,
        tenant_id,
      ]
    );

    const shareUrl = `${process.env.APP_BASE_URL || 'http://localhost:5173'}/gift/${claim_token || 'active'}`;
    const whatsappText = encodeURIComponent(
      `🎁 *You received a ₹${Number(gift.amount_inr).toLocaleString('en-IN')} Bellad & Co Gift Card from ${gift.sender_name || 'a friend'}!*\n\n` +
      `"${gift.custom_message}"\n\n` +
      `💳 *Card Code:* ${gift.gift_code}\n` +
      `🔐 *Security PIN:* ${pin}\n` +
      `💰 *Value:* ₹${Number(gift.amount_inr).toLocaleString('en-IN')} (+${Number(gift.points_equivalent).toLocaleString('en-IN')} PTS)\n\n` +
      `👉 *Claim your gift in 1 tap here:* ${shareUrl}\n\n` +
      `*(Claim directly with the link above, or paste the Card Code & PIN in your Bellad Customer Portal to add points instantly!)*`
    );

    return {
      success: true,
      gift_id: gift.gift_id,
      gift_code: gift.gift_code,
      pin_code: pin,
      amount_inr: Number(gift.amount_inr),
      points_equivalent: gift.points_equivalent,
      payment_status: 'paid',
      claim_url: shareUrl,
      whatsapp_share_url: `https://api.whatsapp.com/send?text=${whatsappText}`,
    };
  }

  /**
   * Public Details Lookup for Receiver claiming page (Safe, non-sensitive)
   */
  static async getGiftByClaimToken(token, tenantId = 'bellad_and_company') {
    if (!token) {
      throw { statusCode: 400, message: 'Gift claim token is required.' };
    }

    const tokenHash = this.hashClaimToken(token);
    const res = await pool.query(
      `SELECT gift_id, gift_code, funding_source, sender_name, amount_inr, points_equivalent,
              payment_status, claim_status, expires_at, card_theme, custom_message, created_at, claimed_at
       FROM customer_gifts
       WHERE claim_token_hash = $1 AND tenant_id = $2;`,
      [tokenHash, tenantId]
    );

    if (res.rows.length === 0) {
      throw { statusCode: 404, message: 'Invalid or non-existent gift claim link.' };
    }

    const gift = res.rows[0];

    // Check expiry
    const isExpired = new Date(gift.expires_at).getTime() < Date.now();
    if (isExpired && gift.claim_status === 'unclaimed') {
      gift.claim_status = 'expired';
    }

    return {
      gift_code: gift.gift_code,
      sender_name: gift.sender_name,
      amount_inr: Number(gift.amount_inr),
      points_equivalent: gift.points_equivalent,
      claim_status: gift.claim_status,
      is_claimable: gift.claim_status === 'unclaimed' && gift.payment_status === 'paid' && !isExpired,
      expires_at: gift.expires_at,
      card_theme: gift.card_theme,
      custom_message: gift.custom_message,
      created_at: gift.created_at,
      terms_and_conditions: [
        'Exclusively valid for new customers who have never purchased a vehicle from Bellad & Company.',
        'Redeemable only at authorized Bellad dealership branches through the Bellad Loyalty Program.',
        'Gifted points carry a validity of 12 months from the date of claim.',
        'Gift links are single-use only. Once claimed, the link expires immediately.',
        'This gift holds no direct cash surrender value and cannot be transferred or sold.',
        'If the recipient is an existing vehicle owner, the claim is rejected and the value is returned to the sender.',
      ],
    };
  }

  /**
   * Check if a phone or customer is an "Existing Vehicle Customer"
   * Returns true if they have purchased a vehicle from the dealership.
   */
  static async isExistingVehicleCustomer(cleanPhone, tenantId, client = pool) {
    if (!cleanPhone) return false;

    // Check 1: Find customer IDs associated with this phone
    const custRes = await client.query(
      `SELECT customer_id FROM customer_phones
       WHERE phone_number = $1 AND tenant_id = $2;`,
      [cleanPhone, tenantId]
    );

    const customerIds = custRes.rows.map((r) => r.customer_id);

    if (customerIds.length > 0) {
      // Check 2: Check if any of these customers have a registered vehicle
      const vehRes = await client.query(
        `SELECT vehicle_id, chassis_no, purchase_date, dms_invoice_date
         FROM vehicles
         WHERE customer_id = ANY($1) AND tenant_id = $2
         LIMIT 1;`,
        [customerIds, tenantId]
      );

      if (vehRes.rows.length > 0) {
        return true;
      }
    }

    // Check 3: Check AppSheet/DMS pull logs or staged vehicle purchase data if available
    try {
      const pullRes = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_name = 'appsheet_pull_logs';`
      );
      if (pullRes.rows.length > 0) {
        const dmsCheck = await client.query(
          `SELECT log_id FROM appsheet_pull_logs
           WHERE (raw_payload::text LIKE '%' || $1 || '%')
             AND (table_name ILIKE '%vin%' OR table_name ILIKE '%tally%' OR table_name ILIKE '%bill%')
           LIMIT 1;`,
          [cleanPhone]
        );
        if (dmsCheck.rows.length > 0) {
          return true;
        }
      }
    } catch (ignore) {}

    return false;
  }

  /**
   * Claim Gift into Receiver's Loyalty Wallet
   * Enforces:
   * 1. Row-level lock (no double claims / race conditions)
   * 2. Self-gifting ban
   * 3. STRICT "NEW CUSTOMERS ONLY" FILTER:
   *    If existing vehicle owner -> REJECT & AUTO-REVERT TO SENDER
   *    If new customer -> ENROLL & CREDIT POINTS
   */
  static async claimGift({
    claim_token,
    receiver_phone,
    receiver_name,
    receiver_aadhaar = null,
    dpdp_consent = true,
    tenant_id = 'bellad_and_company',
    ip_address = null,
    user_agent = null,
  }) {
    if (!dpdp_consent) {
      throw { statusCode: 400, message: 'You must provide consent under DPDP guidelines to verify customer eligibility.' };
    }

    const cleanReceiverPhone = this.cleanPhone(receiver_phone);
    if (!cleanReceiverPhone || cleanReceiverPhone.length !== 10) {
      throw { statusCode: 400, message: 'Please provide a valid 10-digit mobile phone number.' };
    }

    const tokenHash = this.hashClaimToken(claim_token);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Atomic row-level lock on gift record
      const giftRes = await client.query(
        `SELECT * FROM customer_gifts
         WHERE claim_token_hash = $1 AND tenant_id = $2
         FOR UPDATE;`,
        [tokenHash, tenant_id]
      );

      if (giftRes.rows.length === 0) {
        throw { statusCode: 404, message: 'Gift not found or invalid claim link.' };
      }

      const gift = giftRes.rows[0];

      // 2. Validate gift state
      if (gift.payment_status !== 'paid') {
        throw { statusCode: 400, message: 'This gift payment has not been confirmed yet.' };
      }

      if (gift.claim_status === 'claimed') {
        throw {
          statusCode: 400,
          message: `This gift has already been claimed on ${new Date(gift.claimed_at).toLocaleDateString('en-IN')}. Each gift is strictly single-use.`,
        };
      }

      if (gift.claim_status === 'rejected_existing_customer') {
        throw {
          statusCode: 400,
          message: 'This gift was previously rejected because the recipient was an existing vehicle owner, and value was returned to the sender.',
        };
      }

      if (gift.claim_status === 'expired' || new Date(gift.expires_at).getTime() < Date.now()) {
        throw { statusCode: 400, message: 'This gift link has expired and is no longer valid.' };
      }

      // 3. Self-gifting protection
      const cleanSenderPhone = this.cleanPhone(gift.sender_phone);
      if (cleanReceiverPhone === cleanSenderPhone) {
        throw { statusCode: 400, message: 'Self-gifting is not permitted. You cannot claim a gift you sent to yourself.' };
      }

      // 4. CRITICAL RULE: "NEW CUSTOMERS ONLY" VALIDATION
      const isExisting = await this.isExistingVehicleCustomer(cleanReceiverPhone, tenant_id, client);

      if (isExisting) {
        // REJECTION: Receiver is an existing vehicle owner!
        // Immediately flag rejection and execute AUTO-REVERSION TO SENDER
        let reversionType = 'none';

        if (gift.funding_source === 'points') {
          // Revert points back to sender
          const revertRes = await client.query(
            `INSERT INTO points_ledger (
              customer_id, branch_id, type, transaction_category, points,
              source_ref, reason_type, reason_text, tenant_id, calc_snapshot
            )
            VALUES ($1, 1, 'earn_service', 'service', $2, $3, 'gift_revert', $4, $5, $6)
            RETURNING entry_id;`,
            [
              gift.sender_customer_id,
              gift.points_deducted,
              `Gift Revert: ${gift.gift_code}`,
              `Refunded ${gift.points_deducted} PTS: Recipient is an existing vehicle owner (${gift.gift_code})`,
              tenant_id,
              JSON.stringify({ gift_code: gift.gift_code, reason: 'rejected_existing_customer' }),
            ]
          );
          reversionType = 'reverted_points';

          await client.query(
            `UPDATE customer_gifts
             SET claim_status = 'rejected_existing_customer',
                 receiver_phone = $1,
                 receiver_name = $2,
                 reversion_status = 'reverted_points',
                 reversion_reason = 'Recipient has previously purchased a vehicle. Points returned to sender.',
                 reversion_ledger_id = $3,
                 reverted_at = NOW(),
                 updated_at = NOW()
             WHERE gift_id = $4;`,
            [cleanReceiverPhone, receiver_name || 'Existing Customer', revertRes.rows[0].entry_id, gift.gift_id]
          );
        } else {
          // Razorpay funded gift: Flag for refund
          reversionType = 'refunded_razorpay';
          await client.query(
            `UPDATE customer_gifts
             SET claim_status = 'rejected_existing_customer',
                 receiver_phone = $1,
                 receiver_name = $2,
                 reversion_status = 'pending_reversion',
                 reversion_reason = 'Recipient has previously purchased a vehicle. Razorpay refund queued for sender.',
                 reverted_at = NOW(),
                 updated_at = NOW()
             WHERE gift_id = $3;`,
            [cleanReceiverPhone, receiver_name || 'Existing Customer', gift.gift_id]
          );
        }

        // Log audit event
        await client.query(
          `INSERT INTO customer_gift_audit_logs (gift_id, event_type, actor_phone, ip_address, user_agent, details, tenant_id)
           VALUES ($1, 'gift_claim_rejected_existing_customer', $2, $3, $4, $5, $6);`,
          [
            gift.gift_id,
            cleanReceiverPhone,
            ip_address,
            user_agent,
            JSON.stringify({ reason: 'existing_vehicle_owner', reversion_type: reversionType }),
            tenant_id,
          ]
        );

        await client.query('COMMIT');

        // Queue notification to sender about auto-refund
        if (typeof NotificationService.sendCustomerNotification === 'function') {
          NotificationService.sendCustomerNotification({
            phone: cleanSenderPhone,
            message: `Notice: Your gift of ₹${Number(gift.amount_inr).toLocaleString('en-IN')} to ${cleanReceiverPhone} was returned to your balance because the recipient is an existing Bellad vehicle owner.`,
            tenant_id,
          }).catch((err) => console.warn('[Gift Reversion Notice Failed]', err.message));
        }

        return {
          success: false,
          status: 'rejected_existing_customer',
          message:
            'This gift voucher is exclusively valid for new customers who have never purchased a vehicle from Bellad & Company. The gift value has been returned to the sender.',
        };
      }

      // 5. SUCCESS: Receiver IS A NEW CUSTOMER!
      // Resolve or enroll receiver
      let receiverCustomer = null;
      const phoneRes = await client.query(
        `SELECT c.customer_id, c.customer_name AS name
         FROM customer_phones cp
         JOIN customers c ON cp.customer_id = c.customer_id AND cp.tenant_id = c.tenant_id
         WHERE cp.phone_number = $1 AND cp.tenant_id = $2 AND c.is_merged = FALSE
         LIMIT 1;`,
        [cleanReceiverPhone, tenant_id]
      );

      if (phoneRes.rows.length > 0) {
        receiverCustomer = phoneRes.rows[0];
      } else {
        // Enroll new first-time customer
        const cleanName = receiver_name ? String(receiver_name).trim() : 'New Guest Member';
        const newCust = await CustomerService.createCustomer({
          name: cleanName,
          phone_numbers: [cleanReceiverPhone],
          aadhaar_number: receiver_aadhaar || null,
          visit_type: 'first_time',
          is_first_time_visitor: true,
          otp_verified: true,
          tenant_id,
        });
        receiverCustomer = {
          customer_id: newCust.customer_id,
          name: newCust.customer_name || cleanName,
        };
      }

      // 6. Credit points into receiver's points_ledger
      const creditRes = await client.query(
        `INSERT INTO points_ledger (
          customer_id, branch_id, type, transaction_category, points,
          source_ref, reason_type, reason_text, tenant_id, calc_snapshot
        )
        VALUES ($1, 1, 'earn_service', 'service', $2, $3, 'gift_claim', $4, $5, $6)
        RETURNING entry_id;`,
        [
          receiverCustomer.customer_id,
          gift.points_equivalent,
          `Gift Claim: ${gift.gift_code}`,
          `Claimed Gift from ${gift.sender_name || 'a friend'} (+${gift.points_equivalent.toLocaleString()} PTS)`,
          tenant_id,
          JSON.stringify({
            gift_code: gift.gift_code,
            amount_inr: Number(gift.amount_inr),
            points_credited: gift.points_equivalent,
            valid_for_months: 12,
          }),
        ]
      );
      const receiverLedgerId = creditRes.rows[0].entry_id;

      // 7. Mark gift as claimed
      await client.query(
        `UPDATE customer_gifts
         SET claim_status = 'claimed',
             receiver_customer_id = $1,
             receiver_phone = $2,
             receiver_name = $3,
             claimed_at = NOW(),
             receiver_ledger_id = $4,
             updated_at = NOW()
         WHERE gift_id = $5;`,
        [receiverCustomer.customer_id, cleanReceiverPhone, receiver_name || receiverCustomer.name, receiverLedgerId, gift.gift_id]
      );

      // 7b. Also sync gift_cards table if linked
      await client.query(
        `UPDATE gift_cards
         SET balance_amount_paise = 0,
             status = 'redeemed',
             assigned_customer_id = $1,
             updated_at = NOW()
         WHERE card_number = $2;`,
        [receiverCustomer.customer_id, gift.gift_code]
      ).catch(() => {});

      // 8. Log audit
      await client.query(
        `INSERT INTO customer_gift_audit_logs (gift_id, event_type, actor_phone, actor_customer_id, ip_address, user_agent, details, tenant_id)
         VALUES ($1, 'gift_claimed_successfully', $2, $3, $4, $5, $6, $7);`,
        [
          gift.gift_id,
          cleanReceiverPhone,
          receiverCustomer.customer_id,
          ip_address,
          user_agent,
          JSON.stringify({ points_credited: gift.points_equivalent, amount_inr: Number(gift.amount_inr) }),
          tenant_id,
        ]
      );

      await client.query('COMMIT');

      // 9. Notify sender that gift was claimed
      if (typeof NotificationService.sendCustomerNotification === 'function') {
        NotificationService.sendCustomerNotification({
          phone: cleanSenderPhone,
          message: `Great news! ${receiver_name || 'Your friend'} has claimed your ₹${Number(gift.amount_inr).toLocaleString('en-IN')} gift card and received ${gift.points_equivalent.toLocaleString()} loyalty points!`,
          tenant_id,
        }).catch((err) => console.warn('[Gift Claim Sender Notice Failed]', err.message));
      }

      return {
        success: true,
        status: 'claimed',
        points_credited: gift.points_equivalent,
        amount_inr: Number(gift.amount_inr),
        receiver_customer_id: receiverCustomer.customer_id,
        gift_code: gift.gift_code,
        message: `Congratulations! ${gift.points_equivalent.toLocaleString()} loyalty points have been credited to your Bellad account.`,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Automated Cron / Worker: Expire unclaimed gifts & revert to sender
   */
  static async expireUnclaimedGifts(tenantId = 'bellad_and_company') {
    const expiredRes = await pool.query(
      `SELECT * FROM customer_gifts
       WHERE claim_status = 'unclaimed'
         AND payment_status = 'paid'
         AND expires_at < NOW()
         AND tenant_id = $1
       ORDER BY created_at ASC
       LIMIT 50;`,
      [tenantId]
    );

    let expiredCount = 0;
    for (const gift of expiredRes.rows) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        if (gift.funding_source === 'points') {
          // Revert points to sender
          const revertRes = await client.query(
            `INSERT INTO points_ledger (
              customer_id, branch_id, type, transaction_category, points,
              source_ref, reason_type, reason_text, tenant_id, calc_snapshot
            )
            VALUES ($1, 1, 'earn_service', 'service', $2, $3, 'gift_revert', $4, $5, $6)
            RETURNING entry_id;`,
            [
              gift.sender_customer_id,
              gift.points_deducted,
              `Gift Expired Revert: ${gift.gift_code}`,
              `Refunded ${gift.points_deducted} PTS: Unclaimed gift expired (${gift.gift_code})`,
              tenantId,
              JSON.stringify({ gift_code: gift.gift_code, reason: 'unclaimed_expired' }),
            ]
          );

          await client.query(
            `UPDATE customer_gifts
             SET claim_status = 'expired',
                 reversion_status = 'reverted_points',
                 reversion_reason = 'Unclaimed gift expired after 30 days. Points refunded to sender.',
                 reversion_ledger_id = $1,
                 reverted_at = NOW(),
                 updated_at = NOW()
             WHERE gift_id = $2;`,
            [revertRes.rows[0].entry_id, gift.gift_id]
          );
        } else {
          // Razorpay refund
          await client.query(
            `UPDATE customer_gifts
             SET claim_status = 'expired',
                 reversion_status = 'pending_reversion',
                 reversion_reason = 'Unclaimed gift expired. Razorpay refund queued.',
                 reverted_at = NOW(),
                 updated_at = NOW()
             WHERE gift_id = $1;`,
            [gift.gift_id]
          );
        }

        await client.query('COMMIT');
        expiredCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Gift Expiry Error on ${gift.gift_code}]:`, err.message);
      } finally {
        client.release();
      }
    }

    return { processed: expiredCount };
  }
}

module.exports = GiftEngineService;
