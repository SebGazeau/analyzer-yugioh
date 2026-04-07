import { describe, expect, it } from 'vitest';
import {
    INSIGHT_SEVENTH_TACHYON_HELP_LINE,
    INSIGHT_SEVENTH_TACHYON_SUMMARY_MAIN_NO_TARGETS,
    INSIGHT_SEVENTH_TACHYON_TITLE,
    insightSeventhTachyonSummaryExtraNoQualifyingNoPrio,
    insightSeventhTachyonSummaryExtraNoQualifyingWithPrio,
    insightSeventhTachyonSummaryMainWithTargets,
} from '../../insights/seventhTachyonCopy.js';
import { TEXT_EN_DASH } from '../../utils/textPlaceholders.js';

describe('seventhTachyonCopy', () => {
    it('titre + aide stables', () => {
        expect(INSIGHT_SEVENTH_TACHYON_TITLE).toBe('Seventh Tachyon');
        expect(INSIGHT_SEVENTH_TACHYON_HELP_LINE.length).toBeGreaterThan(20);
    });

    it('résumés Extra sans Number : prio et plages typographiques', () => {
        expect(insightSeventhTachyonSummaryExtraNoQualifyingWithPrio(3)).toContain('3 proposition');
        expect(insightSeventhTachyonSummaryExtraNoQualifyingWithPrio(3)).toContain(TEXT_EN_DASH);
        expect(insightSeventhTachyonSummaryExtraNoQualifyingNoPrio()).toContain('14 cartes');
    });

    it('résumés Main avec/sans cibles', () => {
        expect(INSIGHT_SEVENTH_TACHYON_SUMMARY_MAIN_NO_TARGETS).toContain('Main');
        expect(insightSeventhTachyonSummaryMainWithTargets(5)).toContain('5');
        expect(insightSeventhTachyonSummaryMainWithTargets(5)).toContain('carte(s) distincte(s)');
    });
});
