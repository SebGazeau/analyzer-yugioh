import { describe, it, expect } from 'vitest';
import {
    ASSOCIATIONS_MODAL_ROOT_CLASS,
    ASSOCIATIONS_MODAL_TILE_GRID_CLASS,
    ASSOCIATIONS_REST_IDS_VALUE_SEPARATOR,
    DATA_ASSOCIATION_ANGLE_ATTR,
    DATA_ASSOCIATIONS_DIAGNOSTIC_SEVERITY_ATTR,
} from '../../associations/associationsDomSelectors.js';

describe('associationsDomSelectors', () => {
    it('contrats modal + grille tuiles', () => {
        expect(ASSOCIATIONS_MODAL_ROOT_CLASS).toBe('associations-modal');
        expect(ASSOCIATIONS_MODAL_TILE_GRID_CLASS).toBe('associations-modal__tile-grid');
        expect(DATA_ASSOCIATION_ANGLE_ATTR).toBe('data-association-angle');
        expect(DATA_ASSOCIATIONS_DIAGNOSTIC_SEVERITY_ATTR).toBe('data-severity');
        expect(ASSOCIATIONS_REST_IDS_VALUE_SEPARATOR).toBe(',');
    });
});
