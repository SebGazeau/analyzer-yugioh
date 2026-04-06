/**
 * Textes statiques du modal associations (en-tête, chargement, erreur catalogue, tuile, fermer).
 */

import { TEXT_ELLIPSIS } from '../utils/textPlaceholders.js';

/** Texte affiché pendant le chargement catalogue + visuels. */
export const ASSOCIATIONS_MODAL_LOADING_STATUS_TEXT = `Chargement des visuels et du catalogue${TEXT_ELLIPSIS}`;

/** Message utilisateur si le catalogue associations ne charge pas. */
export const ASSOCIATIONS_MODAL_CATALOG_LOAD_ERROR_TEXT =
    'Impossible de charger le catalogue (réseau ou serveur).';

/** Titre principal du panneau (en-tête). */
export const ASSOCIATIONS_MODAL_HEADER_TITLE_TEXT = 'Cartes associées';

/** Tuile catalogue : ajout deck au clic / clavier. */
export const ASSOCIATIONS_MODAL_TILE_ADD_DECK_TITLE = 'Ajouter au deck (clic ou Entrée)';

/** Bouton fermer (croix). */
export const ASSOCIATIONS_MODAL_CLOSE_BTN_ARIA_LABEL = 'Fermer';
