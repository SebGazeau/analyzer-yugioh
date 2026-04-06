/**
 * Sous-titre du modal associations (nom carte + passcode).
 */

import { TEXT_MIDDLE_DOT } from '../utils/textPlaceholders.js';

export function associationsModalSubtitle(displayName: string, passcode: number): string {
    return `${displayName} ${TEXT_MIDDLE_DOT} passcode ${passcode}`;
}
