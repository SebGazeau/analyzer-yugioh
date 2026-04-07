---
name: js
description: "Skill for the Js area of analyzer-yugioh. 121 symbols across 47 files."
---

# Js

121 symbols | 47 files | Cohesion: 70%

## When to Use

- Working with code in `static/`
- Understanding how getDeckState, refreshDeckSaveUpdateButtons, getDeckName work
- Modifying js-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `static/js/deck.ts` | getState, allDeckRowsFlat, getDeckState, setCurrentLoadedDeck, refreshDeckSaveUpdateButtons (+22) |
| `static/js/search.ts` | renderResultRow, normName, pickBestCardFromSearchResults, renderResultsList, setupSearch (+4) |
| `static/js/deck-state.ts` | sectionCount, addOrIncrement, getDeckSize, isLegal, addCard (+3) |
| `static/js/category.ts` | isCategorySelectorElement, createCategorySelector, renderChips, renderDropdown, addChip (+2) |
| `static/js/deck-builder/card-edit-popover/deckCardPopover.ts` | persistEdits, dismissSaving, repositionPopover, getOrCreatePopover, openPopover (+1) |
| `static/js/deck-move.ts` | maxCardsForZone, sumQuantities, sameZoneInsertIndex, isExtraDeckRowLike, resolveTargetZone |
| `static/js/deck-builder/loadedDeckSession.ts` | getCurrentLoadedDeck, setLoadedDeckRecord, clearLoadedDeckRecord |
| `static/js/deck-builder/mainDeckSort.ts` | resetForCleanTable, clearAfterStructureChange, getState |
| `static/js/deckSection.ts` | mapDeckSections, isDeckSection, emptyArraysByDeckSection |
| `static/js/deck-builder/deckFileIo.ts` | buildDeckJsonExportPayload, downloadJsonFile, addEntries |

## Entry Points

Start here when exploring this area:

- **`getDeckState`** (Function) — `static/js/deck.ts:131`
- **`refreshDeckSaveUpdateButtons`** (Function) — `static/js/deck.ts:147`
- **`getDeckName`** (Function) — `static/js/deck.ts:151`
- **`addToDeck`** (Function) — `static/js/deck.ts:258`
- **`saveDeckToServer`** (Function) — `static/js/deck.ts:269`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getDeckState` | Function | `static/js/deck.ts` | 131 |
| `refreshDeckSaveUpdateButtons` | Function | `static/js/deck.ts` | 147 |
| `getDeckName` | Function | `static/js/deck.ts` | 151 |
| `addToDeck` | Function | `static/js/deck.ts` | 258 |
| `saveDeckToServer` | Function | `static/js/deck.ts` | 269 |
| `updateDeckOnServer` | Function | `static/js/deck.ts` | 281 |
| `isCategorySelectorElement` | Function | `static/js/category.ts` | 45 |
| `cssLengthPx` | Function | `static/js/utils/cssInlineLength.ts` | 4 |
| `getCurrentLoadedDeck` | Function | `static/js/deck-builder/loadedDeckSession.ts` | 11 |
| `setLoadedDeckRecord` | Function | `static/js/deck-builder/loadedDeckSession.ts` | 15 |
| `syncDeckSaveUpdateButtonsDom` | Function | `static/js/deck-builder/deckSaveUpdateButtonsDom.ts` | 8 |
| `readDeckNameFromBuilderInput` | Function | `static/js/deck-builder/deckNameInputDom.ts` | 6 |
| `buildDeckSectionsPayload` | Function | `static/js/deck-builder/deckApi.ts` | 66 |
| `deckCellSelector` | Function | `static/js/deck-builder/grid/deckGridDomSelectors.ts` | 27 |
| `persistEdits` | Function | `static/js/deck-builder/card-edit-popover/deckCardPopover.ts` | 105 |
| `dismissSaving` | Function | `static/js/deck-builder/card-edit-popover/deckCardPopover.ts` | 135 |
| `repositionPopover` | Function | `static/js/deck-builder/card-edit-popover/deckCardPopover.ts` | 140 |
| `getOrCreatePopover` | Function | `static/js/deck-builder/card-edit-popover/deckCardPopover.ts` | 164 |
| `openPopover` | Function | `static/js/deck-builder/card-edit-popover/deckCardPopover.ts` | 233 |
| `syncBuilderStatsFromDeck` | Function | `static/js/stats.ts` | 147 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `OpenPopover → EscapeAttr` | cross_community | 6 |
| `OpenPopover → DeckCardBanBadgeTitle` | cross_community | 6 |
| `PersistEdits → DeckLimitGroupKeyRow` | cross_community | 6 |
| `OpenAssociatedCardsModal → NormName` | cross_community | 6 |
| `OpenAssociatedCardsModal → IsExtraDeckRowLike` | cross_community | 6 |
| `CleanCardTable → EscapeAttr` | cross_community | 6 |
| `CleanCardTable → DeckCardBanBadgeTitle` | cross_community | 6 |
| `CleanCardTable → DeckCardBanBadgeVisibleLabel` | cross_community | 6 |
| `InitBuilder → MapDeckSections` | cross_community | 5 |
| `InitBuilder → GetState` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Deck-builder | 16 calls |
| Analysis | 5 calls |
| Init | 3 calls |
| Insights | 2 calls |
| Associations | 1 calls |
| Search | 1 calls |
| Grid | 1 calls |
| Card-edit-popover | 1 calls |

## How to Explore

1. `gitnexus_context({name: "getDeckState"})` — see callers and callees
2. `gitnexus_query({query: "js"})` — find related execution flows
3. Read key files listed above for implementation details
