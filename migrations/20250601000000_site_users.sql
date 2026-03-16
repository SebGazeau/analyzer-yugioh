-- Comptes utilisateurs du site (connexion / inscription).
-- Pseudo unique, mot de passe haché (Argon2).
CREATE TABLE IF NOT EXISTS site_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pseudo        TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_users_pseudo_lower ON site_users (LOWER(TRIM(pseudo)));
