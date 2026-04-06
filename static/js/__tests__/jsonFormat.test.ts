import { describe, expect, it } from 'vitest';
import { JSON_STRINGIFY_PRETTY_INDENT_SPACES } from '../utils/jsonFormat.js';

describe('jsonFormat', () => {
  it('indentation pretty-print', () => {
    expect(JSON_STRINGIFY_PRETTY_INDENT_SPACES).toBe(2);
  });
});
