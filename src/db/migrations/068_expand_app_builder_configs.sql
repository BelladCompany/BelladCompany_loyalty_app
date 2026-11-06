-- Migration 068: Expand App Builder Configurations Table
-- Adds branches, user control / staff roles, customer portal, and rewards configs

ALTER TABLE app_builder_configs 
ADD COLUMN IF NOT EXISTS branches_config JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS users_config JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS portal_config JSONB NOT NULL DEFAULT '{
  "hero_title": "Welcome to Customer Rewards Portal",
  "hero_subtitle": "Track points, unlock exclusive service benefits, and claim instant vouchers.",
  "banner_image": "/offers/portal-banner.jpg",
  "show_points_calculator": true,
  "show_whatsapp_pass": true,
  "show_monthly_offers": true,
  "show_referral_claim": true,
  "login_method": "phone_otp"
}'::jsonb,
ADD COLUMN IF NOT EXISTS rewards_config JSONB NOT NULL DEFAULT '{
  "referral_vehicle_purchase_reward": 2500,
  "referral_service_visit_reward": 500,
  "gift_card_bonus_pct": 10,
  "kyc_verification_bonus": 500
}'::jsonb;

-- Seed default branch and user configuration for Trident Automobiles and Bellad
UPDATE app_builder_configs
SET 
  branches_config = '[
    {"id": "br_blr_south", "code": "TRD-BLR-01", "name": "Trident Bengaluru South", "city": "Bengaluru", "multiplier": 1.0, "redemption_budget": 500000, "manager_approval_limit": 5000, "is_active": true},
    {"id": "br_indiranagar", "code": "TRD-BLR-02", "name": "Trident Indiranagar Flagship", "city": "Bengaluru", "multiplier": 1.1, "redemption_budget": 750000, "manager_approval_limit": 7500, "is_active": true},
    {"id": "br_whitefield", "code": "TRD-BLR-03", "name": "Trident Whitefield Tech Hub", "city": "Bengaluru", "multiplier": 1.0, "redemption_budget": 600000, "manager_approval_limit": 5000, "is_active": true}
  ]'::jsonb,
  users_config = '[
    {"id": "usr_1", "username": "trident_cashier1", "full_name": "Ramesh Kumar", "role": "cashier", "branch_code": "TRD-BLR-01", "phone": "9880011223", "is_active": true},
    {"id": "usr_2", "username": "trident_mgr1", "full_name": "Anand Varma", "role": "branch_manager", "branch_code": "TRD-BLR-01", "phone": "9880044556", "is_active": true},
    {"id": "usr_3", "username": "trident_accounts", "full_name": "Suresh Hegde", "role": "accounts_head", "branch_code": "TRD-BLR-02", "phone": "9880077889", "is_active": true},
    {"id": "usr_4", "username": "trident_director", "full_name": "Director Trident Auto", "role": "director", "branch_code": "ALL", "phone": "9880099001", "is_active": true}
  ]'::jsonb
WHERE tenant_id = 'trident_automobiles';

-- Also insert Trident Automobiles default record if not present
INSERT INTO app_builder_configs (
  tenant_id,
  theme_config,
  tabs_config,
  buttons_config,
  logic_config,
  branches_config,
  users_config,
  portal_config,
  rewards_config,
  is_published,
  published_at
)
VALUES (
  'trident_automobiles',
  '{
    "dealership_name": "Trident Automobiles",
    "tagline": "Authorised Multi-Brand & Premium Mobility Partner",
    "logo_url": "/trident-logo.svg",
    "primary_color": "#0284c7",
    "secondary_color": "#0369a1",
    "accent_color": "#059669",
    "surface_mode": "light",
    "card_radius": "rounded-2xl",
    "font_family": "Plus Jakarta Sans",
    "header_banner_text": "Trident Elite Customer Privilege Club",
    "show_header_banner": true
  }'::jsonb,
  '[
    {"id": "dashboard", "label": "Customer Search & 360", "icon": "LayoutDashboard", "group": "Counter POS", "order": 1, "visible": true, "role_access": "all"},
    {"id": "corrections_queue", "label": "Bill Correction Queue", "icon": "FileText", "group": "Managerial Approvals", "order": 2, "visible": true, "role_access": "manager"},
    {"id": "customer_redemptions", "label": "Customer Redemptions", "icon": "Sparkles", "group": "Loyalty Rewards", "order": 3, "visible": true, "role_access": "cashier"},
    {"id": "referrals", "label": "Referral Rewards", "icon": "Users", "group": "Rewards & Referrals", "order": 4, "visible": true, "role_access": "cashier"},
    {"id": "gift_cards", "label": "Gift Card Rewards", "icon": "Gift", "group": "Rewards & Referrals", "order": 5, "visible": true, "role_access": "cashier"},
    {"id": "director_command_center", "label": "Director Command Center", "icon": "Crown", "group": "Executive Suite", "order": 6, "visible": true, "role_access": "director"},
    {"id": "kyc_approvals", "label": "KYC Approvals", "icon": "ShieldCheck", "group": "Loyalty Rewards", "order": 7, "visible": true, "role_access": "manager"},
    {"id": "reports", "label": "Reports & Analytics", "icon": "Calculator", "group": "Analytics", "order": 8, "visible": true, "role_access": "manager"}
  ]'::jsonb,
  '[
    {"id": "btn_add_receipt", "label": "Add Receipt", "icon": "Plus", "style": "solid", "placement": "header", "action_type": "open_receipt_modal", "color": "emerald", "enabled": true, "order": 1},
    {"id": "btn_bill_correction", "label": "Bill Correction", "icon": "FileText", "style": "solid", "placement": "header", "action_type": "open_bill_correction_modal", "color": "amber", "enabled": true, "order": 2},
    {"id": "btn_redeem", "label": "Redeem Discount", "icon": "Sparkles", "style": "solid", "placement": "customer_card", "action_type": "open_redemption_modal", "color": "indigo", "enabled": true, "order": 3},
    {"id": "btn_whatsapp_pass", "label": "Send WhatsApp Pass", "icon": "Share2", "style": "outline", "placement": "customer_card", "action_type": "send_whatsapp", "color": "emerald", "enabled": true, "order": 4},
    {"id": "btn_quick_referral", "label": "Add Referral", "icon": "Users", "style": "soft", "placement": "customer_card", "action_type": "open_referral_modal", "color": "primary", "enabled": true, "order": 5},
    {"id": "btn_appsheet_sync", "label": "Sync AppSheet", "icon": "RefreshCw", "style": "outline", "placement": "header", "action_type": "sync_appsheet", "color": "slate", "enabled": true, "order": 6}
  ]'::jsonb,
  '{
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
  '[
    {"id": "br_blr_south", "code": "TRD-BLR-01", "name": "Trident Bengaluru South", "city": "Bengaluru", "multiplier": 1.0, "redemption_budget": 500000, "manager_approval_limit": 5000, "is_active": true},
    {"id": "br_indiranagar", "code": "TRD-BLR-02", "name": "Trident Indiranagar Flagship", "city": "Bengaluru", "multiplier": 1.1, "redemption_budget": 750000, "manager_approval_limit": 7500, "is_active": true},
    {"id": "br_whitefield", "code": "TRD-BLR-03", "name": "Trident Whitefield Tech Hub", "city": "Bengaluru", "multiplier": 1.0, "redemption_budget": 600000, "manager_approval_limit": 5000, "is_active": true}
  ]'::jsonb,
  '[
    {"id": "usr_1", "username": "trident_cashier1", "full_name": "Ramesh Kumar", "role": "cashier", "branch_code": "TRD-BLR-01", "phone": "9880011223", "is_active": true},
    {"id": "usr_2", "username": "trident_mgr1", "full_name": "Anand Varma", "role": "branch_manager", "branch_code": "TRD-BLR-01", "phone": "9880044556", "is_active": true},
    {"id": "usr_3", "username": "trident_accounts", "full_name": "Suresh Hegde", "role": "accounts_head", "branch_code": "TRD-BLR-02", "phone": "9880077889", "is_active": true},
    {"id": "usr_4", "username": "trident_director", "full_name": "Director Trident Auto", "role": "director", "branch_code": "ALL", "phone": "9880099001", "is_active": true}
  ]'::jsonb,
  '{
    "hero_title": "Trident Privilege Club Portal",
    "hero_subtitle": "Exclusive member rewards, complimentary vehicle inspections, and service point redemptions.",
    "banner_image": "/offers/portal-banner.jpg",
    "show_points_calculator": true,
    "show_whatsapp_pass": true,
    "show_monthly_offers": true,
    "show_referral_claim": true,
    "login_method": "phone_otp"
  }'::jsonb,
  '{
    "referral_vehicle_purchase_reward": 2500,
    "referral_service_visit_reward": 500,
    "gift_card_bonus_pct": 10,
    "kyc_verification_bonus": 500
  }'::jsonb,
  TRUE,
  NOW()
)
ON CONFLICT (tenant_id) DO NOTHING;

