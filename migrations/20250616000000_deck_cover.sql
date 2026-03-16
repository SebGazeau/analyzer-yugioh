-- Carte de couverture pour l'affichage dans « Mes decks »
ALTER TABLE decks ADD COLUMN IF NOT EXISTS cover_card_name TEXT;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
