import { describe, expect, it } from 'vitest';
import {
    associationsModalThumbInnerHtml,
    associationsModalTileListItemHtml,
} from '../../associations/associationsModalTileHtml.js';
import {
    ASSOCIATIONS_MODAL_THUMB_PLACEHOLDER_CLASS,
    ASSOCIATIONS_MODAL_TILE_CLASS,
    DATA_CARD_ID_ATTR,
} from '../../associations/associationsDomSelectors.js';
import type { AssociationCatalogCard } from '../../associations/types.js';

describe('associationsModalThumbInnerHtml', () => {
    it('émet une img pour une URL autorisée (https)', () => {
        const html = associationsModalThumbInnerHtml(
            'https://example.com/a.jpg',
            'Dark Magician',
            'thumb-img',
            'lazy',
        );
        expect(html).toContain('src="https://example.com/a.jpg"');
        expect(html).toContain('width="59"');
        expect(html).toContain('height="86"');
        expect(html).toContain('class="thumb-img"');
        expect(html).toContain('loading="lazy"');
        expect(html).not.toContain(ASSOCIATIONS_MODAL_THUMB_PLACEHOLDER_CLASS);
    });

    it('émet un placeholder (initiales) si URL absente ou non autorisée', () => {
        const noUrl = associationsModalThumbInnerHtml(undefined, 'Blue-Eyes', 'x', 'eager');
        expect(noUrl).toContain(ASSOCIATIONS_MODAL_THUMB_PLACEHOLDER_CLASS);
        expect(noUrl).toContain('>BL<');

        const bad = associationsModalThumbInnerHtml('javascript:alert(1)', 'Foo Bar', 'x', 'eager');
        expect(bad).toContain(ASSOCIATIONS_MODAL_THUMB_PLACEHOLDER_CLASS);
        expect(bad).toContain('>FO<');
    });
});

describe('associationsModalTileListItemHtml', () => {
    it('inclut data-card-id et la classe tuile', () => {
        const card: AssociationCatalogCard = {
            id: 42,
            name: 'Test',
            image_url: '/cards/42.jpg',
        };
        const map = new Map<number, AssociationCatalogCard>([[42, card]]);
        const html = associationsModalTileListItemHtml(42, map);
        expect(html).toContain(`${DATA_CARD_ID_ATTR}="42"`);
        expect(html).toContain(`class="${ASSOCIATIONS_MODAL_TILE_CLASS}"`);
        expect(html).toContain('src="/cards/42.jpg"');
    });

    it('affiche #id si la carte est absente du catalogue', () => {
        const html = associationsModalTileListItemHtml(99, new Map());
        expect(html).toContain(`${DATA_CARD_ID_ATTR}="99"`);
        expect(html).toContain('#99');
    });
});
