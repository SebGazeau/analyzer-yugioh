# Plan par slices — Recherche sémantique / RAG (post-legacy)

Document de **cadrage** pour un chantier futur : réintroduire une couche **embeddings + index vectoriel** dans `analyzer-yugioh`, en tirant parti de l’historique [`legacy/`](../legacy/) **sans** en faire un copier-coller.

## 1. Ce que le legacy apporte (référence)

| Élément | Fichiers legacy | Rôle |
|--------|-----------------|------|
| Config | [`legacy/config.rs`](../legacy/config.rs) | `QDRANT_*`, `EMBED_*`, batch ; variante Shuttle secrets. |
| Embeddings | [`legacy/rag/embeddings.rs`](../legacy/rag/embeddings.rs) | FastEmbed, dimension du modèle. |
| Index | [`legacy/rag/indexer.rs`](../legacy/rag/indexer.rs) | Lecture `assets/cards.json`, batch, texte concaténé pour embed. |
| Stockage | [`legacy/rag/vector_store.rs`](../legacy/rag/vector_store.rs) | Client Qdrant, upsert, search. |
| Types | [`legacy/rag/types.rs`](../legacy/rag/types.rs) | `CardDoc`, `SearchHit`, payloads JSON. |
| HTTP | [`legacy/routes/rag.rs`](../legacy/routes/rag.rs) | `GET /rag/health`, `POST /rag/reindex`, `GET /rag/search` ; préfixe requête `query: `. |
| Entrée | [`legacy/main.rs`](../legacy/main.rs) | Init Shuttle + injection `Arc<Mutex<VectorStore>>`. |

## 2. Pièges et dettes du legacy (à ne pas reproduire)

1. **Identifiant vectoriel instable** — Dans `indexer.rs`, `CardDoc.id` est un **`Uuid::new_v4()` par carte à chaque indexation**, sans lien avec le **passcode** YGOProDeck (`RawCard.id`). Conséquence : reindex = **doublons** dans Qdrant ou incohérence si on ne vide pas la collection ; impossible de faire un upsert idempotent par carte métier. **À corriger dès la slice « modèle de données »** : clé = `passcode` (u64) ou string stable dérivée, documentée.
2. **`Arc<Mutex<VectorStore>>` dans des handlers async** — Verrou global + `.lock().unwrap()` : risque de **contention** et de panic si poison. Préférer un client Qdrant **cloneable / internement sync**, ou un acteur dédié, ou `tokio::sync::Mutex` selon l’API du client choisi.
3. **Source de vérité fichier seule** — Tout part de `cards.json` sur disque. Le projet racine a **`cards` en Postgres** + cache + `desc` / locales / enrichissements : l’index devrait **s’aligner sur la même vérité** (requête DB ou DTO déjà chargés), pas sur un dump figé, sauf job export explicite.
4. **Typage ouvert ailleurs** — Le legacy mélange `serde_json::Value` et structs ; le racine privilégie des **structs + erreurs explicites**. Le module RAG devrait suivre **`thiserror` / `Result`**, pas `anyhow` seul dans les boundaries publiques.
5. **Sécurité / exposition** — Routes RAG **sans auth** dans le scope legacy. Dans le racine : **admin ou feature-flag**, **rate limit**, pas d’endpoint de reindex public.
6. **Shuttle** — Couplage déploiement. Le racine est Docker/binaire : **config par env** (comme le reste de l’app), éventuellement secrets injectés comme `DATABASE_URL`.

## 3. Radar techno (à rouvrir au lancement du chantier)

Ne pas figer les versions du legacy : revérifier au **kickoff** de la slice 0.

| Sujet | Legacy | Questions en 20xx |
|--------|--------|-------------------|
| Moteur vectoriel | Qdrant 1.x client | Qdrant vs pgvector vs autre ; hébergement (cloud, sidecar, managed) ; coût / latence. |
| Embeddings | FastEmbed + modèle multilingual MiniLM | Modèles **multilingues** vs **FR+EN** séparés ; API cloud (OpenAI, etc.) vs **on-device** ; taille RAM/CPU en prod ; licence modèle. |
| Dimensions | Imposée par le modèle | **Verrou** : toute collection Qdrant doit matcher `embedding_dims` ; migration si changement de modèle. |
| Actix | Handlers sync autour du mutex | Pattern **non-bloquant** compatible `tokio` + timeouts sur embed/search. |

## 4. Invariants à respecter (projet racine)

- **Ne pas casser** `GET /search` et les contrats JSON existants (recherche **lexicale** reste la référence par défaut).
- Les résultats sémantiques doivent être **rattachables** aux cartes du catalogue (passcode / id interne cohérent avec `CardCache` / DB).
- **Optionnel à l’exécution** : si `QDRANT_URL` ou équivalent absent, l’app démarre sans RAG (comme aujourd’hui sans legacy dans le binaire).

## 5. Slices numérotées

Chaque slice = périmètre isolé ; **hors périmètre** explicite ; **DoD** : tests + `cargo fmt` / `cargo clippy` (+ Vitest si UI) ; décision courte dans [`decisions.md`](decisions.md) si choix d’architecture.

---

### Slice 0 — Cadrage produit & arbitrages techno

- **Objectif** : Trancher (ou reporter) moteur vectoriel, source d’embeddings, hébergement, et critères de succès (latence max, langues, volume cartes).
- **Périmètre** : Document uniquement + issues/ADR ; pas de code Rust dans `src/` sauf stub feature flag env.
- **Hors périmètre** : Implémentation Qdrant/FastEmbed.
- **Entrées** : sections 2–3 de ce document ; comparaison avec [`docs/migration_plan.md`](migration_plan.md) (RAG).
- **Validation** : Revue ; entrée ADR dans `decisions.md` (résumé + lien vers ce fichier).
- **Done** : Tableau « go / no-go » par brique + risques légaux/coûts si API externe.

---

### Slice 1 — Modèle d’identité & document d’indexation

- **Objectif** : Définir le **schéma stable** d’un « document vectorisable » (passcode, champs texte pour embed, payload minimal pour l’UI) aligné sur `cards` / DTO existants.
- **Périmètre** : Crate interne `rag` ou `semantic_search` (module vide + types + tests unitaires) ; **pas** d’appel réseau.
- **Hors périmètre** : Qdrant, FastEmbed.
- **Invariants** : ID vectoriel = **passcode ou dérivé déterministe** ; zéro UUID aléatoire par reindex (cf. piège §2).
- **Référence legacy** : [`legacy/rag/types.rs`](../legacy/rag/types.rs), [`legacy/rag/indexer.rs`](../legacy/rag/indexer.rs) (`process_card`) — **à réécrire**, pas à copier.
- **Validation** : Tests de conversion `Row`/DTO → `IndexedCardDoc` (nom fictif).
- **Done** : Type(s) + fonction pure `fn embedding_input(&self) -> String` (ou équivalent) documentée.

---

### Slice 2 — Source de données pour l’index (DB / cache)

- **Objectif** : Alimenter la slice 1 depuis **Postgres** (ou depuis le même chemin que `load_all_cards`), avec champs `desc`, noms, locale si pertinent.
- **Périmètre** : Fonction async dans `db` ou `modules` + tests d’intégration **ignorés** sans `TEST_DATABASE_URL` ou tests avec fixtures.
- **Hors périmètre** : Écriture dans Qdrant.
- **Invariants** : Même sémantique que le catalogue servi aux utilisateurs (pas de jeu `cards.json` désynchronisé sauf mode dev documenté).
- **Référence legacy** : remplacer la lecture `fs::read_to_string("assets/cards.json")`.
- **Validation** : `cargo test` ; optionnel `db_live` si requête nouvelle.
- **Done** : Iterator ou batch de `IndexedCardDoc` depuis la DB.

---

### Slice 3 — Abstraction « embedding provider »

- **Objectif** : Trait `EmbeddingProvider` (async) + **impl** derrière feature Cargo (ex. `semantic-search-fastembed`) pour ne pas alourdir le binaire par défaut.
- **Périmètre** : 1 impl réelle + tests avec **mock** / vecteurs factices.
- **Hors périmètre** : Routes HTTP.
- **Invariants** : Dimension exposée à la compile ou runtime pour création de collection ; erreurs typées (`thiserror`).
- **Référence legacy** : [`legacy/rag/embeddings.rs`](../legacy/rag/embeddings.rs) — réimplémenter avec config unifiée au [`config`](../src/config.rs) racine.
- **Validation** : `cargo test` ; pas de téléchargement modèle en CI sans cache (feature off ou mock).
- **Done** : `embed_batch(&[&str]) -> Result<Vec<Vec<f32>>, EmbedError>`.

---

### Slice 4 — Abstraction « index vectoriel » + impl Qdrant

- **Objectif** : Trait `VectorIndex` : `ensure_collection`, `upsert`, `search`, `health` ; impl **qdrant-client** (version à choisir au kickoff).
- **Périmètre** : Crate/module interne ; tests d’intégration **optionnels** (container Qdrant) ou tests mock du client.
- **Hors périmètre** : UI.
- **Invariants** : Payload JSON **sérialisable stable** ; filtre par dimension ; pas de `Mutex` global documenté comme dette acceptable sans justification.
- **Référence legacy** : [`legacy/rag/vector_store.rs`](../legacy/rag/vector_store.rs).
- **Validation** : `cargo clippy` ; si CI avec Qdrant : job dédié.
- **Done** : Recherche k-NN renvoie passcode + score + payload minimal.

---

### Slice 5 — Job ou commande CLI `reindex-semantic` (recommandé)

- **Objectif** : Pipeline **offline** : DB → embed batch → upsert ; idempotent ; rapport (indexed / skipped / errors).
- **Périmètre** : Sous-commande dans [`src/cli/`](../src/cli/) (comme `sync-cards`), pas de timeout HTTP sur gros corpus.
- **Hors périmètre** : Endpoint public de reindex.
- **Invariants** : Relancer le job ne multiplie pas les points pour une même carte (upsert par clé stable).
- **Référence legacy** : [`legacy/rag/indexer.rs`](../legacy/rag/indexer.rs) (`reindex_all`) — logique de batch à réutiliser **conceptuellement** seulement.
- **Validation** : `cargo test` + essai manuel avec Qdrant local.
- **Done** : Script documenté dans `docs/` ou `scripts/` + variables d’environnement listées dans `.env.example`.

---

### Slice 6 — API HTTP contrôlée (lecture + santé)

- **Objectif** : Exposer **sous auth admin** (ou clé) : `GET .../health` (Qdrant + modèle), `GET .../semantic-search?q=&k=` ; JSON **distinct** de `/search` pour ne pas casser le front actuel.
- **Périmètre** : `modules` ou `routes` selon [ADR frontière HTTP](decisions.md) ; OpenAPI si le projet expose déjà Swagger pour l’API.
- **Hors périmètre** : `POST` reindex depuis HTTP (ou le garder **admin + secret** si besoin, documenté).
- **Invariants** : Rate limit ; pas de fuite de clés Qdrant ; préfixe requête `query:` **à ré-évaluer** (spécifique certains modèles sentence-transformers).
- **Référence legacy** : [`legacy/routes/rag.rs`](../legacy/routes/rag.rs).
- **Validation** : `tests/http_integration.rs` étendu ; `cargo test`.
- **Done** : Contrat JSON versionné (champs documentés).

---

### Slice 7 — Intégration front (optionnelle, phase 2)

- **Objectif** : Onglet ou mode « recherche intelligente » consommant l’API slice 6 ; fusion éventuelle lexical + sémantique (RRF) — **slice ultérieure** si complexe.
- **Périmètre** : `static/js/` + Vitest.
- **Hors périmètre** : Remplacer la recherche actuelle par défaut.
- **Validation** : `cd static && npx vitest run`.
- **Done** : UX claire quand l’index est vide ou indisponible.

---

### Slice 8 — Observabilité & exploitation

- **Objectif** : Logs structurés (`tracing`), durées embed/search, compteurs d’échec ; runbook (réindex après changement de modèle).
- **Périmètre** : Instrumentation + doc ops.
- **Hors périmètre** : Dashboard Grafana obligatoire.
- **Done** : Section dans `docs/` + alertes minimales recommandées.

## 6. Synthèse ordre d’exécution

`0 → 1 → 2 → 3 → 4 → 5 → 6` ; **7–8** en parallèle ou après selon priorité produit.

## 7. Lien avec le dossier `legacy/`

Tant que le chantier n’est pas démarré, **conserver** `legacy/` comme référence lisible pour ce plan. Une fois les slices 1–4 stabilisées, une **extract** (ex. sous `docs/legacy-rag-snippets/`) ou un tag git peut suffire pour l’historique, si vous supprimez le dossier pour alléger le dépôt.

---

*Dernière mise à jour : document généré pour planification ; ajuster les chemins de modules (`rag` vs `semantic_search`) lors de l’ADR slice 0.*
