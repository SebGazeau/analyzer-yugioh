/**
 * MIME, méthodes et en-têtes HTTP récurrents pour `fetch` / `Blob`.
 */

export const HTTP_METHOD_POST = 'POST';
export const HTTP_METHOD_PUT = 'PUT';
export const HTTP_METHOD_DELETE = 'DELETE';

export const MIME_TYPE_APPLICATION_JSON = 'application/json';

export const HTTP_HEADER_CONTENT_TYPE = 'Content-Type';

/** En-têtes pour requêtes `fetch` avec corps JSON (POST, PUT). */
export const FETCH_HEADERS_JSON: Record<string, string> = {
    [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_APPLICATION_JSON,
};
