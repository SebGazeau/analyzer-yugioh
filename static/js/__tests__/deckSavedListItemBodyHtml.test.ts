import { describe, expect, it } from 'vitest';
import { deckSavedListItemBodyInnerHtml } from '../deck-builder/deckSavedListItemBodyHtml.js';
import {
    DATA_DECK_DELETE_ATTR,
    DATA_DECK_DUPLICATE_ATTR,
    DECK_SAVED_ITEM_META_CLASS,
    DECK_SAVED_ITEM_NAME_CLASS,
} from '../deck-builder/deckSavedListDomSelectors.js';

describe('deckSavedListItemBodyInnerHtml', () => {
    it('nom + ids data-deck + boutons sans méta si pas de date', () => {
        const html = deckSavedListItemBodyInnerHtml({ deckName: 'My Deck', deckId: 42 });
        expect(html).toContain(`class="${DECK_SAVED_ITEM_NAME_CLASS}">My Deck</span>`);
        expect(html).toContain(`${DATA_DECK_DUPLICATE_ATTR}="42"`);
        expect(html).toContain(`${DATA_DECK_DELETE_ATTR}="42"`);
        expect(html).not.toContain(DECK_SAVED_ITEM_META_CLASS);
    });

    it('échappe le nom et affiche méta si createdAtIso', () => {
        const html = deckSavedListItemBodyInnerHtml({
            deckName: '<X>',
            deckId: 1,
            createdAtIso: '2024-01-15T12:00:00.000Z',
        });
        expect(html).not.toContain('<X>');
        expect(html).toContain('&lt;X&gt;');
        expect(html).toContain(DECK_SAVED_ITEM_META_CLASS);
    });
});
