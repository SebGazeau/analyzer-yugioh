import { describe, it, expect } from 'vitest';
import {
  BTN_TYPE_ATTR,
  BTN_TYPE_BUTTON,
  DRAGGABLE_ATTR,
  HIDDEN_ATTR,
  IMG_DECODING_ASYNC,
  IMG_LOADING_LAZY,
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
    expect(BTN_TYPE_ATTR).toBe('type');
  });

  it('valeurs role courantes', () => {
    expect(ROLE_BUTTON).toBe('button');
    expect(ROLE_DIALOG).toBe('dialog');
  });

  it('bouton type + img lazy/async', () => {
    expect(BTN_TYPE_BUTTON).toBe('button');
    expect(IMG_LOADING_LAZY).toBe('lazy');
    expect(IMG_DECODING_ASYNC).toBe('async');
  });
});
