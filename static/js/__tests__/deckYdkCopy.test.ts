import { describe, expect, it } from 'vitest';
import {
    YDK_EXPORT_HEADER_LINE,
    YDK_SECTION_MARKER_EXTRA,
    YDK_SECTION_MARKER_MAIN,
    YDK_SECTION_MARKER_SIDE_OPEN,
} from '../deckYdkCopy.js';

describe('deckYdkCopy', () => {
    it('marqueurs YDK stables', () => {
        expect(YDK_EXPORT_HEADER_LINE).toBe('#created by ...');
        expect(YDK_SECTION_MARKER_MAIN).toBe('#main');
        expect(YDK_SECTION_MARKER_EXTRA).toBe('#extra');
        expect(YDK_SECTION_MARKER_SIDE_OPEN).toBe('!side');
    });
});
