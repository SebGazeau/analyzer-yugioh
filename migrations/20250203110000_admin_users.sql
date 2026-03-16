-- Comptes admin pour connexion email / mot de passe (hachage Argon2).
-- Idempotent : safe si la table existe déjà (création manuelle ou migration précédente).
CREATE TABLE IF NOT EXISTS admin_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users (LOWER(email));
