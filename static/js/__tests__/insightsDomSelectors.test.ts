import { describe, it, expect } from 'vitest';
import {
  INSIGHTS_ADD_DECK_CARD_DATA_ATTR_VALUE,
  SUGGESTIONS_MAIN_MATCH_THUMB_CLASS,
  SUGGESTIONS_MAIN_MATCH_THUMB_EMPTY_CLASS,
  suggestionsMainMatchThumbEmptyClassName,
} from '../insights/insightsDomSelectors.js';

describe('insightsDomSelectors — classes Suggestions (panel)', () => {
  it('valeur attribut add-deck-card stable', () => {
    expect(INSIGHTS_ADD_DECK_CARD_DATA_ATTR_VALUE).toBe('1');
  });

  it('thumb vide = base + modificateur --empty', () => {
    expect(suggestionsMainMatchThumbEmptyClassName()).toBe(
      `${SUGGESTIONS_MAIN_MATCH_THUMB_CLASS} ${SUGGESTIONS_MAIN_MATCH_THUMB_EMPTY_CLASS}`,
    );
  });
});
