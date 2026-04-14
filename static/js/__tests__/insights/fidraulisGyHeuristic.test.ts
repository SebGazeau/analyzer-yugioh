import { describe, expect, it } from 'vitest';
import {
    cardDescLooksLikeGySendTrigger,
    cardDescLooksLikeGyWhileOnFieldOrInGy,
} from '../../services/insights/fidraulisGyHeuristic.js';

describe('cardDescLooksLikeGySendTrigger', () => {
    it('retourne false pour chaîne vide ou trop courte', () => {
        expect(cardDescLooksLikeGySendTrigger('')).toBe(false);
        expect(cardDescLooksLikeGySendTrigger('   ')).toBe(false);
        expect(cardDescLooksLikeGySendTrigger('short')).toBe(false);
    });

    it('détecte une formulation EN PSCT typique', () => {
        expect(
            cardDescLooksLikeGySendTrigger(
                'If this card is sent to the GY: You can draw 1 card. You can only use this effect once per turn.',
            ),
        ).toBe(true);
    });

    it('détecte une formulation FR avec si + cimetière', () => {
        expect(
            cardDescLooksLikeGySendTrigger(
                'Si cette carte est envoyée au Cimetière : vous pouvez piocher 1 carte. (Effet d’1 fois par tour.)',
            ),
        ).toBe(true);
    });

    it('retourne false pour un texte sans lien envoi / CY', () => {
        expect(
            cardDescLooksLikeGySendTrigger(
                'When this card is Normal Summoned: You can add 1 Spell from your Deck to your hand.',
            ),
        ).toBe(false);
    });
});

describe('cardDescLooksLikeGyWhileOnFieldOrInGy', () => {
    it('retourne false pour texte court ou sans motif Terrain+CY', () => {
        expect(cardDescLooksLikeGyWhileOnFieldOrInGy('')).toBe(false);
        expect(cardDescLooksLikeGyWhileOnFieldOrInGy('tant que cette carte')).toBe(false);
        expect(
            cardDescLooksLikeGyWhileOnFieldOrInGy(
                'When this card is Normal Summoned: You can add 1 card from your Deck to your hand.',
            ),
        ).toBe(false);
    });

    it('détecte la formulation EN « while … field or … GY »', () => {
        expect(
            cardDescLooksLikeGyWhileOnFieldOrInGy(
                'While this card is on the field or in the GY: You can target 1 WIND monster in your GY; add it to your hand. You can only use this effect once per turn.',
            ),
        ).toBe(true);
    });

    it('détecte la formulation FR officielle', () => {
        expect(
            cardDescLooksLikeGyWhileOnFieldOrInGy(
                'Tant que cette carte est sur le Terrain ou dans le Cimetière : vous pouvez cibler 1 monstre VENT dans votre Cimetière ; ajoutez-le à votre main.',
            ),
        ).toBe(true);
    });

    it('détecte la variante FR « au terrain ou au cimetière »', () => {
        expect(
            cardDescLooksLikeGyWhileOnFieldOrInGy(
                'Tant que cette carte est au Terrain ou au Cimetière : vous pouvez piocher 1 carte.',
            ),
        ).toBe(true);
    });

    it('détecte FR « sur le terrain ou au cimetière » (préposition mixte)', () => {
        expect(
            cardDescLooksLikeGyWhileOnFieldOrInGy(
                'Si une autre carte est détruite tant que cette carte est sur le Terrain ou au Cimetière : piochez 1.',
            ),
        ).toBe(true);
    });

    it('détecte FR avec cimetiere ASCII (sans accent en base)', () => {
        expect(
            cardDescLooksLikeGyWhileOnFieldOrInGy(
                'Si min. une autre carte est detruite tant que cette carte est sur le terrain ou dans le cimetiere : effet.',
            ),
        ).toBe(true);
    });
});
