---
name: deck-builder
description: "Skill for the Deck-builder area of analyzer-yugioh. 48 symbols across 19 files."
---

# Deck-builder

48 symbols | 19 files | Cohesion: 76%

## When to Use

- Working with code in `static/`
- Understanding how duplicateDeckOnServer, deckApiDeckByIdUrl, apiCreateDeck work
- Modifying deck-builder-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `static/js/deck-builder/deckApi.ts` | deckApiErrorMessage, apiCreateDeck, apiUpdateDeck, apiDuplicateDeck, apiFetchDeckById (+3) |
| `static/js/deck-builder/deckLimitGroups.ts` | deckLimitGroupKeyRow, rowsInDeckLimitGroup, totalQtyDeckLimitGroup, maxAllowedForDeckLimitGroup, canAddToDeckLimitGroup (+2) |
| `static/js/deck-builder/mainDeckSort.ts` | sortMainDeckInPlace, setByType, setByCategory, refreshSortedMain, deckCardTypeKind (+1) |
| `static/js/deck.ts` | duplicateDeckOnServer, setMainDeckSortByType, setMainDeckSortByCategory, pushSection |
| `static/js/utils/userDialogMessages.ts` | msgImportCardsNotFound, msgImportParseError |
| `static/js/utils/userDialogCopy.ts` | copyImportCardsNotFoundMessage, copyImportParseErrorMessage |
| `static/js/deck-builder/deckFileIo.ts` | applyParsedDeckJson, runDeckImportFromFileInput |
| `static/js/deck-builder/card-edit-popover/deckCardPopoverQuantity.ts` | maxQuantityAllowedForPopoverRow, clampPopoverQuantityFromSelect |
| `static/js/deck-builder/tryAddCardToDeckSection.ts` | findExistingRowIndex, tryAddCardToDeckSection |
| `static/js/deck-builder/deckRowFactory.ts` | createDeckRowFromApiCard, createDeckRowFromServerEntry |

## Entry Points

Start here when exploring this area:

- **`duplicateDeckOnServer`** (Function) — `static/js/deck.ts:299`
- **`deckApiDeckByIdUrl`** (Function) — `static/js/deck-builder/deckApiRoutes.ts:6`
- **`apiCreateDeck`** (Function) — `static/js/deck-builder/deckApi.ts:98`
- **`apiUpdateDeck`** (Function) — `static/js/deck-builder/deckApi.ts:114`
- **`apiDuplicateDeck`** (Function) — `static/js/deck-builder/deckApi.ts:138`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `duplicateDeckOnServer` | Function | `static/js/deck.ts` | 299 |
| `deckApiDeckByIdUrl` | Function | `static/js/deck-builder/deckApiRoutes.ts` | 6 |
| `apiCreateDeck` | Function | `static/js/deck-builder/deckApi.ts` | 98 |
| `apiUpdateDeck` | Function | `static/js/deck-builder/deckApi.ts` | 114 |
| `apiDuplicateDeck` | Function | `static/js/deck-builder/deckApi.ts` | 138 |
| `apiFetchDeckById` | Function | `static/js/deck-builder/deckApi.ts` | 165 |
| `apiDeleteDeck` | Function | `static/js/deck-builder/deckApi.ts` | 172 |
| `hasTruthyDeckSectionData` | Function | `static/js/deckSection.ts` | 18 |
| `msgImportCardsNotFound` | Function | `static/js/utils/userDialogMessages.ts` | 74 |
| `msgImportParseError` | Function | `static/js/utils/userDialogMessages.ts` | 78 |
| `copyImportCardsNotFoundMessage` | Function | `static/js/utils/userDialogCopy.ts` | 71 |
| `copyImportParseErrorMessage` | Function | `static/js/utils/userDialogCopy.ts` | 79 |
| `applyParsedDeckJson` | Function | `static/js/deck-builder/deckFileIo.ts` | 87 |
| `runDeckImportFromFileInput` | Function | `static/js/deck-builder/deckFileIo.ts` | 160 |
| `setMainDeckSortByType` | Function | `static/js/deck.ts` | 237 |
| `setMainDeckSortByCategory` | Function | `static/js/deck.ts` | 241 |
| `sortMainDeckInPlace` | Function | `static/js/deck-builder/mainDeckSort.ts` | 29 |
| `refreshSortedMain` | Function | `static/js/deck-builder/mainDeckSort.ts` | 77 |
| `dispatchDeckSortChanged` | Function | `static/js/deck-builder/deckSortEvents.ts` | 4 |
| `deckLimitGroupKeyRow` | Function | `static/js/deck-builder/deckLimitGroups.ts` | 28 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `PersistEdits → DeckLimitGroupKeyRow` | cross_community | 6 |
| `OpenPopover → DeckLimitGroupKeyRow` | cross_community | 5 |
| `LoadDeckFromServer → BanTcgToMaxCopies` | cross_community | 5 |
| `ImportDeckFromFile → BanTcgToMaxCopies` | cross_community | 5 |
| `RunSearch → CardTypeKindFromTypeStringOrNull` | cross_community | 5 |
| `TryAddCardToDeckSection → DeckLimitGroupKeyRow` | cross_community | 5 |
| `ImportDeckFromFile → HasTruthyDeckSectionData` | cross_community | 4 |
| `ImportDeckFromFile → CopyImportCardsNotFoundMessage` | cross_community | 4 |
| `ImportDeckFromFile → CopyImportParseErrorMessage` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Js | 4 calls |
| Analysis | 2 calls |

## How to Explore

1. `gitnexus_context({name: "duplicateDeckOnServer"})` — see callers and callees
2. `gitnexus_query({query: "deck-builder"})` — find related execution flows
3. Read key files listed above for implementation details
