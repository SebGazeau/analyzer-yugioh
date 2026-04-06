import { describe, expect, it } from 'vitest';
import { analysisDeckNameHeaderText } from '../analysis/analysisDeckNameTitleCopy.js';
import { TEXT_EM_DASH } from '../utils/textPlaceholders.js';

describe('analysisDeckNameTitleCopy', () => {
    it('trim + tiret cadratin + espace final', () => {
        expect(analysisDeckNameHeaderText('  Mon deck  ')).toBe(`Mon deck ${TEXT_EM_DASH} `);
    });

    it('vide si nom vide ou blanc', () => {
        expect(analysisDeckNameHeaderText('')).toBe('');
        expect(analysisDeckNameHeaderText('   ')).toBe('');
    });
});
