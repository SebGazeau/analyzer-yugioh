import { describe, expect, it } from 'vitest';
import { cardDescLooksLikeGySendTrigger } from '../../services/insights/fidraulisGyHeuristic.js';

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
