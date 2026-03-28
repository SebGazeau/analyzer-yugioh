# Todo — Intégration base de données et suites

Rappel des objectifs après mise en place du schéma MPD v4 (PostgreSQL).

---

## 1. Brancher l’app sur la base ✅

- [x] Ajouter `sqlx` (Postgres) + `DATABASE_URL` dans `.env` / docker-compose pour l’app
- [x] Au démarrage : créer le pool, charger les cartes depuis la table `cards` dans le `CardCache`
- [x] Si `cards` est vide : démarrer avec cache vide (comportement actuel)
- [x] Pool optionnel injecté dans l’app pour la tâche 2 (`/fetch_cards` → DB)

---

## 2. Faire écrire `/fetch_cards` en base

- [ ] Parser la réponse API YGOProDeck → structs alignées schéma (ex. `card_desc`, ENUMs)
- [ ] Insérer / upsert dans la table `cards` (et optionnellement `card_sets`, `card_prices` si fournis par l’API)
- [ ] Après écriture : recharger le cache depuis la DB (même logique qu’au démarrage)

---

## 3. Aligner le modèle Rust avec le schéma v4

- [ ] Struct(s) Rust pour la table `cards` (avec `card_desc`, champs optionnels, etc.)
- [ ] Mapping clair API → DB (noms, ENUMs : texte API ↔ ENUM Postgres)
- [ ] Optionnel : getters / `Serialize` pour réponses API et insert DB

---

## 4. Sauvegarde / chargement des decks (tables `decks`, `deck_entries`) ✅

- [x] API : `POST /decks`, `GET /decks`, `GET /decks/:id`, `PUT /decks/:id`, `DELETE /decks/:id`
- [x] Front : « Sauvegarder sur le serveur » envoie le deck à l’API ; « Mes decks » (liste + Rafraîchir + Charger) depuis l’API
- [x] `user_id` dans `decks` reste NULL tant qu’il n’y a pas d’auth
- [x] Tests HTTP d’intégration (sans pool → 503)

---

## 5. Auth site (inscription / connexion) ✅

- [x] Table `site_users` (pseudo, password_hash), validation pseudo/mot de passe, sessions
- [x] Routes : GET/POST `/register`, POST `/login`, POST `/logout`
- [x] Tests HTTP d'intégration : GET /register 200 + formulaire, POST /register sans pool → 200 + « indisponible », POST /login sans pool → 303 vers /, POST /logout → 303 vers /, GET /?login_error=1 → 200
- [ ] (Plus tard) Associer `decks.user_id` à l’utilisateur connecté

---

## 6. CI / GCP — à faire plus tard

- [ ] **Artifact Analysis** : activer le scan de vulnérabilités sur le dépôt **Artifact Registry** où l’image `analyzer-yugioh` est poussée (voir [Artifact Analysis](https://cloud.google.com/artifact-analysis/docs) et `docs/ci-integration.md`).

---

*Dernière mise à jour : section 6 CI/GCP (Artifact Analysis).*
