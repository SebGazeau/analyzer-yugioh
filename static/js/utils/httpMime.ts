/**
 * MIME, méthodes, statuts, credentials et en-têtes HTTP récurrents pour `fetch` / `Blob`.
 */

/** `RequestInit.credentials` pour cookies de session (API même origine). */
export const FETCH_CREDENTIALS_SAME_ORIGIN: RequestCredentials = 'same-origin';

/** HTTP 200 OK */
export const HTTP_STATUS_OK = 200;

/** HTTP 401 Unauthorized — session absente ou expirée. */
export const HTTP_STATUS_UNAUTHORIZED = 401;

/** HTTP 404 Not Found */
export const HTTP_STATUS_NOT_FOUND = 404;

export const HTTP_METHOD_POST = 'POST';
export const HTTP_METHOD_PUT = 'PUT';
export const HTTP_METHOD_DELETE = 'DELETE';

export const MIME_TYPE_APPLICATION_JSON = 'application/json';

export const HTTP_HEADER_CONTENT_TYPE = 'Content-Type';

/** En-têtes pour requêtes `fetch` avec corps JSON (POST, PUT). */
export const FETCH_HEADERS_JSON: Record<string, string> = {
    [HTTP_HEADER_CONTENT_TYPE]: MIME_TYPE_APPLICATION_JSON,
};
