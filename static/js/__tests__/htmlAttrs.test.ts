import { describe, it, expect } from 'vitest';
import {
  DRAGGABLE_ATTR,
  HIDDEN_ATTR,
  ROLE_ATTR,
  ROLE_BUTTON,
  ROLE_DIALOG,
  TABINDEX_ATTR,
} from '../utils/htmlAttrs.js';

describe('htmlAttrs', () => {
  it('noms d’attributs HTML standards', () => {
    expect(ROLE_ATTR).toBe('role');
    expect(TABINDEX_ATTR).toBe('tabindex');
    expect(HIDDEN_ATTR).toBe('hidden');
    expect(DRAGGABLE_ATTR).toBe('draggable');
  });

  it('valeurs role courantes', () => {
    expect(ROLE_BUTTON).toBe('button');
    expect(ROLE_DIALOG).toBe('dialog');
  });
});
