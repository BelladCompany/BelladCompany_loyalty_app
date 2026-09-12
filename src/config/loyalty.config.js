// src/config/loyalty.config.js

/**
 * Confirmed Loyalty Program Rates
 * 
 * REDEMPTION: 4 points = ₹1 discount
 *   rupees_from_points = points * POINTS_PER_RUPEE_REDEMPTION = points / 4
 * 
 * EARNING (service/accessory/bodyshop): 4 points per ₹100 spent
 *   points_earned = (amount_in_rupees / 100) * POINTS_PER_100_RUPEES_EARNED
 */

module.exports = {
  // 4 points = ₹1 discount (0.25)
  POINTS_PER_RUPEE_REDEMPTION: 0.25,

  // 4 points per ₹100 cash paid
  POINTS_PER_100_RUPEES_EARNED: 4,
};
