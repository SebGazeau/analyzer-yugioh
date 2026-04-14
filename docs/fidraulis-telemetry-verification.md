# Vérification phase 0 — télémétrie Fidraulis

**Prérequis :** appliquer les migrations sur la base pointée par `DATABASE_URL` (ex. `./scripts/db_migrate.sh` ou `cargo run -- migrate`). Sans la migration `insight_fidraulis_*`, le GET agrégat renvoie une liste vide (pas de 500) et le mode `persist` répond `503 insight_schema_missing`.

Avant d’activer `FIDRAULIS_INSIGHT_TELEMETRY=1` (persist) en environnement partagé :

1. Mettre `FIDRAULIS_INSIGHT_TELEMETRY=log` et redémarrer l’instance.
2. Se connecter, ouvrir un deck avec Fidraulis + au moins un Synchro Extra candidat, **sauvegarder** (PUT deck OK).
3. Vérifier dans les logs serveur une ligne `fidraulis_telemetry_post` (cible `tracing`, filtre `fidraulis_telemetry`) avec `persist=false`, les champs `verified` / `heuristic`, et `missing_cache` vide si le cache cartes contient toutes les cartes du payload.
4. Joindre à la PR une **capture** du réseau (POST `/insights/fidraulis/telemetry` → 200 JSON `mode: log`) ou l’extrait de log correspondant.
5. Passer à `persist` seulement après validation des agrégats attendus (migration SQL appliquée).
