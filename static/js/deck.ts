// Gestion du deck Yu-Gi-Oh! — state + grille de cartes
import { setAnalysisDeckName, syncBuilderStatsFromDeck } from './stats.js';
import { fetchCardByName, Card } from './api.js';
import { cleanDeckCardDisplayName } from './analysis/categorySummaryData.js';
import { clearCategorySummaryTableBody } from './analysis/categorySummaryDom.js';
import { DECK_SECTIONS, type DeckSection } from './deckSection.js';
import { isExtraDeckRowLike } from './deck-move.js';
import {
    createDeckCardPopover,
    type DeckCardPopoverApi,
} from './deck-builder/card-edit-popover/deckCardPopover.js';
import {
    getDeckCover,
    removeDeckCoverFromStorage,
    setDeckCover,
} from './deck-builder/deckCoverStorage.js';
import { DECK_GRID_IDS, DECK_DND_PAYLOAD_TYPE } from './deck-builder/deckConstants.js';
import { banTcgToMaxCopies } from './deck-builder/deckLimitGroups.js';
import {
    apiCreateDeck,
    apiDeleteDeck,
    apiDuplicateDeck,
    apiFetchDeckById,
    apiListMyDecks,
    apiUpdateDeck,
    buildDeckSectionsPayload,
} from './deck-builder/deckApi.js';
import {
    buildDeckJsonExportPayload,
    downloadJsonFile,
    runDeckImportFromFileInput,
} from './deck-builder/deckFileIo.js';
import { bindDeckDragAndDropRoot, executeDeckRowMove } from './deck-builder/grid/deckDragDrop.js';
import { renderDeckGridSection } from './deck-builder/grid/deckGridRender.js';
import { readDeckNameFromBuilderInput, writeDeckNameToBuilderInput } from './deck-builder/deckNameInputDom.js';
import { dispatchDeckSortChanged } from './deck-builder/deckSortEvents.js';
import { tryAddCardToDeckSection } from './deck-builder/tryAddCardToDeckSection.js';
import {
    clearLoadedDeckRecord,
    getCurrentLoadedDeck,
    setLoadedDeckRecord,
} from './deck-builder/loadedDeckSession.js';
import {
    parseUnknownAsServerDeckListEntries,
    resolveServerDeckListEntriesToRows,
} from './deck-builder/serverDeckHydration.js';
import { syncDeckSaveUpdateButtonsDom } from './deck-builder/deckSaveUpdateButtonsDom.js';
import {
    createMainDeckSortStore,
    deckCardTypeKind,
    type MainDeckSortStore,
} from './deck-builder/mainDeckSort.js';

export type { DeckEntryPayload } from './deck-builder/deckApi.js';
export { toDeckEntryPayload } from './deck-builder/deckApi.js';

export type { MainDeckSortBy, MainDeckSortDir } from './deck-builder/mainDeckSort.js';

export { getDeckCover, setDeckCover } from './deck-builder/deckCoverStorage.js';
export { getCurrentLoadedDeck } from './deck-builder/loadedDeckSession.js';

export const cleanCardNameFromCell = cleanDeckCardDisplayName;

export type { DeckSection, DeckSectionMainSide } from './deckSection.js';
export { DECK_SECTIONS, isDeckSection, isDeckSectionMainSide } from './deckSection.js';

export interface DeckRow {
    name: string;
    type: string;
    quantity: number;
    engine: string;
    categories: string[];
    imageUrl?: string;
    /** Attribut (monstres) : DARK, LIGHT, etc. */
    attribute?: string;
    /** Niveau ou rang (monstres). */
    level?: number;
    /** Race / type détaillé : Dragon, Spellcaster (monstres) ; Quick-Play, Normal (spells/traps). */
    race?: string;
    /** Sous-type affichage : normal, effect, quickplay, continuous, etc. */
    frame_type?: string;
    /** Nombre max d'exemplaires autorisés par la banlist TCG (0=Forbidden, 1=Limited, 2=Semi-Limited, 3=illimité). */
    maxCopies?: number;
    /** Passcode API (id carte) : impression réelle pour la sauvegarde en base. */
    cardId?: number;
    /** Identité « règle exemplaires » (alias *always treated as*, ex. White Dragon + Albaz) : plusieurs lignes OK, total ≤ max. */
    deckCopyId?: number;
}

function allDeckRowsFlat(): DeckRow[] {
    return [...mainDeck, ...extraDeck, ...sideDeck];
}

let mainDeck: DeckRow[] = [];
let extraDeck: DeckRow[] = [];
let sideDeck: DeckRow[] = [];

function getState(section: DeckSection): DeckRow[] {
    switch (section) {
        case 'main': return mainDeck;
        case 'extra': return extraDeck;
        case 'side': return sideDeck;
    }
}

/** Retourne le snapshot du deck pour stats/export. Inclut imageUrl pour getCardImageUrl. */
export function getDeckState(): { main: DeckRow[]; extra: DeckRow[]; side: DeckRow[] } {
    return {
        main: [...mainDeck],
        extra: [...extraDeck],
        side: [...sideDeck],
    };
}

function setCurrentLoadedDeck(id: number, name: string): void {
    setLoadedDeckRecord(id, name);
    syncDeckSaveUpdateButtonsDom();
}

export function clearCurrentLoadedDeck(): void {
    clearLoadedDeckRecord();
    setAnalysisDeckName('');
    syncDeckSaveUpdateButtonsDom();
}

/** À appeler au chargement du builder si le DOM a été restauré sans passer par clear/load. */
export function refreshDeckSaveUpdateButtons(): void {
    syncDeckSaveUpdateButtonsDom();
}

export function getDeckName(): string {
    return readDeckNameFromBuilderInput();
}

export function setDeckName(name: string): void {
    writeDeckNameToBuilderInput(name);
    setAnalysisDeckName(name);
}

export function isExtraDeckCard(card: Card): boolean {
    return isExtraDeckRowLike({
        type: card.type || '',
        frame_type: typeof card.frame_type === 'string' ? card.frame_type : undefined,
        quantity: 1,
    });
}

export function isExtraDeckRow(row: DeckRow): boolean {
    return isExtraDeckRowLike(row);
}

let deckCardPopoverApi!: DeckCardPopoverApi;
let mainDeckSortStore!: MainDeckSortStore;

function renderDeckSection(section: DeckSection): void {
    renderDeckGridSection(
        section,
        DECK_GRID_IDS[section],
        getState(section),
        deckCardTypeKind,
        removeOneDeckCopy,
        (s, i, el) => deckCardPopoverApi.openPopover(s, i, el),
    );
}

function renderAllDeckGridSections(): void {
    for (const s of DECK_SECTIONS) {
        renderDeckSection(s);
    }
}

function removeOneDeckCopy(section: DeckSection, index: number): void {
    if (deckCardPopoverApi.isOpen()) {
        deckCardPopoverApi.persistEdits();
    }
    const active = deckCardPopoverApi.getActiveCell();
    const wasEditingHere = active != null && active.section === section && active.index === index;
    const arr = getState(section);
    const row = arr[index];
    if (!row) return;
    if (row.quantity > 1) {
        row.quantity -= 1;
        renderDeckSection(section);
        syncBuilderStatsFromDeck();
        if (wasEditingHere) {
            const cell = document.querySelector(
                `[data-deck-cell-section="${section}"][data-deck-cell-index="${index}"]`,
            ) as HTMLElement | null;
            if (cell) deckCardPopoverApi.openPopover(section, index, cell);
        }
    } else {
        arr.splice(index, 1);
        renderDeckSection(section);
        syncBuilderStatsFromDeck();
        deckCardPopoverApi.hide();
    }
}

deckCardPopoverApi = createDeckCardPopover({
    getState,
    allDeckRowsFlat,
    renderDeckSection,
    afterDeckDataChange: () => syncBuilderStatsFromDeck(),
    getCurrentLoadedDeck,
    setDeckCover,
    updateDeckOnServer,
});

mainDeckSortStore = createMainDeckSortStore({
    getMainDeck: () => mainDeck,
    renderMain: () => renderDeckSection('main'),
    afterVisualUpdate: () => syncBuilderStatsFromDeck(),
});

export function getMainDeckSortState(): ReturnType<MainDeckSortStore['getState']> {
    return mainDeckSortStore.getState();
}

export function setMainDeckSortByType(): void {
    mainDeckSortStore.setByType();
}

export function setMainDeckSortByCategory(categoryName: string | null): void {
    mainDeckSortStore.setByCategory(categoryName);
}

export function cleanCardTable(): void {
    mainDeck = [];
    extraDeck = [];
    sideDeck = [];
    mainDeckSortStore.resetForCleanTable();
    dispatchDeckSortChanged();
    renderAllDeckGridSections();
    clearCategorySummaryTableBody();
    clearCurrentLoadedDeck();
    setDeckName('');
    syncBuilderStatsFromDeck();
}

export async function addToDeck(card: Card, sectionOverride?: DeckSection): Promise<boolean> {
    const section: DeckSection =
        sectionOverride ?? (isExtraDeckCard(card) ? 'extra' : 'main');
    const arr = getState(section);
    const result = tryAddCardToDeckSection(card, arr, allDeckRowsFlat());
    if (!result.ok) return false;
    renderDeckSection(section);
    syncBuilderStatsFromDeck();
    return true;
}

export async function saveDeckToServer(): Promise<{ id?: number; error?: string }> {
    const name = getDeckName() || prompt('Nom du deck ?') || '';
    if (!name.trim()) return {};
    const sections = buildDeckSectionsPayload(mainDeck, extraDeck, sideDeck);
    const result = await apiCreateDeck(name, sections);
    if (result.id != null) {
        setCurrentLoadedDeck(result.id, name.trim());
        setDeckName(name.trim());
    }
    return result;
}

export async function updateDeckOnServer(): Promise<{ ok?: boolean; error?: string }> {
    const deck = getCurrentLoadedDeck();
    if (!deck) return { error: 'Aucun deck chargé. Chargez un deck ou sauvegardez-en un nouveau.' };
    const sections = buildDeckSectionsPayload(mainDeck, extraDeck, sideDeck);
    const name = getDeckName() || deck.name;
    const cover = getDeckCover(deck.id);
    const result = await apiUpdateDeck(deck.id, name, sections, cover);
    if (result.ok) setCurrentLoadedDeck(deck.id, name);
    return result;
}

export async function listMyDecks(): Promise<
    { id: number; name: string; is_public: boolean; created_at: string; cover_card_name?: string; cover_image_url?: string }[]
> {
    return apiListMyDecks();
}

/** Duplique un deck serveur : nouveau deck nommé « {nom} (copie) » avec le même contenu. */
export async function duplicateDeckOnServer(id: number): Promise<{ id?: number; error?: string }> {
    return apiDuplicateDeck(id);
}

export async function loadDeckFromServer(id: number): Promise<boolean> {
    const data = await apiFetchDeckById(id);
    if (!data) return false;
    cleanCardTable();

    const pushSection = async (raw: unknown, section: DeckSection) => {
        const entries = parseUnknownAsServerDeckListEntries(raw);
        const rows = await resolveServerDeckListEntriesToRows(entries, fetchCardByName);
        getState(section).push(...rows);
    };
    const rawBySection: Record<DeckSection, unknown> = {
        main: data.main,
        extra: data.extra,
        side: data.side,
    };
    for (const section of DECK_SECTIONS) {
        await pushSection(rawBySection[section], section);
    }
    renderAllDeckGridSections();
    const loadedName = String(data.name ?? 'Sans nom');
    const deckId = typeof data.id === 'number' ? data.id : id;
    setCurrentLoadedDeck(deckId, loadedName);
    setDeckName(loadedName);
    if (data.cover_image_url != null || data.cover_card_name != null) {
        setDeckCover(
            deckId,
            typeof data.cover_image_url === 'string' ? data.cover_image_url : '',
            typeof data.cover_card_name === 'string' ? data.cover_card_name : '',
        );
    }
    syncBuilderStatsFromDeck();
    return true;
}

/** Supprime un deck sur le serveur (DELETE /decks/:id). Retourne true si succès. */
export async function deleteDeckFromServer(id: number): Promise<boolean> {
    const ok = await apiDeleteDeck(id);
    if (!ok) return false;
    const loaded = getCurrentLoadedDeck();
    if (loaded?.id === id) clearCurrentLoadedDeck();
    removeDeckCoverFromStorage(id);
    return true;
}

export function exportDeckToFile(): void {
    downloadJsonFile('deck.json', buildDeckJsonExportPayload({ main: mainDeck, extra: extraDeck, side: sideDeck }));
}

export function importDeckFromFile(event: Event): void {
    runDeckImportFromFileInput(event, {
        fetchCardByName,
        banTcgToMaxCopies,
        resetDeck: cleanCardTable,
        pushRow: (section, row) => {
            getState(section).push(row as DeckRow);
        },
        refreshAllGrids: () => {
            renderAllDeckGridSections();
        },
        afterImportStats: () => syncBuilderStatsFromDeck(),
    });
}

/** No-op pour compatibilité : la grille cartes n'a pas de tri par colonne. */
export function enableColumnSort(_gridId: string, _cols: number, _onSort?: () => void): void {}

/** No-op pour compatibilité : suppression via popover ou bouton « − » sur la carte. */
export function enableGridRowDeletion(_gridSelector: string, _cols: number, _btnClass?: string, _onDelete?: () => void): void {}

function afterDeckStructureChange(): void {
    mainDeckSortStore.clearAfterStructureChange();
    syncBuilderStatsFromDeck();
    dispatchDeckSortChanged();
}

/**
 * Déplace une ligne de carte (réordonnancement ou changement de zone Main / Extra / Side).
 * @param dropOnIndex insérer avant cette position ; utiliser `length` pour la fin.
 */
export function moveDeckRow(
    fromSection: DeckSection,
    fromIndex: number,
    dropSection: DeckSection,
    dropOnIndex: number,
): boolean {
    return executeDeckRowMove(fromSection, fromIndex, dropSection, dropOnIndex, {
        getState,
        renderSection: renderDeckSection,
        afterStructureChange: afterDeckStructureChange,
    });
}

/** Branche drag-and-drop sur `.deck-sections` (délégation, survit aux re-rendus de grille). */
export function bindDeckDragAndDrop(): void {
    bindDeckDragAndDropRoot({
        moveRow: moveDeckRow,
        hidePopover: () => deckCardPopoverApi.hide(),
        getSectionLength: (section) => getState(section).length,
        gridIds: DECK_GRID_IDS,
        dndPayloadType: DECK_DND_PAYLOAD_TYPE,
    });
}
