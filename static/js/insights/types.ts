/** Types partagés pour les suggestions / insights deck (extensible). */

import type { DeckSectionMainSide } from '../deckSectionMainSide.js';

/** Sous-ensemble des champs `DeckRow` nécessaires aux règles (sans dépendre de deck.ts). */
export interface InsightDeckRow {
    name: string;
    type: string;
    quantity: number;
    attribute?: string;
    level?: number;
    race?: string;
    frame_type?: string;
    /** Présent sur les lignes builder quand l’API a renvoyé une image. */
    imageUrl?: string;
    /** Passcode YGOProDeck (aligné sur `DeckRow.cardId`). */
    cardId?: number;
    /** Texte d’effet (aligné sur `DeckRow.cardDesc`) pour heuristiques insights. */
    cardDesc?: string;
}

export interface InsightDeckSnapshot {
    main: InsightDeckRow[];
    extra: InsightDeckRow[];
    side?: InsightDeckRow[];
}

export type InsightKind = 'seventh_tachyon' | 'fidraulis_gy_synchro';

/** Confiance pour la liste Synchro « ressource » Fidraulis (allowlist vs texte). */
export type FidraulisGyTrust = 'verified' | 'heuristic';

/**
 * Taxonomie « quel effet » (v1) — allowlist = vérité ; heuristique = inférence limitée sur `cardDesc`.
 */
export type FidraulisGyResourceTaxon =
    | 'extra_synchro_to_gy_fid_cost'
    | 'effect_on_sent_to_gy'
    | 'field_or_gy_continuous'
    | 'effect_if_in_gy'
    | 'discard_cost'
    | 'other_documented'
    | 'heuristic_uncertain';

/** Une ligne Extra Synchro jugée pertinente après envoi au Cimetière (Fidraulis palier 4+). */
export interface FidraulisGyResourceRow {
    name: string;
    quantity: number;
    trust: FidraulisGyTrust;
    cardId?: number;
    /** Court rappel (ex. nom catalogue allowlist), optionnel. */
    note?: string;
    resourceTaxon: FidraulisGyResourceTaxon;
    /** Libellé FR court dans la colonne « Contexte » (taxonomie). */
    resourceContextLabel: string;
    /** Texte long pour `title` / infobulle (détail du taxon). */
    resourceContextTitle?: string;
}
export type InsightSeverity = 'active' | 'info';

export interface InsightCardRef {
    name: string;
    quantity: number;
}

/** Groupe : un Xyz Number 101–107 et les cibles Main correspondantes. */
export interface SeventhTachyonXyzGroup {
    xyzName: string;
    numberIndex: number;
    rank: number;
    targets: InsightCardRef[];
}

/** Carte Main ou Side qui « fait le pont » avec un Number proposé (niveau = rang, type ou attribut). */
export interface MatchingCardPreview {
    name: string;
    quantity: number;
    imageUrl?: string;
    section: DeckSectionMainSide;
}

/**
 * Xyz « Number » 101–107 proposé quand l’Extra n’en contient aucun (catalogue statique, noms EN = recherche API).
 * matchesDeck : au moins une carte Main ou Side correspond.
 */
export interface NumberXyzSuggestion {
    name: string;
    numberIndex: number;
    rank: number;
    attribute: string;
    race: string;
    matchesDeck: boolean;
    matchingCards: MatchingCardPreview[];
}

export interface DeckInsight {
    id: string;
    kind: InsightKind;
    severity: InsightSeverity;
    title: string;
    summary: string;
    details?: {
        helpLine?: string;
        seventhTachyon?: {
            xyzGroups?: SeventhTachyonXyzGroup[];
            uniqueTargetCount?: number;
            suggestedNumberXyz?: NumberXyzSuggestion[];
        };
        /** Synchros Extra « ressource » (effet au CY) si Fidraulis est dans Main/Side. */
        fidraulisGy?: {
            rows: FidraulisGyResourceRow[];
            helpLine?: string;
        };
    };
}
