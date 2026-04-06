import { describe, expect, it } from 'vitest';
import { associationsModalSubtitle } from '../../associations/associationsModalSubtitleCopy.js';
import { TEXT_MIDDLE_DOT } from '../../utils/textPlaceholders.js';

describe('associationsModalSubtitleCopy', () => {
    it('nom, séparateur et passcode', () => {
        expect(associationsModalSubtitle('Dark Magician', 123)).toContain('123');
        expect(associationsModalSubtitle('Dark Magician', 123)).toContain('Dark Magician');
        expect(associationsModalSubtitle('X', 1)).toContain(TEXT_MIDDLE_DOT);
    });
});
