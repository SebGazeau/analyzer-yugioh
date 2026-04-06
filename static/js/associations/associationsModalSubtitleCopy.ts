/**
 * Sous-titre du modal associations (nom carte + passcode).
 */

import { TEXT_MIDDLE_DOT } from '../utils/textPlaceholders.js';

/** Libellé « passcode » entre le nom de carte et l’identifiant numérique. */
export const ASSOCIATIONS_MODAL_SUBTITLE_PASSCODE_LABEL = 'passcode';

export function associationsModalSubtitle(displayName: string, passcode: number): string {
    return `${displayName} ${TEXT_MIDDLE_DOT} ${ASSOCIATIONS_MODAL_SUBTITLE_PASSCODE_LABEL} ${passcode}`;
}
