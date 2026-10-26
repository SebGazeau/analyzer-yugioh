# Cloud Run — réglages opérationnels (analyzer-yugioh)

Complément à **`deploy-gcp-cloudsql.md`** : comportement du service une fois l’image déployée (CPU, mémoire, tâches en arrière-plan).

**Mise en place GCS (images privées) :** **`deploy-gcp-gcs.md`**.

---

## Import d’images (`POST /admin/import`)

L’import bulk est lancé en **tâche de fond** (`tokio::spawn`) après que la réponse HTTP (**202**) est renvoyée.

### Problème : facturation « par requête »

Avec **Facturation basée sur les requêtes** (*CPU limité hors requêtes*), dès que la requête `POST /admin/import` est terminée, Cloud Run **réduit fortement le CPU** de l’instance. La boucle d’import **n’avance pratiquement plus** : la table `images` reste quasi vide ou stagne alors que `cards` contient des milliers de `image_url`.

### Réglage qui corrige le problème (validé en prod)

Dans **Cloud Run** → service → **Modifier / déployer** → conteneur + facturation :

| Paramètre | Valeur recommandée pendant un **gros import** |
|-----------|-----------------------------------------------|
| **Facturation** | **Basée sur les instances** — CPU disponible **pendant tout le cycle de vie** de l’instance (équivalent à ne pas étouffer le CPU entre deux requêtes). |
| **CPU** | **2** |
| **Mémoire** | **2 Gio** |
| **Instances min.** | **1** le temps de l’import (évite le scale-to-zero qui tue le travail en cours). |

En **ligne de commande** (même idée que la console) :

```bash
gcloud run services update analyzer-yugioh \
  --region=europe-west1 \
  --cpu=2 \
  --memory=2Gi \
  --no-cpu-throttling \
  --min-instances=1
```

> **`--no-cpu-throttling`** : le CPU n’est plus bridé hors requête HTTP — nécessaire pour que l’import en arrière-plan progresse.

### Après l’import

Pour **réduire la facture**, tu peux repasser en **facturation par requêtes**, baisser **min-instances** à `0`, et ajuster CPU/RAM selon le trafic réel — au prix d’imports longs à **relancer** depuis l’admin si besoin.

### Autres conseils

- **`RUST_LOG=info`** : voir les logs `import images:` dans Cloud Logging.
- **Durée** : des milliers d’URLs × (téléchargement + WebP + écriture) peuvent prendre **plusieurs heures** même avec du CPU correct.
- **Stockage** : en `STORAGE_BACKEND=local`, les fichiers sont sur le disque **éphémère** du conteneur ; pour de la persistance entre redémarrages, prévoir **GCS** (voir `STORAGE_BACKEND` / `docs/pipeline_images.md`).

### Images en 500 / 404 en ligne (`/images/.../file/desktop`)

Avec **`STORAGE_BACKEND=local`** sur Cloud Run :

1. **Disque éphémère** : après **redéploiement**, **nouvelle instance** ou **scale-out**, le répertoire type **`/storage`** est **vide** alors que la table **`images`** contient encore les lignes → les fichiers n’existent plus → erreur côté client (historiquement **500**, désormais **404** si fichier absent).
2. **Plusieurs instances** : l’import a écrit sur l’instance A ; une requête **`GET /images/...`** peut être servie par l’instance B **sans** ces fichiers → même symptôme.

**Pistes durables :**

- **Un seul conteneur** le temps de stabiliser : `min-instances=1` **et** `max-instances=1` pendant l’import + usage (fragile : tout redéploiement efface le disque).
- **Solution correcte** : **GCS privé** + `STORAGE_BACKEND=gcs` (voir section suivante).
- **À court terme** : après chaque déploiement, **relancer** `POST /admin/import` (idempotent sur les URLs déjà vues) **sur une instance seule** pour re-télécharger vers le disque local — acceptable seulement en phase de test.

---

## Stockage images : GCS **privé** (recommandé en prod)

Le bucket reste **sans accès public** : le **compte de service Cloud Run** appelle l’API Storage ; le navigateur reçoit les WebP via **`GET /images/{id}/file/...`** (proxy dans l’app).

### 1. Bucket Cloud Storage

Créer un bucket (région proche de Cloud Run). Ne **pas** activer l’accès public uniforme.

### 2. IAM sur le compte de service du service Cloud Run

Souvent : **`PROJECT_NUMBER-compute@developer.gserviceaccount.com`**.

```bash
export PROJECT_ID="analyser-yugioh"
export BUCKET="ton-bucket-images"
export PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
export RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${RUN_SA}" \
  --role="roles/storage.objectAdmin"
```

*(Adapte `RUN_SA` si tu utilises un compte de service dédié sur Cloud Run.)*

### 3. Variables d’environnement Cloud Run

- `STORAGE_BACKEND=gcs`
- `GCS_BUCKET_NAME=<nom du bucket>` (sans préfixe `gs://`)

L’image **Docker de prod** est compilée avec **`--features gcs`** (voir `Dockerfile`).

### 4. Anciennes lignes `images` (déjà en base)

Les clés d’objets GCS sont les **mêmes** chemins logiques que sur disque (`images/{uuid}/desktop.webp`, etc.) : **aucun UPDATE SQL** des colonnes `path_*` n’est nécessaire.

- **`POST /admin/import`** ne retélécharge **que** les URLs **absentes** de la table `images` → il **ne remplit pas** le bucket pour les lignes déjà présentes.
- Pour recopier les fichiers vers GCS en conservant les chemins : **`POST /admin/rehydrate_storage`** (option **`?force=true`** pour tout réécrire). Voir `deploy-gcp-gcs.md` §6–7.

---

## Rappels utiles

- Ne pas faire **`gcloud run deploy … --image` seul** : risque d’**effacer** secrets, Cloud SQL, variables. Préférer **`gcloud run services update`** avec tous les flags nécessaires, ou compléter le `deploy`.
- **`DATABASE_URL`** pour **sqlx** : utiliser un hôte non vide, ex.  
  `postgresql://USER:PASS@localhost/DB?host=/cloudsql/PROJET:REGION:INSTANCE`  
  (pas `...@/db?host=...` → erreur **empty host**).
- **Migrations** : au boot, ou job / étape CI avec **`./analyzer-yugioh migrate`** (voir **`docs/db-migrations.md`**).

---

## Vérifier la progression import

```sql
SELECT COUNT(*) FROM images;
SELECT COUNT(DISTINCT image_url) FROM cards
WHERE image_url IS NOT NULL AND image_url <> '';
```

Les URLs **distinctes** peuvent être nettement inférieures au nombre de cartes (plusieurs cartes, même image).

---

## GitHub Actions — déploiement (CD)

### Version & tag automatiques

Le workflow **`.github/workflows/version-tag.yml`** tourne à chaque **push sur `main` / `master`** (sauf sur les commits générés `chore(release): bump …` pour éviter une boucle) : il **incrémente** la version **`patch`** dans `Cargo.toml`, met à jour **`Cargo.lock`** (`cargo check`), **commit**, pousse le **tag annoté** `vX.Y.Z`, ce qui déclenche le déploiement.

- **Manuel** : Actions → *Version & tag* → *Run workflow* → choix **patch / minor / major** (utile sans nouveau commit sur la branche).
- **Outil local** : `cargo run -p xtask --bin bump-cargo-version -- X.Y.Z` (crate **`xtask`**, sans dépendance runtime).

Sur les dépôts avec **branch protection** stricte sur `main`, il faut autoriser **GitHub Actions** à pousser (ou utiliser un PAT stocké en secret) — sinon l’étape `git push` échouera.

### Déploiement

Le workflow **`.github/workflows/deploy-gcp.yml`** se déclenche **uniquement** sur push d’un **tag** `v*` (ex. `v1.2.0`). Il enchaîne d’abord les mêmes contrôles qualité que la CI (workflow réutilisable **`quality-reusable.yml`**), puis build / push de l’image, exécution d’un job de migration Cloud Run, et mise à jour Cloud Run.

La **CI** (workflow **`CI`**) tourne sur les **pull requests** vers `main` / `master` (fmt, clippy, tests, front, **intégration Postgres + E2E**, smoke Docker). Détail : **`docs/ci-integration.md`**. Après merge, **version-tag** crée le tag ; le merge seul ne déploie pas tant que le tag n’est pas poussé (c’est ce job qui le pousse).

Le job de déploiement : construit le front (`static/dist`), build l’image Docker (**`--features gcs`**, comme le `Dockerfile`), pousse vers **Artifact Registry**, met à jour l’image d’un **Cloud Run Job de migration**, exécute ce job (`--wait`), puis met à jour **uniquement l’image** du service Cloud Run avec **`gcloud run services update … --image=…`**. Si la migration échoue, le service n’est pas basculé. Les variables d’environnement, secrets et liaison Cloud SQL **déjà configurés** dans la console (ou via des `gcloud` précédents) **ne sont pas réinitialisés** (voir l’avertissement § « Rappels utiles » ci-dessus sur `deploy … --image` seul).

### Variables GitHub (repository → Settings → Secrets and variables → Actions → Variables)

| Variable | Exemple | Rôle |
|----------|---------|------|
| `GCP_PROJECT_ID` | `mon-projet` | Projet GCP |
| `GCP_REGION` | `europe-west1` | Région Cloud Run + préfixe registry |
| `GCP_RUN_SERVICE` | `analyzer-yugioh` | Nom du service Cloud Run |
| `GCP_RUN_MIGRATE_JOB` | `analyzer-yugioh-migrate` | Nom du Cloud Run Job qui exécute `./analyzer-yugioh migrate` |
| `GCP_ARTIFACT_REPO` | `app` | Nom du **dépôt** Docker dans Artifact Registry |
| `GCP_IMAGE_NAME` | `analyzer-yugioh` | Nom de l’**image** dans ce dépôt |

Image poussée :  
`{GCP_REGION}-docker.pkg.dev/{GCP_PROJECT_ID}/{GCP_ARTIFACT_REPO}/{GCP_IMAGE_NAME}:{tag}`  
avec `tag` = **nom exact du tag git** (ex. `v1.0.0`).

### Secrets GitHub (recommandé : sans clé JSON)

Configurer la **Workload Identity Federation** (pool OIDC GitHub → compte de service GCP), puis :

| Secret | Contenu |
|--------|---------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Ressource complète du provider WIF |
| `GCP_SERVICE_ACCOUNT` | Email du SA utilisé par Actions (ex. `github-deploy@….iam.gserviceaccount.com`) |

Droits typiques sur ce SA : **`roles/artifactregistry.writer`**, **`roles/run.admin`** (ajuster au plus juste selon ta politique IAM).

**Alternative** (clé JSON de compte de service) : dans le workflow, remplacer l’étape *Authenticate to Google Cloud* par  
`credentials_json: ${{ secrets.GCP_SA_KEY }}`  
et supprimer `id-token: write` si tu n’utilises pas WIF. Moins recommandé (secret longue durée).

### Première image / dépôt Artifact Registry

Si le dépôt Docker n’existe pas encore :

```bash
gcloud artifacts repositories create "$GCP_ARTIFACT_REPO" \
  --repository-format=docker \
  --location="$GCP_REGION" \
  --project="$GCP_PROJECT_ID"
```

Le service Cloud Run doit exister au moins une fois (premier déploiement manuel ou `gcloud run deploy` **complet** avec env, secrets, `--add-cloudsql-instances`, etc., comme dans **`deploy-gcp-cloudsql.md`**). Ensuite, la CI ne fait qu’**échanger l’image**.
