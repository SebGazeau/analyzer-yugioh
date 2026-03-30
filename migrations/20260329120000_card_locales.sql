-- Traductions / libellés par locale (complément à `cards.name` / `cards.card_desc` par défaut).
-- Sources typiques : ygoprodeck (API), konami_official (site officiel).
CREATE TABLE IF NOT EXISTS card_locales (
    card_id BIGINT NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    name TEXT NOT NULL,
    card_desc TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'ygoprodeck',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (card_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_card_locales_locale ON card_locales (locale);
