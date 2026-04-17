import { describe, expect, it } from 'vitest';
import {
    cardDescLooksLikeGyIfInGyActivated,
    cardDescLooksLikeGySendTrigger,
    cardDescLooksLikeGyWhileOnFieldOrInGy,
    inferFidraulisGyResourceTaxon,
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

describe('cardDescLooksLikeGyIfInGyActivated', () => {
    it('retourne false pour texte court ou sans motif « dans le CY »', () => {
        expect(cardDescLooksLikeGyIfInGyActivated('')).toBe(false);
        expect(cardDescLooksLikeGyIfInGyActivated('if this card')).toBe(false);
        expect(
            cardDescLooksLikeGyIfInGyActivated(
                'When this card is Normal Summoned: You can add 1 Spell from your Deck to your hand.',
            ),
        ).toBe(false);
    });

    it('détecte la formulation EN PSY-Framelord Omega (effet 2)', () => {
        expect(
            cardDescLooksLikeGyIfInGyActivated(
                'If this card is in your GY: You can target 1 other card in the GY; shuffle both it and this card into the Deck. You can only use this effect of "PSY-Framelord Omega" once per turn.',
            ),
        ).toBe(true);
    });

    it('détecte le texte brut YGOProDeck (\\r\\n + formulation officielle shuffle)', () => {
        const raw =
            "1 Tuner + 1+ non-Tuner monsters\r\nOnce per turn, during the Main Phase (Quick Effect): You can banish both this face-up card from the field and 1 random card from your opponent's hand, face-up, until your next Standby Phase. Once per turn, during your opponent's Standby Phase: You can target 1 banished card; return it to the GY. If this card is in your GY: You can target 1 other card in the GY; shuffle both that card and this card from the GY into the Deck.";
        expect(cardDescLooksLikeGyIfInGyActivated(raw)).toBe(true);
    });

    it('détecte avec espaces insécables Unicode (NBSP) autour des mots-clés', () => {
        expect(cardDescLooksLikeGyIfInGyActivated('If\u00a0this\u00a0card\u00a0is\u00a0in\u00a0your\u00a0GY: draw 1.')).toBe(
            true,
        );
    });

    it('détecte la variante EN « synchro monster » + graveyard', () => {
        expect(
            cardDescLooksLikeGyIfInGyActivated(
                'If this Synchro Monster is in your Graveyard: You can pay 1000 LP; Special Summon this card.',
            ),
        ).toBe(true);
    });

    it('détecte la formulation FR (accents)', () => {
        expect(
            cardDescLooksLikeGyIfInGyActivated(
                'Si cette carte est dans votre Cimetière : vous pouvez cibler 1 autre carte dans le Cimetière ; mélangez les deux cartes dans le Deck.',
            ),
        ).toBe(true);
    });

    it('ne confond pas « dans votre main »', () => {
        expect(
            cardDescLooksLikeGyIfInGyActivated(
                'If this card is in your hand: You can reveal it; your opponent cannot activate Spell Cards this turn.',
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

describe('inferFidraulisGyResourceTaxon', () => {
    it('priorise envoi CY sur « while field or GY » si les deux motifs', () => {
        const d =
            'If this card is sent to the GY: draw 1. While this card is on the field or in the GY: destroy 1 card.';
        expect(inferFidraulisGyResourceTaxon(d)).toBe('effect_on_sent_to_gy');
    });

    it('retourne field_or_gy_continuous sans trigger envoi', () => {
        expect(
            inferFidraulisGyResourceTaxon(
                'While this card is on the field or in the GY: You can target 1 Spell; destroy it.',
            ),
        ).toBe('field_or_gy_continuous');
    });

    it('retourne discard_cost pour défausse + main', () => {
        expect(
            inferFidraulisGyResourceTaxon(
                'You can discard 1 card from your hand; Special Summon this card from your hand.',
            ),
        ).toBe('discard_cost');
    });

    it('retourne effect_if_in_gy pour effet « If this card is in your GY » (Omega)', () => {
        expect(
            inferFidraulisGyResourceTaxon(
                'If this card is in your GY: You can target 1 other card in the GY; shuffle both it and this card into the Deck.',
            ),
        ).toBe('effect_if_in_gy');
    });

    it('priorise envoi CY sur « if in GY » si les deux formulations', () => {
        const d =
            'If this card is sent to the GY: draw 1. If this card is in your GY: You can shuffle this card into the Deck.';
        expect(inferFidraulisGyResourceTaxon(d)).toBe('effect_on_sent_to_gy');
    });

    it('retourne heuristic_uncertain sans motif', () => {
        expect(inferFidraulisGyResourceTaxon('When this card is Normal Summoned: add 1 Spell from your Deck.')).toBe(
            'heuristic_uncertain',
        );
    });
});
