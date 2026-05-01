ALTER TABLE site_users
    ADD COLUMN IF NOT EXISTS twofa_setup_expires_at TIMESTAMPTZ;
