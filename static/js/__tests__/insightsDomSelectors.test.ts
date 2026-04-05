import { describe, it, expect } from 'vitest';
import {
  INSIGHTS_FIND_CARD_BUTTON_TITLE,
  INSIGHTS_SUGGEST_ROW_TITLE,
  insightsMainMatchChipTitle,
  SUGGESTIONS_MAIN_MATCH_THUMB_CLASS,
  SUGGESTIONS_MAIN_MATCH_THUMB_EMPTY_CLASS,
  suggestionsMainMatchThumbEmptyClassName,
} from '../insights/insightsDomSelectors.js';

describe('insightsDomSelectors — classes Suggestions (panel)', () => {
  it('thumb vide = base + modificateur --empty', () => {
    expect(suggestionsMainMatchThumbEmptyClassName()).toBe(
      `${SUGGESTIONS_MAIN_MATCH_THUMB_CLASS} ${SUGGESTIONS_MAIN_MATCH_THUMB_EMPTY_CLASS}`,
    );
  });

  it('titres panel Suggestions (match chip, ligne Xyz, Chercher)', () => {
    expect(insightsMainMatchChipTitle('M')).toContain('M');
    expect(INSIGHTS_SUGGEST_ROW_TITLE).toContain('Xyz');
    expect(INSIGHTS_FIND_CARD_BUTTON_TITLE).toContain('Builder');
  });
});
