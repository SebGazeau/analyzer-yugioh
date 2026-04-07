import { describe, it, expect } from 'vitest';
import {
  BUILDER_COMPOSITION_DETAIL_EMPTY_CLASS,
  BUILDER_COMPOSITION_DETAIL_GROUP_CLASS,
} from '../analysis/compositionBreakdownDomSelectors.js';

describe('compositionBreakdownDomSelectors', () => {
  it('classes alignées sur le CSS builder composition', () => {
    expect(BUILDER_COMPOSITION_DETAIL_EMPTY_CLASS).toBe('builder-composition-detail-empty');
    expect(BUILDER_COMPOSITION_DETAIL_GROUP_CLASS).toBe('builder-composition-detail-group');
  });
});
