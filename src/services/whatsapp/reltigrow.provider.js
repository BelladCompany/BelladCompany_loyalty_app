/**
 * ReltigrowWhatsAppProvider
 *
 * Calls the Reltigrow WhatsApp Business API to send messages.
 * Configured via environment variables:
 *   RELTIGROW_API_URL  - Base API URL (e.g. https://api.reltigrow.com/v1)
 *   RELTIGROW_API_KEY  - API key issued by Reltigrow
 *
 * Falls back gracefully to a mock log if env vars are absent.
 */

const https = require('https');
const http = require('http');
const { BaseWhatsAppProvider } = require('./whatsapp.provider');
/**
 * Normalizes any input phone format into Reltigrow's required E.164 format: +91XXXXXXXXXX
 * Handles: "9876543210", "919876543210", "+919876543210", with stray spaces/dashes.
 */
function normalizeToE164India(rawPhone) {
  const digitsOnly = String(rawPhone).replace(/[^\d]/g, ''); // strip +, spaces, dashes

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.length === 13 && digitsOnly.startsWith('091')) {
    return `+91${digitsOnly.slice(3)}`;
  }
  return digitsOnly.startsWith('+') ? digitsOnly : `+${digitsOnly}`;
}
class ReltigrowWhatsAppProvider extends BaseWhatsAppProvider {
  constructor() {
    super();
    this.name = 'ReltigrowWhatsAppProvider';
    this.apiUrl = process.env.RELTIGROW_API_URL || '';
    this.apiKey = process.env.RELTIGROW_API_KEY || '';
  }

  /**
   * Sends a WhatsApp message via the Reltigrow API.
   * @param {Object} options
   * @param {string} options.toPhone - Recipient phone number (e.g. "9876543210")
   * @param {string} options.message - Formatted message body
   * @param {string} [options.templateName] - Optional: Reltigrow template name
   * @returns {Promise<{ success: boolean, messageId: string, provider: string }>}
   */
  async sendMessage({ toPhone, templateName, params = [] }) {
    const normalizedPhone = normalizeToE164India(toPhone);

    if (!this.apiUrl || !this.apiKey) {
      console.warn('[ReltigrowProvider] RELTIGROW_API_URL or RELTIGROW_API_KEY not set. Falling back to mock log.');
      const msgId = `WA-MOCK-RTG-${Date.now()}`;
      console.log(`📲 [Reltigrow Mock] To: ${normalizedPhone} | Template: ${templateName} | Params:`, params);
      return { success: true, messageId: msgId, provider: this.name, status: 'mock' };
    }

    // Reltigrow requires each template variable as a separate top-level field:
    // field_1 = body parameter 1, field_2 = body parameter 2, etc.
    const fieldParams = params.reduce((acc, value, index) => {
      acc[`field_${index + 1}`] = String(value);
      return acc;
    }, {});

    const payload = JSON.stringify({
      phone: normalizedPhone,
      template_name: templateName,
      language: 'en',
      ...fieldParams,
    });

    // ...rest of the https.request code stays exactly the same, just uses this new `payload`

    return new Promise((resolve, reject) => {
      try {
        const url = new URL(`${this.apiUrl}/messages/template`);
        const isHttps = url.protocol === 'https:';
        const transport = isHttps ? https : http;

        const options = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + (url.search || ''),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json',
          },
        };

        const req = transport.request(options, (res) => {
          let raw = '';
          res.on('data', (chunk) => (raw += chunk));
          res.on('end', () => {
            try {
              const body = JSON.parse(raw);
              if (res.statusCode >= 200 && res.statusCode < 300) {
                const messageId = body?.message_id || body?.id || `WA-RTG-${Date.now()}`;
                console.log(`✅ [Reltigrow] Sent to ${normalizedPhone} | MsgID: ${messageId}`);
                resolve({ success: true, messageId, provider: this.name, status: 'sent' });
              } else {
                const errMsg = body?.message || body?.error || `HTTP ${res.statusCode}`;
                console.error(`❌ [Reltigrow] API Error ${res.statusCode}: ${errMsg}`);
                resolve({ success: false, error: errMsg, provider: this.name, status: 'failed' });
              }
            } catch (parseErr) {
              console.error('[Reltigrow] Failed to parse API response:', raw);
              resolve({ success: false, error: 'Invalid JSON response from Reltigrow API', provider: this.name, status: 'failed' });
            }
          });
        });

        req.on('error', (err) => {
          console.error('[Reltigrow] Network error:', err.message);
          resolve({ success: false, error: err.message, provider: this.name, status: 'failed' });
        });

        req.setTimeout(10000, () => {
          req.destroy();
          resolve({ success: false, error: 'Reltigrow API request timed out after 10s', provider: this.name, status: 'failed' });
        });

        req.write(payload);
        req.end();
      } catch (err) {
        resolve({ success: false, error: err.message, provider: this.name, status: 'failed' });
      }
    });
  }


  /**
 * Sends an OTP via Reltigrow's dedicated authentication template endpoint.
 * Separate from sendMessage() because auth templates use a different
 * endpoint and body shape than regular utility templates.
 * @param {Object} options
 * @param {string} options.toPhone - Recipient phone, any format
 * @param {string} options.templateName - Approved AUTHENTICATION-category template name
 * @param {string} options.code - The OTP code to embed (generated by our own server)
 * @param {number} [options.expiryMinutes] - Minutes until this code expires
 * @returns {Promise<{ success: boolean, messageId: string, provider: string }>}
 */
  async sendOtpTemplate({ toPhone, templateName, code, expiryMinutes = 5 }) {
    const normalizedPhone = normalizeToE164India(toPhone);

    if (!this.apiUrl || !this.apiKey) {
      console.warn('[ReltigrowProvider] RELTIGROW_API_URL or RELTIGROW_API_KEY not set. Falling back to mock log.');
      const msgId = `WA-MOCK-RTG-OTP-${Date.now()}`;
      console.log(`📲 [Reltigrow Mock OTP] To: ${normalizedPhone} | Template: ${templateName} | Code: ${code}`);
      return { success: true, messageId: msgId, provider: this.name, status: 'mock' };
    }

    const payload = JSON.stringify({
      phone: normalizedPhone,
      template_name: templateName,
      code: String(code).padStart(6, '0'),
      language: 'en',
      expiry_minutes: expiryMinutes,
      purpose: 'authentication',
    });

    return new Promise((resolve, reject) => {
      try {
        const url = new URL(`${this.apiUrl}/auth/send-otp`);
        const isHttps = url.protocol === 'https:';
        const transport = isHttps ? https : http;

        const options = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + (url.search || ''),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json',
          },
        };

        const req = transport.request(options, (res) => {
          let raw = '';
          res.on('data', (chunk) => (raw += chunk));
          res.on('end', () => {
            try {
              const body = JSON.parse(raw);
              if (res.statusCode >= 200 && res.statusCode < 300 && body.success !== false) {
                const messageId = body?.data?.message_id || body?.message_id || `WA-RTG-OTP-${Date.now()}`;
                console.log(`✅ [Reltigrow OTP] Sent to ${normalizedPhone} | MsgID: ${messageId} | FULL RESPONSE:`, JSON.stringify(body));
                resolve({ success: true, messageId, provider: this.name, status: 'sent' });
              } else {
                const errMsg = body?.error?.message || body?.error?.details?.error || body?.message || `HTTP ${res.statusCode}`;
                console.error(`❌ [Reltigrow OTP] API Error ${res.statusCode}: ${errMsg} | RAW:`, raw);
                resolve({ success: false, error: errMsg, provider: this.name, status: 'failed' });
              }
            } catch (parseErr) {
              console.error(`[Reltigrow OTP] Failed to parse API response (HTTP ${res.statusCode}):`, raw);
              resolve({ success: false, error: `Invalid JSON response (HTTP ${res.statusCode}): ${raw.slice(0, 200)}`, provider: this.name, status: 'failed' });
            }
          });
        });

        req.on('error', (err) => {
          console.error('[Reltigrow OTP] Network error:', err.message);
          resolve({ success: false, error: err.message, provider: this.name, status: 'failed' });
        });

        req.setTimeout(10000, () => {
          req.destroy();
          resolve({ success: false, error: 'Reltigrow OTP API request timed out after 10s', provider: this.name, status: 'failed' });
        });

        req.write(payload);
        req.end();
      } catch (err) {
        resolve({ success: false, error: err.message, provider: this.name, status: 'failed' });
      }
    });
  }
}

module.exports = { ReltigrowWhatsAppProvider };
