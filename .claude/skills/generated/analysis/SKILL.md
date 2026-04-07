---
name: analysis
description: "Skill for the Analysis area of analyzer-yugioh. 87 symbols across 29 files."
---

# Analysis

87 symbols | 29 files | Cohesion: 67%

## When to Use

- Working with code in `static/`
- Understanding how escapeHtml, cssLengthPercent, renderAnalysisCategorySummaryDom work
- Modifying analysis-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `static/js/analysis/probabilityMath.ts` | hypergeometricDist, comb, hypergeometric, cumulativeHypergeometric, hypergeometricProbRowStrings (+10) |
| `static/js/stats.ts` | getDeckMainSnapshot, computeGlobalStats, drawOneCard, updateCategorySummary, getDrawnCards (+5) |
| `static/js/analysis/analysisCategorySummaryTableHtml.ts` | analysisCategorySummaryDotClass, analysisCategorySummaryEngineNameCellHtml, analysisCategorySummaryGroupNameCellHtml, analysisSectionHeaderRowInnerHtml, analysisCategorySummaryTableDataRowInnerHtml (+1) |
| `static/js/analysis/drawHistogramDomCopy.ts` | drawHistogramHeadingActive, drawHistogramExplanationText, drawHistogramAllCategoriesTitle, drawHistogramHeadingIdle, drawHistogramEmptyCategoryMsg (+1) |
| `static/js/analysis/categorySummaryData.ts` | countNameOccurrences, remainingDrawCountForProbTable, buildFullDeckCategorySummaries, buildRemainingDeckCategorySummaries, cleanDeckCardDisplayName |
| `static/js/analysis/drawHistogramDom.ts` | updateHistogramCategorySelect, appendCategoryMiniHistogram, runHistogramSimulation1000, updateHistogramDOM, clearHistogramGraphs |
| `static/js/analysis/drawSimulationState.ts` | pushDrawnCardName, getDrawnCardNamesReadonly, getDrawnCardNamesCopy, applyHandSize, clearDrawnCardNames |
| `static/js/analysis/builderStatsDom.ts` | applyBuilderMainTypeCountsAndBars, pct, applyCompositionDetailPanelsHtml, applyDeckSectionCountLabels |
| `static/js/analysis/categorySummaryDom.ts` | addSectionHeader, renderAnalysisCategorySummaryDom, pctDeck |
| `static/js/analysis/analysisCategorySummaryTooltipsCopy.ts` | builderCategorySortRowTitle, analysisHeroGroupReferenceLabel, categoryCompositionSegmentTooltip |

## Entry Points

Start here when exploring this area:

- **`escapeHtml`** (Function) — `static/js/utils/html.ts:6`
- **`cssLengthPercent`** (Function) — `static/js/utils/cssInlineLength.ts:8`
- **`renderAnalysisCategorySummaryDom`** (Function) — `static/js/analysis/categorySummaryDom.ts:91`
- **`pctDeck`** (Function) — `static/js/analysis/categorySummaryDom.ts:102`
- **`builderCategorySortRowTitle`** (Function) — `static/js/analysis/analysisCategorySummaryTooltipsCopy.ts:8`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `escapeHtml` | Function | `static/js/utils/html.ts` | 6 |
| `cssLengthPercent` | Function | `static/js/utils/cssInlineLength.ts` | 8 |
| `renderAnalysisCategorySummaryDom` | Function | `static/js/analysis/categorySummaryDom.ts` | 91 |
| `pctDeck` | Function | `static/js/analysis/categorySummaryDom.ts` | 102 |
| `builderCategorySortRowTitle` | Function | `static/js/analysis/analysisCategorySummaryTooltipsCopy.ts` | 8 |
| `analysisHeroGroupReferenceLabel` | Function | `static/js/analysis/analysisCategorySummaryTooltipsCopy.ts` | 13 |
| `categoryCompositionSegmentTooltip` | Function | `static/js/analysis/analysisCategorySummaryTooltipsCopy.ts` | 22 |
| `analysisCategorySummaryDotClass` | Function | `static/js/analysis/analysisCategorySummaryTableHtml.ts` | 35 |
| `analysisCategorySummaryEngineNameCellHtml` | Function | `static/js/analysis/analysisCategorySummaryTableHtml.ts` | 40 |
| `analysisCategorySummaryGroupNameCellHtml` | Function | `static/js/analysis/analysisCategorySummaryTableHtml.ts` | 45 |
| `analysisSectionHeaderRowInnerHtml` | Function | `static/js/analysis/analysisCategorySummaryTableHtml.ts` | 50 |
| `analysisCategorySummaryTableDataRowInnerHtml` | Function | `static/js/analysis/analysisCategorySummaryTableHtml.ts` | 67 |
| `builderCategoryListRowInnerHtml` | Function | `static/js/analysis/analysisCategorySummaryTableHtml.ts` | 79 |
| `buildMainDeckProbabilitySnapshot` | Function | `static/js/analysis/deckMainSnapshot.ts` | 11 |
| `categorySummarySimulationBannerText` | Function | `static/js/analysis/categorySummarySimulationCopy.ts` | 4 |
| `buildAnalysisCategorySummaryDomInput` | Function | `static/js/analysis/categorySummaryOrchestrator.ts` | 22 |
| `countNameOccurrences` | Function | `static/js/analysis/categorySummaryData.ts` | 19 |
| `remainingDrawCountForProbTable` | Function | `static/js/analysis/categorySummaryData.ts` | 28 |
| `buildFullDeckCategorySummaries` | Function | `static/js/analysis/categorySummaryData.ts` | 32 |
| `buildRemainingDeckCategorySummaries` | Function | `static/js/analysis/categorySummaryData.ts` | 69 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ComputeSeventhTachyonInsight → CardTypeKindFromTypeStringOrNull` | cross_community | 6 |
| `RenderAnalysisCategorySummaryDom → Comb` | cross_community | 5 |
| `InitBuilder → MapDeckSections` | cross_community | 5 |
| `InitBuilder → GetState` | cross_community | 5 |
| `InitBuilder → CssLengthPercent` | cross_community | 5 |
| `InitBuilder → Pct` | cross_community | 5 |
| `InitBuilder → CardTypeKindFromTypeStringOrNull` | cross_community | 5 |
| `ImportDeckFromFile → MapDeckSections` | cross_community | 5 |
| `ImportDeckFromFile → GetState` | cross_community | 5 |
| `RunHistogramSimulation1000 → RawCardSearchResult` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Js | 14 calls |
| Init | 3 calls |
| Insights | 2 calls |

## How to Explore

1. `gitnexus_context({name: "escapeHtml"})` — see callers and callees
2. `gitnexus_query({query: "analysis"})` — find related execution flows
3. Read key files listed above for implementation details
