import { describe, expect, it } from 'vitest';
import {
    ASSOCIATION_ANGLE_STRUCTURED_ARCHETYPE,
    ASSOCIATION_ANGLE_TEXT_MENTION,
    ASSOCIATION_ANGLE_TEXT_MENTIONS_ANCHOR_NAME,
    ASSOCIATION_ANGLE_YGORG_OFFICIAL_QA,
    ASSOCIATION_GROUP_KEY_ANCHOR_NAME_IN_DESC,
    ASSOCIATION_GROUP_KEY_PREFIX_ARCHETYPE,
    ASSOCIATION_GROUP_KEY_PREFIX_TEXT_ARCH,
    ASSOCIATION_GROUP_KEY_PREFIX_TEXT_NAME,
    ASSOCIATION_GROUP_KEY_YGORG_SHARED_QA,
    ASSOCIATION_LINK_STRENGTH_MEMBER,
    ASSOCIATION_LINK_STRENGTH_REFERENCE,
    ASSOCIATION_REPORT_META_SOURCE_YGORG_QA_ENTRIES,
    ASSOCIATION_SLUG_PREFIX_TEXT_ARCH,
    ASSOCIATION_SLUG_PREFIX_TEXT_NAME,
} from '../../associations/associationsReportKeys.js';

describe('associationsReportKeys', () => {
    it('préfixes cohérents avec slugKey (segment avant `:`)', () => {
        expect(ASSOCIATION_GROUP_KEY_PREFIX_TEXT_NAME).toBe(`${ASSOCIATION_SLUG_PREFIX_TEXT_NAME}:`);
        expect(ASSOCIATION_GROUP_KEY_PREFIX_TEXT_ARCH).toBe(`${ASSOCIATION_SLUG_PREFIX_TEXT_ARCH}:`);
    });

    it('angles et clés stables (contrat data-attributes / JSON)', () => {
        expect(ASSOCIATION_ANGLE_STRUCTURED_ARCHETYPE).toBe('structured_archetype');
        expect(ASSOCIATION_ANGLE_TEXT_MENTION).toBe('text_mention');
        expect(ASSOCIATION_GROUP_KEY_YGORG_SHARED_QA).toBe('ygorg_shared_qa');
        expect(ASSOCIATION_GROUP_KEY_ANCHOR_NAME_IN_DESC).toBe('anchor_name_in_desc');
        expect(ASSOCIATION_GROUP_KEY_PREFIX_ARCHETYPE).toBe('archetype:');
        expect(ASSOCIATION_REPORT_META_SOURCE_YGORG_QA_ENTRIES).toBe('ygorg_qa_entries');
        expect(ASSOCIATION_LINK_STRENGTH_MEMBER).toBe('member');
        expect(ASSOCIATION_LINK_STRENGTH_REFERENCE).toBe('reference');
        const angles = [
            ASSOCIATION_ANGLE_STRUCTURED_ARCHETYPE,
            ASSOCIATION_ANGLE_YGORG_OFFICIAL_QA,
            ASSOCIATION_ANGLE_TEXT_MENTION,
            ASSOCIATION_ANGLE_TEXT_MENTIONS_ANCHOR_NAME,
        ];
        expect(new Set(angles).size).toBe(angles.length);
    });
});
