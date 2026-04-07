import { describe, expect, it } from 'vitest';
import {
    YGO_FIRST_HAND_DRAW_COUNT,
    YGO_SECOND_HAND_DRAW_COUNT,
} from '../analysis/yugiohDrawConstants.js';

describe('yugiohDrawConstants', () => {
    it('première main = 5, seconde = 6 (colonnes probas Analysis)', () => {
        expect(YGO_FIRST_HAND_DRAW_COUNT).toBe(5);
        expect(YGO_SECOND_HAND_DRAW_COUNT).toBe(6);
    });
});
