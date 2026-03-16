# Yu-Gi-Oh Deck Analysis App — Migration-Aware UX/UI & Frontend Improvement Plan

> **Scope**: Actix Web 4 + Tera + TypeScript codebase.  
> **Goal**: Modernize UX/UI and frontend architecture incrementally, with zero regressions.  
> **Non-goal**: Greenfield rewrite, React migration, or anything that breaks the Rust server.

---

## A. Constraints and Architectural Principles

### Hard constraints (never violate)

1. **Rust backend stays intact.** Actix routes, Tera rendering, SQLx queries, session cookies — all untouched unless explicitly noted.
2. **Tera templates are the source of truth for page structure.** TypeScript enhances them; it does not replace them.
3. **No bundler until Phase 4, and only if the value is clear.** The current `tsc → static/dist/main.js` pipeline is valid. Don't break it for aesthetics.
4. **Every refactor must have a test gate.** No visual change ships without a passing suite covering the feature it touches.
5. **Progressive enhancement, not replacement.** The pages must work (degraded but functional) without JS. Authentication, form submission, deck persistence — server-side first.
6. **TypeScript module boundaries are an asset.** `deck.ts`, `stats.ts`, `search.ts`, `category.ts` are the natural seams for incremental improvement. Respect them.

### Architectural principles

- **Server-rendered shell, client-enhanced behavior.** Tera renders the initial DOM. TypeScript takes over for interactivity. This is already the correct pattern — keep it.
- **CSS as a design system.** Before touching any template, define a CSS custom-property layer (`design-tokens.css`). All future visual work references tokens, not raw values.
- **State lives in the DOM or in module-level variables — keep it explicit.** Avoid hidden reactive state until you've established test coverage for existing state flows.
- **Islands of interactivity.** Each TypeScript module owns a well-defined region of the DOM. The deck builder, stats panel, and search are separate islands. This enables safe per-island refactors.

---

## B. UX/UI Redesign Vision Grounded in the Current Rust Stack

### Aesthetic Direction: "Dark Tactical Command Center"

This is a **strategic analysis tool** used by competitive players. The aesthetic should reflect that — it's not a casual card browser. Think: dark background, sharp contrast, dense information architecture, precise typography, with gold/amber accents evoking the card game's premium feel.

**Design language keywords:** tactical, high-contrast, information-dense, premium, precise.  
**Not:** playful, pastel, flat-white SaaS, generic dashboard.

### Color palette (CSS custom properties)

```css
:root {
  /* Backgrounds */
  --color-bg-base:       #0d0f14;  /* near-black, deep navy undertone */
  --color-bg-surface:    #151820;  /* card surfaces, panels */
  --color-bg-elevated:   #1e2130;  /* modals, dropdowns */
  --color-bg-sunken:     #0a0c10;  /* input wells, inset areas */

  /* Borders */
  --color-border-subtle: #2a2d3a;
  --color-border-strong: #3d4155;
  --color-border-accent: #c9a227;  /* gold — use sparingly */

  /* Text */
  --color-text-primary:  #e8eaf0;
  --color-text-secondary:#8b90a8;
  --color-text-muted:    #5a5f78;
  --color-text-inverse:  #0d0f14;

  /* Accents */
  --color-gold:          #c9a227;
  --color-gold-dim:      #7a6018;
  --color-amber:         #e8860a;
  --color-danger:        #e05252;
  --color-success:       #3dba7a;
  --color-info:          #4a9eda;

  /* Deck zone colors */
  --color-main-deck:     #4a6fa5;
  --color-extra-deck:    #8b5cf6;
  --color-side-deck:     #3dba7a;
}
```

### Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Lato:wght@300;400;700&display=swap');

:root {
  --font-display:  'Rajdhani', sans-serif;   /* headings, deck names, zone labels */
  --font-body:     'Lato', sans-serif;       /* UI text, descriptions */
  --font-mono:     'IBM Plex Mono', monospace; /* counts, percentages, probabilities */
}
```

**Rajdhani** has a sharp, technical, slightly Eastern feel — perfect for a card game UI. **IBM Plex Mono** makes probability numbers look precise and intentional. **Lato** is clean but less generic than Inter in this combination.

---

### Screen-by-screen design direction

#### Dashboard (deck list)

- **Layout:** Two-column on desktop. Left: sortable deck grid (card art thumbnails, deck name, date, format). Right: sticky "quick stats" panel with last-opened deck summary.
- **Deck cards:** Large card-art background with gradient overlay. Deck name in `--font-display` at 20px. Metadata (card count, last modified) in mono. Gold border on hover.
- **Empty state:** Bold single sentence + CTA button, no filler illustrations.
- **Tera template change:** Add `data-deck-id` attributes to each deck card element so `deck.ts` can attach event listeners without relying on fragile class selectors.

#### Deck Builder

- **Three-column layout:** Card search (left 28%) | Deck zones (center 44%) | Stats sidebar (right 28%).
- **Deck zones:** Main / Extra / Side as collapsible vertical sections. Card count badge in mono font. Zone color accent on left border.
- **Card search panel:** Sticky position. Input with instant debounced search. Results as a dense card grid (art + name only, tooltip on hover for full details).
- **Stats sidebar:** Sticky. Shows live probability numbers updating as cards are added. Category breakdown as a small stacked bar chart (pure CSS, no library needed).
- **Keyboard shortcuts:** `Ctrl+F` focuses search, `Escape` clears, `Enter` adds top result. Define these in `main.ts`.
- **Tera:** The three-column wrapper is server-rendered. TypeScript populates the card lists via DOM manipulation (current approach, just cleaned up).

#### Analysis View

- **Full-width layout** with a prominent stats hero row at top: Opening Hand %, First %, Second % — large mono numbers with labels.
- **Category breakdown table:** Rows = category name, columns = count / % of deck / expected in hand. Clean tabular layout.
- **Engine analysis:** Collapsible sections per engine with mini card list + probability sub-row.
- **Visual indicator:** A horizontal strip of colored segments representing deck composition (Main zone only) — pure CSS `display: flex` with `width: calc(count / 40 * 100%)` per category.

#### Draw Simulator

- **Card-by-card reveal animation** using CSS `@keyframes` — a card "flip" reveal that draws from a face-down pile.
- **Controls row:** Draw N cards, Reset, Run 1000 sims. All as `<button>` elements already handled by `stats.ts`.
- **Result histogram:** A pure CSS bar chart (no library) showing draw frequency distribution. Each bar is a `<div>` with `height` set inline via TypeScript.
- **First/Second toggle:** Prominent toggle switch at top of simulator. Persisted in `localStorage`.

#### Auth Pages (Login / Register)

- **Centered single-column card** on `--color-bg-base` background.
- **Subtle geometric background:** A CSS `background` with a repeating SVG pattern (card back motif, very low opacity).
- **Form:** Clean label-above-input pattern. Gold focus ring (`outline: 2px solid var(--color-gold)`).
- **Error states:** Inline below the relevant field, `--color-danger`, no modal.
- **These are mostly Tera-rendered forms.** Minimal JS required. Add a small `auth.ts` module only for client-side validation before submit.

---

## C. Audit Checklist for the Existing Codebase

Run this audit before writing a single line of new code.

### Templates audit (`templates/`)

- [ ] List all `.html.tera` files and map them to routes in `src/routes/`
- [ ] Identify shared macros / `{% include %}` / `{% extends %}` chains
- [ ] Find all hardcoded color values in inline `style=""` attributes
- [ ] Find all hardcoded color values directly in CSS files (not variables)
- [ ] Identify all `id=""` and `class=""` attributes that TypeScript depends on (grep `getElementById`, `querySelector`, `querySelectorAll` across all `.ts` files)
- [ ] Check if any template renders JSON inline for JS bootstrap (e.g., `data-deck='{{ deck_json }}'`)
- [ ] Flag any template that mixes business logic with presentation (Tera filters doing computation)

### CSS audit (`static/css/` or equivalent)

- [ ] List all `.css` files and their import/link order
- [ ] Count unique color values — more than ~15 is a signal to tokenize
- [ ] Identify any `!important` usage
- [ ] Check for inconsistent spacing units (mixing `px`, `rem`, `em` arbitrarily)
- [ ] Identify media query breakpoints — are they consistent?
- [ ] Look for duplicated block patterns (e.g., the same button styles defined 3 times)

### TypeScript audit (`static/src/` or equivalent)

- [ ] For each module, document: **what DOM elements it touches**, **what events it listens to**, **what state it holds**, **what it calls on the server**
- [ ] `main.ts`: Does it import all other modules? What initializes on `DOMContentLoaded`?
- [ ] `deck.ts`: What is the deck data structure? How are cards added/removed? Where is count state held?
- [ ] `stats.ts`: What triggers probability recalculation? Are the math functions pure (no DOM side effects)?
- [ ] `search.ts`: How is debouncing implemented? What API endpoint does it hit? What does the response look like?
- [ ] `category.ts`: How are categories stored? Are they server-persisted or client-only?
- [ ] Identify any global variables (declared with `let`/`var` outside functions)
- [ ] Check if any module uses `fetch` without error handling
- [ ] Find any `console.log` left in production code

### API/Route audit

- [ ] List all `fetch()` calls in TypeScript and match them to Actix routes
- [ ] Verify JSON response shapes match what TypeScript expects (compare Serde structs vs TS usage)
- [ ] Identify which operations are optimistic (update UI before server confirms) vs pessimistic

---

## D. Anti-Regression Test Plan Before UI Changes

This is the most important section. **No Phase 3 work begins without these tests passing.**

### Test technology (already in stack)

- **Vitest + jsdom** — unit and DOM tests. Already configured. Use it.
- **No new test framework needed** for Phases 0–3.
- **Playwright** (optional, Phase 4 only) — lightweight E2E for critical user journeys.

---

### `deck.ts` — Unit tests

These functions must have zero DOM dependencies. If they currently touch the DOM, extract the pure logic first.

```
test: addCard(deck, card) → increases count by 1
test: addCard when count = 3 → rejects (3-copy limit)
test: addCard extra deck card → goes to extraDeck, not mainDeck
test: removeCard(deck, cardId) → decreases count
test: removeCard last copy → removes card from deck entirely
test: getDeckSize(deck) → correct sum of main + extra + side
test: isLegal(deck) → returns false when main deck < 40
test: isLegal(deck) → returns false when extra deck > 15
test: exportDeck(deck) → produces correct YDK string format
test: importDeck(ydkString) → parses card IDs correctly
test: importDeck with malformed string → throws or returns error
```

### `stats.ts` — Unit tests (pure math — no DOM)

These are the most critical. Extract all math into pure functions if not already.

```
test: hypergeometric(population, successes, draws, desired) → known correct values
  - hypergeometric(40, 3, 5, 1) ≈ 0.3370 (verified against published tables)
  - hypergeometric(40, 3, 5, 2) ≈ 0.0400
  - hypergeometric(40, 3, 6, 1) ≈ 0.3882 (second player draws 6)
test: firstHandProbability(deck) → uses 5-card draw
test: secondHandProbability(deck) → uses 6-card draw
test: probabilityAtLeast(n, ...) → cumulative from exact values
test: simulateDraw(deck, n, iterations) → returns distribution within statistical tolerance
  - run 10,000 iterations, result within ±2% of theoretical value
test: categoryProbability(deck, categoryName) → correct for multi-category cards
test: Edge case: deck with 0 copies of target → probability = 0
test: Edge case: deck with 3 copies of target → probability ≥ single-copy probability
```

### `search.ts` — DOM tests (jsdom)

```
test: input with 1 character → does NOT fire search (min length guard)
test: input with 3+ characters → fires debounced search after delay
test: rapid typing → only fires once (debounce works)
test: search returns results → DOM is populated with correct card names
test: search returns empty → shows empty state message, not broken DOM
test: clearing input → results are cleared
test: network error → error state shown, no JS exception propagates
```

Mock data fixture for search tests:
```typescript
// fixtures/search-results.ts
export const mockSearchResults = [
  { id: 89631139, name: "Dark Magician", type: "Normal Monster", race: "Spellcaster", ... },
  { id: 46986414, name: "Blue-Eyes White Dragon", type: "Normal Monster", ... },
];
export const mockEmptyResults = [];
```

### `category.ts` — Unit + DOM tests

```
test: assignCategory(card, category) → card has correct category label
test: unassignCategory(card) → category removed
test: getCardsByCategory(deck, category) → correct subset returned
test: category count badge updates in DOM when card added
test: category color matches defined palette (DOM test)
test: a card can belong to multiple categories — count reflects correctly in all
```

### `main.ts` — DOM integration tests

```
test: DOMContentLoaded → deck module initialized (no JS exceptions)
test: DOMContentLoaded → stats module initialized
test: add card button click → deck count increments in DOM
test: remove card button click → deck count decrements in DOM
test: deck count changes → stats panel recalculates (integration)
test: save button → fetch called with correct payload
test: save button → success message appears in DOM
test: save button → failure shows error, does NOT corrupt deck state
```

### Save/Load flow (DOM integration)

```
test: load deck from server → all cards appear in correct zones
test: load deck → category assignments preserved
test: save modified deck → only changed data sent (or full deck, verify expectation)
test: load deck with 0 extra deck cards → extra deck zone empty, no errors
test: load deck → stats automatically recalculate
```

### Fixtures and mock data

Create `static/src/__tests__/fixtures/`:

```
fixtures/
  decks/
    standard-deck-40.json       — valid 40-card main deck
    full-deck-60-15-15.json     — max sizes
    empty-deck.json             — edge case
    illegal-deck.json           — 39 main, 16 extra
  cards/
    normal-monster.json
    extra-deck-monster.json     — Fusion/Synchro/XYZ/Link
    spell.json
    trap.json
  search/
    results-3-cards.json
    results-empty.json
    results-with-limited.json   — banlist edge cases
  categories/
    deck-with-categories.json   — deck where each card has category tags
```

### Validation criteria before Phase 3

- All pure math tests: **100% pass rate**
- All DOM tests: **100% pass rate**
- Probability values: **within ±0.01% of theoretical** for known inputs
- Save/load round-trip: **lossless** (load(save(deck)) === deck)
- No test relies on network — all fetch calls are mocked

---

## E. Incremental Migration Roadmap

### Phase 0 — Audit (1–3 days, no code changes)

**Goal:** Understand what exists before touching anything.

**Tasks:**
- Execute the audit checklist from Section C
- Create a spreadsheet: Template → Route → TS module → CSS file
- Document every `data-*` attribute and `id` that TypeScript depends on
- Identify all hardcoded DOM selectors in TypeScript (these are fragile points)
- Capture current screenshots of every page (regression baseline)

**What stays untouched:** Everything.  
**Risk:** None — this is read-only.  
**Deliverable:** `AUDIT.md` in repo root with findings.

---

### Phase 1 — Regression Tests (3–7 days)

**Goal:** Build the safety net before any changes.

**Tasks:**
- Write all tests from Section D
- Create all fixtures
- Run `vitest --coverage` — establish baseline coverage %
- Fix any existing bugs discovered during test writing (but don't change UI)
- Add a `Makefile` or `package.json` script: `test:frontend` that runs full suite

**What stays untouched:** All templates, CSS, application logic.  
**Risk:** Low. Only adds test files.  
**Validation:** All tests green, coverage > 80% on logic functions.

---

### Phase 2 — CSS Design System (2–4 days)

**Goal:** Extract design tokens and shared primitives. No visible changes yet.

**Tasks:**

1. Create `static/css/tokens.css`:
   - All color custom properties from Section B
   - Spacing scale: `--space-1` through `--space-16` (4px base unit)
   - Font families, sizes, weights
   - Border radii, shadows, z-index scale
   - Transition durations

2. Create `static/css/reset.css`:
   - Modern CSS reset (box-sizing, margin: 0, no list-style on `<ul>` in nav)

3. Create `static/css/typography.css`:
   - Base `body` font settings
   - `h1`–`h6` using `--font-display`
   - Code / mono elements

4. Create `static/css/components/`:
   - `button.css` — all button variants (primary, secondary, danger, ghost)
   - `input.css` — text inputs, selects, checkboxes
   - `card.css` — the card-art panel primitive (reused in deck grid and search)
   - `badge.css` — count badges, category tags

5. **Do not delete old CSS yet.** Add new token file at the top of the existing CSS import chain. Gradually replace hardcoded values with token references, one file at a time.

6. Add `data-theme="dark"` to `<html>` in the base Tera template.

**What stays untouched:** All templates, TypeScript, application logic.  
**Risk:** Low. CSS-only changes, existing values are additive fallbacks.  
**Validation:** All screenshots visually unchanged OR intentionally improved and reviewed.

---

### Phase 3 — Screen-by-Screen Redesign (1–2 weeks per screen)

**Goal:** Apply the new visual direction one page at a time.  
**Prerequisite:** All Phase 1 tests pass.

**Order (least risky first):**

1. **Auth pages** (login, register) — minimal JS, isolated, easily reverted
2. **Dashboard** (deck list) — display-only, no complex state
3. **Deck builder** — most complex, do last after patterns are established
4. **Analysis / Stats view** — depends on `stats.ts` being well-tested
5. **Draw simulator** — depends on `stats.ts` simulation functions

**Per-screen process:**
1. Refactor the Tera template structure (wrapper divs, semantic HTML)
2. Apply new CSS classes referencing tokens
3. Verify TypeScript selectors still work (run tests)
4. Add any new TypeScript behavior (keyboard shortcuts, animations)
5. Run full test suite — must stay green
6. Take new screenshots, compare against Phase 0 baseline

**What stays untouched (during each screen's work):** All other screens, all backend code.  
**Risk:** Medium. Tera template changes can break TypeScript selectors.  
**Mitigation:** The DOM test suite from Phase 1 will catch selector breakage immediately.

---

### Phase 4 — Architecture & Optional Tooling (ongoing)

**Goal:** Improve maintainability without disrupting the working app.

**Tasks (see Section I for detail):**
- Consider Vite for bundling (replaces `tsc` direct compilation)
- Consider splitting `main.ts` further if it has grown large
- TypeScript strict mode (`"strict": true`)
- CSS Modules or scoped styles if component count grows
- Playwright E2E tests for critical journeys

---

## F. Frontend Architecture Recommendations Compatible with Rust + Tera

### Option A: Improved HTML + CSS + TypeScript (Recommended for now)

**What to do:**
- Keep the current architecture exactly
- Add the CSS token layer from Phase 2
- Enforce module boundaries: each `.ts` file owns exactly one DOM region
- Add explicit TypeScript interfaces for all data shapes from the server

**Migration cost:** Near zero  
**Regression risk:** Near zero  
**Recommended:** Yes, for Phases 0–3

```typescript
// Add to each module — make server data shapes explicit
interface DeckCard {
  id: number;
  name: string;
  type: string;
  copies: number;
  zone: 'main' | 'extra' | 'side';
  categories: string[];
}

interface DeckState {
  id: string | null;
  name: string;
  main: DeckCard[];
  extra: DeckCard[];
  side: DeckCard[];
}
```

### Option B: Introduce Vite (Phase 4, if justified)

**Value proposition:**
- HMR during development (instant CSS/TS refresh without full page reload)
- Tree-shaking removes dead code
- Native TypeScript support without separate `tsc` step
- Better source maps

**Migration path:**
1. Install `vite` as dev dependency
2. Create `vite.config.ts` pointing to `static/src/main.ts` as entry
3. Update output path to match Actix's static file serving path
4. Replace `tsc` call in build script with `vite build`
5. Verify `static/dist/main.js` is produced at same path
6. Run test suite — no changes needed in test config (Vitest is already Vite-native)

**Compatibility:** Fully compatible with Tera + Actix. Vite is a build tool, not a runtime framework.  
**Regression risk:** Low if output path matches. Moderate if import structure changes.  
**Recommended:** Yes, but only after Phase 3 is complete and stable.

### Option C: Web Components for repeated UI elements (Phase 4, optional)

**Use case:** If the card display component (art + name + count badge) appears in 4+ places, a Web Component removes duplication without framework adoption.

```typescript
// static/src/components/card-display.ts
class CardDisplay extends HTMLElement {
  static observedAttributes = ['card-id', 'copies'];

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const id = this.getAttribute('card-id');
    const copies = this.getAttribute('copies') ?? '1';
    this.innerHTML = `
      <div class="card-display">
        <img src="/images/cards/${id}.webp" alt="">
        <span class="card-copies">${copies}</span>
      </div>
    `;
  }
}

customElements.define('card-display', CardDisplay);
```

**Migration cost:** Low. Purely additive.  
**Regression risk:** Low. Existing templates not touched until you explicitly replace an element.  
**Recommended:** Selectively, for high-reuse components only.

### What NOT to do

- **Do not adopt React/Vue/Svelte.** The server-rendered Tera model is an asset. A SPA framework would require either a full rewrite or an awkward hybrid that's worse than both approaches.
- **Do not introduce a state management library** (Redux, Zustand, etc.). The current module-level state is simpler and sufficient. If state complexity grows, define a lightweight `AppState` singleton in `state.ts` instead.
- **Do not use a CSS-in-JS solution.** Incompatible with Tera-rendered templates without a build-time preprocessing step.

---

## G. Cursor-Ready Implementation Steps

### Target folder structure

```
static/
├── css/
│   ├── tokens.css              ← NEW Phase 2 — design tokens
│   ├── reset.css               ← NEW Phase 2 — modern reset
│   ├── typography.css          ← NEW Phase 2
│   ├── layout.css              ← NEW Phase 2 — grid/flex helpers
│   ├── components/
│   │   ├── button.css          ← NEW Phase 2
│   │   ├── input.css           ← NEW Phase 2
│   │   ├── card.css            ← NEW Phase 2 (card art panel)
│   │   ├── badge.css           ← NEW Phase 2
│   │   ├── modal.css           ← NEW Phase 2
│   │   └── deck-zone.css       ← NEW Phase 3
│   ├── pages/
│   │   ├── auth.css            ← NEW Phase 3
│   │   ├── dashboard.css       ← NEW Phase 3
│   │   ├── builder.css         ← NEW Phase 3
│   │   └── analysis.css        ← NEW Phase 3
│   └── main.css                ← EXISTING — imports all above
│
├── src/
│   ├── main.ts                 ← EXISTING (refactor Phase 3)
│   ├── deck.ts                 ← EXISTING (extract pure fns Phase 2)
│   ├── stats.ts                ← EXISTING (extract pure fns Phase 2)
│   ├── search.ts               ← EXISTING (refactor Phase 3)
│   ├── category.ts             ← EXISTING (refactor Phase 3)
│   ├── auth.ts                 ← NEW Phase 3 — client validation
│   ├── state.ts                ← NEW Phase 3 — shared AppState singleton
│   ├── api.ts                  ← NEW Phase 2 — typed fetch wrappers
│   ├── components/
│   │   └── card-display.ts     ← NEW Phase 4 (optional Web Component)
│   ├── utils/
│   │   ├── dom.ts              ← NEW Phase 2 — typed querySelector helpers
│   │   ├── debounce.ts         ← NEW Phase 2 — extracted debounce utility
│   │   └── format.ts           ← NEW Phase 2 — number formatting (percentages)
│   └── __tests__/
│       ├── deck.test.ts
│       ├── stats.test.ts
│       ├── search.test.ts
│       ├── category.test.ts
│       ├── main.test.ts
│       └── fixtures/
│           ├── decks/
│           ├── cards/
│           └── search/
│
templates/
├── base.html.tera              ← EXISTING (add data-theme, token link)
├── components/
│   ├── card.html.tera          ← EXISTING or NEW — reusable card panel
│   ├── deck-zone.html.tera     ← EXISTING or NEW
│   └── stat-badge.html.tera    ← NEW Phase 3
├── pages/
│   ├── auth/
│   │   ├── login.html.tera
│   │   └── register.html.tera
│   ├── dashboard.html.tera
│   ├── builder.html.tera
│   └── analysis.html.tera
```

### Naming conventions

| Element | Convention | Example |
|---|---|---|
| CSS custom properties | `--color-{role}`, `--space-{n}` | `--color-bg-surface`, `--space-4` |
| CSS classes | BEM-light: `block__element--modifier` | `deck-zone__header--collapsed` |
| TypeScript files | camelCase | `deckBuilder.ts` |
| TypeScript interfaces | PascalCase | `DeckCard`, `SearchResult` |
| TypeScript functions | camelCase verbs | `addCardToDeck()`, `calculateProbability()` |
| Tera template files | kebab-case | `deck-zone.html.tera` |
| Data attributes (TS selectors) | `data-{module}-{purpose}` | `data-deck-card-id`, `data-search-input` |

### Safe data-attribute convention (critical)

Replace fragile class-based selectors with explicit data attributes. This decouples CSS (classes) from JS (data attributes).

**Before:**
```typescript
// Fragile — class changes break this
const addBtn = document.querySelector('.deck-card .add-button');
```

**After (migration-safe):**
```typescript
// Stable — data attributes are JS contracts, not styling
const addBtn = document.querySelector('[data-deck-action="add"]');
```

Update Tera templates to add these attributes during Phase 3, alongside the visual redesign of each template.

### `api.ts` — Typed fetch wrapper (Phase 2, low risk)

```typescript
// static/src/api.ts
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    throw new ApiError(response.status, `HTTP ${response.status} on ${path}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  searchCards: (query: string) =>
    request<SearchResult[]>(`/api/cards/search?q=${encodeURIComponent(query)}`),
  saveDeck: (deck: DeckState) =>
    request<{ id: string }>('/api/decks', { method: 'POST', body: JSON.stringify(deck) }),
  loadDeck: (id: string) =>
    request<DeckState>(`/api/decks/${id}`),
  deleteDeck: (id: string) =>
    request<void>(`/api/decks/${id}`, { method: 'DELETE' }),
};
```

### `utils/dom.ts` — Type-safe DOM helpers (Phase 2, low risk)

```typescript
// static/src/utils/dom.ts
export function getElement<T extends HTMLElement>(selector: string, parent: ParentNode = document): T {
  const el = parent.querySelector<T>(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

export function getAllElements<T extends HTMLElement>(selector: string, parent: ParentNode = document): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}

export function onEvent<K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  event: K,
  handler: (e: HTMLElementEventMap[K]) => void
): () => void {
  el.addEventListener(event, handler);
  return () => el.removeEventListener(event, handler);
}
```

---

## H. Refactor Priorities: Safe First / Risky Later

### Safe (do first, Phases 1–2)

These carry negligible regression risk:

| Refactor | Why safe |
|---|---|
| Add `tokens.css` with CSS custom properties | Purely additive, nothing references them yet |
| Add TypeScript interfaces for data shapes | Type-only, no runtime effect |
| Extract `debounce.ts` utility | New file, not wired up until you update the caller |
| Add `api.ts` typed wrappers | New file, gradually replace raw `fetch` calls one at a time |
| Add `data-*` attributes to templates | Additive — doesn't remove existing classes |
| Write all tests | No production code changes |
| Add `utils/dom.ts` helpers | New file, optional adoption |
| Replace hardcoded CSS hex values with token variables | Visual parity, purely CSS |

### Medium risk (do in Phase 3, with tests passing)

| Refactor | Risk and mitigation |
|---|---|
| Restructure Tera template HTML (add wrapper divs, semantic elements) | May shift CSS selectors. Mitigation: DOM tests catch it |
| Extract pure logic from `stats.ts` into separate functions | Easy to break if you change function signatures. Write tests first |
| Replace raw `fetch` calls with `api.ts` | Risk of changing error handling behavior. Wrap in try/catch consistently |
| Restructure CSS into component files | Visual regressions. Screenshot comparison after each file |
| Rename CSS classes to BEM convention | Breaks TypeScript if it targets those classes. Use data attributes instead |

### Risky (postpone to Phase 4 or later)

| Refactor | Why risky, when to do it |
|---|---|
| Introduce Vite bundler | Changes module resolution. Do after Phase 3 is stable and tested |
| Strict TypeScript mode (`"strict": true`) | Will surface many implicit `any` errors. Tackle incrementally with `// @ts-strict-ignore` |
| Web Components | New browser API surface. Only adopt for components with 3+ duplicate implementations |
| Consolidate multiple Tera template files | High risk of regression. Only after you have integration/E2E tests |
| TypeScript module splitting (breaking `deck.ts` into sub-modules) | Risk of circular imports or missed event listeners. Use import/export audit first |
| Move from cookie sessions to JWT in frontend | Backend change required. Out of scope until a deliberate auth refactor sprint |

---

## I. Optional Tooling Upgrades and When to Adopt Them

### Vite (bundler) — Adopt in Phase 4

**Install:**
```bash
npm install --save-dev vite
```

**`vite.config.ts`:**
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'static',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'static/src/main.ts',
      output: {
        entryFileNames: 'main.js',  // keep same filename for Tera template references
      },
    },
  },
});
```

**When to adopt:** After Phase 3 is fully tested and stable. The HMR benefit is real during development, but the migration risk during active feature work is not worth it.

---

### Playwright E2E (critical paths only) — Adopt in Phase 4

**Install:**
```bash
npm install --save-dev @playwright/test
npx playwright install chromium  # just one browser is fine
```

**Cover only these journeys:**
```typescript
// e2e/deck-lifecycle.spec.ts
test('create, save, reload deck', async ({ page }) => {
  await page.goto('/builder');
  // add a card, save, navigate away, reload — verify card is still there
});

test('open hand probability updates when card added', async ({ page }) => {
  // add 3 copies of a card, verify probability number changes
});

test('login → dashboard → open deck → stats loaded', async ({ page }) => {
  // full happy path
});
```

**When to adopt:** After Phase 3 when the screens are stable. E2E tests on rapidly changing UI are expensive to maintain.

---

### TypeScript strict mode — Adopt incrementally in Phase 4

Don't flip `"strict": true` all at once. Use per-file opt-in:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": false,            // global: off for now
    "noImplicitAny": false
  }
}
```

Then enable per-file at the top:
```typescript
// @ts-check
// In new files only — gradually migrate old files
```

---

### CSS nesting (native, no preprocessor) — Available now

Modern browsers support native CSS nesting. No Sass/Less needed:

```css
.deck-zone {
  background: var(--color-bg-surface);

  &__header {
    font-family: var(--font-display);
    color: var(--color-text-primary);
  }

  &__header--collapsed &__body {
    display: none;
  }

  &:hover {
    border-color: var(--color-border-strong);
  }
}
```

**Compatibility:** Chrome 112+, Firefox 117+, Safari 16.5+. If you need older browser support, add PostCSS with `postcss-nesting` as a Vite plugin in Phase 4.

---

## J. Final Recommendation

### What to do, in order

1. **Start with the audit (Phase 0).** Do not skip this. Until you have the selector/template map, every change is a guess.

2. **Write the tests (Phase 1) before touching a single template.** The probability math tests are particularly important — they protect your core value proposition. The DOM tests protect every TypeScript selector. Together they are your airbag.

3. **Tokenize CSS (Phase 2).** This is the highest-leverage, lowest-risk work. One afternoon of extracting custom properties buys you a consistent visual language for all future work.

4. **Create `api.ts` and `utils/dom.ts` (Phase 2).** Two small new files that make all subsequent TypeScript work cleaner and more testable.

5. **Redesign auth and dashboard first (Phase 3).** These are the simplest screens. Use them to validate your new CSS component patterns before tackling the complex deck builder.

6. **Tackle the deck builder last.** It is the most complex, has the most TypeScript surface area, and is the screen users will scrutinize most. Save it for when your patterns are established.

7. **Consider Vite only after the redesign is complete.** The DX improvement is real, but the migration moment matters. Do it when the codebase is stable, not mid-redesign.

### What NOT to do

- Do not adopt a frontend framework. The Tera + TypeScript islands model is architecturally sound and appropriate for this tool.
- Do not redesign everything at once. One screen at a time is not timidity — it is how you ship without regressions.
- Do not write E2E tests before you have unit tests. Unit tests are faster, cheaper, and more precise for the math-heavy logic in this app.
- Do not rename CSS classes across the codebase before adding data attributes for TypeScript. You will break things.

### What you will end up with

A Yu-Gi-Oh deck analysis tool that:
- Looks like a premium tactical command center, not a generic SaaS product
- Has a fully tokenized CSS design system that makes future visual changes trivial
- Has typed TypeScript boundaries with explicit server data contracts
- Has an 80%+ tested logic core that you can refactor with confidence
- Runs on the same Rust backend without a single line of Actix code changed
- Can incrementally adopt Vite, Web Components, or stricter TypeScript when the time is right
- Is fully executable by Cursor with clear file-by-file migration order

---

*Plan version 1.0 — targeting Actix Web 4 + Tera + TypeScript (no bundler) baseline.*  
*Next step: run Phase 0 audit and populate `AUDIT.md` before any code changes.*
