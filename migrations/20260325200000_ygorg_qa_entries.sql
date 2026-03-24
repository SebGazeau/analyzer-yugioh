-- Entrées Q&A YGResources (liste de cartes concernées par id interne YGOrg).
-- Alimentée par GET /admin/enrich_ygorganization?mode=sync_qa&max=…
CREATE TABLE IF NOT EXISTS ygorg_qa_entries (
    qa_id                    BIGINT PRIMARY KEY,
    related_ygorg_card_ids   BIGINT[] NOT NULL,
    fetched_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ygorg_qa_entries_cards_gin
    ON ygorg_qa_entries USING GIN (related_ygorg_card_ids);

COMMENT ON TABLE ygorg_qa_entries IS
    'Réponses Q&A officielles : ids YGOrg listés dans le JSON `cards` ; pour associations « même Q&A ».';
