import { describe, expect, it } from 'vitest';
import {
    FETCH_HEADERS_JSON,
    HTTP_HEADER_CONTENT_TYPE,
    HTTP_METHOD_DELETE,
    HTTP_METHOD_POST,
    HTTP_METHOD_PUT,
    MIME_TYPE_APPLICATION_JSON,
} from '../utils/httpMime.js';

describe('httpMime', () => {
    it('MIME JSON et en-tête fetch', () => {
        expect(MIME_TYPE_APPLICATION_JSON).toBe('application/json');
        expect(HTTP_HEADER_CONTENT_TYPE).toBe('Content-Type');
        expect(FETCH_HEADERS_JSON).toEqual({ 'Content-Type': 'application/json' });
    });

    it('méthodes HTTP pour fetch', () => {
        expect(HTTP_METHOD_POST).toBe('POST');
        expect(HTTP_METHOD_PUT).toBe('PUT');
        expect(HTTP_METHOD_DELETE).toBe('DELETE');
    });
});
