import { describe, expect, it } from 'vitest';
import { associationsModalShellInnerHtml } from '../../associations/associationsModalShellHtml.js';
import { ASSOCIATIONS_MODAL_HEADER_TITLE_TEXT } from '../../associations/associationsDomSelectors.js';

describe('associationsModalShellHtml', () => {
    it('injecte les ids et le titre du header', () => {
        const html = associationsModalShellInnerHtml({
            panelId: 'p',
            liveId: 'l',
            loadingId: 'lo',
            bodyId: 'b',
            titleId: 't',
            subtitleId: 's',
            anchorArtId: 'a',
        });
        expect(html).toContain('id="p"');
        expect(html).toContain('id="l"');
        expect(html).toContain('id="t"');
        expect(html).toContain(ASSOCIATIONS_MODAL_HEADER_TITLE_TEXT);
    });
});
