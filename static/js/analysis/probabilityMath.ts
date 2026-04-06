/**
 * Probabilités hypergéométriques et simulations de tirage (sans DOM).
 */

import { TEXT_EM_DASH, TEXT_PERCENT_SIGN } from '../utils/textPlaceholders.js';

export interface ProbabilityCardEntry {
    name: string;
    qty: number;
    engine?: string;
    categories: string[];
}

export function hypergeometricDist(k: number, n: number, K: number, N: number): number {
    if (N === 0 || n > N) return 0;
    if (k < 0 || n < 0 || K < 0 || N < 0) return 0;
    if (K > N || k > K || k > n || n - k > N - K) return 0;
    const comb = (n: number, k: number): number => {
        if (k < 0 || k > n) return 0;
        if (k === 0 || k === n) return 1;
        k = Math.min(k, n - k);
        let result = 1;
        for (let i = 1; i <= k; i++) {
            result *= n - (k - i);
            result /= i;
        }
        return result;
    };
    const denom = comb(N, n);
    if (denom === 0) return 0;
    return (comb(K, k) * comb(N - K, n - k)) / denom;
}

export function hypergeometric(N: number, K: number, n: number, k: number): number {
    return hypergeometricDist(k, n, K, N);
}

export function cumulativeHypergeometric(maxSuccesses: number, draws: number, K: number, N: number): number {
    let sum = 0;
    for (let k = 0; k <= maxSuccesses; k++) {
        sum += hypergeometricDist(k, draws, K, N);
    }
    return sum;
}

/**
 * Probas P(≥1) … P(≥6) formatées pour le tableau Analysis (6 colonnes ; « — » si tirage impossible).
 */
export function hypergeometricProbRowStrings(K: number, totalCards: number, numDraws: number): string[] {
    const probs: string[] = [];
    for (let x = 1; x <= 6; x++) {
        if (x > numDraws || totalCards === 0) {
            probs.push(TEXT_EM_DASH);
            continue;
        }
        const p = 1 - cumulativeHypergeometric(x - 1, numDraws, K, totalCards);
        probs.push(Number.isFinite(p) ? (p * 100).toFixed(2) + TEXT_PERCENT_SIGN : TEXT_EM_DASH);
    }
    return probs;
}

export function probabilityAtLeast(N: number, K: number, n: number, minK: number): number {
    if (minK <= 0) return 1;
    return 1 - cumulativeHypergeometric(minK - 1, n, K, N);
}

export function getTotalCardCount(cards: ProbabilityCardEntry[]): number {
    return cards.reduce((sum, card) => sum + Math.max(0, card.qty), 0);
}

export function getCategoryCardCount(cards: ProbabilityCardEntry[], categoryNames: string[]): number {
    const targetCategories = new Set(categoryNames);
    const uniqueCards = new Map<string, number>();

    for (const card of cards) {
        if (card.qty <= 0) continue;
        if (!card.categories.some((category) => targetCategories.has(category))) continue;
        uniqueCards.set(card.name, (uniqueCards.get(card.name) || 0) + card.qty);
    }

    return Array.from(uniqueCards.values()).reduce((sum, qty) => sum + qty, 0);
}

function computeHandProbability(
    cards: ProbabilityCardEntry[],
    categoryNames: string[],
    drawCount: number,
): Record<string, number> {
    const totalCards = getTotalCardCount(cards);
    const result: Record<string, number> = {};

    for (const categoryName of categoryNames) {
        const categoryCount = getCategoryCardCount(cards, [categoryName]);
        result[categoryName] = totalCards === 0 ? 0 : probabilityAtLeast(totalCards, categoryCount, drawCount, 1);
    }

    return result;
}

export function firstHandProbability(
    cards: ProbabilityCardEntry[],
    categoryNames: string[],
): Record<string, number> {
    return computeHandProbability(cards, categoryNames, 5);
}

export function secondHandProbability(
    cards: ProbabilityCardEntry[],
    categoryNames: string[],
): Record<string, number> {
    return computeHandProbability(cards, categoryNames, 6);
}

function buildSimulationDeck(cards: ProbabilityCardEntry[]): ProbabilityCardEntry[] {
    const deck: ProbabilityCardEntry[] = [];

    for (const card of cards) {
        for (let i = 0; i < Math.max(0, card.qty); i++) {
            deck.push({ ...card, qty: 1 });
        }
    }

    return deck;
}

export function getAllCategories(cards: ProbabilityCardEntry[]): string[] {
    return Array.from(new Set(cards.flatMap((card) => card.categories)));
}

export function simulateDraw(
    cards: ProbabilityCardEntry[],
    drawCount: number,
    iterations: number,
    random: () => number = Math.random,
): Record<string, number> {
    const categories = getAllCategories(cards);
    const hits = Object.fromEntries(categories.map((category) => [category, 0])) as Record<string, number>;

    if (iterations <= 0 || drawCount <= 0 || cards.length === 0) {
        return hits;
    }

    const baseDeck = buildSimulationDeck(cards);
    if (baseDeck.length === 0) return hits;

    for (let iteration = 0; iteration < iterations; iteration++) {
        const remainingDeck = [...baseDeck];
        const seenCategories = new Set<string>();
        const draws = Math.min(drawCount, remainingDeck.length);

        for (let drawIndex = 0; drawIndex < draws; drawIndex++) {
            const index = Math.floor(random() * remainingDeck.length);
            const [drawnCard] = remainingDeck.splice(index, 1);
            drawnCard.categories.forEach((category) => seenCategories.add(category));
        }

        for (const category of seenCategories) {
            hits[category] += 1;
        }
    }

    for (const category of categories) {
        hits[category] /= iterations;
    }

    return hits;
}

/**
 * Simule N tirages d'une main de drawCount cartes et retourne l'histogramme du nombre
 * de cartes de la catégorie donnée dans chaque main. Retourne { 0: n0, 1: n1, ... }.
 */
export function simulateDrawCounts(
    cards: ProbabilityCardEntry[],
    categoryName: string,
    drawCount: number,
    iterations: number,
    random: () => number = Math.random,
): Record<number, number> {
    const hist: Record<number, number> = {};
    if (iterations <= 0 || drawCount <= 0 || cards.length === 0) return hist;

    const baseDeck = buildSimulationDeck(cards);
    if (baseDeck.length === 0) return hist;

    for (let i = 0; i <= drawCount; i++) hist[i] = 0;

    for (let it = 0; it < iterations; it++) {
        const deck = [...baseDeck];
        let count = 0;
        const draws = Math.min(drawCount, deck.length);
        for (let d = 0; d < draws; d++) {
            const idx = Math.floor(random() * deck.length);
            const [card] = deck.splice(idx, 1);
            if (card.categories.includes(categoryName)) count++;
        }
        hist[count] = (hist[count] ?? 0) + 1;
    }
    return hist;
}
