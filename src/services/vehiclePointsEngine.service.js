/**
 * Vehicle Sales Points Calculation Engine (Pure Functions)
 * 
 * FORMULA:
 * points_base = max(0, ex_showroom_price − tcs_amount − dealer_cash_discount − emps_discount − oem_offers_amount − Σ(generic_additional_discounts))
 * points = Math.floor(points_base * rate)
 */

class VehiclePointsEngine {
  /**
   * List of line item categories/types strictly EXCLUDED from vehicle sales points calculations.
   * Insurance, Processing Charges, Packages, Fast Tag, Registration, Road Tax, Accessories are handled separately.
   */
  static EXCLUDED_CATEGORIES = [
    'insurance',
    'processing_charge',
    'processing_charges',
    'package',
    'packages',
    'fast_tag',
    'fastag',
    'registration',
    'road_tax',
    'tax',
    'accessories',
    'accessory',
  ];

  /**
   * Safely parses any input (strings with currency symbols/commas, null, undefined, numbers) into a float.
   * @param {any} val 
   * @returns {number}
   */
  static cleanNumber(val) {
    if (val == null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).replace(/[^0-9.\-]/g, '').trim();
    if (!str) return 0;
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Checks whether a discount row / name is in the excluded category list.
   * @param {string} discountTypeOrName 
   * @returns {boolean}
   */
  static isExcludedCategory(discountTypeOrName) {
    if (!discountTypeOrName) return false;
    const normalized = String(discountTypeOrName).toLowerCase().trim().replace(/[\s_\-]+/g, '_');
    return this.EXCLUDED_CATEGORIES.some((cat) => normalized.includes(cat));
  }

  /**
   * Normalizes rate input to a floating-point multiplier value.
   * Supports number (0.01), object { multiplier_numerator, multiplier_denominator }, or { points_per_100 }.
   * @param {number|object} rateInput 
   * @returns {number}
   */
  static parseRate(rateInput) {
    if (typeof rateInput === 'number' && !isNaN(rateInput)) {
      return rateInput;
    }
    if (rateInput && typeof rateInput === 'object') {
      if (rateInput.multiplier_numerator != null && rateInput.multiplier_denominator != null) {
        const num = Number(rateInput.multiplier_numerator);
        const den = Number(rateInput.multiplier_denominator);
        if (den !== 0) return num / den;
      }
      if (rateInput.points_per_100 != null) {
        return Number(rateInput.points_per_100) / 100;
      }
    }
    // Default fallback: 1 point per ₹100 (0.01 rate)
    return 0.01;
  }

  /**
   * Formats currency string for breakdown output (e.g. ₹171,866)
   * @param {number} amount 
   * @returns {string}
   */
  static formatRupees(amount) {
    const rounded = Math.round(Number(amount) || 0);
    return `₹${rounded.toLocaleString('en-IN')}`;
  }

  /**
   * Pure calculation function for vehicle sales points.
   * 
   * FORMULA:
   * points_base = max(0, ex_showroom_price − tcs_amount − dealer_cash_discount − emps_discount − oem_offers_amount − Σ(valid_additional_discounts))
   * points = Math.floor(points_base * rate)
   * 
   * @param {Object} rawInvoiceData
   * @param {number|string} rawInvoiceData.ex_showroom_price Raw ex-showroom price in rupees
   * @param {number|string} [rawInvoiceData.tcs_amount=0] TCS amount in rupees
   * @param {number|string} [rawInvoiceData.dealer_cash_discount=0] Dealer cash discount in rupees
   * @param {number|string} [rawInvoiceData.emps_discount=0] EMPS discount in rupees
   * @param {number|string} [rawInvoiceData.oem_offers_amount=0] OEM offers amount in rupees
   * @param {Array<Object>} [rawInvoiceData.additional_discounts=[]] Sub-table rows of generic discounts [{ discount_type, discount_name, amount }]
   * 
   * @param {number|Object} rateConfig Scoped tenant rate rule
   * @param {Object} [options={}]
   * @param {string} [options.roundingMode='floor'] Rounding mode ('floor', 'round', 'ceil')
   * 
   * @returns {Object} Calculation result containing points_base, points, reason_text, total_deductions, breakdown
   */
  static calculatePoints(rawInvoiceData, rateConfig, options = {}) {
    const roundingMode = options.roundingMode || 'floor';
    const rate = this.parseRate(rateConfig);

    const exShowroom = Math.max(0, this.cleanNumber(rawInvoiceData?.ex_showroom_price));
    const dealerDisc = this.cleanNumber(rawInvoiceData?.dealer_cash_discount);
    const empsDisc = this.cleanNumber(rawInvoiceData?.emps_discount);
    const oemOffers = this.cleanNumber(rawInvoiceData?.oem_offers_amount);

    let additionalDiscountsTotal = 0;
    const validAdditionalDiscounts = [];

    if (Array.isArray(rawInvoiceData?.additional_discounts)) {
      for (const disc of rawInvoiceData.additional_discounts) {
        const type = disc.discount_type || disc.discount_name || '';
        const name = disc.discount_name || disc.discount_type || 'Discount';
        if (!this.isExcludedCategory(type) && !this.isExcludedCategory(name)) {
          const amt = this.cleanNumber(disc.amount || (disc.amount_paise != null ? disc.amount_paise / 100 : 0));
          if (amt > 0) {
            additionalDiscountsTotal += amt;
            validAdditionalDiscounts.push({ ...disc, amount: amt, discount_name: name });
          }
        }
      }
    }

    const totalDiscountAmount = dealerDisc + empsDisc + oemOffers + additionalDiscountsTotal;
    const netExShowroomPrice = Math.max(0, exShowroom - totalDiscountAmount);

    // SAFEGUARD: If total_discount_amount > 0, net_ex_showroom_price must never equal ex_showroom_price
    if (totalDiscountAmount > 0 && netExShowroomPrice === exShowroom) {
      console.warn(`⚠️ [VehiclePointsEngine Safeguard Alert] total_discount_amount (${totalDiscountAmount}) > 0 but net_ex_showroom_price (${netExShowroomPrice}) equals gross ex_showroom_price (${exShowroom})!`);
    }

    const pointsBase = netExShowroomPrice;
    const rawPoints = pointsBase * rate;
    let points = 0;
    if (roundingMode === 'floor') {
      points = Math.floor(rawPoints);
    } else if (roundingMode === 'ceil') {
      points = Math.ceil(rawPoints);
    } else if (roundingMode === 'round') {
      points = Math.round(rawPoints);
    } else {
      points = Math.floor(rawPoints);
    }

    points = Math.max(0, points);

    // Build reason text breakdown
    const breakdownParts = [
      `ex-showroom ${this.formatRupees(exShowroom)}`,
      `− dealer discount ${this.formatRupees(dealerDisc)}`,
      `− EMPS ${this.formatRupees(empsDisc)}`,
      `− OEM offers ${this.formatRupees(oemOffers)}`,
    ];

    for (const addDisc of validAdditionalDiscounts) {
      breakdownParts.push(`− ${addDisc.discount_name} ${this.formatRupees(addDisc.amount)}`);
    }

    const reasonText = `Vehicle purchase — ${breakdownParts.join(' ')} = ${this.formatRupees(netExShowroomPrice)} → +${points.toLocaleString('en-IN')} pts`;

    return {
      points_base: netExShowroomPrice,
      net_ex_showroom_price: netExShowroomPrice,
      points,
      rate,
      total_discount_amount: totalDiscountAmount,
      total_deductions: totalDiscountAmount,
      ex_showroom_price: exShowroom,
      tcs_amount: this.cleanNumber(rawInvoiceData?.tcs_amount),
      dealer_cash_discount: dealerDisc,
      emps_discount: empsDisc,
      oem_offers_amount: oemOffers,
      additional_discounts: validAdditionalDiscounts,
      reason_text: reasonText,
    };
  }

  /**
   * Helper to compute manual correction breakdown string
   */
  static formatCorrectionReason(originalTxId, previousPoints, newPoints, newBreakdownReason) {
    const delta = newPoints - previousPoints;
    const sign = delta >= 0 ? `+${delta}` : `${delta}`;
    return `Correction for vehicle purchase ${originalTxId} — revised calc: [${newBreakdownReason}] — previous pts: ${previousPoints}, new pts: ${newPoints} → adjustment ${sign} pts`;
  }
}

module.exports = VehiclePointsEngine;
