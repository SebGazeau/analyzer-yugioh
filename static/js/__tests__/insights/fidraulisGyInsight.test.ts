import { afterEach, describe, expect, it, vi } from 'vitest';
import * as gyAllow from '../../insights/fidraulisGyAllowlist.js';
import { collectDeckInsights } from '../../insights/collect.js';
import {
    computeFidraulisGyResourcesInsight,
    normalizedNameIndicatesFidraulisHarmonia,
} from '../../insights/fidraulisGy.js';
import type { InsightDeckRow, InsightDeckSnapshot } from '../../insights/types.js';

function row(p: Partial<InsightDeckRow> & Pick<InsightDeckRow, 'name' | 'type'>): InsightDeckRow {
    return { quantity: 1, ...p };
}

describe('normalizedNameIndicatesFidraulisHarmonia', () => {
    it('accepte Harmonie (FR) sans sous-chaîne Harmonia (EN)', () => {
        const n = "Fidraulis, le Dragon de l'Harmonie"
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
        expect(normalizedNameIndicatesFidraulisHarmonia(n)).toBe(true);
    });
});

describe('computeFidraulisGyResourcesInsight', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('retourne null sans Fidraulis dans Main ou Side', () => {
        const deck: InsightDeckSnapshot = {
            main: [row({ name: 'Dark Magician', type: 'Normal Monster' })],
            extra: [
                row({
                    name: 'Enigmaster Packbit',
                    type: 'Synchro Monster',
                    cardId: 72444406,
                }),
            ],
        };
        expect(computeFidraulisGyResourcesInsight(deck)).toBeNull();
    });

    it('retourne null avec Fidraulis mais aucun Synchro Extra candidat', () => {
        const deck: InsightDeckSnapshot = {
            main: [row({ name: 'Fidraulis Harmonia', type: 'Tuner Monster' })],
            extra: [row({ name: 'Number 39: Utopia', type: 'Xyz Monster', level: 4 })],
        };
        expect(computeFidraulisGyResourcesInsight(deck)).toBeNull();
    });

    it('détecte Fidraulis avec type carte FR (Monstre…) sans sous-chaîne « monster »', () => {
        const deck: InsightDeckSnapshot = {
            main: [
                row({
                    name: "Fidraulis, le Dragon de l'Harmonie",
                    type: 'Monstre Syntoniseur / Effet',
                }),
            ],
            extra: [
                row({
                    name: 'Enigmaster Packbit',
                    type: 'Synchro Monster',
                    cardId: 72444406,
                }),
            ],
        };
        expect(computeFidraulisGyResourcesInsight(deck)).not.toBeNull();
    });

    it('détecte le titre français officiel (Harmonie)', () => {
        const deck: InsightDeckSnapshot = {
            main: [
                row({
                    name: "Fidraulis, le Dragon de l'Harmonie",
                    type: 'Tuner Monster',
                }),
            ],
            extra: [
                row({
                    name: 'Enigmaster Packbit',
                    type: 'Synchro Monster',
                    cardId: 72444406,
                }),
            ],
        };
        expect(computeFidraulisGyResourcesInsight(deck)).not.toBeNull();
    });

    it('détecte Fidraulis avec le titre TCG complet (virgules)', () => {
        const deck: InsightDeckSnapshot = {
            main: [
                row({
                    name: 'Fidraulis, the Dragon of Harmonia',
                    type: 'Tuner Monster',
                }),
            ],
            extra: [
                row({
                    name: 'Enigmaster Packbit',
                    type: 'Synchro Monster',
                    cardId: 72444406,
                }),
            ],
        };
        expect(computeFidraulisGyResourcesInsight(deck)).not.toBeNull();
    });

    it('détecte Fidraulis par passcode même si le nom diffère', () => {
        const deck: InsightDeckSnapshot = {
            main: [
                row({
                    name: 'Fidraulis (nom affichage custom)',
                    type: 'Tuner Monster',
                    cardId: 70088809,
                }),
            ],
            extra: [
                row({
                    name: 'Enigmaster Packbit',
                    type: 'Synchro Monster',
                    cardId: 72444406,
                }),
            ],
        };
        expect(computeFidraulisGyResourcesInsight(deck)).not.toBeNull();
    });

    it('liste un Synchro allowlisté comme vérifié', () => {
        const deck: InsightDeckSnapshot = {
            main: [row({ name: 'Fidraulis Harmonia', type: 'Tuner Monster' })],
            extra: [
                row({
                    name: 'Enigmaster Packbit',
                    type: 'Synchro Monster',
                    cardId: 72444406,
                }),
            ],
        };
        const i = computeFidraulisGyResourcesInsight(deck);
        expect(i).not.toBeNull();
        expect(i!.kind).toBe('fidraulis_gy_synchro');
        const rows = i!.details?.fidraulisGy?.rows;
        expect(rows).toHaveLength(1);
        expect(rows![0].trust).toBe('verified');
        expect(rows![0].name).toBe('Enigmaster Packbit');
        expect(rows![0].resourceTaxon).toBe('effect_on_sent_to_gy');
        expect(rows![0].resourceContextLabel).toBe('Déclenché si envoyé au Cimetière');
        expect(rows![0].resourceContextTitle).toContain('Effet déclenché');
    });

    it('accepte un passcode allowlisté même si type API est « Monster » sans « Synchro »', () => {
        const deck: InsightDeckSnapshot = {
            main: [row({ name: 'Fidraulis Harmonia', type: 'Tuner Monster' })],
            extra: [
                row({
                    name: 'Golden Cloud Beast - Malong',
                    type: 'Monster',
                    cardId: 93125329,
                }),
            ],
        };
        const i = computeFidraulisGyResourcesInsight(deck);
        expect(i).not.toBeNull();
        expect(i!.details?.fidraulisGy?.rows).toHaveLength(1);
        expect(i!.details?.fidraulisGy?.rows?.[0].trust).toBe('verified');
    });

    it('priorise vérifié sur heuristique pour le même passcode', () => {
        const deck: InsightDeckSnapshot = {
            main: [row({ name: 'Fidraulis Harmonia', type: 'Tuner Monster' })],
            extra: [
                row({
                    name: 'Enigmaster Packbit',
                    type: 'Synchro Monster',
                    cardId: 72444406,
                    cardDesc:
                        'If this card is sent to the GY: You can draw 1 card. You can only use this effect once per turn.',
                }),
            ],
        };
        const i = computeFidraulisGyResourcesInsight(deck);
        expect(i!.details?.fidraulisGy?.rows?.[0].trust).toBe('verified');
    });

    it('accepte Fidraulis en Side', () => {
        const deck: InsightDeckSnapshot = {
            main: [],
            extra: [
                row({
                    name: 'Golden Cloud Beast - Malong',
                    type: 'Synchro Tuner Monster',
                    cardId: 93125329,
                }),
            ],
            side: [row({ name: 'Fidraulis Harmonia', type: 'Tuner Monster' })],
        };
        const i = computeFidraulisGyResourcesInsight(deck);
        expect(i).not.toBeNull();
    });

    it('détecte une variante de nom (fridaulis)', () => {
        const deck: InsightDeckSnapshot = {
            main: [row({ name: 'Fridaulis Harmonia', type: 'Tuner Monster' })],
            extra: [
                row({
                    name: 'Despian Luluwalilith',
                    type: 'Synchro Monster',
                    cardId: 53971455,
                }),
            ],
        };
        expect(computeFidraulisGyResourcesInsight(deck)).not.toBeNull();
    });

    it('heuristique seule sans allowlist', () => {
        const deck: InsightDeckSnapshot = {
            main: [row({ name: 'Fidraulis Harmonia', type: 'Tuner Monster' })],
            extra: [
                row({
                    name: 'Some Synchro',
                    type: 'Synchro Monster',
                    cardId: 99900101,
                    cardDesc:
                        'If this card is sent to the Graveyard: You can Special Summon 1 monster. You can only use this effect once per turn.',
                }),
            ],
        };
        const i = computeFidraulisGyResourcesInsight(deck);
        expect(i!.details?.fidraulisGy?.rows?.[0].trust).toBe('heuristic');
        expect(i!.details?.fidraulisGy?.rows?.[0].resourceTaxon).toBe('effect_on_sent_to_gy');
    });

    it('vérifié hors entrée allowlist statique : taxon déduit du texte (même famille que l’heuristique)', () => {
        vi.spyOn(gyAllow, 'passcodeIsFidraulisGyVerified').mockImplementation((id: number) => id === 888999999);

        const deck: InsightDeckSnapshot = {
            main: [row({ name: 'Fidraulis Harmonia', type: 'Tuner Monster' })],
            extra: [
                row({
                    name: 'Proxy effet GY in-place',
                    type: 'Synchro Monster',
                    cardId: 888999999,
                    cardDesc:
                        'If this card is in your GY: You can target 1 other card in the GY; shuffle both it and this card into the Deck. You can only use this effect once per turn.',
                }),
            ],
        };
        const i = computeFidraulisGyResourcesInsight(deck);
        expect(i).not.toBeNull();
        const r = i!.details?.fidraulisGy?.rows?.[0];
        expect(r?.trust).toBe('verified');
        expect(r?.resourceTaxon).toBe('effect_if_in_gy');
        expect(r?.resourceContextLabel).toContain('cimetière');
    });

    it('heuristique Synchro avec type « Monster » + frame_type synchro (réponse API sans ligne type)', () => {
        const deck: InsightDeckSnapshot = {
            main: [row({ name: 'Fidraulis Harmonia', type: 'Tuner Monster' })],
            extra: [
                row({
                    name: 'PSY-Framelord Zeta',
                    type: 'Monster',
                    frame_type: 'synchro',
                    cardId: 37192109,
                    cardDesc:
                        'If this card is in your Graveyard: You can target 1 other "PSY-Frame" card in your Graveyard; return this card to the Extra Deck.',
                }),
            ],
        };
        const i = computeFidraulisGyResourcesInsight(deck);
        expect(i).not.toBeNull();
        const z = i!.details?.fidraulisGy?.rows?.find((r) => r.cardId === 37192109);
        expect(z?.trust).toBe('heuristic');
        expect(z?.resourceTaxon).toBe('effect_if_in_gy');
    });

    it('n’inclut pas un Extra « Monster » + frame xyz malgré un texte envoyé au GY', () => {
        const deck: InsightDeckSnapshot = {
            main: [row({ name: 'Fidraulis Harmonia', type: 'Tuner Monster' })],
            extra: [
                row({
                    name: 'Some Xyz',
                    type: 'Monster',
                    frame_type: 'xyz',
                    cardId: 99900109,
                    cardDesc: 'If this card is sent to the GY: draw 1.',
                }),
            ],
        };
        expect(computeFidraulisGyResourcesInsight(deck)).toBeNull();
    });

    it('heuristique effet « while on the field or in the GY » sans trigger envoi (style Pegasus)', () => {
        const deck: InsightDeckSnapshot = {
            main: [row({ name: 'Fidraulis Harmonia', type: 'Tuner Monster' })],
            extra: [
                row({
                    name: 'Test Synchro While Field Gy',
                    type: 'Synchro Monster',
                    cardId: 99900102,
                    cardDesc:
                        'While this card is on the field or in the GY: You can target 1 Spell/Trap your opponent controls; destroy it. You can only use this effect once per turn.',
                }),
            ],
        };
        const i = computeFidraulisGyResourcesInsight(deck);
        expect(i).not.toBeNull();
        expect(i!.details?.fidraulisGy?.rows).toHaveLength(1);
        expect(i!.details?.fidraulisGy?.rows?.[0].trust).toBe('heuristic');
        expect(i!.details?.fidraulisGy?.rows?.[0].name).toBe('Test Synchro While Field Gy');
        expect(i!.details?.fidraulisGy?.rows?.[0].resourceTaxon).toBe('field_or_gy_continuous');
    });

    it('Wind Pegasus @Ignister : vérifié par passcode même sans cardDesc', () => {
        const deck: InsightDeckSnapshot = {
            main: [row({ name: 'Fidraulis Harmonia', type: 'Tuner Monster' })],
            extra: [
                row({
                    name: 'Wind Pegasus @Ignister',
                    type: 'Synchro Monster',
                    cardId: 98506199,
                }),
            ],
        };
        const i = computeFidraulisGyResourcesInsight(deck);
        expect(i).not.toBeNull();
        const rows = i!.details?.fidraulisGy?.rows ?? [];
        const pegasus = rows.find((r) => r.cardId === 98506199);
        expect(pegasus?.trust).toBe('verified');
        expect(pegasus?.resourceTaxon).toBe('field_or_gy_continuous');
        expect(pegasus?.resourceContextLabel).toBe('Actif sur le Terrain ou au Cimetière');
        expect(pegasus?.note).toContain('Wind Pegasus');
    });

    it('collectDeckInsights inclut Fidraulis après Seventh Tachyon quand les deux s’appliquent', () => {
        const deck: InsightDeckSnapshot = {
            main: [
                row({ name: 'Seventh Tachyon', type: 'Normal Spell Card' }),
                row({ name: 'Fidraulis Harmonia', type: 'Tuner Monster' }),
            ],
            extra: [
                row({ name: 'Number 101: Silent Honor ARK', type: 'Xyz Monster', level: 4 }),
                row({
                    name: 'Enigmaster Packbit',
                    type: 'Synchro Monster',
                    cardId: 72444406,
                }),
            ],
        };
        const all = collectDeckInsights(deck);
        expect(all.map((x) => x.kind)).toEqual(['seventh_tachyon', 'fidraulis_gy_synchro']);
    });
});
