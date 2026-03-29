-- Colonne de traçabilité : quand archetype est complété hors import YGOProDeck (phase ultérieure).
ALTER TABLE cards ADD COLUMN IF NOT EXISTS archetype_source TEXT NULL;

COMMENT ON COLUMN cards.archetype_source IS
    'Origine du champ archetype si complété hors YGOProDeck (ex. ygorg_derived). NULL = YGOProDeck ou non renseigné.';
