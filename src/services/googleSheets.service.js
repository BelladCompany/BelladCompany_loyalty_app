const { pool } = require('../config/db');
const env = require('../config/env');

const TARGET_GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1qiBr8Jkmn9e9W_EuigvpN_4C7DcckP1q-YK25-BbOb0';

class GoogleSheetsService {
  /**
   * Syncs newly enrolled portal customer details to Google Sheet & logs sync status in DB
   */
  static async syncCustomerToSheet({
    customer_id,
    name,
    phone,
    aadhaar_number,
    source = 'Customer Portal Enrollment',
    tenant_id = env.defaultTenantId || 'bellad_and_company',
  }) {
    if (!customer_id) {
      console.warn('[Google Sheets Sync Warning] Missing customer_id for sync.');
      return null;
    }

    const sheetId = process.env.GOOGLE_SHEET_ID || TARGET_GOOGLE_SHEET_ID;
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || null;
    const cleanPhone = phone ? String(phone).replace(/[^\d]/g, '') : '';
    const cleanAadhaar = aadhaar_number ? String(aadhaar_number).replace(/[^\d]/g, '') : '';
    const aadhaarFormatted = cleanAadhaar.length >= 4 ? `XXXX-XXXX-${cleanAadhaar.slice(-4)}` : 'N/A';
    const enrolledAt = new Date().toISOString();

    const payload = {
      sheet_id: sheetId,
      customer_id,
      customer_name: name || 'Valued Customer',
      phone_number: cleanPhone,
      aadhaar_number: aadhaarFormatted,
      source,
      tenant_id,
      enrolled_at: enrolledAt,
    };

    let status = 'success';
    let errorMessage = null;

    // Send HTTP POST if Google Apps Script Webhook URL is configured
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        let responseBody = '';
        try {
          responseBody = await response.text();
        } catch (e) {}

        if (!response.ok) {
          status = 'failed';
          errorMessage = `HTTP ${response.status}: Webhook returned non-200. Response: ${responseBody || '(empty)'}`;
          console.error(`[Google Sheets Sync Failed] customer_id=${customer_id} status=${response.status} body=${responseBody || '(empty)'}`);
        }
      } catch (err) {
        status = 'failed';
        errorMessage = err.message || 'Network error reaching Google Apps Script Webhook URL';
        console.error(`[Google Sheets Sync Network Error] customer_id=${customer_id} error=${errorMessage}`);
      }
    } else {
      status = 'failed';
      errorMessage = 'GOOGLE_SHEET_WEBHOOK_URL is not configured in .env. Apps Script Web App must be published first.';
      console.error(`[Google Sheets Sync Config Missing] ${errorMessage}`);
    }

    // Record sync log in PostgreSQL database table
    try {
      await pool.query(
        `INSERT INTO google_sheets_sync_log (
           sheet_id, customer_id, customer_name, phone_number, aadhaar_number, source, status, error_message, tenant_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
        [
          sheetId,
          customer_id,
          name || 'Valued Customer',
          cleanPhone,
          aadhaarFormatted,
          source,
          status,
          errorMessage,
          tenant_id,
        ]
      );
      if (status === 'success') {
        console.log(`[Google Sheets Sync Success] customer_id=${customer_id} sheet_id=${sheetId}`);
      }
    } catch (dbErr) {
      console.error(`[Google Sheets Log DB Error] customer_id=${customer_id} error=${dbErr.message || dbErr}`);
      if (dbErr.code === '42P01') {
        console.error('[Google Sheets Log DB Error] Table google_sheets_sync_log does not exist. Run: npm run migrate');
      }
    }

    return {
      success: status === 'success',
      sheet_id: sheetId,
      customer_id,
      payload,
      status,
      error_message: errorMessage,
    };
  }

  /**
   * Retrieves Google Sheets sync history for Admin dashboard
   */
  static async getSyncLogs(tenantId = 'bellad_and_company', limit = 50, offset = 0) {
    const res = await pool.query(
      `SELECT id, sheet_id, customer_id, customer_name, phone_number, aadhaar_number,
              source, status, error_message, tenant_id, created_at
       FROM google_sheets_sync_log
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3;`,
      [tenantId, limit, offset]
    );

    return res.rows;
  }
}

module.exports = GoogleSheetsService;
