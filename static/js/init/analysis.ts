/**
 * Init interface Analysis (data-page="analysis") : simulation tirage, histogramme, hand size.
 * Les collapsibles du tableau analysis sont bindés dans initBuilder (une seule source).
 * Pour matrice de droits : désactiver ou masquer [data-page="analysis"] + ne pas appeler initAnalysis().
 */
import { bindSimulation } from './simulation.js';

export function initAnalysis(): void {
    bindSimulation();
}
