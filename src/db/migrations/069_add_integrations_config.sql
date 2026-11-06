-- Migration 069: Add API & Database Integrations Config to App Builder
-- Allows dealerships to configure Database connection, AppSheet, RealBooks ERP, WhatsApp, Razorpay, and CSV Data Import

ALTER TABLE app_builder_configs 
ADD COLUMN IF NOT EXISTS integrations_config JSONB NOT NULL DEFAULT '{
  "database": {
    "db_type": "postgres",
    "host": "aws-0-ap-south-1.pooler.supabase.com",
    "port": "5432",
    "database": "postgres",
    "user": "postgres.loyalty",
    "ssl": true,
    "status": "connected"
  },
  "apis": {
    "appsheet": { "enabled": true, "app_id": "bellad-crm-prod", "api_key": "sec_appsheet_live_***", "sync_interval": "hourly" },
    "realbooks": { "enabled": true, "endpoint": "https://api.realbooks.in/v1/invoices", "company_id": "BELLAD_01" },
    "whatsapp": { "enabled": true, "provider": "interakt", "api_key": "sec_waba_***", "sender_number": "+918362444555" },
    "razorpay": { "enabled": true, "key_id": "rzp_live_***", "webhook_secret": "whsec_***" },
    "sms": { "enabled": true, "provider": "fast2sms", "sender_id": "BELLAD" }
  }
}'::jsonb;
