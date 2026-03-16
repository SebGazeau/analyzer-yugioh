// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { getDeckGridRows, getLastGridRow } from '../utils.js';

describe('utils.ts', () => {
  describe('getDeckGridRows', () => {
    beforeEach(() => {
      document.body.innerHTML =
        '<div class="deck-table-grid">' +
        '<div></div>'.repeat(7) + // header
        '<div></div>'.repeat(7) + // row 1
        '<div></div>'.repeat(7) + // row 2
        '</div>';
    });

    it('returns correct number of rows', () => {
      const rows = getDeckGridRows('.deck-table-grid', 7);
      expect(rows.length).toBe(2);
      expect(rows[0].length).toBe(7);
      expect(rows[1].length).toBe(7);
    });

    it('returns [] when grid is missing', () => {
      document.body.innerHTML = '';
      expect(getDeckGridRows('#missing-grid', 7)).toEqual([]);
    });
  });

  describe('getLastGridRow', () => {
    it('returns null when grid is missing', () => {
      document.body.innerHTML = '';
      expect(getLastGridRow('#missing', 7)).toBeNull();
    });

    it('returns null when rowCount is 0 (only header)', () => {
      document.body.innerHTML = '<div id="g">' + '<div></div>'.repeat(7) + '</div>';
      expect(getLastGridRow('#g', 7)).toBeNull();
    });

    it('returns last row when grid has rows', () => {
      document.body.innerHTML =
        '<div id="grid">' +
        '<div></div>'.repeat(7) + // header
        '<div class="r1"></div>'.repeat(7) +
        '<div class="r2"></div>'.repeat(7) +
        '</div>';
      const last = getLastGridRow('#grid', 7);
      expect(last).toHaveLength(7);
      expect(last?.[0]?.classList.contains('r2')).toBe(true);
    });
  });
}); 