import { describe, it, expect } from 'vitest';
import {
  ASSOCIATIONS_LIVE_CANNOT_RESOLVE_CARD_NAME,
  ASSOCIATIONS_LIVE_COPY_FAILED,
  ASSOCIATIONS_LIVE_REPORT_COPIED,
  associationsLiveCardAddedToDeck,
} from '../../associations/associationsLiveMessages.js';
import { TEXT_EM_DASH } from '../../utils/textPlaceholders.js';

describe('associationsLiveMessages', () => {
  it('messages stables + ajout deck paramétré', () => {
    expect(ASSOCIATIONS_LIVE_CANNOT_RESOLVE_CARD_NAME.length).toBeGreaterThan(15);
    expect(associationsLiveCardAddedToDeck('X')).toContain('X');
    expect(ASSOCIATIONS_LIVE_REPORT_COPIED).toContain('presse-papiers');
    expect(ASSOCIATIONS_LIVE_COPY_FAILED).toContain(TEXT_EM_DASH);
    expect(ASSOCIATIONS_LIVE_COPY_FAILED).toContain('Copie impossible');
  });
});
