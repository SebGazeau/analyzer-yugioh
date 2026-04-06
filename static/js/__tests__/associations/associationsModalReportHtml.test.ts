import { describe, expect, it } from 'vitest';
import {
    associationsModalCatalogLoadErrorParagraphHtml,
    associationsModalReportBodyHtml,
} from '../../associations/associationsModalReportHtml.js';
import {
    ASSOCIATIONS_ACTION_COPY_MARKDOWN,
    ASSOCIATIONS_MODAL_CATALOG_LOAD_ERROR_TEXT,
    ASSOCIATIONS_MODAL_EMPTY_CLASS,
    ASSOCIATIONS_MODAL_ERROR_CLASS,
    DATA_ASSOCIATION_ANGLE_ATTR,
    DATA_ASSOCIATIONS_ACTION_ATTR,
    DATA_CARD_ID_ATTR,
} from '../../associations/associationsDomSelectors.js';
import type { AssociationCatalogCard, AssociationReport } from '../../associations/types.js';

function catalogCard(p: Partial<AssociationCatalogCard> & Pick<AssociationCatalogCard, 'id' | 'name'>): AssociationCatalogCard {
    return {
        name_en: null,
        archetype: null,
        desc: null,
        ...p,
    };
}

describe('associationsModalCatalogLoadErrorParagraphHtml', () => {
    it('contient la classe erreur et le texte catalogue', () => {
        const html = associationsModalCatalogLoadErrorParagraphHtml();
        expect(html).toContain(ASSOCIATIONS_MODAL_ERROR_CLASS);
        expect(html).toContain(ASSOCIATIONS_MODAL_CATALOG_LOAD_ERROR_TEXT);
    });
});

describe('associationsModalReportBodyHtml', () => {
    it('inclut le bouton copier markdown et un groupe avec angle + tuile', () => {
        const anchor = catalogCard({ id: 1, name: 'Ancre', archetype: 'TestArch' });
        const catalog: AssociationCatalogCard[] = [
            anchor,
            catalogCard({ id: 2, name: 'Cible', image_url: '/c.jpg', archetype: 'TestArch' }),
        ];
        const report: AssociationReport = {
            anchorId: 1,
            anchorName: 'Ancre',
            generatedAt: 't0',
            groups: [
                {
                    angleId: 'structured_archetype',
                    groupKey: 'archetype:TestArch',
                    displayLabel: 'Même archétype',
                    linkStrength: 'member',
                    cardIds: [2],
                },
            ],
            diagnostics: [],
        };
        const html = associationsModalReportBodyHtml(report, catalog, anchor, '# md');
        expect(html).toContain(`${DATA_ASSOCIATIONS_ACTION_ATTR}="${ASSOCIATIONS_ACTION_COPY_MARKDOWN}"`);
        expect(html).toContain(`${DATA_ASSOCIATION_ANGLE_ATTR}="structured_archetype"`);
        expect(html).toContain(`${DATA_CARD_ID_ATTR}="2"`);
        expect(html).toContain('# md');
    });

    it('affiche le bloc vide si aucun groupe', () => {
        const anchor = catalogCard({ id: 1, name: 'Seul' });
        const report: AssociationReport = {
            anchorId: 1,
            anchorName: 'Seul',
            generatedAt: 't0',
            groups: [],
            diagnostics: [],
        };
        const html = associationsModalReportBodyHtml(report, [anchor], anchor, '');
        expect(html).toContain(ASSOCIATIONS_MODAL_EMPTY_CLASS);
    });
});
