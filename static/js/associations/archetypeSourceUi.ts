/**
 * Libellés UI pour `archetype_source` (réponses `/search`, `/associations/catalog`).
 */

import { TEXT_ELLIPSIS } from '../utils/textPlaceholders.js';
import {
    ARCHETYPE_SOURCE_CODE_SHORT_PREFIX_LEN,
    ARCHETYPE_SOURCE_CODE_SHORT_TRUNCATE_AFTER_LEN,
    ARCHETYPE_SOURCE_GENERIC_TITLE_PREFIX,
    ARCHETYPE_SOURCE_YGORG_EFFECT_EN_TITLE,
    ARCHETYPE_SOURCE_YGORG_SHORT,
} from './archetypeSourceUiCopy.js';

export function archetypeSourceUi(code: string): { short: string; title: string } {
    const c = code.trim();
    if (!c) return { short: '', title: '' };
    if (c === 'ygorg_effect_en') {
        return {
            short: ARCHETYPE_SOURCE_YGORG_SHORT,
            title: ARCHETYPE_SOURCE_YGORG_EFFECT_EN_TITLE,
        };
    }
    return {
        short:
            c.length > ARCHETYPE_SOURCE_CODE_SHORT_TRUNCATE_AFTER_LEN
                ? `${c.slice(0, ARCHETYPE_SOURCE_CODE_SHORT_PREFIX_LEN)}${TEXT_ELLIPSIS}`
                : c,
        title: `${ARCHETYPE_SOURCE_GENERIC_TITLE_PREFIX}${c}`,
    };
}