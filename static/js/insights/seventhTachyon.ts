/**
 * Règle : Seventh Tachyon — cibles Main (Type OU Attribut identique, Niveau = Rang du Number révélé).
 *
 * Heuristiques (données déjà présentes sur les lignes deck / API) :
 * - Le numéro « Number 101 » … « Number 107 » est extrait du nom anglais via regex (supporte « Number C101 », etc.).
 * - Le rang des Xyz est lu depuis `level` (champ YGOPro / API : rang stocké comme level pour les Xyz).
 */
import type {
    DeckInsight,
    InsightCardRef,
    InsightDeckSnapshot,
    InsightDeckRow,
    MatchingCardPreview,
    NumberXyzSuggestion,
} from './types.js';

const HELP_LINE =
    'Une activation par tour. Le reste de l’effet (bannissement, dégâts, etc.) n’est pas simulé ici.';

const ST_NAME_NORM = 'seventh tachyon';

function normalizeName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

/** Extrait 101–107 depuis le nom ; null si absent. */
export function extractNumberIndexFromName(name: string): number | null {
    const m = name.match(/number\s+(?:c)?(10[1-7])\b/i);
    if (!m) return null;
    return parseInt(m[1], 10);
}

function isSpell(row: InsightDeckRow): boolean {
    return (row.type || '').toLowerCase().includes('spell');
}

function isXyzMonster(row: InsightDeckRow): boolean {
    const t = (row.type || '').toLowerCase();
    if (t.includes('xyz')) return true;
    const f = (row as { frame_type?: string }).frame_type?.toLowerCase() ?? '';
    return f === 'xyz';
}

function isMainDeckMonster(row: InsightDeckRow): boolean {
    const t = (row.type || '').toLowerCase();
    if (!t.includes('monster')) return false;
    if (t.includes('fusion') || t.includes('synchro') || t.includes('xyz') || t.includes('link')) return false;
    const f = (row as { frame_type?: string }).frame_type?.toLowerCase() ?? '';
    if (f === 'fusion' || f === 'synchro' || f === 'xyz' || f === 'link') return false;
    return true;
}

function isSeventhTachyon(row: InsightDeckRow): boolean {
    return isSpell(row) && normalizeName(row.name) === ST_NAME_NORM;
}

function normAttr(a: string | undefined): string {
    return (a ?? '').trim().toLowerCase();
}

function normRace(r: string | undefined): string {
    return (r ?? '').trim().toLowerCase();
}

function targetsForXyz(xyz: InsightDeckRow, main: InsightDeckRow[]): InsightCardRef[] {
    const rank = xyz.level;
    if (rank == null || !Number.isFinite(rank)) return [];

    const xyzAttr = normAttr(xyz.attribute);
    const xyzRace = normRace(xyz.race);

    const byName = new Map<string, number>();

    for (const row of main) {
        if (!isMainDeckMonster(row)) continue;
        const lv = row.level;
        if (lv == null || lv !== rank) continue;

        const sameRace = xyzRace !== '' && normRace(row.race) === xyzRace;
        const sameAttr = xyzAttr !== '' && normAttr(row.attribute) === xyzAttr;
        if (!sameRace && !sameAttr) continue;

        const n = row.name;
        byName.set(n, (byName.get(n) ?? 0) + row.quantity);
    }

    return [...byName.entries()]
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

function deckHasSeventhTachyon(deck: InsightDeckSnapshot): boolean {
    const inSection = (rows: InsightDeckRow[]) => rows.some((r) => r.quantity > 0 && isSeventhTachyon(r));
    return inSection(deck.main) || inSection(deck.side ?? []);
}

function qualifyingNumberXyz(extra: InsightDeckRow[]): InsightDeckRow[] {
    return extra.filter(
        (r) => r.quantity > 0 && isXyzMonster(r) && extractNumberIndexFromName(r.name) != null,
    );
}

/**
 * Catalogue statique Number 101–107 et Number C101–C107 (noms anglais alignés YGOPro / recherche).
 * Attribut & race servent à repérer les Xyz qui « matchent » déjà ton Main/Side.
 */
const NUMBER_10X_CATALOG: ReadonlyArray<{
    name: string;
    numberIndex: number;
    rank: number;
    attribute: string;
    race: string;
    isChaos?: boolean;
}> = [
    { name: 'Number 101: Silent Honor ARK', numberIndex: 101, rank: 4, attribute: 'WATER', race: 'Aqua' },
    { name: 'Number C101: Silent Honor DARK', numberIndex: 101, rank: 4, attribute: 'DARK', race: 'Aqua', isChaos: true },
    { name: 'Number 102: Star Seraph Sentry', numberIndex: 102, rank: 4, attribute: 'LIGHT', race: 'Fairy' },
    { name: 'Number C102: Archfiend Seraph', numberIndex: 102, rank: 4, attribute: 'LIGHT', race: 'Fairy', isChaos: true },
    { name: 'Number 103: Ragnazero', numberIndex: 103, rank: 4, attribute: 'WIND', race: 'Thunder' },
    { name: 'Number C103: Ragnafinity', numberIndex: 103, rank: 4, attribute: 'WIND', race: 'Thunder', isChaos: true },
    { name: 'Number 104: Masquerade', numberIndex: 104, rank: 4, attribute: 'LIGHT', race: 'Spellcaster' },
    { name: 'Number C104: Umbral Horror Masquerade', numberIndex: 104, rank: 4, attribute: 'DARK', race: 'Spellcaster', isChaos: true },
    { name: 'Number 105: Battlin\' Boxer Star Cestus', numberIndex: 105, rank: 4, attribute: 'FIRE', race: 'Warrior' },
    { name: 'Number C105: Battlin\' Boxer Comet Cestus', numberIndex: 105, rank: 4, attribute: 'FIRE', race: 'Warrior', isChaos: true },
    { name: 'Number 106: Giant Hand', numberIndex: 106, rank: 4, attribute: 'EARTH', race: 'Rock' },
    { name: 'Number C106: Giant Red Hand', numberIndex: 106, rank: 4, attribute: 'EARTH', race: 'Rock', isChaos: true },
    { name: 'Number 107: Galaxy-Eyes Tachyon Dragon', numberIndex: 107, rank: 8, attribute: 'LIGHT', race: 'Dragon' },
    { name: 'Number C107: Neo Galaxy-Eyes Tachyon Dragon', numberIndex: 107, rank: 8, attribute: 'LIGHT', race: 'Dragon', isChaos: true },
];

/** Cartes Main ou Side récupérables avec ce Number (niveau = rang, type OU attribut). Agrégation par (nom, section). */
function matchingCardsForCatalogEntry(
    entry: (typeof NUMBER_10X_CATALOG)[number],
    main: InsightDeckRow[],
    side: InsightDeckRow[],
): MatchingCardPreview[] {
    const exAttr = normAttr(entry.attribute);
    const exRace = normRace(entry.race);
    const out: MatchingCardPreview[] = [];

    const collect = (rows: InsightDeckRow[], section: 'main' | 'side') => {
        const byName = new Map<string, { quantity: number; imageUrl?: string }>();
        for (const row of rows) {
            if (!isMainDeckMonster(row)) continue;
            const lv = row.level;
            if (lv == null || lv !== entry.rank) continue;
            const sameRace = exRace !== '' && normRace(row.race) === exRace;
            const sameAttr = exAttr !== '' && normAttr(row.attribute) === exAttr;
            if (!sameRace && !sameAttr) continue;

            const n = row.name;
            const img = row.imageUrl;
            const prev = byName.get(n);
            if (prev) {
                prev.quantity += row.quantity;
                if (!prev.imageUrl && img) prev.imageUrl = img;
            } else {
                byName.set(n, { quantity: row.quantity, imageUrl: img });
            }
        }
        for (const [name, v] of [...byName.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
            out.push({ name, quantity: v.quantity, imageUrl: v.imageUrl, section });
        }
    };

    collect(main, 'main');
    collect(side, 'side');
    out.sort((a, b) => a.name.localeCompare(b.name) || (a.section === 'main' && b.section === 'side' ? -1 : a.section === 'side' && b.section === 'main' ? 1 : 0));
    return out;
}

function buildSuggestedNumberXyz(deck: InsightDeckSnapshot): NumberXyzSuggestion[] {
    const side = deck.side ?? [];
    const withFlags = NUMBER_10X_CATALOG.map((c) => {
        const matchingCards = matchingCardsForCatalogEntry(c, deck.main, side);
        return {
            name: c.name,
            numberIndex: c.numberIndex,
            rank: c.rank,
            attribute: c.attribute,
            race: c.race,
            matchesDeck: matchingCards.length > 0,
            matchingCards,
        };
    });
    withFlags.sort((a, b) => {
        if (a.matchesDeck !== b.matchesDeck) return a.matchesDeck ? -1 : 1;
        if (a.numberIndex !== b.numberIndex) return a.numberIndex - b.numberIndex;
        return a.name.localeCompare(b.name);
    });
    return withFlags;
}

/**
 * Retourne un insight `seventh_tachyon` si le deck contient Seventh Tachyon (Main ou Side), sinon `null`.
 */
export function computeSeventhTachyonInsight(deck: InsightDeckSnapshot): DeckInsight | null {
    if (!deckHasSeventhTachyon(deck)) return null;

    const xyzList = qualifyingNumberXyz(deck.extra);
    if (xyzList.length === 0) {
        const suggestedNumberXyz = buildSuggestedNumberXyz(deck);
        const prio = suggestedNumberXyz.filter((s) => s.matchesDeck).length;
        const summary =
            prio > 0
                ? `Extra Deck sans Number 101–107 ni C101–C107. ${prio} proposition(s) ci-dessous correspondent à des monstres dans ton Main ou ton Side (niveau = rang, type ou attribut). Les autres complètent la liste.`
                : 'Extra Deck sans monstre Xyz « Number » 101–107 ou C101–C107. Voici les 14 cartes de la série : privilégie celles dont le rang égale un niveau de monstre dans ton Main/Side et qui partagent type ou attribut.';
        return {
            id: 'insight-seventh-tachyon',
            kind: 'seventh_tachyon',
            severity: 'info',
            title: 'Seventh Tachyon',
            summary,
            details: {
                helpLine: HELP_LINE,
                seventhTachyon: { suggestedNumberXyz },
            },
        };
    }

    const byXyzName = new Map<string, { xyz: InsightDeckRow; numberIndex: number }>();
    for (const xyz of xyzList) {
        const num = extractNumberIndexFromName(xyz.name);
        if (num == null) continue;
        const key = normalizeName(xyz.name);
        if (!byXyzName.has(key)) byXyzName.set(key, { xyz, numberIndex: num });
    }

    const xyzGroups = [...byXyzName.values()]
        .map(({ xyz, numberIndex }) => {
            const rank = xyz.level ?? 0;
            const targets = targetsForXyz(xyz, deck.main);
            return {
                xyzName: xyz.name,
                numberIndex,
                rank,
                targets,
            };
        })
        .sort((a, b) => a.numberIndex - b.numberIndex || a.xyzName.localeCompare(b.xyzName));

    const uniqueNames = new Set<string>();
    for (const g of xyzGroups) for (const t of g.targets) uniqueNames.add(t.name);

    const uniqueTargetCount = uniqueNames.size;

    let summary: string;
    if (uniqueTargetCount === 0) {
        summary =
            'Aucun monstre du Main ne correspond (Type ou Attribut identique au Number révélé, Niveau = Rang).';
    } else {
        summary = `${uniqueTargetCount} carte(s) distincte(s) dans le Main peuvent être ajoutées à la main (Type ou Attribut identique, Niveau = Rang).`;
    }

    return {
        id: 'insight-seventh-tachyon',
        kind: 'seventh_tachyon',
        severity: 'active',
        title: 'Seventh Tachyon',
        summary,
        details: {
            helpLine: HELP_LINE,
            seventhTachyon: { xyzGroups, uniqueTargetCount },
        },
    };
}

/** Exposé pour tests (catalogue + scoring). */
export { NUMBER_10X_CATALOG, buildSuggestedNumberXyz, matchingCardsForCatalogEntry };
