-- Agrégats insight Fidraulis (télémétrie post-sauvegarde deck, auth obligatoire).
-- rule_version : bump manuel côté app quand heuristique / allowlist change.

CREATE TABLE IF NOT EXISTS insight_fidraulis_passcode_stats (
    passcode BIGINT NOT NULL,
    rule_version SMALLINT NOT NULL,
    cooccurrence_extra_with_fid BIGINT NOT NULL DEFAULT 0,
    synergy_verified_pass BIGINT NOT NULL DEFAULT 0,
    synergy_heuristic_pass BIGINT NOT NULL DEFAULT 0,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (passcode, rule_version)
);

CREATE INDEX IF NOT EXISTS idx_fidraulis_stats_last_seen
    ON insight_fidraulis_passcode_stats (last_seen_at DESC);

CREATE TABLE IF NOT EXISTS insight_fidraulis_deck_last_sync (
    site_user_id UUID NOT NULL REFERENCES site_users (id) ON DELETE CASCADE,
    deck_id INT NOT NULL REFERENCES decks (id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,
    rule_version SMALLINT NOT NULL,
    last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (site_user_id, deck_id)
);

CREATE INDEX IF NOT EXISTS idx_fidraulis_deck_sync_sent ON insight_fidraulis_deck_last_sync (last_sent_at DESC);
