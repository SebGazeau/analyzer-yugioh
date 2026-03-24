# Pipeline images — documentation complète

Ce document décrit le **pipeline d’import, traitement et service d’images** ajouté à l’application : récupération depuis une URL externe, conversion en WebP (plusieurs variantes), stockage (fichier local ou GCS) et exposition via des routes HTTP.

---

## 1. Vue d’ensemble

### Objectif

- Récupérer une image depuis une **URL externe** (API ou CDN).
- La **traiter** : décodage, redimensionnement, encodage WebP (original, desktop, mobile).
- La **stocker** dans un backend configurable : **fichier local** (dev / Docker) ou **Google Cloud Storage** (bucket **privé**, accès via compte de service + lecture dans l’app).
- Enregistrer les **métadonnées** en base PostgreSQL.
- **Servir** les images et leurs métadonnées via des routes Actix-web.

### Flux global

```
URL externe → fetch (reqwest) → process (image + webp) → store (Storage) → DB (sqlx)
                                                                              ↓
Client ← GET /images, GET /images/:id, GET /images/:id/file/:variant ←───────┘
```

Le **choix du backend de stockage** (local vs GCS) se fait uniquement via la variable d’environnement `STORAGE_BACKEND`.

---

## 2. Architecture des modules

```
src/
├── config.rs           # Chargement STORAGE_BACKEND, LOCAL_STORAGE_PATH, GCS_BUCKET_NAME
├── storage/
│   ├── mod.rs          # Trait Storage + from_config / from_config_async
│   ├── local.rs        # Implémentation filesystem (volume Docker / répertoire local)
│   └── gcs.rs          # GCS réel si feature `gcs` (image Docker prod)
├── images/
│   ├── mod.rs          # Ré-exports
│   ├── fetch.rs        # Téléchargement HTTP des bytes
│   ├── process.rs      # Décodage + 3 variantes WebP
│   └── repository.rs   # Accès table images (insert, get_by_id, list)
├── routes/
│   ├── mod.rs
│   └── images.rs       # Handlers Actix : import, list, get, serve file
├── app.rs              # make_app() reçoit Option<Arc<dyn Storage>> et enregistre les routes images
└── main.rs             # Config::from_env(), storage::from_config_async(), tracing
```

- **config** : lit l’environnement une fois au démarrage.
- **storage** : abstraction (trait) + local + GCS (`from_config_async`, feature `gcs`).
- **images** : logique métier (fetch, process, repository) sans dépendance directe à Actix.
- **routes** : couche HTTP qui utilise `images::*` et le `Storage` injecté.

---

## 3. Configuration (`src/config.rs`)

### Rôle

Centraliser la configuration du **stockage** des images à partir des variables d’environnement.

### Types

- **`StorageBackend`** : enum `Local` | `Gcs`. Parsé depuis la chaîne `STORAGE_BACKEND` (insensible à la casse).
- **`Config`** :
  - `storage_backend` : backend à utiliser.
  - `local_storage_path` : répertoire racine pour le stockage local (ex. `/storage` ou `./storage`).
  - `gcs_bucket_name` : nom du bucket GCS si `STORAGE_BACKEND=gcs` (optionnel sinon).

### Méthode

- **`Config::from_env()`** :
  - `STORAGE_BACKEND` : défaut `"local"` si absent.
  - `LOCAL_STORAGE_PATH` : défaut `"/storage"`.
  - `GCS_BUCKET_NAME` : lu seulement si backend = GCS.
  - En cas de valeur invalide (ex. `STORAGE_BACKEND=invalid`), retourne `Err(String)`.

Si `from_env()` échoue au démarrage, l’application démarre quand même mais **sans** injecter de `Storage` : les routes images répondent alors 503 (NoStorage / NoPool selon le cas).

---

## 4. Stockage (`src/storage/`)

### Trait `Storage` (`mod.rs`)

Interface asynchrone (via `async_trait`) implémentée par le stockage local et (à terme) GCS :

- **`store(path, bytes)`** : enregistre les octets au chemin relatif `path` (ex. `images/<uuid>/original.webp`).
- **`get(path)`** : retourne `Some(vec)` si le fichier existe, `None` sinon.
- **`exists(path)`** : retourne si un fichier existe à ce chemin.

Les chemins sont **relatifs** à la racine du backend (répertoire local ou préfixe bucket GCS). Pas de gestion de cache côté Rust (prévu plus tard côté CDN en prod).

### Implémentation locale (`local.rs`)

- **`LocalStorage::new(root)`** : prend un `PathBuf` (ex. `/storage` ou `./storage`).
- **`resolve(path)`** : `root.join(path)` pour obtenir le chemin absolu.
- **store** : `tokio::fs::create_dir_all(parent)` puis `tokio::fs::write(full_path, bytes)`.
- **get** : `tokio::fs::read(full_path)` ; si `NotFound` → `Ok(None)`.
- **exists** : `Path::try_exists()`.

Utilisée en **développement** et dans le **Docker Compose** avec un volume monté sur `/storage`.

### Implémentation GCS (`gcs.rs`)

- Activée avec la feature Cargo **`gcs`** (image Docker prod : `cargo build --features gcs`).
- **`GcsStorage::connect(bucket).await`** : `ClientConfig::default().with_auth().await` (ADC : Cloud Run, `GOOGLE_APPLICATION_CREDENTIALS`, etc.).
- **`store` / `get` / `exists`** : API JSON `upload_object`, `download_object`, `get_object` ; **404** → `get` renvoie `None`, `exists` → `false`.
- Bucket **privé** : pas d’URL publique ; le client passe par **`GET /images/.../file/...`**.

### Construction depuis la config

- **`storage::from_config_async(config).await`** (utilisé au démarrage dans `main.rs`) :
  - `Local` → `LocalStorage`.
  - `Gcs` → `GcsStorage::connect` (feature `gcs` requise à la compilation).
- **`storage::from_config`** : **local uniquement** ; si `Gcs` → erreur explicite (utiliser `from_config_async`).

L’`Arc<dyn Storage>` est ensuite enregistré dans l’app Actix via `web::Data` et passé aux handlers.

---

## 5. Pipeline images (`src/images/`)

### 5.1 Téléchargement (`fetch.rs`)

- **`fetch_image_bytes(url: &str) -> Result<Vec<u8>, FetchError>`**  
  - Utilise **reqwest** pour un `GET` sur `url`.
  - Si le statut HTTP n’est pas succès → `FetchError::Status(code)`.
  - Sinon retourne le corps de la réponse en `Vec<u8>`.

Erreurs possibles : erreur réseau/reqwest (`FetchError::Http`) ou statut HTTP non succès (`FetchError::Status`).

### 5.2 Traitement (`process.rs`)

- **`process_image(bytes: &[u8]) -> Result<ImageVariants, ProcessError>`**  
  - **sec-12 (image bomb)** : rejet immédiat si `bytes.len()` dépasse le même plafond que le téléchargement (`IMAGE_IMPORT_MAX_BYTES` / `fetch::max_image_fetch_bytes_from_env`, voir `.env.example`).
  - Décodage via **`image::ImageReader`** avec limites : dimensions max **4096×4096**, allocation décodeur plafonnée (**96 MiB**). Dépassement → `ProcessError::Decode` (`ImageError::Limits`).
  - Production de **trois variantes WebP** via le crate **webp** :

| Variante   | Usage              | Encodage     | Contrainte taille      |
|-----------|--------------------|--------------|-------------------------|
| `original`| archive / qualité  | lossless     | aucune                  |
| `desktop` | affichage desktop  | qualité 85   | largeur max 1920 px     |
| `mobile`  | affichage mobile   | qualité 80   | largeur max 768 px      |

- Redimensionnement : si la largeur dépasse le max, la hauteur est recalculée pour conserver le ratio ; filtre **Triangle** (image crate).
- **`ImageVariants`** contient : `width`, `height` (dimensions de l’image source), et les trois champs `original`, `desktop`, `mobile` (`Vec<u8>`).

Erreurs : entrée trop longue (`ProcessError::InputTooLarge`, **413** côté route import), décodage / limites (`ProcessError::Decode`), WebP (`ProcessError::Webp`).

### 5.3 Base de données (`repository.rs`)

- **Table** : voir section 6 (migration SQL).
- **`ImageRecord`** : struct `FromRow` avec tous les champs de la table (id, original_url, path_original, path_desktop, path_mobile, width, height, mime_type, created_at).
- **`ImageRepository`** (namespace de fonctions) :
  - **`insert(pool, original_url, path_original, path_desktop, path_mobile, width, height)`** : génère un UUID v4, insère une ligne, retourne l’`id`.
  - **`get_by_id(pool, id)`** : `SELECT` par id → `Option<ImageRecord>`.
  - **`list(pool)`** : `SELECT` toutes les images, tri par `created_at DESC`.

Les **chemins** enregistrés sont ceux utilisés par le backend Storage (ex. `images/<uuid>/original.webp`).

---

## 6. Schéma base de données

Migration : **`migrations/20250203100000_create_images.sql`**.

```sql
CREATE TABLE IF NOT EXISTS images (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_url  TEXT NOT NULL,
    path_original TEXT NOT NULL,
    path_desktop  TEXT NOT NULL,
    path_mobile   TEXT NOT NULL,
    width         INT,
    height        INT,
    mime_type     TEXT NOT NULL DEFAULT 'image/webp',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- **id** : identifiant unique (généré en Rust avec `uuid::Uuid::new_v4()` avant l’insert).
- **original_url** : URL source de l’image.
- **path_original, path_desktop, path_mobile** : chemins relatifs dans le backend Storage.
- **width, height** : dimensions de l’image source (avant redimensionnement desktop/mobile).
- **mime_type** : pour l’instant toujours `image/webp`.
- **created_at** : date d’insertion (UTC).

Les migrations sont exécutées au démarrage si `DATABASE_URL` est défini (même logique que pour le reste de l’app).

---

## 7. Routes HTTP (`src/routes/images.rs`)

Les quatre routes (`POST` import + trois `GET`) exigent la **même authentification admin privilégiée** que les autres actions sensibles : header **`X-Admin-Key`** (si `ADMIN_SECRET` est défini), **JWT** rôle `admin`, ou **session** admin après login (`is_privileged_admin_request`). Sans droit : **403**. Si `ADMIN_SECRET` est absent (mode dev), l’accès reste ouvert côté auth (voir sec-01).

Ensuite, **pool Postgres** et **Storage** sont requis là où c’est pertinent. Si l’un manque, **503** (« pool required » / « storage required »).

### POST `/images/import`

- **Body** : JSON `{ "url": "https://..." }`.
- **Comportement** :
  1. Téléchargement des bytes (`fetch_image_bytes`).
  2. Traitement (`process_image`) → 3 variantes WebP.
  3. Génération d’un UUID ; chemins `images/<uuid>/original.webp`, `desktop.webp`, `mobile.webp`.
  4. Enregistrement des trois fichiers via `Storage::store`.
  5. Insertion en base (`ImageRepository::insert`).
- **Réponse** : **201 Created** avec JSON du type :
  ```json
  {
    "id": "uuid",
    "path_original": "images/uuid/original.webp",
    "path_desktop": "images/uuid/desktop.webp",
    "path_mobile": "images/uuid/mobile.webp"
  }
  ```
- **Erreurs** : 400 (fetch/process), 500 (storage/DB), 503 (pool/storage manquant).

### GET `/images`

- **Auth** : comme ci-dessus (sec-06).
- **Comportement** : liste toutes les images (ordre `created_at` décroissant).
- **Réponse** : **200 OK**, tableau JSON d’objets avec id, original_url, path_original, path_desktop, path_mobile, width, height, mime_type, created_at (RFC3339).

### GET `/images/{id}`

- **Auth** : comme ci-dessus.
- **Comportement** : métadonnées d’une image par son UUID.
- **Réponse** : **200 OK** avec un objet comme ci-dessus, ou **404** si l’id n’existe pas.

### GET `/images/{id}/file/{variant}`

- **Auth** : **aucune** (URL opaque UUID pour le builder / balises `<img>`) ; **`GET /images`** et **`GET /images/{id}`** restent réservés aux admins (sec-06).
- **variant** : `original` | `desktop` | `mobile`.
- **Comportement** : lit le chemin correspondant en base, puis `Storage::get(path)` et renvoie les octets avec `Content-Type: image/webp`.
- **Réponse** : **200 OK** (corps binaire WebP), ou **400** si `variant` invalide, **404** si image ou fichier introuvable, **503** si storage/pool manquant.

### Gestion des erreurs

- **ImageRouteError** : agrège Forbidden, UrlPolicy, FetchError, ProcessError, StorageError, RepositoryError + NoPool / NoStorage.
- **ResponseError** : Forbidden → 403 ; Fetch/Process → 400 ; NoPool/NoStorage → 503 ; etc.

---

## 8. Intégration dans l’application

### Démarrage (`main.rs`)

- **Tracing** : `tracing_subscriber::fmt()` avec `EnvFilter::from_default_env()` (variable `RUST_LOG`).
- **Config** : `config::Config::from_env()`. En cas d’erreur, log warning et `storage_data = None`.
- **Storage** : si config OK, `storage::from_config_async(&config).await` → `storage_data = Some(web::Data::new(arc_storage))`, sinon `None`.
- **make_app** : appelé avec `storage_data.clone()` en dernier argument. Le reste (cache cartes, tera, cards_path, pool) est inchangé.

### App (`app.rs`)

- **make_app(..., storage: Option<web::Data<Arc<dyn Storage>>>)** :
  - Si `storage.is_some()`, enregistrement avec `.app_data(storage)`.
  - Enregistrement des 4 services : `import_image`, `list_images`, `get_image`, `serve_image_file`.

Sans config storage valide ou sans pool, les routes images répondent 503 ; le reste de l’app (cartes, decks, etc.) continue de fonctionner.

---

## 9. Variables d’environnement

| Variable             | Obligatoire | Défaut    | Description |
|----------------------|------------|-----------|-------------|
| `STORAGE_BACKEND`    | Non        | `local`   | `local` ou `gcs`. |
| `LOCAL_STORAGE_PATH` | Non        | `/storage`| Racine du stockage fichier (local). |
| `GCS_BUCKET_NAME`    | Si GCS     | —         | Nom du bucket GCS quand `STORAGE_BACKEND=gcs`. |
| `DATABASE_URL`       | Pour images| —         | URL Postgres (pool + migrations). Requis pour les routes images. |
| `RUST_LOG`           | Non        | —         | Niveau de log (ex. `info`, `debug`). |

Exemple **local** (sans Docker) :

```env
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./storage
DATABASE_URL=postgres://user:pass@localhost:5433/analyzer_yugioh
RUST_LOG=info
```

---

## 10. Docker

### Docker Compose

- **App** :
  - `STORAGE_BACKEND=local`
  - `LOCAL_STORAGE_PATH=/storage`
  - Volume **`image_storage:/storage`** pour persister les fichiers WebP.
  - `RUST_LOG=info` (optionnel).
- **Volumes** : `image_storage` est déclaré avec `postgres_data` et `cards_data`.

### Dockerfile

- Création de **`/storage`** et `chown` à l’utilisateur `appuser` pour que l’app puisse écrire même si le volume est monté par-dessus (comportement selon l’environnement Docker).

En prod Cloud Run (sans volume), il faudra utiliser `STORAGE_BACKEND=gcs` et une implémentation réelle de `GcsStorage`.

---

## 11. Dépendances Cargo (extrait)

- **image** : décodage et redimensionnement.
- **webp** : encodage WebP (lossless et qualité).
- **uuid** (features v4, serde) : identifiants et désérialisation pour les paths Actix.
- **tokio** (feature fs) : `LocalStorage` utilise `tokio::fs`.
- **async-trait** : trait `Storage` async.
- **tracing** / **tracing-subscriber** : logs structurés.
- **sqlx** (postgres, uuid, chrono, …) : pool et migrations (table `images` déjà couverte par les migrations existantes).

Feature **`gcs`** : active `google-cloud-storage` et l’implémentation réelle dans `gcs.rs` (image Docker prod).

---

## 12. Import bulk YGOProDeck (admin)

### Protection des routes /admin

Toutes les routes sous **`/admin`** sont protégées par une clé secrète :

- **Variable d'environnement** : `ADMIN_SECRET` (ex. une chaîne longue et aléatoire).
- **Header HTTP requis** : `X-Admin-Key: <valeur de ADMIN_SECRET>`.
- Si `ADMIN_SECRET` n'est pas défini, **aucune** requête vers `/admin` n'est acceptée (guard refuse tout).
- Si le header est absent ou ne correspond pas au secret, la requête ne correspond à aucune route (réponse **404**).

Exemple d'appel :

```bash
curl -X POST http://localhost:8080/admin/import \
  -H "X-Admin-Key: votre-secret-defini-dans-ADMIN_SECRET"
```

À définir en prod (et éventuellement en local pour tester) ; ne pas commiter la valeur.

### Contraintes API

- Images en `.jpg` côté API → conversion WebP côté nous.
- **Ne jamais re-télécharger** une image déjà en base : vérification `original_url` avant fetch.
- **Rate limit** : risque de blacklist si trop de requêtes/s ; on utilise uniquement `image_url` (full size) et on génère nous-mêmes desktop/mobile.

### Service `ImageImporter` (`src/images/importer.rs`)

- **`ImageImporter::run(pool, storage)`** :
  1. Récupère la liste des cartes via `GET https://db.ygoprodeck.com/api/v7/cardinfo.php`.
  2. Extrait les URLs `card_images[0].image_url` pour chaque carte.
  3. Pour chaque URL : si `ImageRepository::exists_by_original_url(pool, url)` → **skip** (idempotence).
  4. Sinon : acquiert un **permis Semaphore** (max 3 requêtes simultanées), **sleep 300 ms**, **fetch avec retry** (backoff exponentiel, 429 et erreurs réseau = retry), process (3 WebP), store, insert.
  5. Toutes les **100 images** traitées : log du progrès (traitées, skippées, total).

- **Retry** : crate `backoff` (feature tokio) ; erreurs réseau et HTTP 429 considérées transientes.
- **Reprise** : le check DB avant fetch rend l’import **resumable** (relancer sans doublons ni re-téléchargement).

### Route admin

- **`POST /admin/import`** : déclenche `ImageImporter::run` en **arrière-plan** (`tokio::spawn`), répond immédiatement **202 Accepted** avec le corps `"import started in background"`. Si pool ou storage manquant → **503**.
- **`POST /admin/rehydrate_storage`** : `ImageImporter::rehydrate_storage` — pour chaque ligne `images`, retélécharge `original_url` et réécrit les 3 fichiers aux `path_*` déjà en base (remplir GCS après import local). Query **`?force=true`** : réécrit même si l’objet existe. **202** / **503** comme ci-dessus.

### Repository

- **`ImageRepository::exists_by_original_url(pool, original_url)`** : `SELECT id FROM images WHERE original_url = $1` → `true` si une ligne existe (évite les doublons et re-fetch).

### Dépendances ajoutées

- `backoff` (features tokio), `futures`, `tokio` (features `time`, `sync`).

---

## 13. Résumé des fichiers créés ou modifiés

| Fichier | Rôle |
|---------|------|
| `src/config.rs` | Config stockage depuis l’env. |
| `src/storage/mod.rs` | Trait `Storage`, `from_config` / `from_config_async`, erreurs. |
| `src/storage/local.rs` | Stockage fichier (tokio::fs). |
| `src/storage/gcs.rs` | GCS (feature `gcs`, bucket privé). |
| `src/images/mod.rs` | Ré-exports fetch, process, repository. |
| `src/images/fetch.rs` | Téléchargement HTTP. |
| `src/images/process.rs` | Décodage + 3 WebP. |
| `src/images/repository.rs` | Table `images` (insert, get, list, exists_by_original_url). |
| `src/images/importer.rs` | Import bulk YGOProDeck (rate limit, retry, idempotence). |
| `src/routes/mod.rs` | Module routes. |
| `src/routes/images.rs` | 4 handlers Actix. |
| `src/routes/admin.rs` | POST /admin/import, POST /admin/rehydrate_storage. |
| `migrations/20250203100000_create_images.sql` | Création table `images`. |
| `src/lib.rs` | Déclaration modules config, storage, images, routes. |
| `src/app.rs` | Paramètre storage, enregistrement routes images. |
| `src/main.rs` | Tracing, config, storage, passage à make_app. |
| `Cargo.toml` | Dépendances image, webp, uuid, tokio, async-trait, tracing, etc. |
| `docker-compose.yml` | Env + volume `image_storage`. |
| `Dockerfile` | Création `/storage` et permissions. |

Cette documentation reflète l’état du code du pipeline images tel qu’implémenté ; pour la prod GCS, il restera à implémenter réellement `GcsStorage` et à activer la feature `gcs`.
