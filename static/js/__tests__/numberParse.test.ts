import { describe, expect, it } from 'vitest';
import { INTEGER_STRING_DECIMAL_RADIX } from '../utils/numberParse.js';

describe('numberParse', () => {
  it('radix décimal pour parseInt', () => {
    expect(INTEGER_STRING_DECIMAL_RADIX).toBe(10);
    expect(parseInt('42', INTEGER_STRING_DECIMAL_RADIX)).toBe(42);
  });
});
