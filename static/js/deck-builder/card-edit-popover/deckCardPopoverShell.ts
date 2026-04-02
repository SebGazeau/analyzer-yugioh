/**
 * Structure statique du dialogue « Modifier la carte » (deck builder).
 * Les libellés et la hiérarchie DOM restent ici ; la logique vit dans deck.ts.
 */
export const DECK_CARD_POPOVER_SHELL_HTML = `
        <div class="deck-card-popover-inner">
            <h4 class="deck-card-popover-title">Modifier la carte</h4>
            <div class="deck-card-popover-row">
                <label>Quantité</label>
                <select class="deck-card-popover-qty">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                </select>
            </div>
            <div class="deck-card-popover-row">
                <label>Engine</label>
                <select class="deck-card-popover-engine">
                    <option value="">-</option>
                    <option value="Engine 1">Engine 1</option>
                    <option value="Engine 2">Engine 2</option>
                    <option value="Engine 3">Engine 3</option>
                    <option value="Staple">Staple</option>
                </select>
            </div>
            <div class="deck-card-popover-row deck-card-popover-cats">
                <label>Catégories</label>
                <div class="deck-card-popover-cat-container"></div>
            </div>
            <div class="deck-card-popover-actions">
                <button type="button" class="deck-card-popover-icon-btn deck-card-popover-close btn btn-deck btn-deck-outline" title="Enregistrer les modifications et fermer" aria-label="Enregistrer et fermer">
                    <svg class="deck-card-popover-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
                <button type="button" class="deck-card-popover-icon-btn deck-card-popover-delete btn btn-deck btn-deck-danger" title="Supprimer cette ligne du deck" aria-label="Supprimer la carte du deck">
                    <svg class="deck-card-popover-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M10 11v6M14 11v6"/>
                    </svg>
                </button>
                <button type="button" class="deck-card-popover-icon-btn deck-card-popover-cover btn btn-deck btn-deck-outline" title="Définir cette carte comme couverture du deck (liste Mes decks)" aria-label="Définir comme couverture du deck">
                    <svg class="deck-card-popover-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 17l-4.5-4.5L9 20"/></svg>
                </button>
            </div>
        </div>
    `;
