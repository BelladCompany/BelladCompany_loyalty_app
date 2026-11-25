-- 079_invoice_spare_parts_ocr_v2.sql
-- V2 Invoice & Spare Parts Storage Engine
-- Fully isolated from V1: Storing itemized spare parts, labour, and auto-cataloging master prices.

-- ─── 1. INVOICE RECORDS (HEADER TABLE) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_records (
  id                      SERIAL PRIMARY KEY,
  tenant_id               VARCHAR(64) NOT NULL DEFAULT 'bellad_and_company',
  invoice_number          VARCHAR(64) NOT NULL,
  invoice_date            TIMESTAMPTZ,
  job_card_number         VARCHAR(64),
  repair_order_number     VARCHAR(64),
  brand_name              VARCHAR(64) NOT NULL,
  branch_id               INTEGER,
  branch_name             VARCHAR(255),
  customer_id             VARCHAR(32),
  customer_name           VARCHAR(255),
  customer_phone          VARCHAR(32),
  vehicle_id              INTEGER,
  registration_number     VARCHAR(32),
  vin                     VARCHAR(64),
  model                   VARCHAR(128),
  odometer_kms            INTEGER,
  service_transaction_id  INTEGER,
  billing_type            VARCHAR(32) DEFAULT 'Paid',
  
  -- Financial Breakdowns (stored in paise for exact rupee precision)
  parts_taxable_paise     BIGINT DEFAULT 0,
  parts_total_paise       BIGINT DEFAULT 0,
  labour_taxable_paise    BIGINT DEFAULT 0,
  labour_total_paise      BIGINT DEFAULT 0,
  cgst_paise              BIGINT DEFAULT 0,
  sgst_paise              BIGINT DEFAULT 0,
  discount_paise          BIGINT DEFAULT 0,
  round_off_paise         BIGINT DEFAULT 0,
  net_amount_paise        BIGINT NOT NULL DEFAULT 0,
  
  -- Audit & Metadata
  ocr_status              VARCHAR(32) DEFAULT 'completed',
  ocr_confidence          NUMERIC(5, 2) DEFAULT 100.00,
  raw_pdf_name            VARCHAR(255),
  raw_extracted_json      JSONB,
  created_by              INTEGER,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_invoice_records_tenant_num UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoice_records_tenant_inv ON invoice_records (tenant_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_records_customer ON invoice_records (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_records_reg_no ON invoice_records (tenant_id, registration_number);
CREATE INDEX IF NOT EXISTS idx_invoice_records_vin ON invoice_records (tenant_id, vin);
CREATE INDEX IF NOT EXISTS idx_invoice_records_brand ON invoice_records (tenant_id, brand_name);
CREATE INDEX IF NOT EXISTS idx_invoice_records_date ON invoice_records (invoice_date DESC);


-- ─── 2. INVOICE LINE ITEMS (SPARE PARTS & LABOUR ROWS) ─────────────────────────

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id                      SERIAL PRIMARY KEY,
  tenant_id               VARCHAR(64) NOT NULL DEFAULT 'bellad_and_company',
  invoice_id              INTEGER NOT NULL REFERENCES invoice_records(id) ON DELETE CASCADE,
  item_type               VARCHAR(32) NOT NULL, -- 'part', 'labour', 'oil', 'battery', 'consumable', 'other'
  item_code               VARCHAR(64),          -- Part / Op Code e.g. 'SPDMCYL02SS', '97133H6100', '407012'
  item_description        TEXT NOT NULL,        -- 'HERO 4T PLUS 10W30 (900 ML)', 'FILTER ASSY-AIR'
  hsn_sac_code            VARCHAR(32),          -- '27101972', '87089900', '998729'
  billing_type            VARCHAR(32) DEFAULT 'Paid', -- 'Paid', 'Warranty', 'FOC', 'Insurance'
  quantity                NUMERIC(10, 4) NOT NULL DEFAULT 1,
  uom                     VARCHAR(16) DEFAULT 'PC',
  unit_rate_paise         BIGINT NOT NULL DEFAULT 0,
  total_value_paise       BIGINT NOT NULL DEFAULT 0,
  discount_paise          BIGINT NOT NULL DEFAULT 0,
  taxable_value_paise     BIGINT NOT NULL DEFAULT 0,
  cgst_rate_percent       NUMERIC(5, 2) DEFAULT 0,
  cgst_amount_paise       BIGINT DEFAULT 0,
  sgst_rate_percent       NUMERIC(5, 2) DEFAULT 0,
  sgst_amount_paise       BIGINT DEFAULT 0,
  total_amount_paise      BIGINT NOT NULL DEFAULT 0,
  
  -- Fast analytical lookups
  brand_name              VARCHAR(64),
  vehicle_model           VARCHAR(128),
  registration_number     VARCHAR(32),
  vin                     VARCHAR(64),
  invoice_date            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_code ON invoice_line_items (tenant_id, item_code);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_desc ON invoice_line_items (tenant_id, item_description);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_vin ON invoice_line_items (tenant_id, vin);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_brand ON invoice_line_items (tenant_id, brand_name);


-- ─── 3. SPARE PARTS MASTER CATALOG & PRICE HISTORY ────────────────────────────

CREATE TABLE IF NOT EXISTS spare_parts_catalog (
  id                      SERIAL PRIMARY KEY,
  tenant_id               VARCHAR(64) NOT NULL DEFAULT 'bellad_and_company',
  brand_name              VARCHAR(64) NOT NULL,
  part_number             VARCHAR(64) NOT NULL,
  part_name               TEXT NOT NULL,
  hsn_code                VARCHAR(32),
  category                VARCHAR(32) DEFAULT 'spares',
  latest_unit_rate_paise  BIGINT NOT NULL DEFAULT 0,
  latest_mrp_paise        BIGINT NOT NULL DEFAULT 0,
  tax_rate_percent        NUMERIC(5, 2) DEFAULT 18.00,
  compatible_models       TEXT[] DEFAULT '{}',
  last_seen_date          TIMESTAMPTZ DEFAULT NOW(),
  last_seen_invoice_no    VARCHAR(64),
  price_history           JSONB DEFAULT '[]',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_spare_parts_brand_part UNIQUE (tenant_id, brand_name, part_number)
);

CREATE INDEX IF NOT EXISTS idx_spare_parts_part_num ON spare_parts_catalog (tenant_id, part_number);
CREATE INDEX IF NOT EXISTS idx_spare_parts_brand ON spare_parts_catalog (tenant_id, brand_name);
CREATE INDEX IF NOT EXISTS idx_spare_parts_hsn ON spare_parts_catalog (hsn_code);
