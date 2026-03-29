//! Recherche et lecture `card_locales` pour les routes catalogue (étape 3.2).
//! L’upsert reste dans `crate::db::card_locales` (Konami, jobs).

use std::collections::{HashMap, HashSet};

use sqlx::PgPool;

use crate::db::DbError;

/// Motif `ILIKE ... ESCAPE '\'` : entoure de `%` et échappe `%`, `_`, `\`.
fn ilike_substring_pattern(user: &str) -> String {
    let mut p = String::from("%");
    for c in user.chars() {
        if matches!(c, '%' | '_' | '\\') {
            p.push('\\');
        }
        p.push(c);
    }
    p.push('%');
    p
}

/// Cartes dont le nom ou la description localisés matchent la sous-chaîne (recherche « côté locale »).
pub async fn card_ids_matching_locale_search(
    pool: &PgPool,
    locale: &str,
    query: &str,
) -> Result<HashSet<i64>, DbError> {
    let q = query.trim();
    if q.is_empty() {
        return Ok(HashSet::new());
    }
    let pat = ilike_substring_pattern(q);
    let rows: Vec<(i64,)> = sqlx::query_as(
        r#"
        SELECT DISTINCT card_id FROM card_locales
        WHERE locale = $1
          AND (name ILIKE $2 ESCAPE '\' OR card_desc ILIKE $2 ESCAPE '\')
        "#,
    )
    .bind(locale)
    .bind(&pat)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(|(id,)| id).collect())
}

/// `card_id` → (`name`, `card_desc`) pour une locale (lot par paquets).
pub async fn fetch_card_locales_map(
    pool: &PgPool,
    locale: &str,
    card_ids: &[i64],
) -> Result<HashMap<i64, (String, String)>, DbError> {
    if card_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let mut out = HashMap::new();
    const CHUNK: usize = 500;
    for chunk in card_ids.chunks(CHUNK) {
        let ids: Vec<i64> = chunk.to_vec();
        let rows: Vec<(i64, String, String)> = sqlx::query_as(
            r#"
            SELECT card_id, name, card_desc FROM card_locales
            WHERE locale = $1 AND card_id = ANY($2)
            "#,
        )
        .bind(locale)
        .bind(ids)
        .fetch_all(pool)
        .await?;
        for (id, n, d) in rows {
            out.insert(id, (n, d));
        }
    }
    Ok(out)
}

/// Résout une fiche par nom affiché dans une locale (après échec nom cache EN/FR).
pub async fn find_card_id_by_locale_name(
    pool: &PgPool,
    locale: &str,
    name_norm: &str,
    name_raw: &str,
) -> Result<Option<(i64, String, String)>, DbError> {
    let row: Option<(i64, String, String)> = sqlx::query_as(
        r#"
        SELECT card_id, name, card_desc FROM card_locales
        WHERE locale = $1 AND trim(name) = trim($2)
        LIMIT 1
        "#,
    )
    .bind(locale)
    .bind(name_raw)
    .fetch_optional(pool)
    .await?;
    if let Some(r) = row {
        return Ok(Some(r));
    }

    let pat = ilike_substring_pattern(name_raw.trim());
    let candidates: Vec<(i64, String, String)> = sqlx::query_as(
        r#"
        SELECT card_id, name, card_desc FROM card_locales
        WHERE locale = $1 AND name ILIKE $2 ESCAPE '\'
        LIMIT 40
        "#,
    )
    .bind(locale)
    .bind(&pat)
    .fetch_all(pool)
    .await?;

    use crate::shared::search::card_resolve::normalize_name_for_match;
    for (id, n, d) in candidates {
        if normalize_name_for_match(&n) == name_norm {
            return Ok(Some((id, n, d)));
        }
    }
    Ok(None)
}

#[cfg(test)]
mod ilike_pattern_tests {
    use super::ilike_substring_pattern;

    #[test]
    fn wraps_plain_text() {
        assert_eq!(ilike_substring_pattern("dragon"), "%dragon%");
    }

    #[test]
    fn escapes_wildcards_for_ilike() {
        assert_eq!(ilike_substring_pattern("100%"), "%100\\%%");
        assert_eq!(ilike_substring_pattern("a_b"), "%a\\_b%");
        assert_eq!(ilike_substring_pattern("x\\y"), "%x\\\\y%");
    }
}
