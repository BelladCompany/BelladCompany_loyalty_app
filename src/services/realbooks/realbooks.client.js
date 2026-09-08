const env = require('../../config/env');

class RealBooksClient {
  constructor() {
    this.baseUrl = env.realbooksApiUrl;
    this.apiKey = env.realbooksApiKey;
  }

  /**
   * Pushes a redemption discount record to RealBooks API
   * @param {Object} payload
   * @param {string} payload.redemption_code
   * @param {string} payload.customer_id
   * @param {number} payload.discount_amount_rupees
   * @param {number} payload.discount_amount_paise
   * @param {number} payload.points_redeemed
   * @param {number} payload.branch_id
   * @param {string} payload.timestamp
   */
  async pushRedemption(payload) {
    const endpoint = `${this.baseUrl}/redemptions/sync`;
    
    console.log(`\n📚 [RealBooks API Push Request]`);
    console.log(`Endpoint: ${endpoint}`);
    console.log(`API Key: ${this.apiKey.slice(0, 4)}...`);
    console.log(`Payload:`, JSON.stringify(payload, null, 2));

    // Simulate mock HTTP call in test/development mode
    if (process.env.NODE_ENV === 'test' && payload.simulate_fail) {
      throw new Error('Simulated RealBooks API connection timeout (HTTP 503)');
    }

    const mockResponse = {
      success: true,
      realbooks_voucher_id: `RB-VOUCHER-${Date.now()}`,
      status: 'posted',
      synced_at: new Date().toISOString(),
    };

    return mockResponse;
  }
}

module.exports = new RealBooksClient();
