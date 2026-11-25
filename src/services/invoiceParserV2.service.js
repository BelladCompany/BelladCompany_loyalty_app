// src/services/invoiceParserV2.service.js
// V2 Dealership Invoice OCR & Spare Parts Cataloging Engine
// Isolated from V1. Extracts header metadata, parts & labour line items, and updates the spare parts price catalog.

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { pool } = require('../config/db');

/**
 * Safely converts string/number in rupees to paise integer.
 * @param {string|number} val - e.g. "508.47", 508.47, "2,487.29"
 * @returns {number} Integer paise (e.g. 50847)
 */
function toPaise(val) {
  if (val === undefined || val === null || val === '') return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').trim());
  return isNaN(num) ? 0 : Math.round(num * 100);
}

/**
 * Normalizes vehicle registration number (removes spaces, hyphens).
 */
function normalizeRegNo(regNo) {
  if (!regNo) return null;
  return regNo.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

/**
 * Extracts plain text from an uploaded PDF buffer.
 * @param {Buffer} pdfBuffer
 * @returns {Promise<{ text: string, totalPages: number }>}
 */
async function extractTextFromPdf(pdfBuffer) {
  const parser = new PDFParse({ data: pdfBuffer });
  try {
    const result = await parser.getText();
    return {
      text: result.text || '',
      totalPages: result.total || 1,
    };
  } finally {
    try {
      await parser.destroy();
    } catch (_) {}
  }
}

/**
 * Detects dealership brand from invoice text.
 */
function detectBrandAndFormat(text) {
  const lower = text.toLowerCase();
  if (lower.includes('heromotocorp') || lower.includes('hero motocorp') || lower.includes('hmcl') || lower.includes('joyride')) {
    return 'Hero MotoCorp';
  }
  if (lower.includes('hyundai') || lower.includes('bellad hyundai') || lower.includes('my hyundai')) {
    return 'Hyundai';
  }
  if (lower.includes('tata motors') || lower.includes('tata passenger') || lower.includes('tata')) {
    return 'Tata Motors';
  }
  return 'Generic';
}

/**
 * Parser for Hero MotoCorp Dealership Invoices
 */
function parseHeroInvoice(text) {
  const invoice = {
    brand_name: 'Hero MotoCorp',
    dealer_name: 'BELLAD & COMPANY',
    invoice_number: null,
    invoice_date: null,
    job_card_number: null,
    repair_order_number: null,
    customer_name: null,
    customer_phone: null,
    registration_number: null,
    vin: null,
    model: null,
    odometer_kms: null,
    billing_type: 'Paid',
    parts_taxable_paise: 0,
    parts_total_paise: 0,
    labour_taxable_paise: 0,
    labour_total_paise: 0,
    cgst_paise: 0,
    sgst_paise: 0,
    discount_paise: 0,
    round_off_paise: 0,
    net_amount_paise: 0,
    line_items: []
  };

  // Header extraction
  const invMatch = text.match(/Invoice No\s+([A-Z0-9]+)/i);
  if (invMatch) invoice.invoice_number = invMatch[1].trim();

  const custMatch = text.match(/Customer Name\s+([^\n\r]+?)(?:\s+-)?\s+Invoice No/i);
  if (custMatch) invoice.customer_name = custMatch[1].trim().replace(/\s+-\s*$/, '');

  const dateMatch = text.match(/Invoice Date\s+([\d]{2}-[\d]{2}-[\d]{4}(?:\s+[\d]{2}:[\d]{2}:[\d]{2})?)/i);
  if (dateMatch) {
    const rawDate = dateMatch[1].trim();
    const parts = rawDate.split(/[\s-:]/);
    if (parts.length >= 3) {
      const d = parts[0], m = parts[1], y = parts[2];
      const h = parts[3] || '00', min = parts[4] || '00', s = parts[5] || '00';
      invoice.invoice_date = `${y}-${m}-${d}T${h}:${min}:${s}+05:30`;
    }
  }

  const jcMatch = text.match(/Job Card No\s+([^\n\r]+)/i);
  if (jcMatch) {
    invoice.job_card_number = jcMatch[1].trim();
    invoice.repair_order_number = invoice.job_card_number;
  }

  const modelMatch = text.match(/Model\s+([^\n\r]+)/i);
  if (modelMatch) invoice.model = modelMatch[1].trim();

  const vinMatch = text.match(/VIN\s+([A-Z0-9]+)/i);
  if (vinMatch) invoice.vin = vinMatch[1].trim();

  const regMatch = text.match(/Vehicle Reg No\s*([A-Z0-9]*)/i);
  if (regMatch && regMatch[1].trim()) {
    invoice.registration_number = normalizeRegNo(regMatch[1].trim());
  }

  const kmsMatch = text.match(/Kms\s+(\d+)/i);
  if (kmsMatch) invoice.odometer_kms = parseInt(kmsMatch[1], 10);

  const phoneMatch = text.match(/Mobile No\s+(\d{10})/i);
  if (phoneMatch) invoice.customer_phone = phoneMatch[1].trim();

  const netMatch = text.match(/(?:Invoice Amount Payable|Total Invoice Value \(In figure\))\s+([\d,]+\.?\d*)/i);
  if (netMatch) invoice.net_amount_paise = toPaise(netMatch[1]);

  const roundMatch = text.match(/Round Off\s+([-\d,]+\.?\d*)/i);
  if (roundMatch) invoice.round_off_paise = toPaise(roundMatch[1]);

  // Extract Parts
  const partsSectionMatch = text.match(/Genuine Parts Details([\s\S]*?)(?:Other Parts Details|Labour Details|Labour \/ Service \/ Jobs Details|Total\s+[\d,]+)/i);
  if (partsSectionMatch) {
    const partsText = partsSectionMatch[1];
    const partRowRegex = /(?:^|\n)\s*(\d+)\s+([A-Z0-9]+)-([\s\S]+?)\s+(\d{6,8})\s+(Paid|Warranty|FOC)\s+([\d\.]+)\s+([A-Z]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+(\d+)%\s+([\d\.,]+)\s+(\d+)%\s+([\d\.,]+)\s+([\d\.,]+)/g;
    
    let m;
    while ((m = partRowRegex.exec(partsText)) !== null) {
      invoice.line_items.push({
        item_type: 'part',
        item_code: m[2].trim(),
        item_description: m[3].replace(/\s+/g, ' ').trim(),
        hsn_sac_code: m[4].trim(),
        billing_type: m[5].trim(),
        quantity: parseFloat(m[6]),
        uom: m[7].trim(),
        unit_rate_paise: toPaise(m[8]),
        total_value_paise: toPaise(m[9]),
        discount_paise: toPaise(m[10]),
        taxable_value_paise: toPaise(m[11]),
        cgst_rate_percent: parseFloat(m[12]),
        cgst_amount_paise: toPaise(m[13]),
        sgst_rate_percent: parseFloat(m[14]),
        sgst_amount_paise: toPaise(m[15]),
        total_amount_paise: toPaise(m[16])
      });
    }
  }

  // Extract Labour
  const labourSectionMatch = text.match(/(?:Labour Details|Labour \/ Service \/ Jobs Details)([\s\S]*?)(?:Other Labour Details|Outside \/ Sublet Labour Details|CGST\(Parts\)|Net Amount)/i);
  if (labourSectionMatch) {
    const labourText = labourSectionMatch[1];
    const labourRowRegex = /(?:^|\n)\s*(\d+)\s+([A-Z0-9]+)-([\s\S]+?)\s+(9987\d{2})\s+([A-Za-z]+)\s+([\d\.]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+(\d+)%\s+([\d\.,]+)\s+(\d+)%\s+([\d\.,]+)\s+([\d\.,]+)/g;
    
    let m;
    while ((m = labourRowRegex.exec(labourText)) !== null) {
      invoice.line_items.push({
        item_type: 'labour',
        item_code: m[2].trim(),
        item_description: m[3].replace(/\s+/g, ' ').trim(),
        hsn_sac_code: m[4].trim(),
        billing_type: m[5].trim(),
        quantity: parseFloat(m[6]),
        uom: 'HRS',
        unit_rate_paise: toPaise(m[7]),
        total_value_paise: toPaise(m[8]),
        discount_paise: toPaise(m[9]),
        taxable_value_paise: toPaise(m[10]),
        cgst_rate_percent: parseFloat(m[11]),
        cgst_amount_paise: toPaise(m[12]),
        sgst_rate_percent: parseFloat(m[13]),
        sgst_amount_paise: toPaise(m[14]),
        total_amount_paise: toPaise(m[15])
      });
    }
  }

  // Extract Other Labour (Additional Repair Charges, etc.)
  const otherLabourMatch = text.match(/(?:Other Labour Details|Outside \/ Sublet Labour Details)([\s\S]*?)(?:CGST\(Parts\)|Net Amount)/i);
  if (otherLabourMatch) {
    const oText = otherLabourMatch[1];
    const oRegex = /(?:^|\n)\s*(\d+)\s+([A-Z0-9]+)-([\s\S]+?)\s+(9987\d{2})\s+([A-Za-z]+)\s+([\d\.]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+(\d+)%\s+([\d\.,]+)\s+(\d+)%\s+([\d\.,]+)\s+([\d\.,]+)/g;
    let m;
    while ((m = oRegex.exec(oText)) !== null) {
      invoice.line_items.push({
        item_type: 'labour',
        item_code: m[2].trim(),
        item_description: m[3].replace(/\s+/g, ' ').trim(),
        hsn_sac_code: m[4].trim(),
        billing_type: m[5].trim(),
        quantity: parseFloat(m[6]),
        uom: 'JOB',
        unit_rate_paise: toPaise(m[7]),
        total_value_paise: toPaise(m[8]),
        discount_paise: toPaise(m[9]),
        taxable_value_paise: toPaise(m[10]),
        cgst_rate_percent: parseFloat(m[11]),
        cgst_amount_paise: toPaise(m[12]),
        sgst_rate_percent: parseFloat(m[13]),
        sgst_amount_paise: toPaise(m[14]),
        total_amount_paise: toPaise(m[15])
      });
    }
  }

  // Recalculate financial breakdown
  let partsTaxable = 0, partsTotal = 0, labourTaxable = 0, labourTotal = 0, cgstTotal = 0, sgstTotal = 0, discTotal = 0;
  for (const item of invoice.line_items) {
    if (item.item_type === 'part') {
      partsTaxable += item.taxable_value_paise;
      partsTotal += item.total_amount_paise;
    } else {
      labourTaxable += item.taxable_value_paise;
      labourTotal += item.total_amount_paise;
    }
    cgstTotal += item.cgst_amount_paise;
    sgstTotal += item.sgst_amount_paise;
    discTotal += item.discount_paise;
  }

  invoice.parts_taxable_paise = partsTaxable;
  invoice.parts_total_paise = partsTotal;
  invoice.labour_taxable_paise = labourTaxable;
  invoice.labour_total_paise = labourTotal;
  invoice.cgst_paise = cgstTotal;
  invoice.sgst_paise = sgstTotal;
  invoice.discount_paise = discTotal;

  if (invoice.net_amount_paise === 0) {
    invoice.net_amount_paise = partsTotal + labourTotal;
  }

  return invoice;
}

/**
 * Parser for Hyundai Dealership Invoices
 */
function parseHyundaiInvoice(text) {
  const invoice = {
    brand_name: 'Hyundai',
    dealer_name: 'BELLAD HYUNDAI',
    invoice_number: null,
    invoice_date: null,
    job_card_number: null,
    repair_order_number: null,
    customer_name: null,
    customer_phone: null,
    registration_number: null,
    vin: null,
    model: null,
    odometer_kms: null,
    billing_type: 'Paid',
    parts_taxable_paise: 0,
    parts_total_paise: 0,
    labour_taxable_paise: 0,
    labour_total_paise: 0,
    cgst_paise: 0,
    sgst_paise: 0,
    discount_paise: 0,
    round_off_paise: 0,
    net_amount_paise: 0,
    line_items: []
  };

  // 1. Invoice Number & Customer Name
  const invCustMatch = text.match(/([B|G]\d{9,10})\s+([A-Z\s]{3,40})/);
  if (invCustMatch) {
    invoice.invoice_number = invCustMatch[1].trim();
    invoice.customer_name = invCustMatch[2].trim();
  }

  // 2. RO Number
  const roMatch = text.match(/R\/O\s*(?:no|Number)[\s:]*(R\d{9,12})/i) || text.match(/Repair Order Number[\s\S]*?(R\d{9,12})/i);
  if (roMatch) {
    invoice.repair_order_number = roMatch[1].trim();
    invoice.job_card_number = invoice.repair_order_number;
  }

  // 3. Reg No
  const regMatch = text.match(/Reg No[\s:]*([A-Z0-9]+)/i) || text.match(/Registration No[\s\S]*?([A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*\d{3,4})/i);
  if (regMatch) {
    invoice.registration_number = normalizeRegNo(regMatch[1]);
  }

  // 4. VIN / Chassis
  const vinMatch = text.match(/VIN[\s\S]*?([A-Z0-9]{17})/i) || text.match(/Chassis No[\s\S]*?([A-Z0-9]{17})/i);
  if (vinMatch) {
    invoice.vin = vinMatch[1].trim();
  }

  // 5. Model
  const modelGatePassMatch = text.match(/Model\s*\n\s*R\/O Number[^\n]+\n\s*([^\n]+(?:\n\s*[^\n]+)?)/i);
  if (modelGatePassMatch) {
    invoice.model = modelGatePassMatch[1].replace(/HC\*\*B\s*/, '').replace(/\s+/g, ' ').trim();
  } else {
    const modelMatch = text.match(/(?:HC\*\*B\s+)?([A-Za-z0-9\.\s]+(?:VTVT|CRDI|SX|EX|Petrol|Diesel)[A-Za-z0-9\.\s\(\)]*)/i);
    if (modelMatch) {
      invoice.model = modelMatch[1].replace(/HC\*\*B\s*/, '').replace(/\s+/g, ' ').trim();
    }
  }

  // 6. Kilometers
  const kmsMatch = text.match(/Kilometers\s+([\d\.]+)/i);
  if (kmsMatch) {
    invoice.odometer_kms = Math.round(parseFloat(kmsMatch[1]));
  }

  // 7. Invoice Date
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
  if (dateMatch) {
    invoice.invoice_date = dateMatch[1].replace(' ', 'T') + '+05:30';
  }

  // 8. Phone from Gate Pass if present
  const phoneMatch = text.match(/\*{4}(\d{6})/);
  if (phoneMatch) {
    invoice.customer_phone = phoneMatch[1];
  }

  // 9. Grand Total: "Grand Total(Rs) (Rounded) 8968"
  const grandMatch = text.match(/Grand Total\(Rs\)\s*\(Rounded\)\s*(\d+)/i);
  if (grandMatch) {
    invoice.net_amount_paise = toPaise(grandMatch[1]);
  }

  // Find table cut point after invoice number line
  let tableText = text;
  if (invoice.invoice_number) {
    const splitIdx = text.indexOf(invoice.invoice_number);
    if (splitIdx !== -1) {
      tableText = text.substring(splitIdx);
    }
  }

  // Split into parts section and labour section
  const labourIdx = tableText.search(/Labour and Services|Labour Invoice/i);
  const partsText = labourIdx !== -1 ? tableText.substring(0, labourIdx) : tableText;
  const labourText = labourIdx !== -1 ? tableText.substring(labourIdx) : '';

  // Extract Parts
  const partRowRegex = /(?:^|\n)\s*(\d{1,2})\s+([A-Z0-9]+)\s+([\s\S]+?)\s+(\d{4,8})\s+(\d+)%\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)/g;
  let m;
  while ((m = partRowRegex.exec(partsText)) !== null) {
    const partCode = m[2].trim();
    const partDesc = m[3].replace(/\s+/g, ' ').trim();
    const hsn = m[4].trim();
    const taxRate = parseFloat(m[5]);
    const qty = parseFloat(m[6].replace(/,/g, ''));
    const rate = m[7];
    const disc = m[8];
    const taxable = m[9];
    
    const taxablePaise = toPaise(taxable);
    const taxPaise = Math.round(taxablePaise * (taxRate / 100));
    const halfTax = Math.round(taxPaise / 2);
    const totalAmountPaise = taxablePaise + taxPaise;

    invoice.line_items.push({
      item_type: 'part',
      item_code: partCode,
      item_description: partDesc,
      hsn_sac_code: hsn,
      billing_type: 'Paid',
      quantity: qty,
      uom: 'PC',
      unit_rate_paise: toPaise(rate),
      total_value_paise: Math.round(qty * toPaise(rate)),
      discount_paise: toPaise(disc),
      taxable_value_paise: taxablePaise,
      cgst_rate_percent: taxRate / 2,
      cgst_amount_paise: halfTax,
      sgst_rate_percent: taxRate / 2,
      sgst_amount_paise: halfTax,
      total_amount_paise: totalAmountPaise
    });
  }

  // Extract Labour
  const labourRowRegex = /(?:^|\n)\s*(\d{1,2})\s+([A-Z0-9]+)\s+([\s\S]+?)\s+(\d{6})\s+(\d+)%\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)/g;
  while ((m = labourRowRegex.exec(labourText)) !== null) {
    const opCode = m[2].trim();
    const desc = m[3].replace(/\s+/g, ' ').trim();
    const sac = m[4].trim();
    const taxRate = parseFloat(m[5]);
    const qty = parseFloat(m[6].replace(/,/g, ''));
    const rate = m[7];
    const disc = m[8];
    const taxable = m[9];

    const taxablePaise = toPaise(taxable);
    const taxPaise = Math.round(taxablePaise * (taxRate / 100));
    const halfTax = Math.round(taxPaise / 2);
    const totalAmountPaise = taxablePaise + taxPaise;

    invoice.line_items.push({
      item_type: 'labour',
      item_code: opCode,
      item_description: desc,
      hsn_sac_code: sac,
      billing_type: 'Paid',
      quantity: qty,
      uom: 'HRS',
      unit_rate_paise: toPaise(rate),
      total_value_paise: Math.round(qty * toPaise(rate)),
      discount_paise: toPaise(disc),
      taxable_value_paise: taxablePaise,
      cgst_rate_percent: taxRate / 2,
      cgst_amount_paise: halfTax,
      sgst_rate_percent: taxRate / 2,
      sgst_amount_paise: halfTax,
      total_amount_paise: totalAmountPaise
    });
  }

  // Totals breakdown
  let partsTaxable = 0, partsTotal = 0, labourTaxable = 0, labourTotal = 0, cgstTotal = 0, sgstTotal = 0, discTotal = 0;
  for (const item of invoice.line_items) {
    if (item.item_type === 'part') {
      partsTaxable += item.taxable_value_paise;
      partsTotal += item.total_amount_paise;
    } else {
      labourTaxable += item.taxable_value_paise;
      labourTotal += item.total_amount_paise;
    }
    cgstTotal += item.cgst_amount_paise;
    sgstTotal += item.sgst_amount_paise;
    discTotal += item.discount_paise;
  }

  invoice.parts_taxable_paise = partsTaxable;
  invoice.parts_total_paise = partsTotal;
  invoice.labour_taxable_paise = labourTaxable;
  invoice.labour_total_paise = labourTotal;
  invoice.cgst_paise = cgstTotal;
  invoice.sgst_paise = sgstTotal;
  invoice.discount_paise = discTotal;

  if (invoice.net_amount_paise === 0) {
    invoice.net_amount_paise = partsTotal + labourTotal;
  }

  return invoice;
}

/**
 * Generic Fallback Parser for Dealership Invoices
 */
function parseGenericInvoice(text) {
  const brand = detectBrandAndFormat(text);
  const invoice = {
    brand_name: brand,
    dealer_name: 'BELLAD & COMPANY',
    invoice_number: null,
    invoice_date: null,
    job_card_number: null,
    repair_order_number: null,
    customer_name: null,
    customer_phone: null,
    registration_number: null,
    vin: null,
    model: null,
    odometer_kms: null,
    billing_type: 'Paid',
    parts_taxable_paise: 0,
    parts_total_paise: 0,
    labour_taxable_paise: 0,
    labour_total_paise: 0,
    cgst_paise: 0,
    sgst_paise: 0,
    discount_paise: 0,
    round_off_paise: 0,
    net_amount_paise: 0,
    line_items: []
  };

  const invMatch = text.match(/(?:Invoice\s*No|Invoice\s*Number)[\s:]*([A-Z0-9]+)/i);
  if (invMatch) invoice.invoice_number = invMatch[1].trim();

  const regMatch = text.match(/([A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*\d{3,4})/i);
  if (regMatch) invoice.registration_number = normalizeRegNo(regMatch[1]);

  const vinMatch = text.match(/([A-HJ-NPR-Z0-9]{17})/);
  if (vinMatch) invoice.vin = vinMatch[1].trim();

  const kmsMatch = text.match(/(?:Kms|Kilometers|Odometer)[\s:]*(\d+)/i);
  if (kmsMatch) invoice.odometer_kms = parseInt(kmsMatch[1], 10);

  const netMatch = text.match(/(?:Total\s*Amount|Net\s*Amount|Invoice\s*Amount|Grand\s*Total)[\s:]*([\d,]+\.?\d*)/i);
  if (netMatch) invoice.net_amount_paise = toPaise(netMatch[1]);

  return invoice;
}

/**
 * Top-level PDF parse function.
 * @param {Buffer} pdfBuffer
 * @param {string} [originalFilename]
 */
async function parseInvoicePdf(pdfBuffer, originalFilename = 'invoice.pdf') {
  const { text, totalPages } = await extractTextFromPdf(pdfBuffer);
  const brand = detectBrandAndFormat(text);

  let parsedData;
  if (brand === 'Hero MotoCorp') {
    parsedData = parseHeroInvoice(text);
  } else if (brand === 'Hyundai') {
    parsedData = parseHyundaiInvoice(text);
  } else {
    parsedData = parseGenericInvoice(text);
  }

  parsedData.raw_pdf_name = originalFilename;
  parsedData.totalPages = totalPages;
  parsedData.summary = {
    parts_count: parsedData.line_items.filter(i => i.item_type === 'part').length,
    labour_count: parsedData.line_items.filter(i => i.item_type === 'labour').length,
    parts_total_rupees: parsedData.parts_total_paise / 100,
    labour_total_rupees: parsedData.labour_total_paise / 100,
    net_payable_rupees: parsedData.net_amount_paise / 100,
  };

  return parsedData;
}

/**
 * Persists parsed invoice and its line items to the database,
 * and auto-upserts spare parts into spare_parts_catalog with full price history.
 *
 * @param {Object} parsedData - Parsed invoice object
 * @param {Object} context - { tenantId, userId, branchId, customerId, vehicleId }
 * @returns {Promise<{ invoice: Object, savedPartsCount: number, savedLabourCount: number }>}
 */
async function saveInvoiceAndCatalog(parsedData, context = {}) {
  const tenantId = context.tenantId || 'bellad_and_company';
  const userId = context.userId || null;
  const branchId = context.branchId || null;
  let customerId = context.customerId || parsedData.customer_id || null;
  let vehicleId = context.vehicleId || null;
  let customerName = context.customerName || parsedData.customer_name || null;
  let customerPhone = context.customerPhone || parsedData.customer_phone || null;

  if (!parsedData.invoice_number) {
    throw new Error('Invoice number is required to save invoice records.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Auto-resolve customer if customerId not explicitly provided
    if (!customerId) {
      if (customerPhone) {
        const cleanPhone = String(customerPhone).replace(/[^\d]/g, '').slice(-10);
        if (cleanPhone.length === 10) {
          const phoneRes = await client.query(
            `SELECT cp.customer_id, c.name, cp.phone_number 
             FROM customer_phones cp 
             JOIN customers c ON c.customer_id = cp.customer_id 
             WHERE cp.phone_number LIKE $1 AND cp.tenant_id = $2 LIMIT 1;`,
            [`%${cleanPhone}`, tenantId]
          );
          if (phoneRes.rows.length > 0) {
            customerId = phoneRes.rows[0].customer_id;
            customerName = phoneRes.rows[0].name || customerName;
            customerPhone = phoneRes.rows[0].phone_number || customerPhone;
          }
        }
      }

      if (!customerId && parsedData.registration_number) {
        const cleanReg = parsedData.registration_number.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        const vehRes = await client.query(
          `SELECT v.id, v.customer_id, c.name 
           FROM vehicles v 
           LEFT JOIN customers c ON c.customer_id = v.customer_id 
           WHERE REPLACE(UPPER(v.registration_number), ' ', '') = $1 AND v.tenant_id = $2 LIMIT 1;`,
          [cleanReg, tenantId]
        );
        if (vehRes.rows.length > 0) {
          customerId = vehRes.rows[0].customer_id;
          vehicleId = vehRes.rows[0].id;
          if (vehRes.rows[0].name) customerName = vehRes.rows[0].name;
        }
      }
    }

    // 1. Insert or update invoice_records
    const insertInvoiceSql = `
      INSERT INTO invoice_records (
        tenant_id, invoice_number, invoice_date, job_card_number, repair_order_number,
        brand_name, branch_id, branch_name, customer_id, customer_name, customer_phone,
        vehicle_id, registration_number, vin, model, odometer_kms, billing_type,
        parts_taxable_paise, parts_total_paise, labour_taxable_paise, labour_total_paise,
        cgst_paise, sgst_paise, discount_paise, round_off_paise, net_amount_paise,
        ocr_status, ocr_confidence, raw_pdf_name, raw_extracted_json, created_by, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24, $25, $26,
        'completed', 100.00, $27, $28, $29, NOW()
      )
      ON CONFLICT (tenant_id, invoice_number) DO UPDATE SET
        invoice_date = EXCLUDED.invoice_date,
        job_card_number = EXCLUDED.job_card_number,
        repair_order_number = EXCLUDED.repair_order_number,
        brand_name = EXCLUDED.brand_name,
        customer_id = COALESCE(EXCLUDED.customer_id, invoice_records.customer_id),
        customer_name = COALESCE(EXCLUDED.customer_name, invoice_records.customer_name),
        customer_phone = COALESCE(EXCLUDED.customer_phone, invoice_records.customer_phone),
        vehicle_id = COALESCE(EXCLUDED.vehicle_id, invoice_records.vehicle_id),
        registration_number = COALESCE(EXCLUDED.registration_number, invoice_records.registration_number),
        vin = COALESCE(EXCLUDED.vin, invoice_records.vin),
        model = COALESCE(EXCLUDED.model, invoice_records.model),
        odometer_kms = COALESCE(EXCLUDED.odometer_kms, invoice_records.odometer_kms),
        parts_taxable_paise = EXCLUDED.parts_taxable_paise,
        parts_total_paise = EXCLUDED.parts_total_paise,
        labour_taxable_paise = EXCLUDED.labour_taxable_paise,
        labour_total_paise = EXCLUDED.labour_total_paise,
        cgst_paise = EXCLUDED.cgst_paise,
        sgst_paise = EXCLUDED.sgst_paise,
        discount_paise = EXCLUDED.discount_paise,
        round_off_paise = EXCLUDED.round_off_paise,
        net_amount_paise = EXCLUDED.net_amount_paise,
        raw_pdf_name = EXCLUDED.raw_pdf_name,
        raw_extracted_json = EXCLUDED.raw_extracted_json,
        updated_at = NOW()
      RETURNING *;
    `;

    const invoiceRes = await client.query(insertInvoiceSql, [
      tenantId,
      parsedData.invoice_number,
      parsedData.invoice_date || null,
      parsedData.job_card_number || null,
      parsedData.repair_order_number || null,
      parsedData.brand_name || 'Generic',
      branchId,
      parsedData.dealer_name || null,
      customerId,
      customerName,
      customerPhone,
      vehicleId,
      parsedData.registration_number || null,
      parsedData.vin || null,
      parsedData.model || null,
      parsedData.odometer_kms || null,
      parsedData.billing_type || 'Paid',
      parsedData.parts_taxable_paise || 0,
      parsedData.parts_total_paise || 0,
      parsedData.labour_taxable_paise || 0,
      parsedData.labour_total_paise || 0,
      parsedData.cgst_paise || 0,
      parsedData.sgst_paise || 0,
      parsedData.discount_paise || 0,
      parsedData.round_off_paise || 0,
      parsedData.net_amount_paise || 0,
      parsedData.raw_pdf_name || 'invoice.pdf',
      JSON.stringify(parsedData.summary || {}),
      userId,
    ]);

    const savedInvoice = invoiceRes.rows[0];
    const invoiceId = savedInvoice.id;

    // 2. Clear previous line items for this invoice if updating
    await client.query('DELETE FROM invoice_line_items WHERE invoice_id = $1;', [invoiceId]);

    // 3. Insert Line Items tied directly to this customer
    let savedPartsCount = 0;
    let savedLabourCount = 0;

    const lineItemSql = `
      INSERT INTO invoice_line_items (
        tenant_id, invoice_id, invoice_number, customer_id, customer_name, customer_phone, vehicle_id,
        item_type, item_code, item_description,
        hsn_sac_code, billing_type, quantity, uom, unit_rate_paise,
        total_value_paise, discount_paise, taxable_value_paise,
        cgst_rate_percent, cgst_amount_paise, sgst_rate_percent, sgst_amount_paise,
        total_amount_paise, brand_name, vehicle_model, registration_number, vin, invoice_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24, $25, $26, $27, $28
      );
    `;

    for (const item of parsedData.line_items || []) {
      await client.query(lineItemSql, [
        tenantId,
        invoiceId,
        parsedData.invoice_number,
        customerId,
        customerName,
        customerPhone,
        vehicleId,
        item.item_type || 'part',
        item.item_code || null,
        item.item_description || '',
        item.hsn_sac_code || null,
        item.billing_type || 'Paid',
        item.quantity || 1,
        item.uom || 'PC',
        item.unit_rate_paise || 0,
        item.total_value_paise || 0,
        item.discount_paise || 0,
        item.taxable_value_paise || 0,
        item.cgst_rate_percent || 0,
        item.cgst_amount_paise || 0,
        item.sgst_rate_percent || 0,
        item.sgst_amount_paise || 0,
        item.total_amount_paise || 0,
        parsedData.brand_name || null,
        parsedData.model || null,
        parsedData.registration_number || null,
        parsedData.vin || null,
        parsedData.invoice_date || null,
      ]);

      if (item.item_type === 'part') {
        savedPartsCount++;

        // 4. Upsert into spare_parts_catalog with historical price tracking
        if (item.item_code) {
          const priceRecord = {
            invoice_no: parsedData.invoice_number,
            invoice_date: parsedData.invoice_date,
            unit_rate_paise: item.unit_rate_paise,
            total_amount_paise: item.total_amount_paise,
            vehicle_model: parsedData.model,
            recorded_at: new Date().toISOString()
          };

          const taxPercent = (item.cgst_rate_percent || 0) + (item.sgst_rate_percent || 0);

          const catalogUpsertSql = `
            INSERT INTO spare_parts_catalog (
              tenant_id, brand_name, part_number, part_name, hsn_code,
              category, latest_unit_rate_paise, latest_mrp_paise, tax_rate_percent,
              compatible_models, last_seen_date, last_seen_invoice_no, price_history, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5,
              'spares', $6, $7, $8,
              $9::text[], $10, $11, $12::jsonb, NOW()
            )
            ON CONFLICT (tenant_id, brand_name, part_number) DO UPDATE SET
              part_name = EXCLUDED.part_name,
              hsn_code = COALESCE(EXCLUDED.hsn_code, spare_parts_catalog.hsn_code),
              latest_unit_rate_paise = EXCLUDED.latest_unit_rate_paise,
              latest_mrp_paise = EXCLUDED.latest_mrp_paise,
              tax_rate_percent = EXCLUDED.tax_rate_percent,
              last_seen_date = EXCLUDED.last_seen_date,
              last_seen_invoice_no = EXCLUDED.last_seen_invoice_no,
              compatible_models = (
                SELECT ARRAY(
                  SELECT DISTINCT unnest(array_cat(spare_parts_catalog.compatible_models, EXCLUDED.compatible_models))
                )
              ),
              price_history = CASE
                WHEN spare_parts_catalog.price_history IS NULL THEN EXCLUDED.price_history
                ELSE spare_parts_catalog.price_history || EXCLUDED.price_history
              END,
              updated_at = NOW();
          `;

          const compatibleModels = parsedData.model ? [parsedData.model] : [];
          await client.query(catalogUpsertSql, [
            tenantId,
            parsedData.brand_name || 'Generic',
            item.item_code,
            item.item_description,
            item.hsn_sac_code || null,
            item.unit_rate_paise,
            item.unit_rate_paise, // Default MRP to unit rate
            taxPercent || 18,
            compatibleModels,
            parsedData.invoice_date || new Date(),
            parsedData.invoice_number,
            JSON.stringify([priceRecord])
          ]);
        }
      } else {
        savedLabourCount++;
      }
    }

    await client.query('COMMIT');

    return {
      invoice: savedInvoice,
      savedPartsCount,
      savedLabourCount
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Searches the spare parts catalog with latest prices and history.
 */
async function searchSparePartsCatalog(query, options = {}) {
  const tenantId = options.tenantId || 'bellad_and_company';
  const brand = options.brand || null;
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(options.offset, 10) || 0, 0);

  let sql = `
    SELECT 
      id, brand_name, part_number, part_name, hsn_code, category,
      latest_unit_rate_paise, (latest_unit_rate_paise / 100.0) AS latest_unit_rate_rupees,
      tax_rate_percent, compatible_models, last_seen_date, last_seen_invoice_no,
      price_history
    FROM spare_parts_catalog
    WHERE tenant_id = $1
  `;
  const params = [tenantId];
  let paramIdx = 2;

  if (brand && brand !== 'All') {
    sql += ` AND brand_name = $${paramIdx++}`;
    params.push(brand);
  }

  if (query && query.trim()) {
    sql += ` AND (part_number ILIKE $${paramIdx} OR part_name ILIKE $${paramIdx} OR hsn_code ILIKE $${paramIdx})`;
    params.push(`%${query.trim()}%`);
    paramIdx++;
  }

  sql += ` ORDER BY last_seen_date DESC NULLS LAST LIMIT $${paramIdx++} OFFSET $${paramIdx++};`;
  params.push(limit, offset);

  const res = await pool.query(sql, params);
  return res.rows;
}

/**
 * Retrieves detailed invoice record with all line items.
 */
async function getInvoiceDetails(invoiceId, tenantId = 'bellad_and_company') {
  const invRes = await pool.query(
    'SELECT * FROM invoice_records WHERE id = $1 AND tenant_id = $2;',
    [invoiceId, tenantId]
  );
  if (invRes.rows.length === 0) return null;

  const invoice = invRes.rows[0];
  const itemsRes = await pool.query(
    'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id ASC;',
    [invoiceId]
  );

  return {
    ...invoice,
    line_items: itemsRes.rows
  };
}

/**
 * Lists invoices with pagination and search.
 */
async function listInvoices(options = {}) {
  const tenantId = options.tenantId || 'bellad_and_company';
  const brand = options.brand || null;
  const search = options.search || null;
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 20, 1), 100);
  const offset = Math.max(parseInt(options.offset, 10) || 0, 0);

  let sql = 'SELECT * FROM invoice_records WHERE tenant_id = $1';
  const params = [tenantId];
  let paramIdx = 2;

  if (brand && brand !== 'All') {
    sql += ` AND brand_name = $${paramIdx++}`;
    params.push(brand);
  }

  if (search && search.trim()) {
    sql += ` AND (invoice_number ILIKE $${paramIdx} OR registration_number ILIKE $${paramIdx} OR customer_name ILIKE $${paramIdx} OR vin ILIKE $${paramIdx})`;
    params.push(`%${search.trim()}%`);
    paramIdx++;
  }

  sql += ` ORDER BY invoice_date DESC NULLS LAST, created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++};`;
  params.push(limit, offset);

  const res = await pool.query(sql, params);
  return res.rows;
}

/**
 * Retrieves all itemized spare parts & labour operations recorded for a specific customer,
 * complete with part number, description, HSN code, quantity, unit rate, discount, taxable value,
 * CGST rate & amount, SGST rate & amount, total amount, model, registration no, and invoice date.
 */
async function getCustomerSparePartsHistory(customerId, options = {}) {
  const tenantId = options.tenantId || 'bellad_and_company';
  const itemType = options.itemType || null; // 'part', 'labour', or null for all
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 200, 1), 500);
  const offset = Math.max(parseInt(options.offset, 10) || 0, 0);

  let sql = `
    SELECT 
      ili.id,
      ili.invoice_id,
      ili.invoice_number,
      ili.customer_id,
      ili.customer_name,
      ili.customer_phone,
      ili.vehicle_id,
      ili.item_type,
      ili.item_code,
      ili.item_description,
      ili.hsn_sac_code,
      ili.billing_type,
      ili.quantity,
      ili.uom,
      ili.unit_rate_paise,
      ROUND((ili.unit_rate_paise / 100.0)::numeric, 2) AS unit_rate_rupees,
      ili.total_value_paise,
      ROUND((ili.total_value_paise / 100.0)::numeric, 2) AS total_value_rupees,
      ili.discount_paise,
      ROUND((ili.discount_paise / 100.0)::numeric, 2) AS discount_rupees,
      ili.taxable_value_paise,
      ROUND((ili.taxable_value_paise / 100.0)::numeric, 2) AS taxable_value_rupees,
      ili.cgst_rate_percent,
      ili.cgst_amount_paise,
      ROUND((ili.cgst_amount_paise / 100.0)::numeric, 2) AS cgst_amount_rupees,
      ili.sgst_rate_percent,
      ili.sgst_amount_paise,
      ROUND((ili.sgst_amount_paise / 100.0)::numeric, 2) AS sgst_amount_rupees,
      ili.total_amount_paise,
      ROUND((ili.total_amount_paise / 100.0)::numeric, 2) AS total_amount_rupees,
      ili.brand_name,
      ili.vehicle_model,
      ili.registration_number,
      ili.vin,
      ili.invoice_date,
      ili.created_at
    FROM invoice_line_items ili
    WHERE ili.tenant_id = $1 AND ili.customer_id = $2
  `;

  const params = [tenantId, customerId];
  let paramIdx = 3;

  if (itemType) {
    sql += ` AND ili.item_type = $${paramIdx++}`;
    params.push(itemType);
  }

  sql += ` ORDER BY ili.invoice_date DESC NULLS LAST, ili.id DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++};`;
  params.push(limit, offset);

  const res = await pool.query(sql, params);
  return res.rows;
}

/**
 * Adds an uploaded invoice PDF to the advisor invoice queue.
 * Saves the physical file to disk in uploads/advisor_invoices, runs OCR parser,
 * and records the item in advisor_invoice_queue.
 */
async function addToAdvisorQueue({
  buffer,
  originalFilename,
  tenantId = 'bellad_and_company',
  userId = null,
  username = null,
  customerId = null,
  vehicleId = null,
  autoSave = false,
}) {
  const uploadDir = path.join(__dirname, '../../uploads/advisor_invoices');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const safeExt = path.extname(originalFilename || '').toLowerCase() || '.pdf';
  const cleanBase = path.basename(originalFilename || 'invoice', safeExt).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  const fileName = `adv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanBase}${safeExt}`;
  const filePath = path.join(uploadDir, fileName);

  // Write file to disk
  fs.writeFileSync(filePath, buffer);
  const relativePath = `uploads/advisor_invoices/${fileName}`;

  // Parse invoice buffer
  let parsedData = null;
  try {
    parsedData = await parseInvoicePdf(buffer, originalFilename);
  } catch (parseErr) {
    console.warn('[AdvisorQueue] OCR parsing error, continuing with fallback:', parseErr.message);
    parsedData = {
      brand_name: 'Dealership Invoice',
      invoice_number: null,
      customer_name: null,
      registration_number: null,
      net_amount_paise: 0,
      summary: { net_payable_rupees: 0 },
      line_items: []
    };
  }

  // Pre-fill parsed fields
  const customerName = parsedData.customer_name || null;
  const regNumber = normalizeRegNo(parsedData.registration_number);
  const invoiceNumber = parsedData.invoice_number || null;
  const netAmountPaise = parsedData.net_amount_paise || (parsedData.summary?.net_payable_rupees ? Math.round(parsedData.summary.net_payable_rupees * 100) : 0);

  // Optional: auto-save parts and catalog
  if (autoSave && invoiceNumber) {
    try {
      await saveInvoiceAndCatalog(parsedData, {
        tenantId,
        userId,
        customerId,
        vehicleId,
      });
    } catch (saveErr) {
      console.warn('[AdvisorQueue] auto-save parts error:', saveErr.message);
    }
  }

  const insertSql = `
    INSERT INTO advisor_invoice_queue (
      tenant_id, file_name, original_filename, file_path, file_size,
      customer_name, customer_id, registration_number, invoice_number,
      net_amount_paise, status, uploaded_by_user_id, uploaded_by_username,
      parsed_preview, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, 'pending', $11, $12,
      $13, NOW(), NOW()
    )
    RETURNING *;
  `;

  const res = await pool.query(insertSql, [
    tenantId,
    fileName,
    originalFilename,
    relativePath,
    buffer.length,
    customerName,
    customerId,
    regNumber,
    invoiceNumber,
    netAmountPaise,
    userId,
    username,
    JSON.stringify(parsedData),
  ]);

  return {
    ...res.rows[0],
    parsed_data: parsedData,
  };
}

/**
 * Lists advisor invoice queue with optional day-wise / status / search filtering.
 */
async function getAdvisorQueue({
  tenantId = 'bellad_and_company',
  status = null,
  search = null,
  date = null,
  customerId = null,
  limit = 100,
  offset = 0,
}) {
  let sql = `
    SELECT 
      id, tenant_id, file_name, original_filename, file_path, file_size,
      customer_name, customer_id, registration_number, invoice_number,
      net_amount_paise, ROUND((net_amount_paise / 100.0)::numeric, 2) AS net_amount_rupees,
      status, uploaded_by_user_id, uploaded_by_username,
      completed_by_user_id, completed_at, parsed_preview,
      created_at, updated_at,
      TO_CHAR(created_at, 'YYYY-MM-DD') AS upload_date
    FROM advisor_invoice_queue
    WHERE tenant_id = $1
  `;
  const params = [tenantId];
  let paramIdx = 2;

  if (status && status !== 'all') {
    sql += ` AND status = $${paramIdx++}`;
    params.push(status);
  }

  if (customerId) {
    sql += ` AND customer_id = $${paramIdx++}`;
    params.push(customerId);
  }

  if (date) {
    sql += ` AND TO_CHAR(created_at, 'YYYY-MM-DD') = $${paramIdx++}`;
    params.push(date);
  }

  if (search && search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    sql += ` AND (
      LOWER(COALESCE(customer_name, '')) LIKE $${paramIdx} OR
      LOWER(COALESCE(registration_number, '')) LIKE $${paramIdx} OR
      LOWER(COALESCE(invoice_number, '')) LIKE $${paramIdx} OR
      LOWER(COALESCE(original_filename, '')) LIKE $${paramIdx}
    )`;
    params.push(q);
    paramIdx++;
  }

  sql += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++};`;
  params.push(limit, offset);

  const res = await pool.query(sql, params);
  return res.rows;
}

/**
 * Gets a single advisor queue record by ID.
 */
async function getAdvisorQueueItem(id, tenantId = 'bellad_and_company') {
  const sql = `
    SELECT 
      id, tenant_id, file_name, original_filename, file_path, file_size,
      customer_name, customer_id, registration_number, invoice_number,
      net_amount_paise, ROUND((net_amount_paise / 100.0)::numeric, 2) AS net_amount_rupees,
      status, uploaded_by_user_id, uploaded_by_username,
      completed_by_user_id, completed_at, parsed_preview,
      created_at, updated_at,
      TO_CHAR(created_at, 'YYYY-MM-DD') AS upload_date
    FROM advisor_invoice_queue
    WHERE id = $1 AND tenant_id = $2
  `;
  const res = await pool.query(sql, [id, tenantId]);
  return res.rows[0] || null;
}

/**
 * Updates status of an advisor invoice queue item (e.g. to 'completed' or 'pending').
 */
async function updateAdvisorQueueStatus(id, tenantId, status, userId = null) {
  const sql = `
    UPDATE advisor_invoice_queue
    SET 
      status = $1::varchar,
      completed_by_user_id = CASE WHEN $1::varchar = 'completed' THEN COALESCE($2::integer, completed_by_user_id) ELSE completed_by_user_id END,
      completed_at = CASE WHEN $1::varchar = 'completed' THEN NOW() ELSE completed_at END,
      updated_at = NOW()
    WHERE id = $3 AND tenant_id = $4
    RETURNING *;
  `;
  const res = await pool.query(sql, [status, userId, id, tenantId]);
  return res.rows[0] || null;
}

module.exports = {
  extractTextFromPdf,
  detectBrandAndFormat,
  parseHeroInvoice,
  parseHyundaiInvoice,
  parseGenericInvoice,
  parseInvoicePdf,
  saveInvoiceAndCatalog,
  searchSparePartsCatalog,
  getInvoiceDetails,
  listInvoices,
  getCustomerSparePartsHistory,
  addToAdvisorQueue,
  getAdvisorQueue,
  getAdvisorQueueItem,
  updateAdvisorQueueStatus
};
