# Cloud SQL (PostgreSQL) + Cloud Run

Objectif : attacher une base **PostgreSQL** à **`analyzer-yugioh`** sur Cloud Run.  
L’app applique les migrations au démarrage (`sqlx::migrate!`).

**Voir aussi** : **`deploy-gcp-cloud-run.md`** — facturation CPU, RAM, import d’images en arrière-plan (`POST /admin/import`).

---

## 0. Variables

```bash
export PROJECT_ID="analyser-yugioh"
export REGION="europe-west1"
export INSTANCE="analyzer-db"          # nom de l’instance Cloud SQL
export DB_NAME="analyzer_yugioh"
export DB_USER="analyzer"
# Mot de passe fort (évite @ : # ? / dans le mot de passe pour simplifier DATABASE_URL)
export DB_PASS='remplace-par-un-mot-de-passe-long'
```

---

## 1. API Cloud SQL

```bash
gcloud config set project "$PROJECT_ID"
gcloud services enable sqladmin.googleapis.com
```

---

## 2. Droits du compte de service Cloud Run → Cloud SQL

Cloud Run utilise par défaut le compte **Compute default** :

```bash
export PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
export RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUN_SA}" \
  --role="roles/cloudsql.client"
```

Si ton service Cloud Run utilise un **autre** compte (Console → Cloud Run → ton service → Sécurité), remplace `RUN_SA`.

---

## 3. Créer l’instance PostgreSQL

**Dev / essai** (petite instance, coût faible) :

`db-f1-micro` n’est **pas** utilisable avec l’édition **Enterprise Plus** (défaut récent sur certains comptes). Il faut explicitement l’édition **ENTERPRISE** :

```bash
gcloud sql instances create "$INSTANCE" \
  --database-version=POSTGRES_16 \
  --edition=ENTERPRISE \
  --tier=db-f1-micro \
  --region="$REGION" \
  --root-password="$DB_PASS"
```

**Si tu veux Enterprise Plus** (plus cher), ne pas utiliser `db-f1-micro` : voir les tiers `db-perf-optimized-*` dans la [doc machine types](https://cloud.google.com/sql/docs/postgres/create-instance#machine-types).

> Pour la prod : augmente la machine (`--tier`), active sauvegardes / HA selon tes besoins.

Créer la base et l’utilisateur applicatif :

```bash
gcloud sql databases create "$DB_NAME" --instance="$INSTANCE"

gcloud sql users create "$DB_USER" \
  --instance="$INSTANCE" \
  --password="$DB_PASS"
```

*(Si tu préfères ne pas donner le même mot de passe que `root`, crée un mot de passe distinct pour `DB_USER`.)*

---

## 4. Chaîne `DATABASE_URL` (socket Cloud SQL)

Le **connection name** est `PROJECT:REGION:INSTANCE` :

```bash
export CONN="${PROJECT_ID}:${REGION}:${INSTANCE}"
```

Format pour **sqlx** / tokio-postgres sur Cloud Run : il faut un **hôte non vide** (`localhost` sert de placeholder ; la socket réelle est dans `host=`).

```text
postgresql://DB_USER:DB_PASS@localhost/${DB_NAME}?host=/cloudsql/${CONN}
```

> Ne pas utiliser `...@/db?host=...` (hôte vide) : sqlx renvoie alors `error with configuration: empty host`.

**Caractères spéciaux dans le mot de passe** : les encoder en URL (`@` → `%40`, `#` → `%23`, etc.) ou utiliser un mot de passe sans ces caractères.

Exemple (mot de passe simple ASCII) :

```bash
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost/${DB_NAME}?host=/cloudsql/${CONN}"
```

---

## 5. Lier Cloud Run à l’instance

### 5a. Variable d’environnement (test rapide)

```bash
gcloud run services update analyzer-yugioh \
  --region="$REGION" \
  --add-cloudsql-instances="$CONN" \
  --update-env-vars "DATABASE_URL=${DATABASE_URL}"
```

### 5b. Secret Manager (recommandé)

L’URL complète (user + mot de passe) ne doit pas rester en clair dans la config Cloud Run.

**1. API**

```bash
gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID"
```

**2. Créer le secret** (une seule ligne = contenu brut de l’URL Postgres)

Nom conseillé : `analyzer-database-url`.

```bash
# Évite d’exposer l’URL dans l’historique bash : préfère coller dans la console
# (Secret Manager → Créer un secret) ou :
read -s -p "DATABASE_URL: " DATABASE_URL && echo && echo -n "$DATABASE_URL" | gcloud secrets create analyzer-database-url --data-file=- --project="$PROJECT_ID"
```

Si le secret existe déjà (nouvelle version) :

```bash
echo -n "$DATABASE_URL" | gcloud secrets versions add analyzer-database-url --data-file=- --project="$PROJECT_ID"
```

**3. Autoriser Cloud Run à lire le secret**

```bash
export PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
export RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding analyzer-database-url \
  --project="$PROJECT_ID" \
  --member="serviceAccount:${RUN_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

*(Si le service utilise un autre compte : Console → Cloud Run → Sécurité → Compte de service.)*

**4. Brancher Cloud Run sur le secret** et retirer l’ancienne variable en clair

```bash
gcloud run services update analyzer-yugioh \
  --region="$REGION" \
  --remove-env-vars="DATABASE_URL" \
  --set-secrets="DATABASE_URL=analyzer-database-url:latest" \
  --add-cloudsql-instances="$CONN"
```

`--add-cloudsql-instances` est idempotent si la liaison existe déjà ; sinon elle est recréée.

> Après passage au secret, ne commite jamais l’URL dans le dépôt ; garde-la hors Git (`.env` local déjà ignoré).

---

## 6. Vérifier

```bash
gcloud run services describe analyzer-yugioh --region="$REGION" --format='value(status.url)'
```

Logs au démarrage (migrations + chargement cache depuis la table `cards`) :

```bash
gcloud run services logs read analyzer-yugioh --region="$REGION" --limit 80
```

Puis **`GET /admin/fetch_cards`** avec **`X-Admin-Key`** pour remplir la table `cards` si elle est vide.

---

## Dépannage

| Symptôme | Piste |
|----------|--------|
| `Invalid Tier (db-f1-micro) for (ENTERPRISE_PLUS)` | Ajouter `--edition=ENTERPRISE` à `instances create`, ou choisir un tier compatible Enterprise Plus. |
| `403` sur `databases create` / `users create` | L’instance n’existe pas (création échouée avant) **ou** ton compte n’a pas `roles/cloudsql.admin` / `roles/cloudsql.editor` sur le projet. |
| `could not connect to server` | Vérifier `--add-cloudsql-instances`, rôle `cloudsql.client`, et que `DATABASE_URL` utilise bien `host=/cloudsql/...`. |
| Mot de passe refusé | Utilisateur / base créés avec `gcloud sql users` / `databases`. |
| Table absente | Migrations : regarder les logs ; vérifier que le conteneur voit le dossier `migrations` (déjà compilé dans le binaire via `sqlx::migrate!`). |
| Import images bloqué, `images` ne grossit pas | **Facturation par requêtes** + tâche en arrière-plan → CPU coupé après le `POST`. Voir **`deploy-gcp-cloud-run.md`** (instance-based / `--no-cpu-throttling`, 2 CPU, 2 Gio, `min-instances=1`). |

---

## Résumé coût / prod

- `db-f1-micro` : OK pour tests ; charge réelle → tier supérieur.
- Active les **sauvegardes automatiques** et un **budget / alerte** sur le projet.
