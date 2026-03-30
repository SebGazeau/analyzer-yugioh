-- Catalogue officiel Konami (db.yugioh-card.com) : snapshots JSON après parsing HTML.
-- Évite de dupliquer ces données dans `card_enrichment_layers` (clé = card_id).
CREATE TABLE IF NOT EXISTS konami_catalog_snapshots (
    snapshot_key TEXT PRIMARY KEY,
    locale TEXT NOT NULL DEFAULT 'en',
    kind TEXT NOT NULL,
    source_url TEXT NOT NULL,
    payload JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_konami_catalog_kind_locale
    ON konami_catalog_snapshots (kind, locale);
