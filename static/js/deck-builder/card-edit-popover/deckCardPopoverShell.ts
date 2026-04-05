/**
 * Structure statique du dialogue « Modifier la carte » (deck builder).
 * Les libellés et la hiérarchie DOM restent ici ; la logique vit dans deck.ts.
 */
import {
    DECK_CARD_POPOVER_ACTIONS_CLASS,
    DECK_CARD_POPOVER_CAT_CONTAINER_CLASS,
    DECK_CARD_POPOVER_CATS_CLASS,
    DECK_CARD_POPOVER_CLOSE_FULL_BTN_CLASS,
    DECK_CARD_POPOVER_COVER_FULL_BTN_CLASS,
    DECK_CARD_POPOVER_DELETE_FULL_BTN_CLASS,
    DECK_CARD_POPOVER_ENGINE_CLASS,
    DECK_CARD_POPOVER_ICON_CLASS,
    DECK_CARD_POPOVER_ICON_SVG_ATTRS,
    DECK_CARD_POPOVER_INNER_CLASS,
    DECK_CARD_POPOVER_QTY_CLASS,
    DECK_CARD_POPOVER_ROW_CLASS,
    DECK_CARD_POPOVER_SVG_COVER_INNER_HTML,
    DECK_CARD_POPOVER_SVG_DELETE_PATHS_HTML,
    DECK_CARD_POPOVER_SVG_PATH_CLOSE_D,
    DECK_CARD_POPOVER_TITLE_CLASS,
} from './deckCardPopoverDomSelectors.js';
import { ARIA_HIDDEN_ATTR, ARIA_LABEL_ATTR } from '../../utils/ariaAttrs.js';
import { BTN_TYPE_ATTR, BTN_TYPE_BUTTON } from '../../utils/htmlAttrs.js';

export const DECK_CARD_POPOVER_SHELL_HTML = `
        <div class="${DECK_CARD_POPOVER_INNER_CLASS}">
            <h4 class="${DECK_CARD_POPOVER_TITLE_CLASS}">Modifier la carte</h4>
            <div class="${DECK_CARD_POPOVER_ROW_CLASS}">
                <label>Quantité</label>
                <select class="${DECK_CARD_POPOVER_QTY_CLASS}">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                </select>
            </div>
            <div class="${DECK_CARD_POPOVER_ROW_CLASS}">
                <label>Engine</label>
                <select class="${DECK_CARD_POPOVER_ENGINE_CLASS}">
                    <option value="">-</option>
                    <option value="Engine 1">Engine 1</option>
                    <option value="Engine 2">Engine 2</option>
                    <option value="Engine 3">Engine 3</option>
                    <option value="Staple">Staple</option>
                </select>
            </div>
            <div class="${DECK_CARD_POPOVER_ROW_CLASS} ${DECK_CARD_POPOVER_CATS_CLASS}">
                <label>Catégories</label>
                <div class="${DECK_CARD_POPOVER_CAT_CONTAINER_CLASS}"></div>
            </div>
            <div class="${DECK_CARD_POPOVER_ACTIONS_CLASS}">
                <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${DECK_CARD_POPOVER_CLOSE_FULL_BTN_CLASS}" title="Enregistrer les modifications et fermer" ${ARIA_LABEL_ATTR}="Enregistrer et fermer">
                    <svg class="${DECK_CARD_POPOVER_ICON_CLASS}" ${DECK_CARD_POPOVER_ICON_SVG_ATTRS} ${ARIA_HIDDEN_ATTR}="true"><path d="${DECK_CARD_POPOVER_SVG_PATH_CLOSE_D}"/></svg>
                </button>
                <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${DECK_CARD_POPOVER_DELETE_FULL_BTN_CLASS}" title="Supprimer cette ligne du deck" ${ARIA_LABEL_ATTR}="Supprimer la carte du deck">
                    <svg class="${DECK_CARD_POPOVER_ICON_CLASS}" ${DECK_CARD_POPOVER_ICON_SVG_ATTRS} ${ARIA_HIDDEN_ATTR}="true">${DECK_CARD_POPOVER_SVG_DELETE_PATHS_HTML}</svg>
                </button>
                <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${DECK_CARD_POPOVER_COVER_FULL_BTN_CLASS}" title="Définir cette carte comme couverture du deck (liste Mes decks)" ${ARIA_LABEL_ATTR}="Définir comme couverture du deck">
                    <svg class="${DECK_CARD_POPOVER_ICON_CLASS}" ${DECK_CARD_POPOVER_ICON_SVG_ATTRS} ${ARIA_HIDDEN_ATTR}="true">${DECK_CARD_POPOVER_SVG_COVER_INNER_HTML}</svg>
                </button>
            </div>
        </div>
    `;
