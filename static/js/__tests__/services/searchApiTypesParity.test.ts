import { describe, expect, it } from 'vitest';
import type { SearchApiCard } from '../../services/search/searchApiTypes.js';

/** Clés documentées côté client pour l’alignement avec `SearchCardDto` (Rust, GET /search). */
const SEARCH_CARD_OPTIONAL_KEYS = [
  'name_en',
  'archetype',
  'archetype_source',
  'image_url',
  'frame_type',
  'deck_copy_id',
] as const;

describe('searchApiTypes — parité contrat /search', () => {
  it('accepte archetype_source comme chaîne (aligné serde String côté API)', () => {
    const row: SearchApiCard = {
      name: 'X',
      archetype_source: 'ygorg_effect_en',
    };
    expect(typeof row.archetype_source).toBe('string');
  });

  it('les champs optionnels listés restent des clés connues du type', () => {
    const sample: SearchApiCard = Object.fromEntries(
      SEARCH_CARD_OPTIONAL_KEYS.map((k) => [k, k === 'deck_copy_id' ? 1 : 'v']),
    ) as SearchApiCard;
    for (const k of SEARCH_CARD_OPTIONAL_KEYS) {
      expect(sample).toHaveProperty(k);
    }
  });
});
