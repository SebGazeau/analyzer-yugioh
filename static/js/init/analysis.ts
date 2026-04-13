/**
 * Init interface Analysis (data-page="analysis") : simulation tirage, histogramme, hand size, replis tableau.
 * Pour matrice de droits : désactiver ou masquer [data-page="analysis"] + ne pas appeler initAnalysis().
 */
import { bindAnalysisTableCollapsibles } from './analysisCollapsibles.js';
import { bindSimulation } from './simulation.js';

export function initAnalysis(): void {
    bindSimulation();
    bindAnalysisTableCollapsibles();
}
