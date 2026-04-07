import {
    HEADER_AVATAR_INITIALS_PLACEHOLDER,
    HEADER_AVATAR_SINGLE_WORD_CHAR_COUNT,
} from '../appHeaderAvatarCopy.js';

export function getInitials(pseudo: string | null): string {
    if (!pseudo || !pseudo.trim()) return HEADER_AVATAR_INITIALS_PLACEHOLDER;
    const parts = pseudo.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return pseudo
        .slice(0, HEADER_AVATAR_SINGLE_WORD_CHAR_COUNT)
        .toUpperCase()
        .padEnd(HEADER_AVATAR_SINGLE_WORD_CHAR_COUNT, pseudo[0]);
}
