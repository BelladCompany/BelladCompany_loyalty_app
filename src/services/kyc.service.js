const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { encrypt, decrypt } = require('../utils/crypto.util');
const AuditLogService = require('./audit.service');

class KycService {
  /**
   * Submits a KYC Phone Update request.
   * Requires OTP verification against the customer's OLD / CURRENT phone number.
   * Encrypts id_proof_file_url reference at rest. Status set to 'pending'.
   */
  static async submitChangeRequest({
    customer_id,
    change_type = 'phone_update',
    new_value,
    reason,
    id_proof_type,
    id_proof_file_url,
    otp,
    requested_by,
    tenant_id,
  }) {
    if (!customer_id) {
      throw { statusCode: 400, message: 'Customer ID is required.' };
    }
    if (!new_value) {
      throw { statusCode: 400, message: 'New phone number is required.' };
    }
    if (!reason || !reason.trim()) {
      throw { statusCode: 400, message: 'Reason for phone update is mandatory.' };
    }
    if (!otp) {
      throw { statusCode: 400, message: 'OTP code sent to current phone number is required for verification.' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify customer exists and resolve old phone number
      const phoneRes = await client.query(
        `SELECT phone_number FROM customer_phones WHERE customer_id = $1 AND tenant_id = $2 ORDER BY phone_id ASC LIMIT 1;`,
        [customer_id, tenant_id]
      );

      if (phoneRes.rows.length === 0) {
        throw { statusCode: 404, message: `No active phone number found for customer '${customer_id}'.` };
      }

      const oldValue = phoneRes.rows[0].phone_number;

      // 2. Validate OTP code for old phone number access
      const otpRes = await client.query(
        `SELECT otp_id AS id, otp_hash, expires_at, used_at
         FROM otp_requests
         WHERE customer_id = $1 AND tenant_id = $2 AND used_at IS NULL AND expires_at > NOW()
         ORDER BY otp_id DESC
         LIMIT 1
         FOR UPDATE;`,
        [customer_id, tenant_id]
      );

      if (otpRes.rows.length === 0) {
        throw { statusCode: 400, message: 'No valid active OTP found for this customer or OTP has expired.' };
      }

      const activeOtp = otpRes.rows[0];
      const isOtpValid = await bcrypt.compare(otp.toString(), activeOtp.otp_hash);
      if (!isOtpValid) {
        throw { statusCode: 400, message: 'Invalid OTP code provided for old phone number verification.' };
      }

      // Mark OTP as used (single-use enforcement)
      await client.query(`UPDATE otp_requests SET used_at = NOW() WHERE otp_id = $1;`, [activeOtp.id]);

      // 3. Encrypt file URL reference at rest
      const encryptedFileUrl = encrypt(id_proof_file_url || '');

      // 4. Create pending kyc_change_request record (Do NOT update customer_phones yet!)
      const insertRes = await client.query(
        `INSERT INTO kyc_change_requests (
          customer_id, change_type, old_value, new_value, reason, id_proof_type, id_proof_file_url, requested_by, status, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
        RETURNING *;`,
        [
          customer_id,
          change_type,
          oldValue,
          new_value.trim(),
          reason.trim(),
          id_proof_type || 'Aadhaar',
          encryptedFileUrl,
          requested_by || null,
          tenant_id,
        ]
      );

      await client.query('COMMIT');

      const savedRecord = insertRes.rows[0];
      savedRecord.id_proof_file_url = decrypt(savedRecord.id_proof_file_url);

      return {
        status: 'pending',
        message: 'KYC phone update request submitted successfully. Pending admin approval.',
        request: savedRecord,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Fetches pending KYC change requests for admin approval queue
   */
  static async getPendingRequests(tenantId) {
    const res = await pool.query(
      `SELECT k.id, k.customer_id, c.customer_name AS customer_name,
              k.change_type, k.old_value, k.new_value, k.reason,
              k.id_proof_type, k.id_proof_file_url, k.status,
              k.requested_by, u.username AS cashier_username,
              b.branch_name AS branch_name, k.created_at
       FROM kyc_change_requests k
       LEFT JOIN customers c ON k.customer_id = c.customer_id AND k.tenant_id = c.tenant_id
       LEFT JOIN users u ON k.requested_by = u.user_id
       LEFT JOIN branches b ON u.branch_id = b.branch_id
       WHERE k.tenant_id = $1 AND k.status = 'pending'
       ORDER BY k.created_at ASC;`,
      [tenantId]
    );

    return res.rows.map((row) => ({
      ...row,
      id_proof_file_url: decrypt(row.id_proof_file_url),
    }));
  }

  /**
   * Approves a pending KYC change request (Admin / Branch Manager only).
   * Updates customer_phones and logs audit event.
   */
  static async approveRequest({ requestId, reviewer_user_id, reviewer_role, review_notes, tenant_id }) {
    if (!['admin', 'branch_manager'].includes(reviewer_role)) {
      throw { statusCode: 403, message: 'Forbidden: Only admin or branch_manager can approve KYC change requests.' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const kycRes = await client.query(
        `SELECT * FROM kyc_change_requests WHERE id = $1 AND tenant_id = $2 FOR UPDATE;`,
        [requestId, tenant_id]
      );

      if (kycRes.rows.length === 0) {
        throw { statusCode: 404, message: `KYC request ID '${requestId}' not found.` };
      }

      const kycReq = kycRes.rows[0];
      if (kycReq.status !== 'pending') {
        throw { statusCode: 400, message: `KYC request ID '${requestId}' has already been processed (status: ${kycReq.status}).` };
      }

      // 1. Update KYC request status to approved
      await client.query(
        `UPDATE kyc_change_requests
         SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2, updated_at = NOW()
         WHERE id = $3;`,
        [reviewer_user_id, review_notes || 'Approved by administrator', requestId]
      );

      // 2. Update customer_phones table with new phone number
      const updatePhoneRes = await client.query(
        `UPDATE customer_phones
         SET phone_number = $1
         WHERE customer_id = $2 AND tenant_id = $3;`,
        [kycReq.new_value, kycReq.customer_id, tenant_id]
      );

      if (updatePhoneRes.rowCount === 0) {
        // Insert phone record if none existed
        await client.query(
          `INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
           VALUES ($1, $2, TRUE, $3);`,
          [kycReq.customer_id, kycReq.new_value, tenant_id]
        );
      }

      const decryptedFileUrl = decrypt(kycReq.id_proof_file_url);

      // 3. Write immutable audit log event
      await AuditLogService.logEvent({
        action: 'kyc_phone_update_approved',
        entity_type: 'customer',
        entity_id: kycReq.customer_id,
        actor_user_id: reviewer_user_id,
        before_values: { phone_number: kycReq.old_value },
        after_values: { phone_number: kycReq.new_value },
        metadata: {
          kyc_request_id: kycReq.id,
          reason: kycReq.reason,
          id_proof_type: kycReq.id_proof_type,
          id_proof_file_url: decryptedFileUrl,
          review_notes: review_notes || null,
        },
        tenant_id,
        client,
      });

      await client.query('COMMIT');

      return {
        status: 'approved',
        message: `KYC change request approved. Phone number for customer '${kycReq.customer_id}' updated to '${kycReq.new_value}'.`,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rejects a pending KYC change request (Admin / Branch Manager only).
   * Requires mandatory review_notes.
   */
  static async rejectRequest({ requestId, reviewer_user_id, reviewer_role, review_notes, tenant_id }) {
    if (!['admin', 'branch_manager'].includes(reviewer_role)) {
      throw { statusCode: 403, message: 'Forbidden: Only admin or branch_manager can reject KYC change requests.' };
    }

    if (!review_notes || !review_notes.trim()) {
      throw { statusCode: 400, message: 'Review notes are mandatory when rejecting a KYC change request.' };
    }

    const kycRes = await pool.query(
      `SELECT * FROM kyc_change_requests WHERE id = $1 AND tenant_id = $2;`,
      [requestId, tenant_id]
    );

    if (kycRes.rows.length === 0) {
      throw { statusCode: 404, message: `KYC request ID '${requestId}' not found.` };
    }

    const kycReq = kycRes.rows[0];
    if (kycReq.status !== 'pending') {
      throw { statusCode: 400, message: `KYC request ID '${requestId}' has already been processed (status: ${kycReq.status}).` };
    }

    await pool.query(
      `UPDATE kyc_change_requests
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2, updated_at = NOW()
       WHERE id = $3;`,
      [reviewer_user_id, review_notes.trim(), requestId]
    );

    return {
      status: 'rejected',
      message: `KYC change request ID '${requestId}' rejected.`,
    };
  }
}

module.exports = KycService;
