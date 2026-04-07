import { describe, it, expect } from 'vitest';
import {
    ASSOCIATIONS_DATA_ATTR_PRESENCE_VALUE,
    ASSOCIATIONS_MODAL_ANCHOR_ART_ID,
    ASSOCIATIONS_MODAL_BODY_ID,
    ASSOCIATIONS_MODAL_LIVE_ID,
    ASSOCIATIONS_MODAL_LOADING_ID,
    ASSOCIATIONS_MODAL_PANEL_ID,
    ASSOCIATIONS_MODAL_ROOT_CLASS,
    ASSOCIATIONS_MODAL_ROOT_ID,
    ASSOCIATIONS_MODAL_SUBTITLE_ID,
    ASSOCIATIONS_MODAL_TITLE_ID,
    ASSOCIATIONS_MODAL_TILE_GRID_CLASS,
    ASSOCIATIONS_REST_IDS_VALUE_SEPARATOR,
    DATA_ASSOCIATION_ANGLE_ATTR,
    DATA_ASSOCIATIONS_DIAGNOSTIC_SEVERITY_ATTR,
} from '../../associations/associationsDomSelectors.js';

describe('associationsDomSelectors', () => {
    it('valeur présence data-associations stable', () => {
        expect(ASSOCIATIONS_DATA_ATTR_PRESENCE_VALUE).toBe('1');
    });

    it('contrats modal + grille tuiles', () => {
        expect(ASSOCIATIONS_MODAL_ROOT_CLASS).toBe('associations-modal');
        expect(ASSOCIATIONS_MODAL_TILE_GRID_CLASS).toBe('associations-modal__tile-grid');
        expect(DATA_ASSOCIATION_ANGLE_ATTR).toBe('data-association-angle');
        expect(DATA_ASSOCIATIONS_DIAGNOSTIC_SEVERITY_ATTR).toBe('data-severity');
        expect(ASSOCIATIONS_REST_IDS_VALUE_SEPARATOR).toBe(',');
        expect(ASSOCIATIONS_MODAL_ROOT_ID).toBe(ASSOCIATIONS_MODAL_ROOT_CLASS);
        expect(ASSOCIATIONS_MODAL_TITLE_ID).toBe('associations-modal-title');
        expect(ASSOCIATIONS_MODAL_SUBTITLE_ID).toBe('associations-modal-subtitle');
        expect(ASSOCIATIONS_MODAL_BODY_ID).toBe('associations-modal-body');
        expect(ASSOCIATIONS_MODAL_LOADING_ID).toBe('associations-modal-loading');
        expect(ASSOCIATIONS_MODAL_PANEL_ID).toBe('associations-modal-panel');
        expect(ASSOCIATIONS_MODAL_LIVE_ID).toBe('associations-modal-live');
        expect(ASSOCIATIONS_MODAL_ANCHOR_ART_ID).toBe('associations-modal-anchor-art');
    });
});
