-- Couches d’enrichissement externes (YGOProDeck complémentaire, YGOrganization, etc.).
-- Politique : ne pas écraser les colonnes « canon » de `cards` ; stocker ici les payloads JSON
-- ou références, fusion côté appli / vues.
CREATE TABLE IF NOT EXISTS card_enrichment_layers (
    card_id   BIGINT      NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    source    TEXT        NOT NULL,
    layer     TEXT        NOT NULL DEFAULT 'default',
    payload   JSONB       NOT NULL DEFAULT '{}'::jsonb,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (card_id, source, layer)
);

CREATE INDEX IF NOT EXISTS idx_card_enrichment_layers_source
    ON card_enrichment_layers (source);

CREATE INDEX IF NOT EXISTS idx_card_enrichment_layers_fetched_at
    ON card_enrichment_layers (fetched_at DESC);

COMMENT ON TABLE card_enrichment_layers IS
    'Données complémentaires par carte et par source (ex. ygorganization, ygoprodeck_misc). Fusion additive ; pas de remplacement des colonnes cards.';
