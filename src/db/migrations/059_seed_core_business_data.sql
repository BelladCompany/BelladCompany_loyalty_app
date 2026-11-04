-- Migration 059: Seed core business data (customers, vehicles, points ledger, gift cards, referrals)
-- Robust and fully harmonized across all database environments (Render, local, Docker)

-- ============================================================================
-- 0. DDL PREPARATION: Relax NOT NULL constraints & ensure all columns exist
--    Must execute BEFORE any block compiles to ensure system catalog is complete
-- ============================================================================

-- 0a. Brands
ALTER TABLE brands ADD COLUMN IF NOT EXISTS brand_id SERIAL;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS id INTEGER;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE brands ALTER COLUMN name DROP NOT NULL;
ALTER TABLE brands ALTER COLUMN code DROP NOT NULL;
ALTER TABLE brands ALTER COLUMN brand_name DROP NOT NULL;

-- 0b. Branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_id SERIAL;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS id INTEGER;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_city VARCHAR(100);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE branches ALTER COLUMN name DROP NOT NULL;
ALTER TABLE branches ALTER COLUMN code DROP NOT NULL;
ALTER TABLE branches ALTER COLUMN branch_name DROP NOT NULL;

-- 0c. Point Rules
ALTER TABLE point_rules ADD COLUMN IF NOT EXISTS points_per_100 NUMERIC(10, 2);
ALTER TABLE point_rules ADD COLUMN IF NOT EXISTS rate_type VARCHAR(32);
ALTER TABLE point_rules ADD COLUMN IF NOT EXISTS rule_type VARCHAR(32);
ALTER TABLE point_rules ADD COLUMN IF NOT EXISTS multiplier_numerator BIGINT DEFAULT 1;
ALTER TABLE point_rules ADD COLUMN IF NOT EXISTS multiplier_denominator BIGINT DEFAULT 100;
ALTER TABLE point_rules ALTER COLUMN multiplier_numerator DROP NOT NULL;
ALTER TABLE point_rules ALTER COLUMN multiplier_denominator DROP NOT NULL;

-- 0d. Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(64);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS aadhaar_hash VARCHAR(64);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS aadhaar_last4_enc TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS firm_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_first_time_visitor BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ALTER COLUMN customer_name DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN name DROP NOT NULL;

-- 0e. Customer Phones
ALTER TABLE customer_phones ADD COLUMN IF NOT EXISTS phone_id SERIAL;
ALTER TABLE customer_phones ADD COLUMN IF NOT EXISTS id INTEGER;
ALTER TABLE customer_phones ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE customer_phones ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT TRUE;

-- 0f. Vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_id SERIAL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS id INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin VARCHAR(64);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_number VARCHAR(32);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS firm_name VARCHAR(255);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS variant VARCHAR(255);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(64);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ex_showroom_price BIGINT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20) DEFAULT '4W';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS chassis_no VARCHAR(64);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model VARCHAR(255);
ALTER TABLE vehicles ALTER COLUMN chassis_no DROP NOT NULL;
ALTER TABLE vehicles ALTER COLUMN model DROP NOT NULL;
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_vehicle_type_check CHECK (vehicle_type IN ('2W', '4W', 'CV', '3W'));

-- 0g. Points Ledger
ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS type VARCHAR(32);
ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(32);
ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS transaction_category VARCHAR(64);
ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS points BIGINT;
ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS amount_paise BIGINT DEFAULT 0;
ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS source_ref TEXT;
ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS reason_type VARCHAR(64);
ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS reason_text TEXT;
ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS vehicle_id INTEGER;
ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS branch_id INTEGER;
ALTER TABLE points_ledger ALTER COLUMN type DROP NOT NULL;
ALTER TABLE points_ledger ALTER COLUMN points DROP NOT NULL;
ALTER TABLE points_ledger DROP CONSTRAINT IF EXISTS points_ledger_transaction_type_check;
ALTER TABLE points_ledger DROP CONSTRAINT IF EXISTS points_ledger_type_check;
ALTER TABLE points_ledger DROP CONSTRAINT IF EXISTS points_ledger_transaction_category_check;

-- 0h. Customer Tier Snapshot (Harmonize tier_name and current_tier)
ALTER TABLE customer_tier_snapshot ADD COLUMN IF NOT EXISTS tier_name VARCHAR(50);
ALTER TABLE customer_tier_snapshot ADD COLUMN IF NOT EXISTS current_tier VARCHAR(50);
ALTER TABLE customer_tier_snapshot ADD COLUMN IF NOT EXISTS current_balance BIGINT DEFAULT 0;
ALTER TABLE customer_tier_snapshot ADD COLUMN IF NOT EXISTS lifetime_points BIGINT DEFAULT 0;
ALTER TABLE customer_tier_snapshot ADD COLUMN IF NOT EXISTS total_expense_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE customer_tier_snapshot ALTER COLUMN tier_name DROP NOT NULL;
ALTER TABLE customer_tier_snapshot ALTER COLUMN current_tier DROP NOT NULL;

-- 0i. Referrals
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_customer_id VARCHAR(32);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referral_code VARCHAR(32);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS share_channel VARCHAR(30) DEFAULT 'whatsapp';
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'shared';
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referee_name VARCHAR(120);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referee_phone VARCHAR(30);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS points_credited BIGINT DEFAULT 0;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS suggested_points BIGINT DEFAULT 2500;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referrer_points_awarded BIGINT DEFAULT 2500;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referee_points_awarded BIGINT DEFAULT 2500;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referee_points_credited BIGINT DEFAULT 0;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE referrals ALTER COLUMN status DROP NOT NULL;
ALTER TABLE referrals ALTER COLUMN referred_customer_id DROP NOT NULL;
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE referrals ADD CONSTRAINT referrals_status_check CHECK (status IN ('shared', 'pending', 'approved', 'rejected', 'claimed'));

-- 0j. Customer Gifts & Gift Cards
ALTER TABLE customer_gifts ADD COLUMN IF NOT EXISTS pin_code VARCHAR(16);
ALTER TABLE customer_gifts ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(120);
ALTER TABLE customer_gifts ADD COLUMN IF NOT EXISTS receiver_phone VARCHAR(20);
ALTER TABLE customer_gifts ADD COLUMN IF NOT EXISTS card_theme VARCHAR(50) DEFAULT 'celebration';
ALTER TABLE customer_gifts ADD COLUMN IF NOT EXISTS custom_message TEXT;
ALTER TABLE customer_gifts ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20) DEFAULT 'v1.0';
ALTER TABLE customer_gifts ALTER COLUMN pin_code DROP NOT NULL;

ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS pin_code VARCHAR(16);
ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS card_theme VARCHAR(50) DEFAULT 'celebration';
ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS custom_message TEXT;
ALTER TABLE gift_cards ALTER COLUMN pin_code DROP NOT NULL;

-- ============================================================================
-- 1. SEED CORE BUSINESS DATA
-- ============================================================================

DO $$
DECLARE
  v_tenant VARCHAR(64) := 'bellad_and_company';
  v_branch_id INTEGER;
  v_veh1_id INTEGER;
  v_veh2_id INTEGER;
  v_veh3_id INTEGER;
  v_veh4_id INTEGER;
  v_veh5_id INTEGER;
  v_veh6_id INTEGER;
  v_veh7_id INTEGER;
  v_exp_date TIMESTAMPTZ := NOW() + INTERVAL '1 year';
BEGIN
  -- Temporarily disable ledger append trigger if present and permitted
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_points_ledger_modification') THEN
      ALTER TABLE points_ledger DISABLE TRIGGER trg_prevent_points_ledger_modification;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 1. Ensure Firms
  INSERT INTO firms (tenant_id, firm_name, legal_name, brand_slug, theme_color, accent_color, point_to_rupee_rate, contact_email)
  VALUES
    (v_tenant, 'Bellad & Company', 'Bellad Automobile Corporation Pvt Ltd', 'bellad', '#0f172a', '#f97316', 0.25, 'support@bellad.co.in'),
    ('BAC-MAIN', 'Bellad Main Hub', 'Bellad Auto Group Main Hub', 'bellad-main', '#0f172a', '#f97316', 0.25, 'admin@bellad.co.in')
  ON CONFLICT (tenant_id) DO UPDATE
  SET firm_name = EXCLUDED.firm_name,
      point_to_rupee_rate = EXCLUDED.point_to_rupee_rate;

  -- 2. Harmonize & Ensure Brands
  INSERT INTO brands (name, brand_name, code, tenant_id)
  VALUES
    ('Hyundai', 'Hyundai', 'HYUN', v_tenant),
    ('Hero', 'Hero', 'HERO', v_tenant),
    ('Tata', 'Tata', 'TATA', v_tenant),
    ('Swaraj', 'Swaraj', 'SWAR', v_tenant)
  ON CONFLICT DO NOTHING;

  UPDATE brands SET name = brand_name WHERE name IS NULL AND brand_name IS NOT NULL;
  UPDATE brands SET brand_name = name WHERE brand_name IS NULL AND name IS NOT NULL;
  UPDATE brands SET code = UPPER(SUBSTRING(COALESCE(brand_name, name) FROM 1 FOR 4)) WHERE code IS NULL;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'brand_id') THEN
    EXECUTE 'UPDATE brands SET id = brand_id WHERE id IS NULL AND brand_id IS NOT NULL';
    EXECUTE 'UPDATE brands SET brand_id = id WHERE brand_id IS NULL AND id IS NOT NULL';
  END IF;

  -- 3. Ensure Branches
  IF NOT EXISTS (SELECT 1 FROM branches WHERE tenant_id = v_tenant) THEN
    INSERT INTO branches (name, code, address, tenant_id, branch_name, branch_city)
    VALUES ('Central Showroom - Hubli', 'HUB-01', 'Central Hubli', v_tenant, 'Central Showroom - Hubli', 'Hubli');
  END IF;

  UPDATE branches SET name = branch_name WHERE name IS NULL AND branch_name IS NOT NULL;
  UPDATE branches SET branch_name = name WHERE branch_name IS NULL AND name IS NOT NULL;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'branch_id') THEN
    EXECUTE 'UPDATE branches SET id = branch_id WHERE id IS NULL AND branch_id IS NOT NULL';
    EXECUTE 'UPDATE branches SET branch_id = id WHERE branch_id IS NULL AND id IS NOT NULL';
  END IF;

  SELECT COALESCE(
    (SELECT branch_id FROM branches WHERE tenant_id = v_tenant LIMIT 1),
    1
  ) INTO v_branch_id;

  -- 4. Ensure Point Rules using dynamic SQL to guarantee immunity from catalog variations
  IF NOT EXISTS (SELECT 1 FROM point_rules WHERE tenant_id = v_tenant) THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'point_rules' AND column_name = 'rate_type') THEN
      EXECUTE 'INSERT INTO point_rules (tenant_id, rate_type, points_per_100) VALUES ($1, ''sale'', 1.00), ($1, ''service'', 1.00) ON CONFLICT DO NOTHING' USING v_tenant;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'point_rules' AND column_name = 'rule_type') THEN
      EXECUTE 'INSERT INTO point_rules (tenant_id, rule_type, multiplier_numerator, multiplier_denominator, description) VALUES ($1, ''sale'', 1, 100, ''Sale 1 pt per 100''), ($1, ''service'', 1, 100, ''Service 1 pt per 100'') ON CONFLICT DO NOTHING' USING v_tenant;
    END IF;
  END IF;

  -- 5. Customer 1: Rajesh Kumar Sharma (BAC-9001, Phone: 9845012345, Creta SX)
  INSERT INTO customers (
    customer_id, customer_name, name, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
    age, firm_name, branch_name, address, is_first_time_visitor, tenant_id
  )
  VALUES (
    'BAC-9001', 'Rajesh Kumar Sharma', 'Rajesh Kumar Sharma', '543287651092',
    '5e404c2f450c742b0179881d5b786238b00c8ba2eb36dc2066ad063abffaee8f',
    '869653a6ff1fab2dc3f91a2a:6b77d79822e9a1c675da5ed1e7d98d00:05ce92ef',
    38, 'Bellad & Company', 'Central Showroom - Hubli', '#42, Indiranagar, Bangalore', FALSE, v_tenant
  )
  ON CONFLICT (customer_id) DO UPDATE
  SET customer_name = EXCLUDED.customer_name,
      name = EXCLUDED.name,
      tenant_id = EXCLUDED.tenant_id;

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

  INSERT INTO points_ledger (customer_id, vehicle_id, branch_id, type, transaction_type, transaction_category, points, amount_paise, source_ref, reason_type, reason_text, tenant_id)
  VALUES
    ('BAC-9001', v_veh1_id, v_branch_id, 'earn_sale', 'sale', 'sale', 14000, 140000000, 'INV-2024-CRETA-8890', 'purchase', 'Vehicle purchase — ex-showroom ₹14,50,000 → +14,000 pts', v_tenant),
    ('BAC-9001', v_veh1_id, v_branch_id, 'earn_service', 'service', 'service', 350, 0, 'INV-2024-CRETA-8890 | In-house Bonus', 'service_bonus', 'In-house Finance & Insurance Bonus (+350 pts)', v_tenant)
  ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_tier_snapshot') THEN
    INSERT INTO customer_tier_snapshot (customer_id, tier_name, current_tier, lifetime_points, current_balance, total_expense_amount, tenant_id, updated_at)
    VALUES ('BAC-9001', 'Platinum', 'Platinum', 14350, 14350, 1450000.00, v_tenant, NOW())
    ON CONFLICT (customer_id) DO UPDATE
    SET tier_name = 'Platinum', current_tier = 'Platinum', lifetime_points = 14350, current_balance = 14350, total_expense_amount = 1450000.00, updated_at = NOW();
  END IF;

  -- 6. Customer 2: Prajwal Wadekar (BAC-100005, Phone: 9876543210, Harrier Dark)
  INSERT INTO customers (
    customer_id, customer_name, name, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
    age, firm_name, branch_name, address, is_first_time_visitor, tenant_id
  )
  VALUES (
    'BAC-100005', 'Prajwal Wadekar', 'Prajwal Wadekar', '901234567890',
    '048234c6082378c10fc012055fd192a6cfd52ea3ac852034cc0e2588afc8cca8',
    '9cacb2ec66af139e0850f067:35640d9dbb0dee4d831aa6de6c7bf3fb:5d150b30',
    32, 'Bellad & Company', 'Central Showroom - Hubli', 'Keshwapur, Hubli, Karnataka', FALSE, v_tenant
  )
  ON CONFLICT (customer_id) DO UPDATE
  SET customer_name = EXCLUDED.customer_name,
      name = EXCLUDED.name,
      tenant_id = EXCLUDED.tenant_id;

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

  INSERT INTO points_ledger (customer_id, vehicle_id, branch_id, type, transaction_type, transaction_category, points, amount_paise, source_ref, reason_type, reason_text, tenant_id)
  VALUES
    ('BAC-100005', v_veh2_id, v_branch_id, 'earn_sale', 'sale', 'sale', 18500, 225000000, 'INV-2024-HAR-1005', 'purchase', 'Vehicle purchase — Harrier Dark Edition → +18,500 pts', v_tenant)
  ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_tier_snapshot') THEN
    INSERT INTO customer_tier_snapshot (customer_id, tier_name, current_tier, lifetime_points, current_balance, total_expense_amount, tenant_id, updated_at)
    VALUES ('BAC-100005', 'Gold', 'Gold', 18500, 18500, 2250000.00, v_tenant, NOW())
    ON CONFLICT (customer_id) DO UPDATE
    SET tier_name = 'Gold', current_tier = 'Gold', lifetime_points = 18500, current_balance = 18500, total_expense_amount = 2250000.00, updated_at = NOW();
  END IF;

  -- 7. Customer 3: Pooja Bellad (BAC-9002, Phone: 9886054321, Splendor)
  INSERT INTO customers (
    customer_id, customer_name, name, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
    age, firm_name, branch_name, address, is_first_time_visitor, tenant_id
  )
  VALUES (
    'BAC-9002', 'Pooja Bellad', 'Pooja Bellad', '789012345678',
    '233cafe0a0f8438816e7be59cb1859f078cb5458c0a3ca271b0ccc9969c10288',
    '189257c71081d17101197e52:407da955c451263ed634b16375bedfdc:40ac56a8',
    29, 'Bellad & Company', 'Central Showroom - Hubli', 'Malleshwaram, Bangalore', FALSE, v_tenant
  )
  ON CONFLICT (customer_id) DO UPDATE
  SET customer_name = EXCLUDED.customer_name,
      name = EXCLUDED.name,
      tenant_id = EXCLUDED.tenant_id;

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

  INSERT INTO points_ledger (customer_id, vehicle_id, branch_id, type, transaction_type, transaction_category, points, amount_paise, source_ref, reason_type, reason_text, tenant_id)
  VALUES
    ('BAC-9002', v_veh3_id, v_branch_id, 'earn_sale', 'sale', 'sale', 1020, 8500000, 'INV-2024-SPL-4501', 'purchase', 'Two-wheeler purchase → +1,020 pts', v_tenant)
  ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_tier_snapshot') THEN
    INSERT INTO customer_tier_snapshot (customer_id, tier_name, current_tier, lifetime_points, current_balance, total_expense_amount, tenant_id, updated_at)
    VALUES ('BAC-9002', 'Silver', 'Silver', 1020, 1020, 85000.00, v_tenant, NOW())
    ON CONFLICT (customer_id) DO UPDATE
    SET tier_name = 'Silver', current_tier = 'Silver', lifetime_points = 1020, current_balance = 1020, total_expense_amount = 85000.00, updated_at = NOW();
  END IF;

  -- 8. Customer 4: Rahul Sharma (BAC-9821, Phone: 9845098210, Safari Dark)
  INSERT INTO customers (
    customer_id, customer_name, name, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
    age, firm_name, branch_name, address, is_first_time_visitor, tenant_id
  )
  VALUES (
    'BAC-9821', 'Rahul Sharma', 'Rahul Sharma', '123456789012',
    '33a4f61f7d23588df8516d7734bbd12975949d0362241cf775d7b53ea5d81a8b',
    '869653a6ff1fab2dc3f91a2a:6b77d79822e9a1c675da5ed1e7d98d00:05ce92ef',
    35, 'Bellad & Company', 'Central Showroom - Hubli', 'Vidyanagar, Hubli, Karnataka', FALSE, v_tenant
  )
  ON CONFLICT (customer_id) DO UPDATE
  SET customer_name = EXCLUDED.customer_name,
      name = EXCLUDED.name,
      tenant_id = EXCLUDED.tenant_id;

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

  INSERT INTO points_ledger (customer_id, vehicle_id, branch_id, type, transaction_type, transaction_category, points, amount_paise, source_ref, reason_type, reason_text, tenant_id)
  VALUES
    ('BAC-9821', v_veh4_id, v_branch_id, 'earn_sale', 'sale', 'sale', 25500, 255000000, 'INV-2024-SAF-9821', 'purchase', 'Vehicle purchase — Safari Dark Edition → +25,500 pts', v_tenant)
  ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_tier_snapshot') THEN
    INSERT INTO customer_tier_snapshot (customer_id, tier_name, current_tier, lifetime_points, current_balance, total_expense_amount, tenant_id, updated_at)
    VALUES ('BAC-9821', 'Platinum', 'Platinum', 25500, 25500, 2550000.00, v_tenant, NOW())
    ON CONFLICT (customer_id) DO UPDATE
    SET tier_name = 'Platinum', current_tier = 'Platinum', lifetime_points = 25500, current_balance = 25500, total_expense_amount = 2550000.00, updated_at = NOW();
  END IF;

  -- 9. Customer 5: Suresh Patil (BAC-100006, Phone: 9845112233, Swaraj Tractor)
  INSERT INTO customers (
    customer_id, customer_name, name, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
    age, firm_name, branch_name, address, is_first_time_visitor, tenant_id
  )
  VALUES (
    'BAC-100006', 'Suresh Patil', 'Suresh Patil', '234567890123',
    '71b56a42a0b1bc85d985223a3d2e1b93f218bbad5f6bca50186937c53641c88a',
    '9cacb2ec66af139e0850f067:35640d9dbb0dee4d831aa6de6c7bf3fb:5d150b30',
    42, 'Bellad & Company', 'Central Showroom - Hubli', 'Gokul Road, Hubli, Karnataka', FALSE, v_tenant
  )
  ON CONFLICT (customer_id) DO UPDATE
  SET customer_name = EXCLUDED.customer_name,
      name = EXCLUDED.name,
      tenant_id = EXCLUDED.tenant_id;

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

  INSERT INTO points_ledger (customer_id, vehicle_id, branch_id, type, transaction_type, transaction_category, points, amount_paise, source_ref, reason_type, reason_text, tenant_id)
  VALUES
    ('BAC-100006', v_veh5_id, v_branch_id, 'earn_sale', 'sale', 'sale', 8200, 82000000, 'INV-2024-SWR-1006', 'purchase', 'Vehicle purchase — Swaraj 744 FE → +8,200 pts', v_tenant)
  ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_tier_snapshot') THEN
    INSERT INTO customer_tier_snapshot (customer_id, tier_name, current_tier, lifetime_points, current_balance, total_expense_amount, tenant_id, updated_at)
    VALUES ('BAC-100006', 'Gold', 'Gold', 8200, 8200, 820000.00, v_tenant, NOW())
    ON CONFLICT (customer_id) DO UPDATE
    SET tier_name = 'Gold', current_tier = 'Gold', lifetime_points = 8200, current_balance = 8200, total_expense_amount = 820000.00, updated_at = NOW();
  END IF;

  -- 10. Customer 6: testing k (BAC-99981188, Phone: 8197348730, Hero Destini 125)
  INSERT INTO customers (
    customer_id, customer_name, name, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
    age, firm_name, branch_name, address, is_first_time_visitor, tenant_id
  )
  VALUES (
    'BAC-99981188', 'testing k', 'testing k', '569916101912',
    'dea5021ed86b224d89801c73cdeac8b4f4002ce27ee9c8b0949ec197a02ad5bb',
    '5d88e89bce0c5b2b354839ea:1061c01b784cf0f912a4a7c45d1a6051:8099fdb3',
    28, 'Bellad & Company', 'Central Showroom - Hubli', 'Keshwapur, Hubballi, Karnataka', TRUE, v_tenant
  )
  ON CONFLICT (customer_id) DO UPDATE
  SET customer_name = EXCLUDED.customer_name,
      name = EXCLUDED.name,
      tenant_id = EXCLUDED.tenant_id;

  INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
  VALUES ('BAC-99981188', '8197348730', TRUE, v_tenant)
  ON CONFLICT DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM vehicles WHERE tenant_id = v_tenant AND chassis_no = 'MBLHA10EN99981188') THEN
    INSERT INTO vehicles (
      customer_id, brand_name, chassis_no, vin, registration_number, model, variant,
      fuel_type, branch_name, firm_name, ex_showroom_price, purchase_date, tenant_id, vehicle_type
    )
    VALUES (
      'BAC-99981188', 'Hero', 'MBLHA10EN99981188', 'MBLHA10EN99981188', 'KA-25-MP-2026', 'Destini 125', 'XTEC Drum',
      'Petrol', 'Central Showroom - Hubli', 'Bellad & Company', 8500000, '2024-08-10', v_tenant, '2W'
    );
  END IF;

  SELECT vehicle_id INTO v_veh6_id FROM vehicles WHERE tenant_id = v_tenant AND chassis_no = 'MBLHA10EN99981188' LIMIT 1;

  INSERT INTO points_ledger (customer_id, vehicle_id, branch_id, type, transaction_type, transaction_category, points, amount_paise, source_ref, reason_type, reason_text, tenant_id)
  VALUES
    ('BAC-99981188', v_veh6_id, v_branch_id, 'earn_sale', 'sale', 'sale', 1020, 8500000, 'INV-2024-DEST-1188', 'purchase', 'Two-wheeler purchase — Hero Destini 125 → +1,020 pts', v_tenant)
  ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_tier_snapshot') THEN
    INSERT INTO customer_tier_snapshot (customer_id, tier_name, current_tier, lifetime_points, current_balance, total_expense_amount, tenant_id, updated_at)
    VALUES ('BAC-99981188', 'Silver', 'Silver', 1020, 1020, 85000.00, v_tenant, NOW())
    ON CONFLICT (customer_id) DO UPDATE
    SET tier_name = 'Silver', current_tier = 'Silver', lifetime_points = 1020, current_balance = 1020, total_expense_amount = 85000.00, updated_at = NOW();
  END IF;

  -- 11. Customer 7: Kavya Bellad (BAC-100007, Phone: 9886011223, Hyundai Verna)
  INSERT INTO customers (
    customer_id, customer_name, name, aadhaar_number, aadhaar_hash, aadhaar_last4_enc,
    age, firm_name, branch_name, address, is_first_time_visitor, tenant_id
  )
  VALUES (
    'BAC-100007', 'Kavya Bellad', 'Kavya Bellad', '890123456789',
    '819203a98f1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d',
    '33a4f61f7d23588df8516d7734bbd12975949d0362241cf775d7b53ea5d81a8b',
    30, 'Bellad & Company', 'Central Showroom - Hubli', 'Keshwapur, Hubballi, Karnataka', FALSE, v_tenant
  )
  ON CONFLICT (customer_id) DO UPDATE
  SET customer_name = EXCLUDED.customer_name,
      name = EXCLUDED.name,
      tenant_id = EXCLUDED.tenant_id;

  INSERT INTO customer_phones (customer_id, phone_number, is_verified, tenant_id)
  VALUES ('BAC-100007', '9886011223', TRUE, v_tenant)
  ON CONFLICT DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM vehicles WHERE tenant_id = v_tenant AND chassis_no = 'MALCVRN48NP100007') THEN
    INSERT INTO vehicles (
      customer_id, brand_name, chassis_no, vin, registration_number, model, variant,
      fuel_type, branch_name, firm_name, ex_showroom_price, purchase_date, tenant_id, vehicle_type
    )
    VALUES (
      'BAC-100007', 'Hyundai', 'MALCVRN48NP100007', 'MALCVRN48NP100007', 'KA-25-MB-9900', 'Verna', 'SX Turbo 1.5 DCT',
      'Petrol', 'Central Showroom - Hubli', 'Bellad & Company', 175000000, '2024-08-20', v_tenant, '4W'
    );
  END IF;

  SELECT vehicle_id INTO v_veh7_id FROM vehicles WHERE tenant_id = v_tenant AND chassis_no = 'MALCVRN48NP100007' LIMIT 1;

  INSERT INTO points_ledger (customer_id, vehicle_id, branch_id, type, transaction_type, transaction_category, points, amount_paise, source_ref, reason_type, reason_text, tenant_id)
  VALUES
    ('BAC-100007', v_veh7_id, v_branch_id, 'earn_sale', 'sale', 'sale', 17500, 175000000, 'INV-2024-VRN-1007', 'purchase', 'Vehicle purchase — Hyundai Verna SX Turbo → +17,500 pts', v_tenant)
  ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_tier_snapshot') THEN
    INSERT INTO customer_tier_snapshot (customer_id, tier_name, current_tier, lifetime_points, current_balance, total_expense_amount, tenant_id, updated_at)
    VALUES ('BAC-100007', 'Gold', 'Gold', 17500, 17500, 1750000.00, v_tenant, NOW())
    ON CONFLICT (customer_id) DO UPDATE
    SET tier_name = 'Gold', current_tier = 'Gold', lifetime_points = 17500, current_balance = 17500, total_expense_amount = 1750000.00, updated_at = NOW();
  END IF;

  -- Harmonize aliases dynamically
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'vehicle_id') THEN
    EXECUTE 'UPDATE vehicles SET vehicle_id = id WHERE vehicle_id IS NULL AND id IS NOT NULL';
    EXECUTE 'UPDATE vehicles SET id = vehicle_id WHERE id IS NULL AND vehicle_id IS NOT NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_phones' AND column_name = 'id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_phones' AND column_name = 'phone_id') THEN
    EXECUTE 'UPDATE customer_phones SET phone_id = id WHERE phone_id IS NULL AND id IS NOT NULL';
    EXECUTE 'UPDATE customer_phones SET id = phone_id WHERE id IS NULL AND phone_id IS NOT NULL';
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

  -- Synchronize alias columns on customers
  UPDATE customers SET name = customer_name WHERE name IS NULL AND customer_name IS NOT NULL;
  UPDATE customers SET customer_name = name WHERE customer_name IS NULL AND name IS NOT NULL;

  -- Re-enable ledger append trigger if permitted
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_points_ledger_modification') THEN
      ALTER TABLE points_ledger ENABLE TRIGGER trg_prevent_points_ledger_modification;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

END $$;
