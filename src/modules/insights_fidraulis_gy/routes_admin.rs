//! Pages admin — file de validation Fidraulis GY.

use actix_web::{HttpResponse, get, post, web};
use serde::Deserialize;
use sqlx::PgPool;

use crate::routes::{ADMIN_DASHBOARD_ACTIONS_HTML, ADMIN_DASHBOARD_STYLE};
use crate::shared::search::cache::CardCache;
use crate::shared::structs::card_search_result::CardSearchResult;

use super::repository::{self, AdminQueueRow};

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn row_html(cards: &[CardSearchResult], r: &AdminQueueRow) -> String {
    let name = cards
        .iter()
        .find(|c| c.id() == r.passcode as u64)
        .map(|c| c.as_str().to_string())
        .unwrap_or_else(|| format!("passcode {}", r.passcode));
    let name_esc = escape_html(&name);
    format!(
        "<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td>\
<td><form method=\"post\" action=\"/admin/fidraulis-gy/validate\" style=\"display:inline\">\
<input type=\"hidden\" name=\"passcode\" value=\"{}\"/>\
<button type=\"submit\">Valider</button></form></td></tr>",
        name_esc, r.passcode, r.approves, r.rejects, r.score, r.passcode,
    )
}

#[get("/fidraulis-gy")]
pub async fn get_admin_fidraulis_gy_queue_page(
    pool: Option<web::Data<PgPool>>,
    card_cache: web::Data<CardCache>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .content_type("text/html; charset=utf-8")
            .body("PostgreSQL requis.");
    };
    let rows = match repository::list_admin_vote_queue(pool.get_ref()).await {
        Ok(r) => r,
        Err(e) => {
            if repository::sqlx_is_undefined_table(&e) {
                return HttpResponse::ServiceUnavailable()
                    .content_type("text/html; charset=utf-8")
                    .body("Tables insight Fidraulis GY absentes (migrations).");
            }
            tracing::error!("list_admin_vote_queue: {}", e);
            return HttpResponse::InternalServerError()
                .content_type("text/html; charset=utf-8")
                .body("Erreur base.");
        }
    };
    let cards = card_cache.get();
    let mut body_rows = String::new();
    for r in &rows {
        body_rows.push_str(&row_html(&cards, r));
    }
    if body_rows.is_empty() {
        body_rows.push_str("<tr><td colspan=\"6\">Aucun vote sur des passcodes non encore validés admin.</td></tr>");
    }
    let html = format!(
        r#"<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Fidraulis GY — validation</title></head>
<body>
%%STYLE%%
%%ACTIONS%%
<h1>Fidraulis GY — file communautaire</h1>
<p>Passcodes avec au moins un vote utilisateur, <strong>non</strong> présents dans la validation admin. Tri par score (approve − reject).</p>
<table border="1" cellpadding="6" cellspacing="0">
<thead><tr><th>Carte</th><th>Passcode</th><th>Oui</th><th>Non</th><th>Score</th><th>Action</th></tr></thead>
<tbody>{body_rows}</tbody>
</table>
<p><a href="/admin/login">Retour admin</a></p>
</body></html>"#
    )
    .replace("%%STYLE%%", ADMIN_DASHBOARD_STYLE)
    .replace("%%ACTIONS%%", ADMIN_DASHBOARD_ACTIONS_HTML);
    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(html)
}

#[derive(Deserialize)]
pub struct ValidateForm {
    pub passcode: i64,
}

#[post("/fidraulis-gy/validate")]
pub async fn post_admin_fidraulis_gy_validate(
    pool: Option<web::Data<PgPool>>,
    form: web::Form<ValidateForm>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .content_type("text/plain; charset=utf-8")
            .body("PostgreSQL requis.");
    };
    let pc = form.passcode;
    if pc <= 0 {
        return HttpResponse::BadRequest()
            .content_type("text/plain; charset=utf-8")
            .body("passcode invalide");
    }
    match repository::insert_admin_validated(pool.get_ref(), pc, None).await {
        Ok(()) => HttpResponse::SeeOther()
            .append_header(("Location", "/admin/fidraulis-gy"))
            .finish(),
        Err(e) => {
            if repository::sqlx_is_undefined_table(&e) {
                return HttpResponse::ServiceUnavailable()
                    .content_type("text/plain; charset=utf-8")
                    .body("Tables absentes.");
            }
            tracing::error!("insert_admin_validated: {}", e);
            HttpResponse::InternalServerError()
                .content_type("text/plain; charset=utf-8")
                .body("Erreur base")
        }
    }
}
