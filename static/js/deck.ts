// Gestion du deck Yu-Gi-Oh! — state + grille de cartes
import { updateDeckCount, updateProbabilities, computeGlobalStats, setAnalysisDeckName } from './stats.js';
import { createCategorySelector } from './category.js';
import { fetchCardByName, Card } from './api.js';

export type DeckSection = 'main' | 'extra' | 'side';

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
}

/** Forbidden=0, Limited=1, Semi-Limited=2, sinon 3. */
function banTcgToMaxCopies(ban: string | undefined): number {
    const s = (ban ?? '').toLowerCase();
    if (s.includes('forbidden') || s === 'banned') return 0;
    if (s.includes('limited') && !s.includes('semi')) return 1;
    if (s.includes('semi')) return 2;
    return 3;
}

const DECK_GRID_IDS: Record<DeckSection, string> = {
    main: 'deck-main-grid',
    extra: 'deck-extra-grid',
    side: 'deck-side-grid',
};

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

/** Tri Main Deck : état et application. */
export type MainDeckSortBy = 'none' | 'type' | 'category';
export type MainDeckSortDir = 'asc' | 'desc';

let mainDeckSortBy: MainDeckSortBy = 'none';
let mainDeckSortCategory: string | null = null;
let mainDeckSortDir: MainDeckSortDir = 'asc';

export function getMainDeckSortState(): { by: MainDeckSortBy; category: string | null; dir: MainDeckSortDir } {
    return { by: mainDeckSortBy, category: mainDeckSortCategory, dir: mainDeckSortDir };
}

function typeOrder(row: DeckRow): number {
    const k = typeKind(row.type);
    return k === 'monster' ? 0 : k === 'spell' ? 1 : 2;
}

function applyMainDeckSort(): void {
    if (mainDeckSortBy === 'none') return;
    const dir = mainDeckSortDir === 'asc' ? 1 : -1;
    if (mainDeckSortBy === 'type') {
        mainDeck.sort((a, b) => dir * (typeOrder(a) - typeOrder(b)));
        return;
    }
    if (mainDeckSortBy === 'category' && mainDeckSortCategory !== null) {
        const cat = mainDeckSortCategory;
        mainDeck.sort((a, b) => {
            const aHas = a.categories && a.categories.includes(cat) ? 1 : 0;
            const bHas = b.categories && b.categories.includes(cat) ? 1 : 0;
            if (aHas !== bHas) return dir * (bHas - aHas); // avec catégorie en premier si asc
            return dir * (typeOrder(a) - typeOrder(b));
        });
        return;
    }
    // Tri par première catégorie (titre "Catégories" cliqué)
    mainDeck.sort((a, b) => {
        const aCat = (a.categories && a.categories[0]) ?? '';
        const bCat = (b.categories && b.categories[0]) ?? '';
        const cmp = aCat.localeCompare(bCat);
        if (cmp !== 0) return dir * cmp;
        return dir * (typeOrder(a) - typeOrder(b));
    });
}

/** Bascule tri par type (Composition). Cycle: asc → desc → none. */
export function setMainDeckSortByType(): void {
    if (mainDeckSortBy === 'type') {
        if (mainDeckSortDir === 'asc') { mainDeckSortDir = 'desc'; } else { mainDeckSortBy = 'none'; mainDeckSortDir = 'asc'; return; }
    } else {
        mainDeckSortBy = 'type';
        mainDeckSortCategory = null;
        mainDeckSortDir = 'asc';
    }
    applyMainDeckSort();
    renderDeckSection('main');
    updateDeckCount();
    computeGlobalStats();
    window.dispatchEvent(new CustomEvent('deck-sort-changed'));
}

/** Tri par catégorie. Si categoryName == null, tri par première catégorie; sinon cartes ayant cette catégorie d'abord. */
export function setMainDeckSortByCategory(categoryName: string | null): void {
    if (mainDeckSortBy === 'category' && mainDeckSortCategory === categoryName) {
        if (mainDeckSortDir === 'asc') { mainDeckSortDir = 'desc'; } else { mainDeckSortBy = 'none'; mainDeckSortCategory = null; mainDeckSortDir = 'asc'; applyMainDeckSort(); renderDeckSection('main'); updateDeckCount(); computeGlobalStats(); window.dispatchEvent(new CustomEvent('deck-sort-changed')); return; }
    }
    mainDeckSortBy = 'category';
    mainDeckSortCategory = categoryName;
    mainDeckSortDir = 'asc';
    applyMainDeckSort();
    renderDeckSection('main');
    updateDeckCount();
    computeGlobalStats();
    window.dispatchEvent(new CustomEvent('deck-sort-changed'));
}

/** Retourne le snapshot du deck pour stats/export. Inclut imageUrl pour getCardImageUrl. */
export function getDeckState(): { main: DeckRow[]; extra: DeckRow[]; side: DeckRow[] } {
    return {
        main: [...mainDeck],
        extra: [...extraDeck],
        side: [...sideDeck],
    };
}

/** Deck actuellement chargé depuis le serveur (pour mise à jour). */
let currentLoadedDeck: { id: number; name: string } | null = null;

export function getCurrentLoadedDeck(): { id: number; name: string } | null {
    return currentLoadedDeck;
}

/** Sauvegarder (création) et Mettre à jour (deck déjà en base) ne sont jamais visibles en même temps. */
function syncDeckSaveUpdateButtons(): void {
    const saveBtn = document.getElementById('btn-save-server');
    const updateBtn = document.getElementById('btn-update-server');
    const loaded = currentLoadedDeck !== null;
    if (saveBtn instanceof HTMLElement) saveBtn.style.display = loaded ? 'none' : '';
    if (updateBtn instanceof HTMLElement) updateBtn.style.display = loaded ? '' : 'none';
}

function setCurrentLoadedDeck(id: number, name: string): void {
    currentLoadedDeck = { id, name };
    syncDeckSaveUpdateButtons();
}

export function clearCurrentLoadedDeck(): void {
    currentLoadedDeck = null;
    setAnalysisDeckName('');
    syncDeckSaveUpdateButtons();
}

/** À appeler au chargement du builder si le DOM a été restauré sans passer par clear/load. */
export function refreshDeckSaveUpdateButtons(): void {
    syncDeckSaveUpdateButtons();
}

const DECK_COVER_STORAGE_KEY = 'yugioh-deck-cover';

/** Retourne la carte de couverture pour un deck (localStorage). */
export function getDeckCover(deckId: number): { imageUrl: string; name: string } | null {
    try {
        const raw = localStorage.getItem(`${DECK_COVER_STORAGE_KEY}-${deckId}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { imageUrl?: string; name?: string };
        if (parsed && typeof parsed.name === 'string') {
            return { imageUrl: typeof parsed.imageUrl === 'string' ? parsed.imageUrl : '', name: parsed.name };
        }
    } catch (_) {}
    return null;
}

/** Définit la carte de couverture pour un deck (localStorage). */
export function setDeckCover(deckId: number, imageUrl: string, name: string): void {
    try {
        localStorage.setItem(`${DECK_COVER_STORAGE_KEY}-${deckId}`, JSON.stringify({ imageUrl, name }));
        window.dispatchEvent(new CustomEvent('deck-cover-changed', { detail: { deckId } }));
    } catch (_) {}
}

const DECK_NAME_INPUT_ID = 'deck-name-input';

export function getDeckName(): string {
    const el = document.getElementById(DECK_NAME_INPUT_ID) as HTMLInputElement | null;
    return el?.value?.trim() ?? '';
}

export function setDeckName(name: string): void {
    const el = document.getElementById(DECK_NAME_INPUT_ID) as HTMLInputElement | null;
    if (el) el.value = name;
    setAnalysisDeckName(name);
}

export function isExtraDeckCard(card: Card): boolean {
    const t = (card.type || '').toLowerCase();
    const f = (card.frame_type || '').toLowerCase();
    return (
        t.includes('fusion') || t.includes('synchro') || t.includes('xyz') || t.includes('link') ||
        f.includes('fusion') || f.includes('synchro') || f.includes('xyz') || f.includes('link')
    );
}

function typeKind(type: string): 'monster' | 'spell' | 'trap' {
    const t = type.toLowerCase();
    if (t.includes('monster')) return 'monster';
    if (t.includes('spell')) return 'spell';
    if (t.includes('trap')) return 'trap';
    return 'monster';
}

function escapeAttr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let popoverEl: HTMLElement | null = null;
let popoverSection: DeckSection | null = null;
let popoverIndex: number = -1;

const POPOVER_GAP = 4;
const VIEWPORT_MARGIN = 16;

function repositionPopover(): void {
    if (!popoverEl || !popoverEl.classList.contains('deck-card-popover--open') || popoverSection == null || popoverIndex < 0) return;
    const anchor = document.querySelector(`[data-deck-cell-section="${popoverSection}"][data-deck-cell-index="${popoverIndex}"]`) as HTMLElement | null;
    if (!anchor) {
        popoverEl.classList.remove('deck-card-popover--open');
        popoverSection = null;
        popoverIndex = -1;
        return;
    }
    const rect = anchor.getBoundingClientRect();
    const popoverHeight = popoverEl.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP - VIEWPORT_MARGIN;
    const openAbove = spaceBelow < popoverHeight;

    popoverEl.style.left = `${rect.left}px`;
    if (openAbove) {
        popoverEl.style.top = `${rect.top - popoverHeight - POPOVER_GAP}px`;
        popoverEl.classList.add('deck-card-popover--above');
    } else {
        popoverEl.style.top = `${rect.bottom + POPOVER_GAP}px`;
        popoverEl.classList.remove('deck-card-popover--above');
    }
}

function getOrCreatePopover(): HTMLElement {
    if (popoverEl) return popoverEl;
    popoverEl = document.createElement('div');
    popoverEl.className = 'deck-card-popover';
    popoverEl.setAttribute('role', 'dialog');
    popoverEl.setAttribute('aria-label', 'Modifier la carte');
    popoverEl.innerHTML = `
        <div class="deck-card-popover-inner">
            <h4 class="deck-card-popover-title">Modifier la carte</h4>
            <div class="deck-card-popover-row">
                <label>Quantité</label>
                <select class="deck-card-popover-qty">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                </select>
            </div>
            <div class="deck-card-popover-row">
                <label>Engine</label>
                <select class="deck-card-popover-engine">
                    <option value="">-</option>
                    <option value="Engine 1">Engine 1</option>
                    <option value="Engine 2">Engine 2</option>
                    <option value="Engine 3">Engine 3</option>
                    <option value="Staple">Staple</option>
                </select>
            </div>
            <div class="deck-card-popover-row deck-card-popover-cats">
                <label>Catégories</label>
                <div class="deck-card-popover-cat-container"></div>
            </div>
            <div class="deck-card-popover-actions">
                <button type="button" class="btn btn-deck btn-deck-outline deck-card-popover-cover" title="Définir cette carte comme couverture du deck (liste Mes decks)">Couverture</button>
                <button type="button" class="btn btn-deck btn-deck-danger deck-card-popover-delete">Supprimer</button>
                <button type="button" class="btn btn-deck btn-deck-outline deck-card-popover-close">Fermer</button>
            </div>
        </div>
    `;
    document.body.appendChild(popoverEl);

    const qtySelect = popoverEl.querySelector('.deck-card-popover-qty') as HTMLSelectElement;
    const engineSelect = popoverEl.querySelector('.deck-card-popover-engine') as HTMLSelectElement;
    const catContainer = popoverEl.querySelector('.deck-card-popover-cat-container') as HTMLElement;
    const deleteBtn = popoverEl.querySelector('.deck-card-popover-delete');
    const closeBtn = popoverEl.querySelector('.deck-card-popover-close');
    const coverBtn = popoverEl.querySelector('.deck-card-popover-cover');

    const close = () => {
        if (popoverEl) popoverEl.classList.remove('deck-card-popover--open');
        popoverSection = null;
        popoverIndex = -1;
    };

    const apply = () => {
        if (popoverSection == null || popoverIndex < 0) return;
        const arr = getState(popoverSection);
        const row = arr[popoverIndex];
        if (!row) return;
        row.quantity = parseInt(qtySelect?.value || '1', 10);
        row.engine = engineSelect?.value || '';
        if (catContainer?.firstElementChild && typeof (catContainer.firstElementChild as any).getCategories === 'function') {
            row.categories = (catContainer.firstElementChild as any).getCategories();
        }
        updateDeckCount();
        updateProbabilities();
        computeGlobalStats();
        if (typeof (window as any).updateCategorySummary === 'function') (window as any).updateCategorySummary();
        const cell = document.querySelector(`[data-deck-cell-section="${popoverSection}"][data-deck-cell-index="${popoverIndex}"]`);
        const badge = cell?.querySelector('.deck-card-qty');
        if (badge) badge.textContent = 'x' + row.quantity;
    };

    qtySelect?.addEventListener('change', apply);
    engineSelect?.addEventListener('change', apply);
    catContainer?.addEventListener('change', () => {
        if (catContainer.firstElementChild && typeof (catContainer.firstElementChild as any).getCategories === 'function') {
            const row = popoverSection != null && popoverIndex >= 0 ? getState(popoverSection)[popoverIndex] : null;
            if (row) row.categories = (catContainer.firstElementChild as any).getCategories();
            computeGlobalStats();
            if (typeof (window as any).updateCategorySummary === 'function') (window as any).updateCategorySummary();
        }
    });

    deleteBtn?.addEventListener('click', () => {
        if (popoverSection == null || popoverIndex < 0) return;
        const arr = getState(popoverSection);
        arr.splice(popoverIndex, 1);
        renderDeckSection(popoverSection);
        updateDeckCount();
        updateProbabilities();
        computeGlobalStats();
        if (typeof (window as any).updateCategorySummary === 'function') (window as any).updateCategorySummary();
        close();
    });

    closeBtn?.addEventListener('click', () => {
        apply();
        close();
    });
    coverBtn?.addEventListener('click', async () => {
        const deck = getCurrentLoadedDeck();
        if (popoverSection == null || popoverIndex < 0 || !deck) return;
        const arr = getState(popoverSection);
        const row = arr[popoverIndex];
        if (!row) return;
        setDeckCover(deck.id, row.imageUrl ?? '', row.name);
        close();
        await updateDeckOnServer();
    });
    popoverEl.addEventListener('click', (e) => {
        if (e.target === popoverEl) {
            apply();
            close();
        }
    });

    document.addEventListener('scroll', repositionPopover, true);
    window.addEventListener('resize', repositionPopover);

    return popoverEl;
}

function openPopover(section: DeckSection, index: number, anchor: HTMLElement): void {
    const arr = getState(section);
    const row = arr[index];
    if (!row) return;
    const popover = getOrCreatePopover();
    popoverSection = section;
    popoverIndex = index;

    const qtySelect = popover.querySelector('.deck-card-popover-qty') as HTMLSelectElement;
    const engineSelect = popover.querySelector('.deck-card-popover-engine') as HTMLSelectElement;
    const catContainer = popover.querySelector('.deck-card-popover-cat-container') as HTMLElement;
    if (qtySelect) {
        qtySelect.value = String(row.quantity);
        qtySelect.classList.remove('deck-card-popover-qty--limit-0', 'deck-card-popover-qty--limit-1', 'deck-card-popover-qty--limit-2');
        const limit = row.maxCopies ?? 3;
        if (limit < 3) qtySelect.classList.add(`deck-card-popover-qty--limit-${limit}`);
    }
    if (engineSelect) engineSelect.value = row.engine || '';
    if (catContainer) {
        catContainer.innerHTML = '';
        const selector = createCategorySelector();
        if (row.categories.length) (selector as any).setCategories?.(row.categories);
        catContainer.appendChild(selector);
    }

    const coverBtnEl = popover.querySelector('.deck-card-popover-cover') as HTMLElement | null;
    if (coverBtnEl) coverBtnEl.style.display = getCurrentLoadedDeck() ? '' : 'none';

    popover.classList.add('deck-card-popover--open');
    repositionPopover();
}

function renderDeckSection(section: DeckSection): void {
    const gridId = DECK_GRID_IDS[section];
    const container = document.getElementById(gridId);
    if (!container) return;
    const arr = getState(section);
    container.innerHTML = '';
    arr.forEach((row, index) => {
        const kind = typeKind(row.type);
        const thumbHtml = row.imageUrl
            ? `<img class="deck-card-thumb-img" src="${escapeAttr(row.imageUrl)}" alt="" loading="lazy" />`
            : '<span class="deck-card-thumb-placeholder">?</span>';
        const banBadge = row.maxCopies != null && row.maxCopies < 3
            ? `<span class="deck-card-ban-badge" title="Banlist TCG : max ${row.maxCopies} exemplaire(s)">lt. ${row.maxCopies}</span>`
            : '';
        const cell = document.createElement('div');
        cell.className = `deck-card-cell deck-card-cell--${kind}`;
        cell.setAttribute('data-deck-cell-section', section);
        cell.setAttribute('data-deck-cell-index', String(index));
        cell.setAttribute('title', row.name);
        cell.innerHTML = `
            <div class="deck-card-thumb">${thumbHtml}</div>
            ${banBadge}
            <span class="deck-card-qty">x${row.quantity}</span>
        `;
        cell.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).closest('.deck-card-cell')) {
                openPopover(section, index, cell);
            }
        });
        container.appendChild(cell);
    });
}

export function cleanCardTable(): void {
    mainDeck = [];
    extraDeck = [];
    sideDeck = [];
    mainDeckSortBy = 'none';
    mainDeckSortCategory = null;
    mainDeckSortDir = 'asc';
    window.dispatchEvent(new CustomEvent('deck-sort-changed'));
    renderDeckSection('main');
    renderDeckSection('extra');
    renderDeckSection('side');
    const tbody = document.getElementById('category-summary-body');
    if (tbody) tbody.innerHTML = '';
    clearCurrentLoadedDeck();
    setDeckName('');
    updateDeckCount();
    computeGlobalStats();
}

export async function addToDeck(card: Card, sectionOverride?: DeckSection): Promise<boolean> {
    const section: DeckSection =
        sectionOverride ?? (isExtraDeckCard(card) ? 'extra' : 'main');
    const arr = getState(section);
    const row: DeckRow = {
        name: card.name_en ?? card.name,
        type: card.type ?? '',
        quantity: 1,
        engine: '',
        categories: [],
        imageUrl: card.image_url ?? undefined,
        attribute: typeof card.attribute === 'string' ? card.attribute : undefined,
        level: typeof card.level === 'number' ? card.level : undefined,
        race: typeof card.race === 'string' ? card.race : undefined,
        frame_type: typeof card.frame_type === 'string' ? card.frame_type : undefined,
        maxCopies: banTcgToMaxCopies(typeof card.ban_tcg === 'string' ? card.ban_tcg : undefined),
    };
    arr.push(row);
    renderDeckSection(section);
    updateDeckCount();
    updateProbabilities();
    computeGlobalStats();
    return true;
}

export function cleanCardNameFromCell(raw: string): string {
    return raw.replace(/^—\s*/, '').trim();
}

type DeckEntryPayload = { name: string; quantity: number; engine?: string; categories?: string[] };

export function toDeckEntryPayload(e: { name: string; quantity: number; engine: string; categories: string[] }): DeckEntryPayload {
    const out: DeckEntryPayload = { name: e.name, quantity: e.quantity };
    if (e.engine && e.engine.trim() !== '') out.engine = e.engine.trim();
    if (e.categories && e.categories.length > 0) out.categories = e.categories;
    return out;
}

/** Cookie de session (connexion site) pour POST/GET/PUT/DELETE /decks. */
const DECK_FETCH_INIT: RequestInit = { credentials: 'same-origin' };

function deckApiErrorMessage(res: Response, data: Record<string, unknown>): string {
    if (res.status === 401) {
        return typeof data.error === 'string'
            ? data.error
            : 'Connexion requise. Connectez-vous pour enregistrer ou gérer vos decks.';
    }
    return (
        (typeof data.error === 'string' ? data.error : null) ||
        (Array.isArray(data.errors) && data.errors.length ? (data.errors as string[]).join(' ; ') : null) ||
        res.statusText
    );
}

function getDeckPayload(): { main: DeckEntryPayload[]; extra: DeckEntryPayload[]; side: DeckEntryPayload[] } {
    return {
        main: mainDeck.map(toDeckEntryPayload),
        extra: extraDeck.map(toDeckEntryPayload),
        side: sideDeck.map(toDeckEntryPayload),
    };
}

export async function saveDeckToServer(): Promise<{ id?: number; error?: string }> {
    const name = getDeckName() || prompt('Nom du deck ?') || '';
    if (!name.trim()) return {};
    const payload = getDeckPayload();
    const body = { name: name.trim(), ...payload };
    const res = await fetch('/decks', {
        ...DECK_FETCH_INIT,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
        return { error: deckApiErrorMessage(res, data) };
    }
    const id = data.id as number;
    if (id != null) {
        setCurrentLoadedDeck(id, name.trim());
        setDeckName(name.trim());
    }
    return { id };
}

export async function updateDeckOnServer(): Promise<{ ok?: boolean; error?: string }> {
    const deck = getCurrentLoadedDeck();
    if (!deck) return { error: 'Aucun deck chargé. Chargez un deck ou sauvegardez-en un nouveau.' };
    const payload = getDeckPayload();
    const name = getDeckName() || deck.name;
    const cover = getDeckCover(deck.id);
    const body: Record<string, unknown> = { name, ...payload };
    if (cover) {
        body.cover_card_name = cover.name;
        body.cover_image_url = cover.imageUrl || undefined;
    }
    const res = await fetch(`/decks/${deck.id}`, {
        ...DECK_FETCH_INIT,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
        return { error: deckApiErrorMessage(res, data) };
    }
    setCurrentLoadedDeck(deck.id, name);
    return { ok: true };
}

export async function listMyDecks(): Promise<{ id: number; name: string; is_public: boolean; created_at: string; cover_card_name?: string; cover_image_url?: string }[]> {
    const res = await fetch('/decks', DECK_FETCH_INIT);
    if (!res.ok) return [];
    return res.json();
}

/** Duplique un deck serveur : nouveau deck nommé « {nom} (copie) » avec le même contenu. */
export async function duplicateDeckOnServer(id: number): Promise<{ id?: number; error?: string }> {
    const res = await fetch(`/decks/${id}`, DECK_FETCH_INIT);
    if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (res.status === 401) return { error: deckApiErrorMessage(res, data) };
        return { error: typeof data.error === 'string' ? data.error : 'Deck introuvable' };
    }
    const data = await res.json().catch(() => ({}));
    const baseName = String(data.name ?? 'Sans nom').trim() || 'Sans nom';
    const newName = `${baseName} (copie)`;
    const body = {
        name: newName,
        main: Array.isArray(data.main) ? data.main : [],
        extra: Array.isArray(data.extra) ? data.extra : [],
        side: Array.isArray(data.side) ? data.side : [],
    };
    const postRes = await fetch('/decks', {
        ...DECK_FETCH_INIT,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const postData = (await postRes.json().catch(() => ({}))) as Record<string, unknown>;
    if (!postRes.ok) {
        return { error: deckApiErrorMessage(postRes, postData) };
    }
    const newId = postData.id as number;
    return newId != null ? { id: newId } : {};
}

export async function loadDeckFromServer(id: number): Promise<boolean> {
    const res = await fetch(`/decks/${id}`, DECK_FETCH_INIT);
    if (!res.ok) return false;
    const data = await res.json();
    cleanCardTable();
    const addEntries = async (entries: { name: string; quantity?: number; engine?: string; categories?: string[] }[], section: DeckSection) => {
        for (const entry of entries) {
            const infoCard = await fetchCardByName(entry.name);
            if (!infoCard) continue;
            const arr = getState(section);
            arr.push({
                name: infoCard.name_en ?? infoCard.name,
                type: infoCard.type ?? '',
                quantity: entry.quantity ?? 1,
                engine: entry.engine ?? '',
                categories: entry.categories ?? [],
                imageUrl: infoCard.image_url ?? undefined,
                attribute: typeof infoCard.attribute === 'string' ? infoCard.attribute : undefined,
                level: typeof infoCard.level === 'number' ? infoCard.level : undefined,
                race: typeof infoCard.race === 'string' ? infoCard.race : undefined,
                frame_type: typeof infoCard.frame_type === 'string' ? infoCard.frame_type : undefined,
                maxCopies: banTcgToMaxCopies(typeof infoCard.ban_tcg === 'string' ? infoCard.ban_tcg : undefined),
            });
        }
    };
    await addEntries(data.main || [], 'main');
    await addEntries(data.extra || [], 'extra');
    await addEntries(data.side || [], 'side');
    renderDeckSection('main');
    renderDeckSection('extra');
    renderDeckSection('side');
    const loadedName = data.name ?? 'Sans nom';
    const deckId = data.id ?? id;
    setCurrentLoadedDeck(deckId, loadedName);
    setDeckName(loadedName);
    if (data.cover_image_url != null || data.cover_card_name != null) {
        setDeckCover(deckId, data.cover_image_url ?? '', data.cover_card_name ?? '');
    }
    updateDeckCount();
    computeGlobalStats();
    if (typeof (window as any).updateCategorySummary === 'function') {
        (window as any).updateCategorySummary();
    }
    return true;
}

/** Supprime un deck sur le serveur (DELETE /decks/:id). Retourne true si succès. */
export async function deleteDeckFromServer(id: number): Promise<boolean> {
    const res = await fetch(`/decks/${id}`, { ...DECK_FETCH_INIT, method: 'DELETE' });
    if (!res.ok) return false;
    const loaded = getCurrentLoadedDeck();
    if (loaded?.id === id) clearCurrentLoadedDeck();
    try {
        localStorage.removeItem(`${DECK_COVER_STORAGE_KEY}-${id}`);
    } catch (_) {}
    return true;
}

export function exportDeckToFile(): void {
    const deck = {
        main: mainDeck.map(r => ({ name: r.name, quantity: r.quantity, engine: r.engine || undefined, categories: r.categories.length ? r.categories : undefined })),
        extra: extraDeck.map(r => ({ name: r.name, quantity: r.quantity, engine: r.engine || undefined, categories: r.categories.length ? r.categories : undefined })),
        side: sideDeck.map(r => ({ name: r.name, quantity: r.quantity, engine: r.engine || undefined, categories: r.categories.length ? r.categories : undefined })),
    };
    const json = JSON.stringify(deck, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deck.json';
    a.click();
    URL.revokeObjectURL(url);
}

export function importDeckFromFile(event: Event): void {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const raw = (e.target && (e.target as FileReader).result) as string;
            const data = JSON.parse(raw || '{}');
            cleanCardTable();

            const failedCards: string[] = [];
            const addEntries = async (entries: any[], section: DeckSection) => {
                for (const card of entries) {
                    const infoCard = await fetchCardByName(card.name);
                    if (!infoCard) {
                        failedCards.push(card.name);
                        continue;
                    }
                    const arr = getState(section);
                    arr.push({
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
                    });
                }
            };

            if (Array.isArray(data)) {
                await addEntries(data, 'main');
            } else if (data.main || data.extra || data.side) {
                await addEntries(data.main || [], 'main');
                await addEntries(data.extra || [], 'extra');
                await addEntries(data.side || [], 'side');
            } else {
                throw new Error('Format JSON invalide (attendu: { main, extra, side } ou tableau)');
            }

            renderDeckSection('main');
            renderDeckSection('extra');
            renderDeckSection('side');
            updateDeckCount();
            computeGlobalStats();
            if (typeof (window as any).updateCategorySummary === 'function') {
                (window as any).updateCategorySummary();
            }
            if (failedCards.length > 0) {
                console.warn('Import: cartes non trouvées:', failedCards);
                alert(`${failedCards.length} carte(s) non trouvée(s):\n${failedCards.slice(0, 10).join('\n')}${failedCards.length > 10 ? `\n... et ${failedCards.length - 10} autre(s)` : ''}`);
            }
        } catch (err: any) {
            alert('Erreur à l\'import : ' + (err?.message ?? err));
        }
    };
    reader.readAsText(file);
}

/** No-op pour compatibilité : la grille cartes n'a pas de tri par colonne. */
export function enableColumnSort(_gridId: string, _cols: number, _onSort?: () => void): void {}

/** No-op pour compatibilité : suppression via popover. */
export function enableGridRowDeletion(_gridSelector: string, _cols: number, _btnClass?: string, _onDelete?: () => void): void {}
