---
name: insights
description: "Skill for the Insights area of analyzer-yugioh. 35 symbols across 13 files."
---

# Insights

35 symbols | 13 files | Cohesion: 72%

## When to Use

- Working with code in `static/`
- Understanding how searchResultThumbInnerHtml, searchResultInitialCellClass, deckSectionMainSideShortLabel work
- Modifying insights-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `static/js/services/insights/seventhTachyonInsight.ts` | extractNumberIndexFromName, isXyzMonster, qualifyingNumberXyz, buildSuggestedNumberXyz, computeSeventhTachyonInsight (+11) |
| `static/js/insights/insightsPanelTableHtml.ts` | insightsNumberSuggestionRowsHtml, insightsSummaryRowsHtml, insightsSeventhTachyonDetailRowsHtml |
| `static/js/insights/seventhTachyonCopy.ts` | insightSeventhTachyonSummaryExtraNoQualifyingWithPrio, insightSeventhTachyonSummaryExtraNoQualifyingNoPrio, insightSeventhTachyonSummaryMainWithTargets |
| `static/js/deckSectionMainSide.ts` | deckSectionMainSideShortLabel, deckSectionMainSideSortKey |
| `static/js/insights/insightsSuggestionsUiCopy.ts` | insightsMainMatchChipTitle, insightsMainMatchQtyAriaLabel |
| `static/js/insights/insightsPanelTableCopy.ts` | insightsTableSeverityLabel, insightsTableKindLabel |
| `static/js/searchResultRowHtml.ts` | searchResultThumbInnerHtml |
| `static/js/searchDomSelectors.ts` | searchResultInitialCellClass |
| `static/js/utils/html.ts` | escapeAttr |
| `static/js/insights/insightsMainMatchChipsHtml.ts` | insightsMainMatchChipsHtml |

## Entry Points

Start here when exploring this area:

- **`searchResultThumbInnerHtml`** (Function) — `static/js/searchResultRowHtml.ts:58`
- **`searchResultInitialCellClass`** (Function) — `static/js/searchDomSelectors.ts:51`
- **`deckSectionMainSideShortLabel`** (Function) — `static/js/deckSectionMainSide.ts:15`
- **`escapeAttr`** (Function) — `static/js/utils/html.ts:13`
- **`insightsMainMatchChipTitle`** (Function) — `static/js/insights/insightsSuggestionsUiCopy.ts:13`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `searchResultThumbInnerHtml` | Function | `static/js/searchResultRowHtml.ts` | 58 |
| `searchResultInitialCellClass` | Function | `static/js/searchDomSelectors.ts` | 51 |
| `deckSectionMainSideShortLabel` | Function | `static/js/deckSectionMainSide.ts` | 15 |
| `escapeAttr` | Function | `static/js/utils/html.ts` | 13 |
| `insightsMainMatchChipTitle` | Function | `static/js/insights/insightsSuggestionsUiCopy.ts` | 13 |
| `insightsMainMatchQtyAriaLabel` | Function | `static/js/insights/insightsSuggestionsUiCopy.ts` | 18 |
| `insightsNumberSuggestionRowsHtml` | Function | `static/js/insights/insightsPanelTableHtml.ts` | 47 |
| `insightsMainMatchChipsHtml` | Function | `static/js/insights/insightsMainMatchChipsHtml.ts` | 44 |
| `suggestionsMainMatchThumbEmptyClassName` | Function | `static/js/insights/insightsDomSelectors.ts` | 66 |
| `insightSeventhTachyonSummaryExtraNoQualifyingWithPrio` | Function | `static/js/insights/seventhTachyonCopy.ts` | 16 |
| `insightSeventhTachyonSummaryExtraNoQualifyingNoPrio` | Function | `static/js/insights/seventhTachyonCopy.ts` | 21 |
| `insightSeventhTachyonSummaryMainWithTargets` | Function | `static/js/insights/seventhTachyonCopy.ts` | 28 |
| `extractNumberIndexFromName` | Function | `static/js/services/insights/seventhTachyonInsight.ts` | 39 |
| `computeSeventhTachyonInsight` | Function | `static/js/services/insights/seventhTachyonInsight.ts` | 213 |
| `deckSectionMainSideSortKey` | Function | `static/js/deckSectionMainSide.ts` | 30 |
| `refreshInsightsUI` | Function | `static/js/insights/panel.ts` | 29 |
| `insightsSummaryRowsHtml` | Function | `static/js/insights/insightsPanelTableHtml.ts` | 32 |
| `insightsSeventhTachyonDetailRowsHtml` | Function | `static/js/insights/insightsPanelTableHtml.ts` | 70 |
| `insightsTableSeverityLabel` | Function | `static/js/insights/insightsPanelTableCopy.ts` | 10 |
| `insightsTableKindLabel` | Function | `static/js/insights/insightsPanelTableCopy.ts` | 14 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `RefreshInsightsUI → NormalizeName` | cross_community | 7 |
| `OpenPopover → EscapeAttr` | cross_community | 6 |
| `RefreshInsightsUI → NormAttr` | cross_community | 6 |
| `RefreshInsightsUI → NormRace` | cross_community | 6 |
| `RefreshInsightsUI → DeckSectionMainSideSortKey` | cross_community | 6 |
| `ComputeSeventhTachyonInsight → CardTypeKindFromTypeStringOrNull` | cross_community | 6 |
| `CleanCardTable → EscapeAttr` | cross_community | 6 |
| `RefreshInsightsUI → IsXyzMonster` | cross_community | 5 |
| `RefreshInsightsUI → ExtractNumberIndexFromName` | cross_community | 5 |
| `ComputeSeventhTachyonInsight → NormRace` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Analysis | 6 calls |
| Js | 1 calls |
| Init | 1 calls |

## How to Explore

1. `gitnexus_context({name: "searchResultThumbInnerHtml"})` — see callers and callees
2. `gitnexus_query({query: "insights"})` — find related execution flows
3. Read key files listed above for implementation details
