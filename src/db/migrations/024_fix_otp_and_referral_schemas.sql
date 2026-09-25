-- Migration 024: Align Schemas & Column Aliases for Live PostgreSQL DB
-- -------------------------------------------------------------------

-- 1. OTP_REQUESTS Table
-- Add phone_number and is_used columns if missing
ALTER TABLE otp_requests ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE otp_requests ADD COLUMN IF NOT EXISTS is_used BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE otp_requests ALTER COLUMN customer_id DROP NOT NULL;

-- 2. REFERRALS Table
-- Add alias columns for full backward & forward query compatibility
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS points_awarded BIGINT DEFAULT 0;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS approval_reason TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS approved_by_approver_id INTEGER;

-- Keep values in sync





-- 3. REFERRAL_APPROVERS Table
-- Add user_id and is_active columns if missing
ALTER TABLE referral_approvers ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE referral_approvers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;


