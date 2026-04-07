//! Parsing HTML et construction JSON pour l’index des packs.

use regex::Regex;
use scraper::{Html, Selector};
use serde_json::{Value, json};

use super::config::KONAMI_SITE_BASE;
use super::error::KonamiCatalogError;

fn normalize_pack_label(raw: &str) -> String {
    let line = raw
        .lines()
        .find(|l| !l.trim().is_empty())
        .unwrap_or(raw)
        .trim();
    line.chars()
        .map(|c| match c {
            '/' | ':' => '-',
            c => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

/// Extrait les paires (libellé pack, `value` du formulaire) comme le script Python.
pub fn parse_pack_index_html(html: &str) -> Result<Vec<(String, String)>, KonamiCatalogError> {
    let sel_pack =
        Selector::parse("div.pack").map_err(|e| KonamiCatalogError::Parse(e.to_string()))?;
    let sel_link = Selector::parse("input.link_value")
        .map_err(|e| KonamiCatalogError::Parse(e.to_string()))?;

    let document = Html::parse_document(html);

    let pack_labels: Vec<String> = document
        .select(&sel_pack)
        .map(|e| normalize_pack_label(&e.text().collect::<String>()))
        .filter(|s| !s.is_empty())
        .collect();

    let link_values: Vec<String> = document
        .select(&sel_link)
        .filter_map(|e| e.attr("value").map(str::to_owned))
        .collect();

    let n = pack_labels.len().min(link_values.len());
    if n == 0 {
        return Err(KonamiCatalogError::Parse(
            "aucun div.pack ou input.link_value — le HTML Konami a peut-être changé".into(),
        ));
    }

    if pack_labels.len() != link_values.len() {
        tracing::warn!(
            packs = pack_labels.len(),
            links = link_values.len(),
            "Konami: nombre de packs et de liens différent — troncature au minimum"
        );
    }

    Ok(pack_labels.into_iter().zip(link_values).take(n).collect())
}

pub(super) fn packs_to_json(pairs: &[(String, String)]) -> Value {
    let arr: Vec<Value> = pairs
        .iter()
        .map(|(name, path)| {
            json!({
                "display_name": name,
                "relative_path": path,
            })
        })
        .collect();
    json!({
        "source": "konami_db_yugioh_card_com",
        "pack_count": arr.len(),
        "packs": arr,
    })
}

/// Construit une URL absolue Konami et assure `request_locale` (comportement aligné sur l’ancien scraper).
pub fn absolute_konami_url(relative_or_absolute: &str, locale: &str) -> String {
    let base = KONAMI_SITE_BASE.trim_end_matches('/');
    let mut u = if relative_or_absolute.starts_with("http://")
        || relative_or_absolute.starts_with("https://")
    {
        relative_or_absolute.to_string()
    } else {
        format!("{base}{relative_or_absolute}")
    };
    if u.contains("request_locale=") {
        return u;
    }
    if u.contains('?') {
        u.push_str("&request_locale=");
    } else {
        u.push_str("?request_locale=");
    }
    u.push_str(locale);
    u
}

fn normalize_card_list_name(raw: &str) -> String {
    raw.lines()
        .map(str::trim)
        .find(|l| !l.is_empty())
        .unwrap_or(raw)
        .to_string()
}

/// Lignes `(nom affiché, chemin fiche)` sur une page **liste de cartes d’un pack**.
pub fn parse_pack_listing_card_rows(
    html: &str,
) -> Result<Vec<(String, String)>, KonamiCatalogError> {
    let sel_row = Selector::parse("div.t_row.c_normal.open")
        .map_err(|e| KonamiCatalogError::Parse(e.to_string()))?;
    let sel_name =
        Selector::parse("span.card_name").map_err(|e| KonamiCatalogError::Parse(e.to_string()))?;
    let sel_link = Selector::parse("input.link_value")
        .map_err(|e| KonamiCatalogError::Parse(e.to_string()))?;

    let doc = Html::parse_document(html);
    let mut out = Vec::new();
    for row in doc.select(&sel_row) {
        let name = row
            .select(&sel_name)
            .next()
            .map(|e| normalize_card_list_name(&e.text().collect::<String>()))
            .filter(|s| !s.is_empty());
        let path = row
            .select(&sel_link)
            .next()
            .and_then(|e| e.attr("value").map(str::to_owned))
            .filter(|s| s.starts_with('/'));
        if let (Some(n), Some(p)) = (name, path) {
            out.push((n, p));
        }
    }
    Ok(out)
}

/// Extrait un passcode 8 chiffres (première occurrence) et le bloc de texte carte (`dd.box_card_text`).
pub fn parse_card_detail_passcode_desc(html: &str) -> (Option<i64>, String) {
    let sel_dd = match Selector::parse("dd.box_card_text") {
        Ok(s) => s,
        Err(_) => return (None, String::new()),
    };
    let doc = Html::parse_document(html);
    let desc = doc
        .select(&sel_dd)
        .next()
        .map(|e| e.text().collect::<Vec<_>>().join("\n").trim().to_string())
        .unwrap_or_default();

    let re = Regex::new(r"\b([0-9]{8})\b").expect("static regex");
    let passcode = re
        .captures(html)
        .and_then(|c| c.get(1))
        .and_then(|m| m.as_str().parse::<i64>().ok());
    (passcode, desc)
}
