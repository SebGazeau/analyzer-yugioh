# Idées de fonctionnalités (inspirées YGO DECK MANAGER)

Document de référence pour des évolutions possibles de l’app. Les 4 captures analysées montrent un concurrent (YGO DECK MANAGER) avec des fonctions que notre app n’a pas encore.

---

## 1. Prix / Cardmarket

- **Valeur totale du deck** (Main + Extra, en €) dans le header ou la zone deck.
- **Prix par carte** (ex. 0,20 €) + lien Cardmarket sur la fiche carte.
- Optionnel : filtre recherche par fourchette de prix (min/max €).

**Intérêt :** budget et comparaison de builds.

---

## 2. Probabilités pour une carte précise

- Quand une carte est **sélectionnée** (recherche ou dans le deck) : bloc **« Probabilités (main 5/6) »** pour **cette carte** uniquement.
- Afficher **P(0 ex.)**, **P(1 ex.)**, **P(2+ ex.)** en main d’ouverture (5 ou 6 cartes), avec petites barres ou %.

**À la différence de l’existant :** on a déjà les probs par **catégorie** et la simu 1000 tirages ; pas la proba “une carte donnée en main”.

---

## 3. Stats détaillées du deck (par type / attribut / niveau)

- Section ou modale **« Statistiques du deck »** avec par exemple :
  - **Par type** : Effect, Spell, Trap, Tuner, Link, Fusion, etc. (barres horizontales).
  - **Par attribut** : LIGHT, DARK, FIRE, etc.
  - **Par niveau / rang / link** : répartition Lv1, Lv2, Lv4, etc.

**À la différence de l’existant :** on a la composition par **catégories / engines** ; pas cette vue “structure du deck” (type, attribut, niveau).

---

## 4. Simulateur de main dédié

- Bouton **« Nouvelle main »** : pioche une **main complète** (5 ou 6 cartes) d’un coup.
- Affichage des **cartes en main** (grandes vignettes) + **« +1 Piocher »** pour piocher une carte supplémentaire.
- Texte **« X cartes en main, Y dans le deck »**.
- **Probabilités par catégorie** pour la main actuelle (ex. Starters, Hand Traps) avec barres colorées / %.

**À la différence de l’existant :** on a « Tirer une carte » (une par une) + « Run 1000 sims » (histogrammes). Pas de “une main entière + voir les cartes + probs catégories sur cette main”.

---

## 5. Tags rapides (menu contextuel sur une carte du deck)

- **Clic droit** (ou équivalent) sur une carte **dans le deck** → menu avec tags prédéfinis : **Starter**, **Hand Trap**, **Extender**, **Staple**, **Brick**, **Favori**, etc., avec **pastille de couleur**.
- Option **« Retirer tous les tags »**.

**À la différence de l’existant :** on a les catégories dans **« Modifier la carte »** ; le plus serait la **rapidité** (pas besoin d’ouvrir le popover à chaque fois).

---

## 6. Filtres de recherche avancés

En plus du filtre actuel (Tous / Monster / Spell / Trap) et du champ texte :

- **Type de carte** : Normal, Ritual, Fusion, Synchro, Xyz, Link, Pendulum, etc.
- **Attribut** (LIGHT, DARK, FIRE, etc.).
- **Type de monstre** (Magicien, Dragon, etc.).
- **Niveau / Rang / Link** (min–max).
- **ATK / DEF** (min–max).
- **Banlist** (TCG / OCG, autorisé / limité / interdit).
- **Tri** (nom, type, prix, etc.).

**Contrainte :** dépend du backend (API de recherche) et des données disponibles.

---

## 7. Extensions / sets pour une carte

- Dans la fiche d’une carte : **« Extensions (4) »** avec nom du set, code rareté (C, R, etc.) et éventuellement prix dans ce set.

**Intérêt :** plutôt orienté collection / prix.

---

## 8. Import / export .ydk

- **Import .ydk** : charger un deck depuis un fichier .ydk (compatibilité EDOPro, autres logiciels).
- Optionnel : **Export .ydk** pour réutiliser le deck ailleurs.

**Intérêt :** interopérabilité et adoption.

---

## 9. Drag-and-drop pour le deck

- Glisser-déposer une carte depuis les **résultats de recherche** vers Main / Extra / Side (en plus ou à la place des boutons + et Side).

**Intérêt :** confort de build, surtout sur desktop.

---

## 10. Cartes associées

- Sur la **fiche carte** ou un panneau latéral : afficher les **cartes associées** (liens officiels / données API : même archétype, cartes citées dans le texte, matériaux de fusion / synchro / xyz / link, support, etc. — selon ce que l’API ou la base locale expose).
- Permettre d’**ajouter au deck** ou d’**ouvrir la recherche** sur une carte associée en un clic.

**Intérêt :** compléter un deck sans quitter le builder ; proche de ce que montrent certains outils concurrents sur la fiche carte.

**Contrainte :** dépend du modèle de données (ex. champs YGOProDeck `misc_info`, relations archétype, parsing du texte d’effet si besoin).

---

## 11. Accordéons sur la composition

- Dans le panneau **composition / stats** : replier ou déplier des blocs (type, attribut, catégories, etc.) pour **alléger l’écran** tout en gardant le détail accessible.

**Intérêt :** lisibilité sur petits écrans et réduction du scroll.

---

## Synthèse priorisée

| Priorité | Fonctionnalité | Intérêt |
|----------|----------------|--------|
| **Haute** | Probabilités pour une carte précise | Lien direct avec les questions “calculs / lisibilité”. |
| **Haute** | Simulateur de main (main complète + affichage cartes + probs catégories) | Complète le “Run 1000 sims” et rend la simu plus lisible. |
| **Haute** | Stats par type / attribut / niveau | Vue “structure du deck” manquante. |
| **Moyenne** | Tags rapides (menu contextuel) | Accélère le tagging sans changer le modèle de catégories. |
| **Moyenne** | Import .ydk (au moins import) | Interopérabilité et adoption. |
| **Moyenne** | Prix / Cardmarket (total + par carte) | Très demandé par les joueurs. |
| **Basse** | Filtres de recherche avancés | Très utile mais dépend de l’API. |
| **Basse** | Drag-and-drop deck | Confort UX. |
| **Basse** | Extensions / sets | Intéressant si dimension “collection”. |
| **Moyenne** | Cartes associées (fiche / panneau + ajout rapide) | Découverte de support et cohérence du build. |
| **Basse** | Accordéons sur la composition | UX / densité d’information. |

---

*Document généré à partir de l’analyse de 4 captures du YGO DECK MANAGER. À réviser selon l’évolution du produit et du backend.*