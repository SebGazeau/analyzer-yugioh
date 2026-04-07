---
name: init
description: "Skill for the Init area of analyzer-yugioh. 27 symbols across 15 files."
---

# Init

27 symbols | 15 files | Cohesion: 74%

## When to Use

- Working with code in `static/`
- Understanding how setActiveTab, bindAppTabs, runSearchWithQuery work
- Modifying init-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `static/js/init/deck-actions.ts` | refreshMyDecksList, loadDeck, bindDeckList, bindDeckToolbar, bindDeckActions |
| `static/js/utils/userDialogMessages.ts` | msgErrorPrefixed, msgDeckDuplicated, msgConfirmDeleteDeck, msgDeckSavedWithId |
| `static/js/utils/userDialogCopy.ts` | copyErrorPrefixedMessage, copyDeckDuplicatedMessage, copyConfirmDeleteDeckMessage, copyDeckSavedWithIdMessage |
| `static/js/tabs.ts` | setActiveTab, bindAppTabs |
| `static/js/init/simulation.ts` | bindSimulation, updateHandSizeButtons |
| `static/js/search.ts` | runSearchWithQuery |
| `static/js/deck.ts` | listMyDecks |
| `static/js/init/suggestions.ts` | bindSuggestionsFindCard |
| `static/js/init/decks.ts` | initDecks |
| `static/js/deck-builder/deckSavedListTitlesCopy.ts` | deckSavedListItemLoadTitle |

## Entry Points

Start here when exploring this area:

- **`setActiveTab`** (Function) — `static/js/tabs.ts:29`
- **`bindAppTabs`** (Function) — `static/js/tabs.ts:47`
- **`runSearchWithQuery`** (Function) — `static/js/search.ts:124`
- **`listMyDecks`** (Function) — `static/js/deck.ts:292`
- **`msgErrorPrefixed`** (Function) — `static/js/utils/userDialogMessages.ts:53`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `setActiveTab` | Function | `static/js/tabs.ts` | 29 |
| `bindAppTabs` | Function | `static/js/tabs.ts` | 47 |
| `runSearchWithQuery` | Function | `static/js/search.ts` | 124 |
| `listMyDecks` | Function | `static/js/deck.ts` | 292 |
| `msgErrorPrefixed` | Function | `static/js/utils/userDialogMessages.ts` | 53 |
| `msgDeckDuplicated` | Function | `static/js/utils/userDialogMessages.ts` | 57 |
| `msgConfirmDeleteDeck` | Function | `static/js/utils/userDialogMessages.ts` | 62 |
| `msgDeckSavedWithId` | Function | `static/js/utils/userDialogMessages.ts` | 66 |
| `copyErrorPrefixedMessage` | Function | `static/js/utils/userDialogCopy.ts` | 47 |
| `copyDeckDuplicatedMessage` | Function | `static/js/utils/userDialogCopy.ts` | 51 |
| `copyConfirmDeleteDeckMessage` | Function | `static/js/utils/userDialogCopy.ts` | 56 |
| `copyDeckSavedWithIdMessage` | Function | `static/js/utils/userDialogCopy.ts` | 60 |
| `bindSuggestionsFindCard` | Function | `static/js/init/suggestions.ts` | 23 |
| `initDecks` | Function | `static/js/init/decks.ts` | 6 |
| `refreshMyDecksList` | Function | `static/js/init/deck-actions.ts` | 60 |
| `loadDeck` | Function | `static/js/init/deck-actions.ts` | 122 |
| `bindDeckList` | Function | `static/js/init/deck-actions.ts` | 141 |
| `bindDeckToolbar` | Function | `static/js/init/deck-actions.ts` | 164 |
| `bindDeckActions` | Function | `static/js/init/deck-actions.ts` | 191 |
| `deckSavedListItemLoadTitle` | Function | `static/js/deck-builder/deckSavedListTitlesCopy.ts` | 11 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `BindSimulation → WriteHandSizeToStorage` | cross_community | 4 |
| `BindSimulation → PublishMainDeckTotalForHandSizeTools` | cross_community | 4 |
| `BindSimulation → GetDrawnCardNamesReadonly` | cross_community | 4 |
| `BindSimulation → GetHandSize` | cross_community | 4 |
| `BindSimulation → RefreshDrawSimulationPanel` | cross_community | 4 |
| `BindSimulation → GetDrawnCardNamesCopy` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Analysis | 8 calls |
| Js | 5 calls |
| Deck-builder | 2 calls |

## How to Explore

1. `gitnexus_context({name: "setActiveTab"})` — see callers and callees
2. `gitnexus_query({query: "init"})` — find related execution flows
3. Read key files listed above for implementation details
