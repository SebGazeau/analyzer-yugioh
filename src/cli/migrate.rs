//! Sous-commande `migrate` : applique les migrations SQL embarquées puis quitte.
//!
//! Usage : `DATABASE_URL=… ./analyzer-yugioh migrate` ou `cargo run -- migrate`
//! (depuis la racine du dépôt, un fichier `.env` avec `DATABASE_URL` est chargé automatiquement).
//!
//! Sur l’hôte : `DATABASE_URL` doit pointer vers **127.0.0.1:5433** (port mappé), pas `db:5432`
//! (hostname résolu seulement dans le réseau Docker). Voir `.env.example` et `make docker-db-migrate`.

use sqlx::postgres::PgPoolOptions;

use crate::db;

/// Code de sortie non nul si échec (CI / job Cloud Run avant trafic).
pub async fn run() -> std::io::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .init();

    let dotenv_path = std::path::Path::new(".env");
    if dotenv_path.exists() {
        let _ = dotenvy::from_filename(dotenv_path);
    }

    let url = std::env::var("DATABASE_URL").map_err(|_| {
        eprintln!("[fatal] DATABASE_URL requis pour la sous-commande migrate.");
        eprintln!(
            "[hint] Exporter DATABASE_URL ou lancer : ./scripts/db_migrate.sh (sourçait .env)"
        );
        std::io::Error::new(std::io::ErrorKind::InvalidInput, "DATABASE_URL")
    })?;

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&url)
        .await
        .map_err(|e| {
            eprintln!("[fatal] Connexion Postgres : {e}");
            let msg = e.to_string();
            if msg.contains("lookup address") || msg.contains("name resolution") {
                eprintln!(
                    "[hint] Hostname introuvable depuis cette machine : si DATABASE_URL utilise « @db: », \
remplacez par @127.0.0.1:5433 (voir .env.example), ou exécutez les migrations dans Docker : \
make docker-db-migrate — ou make docker-dev MIGRATE=1"
                );
            }
            std::io::Error::other(e)
        })?;

    db::run_migrations(&pool).await.map_err(|e| {
        let msg = e.to_string();
        eprintln!("[fatal] Migrations : {msg}");
        if msg.contains("was previously applied but has been modified")
            || msg.contains("ChecksumMismatch")
        {
            eprintln!(
                "[hint] Une migration déjà enregistrée en base ne correspond plus au fichier `.sql` (sécurité sqlx). \
En dev sans données à garder : make docker-clean puis relancer migrate. \
Sinon : ne pas modifier un `.sql` déjà appliqué — ajouter une nouvelle migration, ou restaurer l’ancien fichier. \
Voir docs/db-migrations.md (checksum). Verrou long sur pg_advisory_lock : fermer tout autre migrate / instance app sur la même DB."
            );
        }
        std::io::Error::other(msg)
    })?;

    tracing::info!("Migrations appliquées avec succès.");
    Ok(())
}
