import { describe, it, expect } from 'vitest';
import { collectDeckInsights } from '../../insights/collect.js';
import {
    buildSuggestedNumberXyz,
    computeSeventhTachyonInsight,
    extractNumberIndexFromName,
    NUMBER_10X_CATALOG,
} from '../../insights/seventhTachyon.js';
import type { InsightDeckRow, InsightDeckSnapshot } from '../../insights/types.js';

function row(p: Partial<InsightDeckRow> & Pick<InsightDeckRow, 'name' | 'type'>): InsightDeckRow {
    return { quantity: 1, ...p };
}

describe('extractNumberIndexFromName', () => {
    it('extrait 101–107 depuis le nom (Number et Number C)', () => {
        expect(extractNumberIndexFromName('Number 101: Silent Honor ARK')).toBe(101);
        expect(extractNumberIndexFromName('Number C101: Silent Honor DARK')).toBe(101);
        expect(extractNumberIndexFromName('Number 107: Galaxy-Eyes Tachyon Dragon')).toBe(107);
    });
    it('retourne null hors plage ou sans Number', () => {
        expect(extractNumberIndexFromName('Number 100: …')).toBeNull();
        expect(extractNumberIndexFromName('Number 108: …')).toBeNull();
        expect(extractNumberIndexFromName('Blue-Eyes White Dragon')).toBeNull();
    });
});

describe('computeSeventhTachyonInsight', () => {
    it('retourne null sans Seventh Tachyon dans le deck', () => {
        const deck: InsightDeckSnapshot = {
            main: [row({ name: 'Dark Magician', type: 'Normal Monster', level: 7, race: 'Spellcaster', attribute: 'DARK' })],
            extra: [],
        };
        expect(computeSeventhTachyonInsight(deck)).toBeNull();
        expect(collectDeckInsights(deck)).toEqual([]);
    });

    it('avec ST mais sans Number 101–107 en Extra : insight info + 7 propositions Number', () => {
        const deck: InsightDeckSnapshot = {
            main: [row({ name: 'Seventh Tachyon', type: 'Normal Spell Card' })],
            extra: [row({ name: 'Number 39: Utopia', type: 'Xyz Monster', level: 4, race: 'Warrior', attribute: 'LIGHT' })],
        };
        const i = computeSeventhTachyonInsight(deck);
        expect(i).not.toBeNull();
        expect(i!.severity).toBe('info');
        expect(i!.summary).toMatch(/101|107|Number/i);
        const sug = i!.details?.seventhTachyon?.suggestedNumberXyz;
        expect(sug).toBeDefined();
        expect(sug!.length).toBe(NUMBER_10X_CATALOG.length);
        expect(sug!.every((x) => x.numberIndex >= 101 && x.numberIndex <= 107)).toBe(true);
        expect(sug!.every((x) => Array.isArray(x.matchingCards))).toBe(true);
        expect(sug!.length).toBe(14);
    });

    it('propositions Number : priorise ceux qui matchent Main/Side (niveau + type/attribut)', () => {
        const deck: InsightDeckSnapshot = {
            main: [
                row({ name: 'Seventh Tachyon', type: 'Normal Spell Card' }),
                row({
                    name: 'Main Spellcaster',
                    type: 'Effect Monster',
                    level: 4,
                    race: 'Spellcaster',
                    attribute: 'FIRE',
                    imageUrl: 'https://example.com/card.jpg',
                }),
            ],
            side: [
                row({
                    name: 'Side Dragon',
                    type: 'Effect Monster',
                    level: 8,
                    race: 'Dragon',
                    attribute: 'LIGHT',
                }),
            ],
            extra: [],
        };
        const sug = buildSuggestedNumberXyz(deck);
        expect(sug[0].matchesDeck).toBe(true);
        expect(sug[0].numberIndex).toBe(104);
        expect(sug[0].matchingCards).toHaveLength(1);
        expect(sug[0].matchingCards[0].name).toBe('Main Spellcaster');
        expect(sug[0].matchingCards[0].section).toBe('main');
        expect(sug[0].matchingCards[0].imageUrl).toBe('https://example.com/card.jpg');
        const sug107 = sug.find((s) => s.numberIndex === 107);
        expect(sug107?.matchingCards).toHaveLength(1);
        expect(sug107?.matchingCards[0].name).toBe('Side Dragon');
        expect(sug107?.matchingCards[0].section).toBe('side');
    });

    it('ST + Number 104 : cibles Main par Type OU Attribut et Niveau = Rang', () => {
        const deck: InsightDeckSnapshot = {
            main: [
                row({
                    name: 'Match Both',
                    type: 'Effect Monster',
                    level: 4,
                    race: 'Spellcaster',
                    attribute: 'LIGHT',
                }),
                row({
                    name: 'Match Attr Only',
                    type: 'Effect Monster',
                    level: 4,
                    race: 'Warrior',
                    attribute: 'LIGHT',
                }),
                row({
                    name: 'Match Race Only',
                    type: 'Effect Monster',
                    level: 4,
                    race: 'Spellcaster',
                    attribute: 'DARK',
                }),
                row({
                    name: 'Wrong Level',
                    type: 'Effect Monster',
                    level: 5,
                    race: 'Spellcaster',
                    attribute: 'LIGHT',
                }),
                row({
                    name: 'No Match',
                    type: 'Effect Monster',
                    level: 4,
                    race: 'Beast',
                    attribute: 'EARTH',
                }),
            ],
            extra: [
                row({
                    name: 'Number 104: Masquerade',
                    type: 'Xyz Monster',
                    level: 4,
                    race: 'Spellcaster',
                    attribute: 'LIGHT',
                }),
            ],
            side: [row({ name: 'Seventh Tachyon', type: 'Normal Spell Card' })],
        };
        const i = computeSeventhTachyonInsight(deck);
        expect(i!.severity).toBe('active');
        const groups = i!.details?.seventhTachyon?.xyzGroups;
        expect(groups).toHaveLength(1);
        const names = groups![0].targets.map((t) => t.name).sort();
        expect(names).toEqual(['Match Attr Only', 'Match Both', 'Match Race Only']);
        expect(i!.details?.seventhTachyon?.uniqueTargetCount).toBe(3);
    });

    it('agrège plusieurs Numbers distincts et compte les cibles uniques', () => {
        const deck: InsightDeckSnapshot = {
            main: [
                row({ name: 'Shared Target', type: 'Effect Monster', level: 4, race: 'Dragon', attribute: 'DARK' }),
            ],
            extra: [
                row({
                    name: 'Number 101: Silent Honor ARK',
                    type: 'Xyz Monster',
                    level: 4,
                    race: 'Aqua',
                    attribute: 'WATER',
                }),
                row({
                    name: 'Number 102: …',
                    type: 'Xyz Monster',
                    level: 4,
                    race: 'Dragon',
                    attribute: 'DARK',
                }),
            ],
        };
        const deckWithSt: InsightDeckSnapshot = {
            ...deck,
            main: [...deck.main, row({ name: 'Seventh Tachyon', type: 'Normal Spell Card' })],
        };
        const i = computeSeventhTachyonInsight(deckWithSt);
        expect(i!.details?.seventhTachyon?.xyzGroups).toHaveLength(2);
        expect(i!.details?.seventhTachyon?.uniqueTargetCount).toBe(1);
    });
});
