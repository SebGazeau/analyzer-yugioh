import { describe, expect, it } from 'vitest';
import { STATS_CONSOLE_CATEGORY_SUMMARY_RENDER_ERROR_PREFIX } from '../statsConsoleCopy.js';

describe('statsConsoleCopy', () => {
    it('préfixe erreur rendu catégories stable', () => {
        expect(STATS_CONSOLE_CATEGORY_SUMMARY_RENDER_ERROR_PREFIX).toBe('[stats] category summary render:');
    });
});
