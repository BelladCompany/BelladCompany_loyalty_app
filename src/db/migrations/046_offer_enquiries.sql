-- ============================================================================
-- Migration 046: Dealership Offer Enquiries Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS offer_enquiries (
  enquiry_id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL DEFAULT 'bellad_and_company',
  offer_id INTEGER REFERENCES dealership_offers(offer_id) ON DELETE SET NULL,
  brand_name VARCHAR(100),
  model_name VARCHAR(150),
  customer_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  city_or_branch VARCHAR(100),
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_enquiries_tenant ON offer_enquiries(tenant_id, status);
