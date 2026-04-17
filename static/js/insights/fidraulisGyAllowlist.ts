/**
 * Passcodes de Synchros dont un effet au Cimetière (souvent après envoi depuis l’Extra) est **confirmé manuellement**.
 *
 * Chaque entrée porte une **taxonomie d’effet** (`FidraulisGyResourceTaxon`) pour la colonne « Contexte ».
 *
 * **Ajout** : vérifier le texte TCG/FR sur une base officielle, puis ajouter le `id` YGOProDeck
 * (voir `curl "https://db.ygoprodeck.com/api/v7/cardinfo.php?name=…"`).
 * Ne pas s’appuyer sur l’heuristique seule pour les cartes critiques.
 */
import type { FidraulisGyResourceTaxon } from './types.js';
import { passcodeIsFidraulisGyAdminValidatedDom } from './fidraulisGyAdminValidated.js';
import {
    INSIGHT_FIDRAULIS_AGGREGATE_STATS_GROUP_CAUTION,
    INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_FALLBACK,
    INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_MIXED,
    INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_VERIFIED,
} from './fidraulisGyCopy.js';
import { fidraulisGyTaxonLabelFr, fidraulisGyTaxonTableShortFr } from './fidraulisGyTaxonomy.js';

export interface FidraulisGyVerifiedAllowlistEntry {
    passcode: number;
    taxon: FidraulisGyResourceTaxon;
    /** Nom court affiché après le libellé de taxon (optionnel). */
    catalogShortName?: string;
}

const FIDRAULIS_GY_VERIFIED_ENTRIES: readonly FidraulisGyVerifiedAllowlistEntry[] = [
    {
        passcode: 72444406,
        taxon: 'effect_on_sent_to_gy',
        catalogShortName: 'Enigmaster Packbit',
    },
    {
        passcode: 93125329,
        taxon: 'effect_on_sent_to_gy',
        catalogShortName: 'Golden Cloud Beast - Malong',
    },
    {
        passcode: 53971455,
        taxon: 'effect_on_sent_to_gy',
        catalogShortName: 'Despian Luluwalilith',
    },
    {
        passcode: 78397661,
        taxon: 'effect_on_sent_to_gy',
        catalogShortName: 'Ecclesia and the Dark Dragon',
    },
    {
        passcode: 98506199,
        taxon: 'field_or_gy_continuous',
        catalogShortName: 'Wind Pegasus @Ignister',
    },
] as const;

const BY_PASSCODE: ReadonlyMap<number, FidraulisGyVerifiedAllowlistEntry> = new Map(
    FIDRAULIS_GY_VERIFIED_ENTRIES.map((e) => [e.passcode, e]),
);

export function getFidraulisGyVerifiedEntry(passcode: number): FidraulisGyVerifiedAllowlistEntry | undefined {
    if (!Number.isInteger(passcode) || passcode <= 0) return undefined;
    return BY_PASSCODE.get(passcode);
}

export function passcodeIsFidraulisGyVerified(id: number): boolean {
    return getFidraulisGyVerifiedEntry(id) !== undefined || passcodeIsFidraulisGyAdminValidatedDom(id);
}

/** Note optionnelle pour colonne détail ; `undefined` si inconnu (utiliser le nom du deck). */
export function fidraulisGyVerifiedCatalogLabel(id: number): string | undefined {
    return getFidraulisGyVerifiedEntry(id)?.catalogShortName;
}

/** Libellé court « Contexte » (cellule tableau agrégat). */
export function fidraulisAggregateStatsContextLabel(
    passcode: number,
    synergyVerifiedPass: number,
    synergyHeuristicPass: number,
): string {
    const entry = getFidraulisGyVerifiedEntry(passcode);
    if (entry) {
        return fidraulisGyTaxonTableShortFr(entry.taxon);
    }
    if (synergyVerifiedPass > synergyHeuristicPass) {
        return INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_VERIFIED;
    }
    if (synergyHeuristicPass > synergyVerifiedPass) {
        return INSIGHT_FIDRAULIS_AGGREGATE_STATS_GROUP_CAUTION;
    }
    if (synergyVerifiedPass > 0 && synergyHeuristicPass > 0) {
        return INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_MIXED;
    }
    return INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_FALLBACK;
}

/** Infobulle détaillée pour la cellule Contexte de l’agrégat. */
export function fidraulisAggregateStatsContextTitle(
    passcode: number,
    synergyVerifiedPass: number,
    synergyHeuristicPass: number,
): string {
    const entry = getFidraulisGyVerifiedEntry(passcode);
    if (entry) {
        return fidraulisGyTaxonLabelFr(entry.taxon);
    }
    if (synergyVerifiedPass > synergyHeuristicPass) {
        return 'Surtout observée en vérifié (stats agrégées sur l’instance).';
    }
    if (synergyHeuristicPass > synergyVerifiedPass) {
        return 'Surtout observée en heuristique (stats agrégées sur l’instance).';
    }
    if (synergyVerifiedPass > 0 && synergyHeuristicPass > 0) {
        return 'Observations mixtes vérifié / heuristique (stats agrégées).';
    }
    return 'Proposition issue des stats agrégées.';
}
