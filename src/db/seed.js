const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const env = require('../config/env');
const { hashIdentifier, encrypt, lastDigits } = require('../utils/crypto.util');

async function seed() {
  console.log('🌱 Seeding comprehensive database records...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenantId = env.defaultTenantId || 'bellad_and_company';

    // 1. Seed Firms
    await client.query(
      `INSERT INTO firms (tenant_id, firm_name, legal_name, brand_slug, theme_color, accent_color, point_to_rupee_rate, contact_email)
       VALUES
         ('bellad_and_company', 'Bellad & Company', 'Bellad Automobile Corporation Pvt Ltd', 'bellad', '#0f172a', '#f97316', 0.25, 'support@bellad.co.in'),
         ('BAC-MAIN', 'Bellad Main Hub', 'Bellad Auto Group Main Hub', 'bellad-main', '#0f172a', '#f97316', 0.25, 'admin@bellad.co.in'),
         ('trident_automobiles', 'Trident Automobiles', 'Trident Hyundai & Automobiles Ltd', 'trident', '#0b192c', '#008dda', 0.25, 'loyalty@tridentauto.in'),
         ('advaith_motors', 'Advaith Motors', 'Advaith Hyundai Dealer Group Pvt Ltd', 'advaith', '#1e201e', '#3b82f6', 0.25, 'rewards@advaithmotors.com')
       ON CONFLICT (tenant_id) DO NOTHING;`
    );

    // 2. Seed Brands
    let brandRow = (await client.query(
      `SELECT brand_id AS id, brand_name AS name FROM brands WHERE tenant_id = $1 AND brand_name = $2;`,
      [tenantId, 'Hyundai']
    )).rows[0];
    if (!brandRow) {
      brandRow = (await client.query(
        `INSERT INTO brands (brand_name, tenant_id)
         VALUES ($1, $2)
         RETURNING brand_id AS id, brand_name AS name;`,
        ['Hyundai', tenantId]
      )).rows[0];
    }
    const brandId = brandRow ? brandRow.id : 1;

    // 3. Seed Branches
    let branchRow = (await client.query(
      `SELECT branch_id AS id, branch_name AS name FROM branches WHERE tenant_id = $1 AND branch_name = $2;`,
      [tenantId, 'Central Showroom - Bangalore']
    )).rows[0];
    if (!branchRow) {
      branchRow = (await client.query(
        `INSERT INTO branches (branch_name, branch_city, tenant_id)
         VALUES ($1, $2, $3)
         RETURNING branch_id AS id, branch_name AS name;`,
        ['Central Showroom - Bangalore', 'Bangalore', tenantId]
      )).rows[0];
    }
    const branchId = branchRow ? branchRow.id : 1;

    // 4. Seed Users (admin and cashier)
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    const cashierPasswordHash = await bcrypt.hash('Cashier@123', 10);

    await client.query(
      `INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
       VALUES ($1, $2, 'admin', $3, $4)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, tenant_id = EXCLUDED.tenant_id;`,
      ['admin', adminPasswordHash, branchId, tenantId]
    );

    await client.query(
      `INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
       VALUES ($1, $2, 'cashier', $3, $4)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, tenant_id = EXCLUDED.tenant_id;`,
      ['cashier', cashierPasswordHash, branchId, tenantId]
    );

    // 5. Seed Tier Rules
    const tiers = [
      { name: 'Silver', minPoints: 0 },
      { name: 'Gold', minPoints: 5000 },
      { name: 'Platinum', minPoints: 15000 },
      { name: 'Diamond', minPoints: 35000 },
    ];

    for (const tier of tiers) {
      const existingTier = (await client.query(
        `SELECT tier_rule_id FROM tier_rules WHERE tenant_id = $1 AND tier_name = $2;`,
        [tenantId, tier.name]
      )).rows[0];
      if (!existingTier) {
        await client.query(
          `INSERT INTO tier_rules (tenant_id, tier_name, min_lifetime_points)
           VALUES ($1, $2, $3);`,
          [tenantId, tier.name, tier.minPoints]
        );
      }
    }

    // 6. Seed Point Rules safely according to active schema columns
    const colCheck = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'point_rules';`
    );
    const colNames = colCheck.rows.map((r) => r.column_name);
    const typeCol = colNames.includes('rule_type') ? 'rule_type' : (colNames.includes('rate_type') ? 'rate_type' : 'rule_type');

    if (colNames.includes('multiplier_numerator') && colNames.includes('multiplier_denominator')) {
      await client.query(
        `INSERT INTO point_rules (tenant_id, ${typeCol}, vehicle_type, service_type, condition_value, points, multiplier_numerator, multiplier_denominator, description)
         VALUES
           ($1, 'sale', 'all', NULL, NULL, 0, 1, 100, 'Vehicle sale 1 pt per ₹100 net ex-showroom'),
           ($1, 'service', 'all', NULL, NULL, 0, 1, 100, 'Service 1 pt per ₹100'),
           ($1, 'finance', '2W', 'finance', 'in_house', 100, 100, 1, 'In-house finance bonus - 2W'),
           ($1, 'insurance', '2W', 'insurance', 'in_house', 50, 50, 1, 'In-house insurance bonus - 2W'),
           ($1, 'exchange', '2W', 'exchange', 'yes', 200, 200, 1, 'Exchange bonus - 2W'),
           ($1, 'finance', '4W', 'finance', 'in_house', 100, 100, 1, 'In-house finance bonus - 4W'),
           ($1, 'insurance', '4W', 'insurance', 'in_house', 50, 50, 1, 'In-house insurance bonus - 4W'),
           ($1, 'exchange', '4W', 'exchange', 'yes', 200, 200, 1, 'Exchange bonus - 4W')
         ON CONFLICT DO NOTHING;`,
        [tenantId]
      );
    } else if (colNames.includes('points_per_100')) {
      await client.query(
        `INSERT INTO point_rules (tenant_id, ${typeCol}, points_per_100)
         VALUES
           ($1, 'sale', 1.00),
           ($1, 'service', 1.00)
         ON CONFLICT DO NOTHING;`,
        [tenantId]
      );
    }

    // ─── 7. SEED DUMMY CUSTOMER 1 (In-house Services Showcase) ───────────────
    const cust1Id = 'BAC-9001';
    const aadhaar1 = '543287651092';
    const phone1 = '9845012345';
    const aadhaar1Hash = hashIdentifier(aadhaar1);
    const aadhaar1Enc = encrypt(lastDigits(aadhaar1, 4));

    await client.query(
      `INSERT INTO customers (
        customer_id, customer_name, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
        age, firm_name, branch_name, address, is_first_time_visitor, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, $10)
      ON CONFLICT (customer_id) DO UPDATE
      SET customer_name = EXCLUDED.customer_name,
          aadhaar_number = EXCLUDED.aadhaar_number,
          tenant_id = EXCLUDED.tenant_id;`,
      [
        cust1Id,
        'Rajesh Kumar Sharma',
        aadhaar1,
        aadhaar1Hash,
        aadhaar1Enc,
        38,
        'Bellad & Company',
        'Central Showroom - Bangalore',
        '#42, 5th Main, Indiranagar, Bangalore',
        tenantId,
      ]
    );

    await client.query(
      `INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
       VALUES ($1, $2, TRUE, $3)
       ON CONFLICT DO NOTHING;`,
      [cust1Id, phone1, tenantId]
    );

    // Insert Customer 1 Vehicle (Hyundai Creta SX)
    let veh1Res = await client.query(
      `SELECT vehicle_id FROM vehicles WHERE tenant_id = $1 AND chassis_no = $2;`,
      [tenantId, 'MALC34B8NP982104']
    );
    let veh1Id;
    if (veh1Res.rows.length === 0) {
      const ins1 = await client.query(
        `INSERT INTO vehicles (
          customer_id, brand_name, chassis_no, model, variant,
          fuel_type, branch_name, firm_name, ex_showroom_price, purchase_date, tenant_id
        )
        VALUES ($1, 'Hyundai', 'MALC34B8NP982104', 'Creta', 'SX Opt 1.5 Petrol',
                'Petrol', 'Central Showroom - Bangalore', 'Bellad & Company', 145000000, '2024-04-10', $2)
        RETURNING vehicle_id;`,
        [cust1Id, tenantId]
      );
      veh1Id = ins1.rows[0].vehicle_id;
    } else {
      veh1Id = veh1Res.rows[0].vehicle_id;
    }

    // Insert Sale Transaction for Customer 1 (Gross: 14.5L, Discounts: 50k, Net: 14.0L)
    await client.query(
      `INSERT INTO sale_transactions (
        customer_id, vehicle_id, branch_id, reference_id, ex_showroom_price_paise,
        dealer_cash_discount_paise, oem_offers_amount_paise, emps_discount_paise,
        is_invoice_finalized, points_calculated, tenant_id
      )
      VALUES ($1, $2, $3, 'INV-2024-CRETA-8890', 145000000, 3000000, 2000000, 0, TRUE, TRUE, $4)
      ON CONFLICT DO NOTHING;`,
      [cust1Id, veh1Id, branchId, tenantId]
    );

    // Points Ledger for Customer 1:
    // 1. Vehicle Purchase: +14,000 PTS (Net Ex-Showroom: ₹14,00,000)
    // 2. In-house Finance Bonus: +100 PTS
    // 3. In-house Insurance Bonus: +50 PTS
    // 4. In-house Exchange Bonus: +200 PTS
    await client.query(
      `INSERT INTO points_ledger (customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, reason_type, reason_text, tenant_id)
       VALUES
         ($1, $2, $3, 'earn_sale', 'sale', 14000, 'INV-2024-CRETA-8890', 'purchase', 'Vehicle purchase — ex-showroom ₹14,50,000 − dealer discount ₹30,000 − OEM offers ₹20,000 = ₹14,00,000 → +14,000 pts', $4),
         ($1, $2, $3, 'earn_service', 'service', 100, 'INV-2024-CRETA-8890 | In-house Finance Bonus', 'service_bonus', 'In-house Finance Bonus (+100 pts)', $4),
         ($1, $2, $3, 'earn_service', 'service', 50, 'INV-2024-CRETA-8890 | In-house Insurance Bonus', 'service_bonus', 'In-house Insurance Bonus (+50 pts)', $4),
         ($1, $2, $3, 'earn_service', 'service', 200, 'INV-2024-CRETA-8890 | In-house Exchange Bonus', 'service_bonus', 'In-house Exchange Bonus (+200 pts)', $4)
       ON CONFLICT DO NOTHING;`,
      [cust1Id, veh1Id, branchId, tenantId]
    );

    // Update Customer 1 Tier Snapshot (14,350 points -> Platinum Tier)
    await client.query(
      `INSERT INTO customer_tier_snapshot (customer_id, current_tier, lifetime_points, tenant_id, updated_at)
       VALUES ($1, 'Platinum', 14350, $2, NOW())
       ON CONFLICT (customer_id) DO UPDATE
       SET current_tier = 'Platinum', lifetime_points = 14350, updated_at = NOW();`,
      [cust1Id, tenantId]
    );

    // ─── 8. SEED DUMMY CUSTOMER 2 (Two-Wheeler & Referral) ───────────────────
    const cust2Id = 'BAC-9002';
    const aadhaar2 = '789012345678';
    const phone2 = '9886054321';

    await client.query(
      `INSERT INTO customers (
        customer_id, customer_name, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
        age, firm_name, branch_name, address, is_first_time_visitor, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, $10)
      ON CONFLICT (customer_id) DO UPDATE
      SET customer_name = EXCLUDED.customer_name, tenant_id = EXCLUDED.tenant_id;`,
      [
        cust2Id,
        'Pooja Bellad',
        aadhaar2,
        hashIdentifier(aadhaar2),
        encrypt(lastDigits(aadhaar2, 4)),
        29,
        'Bellad & Company',
        'Central Showroom - Bangalore',
        '#18, 1st Cross, Malleshwaram, Bangalore',
        tenantId,
      ]
    );

    await client.query(
      `INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
       VALUES ($1, $2, TRUE, $3)
       ON CONFLICT DO NOTHING;`,
      [cust2Id, phone2, tenantId]
    );

    let veh2Res = await client.query(
      `SELECT vehicle_id FROM vehicles WHERE tenant_id = $1 AND chassis_no = $2;`,
      [tenantId, 'MBLHA10EN901234']
    );
    let veh2Id;
    if (veh2Res.rows.length === 0) {
      const ins2 = await client.query(
        `INSERT INTO vehicles (
          customer_id, brand_name, chassis_no, model, variant,
          fuel_type, branch_name, firm_name, ex_showroom_price, purchase_date, tenant_id
        )
        VALUES ($1, 'Hero', 'MBLHA10EN901234', 'Splendor Plus', 'XTEC Drum',
                'Petrol', 'Central Showroom - Bangalore', 'Bellad & Company', 8500000, '2024-06-15', $2)
        RETURNING vehicle_id;`,
        [cust2Id, tenantId]
      );
      veh2Id = ins2.rows[0].vehicle_id;
    } else {
      veh2Id = veh2Res.rows[0].vehicle_id;
    }

    await client.query(
      `INSERT INTO points_ledger (customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, reason_type, reason_text, tenant_id)
       VALUES
         ($1, $2, $3, 'earn_sale', 'sale', 820, 'INV-2024-SPL-4501', 'purchase', 'Vehicle purchase — ex-showroom ₹85,000 − dealer discount ₹3,000 = ₹82,000 → +820 pts', $4),
         ($1, $2, $3, 'earn_service', 'service', 200, 'INV-2024-SPL-4501 | In-house Exchange Bonus', 'service_bonus', 'In-house Exchange Bonus (+200 pts)', $4)
       ON CONFLICT DO NOTHING;`,
      [cust2Id, veh2Id, branchId, tenantId]
    );

    await client.query(
      `INSERT INTO customer_tier_snapshot (customer_id, current_tier, lifetime_points, tenant_id, updated_at)
       VALUES ($1, 'Silver', 1020, $2, NOW())
       ON CONFLICT (customer_id) DO UPDATE
       SET current_tier = 'Silver', lifetime_points = 1020, updated_at = NOW();`,
      [cust2Id, tenantId]
    );

    // ─── 9. SEED AMAZON-STYLE DIGITAL GIFT CARDS ─────────────────────────────
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    await client.query(
      `INSERT INTO gift_cards (
        card_number, pin_code, initial_amount_paise, balance_amount_paise, currency,
        sender_name, recipient_name, recipient_phone, custom_message, card_theme, status, expires_at, tenant_id
      )
      VALUES
        ('GIFT-BELL-7K9A-4M2P', '8392', 500000, 500000, 'INR', 'Bellad Automobiles Management', 'Rajesh Kumar Sharma', '9845012345', 'Exclusive festive vehicle reward card! Redeem on purchase or service.', 'premium', 'active', $1, $2),
        ('GIFT-BELL-2X8Y-9Z1A', '4521', 250000, 250000, 'INR', 'Bellad Automobiles Care', 'Pooja Bellad', '9886054321', 'Thank you for choosing Bellad Automobiles! Enjoy this voucher.', 'celebration', 'active', $1, $2),
        ('GIFT-TRID-6H3M-1N9L', '7710', 1000000, 650000, 'INR', 'Corporate Loyalty Team', 'Vikram Merchant', '9844098765', 'Corporate VIP anniversary gift voucher.', 'automotive', 'partially_redeemed', $1, $2)
      ON CONFLICT (card_number) DO UPDATE
      SET balance_amount_paise = EXCLUDED.balance_amount_paise,
          status = EXCLUDED.status;`,
      [nextYear.toISOString(), tenantId]
    );

    await client.query('COMMIT');
    console.log('✅ Comprehensive seeding completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
