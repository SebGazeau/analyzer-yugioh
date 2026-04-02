/**
 * DOM du panneau « simulation de tirage » (liste + compteur + bouton).
 */

export interface DrawSimulationDomInput {
    drawnCardNames: readonly string[];
    handSize: 5 | 6;
    resolveImageUrl: (cardName: string) => string | null;
    /** Somme des qty du Main (cartes physiques dans le deck). */
    totalMainDeckCards: number;
}

export function refreshDrawSimulationPanel(input: DrawSimulationDomInput): void {
    const { drawnCardNames, handSize, resolveImageUrl, totalMainDeckCards } = input;
    const container = document.getElementById('draw-simulation-list');
    const countEl = document.getElementById('draw-simulation-count');
    const btnDraw = document.getElementById('btn-draw-one') as HTMLButtonElement | null;

    if (countEl) countEl.textContent = String(drawnCardNames.length);
    const maxEl = document.getElementById('draw-simulation-max');
    if (maxEl) maxEl.textContent = String(handSize);

    if (container) {
        container.textContent = '';
        if (drawnCardNames.length === 0) {
            const empty = document.createElement('span');
            empty.className = 'draw-simulation-empty';
            empty.textContent = '—';
            container.appendChild(empty);
        } else {
            for (const name of drawnCardNames) {
                const url = resolveImageUrl(name);
                if (url) {
                    const img = document.createElement('img');
                    img.className = 'draw-simulation-thumb';
                    img.src = url;
                    img.alt = name;
                    img.loading = 'lazy';
                    img.title = name;
                    container.appendChild(img);
                } else {
                    const span = document.createElement('span');
                    span.className = 'draw-simulation-thumb-placeholder';
                    span.textContent = name;
                    span.title = name;
                    container.appendChild(span);
                }
            }
            const lastChild = container.lastElementChild;
            if (lastChild) lastChild.classList.add('draw-simulation-thumb--reveal');
        }
    }

    if (btnDraw) {
        const remaining = totalMainDeckCards - drawnCardNames.length;
        btnDraw.disabled = drawnCardNames.length >= handSize || remaining <= 0;
    }
}
