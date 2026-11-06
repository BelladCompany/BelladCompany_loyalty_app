-- Migration 067: Create App Builder Configurations Table for Visual WordPress-Replica Customizer
-- Allows Dealerships to visually configure theme colors, logos, tabs, buttons, and loyalty logic

CREATE TABLE IF NOT EXISTS app_builder_configs (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) UNIQUE NOT NULL,
  theme_config JSONB NOT NULL DEFAULT '{
    "dealership_name": "Bellad & Company",
    "tagline": "Tata Motors & MG Motors Authorised Dealership Group",
    "logo_url": "/bellad-logo.png",
    "primary_color": "#1e40af",
    "secondary_color": "#3b82f6",
    "accent_color": "#10b981",
    "surface_mode": "light",
    "card_radius": "lg",
    "font_family": "Plus Jakarta Sans",
    "header_banner_text": "Customer Loyalty & Rewards Suite",
    "show_header_banner": true
  }'::jsonb,
  tabs_config JSONB NOT NULL DEFAULT '[
    {"id": "dashboard", "label": "Customer Search & 360", "icon": "LayoutDashboard", "group": "Counter POS", "order": 1, "visible": true, "role_access": "all"},
    {"id": "corrections_queue", "label": "Bill Correction Queue", "icon": "FileText", "group": "Managerial Approvals", "order": 2, "visible": true, "role_access": "manager"},
    {"id": "customer_redemptions", "label": "Customer Redemptions", "icon": "Sparkles", "group": "Loyalty Rewards", "order": 3, "visible": true, "role_access": "cashier"},
    {"id": "referrals", "label": "Referral Rewards", "icon": "Users", "group": "Rewards & Referrals", "order": 4, "visible": true, "role_access": "cashier"},
    {"id": "gift_cards", "label": "Gift Card Rewards", "icon": "Gift", "group": "Rewards & Referrals", "order": 5, "visible": true, "role_access": "cashier"},
    {"id": "director_command_center", "label": "Director Command Center", "icon": "Crown", "group": "Executive Suite", "order": 6, "visible": true, "role_access": "director"},
    {"id": "kyc_approvals", "label": "KYC Approvals", "icon": "ShieldCheck", "group": "Loyalty Rewards", "order": 7, "visible": true, "role_access": "manager"},
    {"id": "reports", "label": "Reports & Analytics", "icon": "BarChart3", "group": "Analytics", "order": 8, "visible": true, "role_access": "manager"}
  ]'::jsonb,
  buttons_config JSONB NOT NULL DEFAULT '[
    {"id": "btn_add_receipt", "label": "Add Receipt", "icon": "Plus", "style": "solid", "placement": "header", "action_type": "open_receipt_modal", "color": "emerald", "enabled": true, "order": 1},
    {"id": "btn_bill_correction", "label": "Bill Correction", "icon": "FileText", "style": "solid", "placement": "header", "action_type": "open_bill_correction_modal", "color": "amber", "enabled": true, "order": 2},
    {"id": "btn_redeem", "label": "Redeem Discount", "icon": "Sparkles", "style": "solid", "placement": "customer_card", "action_type": "open_redemption_modal", "color": "indigo", "enabled": true, "order": 3},
    {"id": "btn_whatsapp_pass", "label": "Send WhatsApp Pass", "icon": "Share2", "style": "outline", "placement": "customer_card", "action_type": "send_whatsapp", "color": "emerald", "enabled": true, "order": 4},
    {"id": "btn_quick_referral", "label": "Add Referral", "icon": "Users", "style": "soft", "placement": "customer_card", "action_type": "open_referral_modal", "color": "primary", "enabled": true, "order": 5},
    {"id": "btn_appsheet_sync", "label": "Sync AppSheet", "icon": "RefreshCw", "style": "outline", "placement": "header", "action_type": "sync_appsheet", "color": "slate", "enabled": true, "order": 6}
  ]'::jsonb,
  logic_config JSONB NOT NULL DEFAULT '{
    "sales_net_ex_pct": 1.0,
    "service_points_pct": 2.5,
    "bodyshop_points_pct": 1.5,
    "accessories_points_pct": 3.0,
    "points_to_inr_ratio": 0.25,
    "lock_in_months": 12,
    "expiry_policy": "FIFO_12_MONTHS",
    "max_redemption_pct": 50,
    "min_points_to_redeem": 500,
    "bill_correction_enabled": true,
    "bill_correction_window_hours": 24,
    "manager_approval_threshold": 5000,
    "welcome_bonus_points": 250,
    "birthday_multiplier": 2.0
  }'::jsonb,
  is_published BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial default configuration for primary dealership groups if not present
INSERT INTO app_builder_configs (tenant_id, theme_config, is_published, published_at)
VALUES 
  (
    'bellad_and_company',
    '{
      "dealership_name": "Bellad & Company",
      "tagline": "Tata Motors & MG Motors Authorised Dealership Group",
      "logo_url": "/bellad-logo.png",
      "primary_color": "#1e40af",
      "secondary_color": "#3b82f6",
      "accent_color": "#10b981",
      "surface_mode": "light",
      "card_radius": "lg",
      "font_family": "Plus Jakarta Sans",
      "header_banner_text": "Customer Loyalty & Rewards Suite",
      "show_header_banner": true
    }'::jsonb,
    TRUE,
    NOW()
  ),
  (
    'sprint_hero',
    '{
      "dealership_name": "Sprint Moto Club",
      "tagline": "Hero MotoCorp & EV Dealership Network",
      "logo_url": "/hero-logo.png",
      "primary_color": "#dc2626",
      "secondary_color": "#ef4444",
      "accent_color": "#f59e0b",
      "surface_mode": "light",
      "card_radius": "lg",
      "font_family": "Inter",
      "header_banner_text": "Sprint Rider Rewards & Cashbacks",
      "show_header_banner": true
    }'::jsonb,
    TRUE,
    NOW()
  )
ON CONFLICT (tenant_id) DO NOTHING;
