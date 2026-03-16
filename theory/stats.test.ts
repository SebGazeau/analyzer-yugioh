/**
 * stats.test.ts — Anti-regression tests for probability math.
 *
 * Phase 1 — write these BEFORE any UI changes.
 * These tests protect the core value of the app.
 *
 * Run with: npx vitest run stats.test.ts
 *
 * NOTE: If your stats.ts currently mixes DOM manipulation with math,
 * extract the pure functions first (Phase 2), then these tests will work.
 * Target interface to extract:
 *
 *   export function hypergeometric(N, K, n, k): number
 *   export function probabilityAtLeast(N, K, n, minK): number
 *   export function firstHandProbability(deck, categories): Record<string, number>
 *   export function secondHandProbability(deck, categories): Record<string, number>
 *   export function simulateDraw(deck, drawCount, iterations): Record<string, number>
 */

import { describe, it, expect } from 'vitest';

// ── Adjust this import path to match your actual extracted module ─────────────
import {
  hypergeometric,
  probabilityAtLeast,
  firstHandProbability,
  secondHandProbability,
  simulateDraw,
} from '../stats';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DECK_40_THREE_COPIES = {
  main: Array.from({ length: 13 }, (_, i) => ({
    id: i + 1,
    name: `Filler ${i}`,
    type: 'Monster',
    copies: 1,
    zone: 'main' as const,
    categories: ['filler'],
  })).concat([
    { id: 100, name: 'Target Card', type: 'Spell', copies: 3, zone: 'main', categories: ['engine'] },
    // 24 more fillers to reach 40 total
    ...Array.from({ length: 24 }, (_, i) => ({
      id: i + 200, name: `Filler B${i}`, type: 'Trap', copies: 1, zone: 'main' as const, categories: ['filler'],
    })),
  ]),
  extra: [],
  side: [],
};

// ── hypergeometric(N, K, n, k) ────────────────────────────────────────────────
// P(drawing exactly k copies of a card | N total, K successes, n drawn)

describe('hypergeometric — exact probabilities', () => {
  it('P(exactly 1 | 40 total, 3 copies, 5 drawn) ≈ 0.3370', () => {
    const p = hypergeometric(40, 3, 5, 1);
    expect(p).toBeCloseTo(0.3370, 3);
  });

  it('P(exactly 2 | 40 total, 3 copies, 5 drawn) ≈ 0.0400', () => {
    const p = hypergeometric(40, 3, 5, 2);
    expect(p).toBeCloseTo(0.0400, 3);
  });

  it('P(exactly 3 | 40 total, 3 copies, 5 drawn) ≈ 0.0010', () => {
    const p = hypergeometric(40, 3, 5, 3);
    expect(p).toBeCloseTo(0.0010, 3);
  });

  it('P(exactly 1 | 40 total, 3 copies, 6 drawn) ≈ 0.3882 (second player)', () => {
    const p = hypergeometric(40, 3, 6, 1);
    expect(p).toBeCloseTo(0.3882, 3);
  });

  it('P(exactly 0 | 40 total, 3 copies, 5 drawn) ≈ 0.6220', () => {
    const p = hypergeometric(40, 3, 5, 0);
    expect(p).toBeCloseTo(0.6220, 3);
  });

  // Edge cases
  it('returns 0 when target copies = 0', () => {
    expect(hypergeometric(40, 0, 5, 1)).toBe(0);
  });

  it('returns 1 when entire deck is the card', () => {
    // 40 copies of one card, draw 5, want exactly 5 → P = 1
    const p = hypergeometric(40, 40, 5, 5);
    expect(p).toBeCloseTo(1.0, 5);
  });

  it('all exact probabilities sum to 1.0 for given N, K, n', () => {
    const N = 40, K = 3, n = 5;
    let total = 0;
    for (let k = 0; k <= Math.min(K, n); k++) {
      total += hypergeometric(N, K, n, k);
    }
    expect(total).toBeCloseTo(1.0, 8);
  });

  it('handles k > K gracefully (returns 0)', () => {
    expect(hypergeometric(40, 2, 5, 3)).toBe(0);
  });

  it('handles k > n gracefully (returns 0)', () => {
    expect(hypergeometric(40, 3, 2, 3)).toBe(0);
  });
});

// ── probabilityAtLeast ────────────────────────────────────────────────────────
// P(drawing AT LEAST k copies)

describe('probabilityAtLeast', () => {
  it('P(≥1 | 40, 3, 5) = sum of P(1) + P(2) + P(3)', () => {
    const p1 = hypergeometric(40, 3, 5, 1);
    const p2 = hypergeometric(40, 3, 5, 2);
    const p3 = hypergeometric(40, 3, 5, 3);
    const expected = p1 + p2 + p3;
    expect(probabilityAtLeast(40, 3, 5, 1)).toBeCloseTo(expected, 8);
  });

  it('P(≥1) > P(≥2) for same inputs', () => {
    expect(probabilityAtLeast(40, 3, 5, 1)).toBeGreaterThan(
      probabilityAtLeast(40, 3, 5, 2),
    );
  });

  it('P(≥0) = 1.0', () => {
    expect(probabilityAtLeast(40, 3, 5, 0)).toBeCloseTo(1.0, 8);
  });

  it('more copies → higher probability for same draw count', () => {
    const p1 = probabilityAtLeast(40, 1, 5, 1);
    const p3 = probabilityAtLeast(40, 3, 5, 1);
    expect(p3).toBeGreaterThan(p1);
  });
});

// ── firstHandProbability vs secondHandProbability ─────────────────────────────

describe('first vs second hand probabilities', () => {
  it('second hand probability is higher (6 cards > 5 cards)', () => {
    const first = firstHandProbability(DECK_40_THREE_COPIES, ['engine']);
    const second = secondHandProbability(DECK_40_THREE_COPIES, ['engine']);
    expect(second.engine).toBeGreaterThan(first.engine);
  });

  it('first hand uses 5-card draw', () => {
    // P(≥1 engine | 40, 3 copies, 5 drawn)
    const result = firstHandProbability(DECK_40_THREE_COPIES, ['engine']);
    const expected = probabilityAtLeast(40, 3, 5, 1);
    expect(result.engine).toBeCloseTo(expected, 4);
  });

  it('second hand uses 6-card draw', () => {
    const result = secondHandProbability(DECK_40_THREE_COPIES, ['engine']);
    const expected = probabilityAtLeast(40, 3, 6, 1);
    expect(result.engine).toBeCloseTo(expected, 4);
  });

  it('returns 0% probability for empty category', () => {
    const result = firstHandProbability(DECK_40_THREE_COPIES, ['nonexistent']);
    expect(result.nonexistent).toBe(0);
  });
});

// ── simulateDraw ──────────────────────────────────────────────────────────────
// Statistical check — result must be within ±2% of theoretical over 10,000 runs

describe('simulateDraw — Monte Carlo validation', () => {
  it('simulated probability within ±2% of hypergeometric (10,000 iterations)', () => {
    const iterations = 10_000;
    const result = simulateDraw(DECK_40_THREE_COPIES, 5, iterations);
    const theoretical = probabilityAtLeast(40, 3, 5, 1);

    // result.engine should be close to theoretical
    expect(result.engine).toBeGreaterThan(theoretical - 0.02);
    expect(result.engine).toBeLessThan(theoretical + 0.02);
  });

  it('simulation never returns values outside [0, 1]', () => {
    const result = simulateDraw(DECK_40_THREE_COPIES, 5, 1000);
    for (const [, value] of Object.entries(result)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('simulation with 0 iterations returns 0', () => {
    const result = simulateDraw(DECK_40_THREE_COPIES, 5, 0);
    for (const [, value] of Object.entries(result)) {
      expect(value).toBe(0);
    }
  });
});
