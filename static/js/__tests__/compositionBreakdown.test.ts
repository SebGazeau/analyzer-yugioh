import { describe, expect, it } from 'vitest';
import { computeCompositionBreakdown } from '../analysis/compositionBreakdown.js';

describe('compositionBreakdown', () => {
    it('répartit monstres par attribut, niveau et race', () => {
        const b = computeCompositionBreakdown([
            {
                type: 'Effect Monster',
                quantity: 2,
                attribute: 'DARK',
                level: 4,
                race: 'Dragon',
            },
            {
                type: 'Normal Monster',
                quantity: 1,
                attribute: 'LIGHT',
                level: 4,
                race: 'Warrior',
            },
        ]);
        expect(b.monsters.byAttribute.DARK).toBe(2);
        expect(b.monsters.byAttribute.LIGHT).toBe(1);
        expect(b.monsters.byLevel['Niveau 4']).toBe(3);
        expect(b.monsters.byRace.Dragon).toBe(2);
        expect(b.monsters.byRace.Warrior).toBe(1);
        expect(Object.keys(b.spells.byRace).length).toBe(0);
        expect(Object.keys(b.traps.byRace).length).toBe(0);
    });

    it('compte magies et pièges par sous-type (race)', () => {
        const b = computeCompositionBreakdown([
            { type: 'Spell Card', quantity: 3, race: 'Quick-Play' },
            { type: 'Trap Card', quantity: 2, race: 'Counter' },
        ]);
        expect(b.spells.byRace['Quick-Play']).toBe(3);
        expect(b.traps.byRace.Counter).toBe(2);
        expect(Object.keys(b.monsters.byAttribute).length).toBe(0);
    });

    it('ignore les lignes sans type reconnu (comme mainDeckTypeCounts)', () => {
        const b = computeCompositionBreakdown([{ type: 'Token', quantity: 5, race: '?' }]);
        expect(Object.keys(b.monsters.byAttribute).length).toBe(0);
        expect(Object.keys(b.spells.byRace).length).toBe(0);
        expect(Object.keys(b.traps.byRace).length).toBe(0);
    });
});
