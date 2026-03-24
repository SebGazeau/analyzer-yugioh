-- Index local de /data/idx/card/name/en (nom EN exact → ID interne YGResources).
-- Permet de résoudre nos `cards.id` (passcodes YGOProDeck) vers l’URL /data/card/{ygorg_id}.
CREATE TABLE IF NOT EXISTS ygorg_en_name_index (
    name_exact         TEXT   NOT NULL,
    ygorg_internal_id  BIGINT NOT NULL,
    PRIMARY KEY (name_exact, ygorg_internal_id)
);

CREATE INDEX IF NOT EXISTS idx_ygorg_en_name_index_lookup
    ON ygorg_en_name_index (name_exact);

COMMENT ON TABLE ygorg_en_name_index IS
    'Réplique de l’index YGResources nom EN → id interne ; alimentée par /admin/enrich_ygorganization?mode=sync_index.';

-- Cartes pour lesquelles aucune entrée d’index ne correspond (évite boucles backfill).
CREATE TABLE IF NOT EXISTS card_ygorg_unresolved (
    card_id   BIGINT PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
    reason    TEXT NOT NULL,
    tried_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE card_ygorg_unresolved IS
    'Backfill YGOrg : nom non trouvé dans ygorg_en_name_index ; vider ou resync index pour réessayer.';

-- Lien nos cartes ↔ ID interne YGResources (pour manifest + traçabilité).
CREATE TABLE IF NOT EXISTS card_ygorg_id_map (
    card_id             BIGINT PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
    ygorg_internal_id   BIGINT NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_ygorg_id_map_ygorg
    ON card_ygorg_id_map (ygorg_internal_id);

COMMENT ON TABLE card_ygorg_id_map IS
    'Mapping résolu : card_id (YGOProDeck) → ygorg_internal_id pour GET /data/card/{id} et manifest.';
