const rawApiBase = (import.meta.env.VITE_API_URL || '/api').trim();
const cleanBase = rawApiBase.replace(/\/+$/, '');
const API_BASE = cleanBase.startsWith('http') && !cleanBase.endsWith('/api')
  ? `${cleanBase}/api`
  : cleanBase;

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
    const isFormData = options.body instanceof FormData;
    const tenantId = (import.meta.env.VITE_TENANT_ID || 'bellad_and_company').trim();
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'x-tenant-id': tenantId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const config = {
      method: options.method || 'GET',
      headers,
      ...(options.body ? { body: isFormData ? options.body : JSON.stringify(options.body) } : {}),
    };

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const res = await fetch(`${API_BASE}${cleanEndpoint}`, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401 || (res.status === 403 && String(data?.error || '').toLowerCase().includes('token'))) {
        localStorage.removeItem('bac_loyalty_token');
        localStorage.removeItem('bac_loyalty_user');
      }
      let errorMsg = data?.error || data?.message || data?.details?.[0]?.message;
      if (!errorMsg) {
        if (res.status === 405) {
          errorMsg = 'HTTP Error 405 (Method Not Allowed): The API request hit a static host route instead of the backend server. Please verify VITE_API_URL or Vercel proxy rewrites to your Render backend.';
        } else if (res.status === 404) {
          errorMsg = `HTTP Error 404: Endpoint not found (${cleanEndpoint}). Please verify backend routing.`;
        } else if (res.status === 502 || res.status === 503 || res.status === 504) {
          errorMsg = `HTTP Error ${res.status}: Backend service is starting up or temporarily unavailable. If hosted on Render free tier, please wait 30 seconds for the instance to wake up and try again.`;
        } else {
          errorMsg = `HTTP Error ${res.status}`;
        }
      }
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

  // Customer Portal /v1 Endpoints
  static async portalRequestOtp({ name, phone, aadhaar_number, referral_code }) {
    return this.request('/v1/auth/request-otp', {
      method: 'POST',
      body: { name, phone, aadhaar_number, referral_code },
    });
  }

  static async portalOtpVerify({ name, phone, otp, aadhaar_number, referral_code }) {
    const res = await this.request('/v1/auth/otp-verify', {
      method: 'POST',
      body: { name, phone, otp, aadhaar_number, referral_code },
    });
    if (res?.token) {
      this.setToken(res.token);
      this.setUser({ ...res.customer, is_new_enrollment: res.is_new_enrollment });
    }
    return res;
  }

  static async portalVerifyOtp(payload) {
    return this.portalOtpVerify(payload);
  }

  static async portalGetMe() {
    return this.request('/v1/me');
  }

  static async portalGetLedger(cursor = null) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return this.request(`/v1/me/ledger${query}`);
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

  static async grantInhouseBonus(payload) {
    return this.request('/points/inhouse-bonus', {
      method: 'POST',
      body: payload,
    });
  }

  // Transactions Sync & Idempotency Lookup
  static async syncTransaction(payload) {
    return this.request('/transactions/sync', {
      method: 'POST',
      body: payload,
    });
  }

  static async lookupTransaction(category, identifier, branchId = 1) {
    const params = new URLSearchParams({
      category: category || 'service',
      identifier: identifier || '',
      branch_id: branchId,
    });
    return this.request(`/transactions/lookup?${params.toString()}`);
  }

  // Create Customer
  static async requestCustomerCreationOtp(phone) {
    return this.request('/customers/request-creation-otp', {
      method: 'POST',
      body: { phone },
    });
  }

  static async createCustomer(payload) {
    return this.request('/customers', {
      method: 'POST',
      body: payload,
    });
  }

  // Redemptions & Earning OTP Request
  static async requestOtp(param) {
    let body = {};
    if (typeof param === 'object' && param !== null) {
      if (param.phone_number) {
        body = { phone: String(param.phone_number).replace(/[^\d+]/g, '') };
      } else {
        body = { ...param };
        if (body.phone) body.phone = String(body.phone).replace(/[^\d+]/g, '');
      }
    } else {
      const clean = String(param || '').trim();
      const digitsOnly = clean.replace(/[^\d]/g, '');
      if (digitsOnly.length >= 10) {
        body = { phone: digitsOnly.length === 10 ? digitsOnly : (digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly) };
      } else if (clean) {
        body = { customer_id: clean };
      }
    }
    return this.request('/redemptions/otp/request', {
      method: 'POST',
      body,
    });
  }

  static async redeemPoints(payload) {
    return this.request('/redemptions/redeem', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Returns locked/eligible/expired status for a vehicle before the cashier initiates OTP.
   * @param {number} vehicleId
   * @param {string} [category] - optional redemption category (e.g. 'accessories')
   */
  static async getVehicleRedemptionStatus(vehicleId, category = null) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/redemptions/vehicle/${vehicleId}/status${query}`);
  }

  // Admin Customer Redemptions List (Admin Dashboard only)
  static async getCustomerRedemptions(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, v);
      }
    });
    const query = searchParams.toString();
    return this.request(`/admin/customer-redemptions${query ? `?${query}` : ''}`);
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

  static async getAppSheetWebhookLogs() {
    return this.request('/admin/appsheet-logs');
  }

  // Referrals
  static async getByReferralCode(code) {
    const encoded = encodeURIComponent(code.trim());
    return this.request(`/customers/by-referral-code/${encoded}`);
  }

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

  // Public Referral Lead Generation
  static async getPublicReferralInfo(referrerCode) {
    const encoded = encodeURIComponent(referrerCode.trim());
    return this.request(`/public/referral-info/${encoded}`);
  }

  static async requestPublicLeadOtp(payload) {
    return this.request('/public/referral-leads/request-otp', {
      method: 'POST',
      body: payload,
    });
  }

  static async verifyPublicLeadOtp(payload) {
    return this.request('/public/referral-leads/verify-otp', {
      method: 'POST',
      body: payload,
    });
  }

  // Admin Referral Leads Pipeline
  static async getReferralLeadsPipeline(status = 'all', search = '') {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/referrals/leads/pipeline${query}`);
  }

  static async confirmRcCompletion(leadId) {
    return this.request(`/referrals/leads/${leadId}/confirm-rc`, {
      method: 'POST',
    });
  }

  static async sendReferralReminder(customerId, phone) {
    return this.request('/referrals/send-reminder', {
      method: 'POST',
      body: { customer_id: customerId, phone },
    });
  }

  // Corrections API
  static async previewCorrection(payload) {
    return this.request('/corrections/preview', {
      method: 'POST',
      body: payload,
    });
  }

  static async raiseCorrection(formData) {
    return this.request('/corrections/raise', {
      method: 'POST',
      body: formData,
    });
  }

  static async getCorrectionRequests(status = 'pending') {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/admin/corrections/list${query}`);
  }

  static async approveCorrection(id, reviewNotes) {
    return this.request(`/admin/corrections/${id}/approve`, {
      method: 'POST',
      body: { review_notes: reviewNotes },
    });
  }

  static async rejectCorrection(id, reviewNotes) {
    return this.request(`/admin/corrections/${id}/reject`, {
      method: 'POST',
      body: { review_notes: reviewNotes },
    });
  }

  static getCorrectionProofUrl(filename) {
    const token = this.getToken();
    return `${API_BASE}/corrections/proof/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`;
  }

  // WhatsApp Message Logs (Admin)
  static async getWhatsAppLogs(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/admin/whatsapp-logs${query}`);
  }

  // Manual WhatsApp Sends & Message Log Viewer
  static async sendPointsEarnedNow(payload) {
    return this.request('/notifications/points-earned/send', {
      method: 'POST',
      body: payload,
    });
  }

  static async sendRedemptionNow(payload) {
    return this.request('/notifications/redemption/send', {
      method: 'POST',
      body: payload,
    });
  }

  static async getNotificationLogs(limit = 20) {
    return this.request(`/notifications/logs?limit=${encodeURIComponent(limit)}`);
  }

  // Metadata
  static async getBranches() {
    return this.request('/branches');
  }

  // KYC Change Requests
  static async submitKycChange(customerId, formData) {
    return this.request(`/customers/${customerId}/kyc-change`, {
      method: 'POST',
      body: formData,
    });
  }

  static async getPendingKycRequests(status = 'pending') {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/admin/kyc-change/pending${q}`);
  }

  static async approveKycRequest(requestId, reviewNotes) {
    return this.request(`/admin/kyc-change/${requestId}/approve`, {
      method: 'POST',
      body: { review_notes: reviewNotes },
    });
  }

  static async rejectKycRequest(requestId, reviewNotes) {
    return this.request(`/admin/kyc-change/${requestId}/reject`, {
      method: 'POST',
      body: { review_notes: reviewNotes },
    });
  }

  // Public Balance Pass
  static async getPublicBalance(token) {
    return this.request(`/public/balance/${encodeURIComponent(token)}`);
  }

  // Reports
  static async getPointsSummaryReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports/points-summary${query ? `?${query}` : ''}`);
  }

  static async getCustomerDistributionReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports/customer-distribution${query ? `?${query}` : ''}`);
  }

  static async getPointsLiabilityReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports/liability${query ? `?${query}` : ''}`);
  }

  static async getReferralConversionReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports/referrals${query ? `?${query}` : ''}`);
  }

  static async getKycAuditReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports/kyc-audit${query ? `?${query}` : ''}`);
  }

  static async downloadReportCsv(reportEndpoint, params = {}) {
    const token = this.getToken();
    const queryParams = new URLSearchParams({ ...params, format: 'csv' }).toString();
    const res = await fetch(`${API_BASE}/reports/${reportEndpoint}?${queryParams}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to export CSV (HTTP ${res.status})`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportEndpoint}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  // ─── Gift Cards (Amazon Style) ─────────────────────────────────────────────
  static async getGiftCards(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/gift-cards${query ? `?${query}` : ''}`);
  }

  static async issueGiftCard(payload) {
    return this.request('/gift-cards/issue', {
      method: 'POST',
      body: payload,
    });
  }

  static async lookupGiftCard(cardNumber, pinCode) {
    return this.request('/gift-cards/lookup', {
      method: 'POST',
      body: { card_number: cardNumber, pin_code: pinCode },
    });
  }

  static async claimGiftCard(payload) {
    return this.request('/gift-cards/claim', {
      method: 'POST',
      body: payload,
    });
  }

  static async redeemGiftCardAtPos(payload) {
    return this.request('/gift-cards/redeem', {
      method: 'POST',
      body: payload,
    });
  }

  static async portalGetMyGiftCards() {
    return this.request('/v1/me/gift-cards');
  }

  static async portalClaimGiftCard(cardNumber, pinCode) {
    return this.request('/v1/me/gift-cards/claim', {
      method: 'POST',
      body: { card_number: cardNumber, pin_code: pinCode },
    });
  }

  static async portalGetReferrals() {
    return this.request('/v1/me/referrals');
  }

  static async portalSubmitReferral(payload) {
    return this.request('/v1/me/referrals/submit', {
      method: 'POST',
      body: payload,
    });
  }

  static async portalClaimReferral(referral_id) {
    return this.request('/v1/me/referrals/claim', {
      method: 'POST',
      body: { referral_id },
    });
  }

  // ─── Multi-Tenant Firms Management ─────────────────────────────────────────
  static async getFirms() {
    return this.request('/tenants/firms');
  }

  static async createFirm(payload) {
    return this.request('/tenants/firms', {
      method: 'POST',
      body: payload,
    });
  }

  static async updateFirm(tenantId, payload) {
    return this.request(`/tenants/firms/${encodeURIComponent(tenantId)}`, {
      method: 'PATCH',
      body: payload,
    });
  }

  // ─── Master Rule Editor ("App Brain") ─────────────────────────────────────
  static async getMasterRules(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/master-rules${qs ? `?${qs}` : ''}`);
  }

  static async getMasterRuleLookups() {
    return this.request('/master-rules/lookups');
  }

  static async createMasterRule(payload) {
    return this.request('/master-rules', {
      method: 'POST',
      body: payload,
    });
  }

  static async updateMasterRule(id, payload) {
    return this.request(`/master-rules/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
    });
  }

  static async deleteMasterRule(id) {
    return this.request(`/master-rules/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  static async approveMasterRule(id, approval_notes = 'Approved by Executive Director') {
    return this.request(`/master-rules/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: { approval_notes },
    });
  }

  static async rejectMasterRule(id, rejection_reason = 'Rejected by management') {
    return this.request(`/master-rules/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: { rejection_reason },
    });
  }

  static async toggleActiveMasterRule(id) {
    return this.request(`/master-rules/${encodeURIComponent(id)}/toggle-active`, {
      method: 'POST',
    });
  }

  static async simulateMasterRule(payload) {
    return this.request('/master-rules/simulate', {
      method: 'POST',
      body: payload,
    });
  }

  // ─── Master Rule User Control & Custom Schemes ─────────────────────────
  static async getMasterUsers() {
    return this.request('/master-rules/users/list');
  }

  static async updateMasterUserRole(id, role) {
    return this.request(`/master-rules/users/${encodeURIComponent(id)}/role`, {
      method: 'PATCH',
      body: { role },
    });
  }

  static async createMasterUser(payload) {
    return this.request('/master-rules/users', {
      method: 'POST',
      body: payload,
    });
  }

  static async registerCustomScheme(payload) {
    return this.request('/master-rules/schemes/register', {
      method: 'POST',
      body: payload,
    });
  }

  // ─── Customer Priority Tiers (Silver, Gold, Platinum/VIP) ──────────────────
  static async getMasterPriorityTiers(tenantId) {
    const q = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    return this.request(`/master-rules/priority-tiers${q}`);
  }

  static async saveMasterPriorityTier(payload) {
    return this.request('/master-rules/priority-tiers', {
      method: 'POST',
      body: payload,
    });
  }

  // ─── Dealership Specific Policy & Active Modules ────────────────────────────
  static async getDealershipPolicy(tenantId) {
    const q = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    return this.request(`/master-rules/dealerships/policy${q}`);
  }

  static async saveDealershipPolicy(payload) {
    return this.request('/master-rules/dealerships/policy', {
      method: 'POST',
      body: payload,
    });
  }

  // ─── Points Gain Formulas across All 6 Categories ───────────────────────────
  static async getPointsFormulas(tenantId) {
    const q = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    return this.request(`/master-rules/points-formulas${q}`);
  }

  static async savePointsFormula(payload) {
    return this.request('/master-rules/points-formulas', {
      method: 'POST',
      body: payload,
    });
  }

  // ─── Live Policy Simulator (Testing dummy customer & all rules) ──────────────
  static async simulateMasterRule(payload) {
    return this.request('/master-rules/simulate', {
      method: 'POST',
      body: payload,
    });
  }

  // ─── White-Label Rules Engine Platform V2 Endpoints ─────────────────────────
  static async getPlatformActiveRules(tenantId) {
    const q = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    return this.request(`/platform/rules/active${q}`);
  }

  static async getPlatformVersions(tenantId) {
    const q = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    return this.request(`/platform/rules/versions${q}`);
  }

  static async savePlatformDraft(payload) {
    return this.request('/platform/rules/draft', {
      method: 'POST',
      body: payload,
    });
  }

  static async simulatePlatformRules(payload) {
    return this.request('/platform/rules/simulate', {
      method: 'POST',
      body: payload,
    });
  }

  static async publishPlatformRules(versionNumber, tenantId) {
    return this.request('/platform/rules/publish', {
      method: 'POST',
      body: { version_number: versionNumber, tenant_id: tenantId },
    });
  }

  static async rollbackPlatformRules(targetVersionNumber, tenantId) {
    return this.request('/platform/rules/rollback', {
      method: 'POST',
      body: { target_version_number: targetVersionNumber, tenant_id: tenantId },
    });
  }

  static async getPlatformBranding(tenantId) {
    const q = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    return this.request(`/platform/rules/branding${q}`);
  }

  static async updatePlatformBranding(payload) {
    return this.request('/platform/rules/branding', {
      method: 'PUT',
      body: payload,
    });
  }

  // ─── Customer Gifting System APIs ─────────────────────────────────────────
  static async createGiftFromPoints(payload) {
    return this.request('/gifts/create-from-points', {
      method: 'POST',
      body: payload,
    });
  }

  static async createGiftFromRazorpay(payload) {
    return this.request('/gifts/create-from-razorpay', {
      method: 'POST',
      body: payload,
    });
  }

  static async verifyRazorpayPayment(payload) {
    return this.request('/gifts/verify-razorpay-payment', {
      method: 'POST',
      body: payload,
    });
  }

  static async getGiftByClaimToken(token) {
    return this.request(`/gifts/claim/${encodeURIComponent(token)}`);
  }

  static async claimGift(token, payload) {
    return this.request(`/gifts/claim/${encodeURIComponent(token)}`, {
      method: 'POST',
      body: payload,
    });
  }

  static async getMySentGifts() {
    return this.request('/gifts/my-sent-gifts');
  }
  // ─── Customer Portal KYC Correction ───────────────────────────────────────
  static async portalRequestKycOtp() {
    return this.request('/v1/me/kyc/request-otp', {
      method: 'POST',
    });
  }

  static async portalSubmitKycCorrection(formData) {
    return this.request('/v1/me/kyc/submit', {
      method: 'POST',
      body: formData,
    });
  }

  static async portalGetMyKycRequests() {
    return this.request('/v1/me/kyc/history');
  }

  // ─── Admin Gift Cards & Referral Rewards ──────────────────────────────────
  static async getAdminGiftCards(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/admin/gift-cards${qs ? `?${qs}` : ''}`);
  }

  static async getAdminReferrals(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/admin/referrals${qs ? `?${qs}` : ''}`);
  }
}

export default ApiService;


