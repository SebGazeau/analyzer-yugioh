---
name: associations
description: "Skill for the Associations area of analyzer-yugioh. 72 symbols across 25 files."
---

# Associations

72 symbols | 25 files | Cohesion: 79%

## When to Use

- Working with code in `static/`
- Understanding how associationGroupDisplayLabelSameArchetype, associationGroupDisplayLabelTextCiting, associationDiagnosticYgorgEffectEnCountMessage work
- Modifying associations-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `static/js/associations/associationsReportDiagnosticsCopy.ts` | associationDiagnosticYgorgEffectEnCountMessage, associationDiagnosticNoArchetypeOnAnchorMessage, associationDiagnosticArchetypeGroupTruncatedMessage, associationDiagnosticQaGroupTruncatedMessage, associationDiagnosticNoDescInCatalogMessage (+3) |
| `static/js/associations/modal.ts` | announceAssociationsModal, addAssociationTileToDeck, copyMarkdownToClipboard, ensureModalElements, closeAssociationsModal (+3) |
| `static/js/associations/associationsReportMarkdownCopy.ts` | associationMarkdownTitleLine, associationMarkdownGeneratedLine, associationMarkdownGroupAngleLinkLine, associationMarkdownGroupCardCountLine, associationMarkdownGroupHeading (+3) |
| `static/js/services/associations/reportTextMatch.ts` | escapeRegex, patternMatchesInCitableText, associationCitableText, associationCitableTextForAnchorNameMatch, collapseWhitespaceLower (+1) |
| `static/js/services/associations/buildAssociationReportCore.ts` | pushDiagnostic, buildAssociationReport, normalizeCatalogCard, optStr, toAssociationCatalog |
| `static/js/associations/dynamicTextMentions.ts` | stripCombiningMarks, slugKey, expandPhrasePatterns, extractNameWords, buildDynamicTextMentionRulesFromAnchor |
| `static/js/associations/associationsReportGroupDisplayCopy.ts` | associationGroupDisplayLabelSameArchetype, associationGroupDisplayLabelTextCiting, associationGroupDisplayLabelCitationText, associationGroupDisplayLabelCitationNameWord |
| `static/js/associations/associationsModalReportCopy.ts` | associationsModalReportArchetypeLineJoined, associationsModalReportEmptyArchetypeDisplay, associationsModalReportExpandTilesAriaLabel, associationsModalReportExpandTilesButtonCaption |
| `static/js/associations/associationsModalReportHtml.ts` | countAssociationStats, associationsModalReportBodyHtml, associationsModalCatalogLoadErrorParagraphHtml |
| `static/js/associations/associationFetchCache.ts` | run, getAssociationCatalog, getQaRelatedCardIds |

## Entry Points

Start here when exploring this area:

- **`associationGroupDisplayLabelSameArchetype`** (Function) — `static/js/associations/associationsReportGroupDisplayCopy.ts:12`
- **`associationGroupDisplayLabelTextCiting`** (Function) — `static/js/associations/associationsReportGroupDisplayCopy.ts:18`
- **`associationDiagnosticYgorgEffectEnCountMessage`** (Function) — `static/js/associations/associationsReportDiagnosticsCopy.ts:9`
- **`associationDiagnosticNoArchetypeOnAnchorMessage`** (Function) — `static/js/associations/associationsReportDiagnosticsCopy.ts:13`
- **`associationDiagnosticArchetypeGroupTruncatedMessage`** (Function) — `static/js/associations/associationsReportDiagnosticsCopy.ts:17`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `associationGroupDisplayLabelSameArchetype` | Function | `static/js/associations/associationsReportGroupDisplayCopy.ts` | 12 |
| `associationGroupDisplayLabelTextCiting` | Function | `static/js/associations/associationsReportGroupDisplayCopy.ts` | 18 |
| `associationDiagnosticYgorgEffectEnCountMessage` | Function | `static/js/associations/associationsReportDiagnosticsCopy.ts` | 9 |
| `associationDiagnosticNoArchetypeOnAnchorMessage` | Function | `static/js/associations/associationsReportDiagnosticsCopy.ts` | 13 |
| `associationDiagnosticArchetypeGroupTruncatedMessage` | Function | `static/js/associations/associationsReportDiagnosticsCopy.ts` | 17 |
| `associationDiagnosticQaGroupTruncatedMessage` | Function | `static/js/associations/associationsReportDiagnosticsCopy.ts` | 25 |
| `associationDiagnosticNoDescInCatalogMessage` | Function | `static/js/associations/associationsReportDiagnosticsCopy.ts` | 32 |
| `associationDiagnosticNameWordCitationSkippedMessage` | Function | `static/js/associations/associationsReportDiagnosticsCopy.ts` | 36 |
| `associationDiagnosticMentionGroupTruncatedMessage` | Function | `static/js/associations/associationsReportDiagnosticsCopy.ts` | 44 |
| `associationDiagnosticAnchorNameInDescTruncatedMessage` | Function | `static/js/associations/associationsReportDiagnosticsCopy.ts` | 51 |
| `patternMatchesInCitableText` | Function | `static/js/services/associations/reportTextMatch.ts` | 14 |
| `associationCitableText` | Function | `static/js/services/associations/reportTextMatch.ts` | 28 |
| `associationCitableTextForAnchorNameMatch` | Function | `static/js/services/associations/reportTextMatch.ts` | 44 |
| `collapseWhitespaceLower` | Function | `static/js/services/associations/reportTextMatch.ts` | 55 |
| `normalizeAnchorNameForDescMatch` | Function | `static/js/services/associations/reportTextMatch.ts` | 59 |
| `buildAssociationReport` | Function | `static/js/services/associations/buildAssociationReportCore.ts` | 123 |
| `msgAssociationCardNotFound` | Function | `static/js/utils/userDialogMessages.ts` | 49 |
| `copyAssociationCardNotFoundMessage` | Function | `static/js/utils/userDialogCopy.ts` | 40 |
| `closeAssociationsModal` | Function | `static/js/associations/modal.ts` | 204 |
| `associationsModalShellInnerHtml` | Function | `static/js/associations/associationsModalShellHtml.ts` | 43 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `OpenAssociatedCardsModal → NormName` | cross_community | 6 |
| `OpenAssociatedCardsModal → IsExtraDeckRowLike` | cross_community | 6 |
| `Card_by_name → Card_name_en` | cross_community | 5 |
| `OpenAssociatedCardsModal → CopyAssociationCardNotFoundMessage` | cross_community | 5 |
| `OpenAssociatedCardsModal → GetState` | cross_community | 5 |
| `FetchAssociationModalPayload → OptStr` | cross_community | 5 |
| `FetchAssociationModalPayload → StripCombiningMarks` | cross_community | 5 |
| `OpenAssociatedCardsModal → AnnounceAssociationsModal` | cross_community | 4 |
| `OpenAssociatedCardsModal → OptStr` | intra_community | 4 |
| `OpenAssociatedCardsModal → EscapeHtml` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Js | 3 calls |
| Analysis | 3 calls |
| Insights | 2 calls |
| Tests | 1 calls |
| Structs | 1 calls |

## How to Explore

1. `gitnexus_context({name: "associationGroupDisplayLabelSameArchetype"})` — see callers and callees
2. `gitnexus_query({query: "associations"})` — find related execution flows
3. Read key files listed above for implementation details
