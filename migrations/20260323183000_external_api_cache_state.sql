-- Révision X-Cache-Revision (API YGOrganization / YGResources) pour invalidation incrémentale via /manifest/{rev}.
CREATE TABLE IF NOT EXISTS external_api_cache_state (
    source         TEXT PRIMARY KEY,
    cache_revision BIGINT NOT NULL DEFAULT 0,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE external_api_cache_state IS
    'État de cache par source externe (révision serveur). Ex. source ygorganization → alignement manifest /data/card.';
