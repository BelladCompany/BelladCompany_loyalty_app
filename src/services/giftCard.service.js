const crypto = require('crypto');
const { pool } = require('../config/db');
const { hashIdentifier } = require('../utils/crypto.util');

class GiftCardService {
  /**
   * Generates Amazon-style Gift Card Code: e.g. "GIFT-BELL-7K9A-4M2P"
   */
  static generateCardCode(prefix = 'BELL') {
    const cleanPrefix = prefix.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 4) || 'GIFT';
    const randPart1 = crypto.randomBytes(2).toString('hex').toUpperCase(); // 4 chars
    const randPart2 = crypto.randomBytes(2).toString('hex').toUpperCase(); // 4 chars
    return `GIFT-${cleanPrefix}-${randPart1}-${randPart2}`;
  }

  /**
   * Generates secure 4-digit PIN code
   */
  static generatePinCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Issue a new Digital Gift Card (Amazon style)
   */
  static async issueGiftCard({
    amount,
    currency = 'INR',
    sender_name,
    sender_email,
    sender_phone,
    recipient_name,
    recipient_phone,
    recipient_email,
    assigned_customer_id = null,
    custom_message = '',
    card_theme = 'celebration',
    validity_months = 12,
    created_by = null,
    tenant_id = 'bellad_and_company',
  }) {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw { statusCode: 400, message: 'Gift card amount must be greater than zero.' };
    }

    const amountPaise = Math.round(numAmount * 100);

    // Prefix based on tenant
    let prefix = 'BELL';
    if (tenant_id.includes('trident')) prefix = 'TRID';
    else if (tenant_id.includes('advaith')) prefix = 'ADVT';

    let cardCode = this.generateCardCode(prefix);
    const pinCode = this.generatePinCode();

    // Ensure uniqueness
    let exists = true;
    let attempts = 0;
    while (exists && attempts < 5) {
      const check = await pool.query(`SELECT card_id FROM gift_cards WHERE card_number = $1;`, [cardCode]);
      if (check.rows.length === 0) {
        exists = false;
      } else {
        cardCode = this.generateCardCode(prefix);
        attempts++;
      }
    }

    const validity = parseInt(validity_months || 12, 10);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (isNaN(validity) ? 12 : validity));

    const cleanPhone = recipient_phone ? recipient_phone.replace(/[^\d]/g, '') : null;
    const creatorInt = (created_by != null && !isNaN(parseInt(created_by, 10))) ? parseInt(created_by, 10) : null;

    const res = await pool.query(
      `INSERT INTO gift_cards (
        card_number, pin_code, initial_amount_paise, balance_amount_paise, currency,
        sender_name, sender_email, sender_phone, recipient_name, recipient_phone,
        recipient_email, assigned_customer_id, custom_message, card_theme,
        status, expires_at, tenant_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', $15, $16, $17)
      RETURNING *;`,
      [
        cardCode,
        pinCode,
        amountPaise,
        amountPaise,
        currency,
        sender_name || null,
        sender_email || null,
        sender_phone || null,
        recipient_name || 'Valued Recipient',
        cleanPhone,
        recipient_email || null,
        assigned_customer_id || null,
        custom_message || 'Enjoy your gift reward!',
        card_theme || 'celebration',
        expiresAt.toISOString(),
        tenant_id,
        creatorInt,
      ]
    );

    const card = res.rows[0];

    return {
      card_id: card.card_id,
      card_number: card.card_number,
      pin_code: card.pin_code,
      initial_amount: Number(card.initial_amount_paise) / 100,
      balance_amount: Number(card.balance_amount_paise) / 100,
      currency: card.currency,
      sender_name: card.sender_name,
      recipient_name: card.recipient_name,
      recipient_phone: card.recipient_phone,
      custom_message: card.custom_message,
      card_theme: card.card_theme,
      status: card.status,
      expires_at: card.expires_at,
      created_at: card.created_at,
    };
  }

  /**
   * Lookup & Validate Gift Card details by Card Number and PIN
   */
  static async lookupGiftCard(cardNumber, pinCode = null, tenantId = 'bellad_and_company') {
    const cleanNumber = String(cardNumber || '').trim().toUpperCase();
    if (!cleanNumber) {
      throw { statusCode: 400, message: 'Card number is required.' };
    }

    const res = await pool.query(
      `SELECT * FROM gift_cards WHERE card_number = $1 AND tenant_id = $2;`,
      [cleanNumber, tenantId]
    );

    if (res.rows.length === 0) {
      throw { statusCode: 404, message: 'Gift card not found. Please verify the 16-character card number.' };
    }

    const card = res.rows[0];

    // Check expiry
    const isExpired = new Date(card.expires_at).getTime() < Date.now();
    if (isExpired && card.status === 'active') {
      await pool.query(`UPDATE gift_cards SET status = 'expired' WHERE card_id = $1;`, [card.card_id]);
      card.status = 'expired';
    }

    // PIN check only if a non-empty PIN code is provided
    if (pinCode && String(pinCode).trim()) {
      const cleanPin = String(pinCode).trim();
      if (card.pin_code !== cleanPin) {
        throw { statusCode: 400, message: 'Incorrect 4-digit Security PIN for this gift card.' };
      }
    }

    return {
      card_id: card.card_id,
      card_number: card.card_number,
      pin_code: (pinCode && String(pinCode).trim() === card.pin_code) ? card.pin_code : '****',
      initial_amount: Number(card.initial_amount_paise) / 100,
      balance_amount: Number(card.balance_amount_paise) / 100,
      currency: card.currency,
      sender_name: card.sender_name,
      recipient_name: card.recipient_name,
      custom_message: card.custom_message,
      card_theme: card.card_theme,
      status: card.status,
      is_redeemable: card.status === 'active' || card.status === 'partially_redeemed',
      expires_at: card.expires_at,
      created_at: card.created_at,
    };
  }

  /**
   * Claim Gift Card into Customer Loyalty Points / Wallet (Amazon Style Claim)
   * 1 Rupee = 4 Loyalty Points (or based on firm rate)
   */
  static async claimGiftCardToPoints({
    card_number,
    pin_code,
    customer_id,
    cashier_id = null,
    tenant_id = 'bellad_and_company',
  }) {
    if (!customer_id) {
      throw { statusCode: 400, message: 'Customer ID is required to claim gift card.' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cardRes = await client.query(
        `SELECT * FROM gift_cards WHERE card_number = $1 AND tenant_id = $2 FOR UPDATE;`,
        [String(card_number).trim().toUpperCase(), tenant_id]
      );

      if (cardRes.rows.length === 0) {
        throw { statusCode: 404, message: 'Gift card not found.' };
      }

      const card = cardRes.rows[0];

      // Check if user is the assigned customer or has the matching recipient phone
      let isOwner = Boolean(card.assigned_customer_id && card.assigned_customer_id === customer_id);
      if (!isOwner && card.recipient_phone) {
        const cleanRecipient = card.recipient_phone.replace(/[^\d]/g, '');
        const phoneCheck = await client.query(
          `SELECT 1 FROM customer_phones WHERE customer_id = $1 AND tenant_id = $2 AND REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g') = $3 LIMIT 1;`,
          [customer_id, tenant_id, cleanRecipient]
        );
        if (phoneCheck.rows.length > 0) {
          isOwner = true;
        }
      }

      const submittedPin = pin_code ? String(pin_code).trim() : '';
      if (!isOwner) {
        if (!submittedPin || card.pin_code !== submittedPin) {
          throw { statusCode: 400, message: 'Invalid 4-digit Security PIN for this gift voucher.' };
        }
      } else {
        // If verified owner is claiming from portal, PIN is optional; if provided verify it
        if (submittedPin && card.pin_code !== submittedPin) {
          throw { statusCode: 400, message: 'Incorrect 4-digit Security PIN.' };
        }
      }

      if (card.status === 'redeemed' || Number(card.balance_amount_paise) <= 0) {
        throw { statusCode: 400, message: 'This gift card has already been completely redeemed.' };
      }

      if (card.status === 'expired' || new Date(card.expires_at).getTime() < Date.now()) {
        throw { statusCode: 400, message: 'This gift card has expired.' };
      }

      if (card.status === 'locked' || card.status === 'cancelled') {
        throw { statusCode: 400, message: `This gift card is currently ${card.status}.` };
      }

      const balancePaise = Number(card.balance_amount_paise);
      const balanceRupees = balancePaise / 100;

      // Conversion: ₹1 = 4 points (default)
      const pointsToCredit = Math.floor(balanceRupees * 4);

      // 1. Update gift card balance to 0 and status to redeemed
      await client.query(
        `UPDATE gift_cards
         SET balance_amount_paise = 0,
             status = 'redeemed',
             assigned_customer_id = $1,
             updated_at = NOW()
         WHERE card_id = $2;`,
        [customer_id, card.card_id]
      );

      // 1b. Sync customer_gifts table if linked
      await client.query(
        `UPDATE customer_gifts
         SET claim_status = 'claimed',
             claimed_at = NOW(),
             receiver_customer_id = $1
         WHERE gift_code = $2 AND tenant_id = $3 AND claim_status = 'unclaimed';`,
        [customer_id, card.card_number, tenant_id]
      ).catch(() => {});

      // 2. Insert gift card redemption audit log
      await client.query(
        `INSERT INTO gift_card_redemptions (
          card_id, customer_id, amount_paise, balance_before_paise, balance_after_paise,
          transaction_type, points_credited, reference_id, cashier_id, notes, tenant_id
        )
        VALUES ($1, $2, $3, $4, 0, 'points_conversion', $5, $6, $7, $8, $9);`,
        [
          card.card_id,
          customer_id,
          balancePaise,
          balancePaise,
          pointsToCredit,
          card.card_number,
          cashier_id,
          `Claimed Amazon-style Gift Card ${card.card_number} (₹${balanceRupees.toLocaleString()} → +${pointsToCredit.toLocaleString()} PTS)`,
          tenant_id,
        ]
      );

      // 3. Credit points into customer's points_ledger
      const branchRes = await client.query(
        `SELECT branch_id FROM branches WHERE tenant_id = $1 ORDER BY branch_id ASC LIMIT 1;`,
        [tenant_id]
      );
      const branchId = branchRes.rows[0]?.branch_id || 1;

      await client.query(
        `INSERT INTO points_ledger (
          customer_id, branch_id, type, transaction_category, points,
          source_ref, reason_type, reason_text, cashier_id, tenant_id, calc_snapshot
        )
        VALUES ($1, $2, 'earn_service', 'service', $3, $4, 'gift_card_claim', $5, $6, $7, $8);`,
        [
          customer_id,
          branchId,
          pointsToCredit,
          `Gift Card Claim: ${card.card_number}`,
          `Claimed Digital Gift Card ${card.card_number} (+${pointsToCredit.toLocaleString()} PTS from ₹${balanceRupees.toLocaleString()})`,
          cashier_id,
          tenant_id,
          JSON.stringify({ amount_paise: balancePaise, bill_amount: balanceRupees }),
        ]
      );

      // 4. Update customer tier snapshot
      const VehicleSalesPointsService = require('./vehicleSalesPoints.service');
      await VehicleSalesPointsService.updateCustomerTierSnapshot(customer_id, tenant_id, client);

      await client.query('COMMIT');

      return {
        success: true,
        message: `Successfully claimed ₹${balanceRupees.toLocaleString()} gift card! Credited +${pointsToCredit.toLocaleString()} loyalty points to your account.`,
        points_credited: pointsToCredit,
        card_number: card.card_number,
        amount_claimed: balanceRupees,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Redeem Gift Card at POS Checkout / Billing (Partial or Full)
   */
  static async redeemGiftCardAtPos({
    card_number,
    pin_code,
    pin,
    amount_to_redeem,
    amount,
    customer_id = null,
    reference_id = null,
    bill_reference = null,
    cashier_id = null,
    notes = '',
    tenant_id = 'bellad_and_company',
  }) {
    const rawAmount = amount_to_redeem != null ? amount_to_redeem : amount;
    const redeemAmount = Number(rawAmount);
    if (!redeemAmount || redeemAmount <= 0) {
      throw { statusCode: 400, message: 'Redeem amount must be greater than zero.' };
    }

    const effectiveRefId = reference_id || bill_reference || null;
    const effectivePin = String(pin_code || pin || '').trim();
    const redeemPaise = Math.round(redeemAmount * 100);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cardRes = await client.query(
        `SELECT * FROM gift_cards WHERE card_number = $1 AND tenant_id = $2 FOR UPDATE;`,
        [String(card_number).trim().toUpperCase(), tenant_id]
      );

      if (cardRes.rows.length === 0) {
        throw { statusCode: 404, message: 'Gift card not found.' };
      }

      const card = cardRes.rows[0];

      if (card.pin_code !== effectivePin) {
        throw { statusCode: 400, message: 'Invalid 4-digit Security PIN.' };
      }

      const currentBalancePaise = Number(card.balance_amount_paise);

      if (card.status === 'redeemed' || currentBalancePaise <= 0) {
        throw { statusCode: 400, message: 'This gift card has already been completely redeemed.' };
      }

      if (card.status === 'expired' || new Date(card.expires_at).getTime() < Date.now()) {
        throw { statusCode: 400, message: 'This gift card has expired.' };
      }

      if (redeemPaise > currentBalancePaise) {
        throw {
          statusCode: 400,
          message: `Insufficient gift card balance. Available: ₹${(currentBalancePaise / 100).toLocaleString()}, Requested: ₹${redeemAmount.toLocaleString()}`,
        };
      }

      const newBalancePaise = currentBalancePaise - redeemPaise;
      const newStatus = newBalancePaise === 0 ? 'redeemed' : 'partially_redeemed';

      const cleanCustomerId = (customer_id && String(customer_id).trim()) ? String(customer_id).trim() : null;
      const cashierInt = (cashier_id != null && !isNaN(parseInt(cashier_id, 10))) ? parseInt(cashier_id, 10) : null;

      // Update card balance
      await client.query(
        `UPDATE gift_cards
         SET balance_amount_paise = $1,
             status = $2,
             assigned_customer_id = COALESCE(assigned_customer_id, $3),
             updated_at = NOW()
         WHERE card_id = $4;`,
        [newBalancePaise, newStatus, cleanCustomerId, card.card_id]
      );

      // Audit log
      const logRes = await client.query(
        `INSERT INTO gift_card_redemptions (
          card_id, customer_id, amount_paise, balance_before_paise, balance_after_paise,
          transaction_type, reference_id, cashier_id, notes, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, 'pos_redemption', $6, $7, $8, $9)
        RETURNING *;`,
        [
          card.card_id,
          cleanCustomerId,
          redeemPaise,
          currentBalancePaise,
          newBalancePaise,
          effectiveRefId || `POS-BILL-${Date.now()}`,
          cashierInt,
          notes || `POS billing deduction of ₹${redeemAmount.toLocaleString()}`,
          tenant_id,
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: `Successfully redeemed ₹${redeemAmount.toLocaleString()} from gift card.`,
        amount_redeemed: redeemAmount,
        remaining_balance: newBalancePaise / 100,
        new_balance: newBalancePaise / 100,
        card_status: newStatus,
        redemption: logRes.rows[0],
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * List Gift Cards for Admin / Cashier with filtering & search
   */
  static async listGiftCards({
    search = '',
    status = '',
    limit = 50,
    offset = 0,
    tenant_id = 'bellad_and_company',
  }) {
    let query = `
      SELECT 
        gc.card_id,
        gc.card_number,
        '****' AS pin_code,
        gc.initial_amount_paise / 100.0 AS initial_amount,
        gc.balance_amount_paise / 100.0 AS balance_amount,
        gc.currency,
        gc.sender_name,
        gc.recipient_name,
        gc.recipient_phone,
        gc.recipient_email,
        gc.assigned_customer_id,
        c.customer_name AS assigned_customer_name,
        gc.custom_message,
        gc.card_theme,
        gc.status,
        gc.expires_at,
        gc.created_at,
        gc.created_by,
        u.username AS created_by_username
      FROM gift_cards gc
      LEFT JOIN customers c ON gc.assigned_customer_id = c.customer_id AND gc.tenant_id = c.tenant_id
      LEFT JOIN users u ON gc.created_by = u.user_id
      WHERE gc.tenant_id = $1
    `;
    const params = [tenant_id];

    if (status) {
      params.push(status);
      query += ` AND gc.status = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (gc.card_number ILIKE $${params.length} OR gc.recipient_name ILIKE $${params.length} OR gc.recipient_phone ILIKE $${params.length} OR gc.assigned_customer_id ILIKE $${params.length} OR c.customer_name ILIKE $${params.length})`;
    }

    query += ` ORDER BY gc.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(limit, offset);

    const res = await pool.query(query, params);

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM gift_cards WHERE tenant_id = $1;`,
      [tenant_id]
    );

    return {
      gift_cards: res.rows,
      total: countRes.rows[0]?.total || 0,
    };
  }

  /**
   * Get active and past gift cards assigned/linked to a customer (Customer Portal)
   */
  static async getCustomerGiftCards(customerId, tenantId = 'bellad_and_company') {
    const res = await pool.query(
      `SELECT 
        gc.card_id,
        gc.card_number,
        gc.pin_code,
        gc.initial_amount_paise / 100.0 AS initial_amount,
        gc.balance_amount_paise / 100.0 AS balance_amount,
        gc.currency,
        gc.sender_name,
        gc.recipient_name,
        gc.custom_message,
        gc.card_theme,
        gc.status,
        gc.expires_at,
        gc.created_at
       FROM gift_cards gc
       WHERE gc.tenant_id = $1 AND gc.assigned_customer_id = $2
       ORDER BY gc.created_at DESC;`,
      [tenantId, customerId]
    );

    // Also get customer's phone to find any unlinked cards issued to their phone number
    const custPhoneRes = await pool.query(
      `SELECT phone_number FROM customer_phones WHERE customer_id = $1 AND tenant_id = $2;`,
      [customerId, tenantId]
    );
    const phones = custPhoneRes.rows.map((p) => p.phone_number.replace(/[^\d]/g, '')).filter(Boolean);

    let unlinkedCards = [];
    if (phones.length > 0) {
      const unlinkedRes = await pool.query(
        `SELECT 
          gc.card_id,
          gc.card_number,
          gc.pin_code,
          gc.initial_amount_paise / 100.0 AS initial_amount,
          gc.balance_amount_paise / 100.0 AS balance_amount,
          gc.currency,
          gc.sender_name,
          gc.recipient_name,
          gc.custom_message,
          gc.card_theme,
          gc.status,
          gc.expires_at,
          gc.created_at
         FROM gift_cards gc
         WHERE gc.tenant_id = $1 AND gc.assigned_customer_id IS NULL AND gc.recipient_phone = ANY($2::citext[])
         ORDER BY gc.created_at DESC;`,
        [tenantId, phones]
      );
      unlinkedCards = unlinkedRes.rows;
    }

    const allCards = [...res.rows, ...unlinkedCards];
    const totalBalance = allCards.reduce((acc, c) => acc + (c.status === 'active' || c.status === 'partially_redeemed' ? Number(c.balance_amount) : 0), 0);

    return {
      cards: allCards,
      total_gift_balance: totalBalance,
    };
  }
}

module.exports = GiftCardService;
