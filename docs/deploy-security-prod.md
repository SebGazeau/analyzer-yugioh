# Déploiement prod — périmètre sécurité (analyzer-yugioh)

Ce document résume **ce que le code impose** aujourd’hui et un **plan d’exécution** pour Cloud Run / GCP. À utiliser avec `deploy-gcp-cloudsql.md`, `deploy-gcp-gcs.md`, `deploy-gcp-cloud-run.md`.

---

## 1. Ce que le code fait (résumé)

| Zone | Comportement |
|------|----------------|
| **Prod** | `APP_ENV=production` ou `RUST_ENV=production` / `prod` → **refus de démarrage** si `ADMIN_SECRET` ou `SESSION_SECRET` manquant ou **&lt; 32 octets UTF-8** (après trim). |
| **Cookies session** | En prod : `Secure`, `SameSite=Strict`, `HttpOnly` (`session_cookies.rs`). **Nécessite HTTPS** côté navigateur (OK derrière Cloud Run). |
| **Admin** | Clé **`X-Admin-Key` uniquement** (plus de `admin_key` en query) — scripts / curl : header obligatoire. |
| **API** | `JWT_SECRET` signe les JWT. `POST /api/auth/token` compare `api_key` du JSON à **`API_ISSUER_SECRET`**, ou à `JWT_SECRET` si `API_ISSUER_SECRET` absent (warning au boot). |
| **Swagger** | **Désactivé en prod** si `ENABLE_SWAGGER_UI` est **absente ou vide**. Si tu la définis : seules `true` / `1` / `yes` / `on` activent Swagger ; toute **autre valeur non vide** (ex. `false`) **désactive** (y compris hors prod). |
| **Migrations** | Au démarrage, migrations SQL embarquées si `DATABASE_URL` OK ; en échec → **warning**, l’app peut continuer (voir `docs/db-migrations.md`). Pour un déploiement **strict** : job **`./analyzer-yugioh migrate`** (même image) avec `DATABASE_URL` avant ou en CI, exit ≠ 0 si erreur. |
| **Rate limit** | `POST /login`, `/register` : `SITE_AUTH_RATE_LIMIT_PER_MINUTE` (défaut 30/min/IP). `POST /admin/login` : `ADMIN_LOGIN_RATE_LIMIT_PER_MINUTE` (défaut 15). IP = `peer_addr` (derrière load balancer GCP c’est en général l’IP du proxy — acceptable pour limiter le bruteforce grossier). |
| **Import images** | SSRF limité : `IMAGE_IMPORT_ALLOWED_HOST_SUFFIXES` (défaut `ygoprodeck.com`), `IMAGE_IMPORT_MAX_BYTES` (défaut 15 MiB). |
| **Images** | Liste / métadonnées : admin requis. Fichiers WebP par UUID : publics (comportement voulu). |

---

## 2. Secrets → Secret Manager (recommandé)

Créer **au moins** :

| Secret (nom GCP libre) | Variable Cloud Run | Exigence |
|------------------------|-------------------|----------|
| `analyzer-admin-secret` | `ADMIN_SECRET` | **≥ 32 caractères** (UTF-8). |
| `analyzer-session-secret` | `SESSION_SECRET` | **≥ 32 caractères**. |
| `analyzer-database-url` | `DATABASE_URL` | URL Postgres (Cloud SQL socket / IP selon ta config). |
| `analyzer-jwt-secret` | `JWT_SECRET` | Fort, long ; utilisé pour signer les JWT API. |
| *(optionnel mais recommandé)* | `API_ISSUER_SECRET` | Clé **distincte** pour le corps `api_key` de `POST /api/auth/token` (évite de réutiliser le secret de signature). |

**Ne pas** committer ces valeurs ; les référencer depuis Cloud Run (**Secrets** → monter comme variables d’environnement).

Génération rapide (exemple) :

```bash
openssl rand -base64 32   # à répéter par secret ; vérifier longueur ≥ 32 octets si besoin
```

---

## 3. Variables d’environnement (non secrètes, Cloud Run)

| Variable | Exemple / note |
|----------|----------------|
| `APP_ENV` | `production` |
| `PORT` | `8080` (souvent défaut Cloud Run) |
| `STORAGE_BACKEND` | `gcs` en prod |
| `GCS_BUCKET_NAME` | nom du bucket |
| `CARDS_PATH` | si fallback fichier ; souvent secondaire si tout est en DB |
| `ENABLE_SWAGGER_UI` | **Prod** : laisser **absent** (recommandé) ou toute valeur sauf `true`/`1`/`yes`/`on` → Swagger off. **Attention** : si tu mets `false` explicitement en **staging** non-`APP_ENV=production`, Swagger sera aussi coupé. |
| `SITE_AUTH_RATE_LIMIT_PER_MINUTE` | ajuster si besoin |
| `ADMIN_LOGIN_RATE_LIMIT_PER_MINUTE` | idem |
| `IMAGE_IMPORT_*` | ne changer que si tu étends les hôtes autorisés volontairement |

**Logging** : `RUST_LOG=info` (ou `analyzer_yugioh=info`) pour suivre import / erreurs.

---

## 4. Plan de déploiement (ordre recommandé)

### Phase A — Avant la première image « sécu »

1. **Générer** tous les secrets (admin, session, JWT, optionnellement issuer, DB URL).
2. **Créer** les secrets dans **Secret Manager** ; IAM : compte de service Cloud Run = `secretAccessor` (minimum) sur ces secrets.
3. **Vérifier** Cloud SQL + `DATABASE_URL` (format avec hôte non vide pour sqlx, cf. `deploy-gcp-cloud-run.md`).
4. **Bucket GCS** + IAM `objectAdmin` pour le SA Cloud Run (`deploy-gcp-gcs.md`).
5. *(Recommandé)* Prévoir un **job migrations** : même image, `DATABASE_URL` + `./analyzer-yugioh migrate` (sortie non nulle = échec CI / job). Détail : **`docs/db-migrations.md`**.

### Phase B — Build & service

6. **Build** image avec `--features gcs` (Dockerfile actuel).
7. **Déployer / mettre à jour** Cloud Run en une fois :
   - Monter **toutes** les variables + secrets (pas de `deploy --image` seul qui efface la config).
   - **`APP_ENV=production`**
   - **`ADMIN_SECRET`**, **`SESSION_SECRET`**, **`DATABASE_URL`**, **`JWT_SECRET`**
   - **`API_ISSUER_SECRET`** si tu veux séparer émission / signature
8. **Smoke test** après rollout :
   - Health / page d’accueil **200**.
   - **`GET /swagger-ui/…`** → **404** ou refus si Swagger désactivé (attendu en prod).
   - **`POST /api/auth/token`** avec la bonne clé (issuer) → **200** ; mauvaise clé → **401**.
   - **`POST /admin/import`** sans header → **403** (si `ADMIN_SECRET` défini).
   - Connexion **`/web`** : cookie en **Secure** (navigateur sur `https://`).

### Phase C — Opérationnel

9. **Premier admin** : `/admin/setup` protégé par le champ utilisant **`ADMIN_SECRET`** — avoir la clé sous la main.
10. **Clients API** : si tu as introduit **`API_ISSUER_SECRET`**, mettre à jour les appels `api_key` (plus la même valeur que l’ancien `JWT_SECRET` seul si tu sépares).
11. **Import / rehydrate** (et autres actions admin lourdes) : suivre `deploy-gcp-cloud-run.md` (CPU instance-based, min-instances le temps du batch).

### Phase D — Après coup

12. **Rotation** : changer un secret dans Secret Manager + **nouvelle révision** Cloud Run qui pointe vers la nouvelle version du secret.
13. **Documentation interne** : qui possède `X-Admin-Key`, où est stocké l’issuer pour les intégrations.
14. Après chaque déploiement : vérifier les **logs** au boot (`Migrations:` en warning = schéma potentiellement désaligné).

---

## 5. Pièges fréquents

| Piège | Conséquence |
|-------|-------------|
| Oublier `APP_ENV=production` | Pas de validation stricte des secrets ; cookies moins stricts ; Swagger **reste activé** si `ENABLE_SWAGGER_UI` absent (comportement dev). |
| `SESSION_SECRET` &lt; 32 en prod | **Crash au démarrage** (exit code 2). |
| Tester le site en **HTTP** direct | Cookie `Secure` non envoyé → sessions `/web` cassées. Utiliser l’URL **https** Cloud Run. |
| Scripts utilisant `?admin_key=` | **Ne fonctionnent plus** — passer à `-H "X-Admin-Key: …"`. |
| `JWT_SECRET` sans `API_ISSUER_SECRET` | Fonctionne mais **même secret** pour signature et pour `api_key` — moins bien qu’en séparant. |

---

## 6. Checklist ultime (copier-coller)

- [ ] `APP_ENV=production`
- [ ] `ADMIN_SECRET` ≥ 32 (Secret Manager)
- [ ] `SESSION_SECRET` ≥ 32 (Secret Manager)
- [ ] `DATABASE_URL` (Secret Manager)
- [ ] `JWT_SECRET` fort (Secret Manager)
- [ ] `API_ISSUER_SECRET` distinct (recommandé)
- [ ] `STORAGE_BACKEND=gcs` + `GCS_BUCKET_NAME` + IAM bucket
- [ ] `ENABLE_SWAGGER_UI` non activé sauf besoin ponctuel (ou absent en prod)
- [ ] Migrations : job `migrate` ou vérification logs sans warning `Migrations:`
- [ ] Image Docker **features gcs**
- [ ] HTTPS pour tests navigateur (sessions)
- [ ] Curl / CI : `X-Admin-Key` pour `/admin/*`

---

*Dernière revue : `main.rs` (dont sous-commande `migrate`), `security_startup.rs`, `session_cookies.rs`, `auth/api.rs`, `rate_limit.rs`, `routes/admin.rs`, `images/url_policy.rs`, `.env.example`, `docs/db-migrations.md`.*
