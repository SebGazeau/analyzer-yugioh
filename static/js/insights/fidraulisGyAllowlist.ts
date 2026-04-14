/**
 * Passcodes de Synchros dont un effet au Cimetière (souvent après envoi depuis l’Extra) est **confirmé manuellement**.
 *
 * **Ajout** : vérifier le texte TCG/FR sur une base officielle, puis ajouter le `id` YGOProDeck
 * (voir `curl "https://db.ygoprodeck.com/api/v7/cardinfo.php?name=…"`).
 * Ne pas s’appuyer sur l’heuristique seule pour les cartes critiques.
 */

const FIDRAULIS_GY_VERIFIED_PASSCODES: ReadonlySet<number> = new Set([
    72444406, // Enigmaster Packbit
    93125329, // Golden Cloud Beast - Malong
    53971455, // Despian Luluwalilith
    78397661, // Ecclesia and the Dark Dragon
]);

/** Libellé court optionnel affiché en note « vérifié » (sinon nom deck). */
const FIDRAULIS_GY_VERIFIED_LABELS: Readonly<Record<number, string>> = {
    72444406: 'Enigmaster Packbit',
    93125329: 'Golden Cloud Beast - Malong',
    53971455: 'Despian Luluwalilith',
    78397661: 'Ecclesia and the Dark Dragon',
};

export function passcodeIsFidraulisGyVerified(id: number): boolean {
    return Number.isInteger(id) && id > 0 && FIDRAULIS_GY_VERIFIED_PASSCODES.has(id);
}

/** Note optionnelle pour colonne détail ; `undefined` si inconnu (utiliser le nom du deck). */
export function fidraulisGyVerifiedCatalogLabel(id: number): string | undefined {
    return FIDRAULIS_GY_VERIFIED_LABELS[id];
}
