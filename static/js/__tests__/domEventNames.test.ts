import { describe, expect, it } from 'vitest';
import { DOM_EVENT_DOM_CONTENT_LOADED, DOM_EVENT_INPUT } from '../utils/domEventNames.js';

describe('domEventNames', () => {
    it('noms alignés sur les événements DOM standard', () => {
        expect(DOM_EVENT_INPUT).toBe('input');
        expect(DOM_EVENT_DOM_CONTENT_LOADED).toBe('DOMContentLoaded');
    });
});
