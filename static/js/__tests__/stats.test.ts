// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  firstHandProbability,
  getCategoryCardCount,
  getTotalCardCount,
  getHandSize,
  setHandSize,
  hypergeometric,
  hypergeometricProbRowStrings,
  probabilityAtLeast,
  simulateDraw,
  simulateDrawCounts,
} from '../stats.js';
import { htmlCategorySummaryBody, htmlDeckMainGrid } from './helpers/deckTestDom.js';

const DECK_40_THREE_COPIES = [
  { name: 'Target Card', qty: 3, categories: ['engine'], engine: 'Engine A' },
  ...Array.from({ length: 37 }, (_, index) => ({
    name: `Filler ${index + 1}`,
    qty: 1,
    categories: ['filler'],
    engine: '',
  })),
];

const MULTI_CATEGORY_DECK = [
  { name: 'Dual Role', qty: 3, categories: ['starter', 'engine'], engine: 'Engine A' },
  { name: 'Support', qty: 2, categories: ['engine'], engine: 'Engine A' },
  ...Array.from({ length: 35 }, (_, index) => ({
    name: `Other ${index + 1}`,
    qty: 1,
    categories: ['filler'],
    engine: '',
  })),
];

describe('stats.ts - hypergeometricDist adaptee', () => {
  it('P(exactement 1 | 40, 3, 5) ≈ 0.3011', () => {
    expect(hypergeometric(40, 3, 5, 1)).toBeCloseTo(0.3011, 3);
  });

  it('P(exactement 2 | 40, 3, 5) ≈ 0.0354', () => {
    expect(hypergeometric(40, 3, 5, 2)).toBeCloseTo(0.0354, 3);
  });

  it('P(exactement 3 | 40, 3, 5) ≈ 0.0010', () => {
    expect(hypergeometric(40, 3, 5, 3)).toBeCloseTo(0.0010, 3);
  });

  it('P(exactement 1 | 40, 3, 6) ≈ 0.3407', () => {
    expect(hypergeometric(40, 3, 6, 1)).toBeCloseTo(0.3407, 3);
  });

  it('P(exactement 0 | 40, 3, 5) ≈ 0.6624', () => {
    expect(hypergeometric(40, 3, 5, 0)).toBeCloseTo(0.6624, 3);
  });

  it('retourne 0 quand il n y a aucune copie cible', () => {
    expect(hypergeometric(40, 0, 5, 1)).toBe(0);
  });

  it('retourne 1 quand tout le deck est la carte cible', () => {
    expect(hypergeometric(40, 40, 5, 5)).toBeCloseTo(1, 8);
  });

  it('la somme des probabilites exactes vaut 1', () => {
    const N = 40;
    const K = 3;
    const n = 5;

    let total = 0;
    for (let k = 0; k <= Math.min(K, n); k += 1) {
      total += hypergeometric(N, K, n, k);
    }

    expect(total).toBeCloseTo(1, 8);
  });

  it('retourne 0 si k > K', () => {
    expect(hypergeometric(40, 2, 5, 3)).toBe(0);
  });

  it('retourne 0 si k > n', () => {
    expect(hypergeometric(40, 3, 2, 3)).toBe(0);
  });
});

describe('stats.ts - cumulativeHypergeometric adaptee', () => {
  it('P(>=1) est la somme de P(1) + P(2) + P(3)', () => {
    const expected =
      hypergeometric(40, 3, 5, 1) +
      hypergeometric(40, 3, 5, 2) +
      hypergeometric(40, 3, 5, 3);

    expect(probabilityAtLeast(40, 3, 5, 1)).toBeCloseTo(expected, 8);
  });

  it('P(>=1) > P(>=2) pour les memes parametres', () => {
    expect(probabilityAtLeast(40, 3, 5, 1)).toBeGreaterThan(
      probabilityAtLeast(40, 3, 5, 2),
    );
  });

  it('P(>=0) = 1', () => {
    expect(probabilityAtLeast(40, 3, 5, 0)).toBeCloseTo(1, 8);
  });

  it('plus de copies augmente la probabilite', () => {
    expect(probabilityAtLeast(40, 3, 5, 1)).toBeGreaterThan(
      probabilityAtLeast(40, 1, 5, 1),
    );
  });

  it('P(>=1 | 40, 3, 5) ≈ 0.3376', () => {
    expect(probabilityAtLeast(40, 3, 5, 1)).toBeCloseTo(0.3376, 3);
  });
});

describe('stats.ts - hypergeometricProbRowStrings (tableau Analysis)', () => {
  it('6 colonnes P(≥1)…P(≥6) pour 5 tirages', () => {
    const row = hypergeometricProbRowStrings(3, 40, 5);
    expect(row).toHaveLength(6);
    expect(row[0]).toMatch(/%$/);
    expect(row[5]).toBe('—');
  });

  it('totalCards = 0 → tout « — »', () => {
    expect(hypergeometricProbRowStrings(1, 0, 5).every((c) => c === '—')).toBe(true);
  });
});

describe('stats.ts - probabilites de main', () => {
  it('firstHandProbability utilise 5 cartes', () => {
    const result = firstHandProbability(DECK_40_THREE_COPIES, ['engine']);
    expect(result.engine).toBeCloseTo(probabilityAtLeast(40, 3, 5, 1), 6);
  });

  it('second hand est superieure a first hand', async () => {
    const { secondHandProbability } = await import('../stats.js');
    const first = firstHandProbability(DECK_40_THREE_COPIES, ['engine']);
    const second = secondHandProbability(DECK_40_THREE_COPIES, ['engine']);
    expect(second.engine).toBeGreaterThan(first.engine);
  });

  it('retourne 0 pour une categorie absente', () => {
    const result = firstHandProbability(DECK_40_THREE_COPIES, ['absent']);
    expect(result.absent).toBe(0);
  });
});

describe('stats.ts - comptage de categories', () => {
  it('compte correctement le total de cartes', () => {
    expect(getTotalCardCount(DECK_40_THREE_COPIES)).toBe(40);
  });

  it('compte une categorie simple', () => {
    expect(getCategoryCardCount(DECK_40_THREE_COPIES, ['engine'])).toBe(3);
  });

  it('n additionne pas deux fois une carte multi-categorie', () => {
    expect(getCategoryCardCount(MULTI_CATEGORY_DECK, ['starter', 'engine'])).toBe(5);
  });
});

describe('stats.ts - simulation Monte Carlo', () => {
  it('reste dans une tolerance de ±2% sur 10 000 iterations', () => {
    const result = simulateDraw(DECK_40_THREE_COPIES, 5, 10_000);
    const theoretical = probabilityAtLeast(40, 3, 5, 1);

    expect(result.engine).toBeGreaterThan(theoretical - 0.02);
    expect(result.engine).toBeLessThan(theoretical + 0.02);
  });

  it('retourne 0 partout quand iterations = 0', () => {
    const result = simulateDraw(DECK_40_THREE_COPIES, 5, 0);
    expect(result.engine).toBe(0);
    expect(result.filler).toBe(0);
  });

  it('retourne des probabilites bornees entre 0 et 1', () => {
    const result = simulateDraw(DECK_40_THREE_COPIES, 5, 500);

    for (const value of Object.values(result)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe('stats.ts - simulateDrawCounts (histogramme)', () => {
  it('retourne un histogramme dont la somme vaut iterations', () => {
    const hist = simulateDrawCounts(DECK_40_THREE_COPIES, 'engine', 5, 1000);
    const sum = Object.values(hist).reduce((a, b) => a + b, 0);
    expect(sum).toBe(1000);
  });

  it('retourne des clés 0 à drawCount', () => {
    const hist = simulateDrawCounts(DECK_40_THREE_COPIES, 'engine', 5, 100);
    const keys = Object.keys(hist).map(Number).sort((a, b) => a - b);
    expect(keys).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('retourne objet vide si iterations = 0', () => {
    const hist = simulateDrawCounts(DECK_40_THREE_COPIES, 'engine', 5, 0);
    expect(Object.keys(hist)).toHaveLength(0);
  });
});

describe('stats.ts - hand size', () => {
  it('getHandSize retourne 5 par défaut', () => {
    expect(getHandSize()).toBe(5);
  });

  it('setHandSize puis getHandSize reflète la taille', () => {
    document.body.innerHTML =
      htmlDeckMainGrid() +
      htmlCategorySummaryBody() +
      '<div id="draw-simulation-list"></div>' +
      '<span id="draw-simulation-count"></span><span id="draw-simulation-max"></span>' +
      '<button id="btn-draw-one"></button>';
    setHandSize(6);
    expect(getHandSize()).toBe(6);
    setHandSize(5);
    expect(getHandSize()).toBe(5);
  });
});