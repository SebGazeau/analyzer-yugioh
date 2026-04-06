import { describe, expect, it } from 'vitest';
import {
    DOM_EVENT_CHANGE,
    DOM_EVENT_CLICK,
    DOM_EVENT_DOM_CONTENT_LOADED,
    DOM_EVENT_DRAGEND,
    DOM_EVENT_DRAGOVER,
    DOM_EVENT_DRAGSTART,
    DOM_EVENT_DROP,
    DOM_EVENT_INPUT,
    DOM_EVENT_KEYDOWN,
    DOM_EVENT_RESIZE,
    DOM_EVENT_SCROLL,
} from '../utils/domEventNames.js';

describe('domEventNames', () => {
    it('noms alignés sur les événements DOM standard', () => {
        expect(DOM_EVENT_CLICK).toBe('click');
        expect(DOM_EVENT_CHANGE).toBe('change');
        expect(DOM_EVENT_INPUT).toBe('input');
        expect(DOM_EVENT_KEYDOWN).toBe('keydown');
        expect(DOM_EVENT_DOM_CONTENT_LOADED).toBe('DOMContentLoaded');
        expect(DOM_EVENT_DRAGSTART).toBe('dragstart');
        expect(DOM_EVENT_DRAGEND).toBe('dragend');
        expect(DOM_EVENT_DRAGOVER).toBe('dragover');
        expect(DOM_EVENT_DROP).toBe('drop');
        expect(DOM_EVENT_SCROLL).toBe('scroll');
        expect(DOM_EVENT_RESIZE).toBe('resize');
    });
});
