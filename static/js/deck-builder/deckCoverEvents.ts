/** Événement global : couverture de deck mise à jour (localStorage). */

export const DECK_COVER_CHANGED_EVENT = 'deck-cover-changed';

export type DeckCoverChangedDetail = { deckId: number };

export function dispatchDeckCoverChanged(deckId: number): void {
    window.dispatchEvent(
        new CustomEvent<DeckCoverChangedDetail>(DECK_COVER_CHANGED_EVENT, {
            detail: { deckId },
        }),
    );
}
