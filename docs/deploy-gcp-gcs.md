# Mise en ligne du stockage images sur GCS (privé)

Checklist pour **`analyzer-yugioh`** sur Cloud Run avec **`STORAGE_BACKEND=gcs`**.

**Prérequis :** image Docker **reconstruite** après le code GCS (`Dockerfile` contient déjà `--features gcs`). Si tu déploies une ancienne image sans cette feature, GCS ne fonctionnera pas.

---

## 1. API Storage

```bash
gcloud config set project analyser-yugioh
gcloud services enable storage.googleapis.com
```

---

## 2. Bucket **privé**

Choisis un nom **globalement unique** (ex. `analyser-yugioh-images-PROJET`).

```bash
export REGION="europe-west1"
export BUCKET="analyser-yugioh-images"   # à adapter si déjà pris

gcloud storage buckets create "gs://${BUCKET}" \
  --location="${REGION}" \
  --uniform-bucket-level-access
```

- Ne **pas** ajouter d’accès « public » au bucket.
- Même région que Cloud Run → latence et coûts un peu meilleurs.

---

## 3. IAM : droits pour le compte Cloud Run

Le service doit pouvoir **lire/écrire/supprimer** des objets dans ce bucket.

```bash
export PROJECT_NUMBER=$(gcloud projects describe analyser-yugioh --format='value(projectNumber)')
export RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${RUN_SA}" \
  --role="roles/storage.objectAdmin"
```

Si ton service Cloud Run utilise **un autre** compte de service : **Console → Cloud Run → analyzer-yugioh → Sécurité** → copie l’email et remplace `RUN_SA`.

---

## 4. Variables sur Cloud Run (sans tout effacer)

**Recommandé : Console GCP**

1. **Cloud Run** → **analyzer-yugioh** → **Modifier / déployer une nouvelle révision**
2. **Variables et secrets** → **+ Ajouter une variable** :
   - `STORAGE_BACKEND` = `gcs`
   - `GCS_BUCKET_NAME` = `<nom du bucket>` (sans `gs://`)
3. Vérifie que le reste est toujours là : **`DATABASE_URL`** (secret), **`ADMIN_SECRET`**, **`CONN` Cloud SQL**, **`RUST_LOG`**, etc.
4. **Déployer**

> Évite un `gcloud run deploy --image …` **seul** : tu peux perdre secrets / Cloud SQL. Si tu utilises la CLI, passe **tous** les flags nécessaires (`--set-secrets`, `--add-cloudsql-instances`, etc.) ou limite-toi à **modifier les variables** dans la console.

**Exemple CLI** (uniquement si tu es sûr de ne pas écraser la config ; à ajuster selon ta révision actuelle) :

```bash
gcloud run services update analyzer-yugioh \
  --region=europe-west1 \
  --update-env-vars="STORAGE_BACKEND=gcs,GCS_BUCKET_NAME=${BUCKET}"
```

Sur certaines versions de `gcloud`, `--update-env-vars` ne fait qu’**ajouter/mettre à jour** ces clés — vérifie dans la console après coup.

---

## 5. Nouvelle image (si pas encore déployée avec GCS)

Depuis la racine du repo :

```bash
export IMAGE="europe-west1-docker.pkg.dev/analyser-yugioh/analyzer/analyzer-yugioh:latest"
gcloud builds submit --tag "$IMAGE" .
```

Puis mets à jour Cloud Run avec **cette image** **en conservant** variables, secrets et Cloud SQL (console ou `deploy` complet).

---

## 6. Remplir le bucket (nouvelles images)

1. Ouvre le site → admin connecté ou **`X-Admin-Key`**
2. **`POST /admin/import`** — n’importe que les URLs **pas encore** dans `images`
3. Avec **CPU instance-based** + **min-instances=1** le temps du gros import (voir `deploy-gcp-cloud-run.md`)

---

## 7. Déjà des lignes en `images` (ex. import sur disque local puis passage en GCS)

Les chemins en base restent valides pour GCS. Il faut **uploader les octets** sous les mêmes clés.

- **Depuis l’app (recommandé)** : avec `STORAGE_BACKEND=gcs` et IAM OK,  
  **`POST /admin/rehydrate_storage`** — retélécharge chaque `original_url` et écrit `original` / `desktop` / `mobile` aux `path_*` existants.  
  **`POST /admin/rehydrate_storage?force=true`** — réécrit même si l’objet existe déjà.
- **Depuis une copie du dossier** (ex. archive de `/storage` avant recycle) :  
  `gcloud storage cp -r ./storage/images gs://TON_BUCKET/`  
  en gardant la structure `images/{uuid}/…` identique à la DB.

**Limite** : si les fichiers n’existaient que sur le disque **éphémère** Cloud Run et que l’instance a été recyclée, sans sauvegarde il ne reste que **rehydrate** (URLs sources encore joignables) ou ré-import partiel impossible sans vider `images` (à éviter si tu référencs des UUID).

Vérifie dans **Cloud Storage** → ton bucket → préfixe `images/`. Les **`GET /images/{uuid}/file/desktop`** doivent répondre **200**.

---

## Dépannage

| Symptôme | Piste |
|----------|--------|
| `storage: GCS auth` au démarrage | Compte de service Cloud Run sans accès métadonnées / projet incorrect. |
| `403` / `storage:` côté API | IAM bucket : `objectAdmin` ou équivalent sur le **bon** SA. |
| `404` sur les images | Objet absent dans le bucket → **`POST /admin/rehydrate_storage`** si les lignes `images` existent déjà ; sinon `POST /admin/import`. Vérifier `GCS_BUCKET_NAME`. |
| Build Cloud Build échoue | Rust 1.88+ dans le `Dockerfile`, réseau pour crates.io. |

---

*Voir aussi : `deploy-gcp-cloud-run.md` (CPU import, bucket privé résumé).*
