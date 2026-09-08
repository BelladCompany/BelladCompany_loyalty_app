const API_BASE = '/api';

export class ApiService {
  static getToken() {
    return localStorage.getItem('bac_loyalty_token') || '';
  }

  static setToken(token) {
    if (token) {
      localStorage.setItem('bac_loyalty_token', token);
    } else {
      localStorage.removeItem('bac_loyalty_token');
    }
  }

  static getUser() {
    try {
      const userStr = localStorage.getItem('bac_loyalty_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  }

  static setUser(user) {
    if (user) {
      localStorage.setItem('bac_loyalty_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('bac_loyalty_user');
    }
  }

  static async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const config = {
      method: options.method || 'GET',
      headers,
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data?.error || data?.message || data?.details?.[0]?.message || `HTTP Error ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  // Auth Endpoints
  static async login(username, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    if (res.data?.token) {
      this.setToken(res.data.token);
      this.setUser(res.data.user);
    }
    return res.data;
  }

  static async getMe() {
    return this.request('/auth/me');
  }

  static logout() {
    this.setToken(null);
    this.setUser(null);
  }

  // Search Endpoint
  static async search(query) {
    const encoded = encodeURIComponent(query.trim());
    return this.request(`/search?q=${encoded}`);
  }

  static async searchByName(name, limit = 10) {
    const encoded = encodeURIComponent(name.trim());
    return this.request(`/search?name=${encoded}&limit=${limit}`);
  }

  // Customer 360 & Ledger
  static async getCustomer(customerId) {
    return this.request(`/customers/${customerId}`);
  }

  static async getCustomerLedger(customerId) {
    return this.request(`/customers/${customerId}/ledger?limit=100`);
  }

  // Points Earning
  static async earnPoints(payload) {
    return this.request('/points/earn', {
      method: 'POST',
      body: payload,
    });
  }

  // Create Customer
  static async createCustomer(payload) {
    return this.request('/customers', {
      method: 'POST',
      body: payload,
    });
  }

  // Redemptions
  static async requestOtp(phone) {
    return this.request('/redemptions/otp/request', {
      method: 'POST',
      body: { phone },
    });
  }

  static async redeemPoints(payload) {
    return this.request('/redemptions/redeem', {
      method: 'POST',
      body: payload,
    });
  }

  // Admin & Duplicates Merge
  static async getDuplicateQueue() {
    return this.request('/admin/duplicates/queue');
  }

  static async approveMerge(payload) {
    return this.request('/admin/duplicates/merge', {
      method: 'POST',
      body: payload,
    });
  }

  static async getMergeLogs() {
    return this.request('/admin/duplicates/logs');
  }

  // Referrals
  static async getReferrals(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/referrals${query}`);
  }

  static async registerReferral(payload) {
    return this.request('/referrals', {
      method: 'POST',
      body: payload,
    });
  }

  static async approveReferral(referralId, payload) {
    return this.request(`/referrals/${referralId}/approve`, {
      method: 'POST',
      body: payload,
    });
  }

  static async getReferralApprovers() {
    return this.request('/referrals/approvers/list');
  }

  // WhatsApp Message Logs (Admin)
  static async getWhatsAppLogs(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/admin/whatsapp-logs${query}`);
  }

  // Metadata
  static async getBranches() {
    return this.request('/branches');
  }
}

export default ApiService;
