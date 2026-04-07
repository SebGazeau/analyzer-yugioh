/**
 * Forme minimale des cartes renvoyées par `/api/cards/search` et apparentées.
 * Champs supplémentaires conservés via index signature (données YGOProDeck).
 */
export type SearchApiCard = {
    name?: string;
    name_en?: string;
    type?: string;
    race?: string;
    level?: number | null;
    archetype?: string | null;
    /** Aligné sur `SearchCardDto.archetype_source` (Rust) : absent ou chaîne, jamais forcé côté client. */
    archetype_source?: string | null;
    image_url?: string | null;
    id?: number;
    deck_copy_id?: number | null;
    frame_type?: string;
} & Record<string, unknown>;
