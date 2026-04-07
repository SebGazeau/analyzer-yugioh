import { describe, it, expect } from 'vitest';
import {
  ARIA_BUSY_ATTR,
  ARIA_EXPANDED_ATTR,
  ARIA_HIDDEN_ATTR,
  ARIA_LABEL_ATTR,
} from '../utils/ariaAttrs.js';

describe('ariaAttrs', () => {
  it('noms alignés sur les attributs ARIA HTML', () => {
    expect(ARIA_LABEL_ATTR).toBe('aria-label');
    expect(ARIA_HIDDEN_ATTR).toBe('aria-hidden');
    expect(ARIA_EXPANDED_ATTR).toBe('aria-expanded');
    expect(ARIA_BUSY_ATTR).toBe('aria-busy');
  });
});
