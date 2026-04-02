import { describe, expect, it } from 'vitest';
import { findMainDeckCardImageUrl } from '../analysis/deckMainImageLookup.js';

describe('deckMainImageLookup', () => {
    it('trouve l’URL en ignorant le préfixe — et la casse des espaces', () => {
        const url = findMainDeckCardImageUrl(
            [{ name: '— Dark Magician', imageUrl: 'https://x/y.jpg' }],
            'Dark Magician',
        );
        expect(url).toBe('https://x/y.jpg');
    });

    it('retourne null si aucune correspondance', () => {
        expect(findMainDeckCardImageUrl([{ name: 'A' }], 'B')).toBeNull();
    });
});
