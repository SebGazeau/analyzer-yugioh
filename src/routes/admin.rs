//! Routes admin : authentification par session (login/logout) ou par clé (X-Admin-Key / admin_key).
//! En cas de refus : 403 Forbidden. La session permet d'identifier un admin connecté sans repasser la clé.

use std::sync::Arc;

use actix_session::Session;
use actix_session::SessionExt;
use actix_web::dev::ServiceRequest;
use actix_web::{get, HttpResponse, post, web};
use serde::Deserialize;
use sqlx::PgPool;

use crate::auth::admin_db::{count_admins, create_admin, get_admin_by_email, hash_password, verify_password};
use crate::auth::jwt::{create_token, decode_token};
use crate::images::ImageImporter;
use crate::storage::Storage;

const ADMIN_JWT_ROLE: &str = "admin";
const ADMIN_TOKEN_HOURS: i64 = 24;

/// Secret admin (injecté en app_data pour le handler de login).
#[derive(Clone)]
pub struct AdminSecret(pub Option<String>);

/// Extrait la clé admin depuis le header X-Admin-Key ou le paramètre de requête `admin_key` (pour le navigateur).
pub fn admin_key_from_request(req: &ServiceRequest) -> Option<String> {
    let header = req
        .headers()
        .get("x-admin-key")
        .and_then(|v| v.to_str().ok())
        .map(String::from);
    if header.is_some() {
        return header;
    }
    let q = req.query_string();
    for part in q.split('&') {
        if let Some((k, v)) = part.split_once('=') {
            if k == "admin_key" && !v.is_empty() {
                return Some(v.to_string());
            }
        }
    }
    None
}

/// Retourne true si l'accès admin est autorisé (pas de secret configuré, ou clé valide en header/query).
pub fn is_admin_authorized(req: &ServiceRequest, secret: &Option<String>) -> bool {
    match secret {
        None => true,
        Some(s) => admin_key_from_request(req)
            .as_deref()
            .map(|k| k == s.as_str())
            .unwrap_or(false),
    }
}

/// Extrait le token Bearer depuis le header Authorization.
fn bearer_token_from_request(req: &ServiceRequest) -> Option<String> {
    req.headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer ").map(str::trim))
        .filter(|s| !s.is_empty())
        .map(String::from)
}

/// Retourne true si la requête doit être autorisée : chemin login/setup (formulaire public), clé valide, JWT admin, ou session admin.
/// GET/POST /admin/setup sont autorisés sans clé : la protection se fait côté POST via le champ "clé de setup" du formulaire.
pub fn is_admin_allowed(req: &ServiceRequest, secret: &Option<String>) -> bool {
    let path = req.path();
    if path == "/admin" || path == "/admin/login" || path == "/admin/setup" {
        return true;
    }
    if is_admin_authorized(req, secret) {
        return true;
    }
    if let Some(s) = secret {
        if let Some(token) = bearer_token_from_request(req) {
            if decode_token(s.as_bytes(), &token)
                .map(|c| c.role == ADMIN_JWT_ROLE)
                .unwrap_or(false)
            {
                return true;
            }
        }
    }
    let session = req.get_session();
    session
        .get::<bool>("admin_authenticated")
        .ok()
        .flatten()
        .unwrap_or(false)
}

const SESSION_KEY_ADMIN: &str = "admin_authenticated";

#[get("")]
pub async fn admin_index() -> HttpResponse {
    HttpResponse::SeeOther()
        .append_header(("Location", "/admin/login"))
        .finish()
}

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
        let body = r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Admin</title></head><body>
<h1>Espace admin</h1>
<p>Connecté en tant qu'admin.</p>
<p>
  <form method="get" action="/admin/fetch_cards" style="display:inline">
    <button type="submit">Rafraîchir les cartes</button>
  </form>
  <form method="post" action="/admin/import" style="display:inline">
    <button type="submit">Importer les images</button>
  </form>
</p>
<p><small>Rafraîchir : appelle l'API, met à jour la DB et le cache. Importer : télécharge les images manquantes en arrière-plan.</small></p>
<form method="post" action="/admin/logout"><button type="submit">Déconnexion</button></form>
</body></html>"#;
        return HttpResponse::Ok()
            .content_type("text/html; charset=utf-8")
            .body(body);
    }
    let has_db = pool.is_some();
    let body = if has_db {
        r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Admin</title></head><body>
<h1>Connexion admin</h1>
<form method="post" action="/admin/login">
  <label>Email <input name="email" type="email" required placeholder="admin@example.com"/></label><br/>
  <label>Mot de passe <input name="password" type="password" autocomplete="off" required/></label><br/>
  <button type="submit">Connexion</button>
</form>
<p><a href="/admin/setup">Créer le premier compte admin</a></p>
</body></html>"#
    } else {
        r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Admin</title></head><body>
<h1>Admin</h1>
<p>Base de données requise pour la connexion email/mot de passe.</p>
<p><a href="/admin/fetch_cards">Rafraîchir les cartes</a> (si accès par clé)</p>
</body></html>"#
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
                .body("<p>Base de données indisponible.</p><p><a href=\"/admin/login\">Retour</a></p>");
        }
    };
    let admin = match get_admin_by_email(pool.get_ref(), form.email.trim()).await {
        Ok(Some(a)) => a,
        Ok(None) | Err(_) => {
            return HttpResponse::Unauthorized()
                .content_type("text/html; charset=utf-8")
                .body("<p>Email ou mot de passe incorrect.</p><p><a href=\"/admin/login\">Réessayer</a></p>");
        }
    };
    if !verify_password(form.password.as_str(), &admin.password_hash) {
        return HttpResponse::Unauthorized()
            .content_type("text/html; charset=utf-8")
            .body("<p>Email ou mot de passe incorrect.</p><p><a href=\"/admin/login\">Réessayer</a></p>");
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
            tracing::error!("admin jwt create: {}", e);
            return HttpResponse::InternalServerError().body("Erreur génération token");
        }
    };
    if let Err(e) = session.insert(SESSION_KEY_ADMIN, true) {
        tracing::error!("admin session insert: {}", e);
    }
    let body = format!(
        r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Admin – Token</title></head><body>
<h1>Connexion réussie</h1>
<p>Identité : <strong>{}</strong></p>
<p>Token JWT (valide {} h) — à utiliser pour les routes <code>/admin/*</code> :</p>
<pre id="token" style="background:#f0f0f0;padding:0.5em;overflow-x:auto;">{}</pre>
<button type="button" onclick="navigator.clipboard.writeText(document.getElementById('token').textContent)">Copier le token</button>
<p>Exemple : <code>curl -H "Authorization: Bearer &lt;token&gt;" http://localhost:8080/admin/fetch_cards</code></p>
<p>
  <form method="get" action="/admin/fetch_cards" style="display:inline">
    <button type="submit">Rafraîchir les cartes</button>
  </form>
  <form method="post" action="/admin/import" style="display:inline">
    <button type="submit">Importer les images</button>
  </form>
  <a href="/admin/login">Espace admin</a>
</p>
<form method="post" action="/admin/logout"><button type="submit">Déconnexion</button></form>
</body></html>"#,
        html_escape(sub),
        ADMIN_TOKEN_HOURS,
        html_escape(&token),
    );
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
        return HttpResponse::ServiceUnavailable()
            .body("Base de données indisponible.");
    }
    let body = r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Admin – Premier compte</title></head><body>
<h1>Créer le premier compte admin</h1>
<p>Renseignez votre email, mot de passe et la clé de setup (ADMIN_SECRET).</p>
<form method="post" action="/admin/setup">
  <label>Email <input name="email" type="email" required placeholder="admin@example.com"/></label><br/>
  <label>Mot de passe <input name="password" type="password" autocomplete="off" required/></label><br/>
  <label>Clé de setup <input name="setup_key" type="password" autocomplete="off" required/></label><br/>
  <button type="submit">Créer le compte</button>
</form>
<p><a href="/admin/login">Retour à la connexion</a></p>
</body></html>"#;
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
            .body("<p>Clé de setup incorrecte.</p><p><a href=\"/admin/setup\">Réessayer</a></p>");
    }
    let n = match count_admins(pool.get_ref()).await {
        Ok(n) => n,
        Err(_) => return HttpResponse::InternalServerError().body("Erreur base de données."),
    };
    if n > 0 {
        return HttpResponse::BadRequest()
            .content_type("text/html; charset=utf-8")
            .body("<p>Un compte admin existe déjà.</p><p><a href=\"/admin/login\">Connexion</a></p>");
    }
    let email = form.email.trim();
    if email.is_empty() {
        return HttpResponse::BadRequest()
            .body("Email requis.");
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
