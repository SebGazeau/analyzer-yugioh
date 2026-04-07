//! Erreurs et statistiques d’exécution YGOrganization.

use crate::db::DbError;

#[derive(Debug, thiserror::Error)]
pub enum YgOrgError {
    #[error("HTTP: {0}")]
    Http(#[from] reqwest::Error),
    #[error("JSON: {0}")]
    Json(#[from] serde_json::Error),
    #[error("base de données: {0}")]
    Db(#[from] DbError),
    #[error("en-tête X-Cache-Revision manquant ou invalide")]
    MissingRevision,
    #[error("manifest: JSON inattendu (attendu: objet avec data.card)")]
    BadManifest,
    #[error("révision cache non initialisée : appelez d'abord mode=init")]
    RevisionNotInitialized,
    #[error("index nom EN vide : exécutez d'abord mode=sync_index")]
    NameIndexMissing,
    #[error("index nom : JSON racine attendu (objet)")]
    BadNameIndex,
    #[error("{0}")]
    BadQuery(String),
}

#[derive(Debug, Default, Clone)]
pub struct RunStats {
    pub mode: &'static str,
    pub fetched_ok: u32,
    pub fetch_errors: u32,
    pub skipped_unknown_id: u32,
    pub manifest_card_ids: u32,
    pub remaining_manifest_hint: u32,
    pub cache_revision_before: Option<i64>,
    pub cache_revision_after: Option<i64>,
    /// Entrées `(nom, id)` insérées lors de `sync_index`.
    pub sync_index_pairs: u32,
    /// Backfill : nom absent de `ygorg_en_name_index`.
    pub name_not_in_index: u32,
    /// `sync_qa` : entrées Q&A upsertées.
    pub qa_upserted: u32,
    /// `sync_qa` : échecs (HTTP ou JSON sans `cards`).
    pub qa_fetch_errors: u32,
    pub message: Option<String>,
}

impl std::fmt::Display for RunStats {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "mode={}", self.mode)?;
        writeln!(f, "fetched_ok={}", self.fetched_ok)?;
        writeln!(f, "fetch_errors={}", self.fetch_errors)?;
        writeln!(f, "skipped_unknown_id={}", self.skipped_unknown_id)?;
        writeln!(f, "manifest_card_ids={}", self.manifest_card_ids)?;
        writeln!(
            f,
            "remaining_manifest_hint={}",
            self.remaining_manifest_hint
        )?;
        writeln!(f, "sync_index_pairs={}", self.sync_index_pairs)?;
        writeln!(f, "name_not_in_index={}", self.name_not_in_index)?;
        writeln!(f, "qa_upserted={}", self.qa_upserted)?;
        writeln!(f, "qa_fetch_errors={}", self.qa_fetch_errors)?;
        writeln!(f, "cache_revision_before={:?}", self.cache_revision_before)?;
        writeln!(f, "cache_revision_after={:?}", self.cache_revision_after)?;
        if let Some(m) = &self.message {
            writeln!(f, "message={m}")?;
        }
        Ok(())
    }
}
