//! Routes admin : authentification par session (login/logout), JWT admin, ou clé header **`X-Admin-Key`** uniquement.
//! En cas de refus : 403 Forbidden. La session permet d'identifier un admin connecté sans repasser la clé.

use std::sync::Arc;

use actix_session::Session;
use actix_web::{HttpResponse, get, post, web};
use serde::Deserialize;
use sqlx::PgPool;

use crate::auth::admin_db::{
    count_admins, create_admin, get_admin_by_email, hash_password, verify_password,
};
use crate::auth::jwt::create_token;
use crate::images::{ImageImporter, RehydrateStats};
use crate::storage::Storage;

use super::admin_auth::ADMIN_JWT_ROLE;
pub use super::admin_auth::{
    admin_key_from_http, admin_key_from_request, bearer_token_from_http, is_admin_allowed,
    is_admin_authorized, is_admin_authorized_http, is_privileged_admin_request,
    x_admin_key_from_headers,
};
use super::admin_inline_html;

const ADMIN_TOKEN_HOURS: i64 = 24;

/// Secret admin (injecté en app_data pour le handler de login).
#[derive(Clone)]
pub struct AdminSecret(pub Option<String>);

const SESSION_KEY_ADMIN: &str = "admin_authenticated";

#[derive(Deserialize)]
pub struct AdminLoginForm {
    pub email: String,
    pub password: String,
}

#[get("/login")]
pub async fn admin_login_page(
    session: Session,
    pool: Option<web::Data<PgPool>>,
    _secret: Option<web::Data<AdminSecret>>,
) -> HttpResponse {
    let is_connected = session
        .get::<bool>(SESSION_KEY_ADMIN)
        .ok()
        .flatten()
        .unwrap_or(false);
    if is_connected {
        let body = admin_inline_html::render_admin_login_connected();
        return HttpResponse::Ok()
            .content_type("text/html; charset=utf-8")
            .body(body);
    }
    let has_db = pool.is_some();
    let body = if has_db {
        admin_inline_html::page_login_form()
    } else {
        admin_inline_html::page_login_no_db()
    };
    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(body)
}

#[post("/login")]
pub async fn admin_login(
    session: Session,
    form: web::Form<AdminLoginForm>,
    pool: Option<web::Data<PgPool>>,
    secret: Option<web::Data<AdminSecret>>,
) -> HttpResponse {
    let pool = match pool {
        Some(p) => p,
        None => {
            return HttpResponse::ServiceUnavailable()
                .content_type("text/html; charset=utf-8")
                .body(admin_inline_html::error_db_unavailable());
        }
    };
    let admin = match get_admin_by_email(pool.get_ref(), form.email.trim()).await {
        Ok(Some(a)) => a,
        Ok(None) | Err(_) => {
            return HttpResponse::Unauthorized()
                .content_type("text/html; charset=utf-8")
                .body(admin_inline_html::error_login_failed());
        }
    };
    if !verify_password(form.password.as_str(), &admin.password_hash) {
        return HttpResponse::Unauthorized()
            .content_type("text/html; charset=utf-8")
            .body(admin_inline_html::error_login_failed());
    }
    let sub = admin.email.as_str();
    let secret_bytes = secret
        .as_ref()
        .and_then(|s| s.0.as_deref())
        .unwrap_or("")
        .as_bytes();
    let token = match create_token(secret_bytes, sub, ADMIN_JWT_ROLE, ADMIN_TOKEN_HOURS) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("admin jwt create: {e}");
            return HttpResponse::InternalServerError().body("Erreur génération token");
        }
    };
    if let Err(e) = session.insert(SESSION_KEY_ADMIN, true) {
        tracing::error!("admin session insert: {e}");
    }
    let sub_esc = html_escape(sub);
    let token_esc = html_escape(&token);
    let body =
        admin_inline_html::render_admin_token_success(&sub_esc, &token_esc, ADMIN_TOKEN_HOURS);
    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(body)
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[derive(Deserialize)]
pub struct AdminSetupForm {
    pub email: String,
    pub password: String,
    /// Clé de setup (ADMIN_SECRET) pour autoriser la création du premier compte.
    pub setup_key: String,
}

#[get("/setup")]
pub async fn admin_setup_page(pool: Option<web::Data<PgPool>>) -> HttpResponse {
    if pool.is_none() {
        return HttpResponse::ServiceUnavailable().body("Base de données indisponible.");
    }
    let body = admin_inline_html::page_setup_form();
    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(body)
}

#[post("/setup")]
pub async fn admin_setup(
    pool: Option<web::Data<PgPool>>,
    form: web::Form<AdminSetupForm>,
    secret: Option<web::Data<AdminSecret>>,
) -> HttpResponse {
    let pool = match pool {
        Some(p) => p,
        None => return HttpResponse::ServiceUnavailable().body("Base de données indisponible."),
    };
    let expected = secret.as_ref().and_then(|s| s.0.as_deref());
    if expected.map(|s| form.setup_key.trim() != s).unwrap_or(true) {
        return HttpResponse::Unauthorized()
            .content_type("text/html; charset=utf-8")
            .body(admin_inline_html::error_setup_key());
    }
    let n = match count_admins(pool.get_ref()).await {
        Ok(n) => n,
        Err(_) => return HttpResponse::InternalServerError().body("Erreur base de données."),
    };
    if n > 0 {
        return HttpResponse::BadRequest()
            .content_type("text/html; charset=utf-8")
            .body(admin_inline_html::error_admin_exists());
    }
    let email = form.email.trim();
    if email.is_empty() {
        return HttpResponse::BadRequest().body("Email requis.");
    }
    let password_hash = match hash_password(form.password.as_str()) {
        Ok(h) => h,
        Err(_) => return HttpResponse::InternalServerError().body("Erreur hachage."),
    };
    if let Err(e) = create_admin(pool.get_ref(), email, &password_hash).await {
        tracing::error!("admin setup create: {}", e);
        return HttpResponse::InternalServerError()
            .body("Erreur création compte (email peut-être déjà utilisé).");
    }
    HttpResponse::SeeOther()
        .append_header(("Location", "/admin/login"))
        .finish()
}

#[post("/logout")]
pub async fn admin_logout(session: Session) -> HttpResponse {
    session.remove(SESSION_KEY_ADMIN);
    HttpResponse::SeeOther()
        .append_header(("Location", "/admin/login"))
        .finish()
}

#[derive(Deserialize)]
pub struct RehydrateQuery {
    #[serde(default)]
    pub force: bool,
}

#[post("/import")]
pub async fn admin_import(
    pool: Option<web::Data<PgPool>>,
    storage: Option<web::Data<Arc<dyn Storage>>>,
) -> HttpResponse {
    let pool = match pool {
        Some(p) => p.as_ref().clone(),
        None => return HttpResponse::ServiceUnavailable().body("pool required"),
    };
    let storage = match storage {
        Some(s) => s.as_ref().clone(),
        None => return HttpResponse::ServiceUnavailable().body("storage required"),
    };
    tokio::spawn(async move {
        if let Err(e) = ImageImporter::run(pool, storage).await {
            tracing::error!("admin import: {}", e);
        }
    });
    HttpResponse::Accepted().body("import started in background")
}

/// Re-remplit le stockage (ex. GCS) à partir des `original_url` et des chemins déjà en base.
/// Query : `?force=true` pour réécrire même si l’objet existe déjà.
#[post("/rehydrate_storage")]
pub async fn admin_rehydrate_storage(
    query: web::Query<RehydrateQuery>,
    pool: Option<web::Data<PgPool>>,
    storage: Option<web::Data<Arc<dyn Storage>>>,
) -> HttpResponse {
    let pool = match pool {
        Some(p) => p.as_ref().clone(),
        None => return HttpResponse::ServiceUnavailable().body("pool required"),
    };
    let storage = match storage {
        Some(s) => s.as_ref().clone(),
        None => return HttpResponse::ServiceUnavailable().body("storage required"),
    };
    let force = query.force;
    tokio::spawn(async move {
        match ImageImporter::rehydrate_storage(pool, storage, force).await {
            Ok(RehydrateStats {
                uploaded,
                skipped,
                failed,
            }) => {
                tracing::info!(
                    "admin rehydrate_storage: uploaded={} skipped={} failed={}",
                    uploaded,
                    skipped,
                    failed
                );
            }
            Err(e) => tracing::error!("admin rehydrate_storage: {}", e),
        }
    });
    HttpResponse::Accepted().body("rehydrate_storage started in background")
}
