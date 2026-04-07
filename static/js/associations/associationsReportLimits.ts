/**
 * Plafonds par défaut pour `buildAssociationReport` (troncature, anti-bruit citations).
 */

/** Nombre max de cartes listées par groupe avant troncature (diagnostic + slice). */
export const ASSOCIATION_BUILD_REPORT_DEFAULT_MAX_GROUP_SIZE = 200;

/**
 * Au-delà, les angles `text_name:*` issus des mots du nom sont ignorés (trop de cartes).
 */
export const ASSOCIATION_BUILD_REPORT_DEFAULT_MAX_NAME_WORD_CITATION_MATCHES = 48;

/** Longueur minimale d’un mot du nom pour générer un angle `text_name:*`. */
export const ASSOCIATION_BUILD_REPORT_DEFAULT_MIN_NAME_WORD_LENGTH = 5;

/** IDs cartes listés par groupe dans l’export Markdown (puis ligne « … de plus »). */
export const ASSOCIATION_REPORT_MARKDOWN_CARD_ID_SAMPLE_MAX = 15;
