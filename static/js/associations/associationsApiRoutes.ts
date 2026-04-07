/**
 * Chemins HTTP relatifs pour le module associations (alignés sur les routes serveur).
 */

export const ASSOCIATIONS_API_CATALOG_URL = '/associations/catalog';

export const ASSOCIATIONS_API_QA_RELATED_PATH = '/associations/qa_related';

/** Nom du paramètre de requête pour l’ID carte ancre (Q&A YGOrg). */
export const ASSOCIATIONS_API_QA_RELATED_CARD_ID_QUERY = 'card_id';

export function associationsApiQaRelatedUrl(anchorId: number): string {
    return `${ASSOCIATIONS_API_QA_RELATED_PATH}?${ASSOCIATIONS_API_QA_RELATED_CARD_ID_QUERY}=${encodeURIComponent(String(anchorId))}`;
}
