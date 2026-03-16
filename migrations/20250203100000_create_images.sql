-- Table images : métadonnées + chemins des variantes (original, desktop, mobile)
CREATE TABLE IF NOT EXISTS images (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_url  TEXT NOT NULL,
    path_original TEXT NOT NULL,
    path_desktop  TEXT NOT NULL,
    path_mobile   TEXT NOT NULL,
    width         INT,
    height        INT,
    mime_type     TEXT NOT NULL DEFAULT 'image/webp',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
