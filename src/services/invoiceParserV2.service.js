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
  if (lower.includes('hyundai') || lower.includes('bellad hyundai') || lower.includes('my hyundai') || /\bB20\d{7,8}\b/.test(text)) {
    return 'Hyundai';
  }
  if (lower.includes('tata motors') || lower.includes('tata passenger') || lower.includes('tata') || lower.includes('bellad enterprises private limited-500b') || /\b[EI]BEL[A-Z0-9]{8,14}\b/i.test(text)) {
    return 'Tata Motors';
  }
  if (lower.includes('mg motor') || lower.includes('morris garages') || lower.includes('mghubli') || lower.includes('mg_') || lower.includes('zs ev') || lower.includes('hector') || lower.includes('comet') || lower.includes('windsor') || lower.includes('astor') || lower.includes('gloster') || /\bS311[A-Z0-9]{6,12}\b/i.test(text)) {
    return 'MG Motors';
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
 * Parser for Hyundai Dealership Invoices (Supports both single-line & multi-line wrapped layouts)
 */
function parseHyundaiInvoice(text, originalFilename = '') {
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

  // 1. Invoice Number (Prioritize B-series over G-series)
  const bMatch = text.match(/\b(B\d{9,10})\b/);
  const fnMatch = String(originalFilename).match(/\b(B\d{9,10})\b/i);
  if (bMatch) {
    invoice.invoice_number = bMatch[1].trim();
  } else if (fnMatch) {
    invoice.invoice_number = fnMatch[1].trim().toUpperCase();
  } else {
    const invBlock = text.match(/Invoice\s*No[^\n]*\n(?:[^\n]*\n){0,3}\s*([A-Z0-9]+)/i);
    if (invBlock && !invBlock[1].startsWith('G')) {
      invoice.invoice_number = invBlock[1].trim();
    } else {
      const gMatch = text.match(/\b(G\d{9,10})\b/);
      if (gMatch) invoice.invoice_number = gMatch[1].trim();
    }
  }

  // 2. Customer Name
  // A. Check Gate Pass: "Customer ARJUNASA MERWADE Reg. No"
  const gatePassCust = text.match(/Customer\s+([A-Z\s]{3,40}?)\s+Reg\.?\s*No/i);
  if (gatePassCust && !gatePassCust[1].includes('VIN')) {
    invoice.customer_name = gatePassCust[1].trim();
  }
  // B. Check Header under GST No: "GST No:\nARJUNASA MERWADE\n"
  if (!invoice.customer_name) {
    const gstCust = text.match(/GST No:\s*\n\s*([A-Z\s]{3,40}?)\n\s*(?:[a-z0-9\/]|Reg)/i);
    if (gstCust && !gstCust[1].includes('VIN')) {
      invoice.customer_name = gstCust[1].trim();
    }
  }
  // C. Check inline Invoice + Name: "B202613526\tSWAROOPCHAND MALU"
  if (!invoice.customer_name) {
    const invCust = text.match(/([B|G]\d{9,10})\s+([A-Z\s]{3,40})/);
    if (invCust && !invCust[2].trim().startsWith('VIN')) {
      invoice.customer_name = invCust[2].trim();
    }
  }
  // D. Gate Pass bottom signature: "Customer Signature\nSWAROOPCHAND MALU\n"
  if (!invoice.customer_name) {
    const sigCust = text.match(/Customer Signature\s*\n\s*([A-Z\s]{3,40}?)\s*\n\s*\*{4}\d+/i);
    if (sigCust && !sigCust[1].includes('VIN')) {
      invoice.customer_name = sigCust[1].trim();
    }
  }

  // 3. Reg No (Prioritize Indian registration format)
  const regIndian = text.match(/\b([A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*\d{4})\b/);
  if (regIndian) {
    invoice.registration_number = normalizeRegNo(regIndian[1]);
  } else {
    const regFallback = text.match(/Reg\.?\s*No[\s:]*([A-Z0-9]+)/i);
    if (regFallback && regFallback[1] !== 'VIN') {
      invoice.registration_number = normalizeRegNo(regFallback[1]);
    }
  }

  // 4. VIN / Chassis (17 alphanumeric)
  const vinMatch = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/);
  if (vinMatch) {
    invoice.vin = vinMatch[1].trim();
  }

  // 5. Model
  const modelGatePass = text.match(/Model\s+(?:GS\*\*B|IB\*\*C|AI3\*C|SU\*\*B|HC\*\*B)?\s*([A-Za-z0-9\.\s\+\(\)\-]+?)(?:\s+R\/O|\s+Payment|\n)/i);
  if (modelGatePass) {
    invoice.model = modelGatePass[1].replace(/^(?:GS\*\*B|IB\*\*C|AI3\*C|SU\*\*B|HC\*\*B)\s*/, '').trim();
  } else {
    const modelGeneral = text.match(/(?:Creta|i20|i10|Venue|Exter|Verna|Alcazar|Tucson|Santro|Aura)[A-Za-z0-9\.\s\+\(\)\-]*/i);
    if (modelGeneral) {
      invoice.model = modelGeneral[0].trim();
    }
  }

  // 6. RO / Job Card
  const roMatch = text.match(/R\/O\s*(?:no|Number)[\s:]*(R\d{9,12})/i) || text.match(/Repair Order Number[\s\S]*?(R\d{9,12})/i);
  if (roMatch) {
    invoice.repair_order_number = roMatch[1].trim();
    invoice.job_card_number = invoice.repair_order_number;
  }

  // 7. Kilometers
  const kmsMatch = text.match(/(?:Mileage|Kilometers)[\s:]*([\d\.]+)/i);
  if (kmsMatch) {
    invoice.odometer_kms = Math.round(parseFloat(kmsMatch[1]));
  }

  // 8. Invoice Date (DD.MM.YYYY, DD-MM-YYYY, or YYYY-MM-DD)
  const dateDotted = text.match(/(?:Date|Invoice Date)[\s:]*(\d{2})[\.\-](\d{2})[\.\-](\d{4})/i);
  if (dateDotted) {
    invoice.invoice_date = `${dateDotted[3]}-${dateDotted[2]}-${dateDotted[1]}T10:00:00+05:30`;
  } else {
    const dateDash = text.match(/(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/);
    if (dateDash) {
      invoice.invoice_date = dateDash[1].replace(' ', 'T') + '+05:30';
    }
  }

  // 9. Phone from Gate Pass if present
  const phoneMatch = text.match(/\*{4}(\d{6})/);
  if (phoneMatch) {
    invoice.customer_phone = phoneMatch[1];
  }

  // 10. Summary Block Extraction (Parts Sub Total, Labour Sub Total, Taxes, Grand Total)
  const subTotalMatch = text.match(/Sub Total\s+([\d\.,]+)\s+([\d\.,]+)/i);
  if (subTotalMatch) {
    invoice.parts_taxable_paise = toPaise(subTotalMatch[1]);
    invoice.labour_taxable_paise = toPaise(subTotalMatch[2]);
  }

  const totalMatch = text.match(/Total(?:\(Rs\))?\s+([\d\.,]+)\s+([\d\.,]+)/i);
  if (totalMatch) {
    invoice.parts_total_paise = toPaise(totalMatch[1]);
    invoice.labour_total_paise = toPaise(totalMatch[2]);
  }

  const grandMatch = text.match(/Grand Total(?:\(Rs\))?\s*\(Rounded\)\s*([\d,]+)/i);
  if (grandMatch) {
    invoice.net_amount_paise = toPaise(grandMatch[1]);
  } else if (invoice.parts_total_paise > 0 || invoice.labour_total_paise > 0) {
    invoice.net_amount_paise = invoice.parts_total_paise + invoice.labour_total_paise;
  }

  // CGST / SGST breakdown
  const cgstLabour = text.match(/CGST\s*@\s*9%\s*on\s*Labor\s*value\s*of\s*[\d\.,]+\s*[\d\.,]+\s*([\d\.,]+)/i);
  const sgstLabour = text.match(/SGST\s*@\s*9%\s*on\s*Labor\s*value\s*of\s*[\d\.,]+\s*[\d\.,]+\s*([\d\.,]+)/i);
  const cgstPart = text.match(/CGST@9%\s*ON\s*Part\s*Value\s*of\s*[\d\.,]+\s*([\d\.,]+)/i);
  const sgstPart = text.match(/SGST@9%\s*ON\s*Part\s*Value\s*of\s*[\d\.,]+\s*([\d\.,]+)/i);

  let totalCgst = 0;
  let totalSgst = 0;
  if (cgstLabour) totalCgst += toPaise(cgstLabour[1]);
  if (cgstPart) totalCgst += toPaise(cgstPart[1]);
  if (sgstLabour) totalSgst += toPaise(sgstLabour[1]);
  if (sgstPart) totalSgst += toPaise(sgstPart[1]);
  invoice.cgst_paise = totalCgst;
  invoice.sgst_paise = totalSgst;

  // 11. Extract Line Items (Both Single-Line & Multi-Line Layouts)
  function fillItemNumbers(item, taxRateStr, qtyStr, rateStr, remainingStr) {
    const taxRate = parseFloat(taxRateStr);
    const qty = parseFloat(qtyStr.replace(/,/g, ''));
    item.quantity = qty;
    item.unit_rate_paise = toPaise(rateStr);
    item.total_value_paise = Math.round(qty * toPaise(rateStr));
    item.cgst_rate_percent = taxRate / 2;
    item.sgst_rate_percent = taxRate / 2;

    if (remainingStr) {
      const tokens = remainingStr.trim().split(/\s+/);
      const lastToken = tokens[tokens.length - 1];
      item.taxable_value_paise = toPaise(lastToken);
      const taxPaise = Math.round(item.taxable_value_paise * (taxRate / 100));
      item.cgst_amount_paise = Math.round(taxPaise / 2);
      item.sgst_amount_paise = Math.round(taxPaise / 2);
      item.total_amount_paise = item.taxable_value_paise + taxPaise;
    }
  }

  const partsIdx = text.search(/Part Invoice/i);
  const labourIdx = text.search(/Labour and Services|Labour Invoice/i);
  const summaryIdx = text.search(/Sub Total/i);

  const partsText = partsIdx !== -1 && labourIdx !== -1 ? text.slice(partsIdx, labourIdx) : '';
  const labourText = labourIdx !== -1 && summaryIdx !== -1 ? text.slice(labourIdx, summaryIdx) : '';

  // 11a. Parts Parsing
  if (partsText) {
    const singleLinePartsRegex = /(?:^|\n)\s*(\d{1,2})\s+([A-Z0-9]{8,15})\s+([\s\S]+?)\s+(\d{6,8})\s+(\d+)%\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)/g;
    let m;
    const format1Parts = [];
    while ((m = singleLinePartsRegex.exec(partsText)) !== null) {
      const taxablePaise = toPaise(m[9]);
      const taxRate = parseFloat(m[5]);
      const taxPaise = Math.round(taxablePaise * (taxRate / 100));
      format1Parts.push({
        item_type: 'part',
        item_code: m[2].trim(),
        item_description: m[3].replace(/\s+/g, ' ').trim(),
        hsn_sac_code: m[4].trim(),
        billing_type: 'Paid',
        quantity: parseFloat(m[6].replace(/,/g, '')),
        uom: 'PC',
        unit_rate_paise: toPaise(m[7]),
        total_value_paise: Math.round(parseFloat(m[6].replace(/,/g, '')) * toPaise(m[7])),
        discount_paise: toPaise(m[8]),
        taxable_value_paise: taxablePaise,
        cgst_rate_percent: taxRate / 2,
        cgst_amount_paise: Math.round(taxPaise / 2),
        sgst_rate_percent: taxRate / 2,
        sgst_amount_paise: Math.round(taxPaise / 2),
        total_amount_paise: taxablePaise + taxPaise,
      });
    }

    if (format1Parts.length > 0) {
      invoice.line_items.push(...format1Parts);
    } else {
      const partLines = partsText.split('\n');
      let current = null;
      for (const rawLine of partLines) {
        const line = rawLine.trim();
        const start = line.match(/^(\d{1,2})\s+([A-Z0-9]{8,15})(?:\s+(.*))?$/);
        if (start) {
          if (current && (current.unit_rate_paise > 0 || current.taxable_value_paise > 0)) {
            invoice.line_items.push(current);
          }
          current = {
            item_type: 'part',
            item_code: start[2],
            item_description: (start[3] || '').trim(),
            hsn_sac_code: '',
            billing_type: 'Paid',
            quantity: 1,
            uom: 'PC',
            unit_rate_paise: 0,
            total_value_paise: 0,
            discount_paise: 0,
            taxable_value_paise: 0,
            cgst_rate_percent: 9,
            cgst_amount_paise: 0,
            sgst_rate_percent: 9,
            sgst_amount_paise: 0,
            total_amount_paise: 0,
          };
          if (start[3]) {
            const inlineNum = start[3].match(/^(.*?)\s+(?:(\d{6,8})\s+)?(\d+)%\s+([\d\.]+)\s+([\d\.,]+)(?:\s+([\s\S]*))?$/);
            if (inlineNum) {
              current.item_description = inlineNum[1].trim();
              if (inlineNum[2]) current.hsn_sac_code = inlineNum[2];
              fillItemNumbers(current, inlineNum[3], inlineNum[4], inlineNum[5], inlineNum[6]);
            }
          }
        } else if (current) {
          if (line.match(/^\d{4,8}$/)) {
            current.hsn_sac_code = (current.hsn_sac_code + line).slice(0, 8);
          } else if (line.match(/^(\d+)%\s+([\d\.]+)/)) {
            const numMatch = line.match(/^(\d+)%\s+([\d\.]+)(?:\s+([\d\.,]+))?(?:\s+([\s\S]*))?$/);
            if (numMatch) {
              fillItemNumbers(current, numMatch[1], numMatch[2], numMatch[3] || '0', numMatch[4]);
            }
          } else if (!current.unit_rate_paise && line.length > 1 && !line.match(/^[0-9\.\s]+$/) && !line.startsWith('Part Invoice')) {
            current.item_description += ' ' + line;
          }
        }
      }
      if (current && (current.unit_rate_paise > 0 || current.taxable_value_paise > 0)) {
        invoice.line_items.push(current);
      }
    }
  }

  // 11b. Labour Parsing
  if (labourText) {
    const singleLineLabourRegex = /(?:^|\n)\s*(\d{1,2})\s+([A-Z0-9]{8,18})\s+([\s\S]+?)\s+(9987\d{2})\s+(\d+)%\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)/g;
    let m;
    const format1Labour = [];
    while ((m = singleLineLabourRegex.exec(labourText)) !== null) {
      const taxablePaise = toPaise(m[9]);
      const taxRate = parseFloat(m[5]);
      const taxPaise = Math.round(taxablePaise * (taxRate / 100));
      format1Labour.push({
        item_type: 'labour',
        item_code: m[2].trim(),
        item_description: m[3].replace(/\s+/g, ' ').trim(),
        hsn_sac_code: m[4].trim(),
        billing_type: 'Paid',
        quantity: parseFloat(m[6].replace(/,/g, '')),
        uom: 'HRS',
        unit_rate_paise: toPaise(m[7]),
        total_value_paise: Math.round(parseFloat(m[6].replace(/,/g, '')) * toPaise(m[7])),
        discount_paise: toPaise(m[8]),
        taxable_value_paise: taxablePaise,
        cgst_rate_percent: taxRate / 2,
        cgst_amount_paise: Math.round(taxPaise / 2),
        sgst_rate_percent: taxRate / 2,
        sgst_amount_paise: Math.round(taxPaise / 2),
        total_amount_paise: taxablePaise + taxPaise,
      });
    }

    if (format1Labour.length > 0) {
      invoice.line_items.push(...format1Labour);
    } else {
      const labourLines = labourText.split('\n');
      let current = null;
      for (const rawLine of labourLines) {
        const line = rawLine.trim();
        const start = line.match(/^(\d{1,2})\s+([A-Z0-9]{8,18})(?:\s+(.*))?$/);
        if (start) {
          if (current && (current.unit_rate_paise > 0 || current.taxable_value_paise > 0)) {
            invoice.line_items.push(current);
          }
          current = {
            item_type: 'labour',
            item_code: start[2],
            item_description: (start[3] || '').trim(),
            hsn_sac_code: '998729',
            billing_type: 'Paid',
            quantity: 1,
            uom: 'HRS',
            unit_rate_paise: 0,
            total_value_paise: 0,
            discount_paise: 0,
            taxable_value_paise: 0,
            cgst_rate_percent: 9,
            cgst_amount_paise: 0,
            sgst_rate_percent: 9,
            sgst_amount_paise: 0,
            total_amount_paise: 0,
          };
          if (start[3]) {
            const inlineNum = start[3].match(/^(.*?)\s+(?:(\d{6,8})\s+)?(\d+)%\s+([\d\.]+)\s+([\d\.,]+)(?:\s+([\s\S]*))?$/);
            if (inlineNum) {
              current.item_description = inlineNum[1].trim();
              if (inlineNum[2]) current.hsn_sac_code = inlineNum[2];
              fillItemNumbers(current, inlineNum[3], inlineNum[4], inlineNum[5], inlineNum[6]);
            }
          }
        } else if (current) {
          if (line.match(/(?:9987\d{2}\s+)?(\d+)%\s+([\d\.]+)/)) {
            const numMatch = line.match(/(?:9987\d{2}\s+)?(\d+)%\s+([\d\.]+)\s+([\d\.,]+)(?:\s+([\s\S]*))?$/);
            if (numMatch) {
              fillItemNumbers(current, numMatch[1], numMatch[2], numMatch[3] || '0', numMatch[4]);
            }
          } else if (!current.unit_rate_paise && line.length > 1 && !line.match(/^[0-9\.\s]+$/) && !line.startsWith('Labour and')) {
            current.item_description += ' ' + line;
          }
        }
      }
      if (current && (current.unit_rate_paise > 0 || current.taxable_value_paise > 0)) {
        invoice.line_items.push(current);
      }
    }
  }

  // Calculate totals breakdown if not already filled from summary block
  let sumPartsTaxable = 0, sumPartsTotal = 0, sumLabourTaxable = 0, sumLabourTotal = 0;
  for (const item of invoice.line_items) {
    if (item.item_type === 'part') {
      sumPartsTaxable += item.taxable_value_paise;
      sumPartsTotal += item.total_amount_paise;
    } else {
      sumLabourTaxable += item.taxable_value_paise;
      sumLabourTotal += item.total_amount_paise;
    }
  }

  if (invoice.parts_taxable_paise === 0) invoice.parts_taxable_paise = sumPartsTaxable;
  if (invoice.parts_total_paise === 0) invoice.parts_total_paise = sumPartsTotal;
  if (invoice.labour_taxable_paise === 0) invoice.labour_taxable_paise = sumLabourTaxable;
  if (invoice.labour_total_paise === 0) invoice.labour_total_paise = sumLabourTotal;

  if (invoice.net_amount_paise === 0) {
    invoice.net_amount_paise = invoice.parts_total_paise + invoice.labour_total_paise;
  }

  return invoice;
}

/**
 * Parser for Tata Motors Dealership Invoices
 */
function parseTataInvoice(text, filename = '') {
  const invoice = {
    brand_name: 'Tata Motors',
    dealer_name: 'BELLAD ENTERPRISES PRIVATE LIMITED',
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

  // 1. Invoice Number
  const invMatch = text.match(/(?:Invoice\s*Ref\.?|Invoice\s*No\.?)\s*:\s*([A-Za-z0-9]+)/i);
  if (invMatch && invMatch[1].length > 4 && !/^(date|amount|total|gstin|pan|cin)$/i.test(invMatch[1])) {
    invoice.invoice_number = invMatch[1].trim();
  } else {
    const fnMatch = filename.match(/([A-Za-z]{5,8}\d{8,12})/i);
    if (fnMatch) invoice.invoice_number = fnMatch[1].trim();
  }

  // 2. Invoice Date
  const dateMatch = text.match(/Invoice\s*Date\s*:\s*([0-9/.-]+)/i);
  if (dateMatch) invoice.invoice_date = dateMatch[1].trim();

  // 3. Customer Name
  // Priority A: Gate Pass "Customer Name : <Name>"
  const gpCustMatch = text.match(/Customer\s*Name\s*:\s*([^\n\r]+?)(?:\s+Invoice Ref|\s+Account Name|\n|$)/i);
  if (gpCustMatch && gpCustMatch[1].trim().length > 2) {
    invoice.customer_name = gpCustMatch[1].trim().replace(/\s{2,}/g, ' ');
  } else {
    // Priority B: Header line after IRN Ack Date
    const irnCustMatch = text.match(/IRN\s*Ack\s*Date\s*:\s*[0-9/.-]+\s*\n+\s*([A-Za-z\s.]+?)(?:\n|First Floor|Phone No|Customer GSTIN)/i);
    if (irnCustMatch && irnCustMatch[1].trim().length > 2) {
      invoice.customer_name = irnCustMatch[1].trim().replace(/\s{2,}/g, ' ');
    } else {
      // Priority C: Header line after Duplicate / Original
      const headerMatch = text.match(/(?:Duplicate\s*:For\s*Supplier|Original\s*:For\s*Recipient)\s*\n+(?:Mr\.|Mrs\.|Ms\.)?\s*([A-Za-z\s.]+?)(?:\n|Customer GSTIN|A\/C Code)/i);
      if (headerMatch && headerMatch[1].trim().length > 2) {
        invoice.customer_name = headerMatch[1].trim().replace(/\s{2,}/g, ' ');
      }
    }
  }

  // 4. Customer Phone
  const phoneMatch = text.match(/Phone\s*No(?:\s*\([^)]*\))?\s*:\s*[, ]*([6-9]\d{9})/i);
  if (phoneMatch) invoice.customer_phone = phoneMatch[1].trim();

  // 5. Vehicle Registration (Careful: avoid IRN hash)
  const regMatch = text.match(/Vehicle\s*(?:Regn\.?\s*)?No\s*:\s*([A-Za-z]{2}\s*\d{1,2}\s*[A-Za-z]{1,3}\s*\d{3,4})/i);
  if (regMatch) {
    invoice.registration_number = normalizeRegNo(regMatch[1]);
  }

  // 6. VIN / Chassis No
  const vinMatch = text.match(/Chassis\s*No\s*:\s*([A-Za-z0-9]{17})/i);
  if (vinMatch) invoice.vin = vinMatch[1].trim();

  // 7. Model
  const modelMatch = text.match(/(?:Model\s*Name|Model)\s*:\s*([^\n\r_]+)/i);
  if (modelMatch) invoice.model = modelMatch[1].trim();

  // 8. Job Card No
  const jcMatch = text.match(/Job\s*Card(?:\s*No\.?|\s*\/\s*Order\s*ref)?\s*:\s*([A-Za-z0-9-]+)/i);
  if (jcMatch) {
    invoice.job_card_number = jcMatch[1].trim();
    invoice.repair_order_number = jcMatch[1].trim();
  }

  // 9. Odometer
  const odoMatch = text.match(/Kms\.?\s*:\s*(\d+)/i);
  if (odoMatch) invoice.odometer_kms = parseInt(odoMatch[1], 10);

  // 10. Totals and GST Summary
  const grandMatch = text.match(/(?:Grand\s*Total|Invoice\s*Amount\s*:\s*Rs\.)\s*:?\s*([\d,]+\.?\d*)/i);
  if (grandMatch) invoice.net_amount_paise = toPaise(grandMatch[1]);

  const partsTaxMatch = text.match(/Parts\s*Net\s*Taxable\s*Amount\s*:\s*([\d,]+\.?\d*)/i);
  if (partsTaxMatch) invoice.parts_taxable_paise = toPaise(partsTaxMatch[1]);

  const finalPartsMatch = text.match(/Final\s*Parts\s*Invoice\s*Amount\s*:\s*([\d,]+\.?\d*)/i);
  if (finalPartsMatch) invoice.parts_total_paise = toPaise(finalPartsMatch[1]);

  const finalLabourMatch = text.match(/Final\s*Labour\s*Invoice\s*Amount\s*:\s*([\d,]+\.?\d*)/i);
  if (finalLabourMatch) {
    invoice.labour_total_paise = toPaise(finalLabourMatch[1]);
  }

  // Taxes
  const cgstLabMatch = text.match(/CGST\s*on\s*Labour\s*:\s*([\d,]+\.?\d*)/i);
  const sgstLabMatch = text.match(/SGST\s*on\s*Labour\s*:\s*([\d,]+\.?\d*)/i);
  const cgstPartsMatch = text.match(/CGST\s*on\s*Parts\s*:\s*([\d,]+\.?\d*)/i);
  const sgstPartsMatch = text.match(/SGST\s*on\s*Parts\s*:\s*([\d,]+\.?\d*)/i);

  const cgstPaise = (cgstLabMatch ? toPaise(cgstLabMatch[1]) : 0) + (cgstPartsMatch ? toPaise(cgstPartsMatch[1]) : 0);
  const sgstPaise = (sgstLabMatch ? toPaise(sgstLabMatch[1]) : 0) + (sgstPartsMatch ? toPaise(sgstPartsMatch[1]) : 0);
  invoice.cgst_paise = cgstPaise;
  invoice.sgst_paise = sgstPaise;

  if (invoice.labour_total_paise > 0) {
    const labTaxPaise = (cgstLabMatch ? toPaise(cgstLabMatch[1]) : 0) + (sgstLabMatch ? toPaise(sgstLabMatch[1]) : 0);
    invoice.labour_taxable_paise = Math.max(0, invoice.labour_total_paise - labTaxPaise);
  }

  // Build line items from parts and labour if summary exists
  if (invoice.parts_taxable_paise > 0) {
    invoice.line_items.push({
      item_type: 'part',
      description: 'Tata Genuine Spare Parts (Consolidated)',
      taxable_value_paise: invoice.parts_taxable_paise,
      cgst_rate_percent: 9,
      sgst_rate_percent: 9,
      cgst_amount_paise: cgstPartsMatch ? toPaise(cgstPartsMatch[1]) : Math.round(invoice.parts_taxable_paise * 0.09),
      sgst_amount_paise: sgstPartsMatch ? toPaise(sgstPartsMatch[1]) : Math.round(invoice.parts_taxable_paise * 0.09),
      total_amount_paise: invoice.parts_total_paise || Math.round(invoice.parts_taxable_paise * 1.18)
    });
  }

  if (invoice.labour_taxable_paise > 0) {
    invoice.line_items.push({
      item_type: 'labour',
      description: 'Tata Workshop Labour & Services (Consolidated)',
      taxable_value_paise: invoice.labour_taxable_paise,
      cgst_rate_percent: 9,
      sgst_rate_percent: 9,
      cgst_amount_paise: cgstLabMatch ? toPaise(cgstLabMatch[1]) : Math.round(invoice.labour_taxable_paise * 0.09),
      sgst_amount_paise: sgstLabMatch ? toPaise(sgstLabMatch[1]) : Math.round(invoice.labour_taxable_paise * 0.09),
      total_amount_paise: invoice.labour_total_paise || Math.round(invoice.labour_taxable_paise * 1.18)
    });
  }

  invoice.summary = {
    parts_count: invoice.parts_taxable_paise > 0 ? 1 : 0,
    labour_count: invoice.labour_taxable_paise > 0 ? 1 : 0,
    parts_total_rupees: invoice.parts_total_paise / 100,
    labour_total_rupees: invoice.labour_total_paise / 100,
    parts_taxable_rupees: invoice.parts_taxable_paise / 100,
    labour_taxable_rupees: invoice.labour_taxable_paise / 100,
    net_payable_rupees: invoice.net_amount_paise / 100
  };

  return invoice;
}

/**
 * Parser for MG Motors Dealership Invoices
 */
function parseMgInvoice(text, filename = '') {
  const invoice = {
    brand_name: 'MG Motors',
    dealer_name: 'BELLAD AND COMPANY PVT LTD (MG)',
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

  // 1. Invoice Number (e.g. S311S26102517)
  const invMatch = text.match(/Invoice\s*No\.?\s*:\s*([A-Za-z0-9]+)/i);
  if (invMatch && !/^(date|amount|total|gstin|pan|cin)$/i.test(invMatch[1].trim())) {
    invoice.invoice_number = invMatch[1].trim();
  }

  // 2. RO Number / Job Card (e.g. S311323589)
  const roMatch = text.match(/RO\s*No\.?\s*:\s*([A-Za-z0-9]+)/i);
  if (roMatch) {
    invoice.job_card_number = roMatch[1].trim();
    invoice.repair_order_number = roMatch[1].trim();
    if (!invoice.invoice_number) {
      invoice.invoice_number = roMatch[1].trim();
    }
  }

  // 3. Invoice Date
  const dateMatch = text.match(/Invoice\s*Date\s*:\s*([0-9.]+)/i);
  if (dateMatch) invoice.invoice_date = dateMatch[1].trim();

  // 4. Customer Name & Phone
  const billMatch = text.match(/Bill\s*to\s*:\s*\n*(?:Cust\s*ID\s*:\s*\d+\s*\n*)?([A-Za-z. ]+?)(?:\s*\n|#|\d{2,}|Bellary|Hubli|Karnataka|Mobile)/i);
  if (billMatch && billMatch[1].trim().length > 2) {
    invoice.customer_name = billMatch[1].trim().replace(/\s*\.$/, '').replace(/\s{2,}/g, ' ');
  }

  const phoneMatch = text.match(/Mobile\s*:\s*([6-9]\d{9})/i);
  if (phoneMatch) invoice.customer_phone = phoneMatch[1].trim();

  // 5. Registration Number
  const regMatch = text.match(/Reg\s*No\.?\s*:\s*([A-Za-z0-9]+)/i);
  if (regMatch) invoice.registration_number = normalizeRegNo(regMatch[1]);

  // 6. VIN (17 alphanumeric, excluding CIN which starts with U)
  const vinMatch = text.match(/VIN\s*:\s*([A-HJ-NPR-Z0-9]{17})/i);
  if (vinMatch) invoice.vin = vinMatch[1].trim();

  // 7. Model
  const modelMatch = text.match(/Model\s*:\s*([^\n\r]+)/i);
  if (modelMatch) invoice.model = modelMatch[1].trim();

  // 8. Odometer
  const odoMatch = text.match(/Mileage\s*:\s*(\d+)/i);
  if (odoMatch) invoice.odometer_kms = parseInt(odoMatch[1], 10);

  // 9. Totals & GST Summary
  const taxAmtMatch = text.match(/Taxable\s*amount\s*:\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i);
  if (taxAmtMatch) {
    invoice.parts_taxable_paise = toPaise(taxAmtMatch[1]);
    invoice.labour_taxable_paise = toPaise(taxAmtMatch[2]);
  }

  const cgstMatch = text.match(/CGST\s*amount\s*:\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i);
  const sgstMatch = text.match(/SGST\s*amount\s*:\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i);
  if (cgstMatch && sgstMatch) {
    const cgstTotal = toPaise(cgstMatch[1]) + toPaise(cgstMatch[2]);
    const sgstTotal = toPaise(sgstMatch[1]) + toPaise(sgstMatch[2]);
    invoice.cgst_paise = cgstTotal;
    invoice.sgst_paise = sgstTotal;
  }

  const grandMatch = text.match(/(?:Grand\s*Total|Net\s*Payable\s*Amount)\s*:\s*([\d,]+\.?\d*)/i);
  if (grandMatch) invoice.net_amount_paise = toPaise(grandMatch[1]);

  invoice.parts_total_paise = Math.round(invoice.parts_taxable_paise * 1.18);
  invoice.labour_total_paise = Math.round(invoice.labour_taxable_paise * 1.18);

  if (invoice.parts_taxable_paise > 0) {
    invoice.line_items.push({
      item_type: 'part',
      description: 'MG Genuine Parts & Consumables',
      taxable_value_paise: invoice.parts_taxable_paise,
      cgst_rate_percent: 9,
      sgst_rate_percent: 9,
      cgst_amount_paise: Math.round(invoice.parts_taxable_paise * 0.09),
      sgst_amount_paise: Math.round(invoice.parts_taxable_paise * 0.09),
      total_amount_paise: invoice.parts_total_paise
    });
  }

  if (invoice.labour_taxable_paise > 0) {
    invoice.line_items.push({
      item_type: 'labour',
      description: 'MG Workshop Labour & Services',
      taxable_value_paise: invoice.labour_taxable_paise,
      cgst_rate_percent: 9,
      sgst_rate_percent: 9,
      cgst_amount_paise: Math.round(invoice.labour_taxable_paise * 0.09),
      sgst_amount_paise: Math.round(invoice.labour_taxable_paise * 0.09),
      total_amount_paise: invoice.labour_total_paise
    });
  }

  invoice.summary = {
    parts_count: invoice.parts_taxable_paise > 0 ? 1 : 0,
    labour_count: invoice.labour_taxable_paise > 0 ? 1 : 0,
    parts_total_rupees: invoice.parts_total_paise / 100,
    labour_total_rupees: invoice.labour_total_paise / 100,
    parts_taxable_rupees: invoice.parts_taxable_paise / 100,
    labour_taxable_rupees: invoice.labour_taxable_paise / 100,
    net_payable_rupees: invoice.net_amount_paise / 100
  };

  return invoice;
}

/**
 * Generic Fallback Parser for Dealership Invoices
 */
function parseGenericInvoice(text, originalFilename = '') {
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

  // 1. Customer Name
  const custNameMatch = 
    text.match(/Customer\s*Name\s*[:\-]?\s*([A-Za-z\s.]{3,50}?)(?:\s+Invoice Ref|\s+Account Name|\s+Cust ID|\n|$)/i) ||
    text.match(/Bill\s*to\s*:\s*\n*(?:Cust\s*ID\s*:\s*\d+\s*\n*)?([A-Za-z. ]{3,50}?)(?:\s*\n|#|\d{2,}|Bellary|Hubli|Karnataka|Mobile)/i) ||
    text.match(/(?:Client|Customer|Party)\s*Name\s*[:\-]?\s*([A-Za-z\s.]{3,50})/i) ||
    text.match(/Name\s*[:\-]\s*([A-Za-z\s.]{3,40})/i);

  if (custNameMatch) {
    const candidate = custNameMatch[1].trim().replace(/\s{2,}/g, ' ');
    if (candidate.length > 2 && !/^(VIN|INVOICE|ORIGINAL|DUPLICATE|TAX|TOTAL|DATE|BELLAD|DEALER)/i.test(candidate)) {
      invoice.customer_name = candidate;
    }
  }

  // 2. Customer Phone
  const phoneMatch = text.match(/(?:Mobile|Phone|Mob|Ph|Contact)(?:\s*No)?(?:\s*\([^)]*\))?\s*[:\-]?\s*[, ]*([6-9]\d{9})/i);
  if (phoneMatch) invoice.customer_phone = phoneMatch[1].trim();

  // 3. Invoice Number
  const invMatch = text.match(/(?:Invoice\s*No|Invoice\s*Number|Invoice\s*Ref\.?|Bill\s*No)[\s:\.]*([A-Za-z0-9\/-]+)/i);
  if (invMatch && !/^(date|amount|total|no|gstin|pan|cin)$/i.test(invMatch[1].trim())) {
    invoice.invoice_number = invMatch[1].trim();
  } else {
    const fnMatch = String(originalFilename).match(/\b([A-Za-z0-9_-]{6,25})\b/i);
    if (fnMatch && !/^(invoice|bill|scan|pdf)/i.test(fnMatch[1])) {
      invoice.invoice_number = fnMatch[1].trim();
    }
  }

  // 4. Vehicle Registration
  const regLabelMatch = text.match(/(?:Vehicle\s*No|Vehicle\s*Regn\.?\s*No|Registration\s*No|Reg\s*No\.?)\s*[:\-]?\s*([A-Za-z0-9 -]+)/i);
  if (regLabelMatch) {
    const norm = normalizeRegNo(regLabelMatch[1]);
    if (norm) invoice.registration_number = norm;
  }
  if (!invoice.registration_number) {
    const regMatch = text.match(/\b([A-Za-z]{2}\s*\d{1,2}\s*[A-Za-z]{1,3}\s*\d{3,4})\b/i);
    if (regMatch) invoice.registration_number = normalizeRegNo(regMatch[1]);
  }

  // 5. VIN / Chassis
  const vinLabelMatch = text.match(/(?:Chassis\s*No|VIN)\s*[:\-]?\s*([A-HJ-NPR-Z0-9]{17})/i);
  if (vinLabelMatch) {
    invoice.vin = vinLabelMatch[1].trim();
  } else {
    const all17 = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/g) || [];
    const validVin = all17.find(c => !c.startsWith('U') && !c.startsWith('L') && /\d/.test(c) && /[A-Z]/.test(c));
    if (validVin) invoice.vin = validVin;
  }

  // 6. Model
  const modelMatch = text.match(/(?:Model\s*Name|Model)\s*[:\-]?\s*([^\n\r_]+)/i);
  if (modelMatch) invoice.model = modelMatch[1].trim();

  // 7. Odometer
  const kmsMatch = text.match(/(?:Kms|Kilometers|Odometer|Mileage)[\s:\.]*(\d+)/i);
  if (kmsMatch) invoice.odometer_kms = parseInt(kmsMatch[1], 10);

  // 8. Job Card / RO
  const jcMatch = text.match(/(?:Job\s*Card(?:\s*No\.?|\s*\/\s*Order\s*ref)?|RO\s*No\.?)\s*[:\-]?\s*([A-Za-z0-9-]+)/i);
  if (jcMatch) {
    invoice.job_card_number = jcMatch[1].trim();
    invoice.repair_order_number = jcMatch[1].trim();
  }

  // 9. Totals
  const netMatch = text.match(/(?:Grand\s*Total|Invoice\s*Amount\s*:\s*Rs\.|Total\s*Amount|Net\s*Amount|Net\s*Payable\s*Amount)[\s:\.]*(?:Rs\.?)?\s*([\d,]+\.?\d*)/i);
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
    parsedData = parseHyundaiInvoice(text, originalFilename);
  } else if (brand === 'Tata Motors') {
    parsedData = parseTataInvoice(text, originalFilename);
  } else if (brand === 'MG Motors') {
    parsedData = parseMgInvoice(text, originalFilename);
  } else {
    parsedData = parseGenericInvoice(text, originalFilename);
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

/**
 * Deletes an advisor invoice queue item and deletes its PDF file from disk.
 */
async function deleteAdvisorQueueItem(id, tenantId = 'bellad_and_company') {
  // 1. Fetch item to get file path
  const item = await getAdvisorQueueItem(id, tenantId);
  if (!item) return null;

  // 2. Remove physical PDF file if it exists
  if (item.file_path) {
    try {
      const fullPath = path.resolve(__dirname, '../../', item.file_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (fileErr) {
      console.warn(`[InvoiceV2Service] Failed to unlink file ${item.file_path}:`, fileErr.message);
    }
  }

  // 3. Delete DB record
  const sql = `DELETE FROM advisor_invoice_queue WHERE id = $1 AND tenant_id = $2 RETURNING *;`;
  const res = await pool.query(sql, [id, tenantId]);
  return res.rows[0] || null;
}

module.exports = {
  extractTextFromPdf,
  detectBrandAndFormat,
  parseHeroInvoice,
  parseHyundaiInvoice,
  parseTataInvoice,
  parseMgInvoice,
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
  updateAdvisorQueueStatus,
  deleteAdvisorQueueItem
};
