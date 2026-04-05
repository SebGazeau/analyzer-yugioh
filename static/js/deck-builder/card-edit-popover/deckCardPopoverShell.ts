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
    DECK_CARD_POPOVER_INNER_CLASS,
    DECK_CARD_POPOVER_QTY_CLASS,
    DECK_CARD_POPOVER_ROW_CLASS,
    DECK_CARD_POPOVER_TITLE_CLASS,
} from './deckCardPopoverDomSelectors.js';
import { ARIA_HIDDEN_ATTR, ARIA_LABEL_ATTR } from '../../utils/ariaAttrs.js';

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
                <button type="button" class="${DECK_CARD_POPOVER_CLOSE_FULL_BTN_CLASS}" title="Enregistrer les modifications et fermer" ${ARIA_LABEL_ATTR}="Enregistrer et fermer">
                    <svg class="${DECK_CARD_POPOVER_ICON_CLASS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ${ARIA_HIDDEN_ATTR}="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
                <button type="button" class="${DECK_CARD_POPOVER_DELETE_FULL_BTN_CLASS}" title="Supprimer cette ligne du deck" ${ARIA_LABEL_ATTR}="Supprimer la carte du deck">
                    <svg class="${DECK_CARD_POPOVER_ICON_CLASS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${ARIA_HIDDEN_ATTR}="true">
                        <path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M10 11v6M14 11v6"/>
                    </svg>
                </button>
                <button type="button" class="${DECK_CARD_POPOVER_COVER_FULL_BTN_CLASS}" title="Définir cette carte comme couverture du deck (liste Mes decks)" ${ARIA_LABEL_ATTR}="Définir comme couverture du deck">
                    <svg class="${DECK_CARD_POPOVER_ICON_CLASS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${ARIA_HIDDEN_ATTR}="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 17l-4.5-4.5L9 20"/></svg>
                </button>
            </div>
        </div>
    `;
