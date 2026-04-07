// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setAnalysisDeckName } from '../analysis/analysisPageDom.js';
import { ANALYSIS_DECK_NAME_ELEMENT_ID } from '../analysis/analysisDomIds.js';
import { TEXT_EM_DASH } from '../utils/textPlaceholders.js';

describe('analysisPageDom', () => {
  beforeEach(() => {
    document.body.innerHTML = `<span id="${ANALYSIS_DECK_NAME_ELEMENT_ID}"></span>`;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('setAnalysisDeckName : nom + tiret cadratin + espace final', () => {
    setAnalysisDeckName('  Mon deck  ');
    expect(document.getElementById(ANALYSIS_DECK_NAME_ELEMENT_ID)?.textContent).toBe(
      `Mon deck ${TEXT_EM_DASH} `,
    );
  });

  it('setAnalysisDeckName vide le nœud si nom vide', () => {
    setAnalysisDeckName('   ');
    expect(document.getElementById(ANALYSIS_DECK_NAME_ELEMENT_ID)?.textContent).toBe('');
  });
});
