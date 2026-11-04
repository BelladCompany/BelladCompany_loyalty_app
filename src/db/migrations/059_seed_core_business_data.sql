-- Migration 059: Seed core business data (customers, vehicles, points ledger, gift cards, referrals)
-- Ensures production databases on Render / cloud have rich customer data, gift cards, and referrals available immediately

DO $$
DECLARE
  v_tenant VARCHAR(64) := 'bellad_and_company';
  v_branch_id INTEGER;
  v_veh1_id INTEGER;
  v_veh2_id INTEGER;
  v_veh3_id INTEGER;
  v_veh4_id INTEGER;
  v_veh5_id INTEGER;
  v_exp_date TIMESTAMPTZ := NOW() + INTERVAL '1 year';
BEGIN
  -- 1. Ensure Firms
  INSERT INTO firms (tenant_id, firm_name, legal_name, brand_slug, theme_color, accent_color, point_to_rupee_rate, contact_email)
  VALUES
    (v_tenant, 'Bellad & Company', 'Bellad Automobile Corporation Pvt Ltd', 'bellad', '#0f172a', '#f97316', 0.25, 'support@bellad.co.in'),
    ('BAC-MAIN', 'Bellad Main Hub', 'Bellad Auto Group Main Hub', 'bellad-main', '#0f172a', '#f97316', 0.25, 'admin@bellad.co.in')
  ON CONFLICT (tenant_id) DO UPDATE
  SET firm_name = EXCLUDED.firm_name,
      point_to_rupee_rate = EXCLUDED.point_to_rupee_rate;

  -- 2. Harmonize & Ensure Brands (support both brand_name and name schemas)
  ALTER TABLE brands ADD COLUMN IF NOT EXISTS brand_id SERIAL;
  ALTER TABLE brands ADD COLUMN IF NOT EXISTS id INTEGER;
  ALTER TABLE brands ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255);
  ALTER TABLE brands ADD COLUMN IF NOT EXISTS name VARCHAR(255);
  ALTER TABLE brands ADD COLUMN IF NOT EXISTS code VARCHAR(50);

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'brand_name') THEN
    INSERT INTO brands (brand_name, tenant_id)
    VALUES ('Hyundai', v_tenant), ('Hero', v_tenant), ('Tata', v_tenant), ('Swaraj', v_tenant)
    ON CONFLICT DO NOTHING;
    UPDATE brands SET name = brand_name WHERE name IS NULL;
    UPDATE brands SET code = UPPER(SUBSTRING(brand_name FROM 1 FOR 4)) WHERE code IS NULL;
  ELSE
    INSERT INTO brands (name, code, tenant_id)
    VALUES ('Hyundai', 'HYUNDAI', v_tenant), ('Hero', 'HERO', v_tenant), ('Tata', 'TATA', v_tenant), ('Swaraj', 'SWARAJ', v_tenant)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3. Ensure Branches
  IF NOT EXISTS (SELECT 1 FROM branches WHERE tenant_id = v_tenant) THEN
    INSERT INTO branches (name, code, address, tenant_id, branch_name, branch_city)
    VALUES ('Central Showroom - Hubli', 'HUB-01', 'Central Hubli', v_tenant, 'Central Showroom - Hubli', 'Hubli');
  END IF;

  SELECT COALESCE(
    (SELECT branch_id FROM branches WHERE tenant_id = v_tenant LIMIT 1),
    (SELECT id FROM branches WHERE tenant_id = v_tenant LIMIT 1),
    1
  ) INTO v_branch_id;

  -- 4. Ensure Point Rules
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'point_rules' AND column_name = 'rate_type') THEN
    INSERT INTO point_rules (tenant_id, rate_type, points_per_100)
    VALUES
      (v_tenant, 'sale', 1.00),
      (v_tenant, 'service', 1.00)
    ON CONFLICT DO NOTHING;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'point_rules' AND column_name = 'rule_type') THEN
    INSERT INTO point_rules (tenant_id, rule_type, points_per_100)
    VALUES
      (v_tenant, 'sale', 1.00),
      (v_tenant, 'service', 1.00)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 5. Customer 1: Rajesh Kumar Sharma (BAC-9001, Phone: 9845012345, Creta SX)
  INSERT INTO customers (
    customer_id, customer_name, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
    age, firm_name, branch_name, address, is_first_time_visitor, tenant_id
  )
  VALUES (
    'BAC-9001', 'Rajesh Kumar Sharma', '543287651092',
    '5e404c2f450c742b0179881d5b786238b00c8ba2eb36dc2066ad063abffaee8f',
    '869653a6ff1fab2dc3f91a2a:6b77d79822e9a1c675da5ed1e7d98d00:05ce92ef',
    38, 'Bellad & Company', 'Central Showroom - Hubli', '#42, Indiranagar, Bangalore', FALSE, v_tenant
  )
  ON CONFLICT (customer_id) DO UPDATE
  SET customer_name = EXCLUDED.customer_name, tenant_id = EXCLUDED.tenant_id;

  INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
  VALUES ('BAC-9001', '9845012345', TRUE, v_tenant)
  ON CONFLICT DO NOTHING;

  -- Vehicle 1: Creta
  IF NOT EXISTS (SELECT 1 FROM vehicles WHERE tenant_id = v_tenant AND chassis_no = 'MALC34B8NP982104') THEN
    INSERT INTO vehicles (
      customer_id, brand_name, chassis_no, vin, registration_number, model, variant,
      fuel_type, branch_name, firm_name, ex_showroom_price, purchase_date, tenant_id, vehicle_type
    )
    VALUES (
      'BAC-9001', 'Hyundai', 'MALC34B8NP982104', 'MALC34B8NP982104', 'KA-25-EA-1001', 'Creta', 'SX Opt 1.5 Petrol',
      'Petrol', 'Central Showroom - Hubli', 'Bellad & Company', 145000000, '2024-04-10', v_tenant, '4W'
    );
  END IF;

  SELECT vehicle_id INTO v_veh1_id FROM vehicles WHERE tenant_id = v_tenant AND chassis_no = 'MALC34B8NP982104' LIMIT 1;

  INSERT INTO points_ledger (customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, reason_type, reason_text, tenant_id)
  VALUES
    ('BAC-9001', v_veh1_id, v_branch_id, 'earn_sale', 'sale', 14000, 'INV-2024-CRETA-8890', 'purchase', 'Vehicle purchase — ex-showroom ₹14,50,000 → +14,000 pts', v_tenant),
    ('BAC-9001', v_veh1_id, v_branch_id, 'earn_service', 'service', 350, 'INV-2024-CRETA-8890 | In-house Bonus', 'service_bonus', 'In-house Finance & Insurance Bonus (+350 pts)', v_tenant)
  ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_tier_snapshot') THEN
    INSERT INTO customer_tier_snapshot (customer_id, current_tier, lifetime_points, total_expense_amount, tenant_id, updated_at)
    VALUES ('BAC-9001', 'Platinum', 14350, 1450000.00, v_tenant, NOW())
    ON CONFLICT (customer_id) DO UPDATE
    SET current_tier = 'Platinum', lifetime_points = 14350, total_expense_amount = 1450000.00, updated_at = NOW();
  END IF;

  -- 6. Customer 2: Prajwal Wadekar (BAC-100005, Phone: 9876543210, Harrier Dark)
  INSERT INTO customers (
    customer_id, customer_name, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
    age, firm_name, branch_name, address, is_first_time_visitor, tenant_id
  )
  VALUES (
    'BAC-100005', 'Prajwal Wadekar', '901234567890',
    '048234c6082378c10fc012055fd192a6cfd52ea3ac852034cc0e2588afc8cca8',
    '9cacb2ec66af139e0850f067:35640d9dbb0dee4d831aa6de6c7bf3fb:5d150b30',
    32, 'Bellad & Company', 'Central Showroom - Hubli', 'Keshwapur, Hubli, Karnataka', FALSE, v_tenant
  )
  ON CONFLICT (customer_id) DO UPDATE
  SET customer_name = EXCLUDED.customer_name, tenant_id = EXCLUDED.tenant_id;

  INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
  VALUES ('BAC-100005', '9876543210', TRUE, v_tenant)
  ON CONFLICT DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM vehicles WHERE tenant_id = v_tenant AND chassis_no = 'MAT612948NP912384') THEN
    INSERT INTO vehicles (
      customer_id, brand_name, chassis_no, vin, registration_number, model, variant,
      fuel_type, branch_name, firm_name, ex_showroom_price, purchase_date, tenant_id, vehicle_type
    )
    VALUES (
      'BAC-100005', 'Tata', 'MAT612948NP912384', 'MAT612948NP912384', 'KA-25-MB-4545', 'Harrier', 'Dark Edition XZ+',
      'Diesel', 'Central Showroom - Hubli', 'Bellad & Company', 225000000, '2024-05-20', v_tenant, '4W'
    );
  END IF;

  SELECT vehicle_id INTO v_veh2_id FROM vehicles WHERE tenant_id = v_tenant AND chassis_no = 'MAT612948NP912384' LIMIT 1;

  INSERT INTO points_ledger (customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, reason_type, reason_text, tenant_id)
  VALUES
    ('BAC-100005', v_veh2_id, v_branch_id, 'earn_sale', 'sale', 18500, 'INV-2024-HAR-1005', 'purchase', 'Vehicle purchase — Harrier Dark Edition → +18,500 pts', v_tenant)
  ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_tier_snapshot') THEN
    INSERT INTO customer_tier_snapshot (customer_id, current_tier, lifetime_points, total_expense_amount, tenant_id, updated_at)
    VALUES ('BAC-100005', 'Gold', 18500, 2250000.00, v_tenant, NOW())
    ON CONFLICT (customer_id) DO UPDATE
    SET current_tier = 'Gold', lifetime_points = 18500, total_expense_amount = 2250000.00, updated_at = NOW();
  END IF;

  -- 7. Customer 3: Pooja Bellad (BAC-9002, Phone: 9886054321, Splendor)
  INSERT INTO customers (
    customer_id, customer_name, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
    age, firm_name, branch_name, address, is_first_time_visitor, tenant_id
  )
  VALUES (
    'BAC-9002', 'Pooja Bellad', '789012345678',
    '233cafe0a0f8438816e7be59cb1859f078cb5458c0a3ca271b0ccc9969c10288',
    '189257c71081d17101197e52:407da955c451263ed634b16375bedfdc:40ac56a8',
    29, 'Bellad & Company', 'Central Showroom - Hubli', 'Malleshwaram, Bangalore', FALSE, v_tenant
  )
  ON CONFLICT (customer_id) DO UPDATE
  SET customer_name = EXCLUDED.customer_name, tenant_id = EXCLUDED.tenant_id;

  INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
  VALUES ('BAC-9002', '9886054321', TRUE, v_tenant)
  ON CONFLICT DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM vehicles WHERE tenant_id = v_tenant AND chassis_no = 'MBLHA10EN901234') THEN
    INSERT INTO vehicles (
      customer_id, brand_name, chassis_no, vin, registration_number, model, variant,
      fuel_type, branch_name, firm_name, ex_showroom_price, purchase_date, tenant_id, vehicle_type
    )
    VALUES (
      'BAC-9002', 'Hero', 'MBLHA10EN901234', 'MBLHA10EN901234', 'KA-25-EZ-7711', 'Splendor Plus', 'XTEC Drum',
      'Petrol', 'Central Showroom - Hubli', 'Bellad & Company', 8500000, '2024-06-15', v_tenant, '2W'
    );
  END IF;

  SELECT vehicle_id INTO v_veh3_id FROM vehicles WHERE tenant_id = v_tenant AND chassis_no = 'MBLHA10EN901234' LIMIT 1;

  INSERT INTO points_ledger (customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, reason_type, reason_text, tenant_id)
  VALUES
    ('BAC-9002', v_veh3_id, v_branch_id, 'earn_sale', 'sale', 1020, 'INV-2024-SPL-4501', 'purchase', 'Two-wheeler purchase → +1,020 pts', v_tenant)
  ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_tier_snapshot') THEN
    INSERT INTO customer_tier_snapshot (customer_id, current_tier, lifetime_points, total_expense_amount, tenant_id, updated_at)
    VALUES ('BAC-9002', 'Silver', 1020, 85000.00, v_tenant, NOW())
    ON CONFLICT (customer_id) DO UPDATE
    SET current_tier = 'Silver', lifetime_points = 1020, total_expense_amount = 85000.00, updated_at = NOW();
  END IF;

  -- 8. Customer 4: Rahul Sharma (BAC-9821, Phone: 9845098210, Safari Dark)
  INSERT INTO customers (
    customer_id, customer_name, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
    age, firm_name, branch_name, address, is_first_time_visitor, tenant_id
  )
  VALUES (
    'BAC-9821', 'Rahul Sharma', '123456789012',
    '33a4f61f7d23588df8516d7734bbd12975949d0362241cf775d7b53ea5d81a8b',
    '869653a6ff1fab2dc3f91a2a:6b77d79822e9a1c675da5ed1e7d98d00:05ce92ef',
    35, 'Bellad & Company', 'Central Showroom - Hubli', 'Vidyanagar, Hubli, Karnataka', FALSE, v_tenant
  )
  ON CONFLICT (customer_id) DO UPDATE
  SET customer_name = EXCLUDED.customer_name, tenant_id = EXCLUDED.tenant_id;

  INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
  VALUES ('BAC-9821', '9845098210', TRUE, v_tenant)
  ON CONFLICT DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM vehicles WHERE tenant_id = v_tenant AND chassis_no = 'MAT612948NP999821') THEN
    INSERT INTO vehicles (
      customer_id, brand_name, chassis_no, vin, registration_number, model, variant,
      fuel_type, branch_name, firm_name, ex_showroom_price, purchase_date, tenant_id, vehicle_type
    )
    VALUES (
      'BAC-9821', 'Tata', 'MAT612948NP999821', 'MAT612948NP999821', 'KA-25-NF-8821', 'Safari', 'Dark Edition Accomplished+',
      'Diesel', 'Central Showroom - Hubli', 'Bellad & Company', 255000000, '2024-03-12', v_tenant, '4W'
    );
  END IF;

  SELECT vehicle_id INTO v_veh4_id FROM vehicles WHERE tenant_id = v_tenant AND chassis_no = 'MAT612948NP999821' LIMIT 1;

  INSERT INTO points_ledger (customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, reason_type, reason_text, tenant_id)
  VALUES
    ('BAC-9821', v_veh4_id, v_branch_id, 'earn_sale', 'sale', 25500, 'INV-2024-SAF-9821', 'purchase', 'Vehicle purchase — Safari Dark Edition → +25,500 pts', v_tenant)
  ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_tier_snapshot') THEN
    INSERT INTO customer_tier_snapshot (customer_id, current_tier, lifetime_points, total_expense_amount, tenant_id, updated_at)
    VALUES ('BAC-9821', 'Platinum', 25500, 2550000.00, v_tenant, NOW())
    ON CONFLICT (customer_id) DO UPDATE
    SET current_tier = 'Platinum', lifetime_points = 25500, total_expense_amount = 2550000.00, updated_at = NOW();
  END IF;

  -- 9. Customer 5: Suresh Patil (BAC-100006, Phone: 9845112233, Swaraj Tractor)
  INSERT INTO customers (
    customer_id, customer_name, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
    age, firm_name, branch_name, address, is_first_time_visitor, tenant_id
  )
  VALUES (
    'BAC-100006', 'Suresh Patil', '234567890123',
    '71b56a42a0b1bc85d985223a3d2e1b93f218bbad5f6bca50186937c53641c88a',
    '9cacb2ec66af139e0850f067:35640d9dbb0dee4d831aa6de6c7bf3fb:5d150b30',
    42, 'Bellad & Company', 'Central Showroom - Hubli', 'Gokul Road, Hubli, Karnataka', FALSE, v_tenant
  )
  ON CONFLICT (customer_id) DO UPDATE
  SET customer_name = EXCLUDED.customer_name, tenant_id = EXCLUDED.tenant_id;

  INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
  VALUES ('BAC-100006', '9845112233', TRUE, v_tenant)
  ON CONFLICT DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM vehicles WHERE tenant_id = v_tenant AND chassis_no = 'MBLSW744EN100006') THEN
    INSERT INTO vehicles (
      customer_id, brand_name, chassis_no, vin, registration_number, model, variant,
      fuel_type, branch_name, firm_name, ex_showroom_price, purchase_date, tenant_id, vehicle_type
    )
    VALUES (
      'BAC-100006', 'Swaraj', 'MBLSW744EN100006', 'MBLSW744EN100006', 'KA-25-TR-2233', '744 FE', '4WD Tractor',
      'Diesel', 'Central Showroom - Hubli', 'Bellad & Company', 82000000, '2024-07-01', v_tenant, '4W'
    );
  END IF;

  SELECT vehicle_id INTO v_veh5_id FROM vehicles WHERE tenant_id = v_tenant AND chassis_no = 'MBLSW744EN100006' LIMIT 1;

  INSERT INTO points_ledger (customer_id, vehicle_id, branch_id, type, transaction_category, points, source_ref, reason_type, reason_text, tenant_id)
  VALUES
    ('BAC-100006', v_veh5_id, v_branch_id, 'earn_sale', 'sale', 8200, 'INV-2024-SWR-1006', 'purchase', 'Vehicle purchase — Swaraj 744 FE → +8,200 pts', v_tenant)
  ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_tier_snapshot') THEN
    INSERT INTO customer_tier_snapshot (customer_id, current_tier, lifetime_points, total_expense_amount, tenant_id, updated_at)
    VALUES ('BAC-100006', 'Gold', 8200, 820000.00, v_tenant, NOW())
    ON CONFLICT (customer_id) DO UPDATE
    SET current_tier = 'Gold', lifetime_points = 8200, total_expense_amount = 820000.00, updated_at = NOW();
  END IF;

  -- 10. Seed customer_gifts (Used by Admin Gift Cards View: /api/admin/gift-cards)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_gifts') THEN
    INSERT INTO customer_gifts (
      gift_id, gift_code, pin_code, claim_token_hash, funding_source,
      sender_customer_id, sender_phone, sender_name,
      amount_inr, points_equivalent, points_deducted,
      payment_status, receiver_name, receiver_phone,
      claim_status, expires_at, points_validity_days,
      card_theme, custom_message, tenant_id
    )
    VALUES
      (
        'c9a10001-0000-4000-8000-000000000001'::uuid,
        'BLD-GIFT-8A2F-9D4E', '8392',
        '8a2f9d4e5c7b1a3d6e8f0a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d',
        'razorpay', 'BAC-100005', '9876543210', 'Prajwal Wadekar',
        5000.00, 20000, 0,
        'paid', 'Rajesh Kumar Sharma', '9845012345',
        'unclaimed', v_exp_date, 365,
        'celebration', 'Exclusive festive vehicle reward card! Redeem on purchase or service.', v_tenant
      ),
      (
        'c9a10002-0000-4000-8000-000000000002'::uuid,
        'BLD-GIFT-4M1P-7K9A', '4521',
        '4m1p7k9a5c7b1a3d6e8f0a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c2e',
        'razorpay', 'BAC-9002', '9886054321', 'Pooja Bellad',
        2500.00, 10000, 0,
        'paid', 'Suresh Patil', '9845112233',
        'unclaimed', v_exp_date, 365,
        'festival', 'Thank you for choosing Bellad Automobiles! Enjoy this voucher.', v_tenant
      ),
      (
        'c9a10003-0000-4000-8000-000000000003'::uuid,
        'BLD-GIFT-2X8Y-9Z1A', '7710',
        '2x8y9z1a5c7b1a3d6e8f0a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c3f',
        'points', 'BAC-9821', '9845098210', 'Rahul Sharma',
        10000.00, 40000, 40000,
        'paid', 'Vikram Merchant', '9844098765',
        'claimed', v_exp_date, 365,
        'special', 'Corporate VIP anniversary gift voucher.', v_tenant
      ),
      (
        'c9a10004-0000-4000-8000-000000000004'::uuid,
        'BLD-GIFT-5A2C-9E4T', '1234',
        '5a2c9e4t5c7b1a3d6e8f0a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c4a',
        'razorpay', 'BAC-100005', '9876543210', 'Prajwal Wadekar',
        1000.00, 4000, 0,
        'paid', 'Direct Controller Friend', '9845012345',
        'unclaimed', v_exp_date, 365,
        'service', 'Welcome bonus voucher for your loyalty wallet!', v_tenant
      )
    ON CONFLICT (gift_code) DO NOTHING;
  END IF;

  -- 11. Seed gift_cards (Used by Cashier / POS Gift Cards View: /api/gift-cards)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gift_cards') THEN
    INSERT INTO gift_cards (
      card_number, pin_code, initial_amount_paise, balance_amount_paise, currency,
      sender_name, recipient_name, recipient_phone, custom_message, card_theme, status, expires_at, tenant_id
    )
    VALUES
      ('GIFT-BELL-7K9A-4M2P', '8392', 500000, 500000, 'INR', 'Bellad Automobiles Management', 'Rajesh Kumar Sharma', '9845012345', 'Exclusive festive vehicle reward card! Redeem on purchase or service.', 'premium', 'active', v_exp_date, v_tenant),
      ('GIFT-BELL-2X8Y-9Z1A', '4521', 250000, 250000, 'INR', 'Bellad Automobiles Care', 'Pooja Bellad', '9886054321', 'Thank you for choosing Bellad Automobiles! Enjoy this voucher.', 'celebration', 'active', v_exp_date, v_tenant),
      ('GIFT-TRID-6H3M-1N9L', '7710', 1000000, 650000, 'INR', 'Corporate Loyalty Team', 'Vikram Merchant', '9844098765', 'Corporate VIP anniversary gift voucher.', 'automotive', 'partially_redeemed', v_exp_date, v_tenant),
      ('GIFT-BELL-5A2C-9E4T', '1234', 100000, 100000, 'INR', 'Bellad Automobiles Management', 'Prajwal Wadekar', '9876543210', 'Welcome bonus voucher for your loyalty wallet!', 'festive', 'active', v_exp_date, v_tenant)
    ON CONFLICT (card_number) DO UPDATE
    SET balance_amount_paise = EXCLUDED.balance_amount_paise,
        status = EXCLUDED.status;
  END IF;

  -- 12. Seed Referrals (Used by Admin Referral Rewards View: /api/admin/referrals)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referrals') THEN
    INSERT INTO referrals (
      referrer_customer_id, referee_name, referee_phone, referral_code,
      share_channel, shared_at, status, points_credited, suggested_points,
      referrer_points_awarded, referee_points_awarded, referee_points_credited,
      reason, tenant_id
    )
    VALUES
      ('BAC-100005', 'Direct Controller Friend', '9845012345', 'REF-BELL-8MLJ-JGZD', 'whatsapp', NOW() - INTERVAL '2 hours', 'shared', 0, 2500, 2500, 2500, 0, 'WhatsApp Friend Referral', v_tenant),
      ('BAC-100005', 'Suresh Patil (Friend on WhatsApp)', '9845112233', 'REF-BELL-GQED-J4VP', 'whatsapp', NOW() - INTERVAL '1 day', 'shared', 0, 2500, 2500, 2500, 0, 'WhatsApp Friend Referral', v_tenant),
      ('BAC-100005', 'Kavya Bellad', '9886011223', 'REF-BELL-0005-9000', 'whatsapp', NOW() - INTERVAL '3 days', 'shared', 0, 2500, 2500, 2500, 0, 'WhatsApp Friend Referral', v_tenant),
      ('BAC-9001', 'Shared via WhatsApp', '9876543210', 'REF-BELL-7ZFM-SQD4', 'whatsapp', NOW() - INTERVAL '5 days', 'shared', 0, 2500, 2500, 2500, 0, 'WhatsApp Friend Referral', v_tenant),
      ('BAC-9821', 'Shared via WhatsApp', NULL, 'REF-BELL-9821-4321', 'whatsapp', NOW() - INTERVAL '6 hours', 'shared', 0, 2500, 2500, 2500, 0, 'WhatsApp Friend Referral', v_tenant)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
