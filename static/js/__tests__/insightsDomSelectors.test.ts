import { describe, it, expect } from 'vitest';
import {
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
});
