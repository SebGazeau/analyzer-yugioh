import { toAssociationCatalog } from './buildReport.js';
import type { AssociationCatalogCard } from './types.js';

const CATALOG_URL = '/associations/catalog';

/**
 * Précharge le catalogue en idle (builder) pour que la première ouverture
 * de la modal « cartes associées » évite l’attente réseau si le JSON est déjà en cache.
 */
export function prefetchAssociationCatalogWhenIdle(): void {
    const run = (): void => {
        void getAssociationCatalog().catch(() => {
            /* hors-ligne ou erreur : la modal retentera au besoin */
        });
    };
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(run, { timeout: 8000 });
    } else {
        window.setTimeout(run, 2500);
    }
}

let catalogMemo: AssociationCatalogCard[] | null = null;
let catalogInflight: Promise<AssociationCatalogCard[]> | null = null;

const qaRelatedMemo = new Map<number, number[]>();
const qaRelatedInflight = new Map<number, Promise<number[]>>();

/** Vide les caches (tests / hot reload). */
export function resetAssociationFetchCache(): void {
    catalogMemo = null;
    catalogInflight = null;
    qaRelatedMemo.clear();
    qaRelatedInflight.clear();
}

/**
 * Catalogue associations : une seule requête par session (tant que la page n’est pas rechargée),
 * avec déduplication si plusieurs modals s’ouvrent en parallèle.
 */
export function getAssociationCatalog(): Promise<AssociationCatalogCard[]> {
    if (catalogMemo) return Promise.resolve(catalogMemo);
    if (catalogInflight) return catalogInflight;

    catalogInflight = (async () => {
        const catRes = await fetch(CATALOG_URL);
        if (!catRes.ok) throw new Error(String(catRes.status));
        const data: unknown[] = await catRes.json();
        return toAssociationCatalog(data as Record<string, unknown>[]);
    })()
        .then((catalog) => {
            catalogMemo = catalog;
            catalogInflight = null;
            return catalog;
        })
        .catch((e) => {
            catalogInflight = null;
            throw e;
        });

    return catalogInflight;
}

function qaRelatedUrl(anchorId: number): string {
    return `/associations/qa_related?card_id=${encodeURIComponent(String(anchorId))}`;
}

/**
 * IDs catalogue partageant une Q&A avec l’ancre : cache par `card_id` (même onglet).
 */
export function getQaRelatedCardIds(anchorId: number): Promise<number[]> {
    if (qaRelatedMemo.has(anchorId)) {
        return Promise.resolve(qaRelatedMemo.get(anchorId)!);
    }
    const existing = qaRelatedInflight.get(anchorId);
    if (existing) return existing;

    const p = fetch(qaRelatedUrl(anchorId))
        .then(async (qaRes) => {
            let ygorgQaRelatedCardIds: number[] = [];
            if (qaRes.ok) {
                const qaJson: unknown = await qaRes.json();
                if (Array.isArray(qaJson)) {
                    ygorgQaRelatedCardIds = qaJson
                        .map((x) => (typeof x === 'number' ? x : Number(x)))
                        .filter((n) => Number.isFinite(n));
                }
            }
            return ygorgQaRelatedCardIds;
        })
        .then((ids) => {
            qaRelatedMemo.set(anchorId, ids);
            qaRelatedInflight.delete(anchorId);
            return ids;
        })
        .catch((e) => {
            qaRelatedInflight.delete(anchorId);
            throw e;
        });

    qaRelatedInflight.set(anchorId, p);
    return p;
}
