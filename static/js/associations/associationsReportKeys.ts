/**
 * Identifiants d’angles, clés de groupe et préfixes stables du rapport associations.
 */

export const ASSOCIATION_ANGLE_STRUCTURED_ARCHETYPE = 'structured_archetype';

export const ASSOCIATION_ANGLE_YGORG_OFFICIAL_QA = 'ygorg_official_qa';

export const ASSOCIATION_ANGLE_TEXT_MENTION = 'text_mention';

export const ASSOCIATION_ANGLE_TEXT_MENTIONS_ANCHOR_NAME = 'text_mentions_anchor_name';

export const ASSOCIATION_GROUP_KEY_YGORG_SHARED_QA = 'ygorg_shared_qa';

export const ASSOCIATION_GROUP_KEY_ANCHOR_NAME_IN_DESC = 'anchor_name_in_desc';

/** Préfixe `groupKey` pour archétype API (`archetype:Blue-Eyes`). */
export const ASSOCIATION_GROUP_KEY_PREFIX_ARCHETYPE = 'archetype:';

/** Premier segment de `slugKey` pour règles citation archétype texte → `text_arch:…`. */
export const ASSOCIATION_SLUG_PREFIX_TEXT_ARCH = 'text_arch';

/** Premier segment de `slugKey` pour mots du nom → `text_name:…`. */
export const ASSOCIATION_SLUG_PREFIX_TEXT_NAME = 'text_name';

export const ASSOCIATION_GROUP_KEY_PREFIX_TEXT_ARCH = `${ASSOCIATION_SLUG_PREFIX_TEXT_ARCH}:`;

export const ASSOCIATION_GROUP_KEY_PREFIX_TEXT_NAME = `${ASSOCIATION_SLUG_PREFIX_TEXT_NAME}:`;

/** `meta.source` du groupe Q&A YGOrg officiel. */
export const ASSOCIATION_REPORT_META_SOURCE_YGORG_QA_ENTRIES = 'ygorg_qa_entries';
