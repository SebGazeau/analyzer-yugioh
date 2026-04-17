/**
 * Insight Fidraulis Harmonia : Synchros Extra « ressource » après envoi au Cimetière (allowlist + heuristique).
 */
import { getFidraulisGyVerifiedEntry, passcodeIsFidraulisGyVerified } from '../../insights/fidraulisGyAllowlist.js';
import {
    INSIGHT_FIDRAULIS_GY_HELP_LINE,
    INSIGHT_FIDRAULIS_GY_TITLE,
    insightFidraulisGySummary,
} from '../../insights/fidraulisGyCopy.js';
import { fidraulisGyTaxonLabelFr, fidraulisGyTaxonTableShortFr } from '../../insights/fidraulisGyTaxonomy.js';
import type {
    DeckInsight,
    FidraulisGyResourceRow,
    FidraulisGyResourceTaxon,
    FidraulisGyTrust,
    InsightDeckRow,
    InsightDeckSnapshot,
} from '../../insights/types.js';
import { coercePositivePasscode } from '../../utils/coercePasscode.js';
import { cardTypeKindFromTypeStringOrNull } from '../../utils/cardTypeKind.js';
import { CARD_TYPE_KIND_MONSTER } from '../../utils/cardTypeKindConstants.js';
import {
    cardDescLooksLikeGyIfInGyActivated,
    cardDescLooksLikeGySendTrigger,
    cardDescLooksLikeGyWhileOnFieldOrInGy,
    inferFidraulisGyResourceTaxon,
} from './fidraulisGyHeuristic.js';

function normalizeName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

/** Noms normalisés reconnus (EN court + FR « Harmonie » + faute d’audition fréquente). */
const FIDRAULIS_NAME_KEYS = new Set([
    'fidraulis harmonia',
    'fridaulis harmonia',
    'fidraulis harmonie',
    'fridaulis harmonie',
]);

/** Passcode TCG « Fidraulis, the Dragon of Harmonia » (nom affiché souvent long / localisé). */
export const FIDRAULIS_HARMONIA_PASSCODE = 70088809;

/** Nom déjà normalisé (`normalizeName`) : EN « Harmonia », FR « Harmonie », titres longs. */
export function normalizedNameIndicatesFidraulisHarmonia(n: string): boolean {
    if (FIDRAULIS_NAME_KEYS.has(n)) return true;
    const harm = n.includes('harmonia') || n.includes('harmonie');
    return harm && (n.includes('fidraulis') || n.includes('fridaulis'));
}

function isFidraulisHarmonia(row: InsightDeckRow): boolean {
    const cid = coercePositivePasscode(row.cardId);
    if (cid === FIDRAULIS_HARMONIA_PASSCODE) return true;
    if (cardTypeKindFromTypeStringOrNull(row.type) !== CARD_TYPE_KIND_MONSTER) return false;
    const n = normalizeName(row.name);
    return normalizedNameIndicatesFidraulisHarmonia(n);
}

function deckHasFidraulisHarmonia(deck: InsightDeckSnapshot): boolean {
    const any = (rows: InsightDeckRow[]) => rows.some((r) => r.quantity > 0 && isFidraulisHarmonia(r));
    return any(deck.main) || any(deck.side ?? []);
}

/** Synchro Extra : ligne `type` YGOProDeck ou fallback `type: "Monster"` + `frame_type: "synchro"` (cache). */
function isSynchroMonster(row: InsightDeckRow): boolean {
    if (cardTypeKindFromTypeStringOrNull(row.type) !== CARD_TYPE_KIND_MONSTER) return false;
    const f = (row.frame_type ?? '').trim().toLowerCase();
    if (f === 'synchro') return true;
    const t = (row.type || '').toLowerCase();
    if (!t.includes('synchro')) return false;
    if (t.includes('xyz') || t.includes('fusion') || t.includes('link')) return false;
    return true;
}

interface Aggregated {
    name: string;
    quantity: number;
    trust: FidraulisGyTrust;
    cardId?: number;
    resourceTaxon: FidraulisGyResourceTaxon;
    resourceContextLabel: string;
    resourceContextTitle: string;
}

function verifiedContextFromPasscode(id: number, cardDesc: string): {
    taxon: FidraulisGyResourceTaxon;
    label: string;
    title: string;
} {
    const entry = getFidraulisGyVerifiedEntry(id);
    if (entry) {
        return {
            taxon: entry.taxon,
            label: fidraulisGyTaxonTableShortFr(entry.taxon),
            title: fidraulisGyTaxonLabelFr(entry.taxon),
        };
    }
    const desc = cardDesc.trim();
    if (desc.length > 0) {
        const taxon = inferFidraulisGyResourceTaxon(desc);
        return {
            taxon,
            label: fidraulisGyTaxonTableShortFr(taxon),
            title: fidraulisGyTaxonLabelFr(taxon),
        };
    }
    const taxon: FidraulisGyResourceTaxon = 'other_documented';
    return {
        taxon,
        label: fidraulisGyTaxonTableShortFr(taxon),
        title: fidraulisGyTaxonLabelFr(taxon),
    };
}

function heuristicContextFromDesc(desc: string): {
    taxon: FidraulisGyResourceTaxon;
    label: string;
    title: string;
} {
    const taxon = inferFidraulisGyResourceTaxon(desc);
    return {
        taxon,
        label: fidraulisGyTaxonTableShortFr(taxon),
        title: fidraulisGyTaxonLabelFr(taxon),
    };
}

/**
 * Retourne un insight `fidraulis_gy_synchro` si le deck contient Fidraulis (Main ou Side)
 * et au moins un Synchro Extra « ressource », sinon `null`.
 */
export function computeFidraulisGyResourcesInsight(deck: InsightDeckSnapshot): DeckInsight | null {
    const hasFid = deckHasFidraulisHarmonia(deck);
    if (!hasFid) return null;

    const byKey = new Map<string, Aggregated>();

    for (const row of deck.extra) {
        if (row.quantity <= 0) continue;

        const id = typeof row.cardId === 'number' && row.cardId > 0 ? row.cardId : undefined;
        const verifiedByPasscode = id != null && passcodeIsFidraulisGyVerified(id);
        if (!verifiedByPasscode && !isSynchroMonster(row)) continue;

        const verified = verifiedByPasscode;
        const desc = (row.cardDesc ?? '').trim();
        const heuristic =
            !verified &&
            desc.length > 0 &&
            (cardDescLooksLikeGySendTrigger(desc) ||
                cardDescLooksLikeGyWhileOnFieldOrInGy(desc) ||
                cardDescLooksLikeGyIfInGyActivated(desc));
        if (!verified && !heuristic) continue;

        const trust: FidraulisGyTrust = verified ? 'verified' : 'heuristic';
        const key = id != null ? `id:${id}` : `name:${normalizeName(row.name)}`;

        const ctx =
            verified && id != null
                ? verifiedContextFromPasscode(id, desc)
                : heuristicContextFromDesc(desc);

        const prev = byKey.get(key);
        if (!prev) {
            byKey.set(key, {
                name: row.name,
                quantity: row.quantity,
                trust,
                cardId: id,
                resourceTaxon: ctx.taxon,
                resourceContextLabel: ctx.label,
                resourceContextTitle: ctx.title,
            });
        } else {
            prev.quantity += row.quantity;
            if (prev.trust === 'heuristic' && trust === 'verified' && id != null) {
                prev.trust = 'verified';
                const v = verifiedContextFromPasscode(id, desc);
                prev.resourceTaxon = v.taxon;
                prev.resourceContextLabel = v.label;
                prev.resourceContextTitle = v.title;
            }
        }
    }

    if (byKey.size === 0) {
        return null;
    }

    const rows: FidraulisGyResourceRow[] = [...byKey.values()]
        .map((a) => {
            const note =
                a.trust === 'verified' && a.cardId != null
                    ? getFidraulisGyVerifiedEntry(a.cardId)?.catalogShortName
                    : undefined;
            return {
                name: a.name,
                quantity: a.quantity,
                trust: a.trust,
                cardId: a.cardId,
                note,
                resourceTaxon: a.resourceTaxon,
                resourceContextLabel: a.resourceContextLabel,
                resourceContextTitle: a.resourceContextTitle,
            };
        })
        .sort((a, b) => {
            if (a.trust !== b.trust) return a.trust === 'verified' ? -1 : 1;
            return a.name.localeCompare(b.name, 'fr');
        });

    const verifiedCount = rows.filter((r) => r.trust === 'verified').length;

    return {
        id: 'insight-fidraulis-gy-synchro',
        kind: 'fidraulis_gy_synchro',
        severity: 'active',
        title: INSIGHT_FIDRAULIS_GY_TITLE,
        summary: insightFidraulisGySummary(rows.length, verifiedCount),
        details: {
            helpLine: INSIGHT_FIDRAULIS_GY_HELP_LINE,
            fidraulisGy: { rows },
        },
    };
}
