import { describe, it, expect } from 'vitest';
import {
  STYLE_DISPLAY_BLOCK,
  STYLE_DISPLAY_DEFAULT,
  STYLE_DISPLAY_FLEX,
  STYLE_DISPLAY_NONE,
} from '../utils/cssInlineDisplay.js';

describe('cssInlineDisplay', () => {
  it('valeurs alignées sur les assignations style.display du navigateur', () => {
    expect(STYLE_DISPLAY_FLEX).toBe('flex');
    expect(STYLE_DISPLAY_NONE).toBe('none');
    expect(STYLE_DISPLAY_BLOCK).toBe('block');
    expect(STYLE_DISPLAY_DEFAULT).toBe('');
  });
});
