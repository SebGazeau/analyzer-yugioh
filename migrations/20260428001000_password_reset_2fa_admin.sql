-- Reset mot de passe sans email (2FA + support/admin).

ALTER TABLE site_users
    ADD COLUMN IF NOT EXISTS twofa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS twofa_secret_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS force_enable_2fa_after_reset BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS twofa_enforced_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS password_reset_requests (
    id UUID PRIMARY KEY,
    site_user_id UUID NOT NULL REFERENCES site_users (id) ON DELETE CASCADE,
    path TEXT NOT NULL CHECK (path IN ('twofa', 'admin')),
    status TEXT NOT NULL CHECK (
        status IN (
            'pending',
            'challenge_ready',
            'approved_by_admin',
            'temp_code_issued',
            'password_reset_done',
            'rejected',
            'expired'
        )
    ),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    twofa_verified_at TIMESTAMPTZ,
    recovery_verified_at TIMESTAMPTZ,
    temp_code_verified_at TIMESTAMPTZ,
    approved_by_admin_user_id UUID REFERENCES admin_users (id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_site_user_id
    ON password_reset_requests (site_user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status
    ON password_reset_requests (status);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_expires_at
    ON password_reset_requests (expires_at);

CREATE TABLE IF NOT EXISTS temporary_recovery_codes (
    id UUID PRIMARY KEY,
    password_reset_request_id UUID NOT NULL REFERENCES password_reset_requests (id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    issued_by_admin_user_id UUID REFERENCES admin_users (id) ON DELETE SET NULL,
    delivery_channel TEXT NOT NULL CHECK (delivery_channel IN ('manual_phone')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_temporary_recovery_codes_request_id
    ON temporary_recovery_codes (password_reset_request_id);
CREATE INDEX IF NOT EXISTS idx_temporary_recovery_codes_expires_at
    ON temporary_recovery_codes (expires_at);

CREATE TABLE IF NOT EXISTS recovery_codes (
    id UUID PRIMARY KEY,
    site_user_id UUID NOT NULL REFERENCES site_users (id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    batch_id UUID NOT NULL,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_codes_site_user_id
    ON recovery_codes (site_user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_batch_id
    ON recovery_codes (batch_id);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_unused
    ON recovery_codes (site_user_id, created_at DESC)
    WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS security_audit_events (
    id UUID PRIMARY KEY,
    event_type TEXT NOT NULL,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'admin', 'system')),
    actor_id UUID,
    password_reset_request_id UUID REFERENCES password_reset_requests (id) ON DELETE SET NULL,
    ticket_id UUID,
    ip_address TEXT,
    user_agent TEXT,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_events_event_type
    ON security_audit_events (event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_events_request_id
    ON security_audit_events (password_reset_request_id);
