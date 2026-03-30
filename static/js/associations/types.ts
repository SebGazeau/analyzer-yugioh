/**
 * Types pour le rapport « cartes associées » (multi-angles).
 * Aligné sur docs/cursor-prompt-associated-cards-logic.md
 */

export type LinkStrength = 'member' | 'reference';

export type AssociationGroup = {
    angleId: string;
    groupKey: string;
    displayLabel: string;
    linkStrength: LinkStrength;
    /** IDs catalogue (pas de doublon dans le groupe). */
    cardIds: number[];
    meta?: Record<string, unknown>;
};

export type DiagnosticSeverity = 'info' | 'warn' | 'error';

export type Diagnostic = {
    code: string;
    message: string;
    severity: DiagnosticSeverity;
};

export type AssociationReport = {
    anchorId: number;
    anchorName: string;
    generatedAt: string;
    groups: AssociationGroup[];
    diagnostics: Diagnostic[];
};

/** Carte minimale pour le catalogue (API /associations/catalog ou recherche). */
export type AssociationCatalogCard = {
    id: number;
    name: string;
    name_en?: string | null;
    archetype?: string | null;
    /** Texte d’effet (champ `desc` côté API / YGOProDeck). */
    desc?: string | null;
    /**
     * Effet EN depuis YGResources (`card_enrichment_layers`), exposé par `/associations/catalog` si DB.
     * Utilisé pour les angles « citation texte » en plus de `desc`.
     */
    ygorg_effect_en?: string | null;
    /** Effet pendule EN YGOrg (`pendulumEffect`). */
    ygorg_pendulum_effect_en?: string | null;
    /** Lore / flavor EN YGOrg. */
    ygorg_flavor_en?: string | null;
    /** Effet Link EN YGOrg (`linkEffect`). */
    ygorg_link_effect_en?: string | null;
    /** Nom officiel EN YGOrg (`cardData.en.name`). */
    ygorg_name_en?: string | null;
    /** Illu. (YGOProDeck ou `/images/…/mobile` selon API catalogue). */
    image_url?: string | null;
    /**
     * Provenance si l’archétype a été complété hors dump YGOProDeck (ex. `ygorg_effect_en`).
     * Absent du JSON API quand NULL en base.
     */
    archetype_source?: string | null;
};

export type TextMentionRule = {
    groupKey: string;
    displayLabel: string;
    /** Sous-chaînes recherchées dans `desc` (comparaison en minuscules). */
    patterns: string[];
};

export type BuildAssociationReportOptions = {
    /** Troncature par groupe (défaut 200). */
    maxGroupSize?: number;
    /**
     * Règles « citation texte » **en plus** des règles dynamiques (archétype + mots du nom).
     * Si `dynamicTextMentions` est false, seules ces règles (ou aucune si absent) sont utilisées.
     */
    textMentionRules?: TextMentionRule[];
    /** Si false, pas de génération auto depuis l’ancre (tests / désactivation). Défaut true. */
    dynamicTextMentions?: boolean;
    /** Avec règles dynamiques : inclure les mots du nom. Défaut true. */
    includeNameWordPatterns?: boolean;
    /** Longueur min des mots du nom (défaut 5). */
    minNameWordLength?: number;
    /**
     * Plafond de cartes pour un angle « mot du nom » (`text_name:*`). Au-delà, le groupe est omis (trop bruyant).
     * Défaut 48. N’affecte pas `text_arch:*` ni les règles manuelles sans préfixe `text_name:`.
     */
    maxNameWordCitationMatches?: number;
    /**
     * Pour `text_name:*` uniquement : exiger une occurrence en « mot entier » (évite *break* dans *breakthrough*).
     * Défaut true.
     */
    useWordBoundaryForNameWordPatterns?: boolean;
    /** Si true, groupe des cartes dont le `desc` cite le nom de l’ancre (faux positifs possibles). */
    includeAnchorNameInDesc?: boolean;
    /**
     * IDs catalogue partageant une Q&A YGOrg avec l’ancre (`GET /associations/qa_related?card_id=`).
     */
    ygorgQaRelatedCardIds?: number[];
};
