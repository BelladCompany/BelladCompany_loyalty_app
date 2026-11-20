/**
 * Application Version & Feature Guard Configuration
 * 
 * Version 1 (v1) - Core Dealership Loyalty:
 *   - Customer Search & 360 Passbook
 *   - Point Credits, Rule Matching, Invoice Receipts
 *   - Counter Redemptions & RealBooks Sync
 *   - KYC Approvals & Bill Correction Queue
 *   - Director Command Center (Core Overview)
 *   - User & Role Management
 *   - Rules & Logic Studio (Master Rule Editor)
 *   - Reports & Analytics
 *   (Gift Cards, Referrals, and App Builder are clean, hidden, and deactivated)
 * 
 * Version 2 (v2) - Full Enterprise Suite:
 *   - Everything in Version 1
 *   - Gift Card Rewards & Escrow
 *   - Customer Referrals Pipeline & Slabs
 *   - Visual Loyalty App Builder (WordPress-style Canvas)
 */

export const APP_VERSIONS = {
  V1: 'v1',
  V2: 'v2',
};

export function isUserAdmin(user = null) {
  let targetUser = user;
  if (!targetUser) {
    try {
      const uStr = localStorage.getItem('bac_loyalty_user');
      if (uStr) targetUser = JSON.parse(uStr);
    } catch (e) {}
  }
  const role = String(targetUser?.role || '').toLowerCase();
  const username = String(targetUser?.username || '').toLowerCase();
  return ['admin', 'super_admin', 'regional_admin', 'director', 'management'].includes(role) ||
         username === 'agstya' || username === 'agastya';
}

export function getAppVersion() {
  try {
    const saved = localStorage.getItem('bac_loyalty_app_version');
    if (saved === 'v1' || saved === 'v2') {
      return saved;
    }
  } catch (e) {}

  const envVer = (import.meta.env.VITE_APP_VERSION || '').toLowerCase().trim();
  if (envVer === 'v1') {
    return 'v1';
  }

  // Default to Version 2 (Full Enterprise Suite) as requested by management
  return 'v2';
}

export function setAppVersion(ver) {
  const cleanVer = ver === 'v2' ? 'v2' : 'v1';
  try {
    localStorage.setItem('bac_loyalty_app_version', cleanVer);
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('bac_version_changed', { detail: { version: cleanVer } }));
}

/**
 * Checks if a feature should be rendered based on active app version and user role.
 * Non-admin operators (cashiers, managers, accounts) are strictly locked to Version 1 (Core Loyalty).
 * Only Admin / Director can toggle or access Version 2.
 */
export function isFeatureEnabled(featureName, user = null) {
  const normalized = String(featureName || '').toLowerCase().trim();

  // Campaign Add-on Engine is strictly accessible to Director/Admin
  if (normalized === 'campaigns' || normalized === 'campaign_addons') {
    return isUserAdmin(user);
  }

  const isV2Feature = [
    'giftcards', 'gift_cards', 'gift_card_rewards', 'gift',
    'referrals', 'referral', 'referral_rewards',
    'builder', 'app_builder', 'loyalty_app_builder'
  ].includes(normalized);

  // Non-admin staff (e.g. cashier) NEVER receive V2 features under any circumstances
  if (!isUserAdmin(user)) {
    if (isV2Feature) return false;
    return true;
  }

  // Admin / Director users check the active App Version toggle
  const ver = getAppVersion();
  if (ver === 'v2') {
    return true;
  }

  if (isV2Feature) {
    return false;
  }

  return true;
}
