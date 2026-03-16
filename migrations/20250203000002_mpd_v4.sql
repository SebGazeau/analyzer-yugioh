-- ================================================================
-- MPD v4 — Schéma complet (une seule migration pour base vide)
-- ================================================================

-- 1. Types ENUM (idempotent : ne pas échouer si la base existe déjà)
DO $$ BEGIN
    CREATE TYPE card_type AS ENUM (
        'Monster', 'Spell', 'Trap'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE card_attribute AS ENUM (
        'DARK', 'DIVINE', 'EARTH', 'FIRE', 'LIGHT', 'WATER', 'WIND'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE card_frame AS ENUM (
        'normal', 'effect', 'ritual', 'fusion', 'synchro',
        'xyz', 'link', 'token', 'spell', 'trap', 'skill'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE ban_status AS ENUM (
        'Forbidden', 'Limited', 'Semi-Limited'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE deck_zone AS ENUM (
        'main', 'extra', 'side'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Table cards
CREATE TABLE IF NOT EXISTS cards (
    id                 BIGINT                  PRIMARY KEY,
    name               TEXT                    NOT NULL,
    name_en            TEXT,
    race               TEXT,
    level              SMALLINT,
    archetype          TEXT,
    atk                INTEGER,
    def                INTEGER,
    ygoprodeck_url     TEXT,
    updated_at         TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    type               card_type               NOT NULL,
    attribute          card_attribute,
    frame_type         card_frame,
    ban_tcg            ban_status,
    ban_ocg            ban_status,
    card_desc          TEXT                    NOT NULL DEFAULT '',
    human_type         TEXT,
    image_url          TEXT,
    image_url_small    TEXT,
    image_url_cropped  TEXT
);

CREATE INDEX IF NOT EXISTS idx_cards_name_lower  ON cards (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_cards_type        ON cards (type);
CREATE INDEX IF NOT EXISTS idx_cards_frame_type  ON cards (frame_type);
CREATE INDEX IF NOT EXISTS idx_cards_ban_tcg     ON cards (ban_tcg)   WHERE ban_tcg  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cards_archetype   ON cards (archetype) WHERE archetype IS NOT NULL;

-- 3. Éditions / sets
CREATE TABLE IF NOT EXISTS card_sets (
    card_id      BIGINT  NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    set_code     TEXT    NOT NULL,
    rarity_code  TEXT    NOT NULL DEFAULT '',
    set_name     TEXT    NOT NULL,
    rarity       TEXT    NOT NULL,
    set_price    TEXT,
    PRIMARY KEY (card_id, set_code, rarity_code)
);
CREATE INDEX IF NOT EXISTS idx_card_sets_set_code ON card_sets (set_code);

-- 4. Prix
CREATE TABLE IF NOT EXISTS card_prices (
    card_id            BIGINT         PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
    tcgplayer_price    NUMERIC(10,2),
    cardmarket_price   NUMERIC(10,2),
    ebay_price         NUMERIC(10,2),
    amazon_price       NUMERIC(10,2),
    coolstuffinc_price NUMERIC(10,2),
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- 5. Utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id             SERIAL       PRIMARY KEY,
    username       TEXT         NOT NULL UNIQUE,
    email          TEXT         NOT NULL UNIQUE,
    password_hash  TEXT         NOT NULL,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 6. Decks
CREATE TABLE IF NOT EXISTS decks (
    id          SERIAL       PRIMARY KEY,
    user_id     INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    name        TEXT         NOT NULL,
    is_public   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decks_public  ON decks (is_public) WHERE is_public = TRUE;

-- 7. Entrées de deck (main 40-60, extra 0-15, side 0-15 — validé en Rust)
CREATE TABLE IF NOT EXISTS deck_entries (
    deck_id   INTEGER    NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    card_id   BIGINT     NOT NULL REFERENCES cards(id),
    zone      deck_zone  NOT NULL DEFAULT 'main',
    quantity  SMALLINT   NOT NULL CHECK (quantity BETWEEN 1 AND 3),
    PRIMARY KEY (deck_id, card_id, zone)
);
