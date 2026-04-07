/**
 * Flux données / API pour la modal « cartes associées » (sans création DOM ni écouteurs).
 *
 * `import('../search.js')` dynamique : évite un cycle statique `search → modal → … → search`
 * (la recherche ouvre la modal ; la modal relance une recherche si `fetchCardByName` échoue).
 */
import { fetchCardByName, type Card } from '../api.js';
import { getAssociationCatalog, getQaRelatedCardIds } from './associationFetchCache.js';
import { associationReportToMarkdown, buildAssociationReport } from './buildReport.js';
import type { AssociationCatalogCard, AssociationReport } from './types.js';

export function mergeAnchorWithCatalog(
    anchor: AssociationCatalogCard,
    catalog: AssociationCatalogCard[],
): AssociationCatalogCard {
    const row = catalog.find((c) => c.id === anchor.id);
    if (!row) return anchor;
    return {
        ...anchor,
        image_url: row.image_url ?? anchor.image_url ?? null,
        archetype: row.archetype ?? anchor.archetype ?? null,
        archetype_source: row.archetype_source ?? anchor.archetype_source ?? null,
    };
}

export type AssociationModalPayload =
    | {
          ok: true;
          catalog: AssociationCatalogCard[];
          displayAnchor: AssociationCatalogCard;
          report: AssociationReport;
          markdown: string;
      }
    | { ok: false };

/** Charge catalogue + Q&A, fusionne l’ancre, construit rapport et markdown. */
export async function fetchAssociationModalPayload(anchor: AssociationCatalogCard): Promise<AssociationModalPayload> {
    try {
        const [catalog, ygorgQaRelatedCardIds] = await Promise.all([
            getAssociationCatalog(),
            getQaRelatedCardIds(anchor.id),
        ]);
        const displayAnchor = mergeAnchorWithCatalog(anchor, catalog);
        const report = buildAssociationReport(displayAnchor, catalog, { ygorgQaRelatedCardIds });
        const idToName = new Map<number, string>();
        for (const c of catalog) idToName.set(c.id, c.name_en?.trim() || c.name);
        const markdown = associationReportToMarkdown(report, idToName);
        return { ok: true, catalog, displayAnchor, report, markdown };
    } catch {
        return { ok: false };
    }
}

/** Résout une carte deck à partir du nom (API directe puis recherche). */
export async function resolveDeckCardForAssociationName(searchName: string): Promise<Card | null> {
    let card = await fetchCardByName(searchName);
    if (!card) {
        const { fetchSearchResultsForQuery, pickBestCardFromSearchResults } = await import('../search.js');
        const results = await fetchSearchResultsForQuery(searchName);
        card = pickBestCardFromSearchResults(results, searchName);
    }
    return card;
}
