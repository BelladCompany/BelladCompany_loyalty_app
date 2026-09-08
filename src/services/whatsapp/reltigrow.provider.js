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
  async sendMessage({ toPhone, templateName, params = [], language = 'en' }) {
    if (!this.apiUrl || !this.apiKey) {
      console.warn('[ReltigrowProvider] RELTIGROW_API_URL or RELTIGROW_API_KEY not set. Falling back to mock log.');
      const msgId = `WA-MOCK-RTG-${Date.now()}`;
      console.log(`📲 [Reltigrow Mock] To: ${toPhone} | Template: ${templateName} | Params:`, params);
      return { success: true, messageId: msgId, provider: this.name, status: 'mock' };
    }

    const payload = JSON.stringify({
      to: toPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components: [
          {
            type: 'body',
            parameters: params.map((value) => ({ type: 'text', text: String(value) })),
          },
        ],
      },
    });

    // ...rest of the https.request code stays exactly the same, just uses this new `payload`

    return new Promise((resolve, reject) => {
      try {
        const url = new URL(`${this.apiUrl}/messages/send`);
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
            'X-Api-Key': this.apiKey,
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
                console.log(`✅ [Reltigrow] Sent to ${toPhone} | MsgID: ${messageId}`);
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
}

module.exports = { ReltigrowWhatsAppProvider };
