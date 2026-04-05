import { describe, it, expect } from 'vitest';
import {
  cardTypeKindFromTypeString,
  cardTypeKindFromTypeStringOrNull,
} from '../utils/cardTypeKind.js';

describe('cardTypeKindFromTypeStringOrNull', () => {
  it('retourne null si aucun mot-clé reconnu', () => {
    expect(cardTypeKindFromTypeStringOrNull('Token')).toBeNull();
    expect(cardTypeKindFromTypeStringOrNull('')).toBeNull();
    expect(cardTypeKindFromTypeStringOrNull(undefined)).toBeNull();
  });

  it('aligné sur les mêmes sous-chaînes que la variante affichage', () => {
    expect(cardTypeKindFromTypeStringOrNull('Effect Monster')).toBe('monster');
    expect(cardTypeKindFromTypeStringOrNull('Spell Card')).toBe('spell');
    expect(cardTypeKindFromTypeStringOrNull('Trap')).toBe('trap');
  });
});

describe('cardTypeKindFromTypeString', () => {
  it('détecte monstre / sort / piège (casse mixte)', () => {
    expect(cardTypeKindFromTypeString('Effect Monster')).toBe('monster');
    expect(cardTypeKindFromTypeString('Quick-Play Spell')).toBe('spell');
    expect(cardTypeKindFromTypeString('Normal Trap Card')).toBe('trap');
  });

  it('défaut monstre si type vide ou ambigu (affichage recherche / grille)', () => {
    expect(cardTypeKindFromTypeString('')).toBe('monster');
    expect(cardTypeKindFromTypeString(undefined)).toBe('monster');
    expect(cardTypeKindFromTypeString('Token')).toBe('monster');
  });
});
