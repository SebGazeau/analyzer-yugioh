import { describe, expect, it } from 'vitest';
import { KEY_ENTER, KEY_ESCAPE, KEY_F, KEY_SPACE } from '../utils/keyboardKeys.js';

describe('keyboardKeys', () => {
    it('valeurs alignées sur KeyboardEvent.key', () => {
        expect(KEY_ESCAPE).toBe('Escape');
        expect(KEY_ENTER).toBe('Enter');
        expect(KEY_SPACE).toBe(' ');
        expect(KEY_F).toBe('f');
    });
});
