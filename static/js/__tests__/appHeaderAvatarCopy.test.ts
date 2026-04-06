import { describe, expect, it } from 'vitest';
import { HEADER_AVATAR_INITIALS_PLACEHOLDER } from '../appHeaderAvatarCopy.js';

describe('appHeaderAvatarCopy', () => {
    it('placeholder initiales', () => {
        expect(HEADER_AVATAR_INITIALS_PLACEHOLDER).toBe('?');
    });
});
