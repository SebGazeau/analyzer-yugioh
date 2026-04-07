import { describe, expect, it } from 'vitest';
import {
    ASSOCIATIONS_API_CATALOG_URL,
    ASSOCIATIONS_API_QA_RELATED_CARD_ID_QUERY,
    ASSOCIATIONS_API_QA_RELATED_PATH,
    associationsApiQaRelatedUrl,
} from '../../associations/associationsApiRoutes.js';

describe('associationsApiRoutes', () => {
    it('chemins catalogue et qa_related stables', () => {
        expect(ASSOCIATIONS_API_CATALOG_URL).toBe('/associations/catalog');
        expect(ASSOCIATIONS_API_QA_RELATED_PATH).toBe('/associations/qa_related');
        expect(ASSOCIATIONS_API_QA_RELATED_CARD_ID_QUERY).toBe('card_id');
    });

    it('associationsApiQaRelatedUrl encode l’id', () => {
        expect(associationsApiQaRelatedUrl(7)).toBe('/associations/qa_related?card_id=7');
    });
});
