/**
 * Textes du formulaire du popover « Modifier la carte » (shell statique).
 */

import { DECK_DEFAULT_MAX_COPIES_PER_CARD } from '../deckConstants.js';

export const DECK_CARD_POPOVER_LABEL_QTY = 'Quantité';

export const DECK_CARD_POPOVER_LABEL_ENGINE = 'Engine';

export const DECK_CARD_POPOVER_LABEL_CATEGORIES = 'Catégories';

/** Libellé de l’option `value=""` du select engine. */
export const DECK_CARD_POPOVER_ENGINE_OPTION_EMPTY_LABEL = '-';

/** Valeurs du select engine (`value` = texte affiché). */
export const DECK_CARD_POPOVER_ENGINE_CHOICES = ['Engine 1', 'Engine 2', 'Engine 3', 'Staple'] as const;

/** Nombre d’options quantité générées dans le shell (1 à N inclus), aligné sur le max TCG normal. */
export const DECK_CARD_POPOVER_SHELL_QTY_OPTION_COUNT = DECK_DEFAULT_MAX_COPIES_PER_CARD;
