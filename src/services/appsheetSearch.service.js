require('dotenv').config();

const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID || '85112c57-b39f-4afc-b060-e02d6f0c62de';
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY || 'V2-bBqbC-E7Azn-N1ZiX-0rP1U-VWziM-7N84O-F9LCE-1eYrY';
const TABLE_NAME = process.env.APPSHEET_TABLE_NAME || 'VIN order form';

let cachedPrDoneRows = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in-memory cache

class AppSheetSearchService {
  /**
   * Fetches all rows from AppSheet Cloud API and filters STRICTLY for PR Done rows
   */
  static async fetchPrDoneRows(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedPrDoneRows && (now - lastCacheTime < CACHE_TTL_MS)) {
      return cachedPrDoneRows;
    }

    let targetTable = TABLE_NAME;
    if (targetTable === 'Tally Billing Master') {
      targetTable = 'VIN order form';
    }

    const url = `https://www.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${encodeURIComponent(targetTable)}/Action`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ApplicationAccessKey': APPSHEET_ACCESS_KEY,
      },
      body: JSON.stringify({
        Action: 'Find',
        Properties: { Locale: 'en-US' },
        Rows: [],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AppSheet API error ${response.status}: ${errText}`);
    }

    const rows = await response.json();
    if (!Array.isArray(rows)) {
      return [];
    }

    // 🔒 STRICT FILTER: ONLY rows where PR is Completed ("PR Done")
    const prDoneRows = rows.filter((r) => {
      const billingStatus = String(r['Billing Status'] || '').trim().toLowerCase();
      const status = String(r['Status'] || '').trim().toLowerCase();
      const orderStatus = String(r['Order Form Status'] || '').trim().toLowerCase();

      return (
        billingStatus === 'pr done' ||
        billingStatus.includes('pr done') ||
        billingStatus.includes('pr') ||
        status.includes('pr done') ||
        orderStatus.includes('pr done')
      );
    });

    cachedPrDoneRows = prDoneRows;
    lastCacheTime = now;
    return prDoneRows;
  }

  /**
   * Format an AppSheet PR Done row into standard customer object for dashboard UI
   */
  static formatCustomer(row) {
    const custName = row['Customer Name'] || row['Customer Ledger Name'] || 'Customer';
    const mainPhone = row['Customer Number'] || row['Customer Alt Number'] || '';
    const altPhone = row['Customer Alt Number'] && row['Customer Alt Number'] !== mainPhone ? row['Customer Alt Number'] : null;
    
    const phones = [];
    if (mainPhone) {
      phones.push({ id: 1, phone_number: mainPhone, is_primary: true });
    }
    if (altPhone) {
      phones.push({ id: 2, phone_number: altPhone, is_primary: false });
    }

    const amount = Number(row['Total Vehicle Billing Amount'] || row['Net Ex-Showroom Price'] || row['Ex-Showroom Price'] || 0);
    // Calculated sample points (1 point per ₹100 ex-showroom)
    const pointsBalance = Math.floor(amount / 100);

    const vehicleId = row['VIN Number'] || row['Reg Number'] || row['Order Unique ID'] || 'V-1';
    const vehicles = [
      {
        id: vehicleId,
        registration_number: row['Reg Number'] || row['VIN Number'] || '',
        vin: row['VIN Number'] || '',
        chassis_no: row['VIN Number'] || '',
        model: row['Model'] || row['Variant'] || 'Vehicle',
        brand: row['Brand'] || 'Hero/Hyundai/Swaraj',
        branch: row['Branch'] || '',
        ex_showroom_price: amount,
      },
    ];

    return {
      customer_id: row['Order Unique ID'] ? `BAC-${row['Order Unique ID']}` : `BAC-APP-${row['_RowNumber']}`,
      name: custName,
      customer_name: custName,
      email: row['Email'] || null,
      phones,
      vehicles,
      points_balance: pointsBalance,
      current_tier: pointsBalance >= 10000 ? 'Gold' : pointsBalance >= 5000 ? 'Silver' : 'Bronze',
      billing_status: row['Billing Status'] || 'PR Done',
      pr_status: 'PR Done',
      dms_invoice_number: row['DMS Invoice Number'] || '',
      dms_invoice_date: row['DMS Invoice Date'] || '',
      sales_consultant: row['Sales Consultant'] || '',
      branch: row['Branch'] || '',
      tenant_id: process.env.DEFAULT_TENANT_ID || 'bellad_and_company',
      source: 'appsheet_pr_done',
    };
  }

  /**
   * Search PR Done AppSheet customers by query string (Aadhaar card no, customer name, phone, vehicle reg/vin, order id)
   */
  static async searchPrDoneCustomers(query, limit = 50) {
    const rows = await this.fetchPrDoneRows();
    const q = (query || '').trim().toLowerCase();

    if (!q) {
      // Return top PR Done customers if no specific query
      return rows.slice(0, limit).map(this.formatCustomer);
    }

    const matched = rows.filter((r) => {
      const aadhaar = String(r['Aadhar Card No'] || r['Aadhaar Card No'] || '').toLowerCase();
      const name = String(r['Customer Name'] || r['Customer Ledger Name'] || '').toLowerCase();
      const phone1 = String(r['Customer Number'] || '').toLowerCase();
      const phone2 = String(r['Customer Alt Number'] || '').toLowerCase();
      const vin = String(r['VIN Number'] || '').toLowerCase();
      const reg = String(r['Reg Number'] || '').toLowerCase();
      const orderId = String(r['Order Unique ID'] || '').toLowerCase();
      const invoiceNo = String(r['DMS Invoice Number'] || '').toLowerCase();

      return (
        aadhaar.includes(q) ||
        name.includes(q) ||
        phone1.includes(q) ||
        phone2.includes(q) ||
        vin.includes(q) ||
        reg.includes(q) ||
        orderId.includes(q) ||
        invoiceNo.includes(q)
      );
    });

    return matched.slice(0, limit).map(this.formatCustomer);
  }

}

module.exports = AppSheetSearchService;
