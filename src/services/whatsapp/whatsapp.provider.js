/**
 * Pluggable WhatsApp Provider Interface and Provider Factory
 *
 * Provider selection (in priority order):
 *  1. ReltigrowWhatsAppProvider  - when RELTIGROW_API_KEY + RELTIGROW_API_URL are set
 *  2. MockWhatsAppProvider       - development / CI fallback (console-only, no real API calls)
 */

class BaseWhatsAppProvider {
  /**
   * Sends a WhatsApp template message to a phone number
   * @param {Object} options
   * @param {string} options.toPhone       - Target phone number (e.g. +919876543210)
   * @param {string} options.templateName  - Approved WhatsApp template name
   * @param {Array<string>} options.params - Ordered values for {{1}}, {{2}}, etc. in the template
   * @returns {Promise<{ success: boolean, messageId: string, provider: string }>}
   */
  async sendMessage({ toPhone, templateName, params = [] }) {
    throw new Error('BaseWhatsAppProvider.sendMessage must be implemented by concrete provider');
  }
}

class MockWhatsAppProvider extends BaseWhatsAppProvider {
  constructor() {
    super();
    this.name = 'MockWhatsAppProvider';
    this.sentMessages = [];
  }

  async sendMessage({ toPhone, templateName, params = [] }) {
    const messageId = `WA-MOCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const logEntry = {
      messageId,
      toPhone,
      templateName,
      params,
      provider: this.name,
      status: 'delivered',
      timestamp: new Date().toISOString(),
    };

    this.sentMessages.push(logEntry);
    console.log(`\n📲 [WhatsApp Notification Sent via ${this.name}]`);
    console.log(`Recipient: ${toPhone}`);
    console.log(`Template: ${templateName}`);
    console.log(`Params:`, params);
    console.log(`Message ID: ${messageId}\n`);

    return {
      success: true,
      messageId,
      provider: this.name,
      status: 'delivered',
    };
  }
  async sendOtpTemplate({ toPhone, templateName, code, expiryMinutes = 5 }) {
    const messageId = `WA-MOCK-OTP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log(`\n📲 [WhatsApp OTP Sent via ${this.name}]`);
    console.log(`Recipient: ${toPhone}`);
    console.log(`Template: ${templateName}`);
    console.log(`Code: ${code} | Expiry: ${expiryMinutes}min`);
    return { success: true, messageId, provider: this.name, status: 'delivered' };
  }
}

let providerInstance = null;

function getWhatsAppProvider() {
  if (!providerInstance) {
    // Switch to Reltigrow provider when credentials are configured
    if (process.env.RELTIGROW_API_KEY && process.env.RELTIGROW_API_URL) {
      const { ReltigrowWhatsAppProvider } = require('./reltigrow.provider');
      providerInstance = new ReltigrowWhatsAppProvider();
      console.log('📡 [WhatsApp] Using ReltigrowWhatsAppProvider');
    } else {
      providerInstance = new MockWhatsAppProvider();
      console.log('📡 [WhatsApp] Using MockWhatsAppProvider (set RELTIGROW_API_KEY + RELTIGROW_API_URL to enable real sends)');
    }
  }
  return providerInstance;
}

// Allow resetting provider (useful for tests)
function resetWhatsAppProvider() {
  providerInstance = null;
}

module.exports = {
  BaseWhatsAppProvider,
  MockWhatsAppProvider,
  getWhatsAppProvider,
  resetWhatsAppProvider,
};
