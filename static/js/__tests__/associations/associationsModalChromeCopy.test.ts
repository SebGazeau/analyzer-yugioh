import { describe, it, expect } from 'vitest';
import {
    ASSOCIATIONS_MODAL_CATALOG_LOAD_ERROR_TEXT,
    ASSOCIATIONS_MODAL_HEADER_TITLE_TEXT,
    ASSOCIATIONS_MODAL_LOADING_STATUS_TEXT,
    ASSOCIATIONS_MODAL_TILE_ADD_DECK_TITLE,
} from '../../associations/associationsModalChromeCopy.js';
import { TEXT_ELLIPSIS } from '../../utils/textPlaceholders.js';

describe('associationsModalChromeCopy', () => {
    it('contrats textes modal', () => {
        expect(ASSOCIATIONS_MODAL_CATALOG_LOAD_ERROR_TEXT.length).toBeGreaterThan(10);
        expect(ASSOCIATIONS_MODAL_HEADER_TITLE_TEXT).toBe('Cartes associées');
        expect(ASSOCIATIONS_MODAL_TILE_ADD_DECK_TITLE).toContain('deck');
        expect(ASSOCIATIONS_MODAL_LOADING_STATUS_TEXT).toContain('catalogue');
        expect(ASSOCIATIONS_MODAL_LOADING_STATUS_TEXT).toContain(TEXT_ELLIPSIS);
    });
});
