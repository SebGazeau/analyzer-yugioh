import { describe, it, expect } from 'vitest';
import {
  cardTypeKindFromTypeString,
  cardTypeKindFromTypeStringOrNull,
} from '../utils/cardTypeKind.js';
import {
  CARD_TYPE_KIND_MONSTER,
  CARD_TYPE_KIND_SPELL,
  CARD_TYPE_KIND_TRAP,
} from '../utils/cardTypeKindConstants.js';

describe('cardTypeKindFromTypeStringOrNull', () => {
  it('retourne null si aucun mot-clé reconnu', () => {
    expect(cardTypeKindFromTypeStringOrNull('Token')).toBeNull();
    expect(cardTypeKindFromTypeStringOrNull('')).toBeNull();
    expect(cardTypeKindFromTypeStringOrNull(undefined)).toBeNull();
  });

  it('aligné sur les mêmes sous-chaînes que la variante affichage', () => {
    expect(cardTypeKindFromTypeStringOrNull('Effect Monster')).toBe(CARD_TYPE_KIND_MONSTER);
    expect(cardTypeKindFromTypeStringOrNull('Spell Card')).toBe(CARD_TYPE_KIND_SPELL);
    expect(cardTypeKindFromTypeStringOrNull('Trap')).toBe(CARD_TYPE_KIND_TRAP);
  });

  it('monstre même si le type contient « spell » ou « trap » avant le mot Monstre', () => {
    expect(cardTypeKindFromTypeStringOrNull('Effect Spell Tuner Monster')).toBe(CARD_TYPE_KIND_MONSTER);
    expect(cardTypeKindFromTypeStringOrNull('Trap Monster')).toBe(CARD_TYPE_KIND_MONSTER);
  });

  it('reconnaît les libellés de type français Konami', () => {
    expect(cardTypeKindFromTypeStringOrNull('Monstre Syntoniseur / Effet')).toBe(CARD_TYPE_KIND_MONSTER);
    expect(cardTypeKindFromTypeStringOrNull('Carte Magie Jeu-Rapide')).toBe(CARD_TYPE_KIND_SPELL);
    expect(cardTypeKindFromTypeStringOrNull('Carte Piège Normal')).toBe(CARD_TYPE_KIND_TRAP);
    expect(cardTypeKindFromTypeStringOrNull('Carte Piege Normal')).toBe(CARD_TYPE_KIND_TRAP);
  });
});

describe('cardTypeKindFromTypeString', () => {
  it('détecte monstre / sort / piège (casse mixte)', () => {
    expect(cardTypeKindFromTypeString('Effect Monster')).toBe(CARD_TYPE_KIND_MONSTER);
    expect(cardTypeKindFromTypeString('Quick-Play Spell')).toBe(CARD_TYPE_KIND_SPELL);
    expect(cardTypeKindFromTypeString('Normal Trap Card')).toBe(CARD_TYPE_KIND_TRAP);
  });

  it('défaut monstre si type vide ou ambigu (affichage recherche / grille)', () => {
    expect(cardTypeKindFromTypeString('')).toBe(CARD_TYPE_KIND_MONSTER);
    expect(cardTypeKindFromTypeString(undefined)).toBe(CARD_TYPE_KIND_MONSTER);
    expect(cardTypeKindFromTypeString('Token')).toBe(CARD_TYPE_KIND_MONSTER);
  });
});
