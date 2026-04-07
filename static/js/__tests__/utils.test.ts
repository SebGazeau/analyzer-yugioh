// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DECK_BUILDER_GRID_COLUMN_COUNT,
  DECK_TABLE_GRID_CLASS,
  DECK_TABLE_GRID_SELECTOR,
} from '../deck-builder/deckConstants.js';
import { getDeckGridRows, getLastGridRow } from '../utils.js';
import { escapeAttr } from '../utils/html.js';

describe('utils/html escapeAttr', () => {
  it('échappe & " \' < > pour attributs', () => {
    expect(escapeAttr('a & b')).toBe('a &amp; b');
    expect(escapeAttr('say "hi"')).toBe('say &quot;hi&quot;');
    expect(escapeAttr("<a href='x'>")).toBe('&lt;a href=&#39;x&#39;&gt;');
    expect(escapeAttr('<img>')).toBe('&lt;img&gt;');
  });
});

describe('utils.ts', () => {
  describe('getDeckGridRows', () => {
    beforeEach(() => {
      const c = DECK_BUILDER_GRID_COLUMN_COUNT;
      document.body.innerHTML =
        `<div class="${DECK_TABLE_GRID_CLASS}">` +
        '<div></div>'.repeat(c) + // header
        '<div></div>'.repeat(c) + // row 1
        '<div></div>'.repeat(c) + // row 2
        '</div>';
    });

    it('returns correct number of rows', () => {
      const c = DECK_BUILDER_GRID_COLUMN_COUNT;
      const rows = getDeckGridRows(DECK_TABLE_GRID_SELECTOR, c);
      expect(rows.length).toBe(2);
      expect(rows[0].length).toBe(c);
      expect(rows[1].length).toBe(c);
    });

    it('returns [] when grid is missing', () => {
      document.body.innerHTML = '';
      expect(getDeckGridRows('#missing-grid', DECK_BUILDER_GRID_COLUMN_COUNT)).toEqual([]);
    });
  });

  describe('getLastGridRow', () => {
    it('returns null when grid is missing', () => {
      document.body.innerHTML = '';
      expect(getLastGridRow('#missing', DECK_BUILDER_GRID_COLUMN_COUNT)).toBeNull();
    });

    it('returns null when rowCount is 0 (only header)', () => {
      const c = DECK_BUILDER_GRID_COLUMN_COUNT;
      document.body.innerHTML = '<div id="g">' + '<div></div>'.repeat(c) + '</div>';
      expect(getLastGridRow('#g', c)).toBeNull();
    });

    it('returns last row when grid has rows', () => {
      const c = DECK_BUILDER_GRID_COLUMN_COUNT;
      document.body.innerHTML =
        '<div id="grid">' +
        '<div></div>'.repeat(c) + // header
        '<div class="r1"></div>'.repeat(c) +
        '<div class="r2"></div>'.repeat(c) +
        '</div>';
      const last = getLastGridRow('#grid', c);
      expect(last).toHaveLength(c);
      expect(last?.[0]?.classList.contains('r2')).toBe(true);
    });
  });
}); 