/**
 * Branchement simulation de tirage : hand size (5/6), tirer une carte, reset, run 1000 sims.
 */
import { setHandSize, getHandSize, drawOneCard, resetDrawSimulation, runSimulation1000AndUpdateHistogram, clearHistogramGraphs } from '../stats.js';

export function bindSimulation(): void {
    function updateHandSizeButtons(): void {
        const current = getHandSize();
        document.querySelectorAll('.hand-size-btn').forEach((btn) => {
            const b = btn as HTMLButtonElement;
            b.classList.toggle('active', parseInt(b.getAttribute('data-hand') || '5', 10) === current);
        });
    }

    document.getElementById('btn-hand-5')?.addEventListener('click', () => {
        setHandSize(5);
        updateHandSizeButtons();
    });
    document.getElementById('btn-hand-6')?.addEventListener('click', () => {
        setHandSize(6);
        updateHandSizeButtons();
    });
    updateHandSizeButtons();

    document.getElementById('btn-draw-one')?.addEventListener('click', () => { drawOneCard(); });
    document.getElementById('btn-draw-reset')?.addEventListener('click', () => { resetDrawSimulation(); });
    document.getElementById('btn-run-1000-sims')?.addEventListener('click', () => { runSimulation1000AndUpdateHistogram(); });
    document.getElementById('btn-clear-histograms')?.addEventListener('click', () => { clearHistogramGraphs(); });
}
