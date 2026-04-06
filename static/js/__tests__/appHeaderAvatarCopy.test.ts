import { describe, expect, it } from 'vitest';
import {
    HEADER_AVATAR_INITIALS_PLACEHOLDER,
    HEADER_AVATAR_SINGLE_WORD_CHAR_COUNT,
} from '../appHeaderAvatarCopy.js';

describe('appHeaderAvatarCopy', () => {
    it('placeholder initiales', () => {
        expect(HEADER_AVATAR_INITIALS_PLACEHOLDER).toBe('?');
    });

    it('troncature pseudo mot unique', () => {
        expect(HEADER_AVATAR_SINGLE_WORD_CHAR_COUNT).toBe(2);
    });
});
