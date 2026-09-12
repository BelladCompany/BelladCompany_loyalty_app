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
UPDATE referrals SET points_awarded = COALESCE(points_credited, 0) WHERE points_awarded = 0 OR points_awarded IS NULL;
UPDATE referrals SET points_credited = COALESCE(points_awarded, 0) WHERE points_credited = 0 OR points_credited IS NULL;
UPDATE referrals SET approval_reason = reason WHERE approval_reason IS NULL AND reason IS NOT NULL;
UPDATE referrals SET reason = approval_reason WHERE reason IS NULL AND approval_reason IS NOT NULL;

-- 3. REFERRAL_APPROVERS Table
-- Add user_id and is_active columns if missing
ALTER TABLE referral_approvers ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE referral_approvers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE referral_approvers SET is_active = active WHERE is_active IS NULL AND active IS NOT NULL;
