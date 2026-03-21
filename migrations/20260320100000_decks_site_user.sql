-- Decks rattachés au compte site (inscription / connexion).
ALTER TABLE decks
    ADD COLUMN IF NOT EXISTS site_user_id UUID REFERENCES site_users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_decks_site_user_id ON decks (site_user_id) WHERE site_user_id IS NOT NULL;
