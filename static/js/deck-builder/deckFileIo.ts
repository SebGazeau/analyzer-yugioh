/**
 * Export / import JSON du deck (fichier local, hors API serveur).
 */
import type { Card } from '../api.js';
import { DECK_SECTIONS, type DeckSection } from '../deckSection.js';

/** Ligne telle que sérialisée dans deck.json. */
export interface DeckFileExportRow {
    name: string;
    quantity: number;
    engine: string;
    categories: string[];
    cardId?: number;
    deckCopyId?: number;
}

export function rowToDeckJsonEntry(r: DeckFileExportRow): Record<string, unknown> {
    const o: Record<string, unknown> = {
        name: r.name,
        quantity: r.quantity,
        engine: r.engine || undefined,
        categories: r.categories.length ? r.categories : undefined,
    };
    if (r.cardId != null && r.cardId > 0) o.id = r.cardId;
    if (r.deckCopyId != null && r.deckCopyId > 0) o.deck_copy_id = r.deckCopyId;
    return o;
}

export type DeckJsonFilePayload = { [S in DeckSection]: Record<string, unknown>[] };

export function buildDeckJsonExportPayload<T extends DeckFileExportRow>(
    sections: Record<DeckSection, T[]>,
): DeckJsonFilePayload {
    return Object.fromEntries(DECK_SECTIONS.map((s) => [s, sections[s].map(rowToDeckJsonEntry)])) as DeckJsonFilePayload;
}

export function downloadJsonFile(filename: string, payload: unknown): void {
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/** Ligne résolue prête à être poussée dans l’état du builder. */
export interface ResolvedImportDeckRow {
    name: string;
    type: string;
    quantity: number;
    engine: string;
    categories: string[];
    imageUrl?: string;
    attribute?: string;
    level?: number;
    race?: string;
    frame_type?: string;
    maxCopies: number;
    cardId?: number;
    deckCopyId?: number;
}

export interface DeckJsonImportDeps {
    fetchCardByName: (name: string) => Promise<Card | null>;
    banTcgToMaxCopies: (ban: string | undefined) => number;
    resetDeck: () => void;
    pushRow: (section: DeckSection, row: ResolvedImportDeckRow) => void;
    refreshAllGrids: () => void;
    afterImportStats: () => void;
}

/**
 * Applique le JSON parsé (tableau main-only ou { main, extra, side }).
 * @returns noms des cartes introuvables via l’API.
 */
export async function applyParsedDeckJson(data: unknown, deps: DeckJsonImportDeps): Promise<string[]> {
    const { fetchCardByName, banTcgToMaxCopies, resetDeck, pushRow, refreshAllGrids, afterImportStats } = deps;
    resetDeck();

    const failedCards: string[] = [];

    const addEntries = async (entries: unknown[], section: DeckSection): Promise<void> => {
        for (const raw of entries) {
            const card = raw as {
                name?: string;
                quantity?: number;
                id?: number;
                deck_copy_id?: number;
                engine?: string;
                categories?: string[];
            };
            if (typeof card.name !== 'string') continue;
            const infoCard = await fetchCardByName(card.name);
            if (!infoCard) {
                failedCards.push(card.name);
                continue;
            }
            const cid =
                typeof card.id === 'number' && card.id > 0
                    ? card.id
                    : typeof infoCard.id === 'number'
                      ? infoCard.id
                      : undefined;
            const dcid =
                typeof card.deck_copy_id === 'number' && card.deck_copy_id > 0
                    ? card.deck_copy_id
                    : typeof cid === 'number'
                      ? cid
                      : undefined;
            pushRow(section, {
                name: infoCard.name_en ?? infoCard.name,
                type: infoCard.type ?? '',
                quantity: card.quantity ?? 1,
                engine: card.engine ?? '',
                categories: card.categories ?? [],
                imageUrl: infoCard.image_url ?? undefined,
                attribute: typeof infoCard.attribute === 'string' ? infoCard.attribute : undefined,
                level: typeof infoCard.level === 'number' ? infoCard.level : undefined,
                race: typeof infoCard.race === 'string' ? infoCard.race : undefined,
                frame_type: typeof infoCard.frame_type === 'string' ? infoCard.frame_type : undefined,
                maxCopies: banTcgToMaxCopies(typeof infoCard.ban_tcg === 'string' ? infoCard.ban_tcg : undefined),
                cardId: cid,
                deckCopyId: dcid,
            });
        }
    };

    if (Array.isArray(data)) {
        await addEntries(data, 'main');
    } else if (data && typeof data === 'object') {
        const o = data as Partial<Record<DeckSection, unknown>>;
        if (!DECK_SECTIONS.some((s) => Boolean(o[s]))) {
            throw new Error('Format JSON invalide (attendu: { main, extra, side } ou tableau)');
        }
        for (const section of DECK_SECTIONS) {
            const raw = o[section];
            await addEntries(Array.isArray(raw) ? raw : [], section);
        }
    } else {
        throw new Error('Format JSON invalide (attendu: { main, extra, side } ou tableau)');
    }

    refreshAllGrids();
    afterImportStats();
    return failedCards;
}

/** Lit `<input type="file">` et applique le JSON (async dans onload). */
export function runDeckImportFromFileInput(event: Event, deps: DeckJsonImportDeps): void {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const raw = (e.target && (e.target as FileReader).result) as string;
            const data = JSON.parse(raw || '{}');
            const failedCards = await applyParsedDeckJson(data, deps);
            if (failedCards.length > 0) {
                console.warn('Import: cartes non trouvées:', failedCards);
                alert(
                    `${failedCards.length} carte(s) non trouvée(s):\n${failedCards.slice(0, 10).join('\n')}${failedCards.length > 10 ? `\n... et ${failedCards.length - 10} autre(s)` : ''}`,
                );
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            alert("Erreur à l'import : " + msg);
        }
    };
    reader.readAsText(file);
}
