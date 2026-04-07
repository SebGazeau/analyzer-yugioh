import { describe, expect, it } from 'vitest';
import { DECK_IMPORT_JSON_WARN_FAILED_CARDS_PREFIX } from '../deck-builder/deckFileIoCopy.js';

describe('deckFileIoCopy', () => {
    it('préfixe warn import JSON stable', () => {
        expect(DECK_IMPORT_JSON_WARN_FAILED_CARDS_PREFIX).toBe('Import: cartes non trouvées:');
    });
});
