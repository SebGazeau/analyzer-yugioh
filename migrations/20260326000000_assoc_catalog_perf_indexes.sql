-- Accélère `/associations/catalog` : `ygorg_en_catalog_fields_by_card_id` filtre
-- source = 'ygorganization' AND layer = 'card_raw' (voir src/db.rs).
CREATE INDEX IF NOT EXISTS idx_card_enrichment_ygorg_card_raw
    ON card_enrichment_layers (card_id)
    WHERE source = 'ygorganization' AND layer = 'card_raw';

COMMENT ON INDEX idx_card_enrichment_ygorg_card_raw IS
    'Scan ciblé des payloads YGOrg card_raw pour le joint catalogue associations.';
