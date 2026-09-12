-- Migration 022: Create referral_leads table for lead generation and RC-deferred crediting

CREATE TABLE IF NOT EXISTS referral_leads (
    id SERIAL PRIMARY KEY,
    referrer_customer_id VARCHAR(100) NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    lead_name VARCHAR(255) NOT NULL,
    lead_phone VARCHAR(20) NOT NULL,
    lead_aadhaar_hash VARCHAR(255) NOT NULL,
    lead_aadhaar_last4_enc VARCHAR(255) NOT NULL,
    generated_code VARCHAR(20) NOT NULL UNIQUE,
    phone_verified BOOLEAN DEFAULT false,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'rc_completed', 'mismatched', 'expired')),
    matched_sale_reference VARCHAR(255) NULL,
    flagged_reason TEXT NULL,
    tenant_id VARCHAR(100) DEFAULT 'bellad_and_company',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index to prevent duplicate active leads for the same Aadhaar per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_leads_tenant_aadhaar_active 
ON referral_leads (tenant_id, lead_aadhaar_hash) 
WHERE status != 'expired';

CREATE INDEX IF NOT EXISTS idx_referral_leads_generated_code ON referral_leads(generated_code);
CREATE INDEX IF NOT EXISTS idx_referral_leads_status ON referral_leads(status);
CREATE INDEX IF NOT EXISTS idx_referral_leads_referrer ON referral_leads(referrer_customer_id);
