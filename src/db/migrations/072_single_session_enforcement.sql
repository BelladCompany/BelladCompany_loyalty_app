-- 072_single_session_enforcement.sql
-- Enforces single-active-session concurrency protection across devices and browser profiles

ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_id VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_device_info VARCHAR(255);

-- Performance index for real-time session validation
CREATE INDEX IF NOT EXISTS idx_users_active_session_id ON users(active_session_id) WHERE active_session_id IS NOT NULL;
