const xlsx = require('xlsx');
const { pool } = require('../config/db');
const AppSheetSyncEngine = require('./appsheetSyncEngine.service');

class ExcelOrderImportService {
  /**
   * Normalize header string for fuzzy matching
   */
  static normalizeKey(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  /**
   * Alias dictionary for essential loyalty fields
   */
  static FIELD_ALIASES = {
    order_id: [
      'order unique id', 'order_unique_id', 'order id', 'order_id', 'orderid',
      'dms booking id', 'dms_booking_id', 'booking id', 'booking_id', '_rownumber', 'row_number', 'sr no', 'sl no'
    ],
    customer_name: [
      'customer name', 'customer_name', 'customer ledger name', 'cust_name', 'party name',
      'party_name', 'client name', 'name', 'cx name', 'customer'
    ],
    phone: [
      'customer number', 'customer_number', 'phone', 'phone no', 'phone_no', 'mobile',
      'mobile no', 'mobile_no', 'contact', 'contact no', 'contact_no', 'customer mobile', 'whatsapp no', 'mobile number', 'cust phone'
    ],
    alt_phone: [
      'customer alt number', 'customer_alt_number', 'alt number', 'alt phone', 'alternate mobile', 'alt_phone'
    ],
    aadhaar: [
      'aadhar card no', 'aadhar_card_no', 'aadhaar card no', 'aadhaar_card_no', 'aadhar no',
      'aadhaar no', 'aadhar number', 'aadhaar number', 'uid', 'uidai', 'adhar', 'adhar no', 'adhar card no',
      'adhar card', 'aadhaar', 'aadhar', 'customer aadhaar', 'customer aadhar', 'cx aadhaar', 'cx aadhar'
    ],
    email: ['email', 'email id', 'email_id', 'mail'],
    address: ['rental address', 'address 1', 'address', 'customer address', 'residence address', 'full address', 'address1'],
    pin_code: ['pin code', 'pincode', 'pin_code', 'postal code', 'pin'],
    age: ['cx age', 'age', 'customer age'],
    nominee_name: ['nominee name', 'nominee_name', 'nominee'],
    nominee_relation: ['relation', 'nominee relation', 'relationship'],
    gst_number: ['gst number', 'gst_number', 'gstin', 'gst no'],
    vin: [
      'vin number', 'vin_number', 'vin no', 'vin_no', 'chassis number', 'chassis_number',
      'chassis no', 'chassis_no', 'chassis', 'vin', 'frame no', 'chasis no'
    ],
    reg_number: [
      'reg number', 'reg_number', 'reg no', 'reg_no', 'registration number',
      'registration_number', 'registration no', 'rc no', 'vehicle no', 'vehicle number', 'vehicle registration no'
    ],
    brand: ['brand', 'brand name', 'make', 'oem'],
    model: ['model', 'vehicle model', 'model name', 'car model', 'bike model', 'scooter model', 'product'],
    variant: ['variant', 'varient', 'vehicle variant', 'trim'],
    fuel_type: ['fuel type', 'fuel', 'engine type'],
    branch: ['branch', 'branch name', 'dealership branch', 'location', 'showroom'],
    branch_address: ['branch address', 'branch adress'],
    firm: ['firm', 'firm name', 'company', 'dealership'],
    sales_consultant: ['sales consultant', 'sales_consultant', 'dse', 'consultant', 'field executive'],
    dms_invoice_no: ['dms invoice number', 'dms_invoice_number', 'invoice number', 'invoice no', 'bill no'],
    dms_invoice_date: [
      'dms invoice date', 'dms_invoice_date', 'invoice date', 'billing date', 'delivery date',
      'vehicle delivery date', 'order date', 'dms booking date', 'date', 'purchase date', 'bill date'
    ],
    ex_showroom: [
      'ex-showroom price', 'ex showroom price', 'ex_showroom_price', 'ex showroom', 'exshowroom',
      'gross ex-showroom', 'gross ex showroom', 'total vehicle billing amount', 'ex showroom value', 'vehicle price', 'base exshowrrom'
    ],
    net_ex_showroom: ['net ex-showroom price', 'net ex showroom price', 'net ex showroom', 'net exshowroom'],
    dealer_discount: [
      'dealer cash discount', 'dealer discount', 'discount/faim', 'dealer_cash_discount', 'cash discount'
    ],
    emps_discount: [
      'emps discount', 'emps', 'other discount amount', 'other discount', 'subsidy discount'
    ],
    oem_offers: [
      'oem offers total amount', 'oem offers amount', 'oem offers', 'offers total amount', 'offers amount', 'consumer offer'
    ],
    tcs_amount: ['tcs % amount', 'tcs amount', 'tcs_amount', 'tcs'],
    billing_status: [
      'billing status', 'billing_status', 'status', 'order form status', 'pr status', 'order status'
    ]
  };

  /**
   * Helper to extract best-matched field value from raw row object
   * Formats integers as string without scientific notation or floating-point rounding
   */
  static extractFieldValue(rawRow, aliases) {
    if (!rawRow || typeof rawRow !== 'object') return '';
    const normKeys = Object.keys(rawRow).map(k => ({ raw: k, norm: this.normalizeKey(k) }));

    for (const alias of aliases) {
      const targetNorm = this.normalizeKey(alias);
      const match = normKeys.find(item => item.norm === targetNorm);
      if (match && rawRow[match.raw] !== undefined && rawRow[match.raw] !== null) {
        const rawCell = rawRow[match.raw];
        let val;
        if (typeof rawCell === 'number') {
          if (Number.isInteger(rawCell)) {
            val = BigInt(Math.trunc(rawCell)).toString();
          } else {
            val = String(rawCell);
          }
        } else {
          val = String(rawCell).trim();
        }
        if (val !== '') return val;
      }
    }
    return '';
  }

  /**
   * Validate 6 mandatory fields required for loyalty import:
   * 1. Customer Name (>= 2 chars, not dummy)
   * 2. Phone Number (10 valid digits)
   * 3. Vehicle Details (VIN/Chassis, Reg No, or Model)
   * 4. Purchase Date / DMS Invoice Date (valid parsed date)
   * 5. Aadhaar Card No (12 valid digits, rejects scientific notation, rejects trailing 00000)
   * 6. Ex-Showroom Price (> ₹0)
   */
  static validateMandatoryFields(normRow, rowIndex) {
    const missing = [];

    // 1. Customer Name
    const name = String(normRow['Customer Name'] || '').trim();
    if (!name || name.length < 2 || /^(na|n\/a|null|undefined|none|-|\.)$/i.test(name)) {
      missing.push('Customer Name');
    }

    // 2. Phone Number (10 digits)
    let phone = String(normRow['Customer Number'] || '').replace(/\D/g, '');
    if (phone.length === 12 && phone.startsWith('91')) phone = phone.slice(2);
    if (phone.length === 11 && phone.startsWith('0')) phone = phone.slice(1);
    if (phone.length !== 10 || /^0+$/.test(phone) || /^(.)\1{9}$/.test(phone)) {
      missing.push('Phone Number (10 valid digits)');
    }

    // 3. Vehicle Details (VIN, Reg No, or Model)
    const vin = String(normRow['VIN Number'] || '').trim();
    const regNo = String(normRow['Reg Number'] || '').trim();
    const model = String(normRow['Model'] || '').trim();
    const hasVehicle = (vin.length >= 5 && !/^(na|n\/a|null|undefined|-)$/i.test(vin)) ||
                      (regNo.length >= 5 && !/^(na|n\/a|null|undefined|-)$/i.test(regNo)) ||
                      (model.length >= 2 && !/^(na|n\/a|null|undefined|-)$/i.test(model));
    if (!hasVehicle) {
      missing.push('Vehicle Details (VIN / Chassis / Reg No / Model)');
    }

    // 4. Purchase Date
    const rawDate = String(normRow['DMS Invoice Date'] || '').trim();
    const parsedDate = AppSheetSyncEngine.parseDmsDate(rawDate) || rawDate;
    const dateTimestamp = Date.parse(parsedDate);
    if (!rawDate || isNaN(dateTimestamp) || /^(na|n\/a|null|undefined|-)$/i.test(rawDate)) {
      missing.push('Purchase Date (DMS Invoice Date)');
    }

    // 5. Aadhaar Card No (12 digits, no scientific notation, not ending in 00000)
    const rawAadhaar = String(normRow['Aadhar Card No'] || '').trim();
    const aadhaarDigits = rawAadhaar.replace(/\D/g, '');
    const isScientific = /e[+-]/i.test(rawAadhaar);
    const isTruncatedFloat = aadhaarDigits.length === 12 && aadhaarDigits.endsWith('00000');

    if (!rawAadhaar || /^(na|n\/a|null|undefined|-)$/i.test(rawAadhaar)) {
      missing.push('Aadhaar Card No (12 digits required)');
    } else if (isScientific || isTruncatedFloat) {
      missing.push('Aadhaar Card No (corrupted scientific notation / truncated to 0000; format column as Plain Text or upload original .xlsx)');
    } else if (aadhaarDigits.length !== 12 || /^0+$/.test(aadhaarDigits) || /^(.)\1{11}$/.test(aadhaarDigits)) {
      missing.push('Aadhaar Card No (must be exactly 12 valid digits)');
    }

    // 6. Ex-Showroom Price (> 0)
    const rawPrice = String(normRow['Ex-Showroom Price'] || '').replace(/[₹,Rs\s]/gi, '').trim();
    const price = parseFloat(rawPrice);
    if (!rawPrice || isNaN(price) || price <= 0) {
      missing.push('Ex-Showroom Price (positive amount > ₹0)');
    }

    return {
      isValid: missing.length === 0,
      missingFields: missing,
      row: rowIndex
    };
  }

  /**
   * Inspect workbook without modifying database:
   * Returns sheet names, detected Order Form sheet, columns in each sheet, and preview rows.
   */
  static inspectWorkbook(fileBufferOrPath) {
    const workbook = typeof fileBufferOrPath === 'string'
      ? xlsx.readFile(fileBufferOrPath)
      : xlsx.read(fileBufferOrPath, { type: 'buffer' });

    const sheetSummaries = [];
    let recommendedSheet = null;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      let rowCount = 0;
      let headers = [];

      if (sheet['!ref']) {
        const range = xlsx.utils.decode_range(sheet['!ref']);
        rowCount = Math.max(0, range.e.r - range.s.r);
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell = sheet[xlsx.utils.encode_cell({ c: C, r: range.s.r })];
          if (cell && cell.v !== undefined && cell.v !== null) {
            headers.push(String(cell.v).trim());
          }
        }
      } else {
        const sampleRows = xlsx.utils.sheet_to_json(sheet, { header: 1, range: 'A1:ZZ10' });
        if (sampleRows && sampleRows.length > 0) {
          headers = (sampleRows[0] || []).map(h => String(h || '').trim()).filter(Boolean);
          rowCount = sampleRows.length;
        }
      }

      // Check how many of our essential loyalty aliases are present in this sheet
      const normHeaders = headers.map(h => this.normalizeKey(h));
      let matchScore = 0;
      const keyFields = ['customer_name', 'phone', 'vin', 'ex_showroom', 'billing_status', 'model', 'aadhaar', 'dms_invoice_date'];
      for (const field of keyFields) {
        const aliases = this.FIELD_ALIASES[field] || [];
        if (aliases.some(a => normHeaders.includes(this.normalizeKey(a)))) {
          matchScore += 2;
        }
      }

      const isOrderSheetName = /order|vin|sale|billing|booking/i.test(sheetName);
      if (isOrderSheetName) matchScore += 3;

      // Check mandatory columns present in header
      const mandatoryColumns = {
        customerName: (this.FIELD_ALIASES.customer_name || []).some(a => normHeaders.includes(this.normalizeKey(a))),
        phone: (this.FIELD_ALIASES.phone || []).some(a => normHeaders.includes(this.normalizeKey(a))),
        vehicle: (this.FIELD_ALIASES.vin || []).some(a => normHeaders.includes(this.normalizeKey(a))) ||
                 (this.FIELD_ALIASES.reg_number || []).some(a => normHeaders.includes(this.normalizeKey(a))) ||
                 (this.FIELD_ALIASES.model || []).some(a => normHeaders.includes(this.normalizeKey(a))),
        purchaseDate: (this.FIELD_ALIASES.dms_invoice_date || []).some(a => normHeaders.includes(this.normalizeKey(a))),
        aadhaar: (this.FIELD_ALIASES.aadhaar || []).some(a => normHeaders.includes(this.normalizeKey(a))),
        exShowroom: (this.FIELD_ALIASES.ex_showroom || []).some(a => normHeaders.includes(this.normalizeKey(a)))
      };

      // Check a sample of rows for scientific notation in Aadhaar
      let hasScientificAadhaar = false;
      try {
        const sampleRows = xlsx.utils.sheet_to_json(sheet, { range: 0, defval: '' }).slice(0, 30);
        for (const sr of sampleRows) {
          const rawAadhaar = String(this.extractFieldValue(sr, this.FIELD_ALIASES.aadhaar) || '').trim();
          if (/e[+-]/i.test(rawAadhaar) || (rawAadhaar.length === 12 && rawAadhaar.endsWith('00000'))) {
            hasScientificAadhaar = true;
            break;
          }
        }
      } catch (e) {}

      sheetSummaries.push({
        sheetName,
        rowCount,
        columnCount: headers.length,
        headersSample: headers.slice(0, 20),
        matchScore,
        isRecommended: false,
        mandatoryColumns,
        hasScientificAadhaar
      });
    }

    // Sort sheets by match score descending
    sheetSummaries.sort((a, b) => b.matchScore - a.matchScore);
    if (sheetSummaries.length > 0 && sheetSummaries[0].matchScore > 2) {
      sheetSummaries[0].isRecommended = true;
      recommendedSheet = sheetSummaries[0].sheetName;
    } else if (sheetSummaries.length > 0) {
      sheetSummaries[0].isRecommended = true;
      recommendedSheet = sheetSummaries[0].sheetName;
    }

    return {
      totalSheets: workbook.SheetNames.length,
      sheetNames: workbook.SheetNames,
      recommendedSheet,
      sheets: sheetSummaries
    };
  }

  /**
   * Normalize an order row into the standard format accepted by AppSheetSyncEngine
   */
  static normalizeOrderRow(rawRow, index = 0) {
    const getVal = (aliases) => this.extractFieldValue(rawRow, aliases);

    const orderId = getVal(this.FIELD_ALIASES.order_id) || `EXCEL-ROW-${index + 1}`;
    const custName = getVal(this.FIELD_ALIASES.customer_name);
    const phone = getVal(this.FIELD_ALIASES.phone);
    const altPhone = getVal(this.FIELD_ALIASES.alt_phone);
    const aadhaar = getVal(this.FIELD_ALIASES.aadhaar);
    const email = getVal(this.FIELD_ALIASES.email);
    const address = getVal(this.FIELD_ALIASES.address);
    const pinCode = getVal(this.FIELD_ALIASES.pin_code);
    const rawAge = getVal(this.FIELD_ALIASES.age);
    const parsedAge = parseInt(rawAge || '0', 10);
    const age = (!isNaN(parsedAge) && parsedAge > 0 && parsedAge <= 120) ? String(parsedAge) : '';
    const nominee = getVal(this.FIELD_ALIASES.nominee_name);
    const relation = getVal(this.FIELD_ALIASES.nominee_relation);
    const gst = getVal(this.FIELD_ALIASES.gst_number);

    const vin = getVal(this.FIELD_ALIASES.vin);
    const regNo = getVal(this.FIELD_ALIASES.reg_number);
    const brand = getVal(this.FIELD_ALIASES.brand);
    const model = getVal(this.FIELD_ALIASES.model);
    const variant = getVal(this.FIELD_ALIASES.variant);
    const fuelType = getVal(this.FIELD_ALIASES.fuel_type);
    const branch = getVal(this.FIELD_ALIASES.branch);
    const branchAddress = getVal(this.FIELD_ALIASES.branch_address);
    const firm = getVal(this.FIELD_ALIASES.firm);
    const consultant = getVal(this.FIELD_ALIASES.sales_consultant);

    const dmsInvoiceNo = getVal(this.FIELD_ALIASES.dms_invoice_no);
    const rawInvoiceDate = getVal(this.FIELD_ALIASES.dms_invoice_date);
    const parsedInvoiceDate = AppSheetSyncEngine.parseDmsDate(rawInvoiceDate);
    const dmsInvoiceDate = parsedInvoiceDate || rawInvoiceDate || '';

    const exShowroom = getVal(this.FIELD_ALIASES.ex_showroom) || '0';
    const netExShowroom = getVal(this.FIELD_ALIASES.net_ex_showroom);
    const dealerDiscount = getVal(this.FIELD_ALIASES.dealer_discount) || '0';
    const empsDiscount = getVal(this.FIELD_ALIASES.emps_discount) || '0';
    const oemOffers = getVal(this.FIELD_ALIASES.oem_offers) || '0';
    const tcsAmount = getVal(this.FIELD_ALIASES.tcs_amount) || '0';
    const billingStatus = getVal(this.FIELD_ALIASES.billing_status) || 'PR Done';

    // Construct standardized row payload expected by AppSheetSyncEngine
    return {
      'Order Unique ID': orderId,
      'Customer Name': custName,
      'Customer Number': phone,
      'Customer Alt Number': altPhone,
      'Aadhar Card No': aadhaar,
      'Email': email,
      'Rental Address': address || pinCode,
      'Address 1': address,
      'PIN Code': pinCode,
      'CX Age': age,
      'Nominee Name': nominee,
      'Relation': relation,
      'GST Number': gst,
      'VIN Number': vin,
      'Reg Number': regNo,
      'Brand': brand,
      'Model': model,
      'Variant': variant,
      'Fuel Type': fuelType,
      'Branch': branch,
      'Branch Address': branchAddress,
      'Firm': firm,
      'Sales Consultant': consultant,
      'DMS Invoice Number': dmsInvoiceNo,
      'DMS Invoice Date': dmsInvoiceDate,
      'Ex-Showroom Price': exShowroom,
      'Net Ex-Showroom Price': netExShowroom || exShowroom,
      'Dealer Cash Discount': dealerDiscount,
      'EMPS Discount': empsDiscount,
      'OEM Offers Total Amount': oemOffers,
      'TCS % Amount': tcsAmount,
      'Billing Status': billingStatus,
      'Status': billingStatus,
      'Order Form Status': 'Freeze',
      '_source': 'excel_order_import'
    };
  }

  /**
   * Import rows from chosen sheet into Loyalty Database
   * Completely ignores unwanted tabs and unwanted columns!
   * Strictly enforces 6 mandatory fields:
   * 1. Customer Name
   * 2. Phone Number (10 digits)
   * 3. Vehicle Details (Chassis/VIN, Reg No, or Model)
   * 4. Purchase Date / DMS Invoice Date
   * 5. Aadhaar Card No (12 digits, no scientific notation, not ending in 00000)
   * 6. Ex-Showroom Price (> 0)
   */
  static async importOrders(fileBufferOrPath, options = {}) {
    const tenantId = options.tenantId || process.env.DEFAULT_TENANT_ID || 'bellad_and_company';
    const allowHistorical = options.allowHistorical !== false; // Default true (allows 3 years backfill)
    const customCutoff = options.customCutoffDate || '2020-01-01';

    const workbook = typeof fileBufferOrPath === 'string'
      ? xlsx.readFile(fileBufferOrPath)
      : xlsx.read(fileBufferOrPath, { type: 'buffer' });

    let targetSheetName = options.sheetName;
    if (!targetSheetName || !workbook.Sheets[targetSheetName]) {
      const inspection = this.inspectWorkbook(fileBufferOrPath);
      targetSheetName = inspection.recommendedSheet || workbook.SheetNames[0];
    }

    const sheet = workbook.Sheets[targetSheetName];
    if (!sheet) {
      throw new Error(`Target sheet '${targetSheetName}' not found in workbook.`);
    }

    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    console.log(`\n📊 [ExcelOrderImport] Starting import from sheet '${targetSheetName}' (${rawRows.length} rows)`);

    const summary = {
      sheetName: targetSheetName,
      totalRows: rawRows.length,
      processed: 0,
      imported: 0,
      skipped: 0,
      totalFailedMandatory: 0,
      errors: [],
      skippedReasons: {},
      totalPointsCredited: 0,
      totalGrossExShowroomPaise: 0,
      totalDiscountsPaise: 0
    };

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      summary.processed++;

      try {
        const normRow = this.normalizeOrderRow(raw, i);
        const orderId = normRow['Order Unique ID'];

        // 1. Quick row-level skip check if completely empty
        if (!normRow['Customer Name'] && !normRow['Customer Number'] && !normRow['VIN Number'] && !normRow['Aadhar Card No']) {
          summary.skipped++;
          summary.skippedReasons['Empty row'] = (summary.skippedReasons['Empty row'] || 0) + 1;
          continue;
        }

        // 2. Strict validation of 6 mandatory fields
        const validation = this.validateMandatoryFields(normRow, i + 2);
        if (!validation.isValid) {
          summary.skipped++;
          summary.totalFailedMandatory++;
          for (const field of validation.missingFields) {
            const reasonKey = `Missing mandatory: ${field}`;
            summary.skippedReasons[reasonKey] = (summary.skippedReasons[reasonKey] || 0) + 1;
          }
          if (summary.errors.length < 500) {
            summary.errors.push({
              row: i + 2,
              orderId,
              customerName: normRow['Customer Name'] || 'Unknown',
              phone: normRow['Customer Number'] || 'N/A',
              missingFields: validation.missingFields,
              error: `Row ${i + 2}: Missing mandatory field(s): ${validation.missingFields.join(', ')}`
            });
          }
          continue;
        }

        // 3. Process through AppSheetSyncEngine
        const result = await AppSheetSyncEngine.processSingleRow(normRow, tenantId, {
          allowHistorical,
          skipPrCheck: true,
          alwaysCreateCustomer: true,
          customCutoffDate: customCutoff
        });

        if (result.status === 'skipped') {
          summary.skipped++;
          const reasonKey = result.reason || 'Skipped by rules';
          summary.skippedReasons[reasonKey] = (summary.skippedReasons[reasonKey] || 0) + 1;
        } else if (result.status === 'success') {
          summary.imported++;
          summary.totalPointsCredited += (result.pointsCredited || 0);
        }
      } catch (err) {
        summary.errors.push({
          row: i + 2, // Excel 1-based index (header is row 1)
          error: err.message || String(err)
        });
      }
    }

    console.log(`✅ [ExcelOrderImport] Completed sheet '${targetSheetName}': ${summary.imported} imported, ${summary.skipped} skipped (${summary.totalFailedMandatory} failed mandatory checks), ${summary.errors.length} error reports.`);
    return summary;
  }
}

module.exports = ExcelOrderImportService;
