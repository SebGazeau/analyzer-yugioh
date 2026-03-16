# Init par interface (Decks | Builder | Analysis)

Chaque module d’init correspond à une section du DOM avec `data-page="…"` :

| Interface | data-page | Fichier | Rôle |
|-----------|-----------|---------|------|
| **Decks** | `decks` | `decks.ts` | Liste « Mes decks », Rafraîchir, Charger |
| **Builder** | `builder` | `builder.ts` | Recherche, deck courant, grilles, toolbar, collapsibles zones + tableau analysis |
| **Analysis** | `analysis` | `analysis.ts` | Simulation tirage, hand size, histogramme |

Pour une **matrice de droits** : désactiver une interface = masquer ou désactiver la section `[data-page="…"]` + ne pas appeler l’init correspondant (ou l’appeler en mode lecture seule si besoin).
