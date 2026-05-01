-- Session revocation globale (epoch) pour invalider les sessions après reset.

ALTER TABLE site_users
    ADD COLUMN IF NOT EXISTS session_epoch BIGINT NOT NULL DEFAULT 0;
