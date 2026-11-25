-- Migration 081: Advisor Invoice Queue & Advisor Role
-- Creates table for service advisor uploaded invoice PDFs, pending cashier receipt creation.
-- Seeds advisor role and default advisor user.

CREATE TABLE IF NOT EXISTS advisor_invoice_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'bellad_and_company',
    file_name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    customer_name VARCHAR(255),
    customer_id VARCHAR(32),
    registration_number VARCHAR(50),
    invoice_number VARCHAR(100),
    net_amount_paise BIGINT DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'archived'
    uploaded_by_user_id INTEGER,
    uploaded_by_username VARCHAR(100),
    completed_by_user_id INTEGER,
    completed_at TIMESTAMPTZ,
    parsed_preview JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advisor_queue_tenant_status ON advisor_invoice_queue (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_advisor_queue_date ON advisor_invoice_queue (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_advisor_queue_cust ON advisor_invoice_queue (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_advisor_queue_inv ON advisor_invoice_queue (tenant_id, invoice_number);

-- Ensure 'advisor' exists in roles table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
    INSERT INTO roles (role_id, role_name, description) VALUES
      ('advisor', 'Service Advisor', 'Service advisor with view-only customer search access and invoice PDF queue submission')
    ON CONFLICT (role_id) DO NOTHING;
  END IF;
END $$;

-- Seed default advisor user (username: advisor, password: advisor123)
DO $$
DECLARE
  v_branch_id INTEGER;
BEGIN
  SELECT COALESCE(
    (SELECT branch_id FROM branches WHERE tenant_id = 'bellad_and_company' LIMIT 1),
    (SELECT id FROM branches WHERE tenant_id = 'bellad_and_company' LIMIT 1),
    1
  ) INTO v_branch_id;

  IF EXISTS (SELECT 1 FROM users WHERE LOWER(username) = 'advisor') THEN
    UPDATE users 
    SET password_hash = '$2a$10$QG5b9rY/Onnpkd/A7E6wbum43G6EBSj2qBUmJbLtEJJdP5wbM52yO',
        role = 'advisor',
        branch_id = v_branch_id,
        tenant_id = 'bellad_and_company'
    WHERE LOWER(username) = 'advisor';
  ELSE
    INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
    VALUES ('advisor', '$2a$10$QG5b9rY/Onnpkd/A7E6wbum43G6EBSj2qBUmJbLtEJJdP5wbM52yO', 'advisor', v_branch_id, 'bellad_and_company');
  END IF;
END $$;
