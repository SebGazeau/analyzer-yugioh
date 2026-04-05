import { describe, it, expect } from 'vitest';
import { cardTypeKindFromTypeString } from '../utils/cardTypeKind.js';

describe('cardTypeKindFromTypeString', () => {
  it('détecte monstre / sort / piège (casse mixte)', () => {
    expect(cardTypeKindFromTypeString('Effect Monster')).toBe('monster');
    expect(cardTypeKindFromTypeString('Quick-Play Spell')).toBe('spell');
    expect(cardTypeKindFromTypeString('Normal Trap Card')).toBe('trap');
  });

  it('défaut monstre si type vide ou ambigu', () => {
    expect(cardTypeKindFromTypeString('')).toBe('monster');
    expect(cardTypeKindFromTypeString(undefined)).toBe('monster');
  });
});
