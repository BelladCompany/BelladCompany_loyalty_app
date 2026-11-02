const env = require('../../config/env');

/**
 * RealBooks Accounting API Client
 * Built to the official RealBooks API Documentation standard:
 * - Base URL: https://api.realbooks.in
 * - Mandatory Header: Content-Type: application/json
 * - Mandatory Header: accountName: <domainName>
 * - Supports safe test sandbox mode (default: REALBOOKS_MODE=test) & live production HTTP mode
 */
class RealBooksClient {
  constructor() {
    const rb = env.realbooks || {};
    this.mode = rb.mode || 'test';
    this.baseUrl = rb.baseUrl || 'https://api.realbooks.in';
    this.domain = rb.domain || 'bellad';
    this.accessKey = rb.accessKey || 'rb_access_test_key';
    this.secretKey = rb.secretKey || 'rb_secret_test_key';
    this.emailId = rb.emailId || 'accounts@bellad.in';
    this.cid = rb.cid || '1001';
    this.segid = rb.segid || '1';
  }

  /**
   * Helper to format JavaScript Date into DD-MM-YYYY required by RealBooks
   */
  formatDate(date = new Date()) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * Generic API caller with built-in test sandbox safety
   */
  async execute(endpoint, payload, actionName = 'Action') {
    const fullUrl = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      accountName: this.domain,
    };

    console.log(`\n==================================================`);
    console.log(`📚 [RealBooks API Request] Action: ${actionName} [Mode: ${this.mode.toUpperCase()}]`);
    console.log(`URL: ${fullUrl}`);
    console.log(`Headers:`, JSON.stringify(headers));
    console.log(`Payload:`, JSON.stringify(payload, null, 2));
    console.log(`==================================================\n`);

    // In test/simulation mode: Don't push real data; simulate verified response
    if (this.mode !== 'live') {
      const mockVoucherId = `RB-TEST-${Date.now()}`;
      const mockLedgerId = `RBL-TEST-${Date.now()}`;
      return {
        success: true,
        mode: 'test',
        simulated: true,
        message: `RealBooks ${actionName} simulated successfully in sandbox mode. (Live accounting data unaffected).`,
        realbooks_voucher_id: mockVoucherId,
        realbooks_ledger_id: mockLedgerId,
        status: 'synced',
        synced_at: new Date().toISOString(),
        request_payload: payload,
        response_payload: {
          status: 'success',
          id: mockVoucherId,
          ledgerId: mockLedgerId,
          mode: 'test_sandbox',
        },
      };
    }

    // Live mode: Perform real HTTPS request
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({ status: response.status, text: response.statusText }));

      if (!response.ok) {
        throw new Error(json.message || json.error || `RealBooks HTTP Error ${response.status}`);
      }

      return {
        success: true,
        mode: 'live',
        simulated: false,
        message: `RealBooks ${actionName} posted successfully.`,
        realbooks_voucher_id: json.id || json.vid || `RB-LIVE-${Date.now()}`,
        realbooks_ledger_id: json.lid || json.ledgerId,
        status: 'synced',
        synced_at: new Date().toISOString(),
        request_payload: payload,
        response_payload: json,
      };
    } catch (err) {
      console.error(`❌ [RealBooks API Error]:`, err.message);
      return {
        success: false,
        mode: 'live',
        simulated: false,
        error: err.message,
        status: 'failed',
        synced_at: new Date().toISOString(),
        request_payload: payload,
        response_payload: { error: err.message },
      };
    }
  }

  /**
   * 1. Create or Update Customer Ledger in RealBooks
   * Documented in API PDF: Section 3 / Page 48-50
   * url: /AMSSERVICE/api/ledger/update/ledgerdetails/{cid}/{segid}
   */
  async createOrUpdateCustomerLedger(customer) {
    const endpoint = `/AMSSERVICE/api/ledger/update/ledgerdetails/${this.cid}/${this.segid}`;

    const partyDet = {
      contactPerson: customer.name || customer.customer_name || 'Customer',
      address: customer.address || 'Dealership Customer',
      phone: customer.phone || customer.phone_number || '',
      email: customer.email || '',
      pan: customer.pan_no || '',
      gstin: customer.gst_number || '',
      city: customer.city || 'Hubli',
      stateName: customer.state || 'Karnataka',
      country: 'India',
    };

    const payload = {
      accessKey: this.accessKey,
      secretKey: this.secretKey,
      emailid: this.emailId,
      ledger: {
        id: customer.realbooks_lid || 0, // 0 for creation
        ledgerName: customer.ledger_name || `${customer.name} (${customer.customer_id})`,
        printName: customer.name || 'Customer',
        chqFavName: customer.name || 'Customer',
        ledgerCode: customer.customer_id || '',
        crLimit: 0.0,
        crPeriod: 0,
        ledgerGroupName: customer.ledger_group || 'Sundry Debtors',
        ledgerCategory: 'party',
        groupNature: 'Asset',
        partyDet,
      },
    };

    return this.execute(endpoint, payload, 'Customer Ledger Creation / Sync');
  }

  /**
   * 2. Create Account Voucher in RealBooks (Double Entry)
   * Documented in API PDF: Section 2 / Page 39-44
   * url: /AMSSERVICE/api/accv/v2/vcreate/{cid}/{segid}
   */
  async createAccountVoucher({
    receiptNo,
    customerName,
    customerId,
    billAmount,
    discountAmount = 0,
    cashPaid,
    category = 'service',
    jobCard = '',
    branchName = 'Bellad Hubli',
    date = new Date(),
  }) {
    const endpoint = `/AMSSERVICE/api/accv/v2/vcreate/${this.cid}/${this.segid}`;
    const dateStr = this.formatDate(date);

    const numBill = Number(billAmount || 0);
    const numDiscount = Number(discountAmount || 0);
    const numCash = Number(cashPaid || Math.max(0, numBill - numDiscount));

    // Double Entry Ledger Breakdown
    const ledgerDetails = [];

    // Debit 1: Cash/Bank Received
    if (numCash > 0) {
      ledgerDetails.push({
        ledger: {
          id: 0,
          ledgerName: 'Cash Account',
          ledgerGroupName: 'Cash-in-hand',
          ledgerCode: 'CASH-001',
        },
        amountType: 'dr',
        amount: numCash,
        ledgerType: 'general',
        date: dateStr,
      });
    }

    // Debit 2: Loyalty Discount Allowed (Points Redeemed Discount)
    if (numDiscount > 0) {
      ledgerDetails.push({
        ledger: {
          id: 0,
          ledgerName: 'Loyalty Points Discount Allowed',
          ledgerGroupName: 'Indirect Expenses',
          ledgerCode: 'DISC-LOYALTY',
        },
        amountType: 'dr',
        amount: numDiscount,
        ledgerType: 'general',
        date: dateStr,
      });
    }

    // Credit: Customer Party Ledger for Total Bill Amount
    ledgerDetails.push({
      ledger: {
        id: 0,
        ledgerName: `${customerName || 'Customer'} (${customerId})`,
        ledgerGroupName: 'Sundry Debtors',
        ledgerCode: customerId,
      },
      amountType: 'cr',
      amount: numBill,
      ledgerType: 'party',
      date: dateStr,
    });

    const payload = {
      secretKey: this.secretKey,
      accessKey: this.accessKey,
      emailid: this.emailId,
      json_obj: {
        id: 0,
        transactionDate: dateStr,
        transactionNumber: receiptNo,
        transactionType: 'Receipt',
        transactionDescription: `Loyalty ${category.toUpperCase()} Receipt #${receiptNo} - Bill: ₹${numBill}, Loyalty Discount: ₹${numDiscount}, Cash Paid: ₹${numCash}`,
        workOrderNumber: jobCard || '',
        ledgerDetails,
      },
    };

    return this.execute(endpoint, payload, 'Receipt Voucher Creation (Double Entry)');
  }

  /**
   * Backwards-compatible pushRedemption
   */
  async pushRedemption(payload) {
    return this.createAccountVoucher({
      receiptNo: payload.receipt_no || payload.redemption_code,
      customerName: payload.customer_name || 'Loyalty Customer',
      customerId: payload.customer_id,
      billAmount: payload.bill_amount || (payload.discount_amount_rupees || 0),
      discountAmount: payload.discount_amount_rupees || 0,
      cashPaid: Math.max(0, (payload.bill_amount || 0) - (payload.discount_amount_rupees || 0)),
      category: payload.category || 'service',
      date: payload.timestamp ? new Date(payload.timestamp) : new Date(),
    });
  }
}

module.exports = new RealBooksClient();
