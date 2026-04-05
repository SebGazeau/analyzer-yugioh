import { describe, it, expect } from 'vitest';
import { STYLE_CURSOR_POINTER } from '../utils/cssInlineCursor.js';

describe('cssInlineCursor', () => {
  it('valeur alignée sur les assignations style.cursor du navigateur', () => {
    expect(STYLE_CURSOR_POINTER).toBe('pointer');
  });
});
