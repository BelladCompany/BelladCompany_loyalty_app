const { pool } = require('../config/db');
const PointsService = require('./points.service');
const ReferralService = require('./referral.service');

class TransactionService {
  /**
   * Syncs a transaction (from DMS or Cashier Fallback Screen) idempotently.
   * Prevents double-crediting if reference_id / job_card_number was already processed.
   */
  static async syncTransaction({
    category,
    job_card_number,
    reference_id,
    bill_amount,
    customer_id,
    phone_number,
    vehicle_id,
    registration_number,
    branch_id = 1,
    source = 'manual',
    created_by,
    tenant_id,
    otp,
  }) {
    const activeCategory = (category || 'service').toLowerCase();
    const isSale = activeCategory === 'sale';
    const refId = reference_id || job_card_number;
    const jobCard = job_card_number || reference_id;

    if (!refId && !jobCard) {
      throw { statusCode: 400, message: 'Either reference_id or job_card_number must be provided.' };
    }

    const numAmount = Number(bill_amount || 0);
    if (!numAmount || numAmount <= 0) {
      throw { statusCode: 400, message: 'Valid bill_amount greater than zero is required.' };
    }

    const amountInRupees = numAmount;
    const amountInPaise = Math.round(numAmount * 100);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Idempotency check
      if (isSale) {
        const existingSaleRes = await client.query(
          `SELECT * FROM sale_transactions WHERE tenant_id = $1 AND reference_id = $2;`,
          [tenant_id, refId]
        );
        if (existingSaleRes.rows.length > 0) {
          await client.query('ROLLBACK');
          return {
            status: 'already_processed',
            message: `Sale transaction '${refId}' already processed for tenant '${tenant_id}'.`,
            transaction: existingSaleRes.rows[0],
          };
        }
      } else {
        const existingServiceRes = await client.query(
          `SELECT * FROM service_transactions WHERE tenant_id = $1 AND branch_id = $2 AND job_card_number = $3;`,
          [tenant_id, branch_id, jobCard]
        );
        if (existingServiceRes.rows.length > 0) {
          await client.query('ROLLBACK');
          return {
            status: 'already_processed',
            message: `Job card '${jobCard}' already processed for branch '${branch_id}' in tenant '${tenant_id}'.`,
            transaction: existingServiceRes.rows[0],
          };
        }
      }

      // 2. Resolve Customer ID if not directly provided
      let resolvedCustomerId = customer_id;
      if (!resolvedCustomerId && phone_number) {
        const phoneRes = await client.query(
          `SELECT customer_id FROM customer_phones WHERE tenant_id = $1 AND phone_number = $2;`,
          [tenant_id, phone_number]
        );
        if (phoneRes.rows.length > 0) {
          resolvedCustomerId = phoneRes.rows[0].customer_id;
        }
      }

      if (!resolvedCustomerId) {
        throw { statusCode: 404, message: 'Customer could not be resolved. Please provide valid customer_id or phone_number.' };
      }

      // 2b. Validate OTP if provided
      if (otp && String(otp).trim()) {
        const bcrypt = require('bcryptjs');
        const otpRes = await client.query(
          `SELECT otp_id AS id, otp_hash FROM otp_requests
           WHERE customer_id = $1 AND tenant_id = $2 AND used_at IS NULL AND expires_at > NOW()
           ORDER BY created_at DESC LIMIT 1 FOR UPDATE;`,
          [resolvedCustomerId, tenant_id]
        );
        if (otpRes.rows.length === 0) {
          throw { statusCode: 400, message: 'No valid active OTP found for this customer or OTP has expired.' };
        }
        const isOtpValid = await bcrypt.compare(String(otp).trim(), otpRes.rows[0].otp_hash);
        if (!isOtpValid) {
          throw { statusCode: 400, message: 'Invalid 6-digit OTP code provided.' };
        }
        await client.query(`UPDATE otp_requests SET used_at = NOW(), is_used = TRUE WHERE otp_id = $1;`, [otpRes.rows[0].id]);
      }

      // 3. Resolve Vehicle ID if not directly provided
      let resolvedVehicleId = vehicle_id;
      if (!resolvedVehicleId && registration_number) {
        const vehRes = await client.query(
          `SELECT vehicle_id FROM vehicles WHERE tenant_id = $1 AND (registration_number = $2 OR chassis_no = $2);`,
          [tenant_id, registration_number]
        );
        if (vehRes.rows.length > 0) {
          resolvedVehicleId = vehRes.rows[0].vehicle_id;
        }
      }

      // If customer has vehicles, pick first vehicle if vehicle_id not supplied
      if (!resolvedVehicleId) {
        const firstVehRes = await client.query(
          `SELECT vehicle_id FROM vehicles WHERE customer_id = $1 AND tenant_id = $2 ORDER BY vehicle_id ASC LIMIT 1;`,
          [resolvedCustomerId, tenant_id]
        );
        if (firstVehRes.rows.length > 0) {
          resolvedVehicleId = firstVehRes.rows[0].vehicle_id;
        }
      }

      // 4. Save transaction record
      let savedTx;
      if (isSale) {
        const insSaleRes = await client.query(
          `INSERT INTO sale_transactions (
            customer_id, vehicle_id, branch_id, ex_showroom_price_paise, source, reference_id, created_by, tenant_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *;`,
          [
            resolvedCustomerId,
            resolvedVehicleId || null,
            branch_id,
            amountInPaise,
            source,
            refId,
            created_by || null,
            tenant_id,
          ]
        );
        savedTx = insSaleRes.rows[0];
      } else {
        const insServiceRes = await client.query(
          `INSERT INTO service_transactions (
            customer_id, vehicle_id, branch_id, job_card_number, bill_amount_paise, category, source, reference_id, created_by, tenant_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *;`,
          [
            resolvedCustomerId,
            resolvedVehicleId || null,
            branch_id,
            jobCard,
            amountInPaise,
            activeCategory,
            source,
            refId || null,
            created_by || null,
            tenant_id,
          ]
        );
        savedTx = insServiceRes.rows[0];
      }

      await client.query('COMMIT');

      // If this is a vehicle sale transaction, auto-calculate suggested referral points for any pending referral
      if (isSale) {
        try {
          await ReferralService.autoCalculateReferralPoints({
            referred_customer_id: resolvedCustomerId,
            ex_showroom_price_paise: amountInPaise,
            vehicle_id: resolvedVehicleId,
            tenant_id,
            client,
          });
        } catch (refErr) {
          console.error('[Referral Auto-Calc Warning]', refErr.message || refErr);
        }
      }

      // 5. Credit points via PointsService.recordEarning
      const earningResult = await PointsService.recordEarning({
        customer_id: resolvedCustomerId,
        vehicle_id: resolvedVehicleId,
        branch_id,
        amount: amountInRupees,
        type: isSale ? 'sale' : 'service',
        category: activeCategory,
        reference_id: refId,
        description: `Synced ${activeCategory.toUpperCase()} transaction (${source}) - ${refId}`,
        created_by,
        tenant_id,
      });

      return {
        status: 'success',
        message: `Successfully processed ${activeCategory} transaction '${refId}'.`,
        transaction: savedTx,
        ledger_entry: earningResult.ledger_entry,
        tier_snapshot: earningResult.tier_snapshot,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Look up processed transaction for auto-fetch / check idempotency status
   */
  static async findTransaction(category, identifier, branchId, tenantId) {
    const isSale = (category || '').toLowerCase() === 'sale';
    if (isSale) {
      const res = await pool.query(
        `SELECT * FROM sale_transactions WHERE tenant_id = $1 AND reference_id = $2;`,
        [tenantId, identifier]
      );
      return res.rows[0] || null;
    } else {
      const res = await pool.query(
        `SELECT * FROM service_transactions WHERE tenant_id = $1 AND branch_id = $2 AND job_card_number = $3;`,
        [tenantId, branchId, identifier]
      );
      return res.rows[0] || null;
    }
  }
}

module.exports = TransactionService;
