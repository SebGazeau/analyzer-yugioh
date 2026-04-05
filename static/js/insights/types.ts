/** Types partagés pour les suggestions / insights deck (extensible). */

import type { DeckSectionMainSide } from '../deckSection.js';

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
}

export interface InsightDeckSnapshot {
    main: InsightDeckRow[];
    extra: InsightDeckRow[];
    side?: InsightDeckRow[];
}

export type InsightKind = 'seventh_tachyon';
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
    };
}
