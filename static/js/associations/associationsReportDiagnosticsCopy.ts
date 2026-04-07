/**
 * Textes des diagnostics du rapport associations (`buildAssociationReport`).
 */

import { TEXT_GUILLEMET_CLOSE, TEXT_GUILLEMET_OPEN } from '../utils/textPlaceholders.js';

export const ASSOCIATION_DIAGNOSTIC_EMPTY_CATALOG_MESSAGE =
    'Catalogue vide : impossible de calculer des associations.';

export function associationDiagnosticYgorgEffectEnCountMessage(nYgorgFx: number): string {
    return `${nYgorgFx} carte(s) ont du texte YGResources (effet / pendule / flavor / link / nom EN) en complément de desc pour les citations.`;
}

export function associationDiagnosticNoArchetypeOnAnchorMessage(): string {
    return `L'ancre n'a pas d'archétype structuré : l'angle ${TEXT_GUILLEMET_OPEN} même archétype ${TEXT_GUILLEMET_CLOSE} est ignoré.`;
}

export function associationDiagnosticArchetypeGroupTruncatedMessage(
    arch: string,
    uniqueLength: number,
    maxGroupSize: number,
): string {
    return `Groupe archétype ${TEXT_GUILLEMET_OPEN} ${arch} ${TEXT_GUILLEMET_CLOSE} tronqué : ${uniqueLength} cartes (affichage max ${maxGroupSize}).`;
}

export function associationDiagnosticQaGroupTruncatedMessage(
    qaCardIdsLength: number,
    maxGroupSize: number,
): string {
    return `Groupe Q&A YGOrg tronqué : ${qaCardIdsLength} cartes (max ${maxGroupSize}).`;
}

export function associationDiagnosticNoDescInCatalogMessage(): string {
    return `Aucune description utilisable (\`desc\` ou textes EN YGOrg) : angles ${TEXT_GUILLEMET_OPEN} citation texte ${TEXT_GUILLEMET_CLOSE} ignorés.`;
}

export function associationDiagnosticNameWordCitationSkippedMessage(
    displayLabel: string,
    uniqueLength: number,
    maxNameWordCitationMatches: number,
): string {
    return `${TEXT_GUILLEMET_OPEN} ${displayLabel} ${TEXT_GUILLEMET_CLOSE} ignoré : ${uniqueLength} cartes (plafond ${maxNameWordCitationMatches} pour un mot extrait du nom).`;
}

export function associationDiagnosticMentionGroupTruncatedMessage(
    displayLabel: string,
    uniqueLength: number,
): string {
    return `Groupe ${TEXT_GUILLEMET_OPEN} ${displayLabel} ${TEXT_GUILLEMET_CLOSE} tronqué (${uniqueLength} cartes).`;
}

export function associationDiagnosticAnchorNameInDescTruncatedMessage(uniqueLength: number): string {
    return `Groupe ${TEXT_GUILLEMET_OPEN} nom de l\u2019ancre dans le texte ${TEXT_GUILLEMET_CLOSE} tronqué (${uniqueLength} cartes).`;
}
