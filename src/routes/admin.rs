//! Routes admin : authentification par session (login/logout), JWT admin, ou clé header **`X-Admin-Key`** uniquement.
//! En cas de refus : 403 Forbidden. La session permet d'identifier un admin connecté sans repasser la clé.

use std::sync::Arc;

use actix_session::Session;
use actix_session::SessionExt;
use actix_web::dev::ServiceRequest;
use actix_web::http::header;
use actix_web::{HttpRequest, HttpResponse, get, post, web};
use serde::Deserialize;
use sqlx::PgPool;

use crate::auth::admin_db::{
    count_admins, create_admin, get_admin_by_email, hash_password, verify_password,
};
use crate::auth::jwt::{create_token, decode_token};
use crate::images::{ImageImporter, RehydrateStats};
use crate::storage::Storage;

const ADMIN_JWT_ROLE: &str = "admin";
const ADMIN_TOKEN_HOURS: i64 = 24;

/// Styles communs pour les blocs d’aide sous les actions admin (HTML embarqué).
const ADMIN_DASHBOARD_STYLE: &str = r#"<style>
  .admin-help { color: #333; max-width: 48rem; line-height: 1.5; font-size: 0.95rem; margin: 0.25rem 0 0.6rem; }
  .admin-section { margin-bottom: 1.35rem; border-left: 3px solid #c8c8c8; padding-left: 0.75rem; }
  .admin-section h2 { font-size: 1.05rem; margin: 0 0 0.35rem; }
  .btn-row { margin-top: 0.35rem; display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
  .admin-actions-title { font-size: 1.1rem; margin: 0 0 0.75rem; }
</style>"#;

/// Actions admin : textes d’aide + formulaires (partagé page connectée et page token).
const ADMIN_DASHBOARD_ACTIONS_HTML: &str = r#"<h2 class="admin-actions-title">Actions</h2>

<section class="admin-section">
  <h2>Catalogue YGOProDeck</h2>
  <p class="admin-help">Interroge l’API publique YGOProDeck, met à jour les tables <code>cards</code> et <code>card_sets</code>, peut écrire le fichier <code>cards.json</code> selon la config, puis recharge le cache utilisé par la recherche. À lancer sur une base vide ou après de nouvelles sorties de cartes.</p>
  <p class="btn-row">
    <form method="get" action="/admin/fetch_cards" style="display:inline"><button type="submit">Rafraîchir les cartes</button></form>
  </p>
</section>

<section class="admin-section">
  <h2>Enrichissement YGOrganization (YGResources)</h2>
  <p class="admin-help">Enrichit la base avec des données YGOrg (effets EN, JSON cartes, etc.). <strong>Ordre conseillé la première fois</strong> : sync index → init révision → backfill (répéter si besoin) → manifest. Ensuite, <strong>sync Q&amp;A</strong> de temps en temps pour le module « cartes associées ».</p>
  <ul class="admin-help" style="margin: 0 0 0.5rem 1.1rem; padding: 0;">
    <li><strong>Sync index EN</strong> : télécharge l’index des noms anglais (volumineux, à faire rarement).</li>
    <li><strong>Init révision</strong> : enregistre la révision YGOrg de référence pour les manifests suivants.</li>
    <li><strong>Backfill</strong> : associe les passcodes de <code>cards</code> aux IDs YGOrg via l’index.</li>
    <li><strong>Manifest</strong> : télécharge le JSON brut des cartes (couche <code>card_raw</code>).</li>
    <li><strong>Sync Q&amp;A</strong> : importe des Q&amp;A récents (liens entre cartes pour l’UI associations).</li>
  </ul>
  <p class="btn-row">
    <form method="get" action="/admin/enrich_ygorganization" style="display:inline"><input type="hidden" name="mode" value="sync_index"/><button type="submit">YGOrg — sync index EN (lourd)</button></form>
    <form method="get" action="/admin/enrich_ygorganization" style="display:inline"><input type="hidden" name="mode" value="init"/><button type="submit">YGOrg — init révision</button></form>
    <form method="get" action="/admin/enrich_ygorganization" style="display:inline"><input type="hidden" name="mode" value="backfill"/><input type="hidden" name="max" value="30"/><button type="submit">YGOrg — backfill (30)</button></form>
    <form method="get" action="/admin/enrich_ygorganization" style="display:inline"><input type="hidden" name="mode" value="manifest"/><input type="hidden" name="max" value="50"/><button type="submit">YGOrg — manifest (50)</button></form>
    <form method="get" action="/admin/enrich_ygorganization" style="display:inline"><input type="hidden" name="mode" value="sync_qa"/><input type="hidden" name="max" value="150"/><button type="submit">YGOrg — sync Q&amp;A (150)</button></form>
  </p>
</section>

<section class="admin-section">
  <h2>Complément archétype (YGOrg)</h2>
  <p class="admin-help">Cible : cartes sans archétype YGOProDeck mais avec couche <code>card_raw</code>. <strong>Liste CSV</strong> (<code>preview_card_metadata_fill</code>) sans analyse JSON. <strong>Phases 2–3</strong> (<code>apply_card_metadata_fill</code>) : dérive depuis le JSON (monstre : <code>\"…\" monster</code> ; sort/piège : <code>add 1 \"…\" card</code> sur la 1re ligne ; ou champ futur <code>cardData.en.archetype</code>). Avec <code>write=1</code> : <code>cards.archetype</code> + <code>archetype_source</code> (NULL-only), recharge du cache. Sinon simulation.</p>
  <p class="btn-row">
    <form method="get" action="/admin/preview_card_metadata_fill" style="display:inline"><input type="hidden" name="max" value="500"/><button type="submit">Liste CSV candidats (500)</button></form>
    <form method="get" action="/admin/apply_card_metadata_fill" style="display:inline"><input type="hidden" name="max" value="300"/><button type="submit">Simuler dérivation (300)</button></form>
    <form method="get" action="/admin/apply_card_metadata_fill" style="display:inline" onsubmit="return confirm('Écrire archetype + archetype_source en base et recharger le cache ?');"><input type="hidden" name="max" value="300"/><input type="hidden" name="write" value="1"/><button type="submit">Appliquer dérivation (300)</button></form>
  </p>
</section>

<section class="admin-section">
  <h2>Images illustrées</h2>
  <p class="admin-help">Parcourt les URLs d’images référencées en base, télécharge et produit les variantes WebP. Les images déjà importées sont en principe ignorées (pas de re-traitement inutile).</p>
  <p class="btn-row">
    <form method="post" action="/admin/import" style="display:inline"><button type="submit">Importer les images</button></form>
  </p>
</section>

<section class="admin-section">
  <h2>Fichiers de stockage</h2>
  <p class="admin-help">Pour chaque enregistrement <code>images</code>, retélécharge depuis l’URL source et écrit les fichiers aux chemins déjà en base (ex. dossier vide après déploiement ou changement de stockage). <strong>Forcer</strong> réécrit même si le fichier existe déjà.</p>
  <p class="btn-row">
    <form method="post" action="/admin/rehydrate_storage" style="display:inline"><button type="submit">Remplir le stockage (URLs → fichiers)</button></form>
    <form method="post" action="/admin/rehydrate_storage?force=true" style="display:inline"><button type="submit">Remplir le stockage (forcer réécriture)</button></form>
  </p>
</section>"#;

/// Secret admin (injecté en app_data pour le handler de login).
#[derive(Clone)]
pub struct AdminSecret(pub Option<String>);

/// Extrait la valeur de **`X-Admin-Key`** (trim, non vide). Aucune lecture du query string (sec-04).
pub fn x_admin_key_from_headers(headers: &header::HeaderMap) -> Option<String> {
    headers
        .get("x-admin-key")
        .and_then(|v| v.to_str().ok())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from)
}

/// Extrait la clé admin depuis le header `X-Admin-Key` ([`ServiceRequest`]).
pub fn admin_key_from_request(req: &ServiceRequest) -> Option<String> {
    x_admin_key_from_headers(req.headers())
}

/// Extrait la clé admin depuis le header `X-Admin-Key` ([`HttpRequest`]).
pub fn admin_key_from_http(req: &HttpRequest) -> Option<String> {
    x_admin_key_from_headers(req.headers())
}

/// Comme [`is_admin_authorized`] pour une requête handler ([`HttpRequest`]).
pub fn is_admin_authorized_http(req: &HttpRequest, secret: &Option<String>) -> bool {
    match secret {
        None => true,
        Some(s) => admin_key_from_http(req)
            .as_deref()
            .map(|k| k == s.as_str())
            .unwrap_or(false),
    }
}

/// Bearer depuis [`HttpRequest`].
pub fn bearer_token_from_http(req: &HttpRequest) -> Option<String> {
    req.headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer ").map(str::trim))
        .filter(|s| !s.is_empty())
        .map(String::from)
}

/// Routes hors `/admin` qui exigent un contrôle équivalent : clé, JWT admin, ou session admin.
pub fn is_privileged_admin_request(
    req: &HttpRequest,
    session: &Session,
    secret: &Option<String>,
) -> bool {
    if is_admin_authorized_http(req, secret) {
        return true;
    }
    if let Some(s) = secret {
        if let Some(token) = bearer_token_from_http(req) {
            if decode_token(s.as_bytes(), &token)
                .map(|c| c.role == ADMIN_JWT_ROLE)
                .unwrap_or(false)
            {
                return true;
            }
        }
    }
    session
        .get::<bool>("admin_authenticated")
        .ok()
        .flatten()
        .unwrap_or(false)
}

/// Retourne true si l'accès admin est autorisé (pas de secret configuré, ou clé valide en header `X-Admin-Key`).
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
        let body = format!(
            r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Admin</title>{style}</head><body>
<h1>Espace admin</h1>
<p>Connecté en tant qu'admin.</p>
{actions}
<p>
  <form method="get" action="/admin/fetch_cards" style="display:inline">
    <button type="submit">Rafraîchir les cartes</button>
  </form>
  <form method="get" action="/admin/reload_cache_from_db" style="display:inline">
    <button type="submit">Recharger le cache (Postgres)</button>
  </form>
  <form method="get" action="/admin/enrich_ygorganization" style="display:inline">
    <input type="hidden" name="mode" value="sync_index"/>
    <button type="submit">YGOrg — sync index EN (lourd)</button>
  </form>
  <form method="get" action="/admin/enrich_ygorganization" style="display:inline">
    <input type="hidden" name="mode" value="init"/>
    <button type="submit">YGOrg — init révision</button>
  </form>
  <form method="get" action="/admin/enrich_ygorganization" style="display:inline">
    <input type="hidden" name="mode" value="backfill"/>
    <input type="hidden" name="max" value="30"/>
    <button type="submit">YGOrg — backfill (30)</button>
  </form>
  <form method="get" action="/admin/enrich_ygorganization" style="display:inline">
    <input type="hidden" name="mode" value="manifest"/>
    <input type="hidden" name="max" value="50"/>
    <button type="submit">YGOrg — manifest (50)</button>
  </form>
  <form method="get" action="/admin/enrich_ygorganization" style="display:inline">
    <input type="hidden" name="mode" value="sync_qa"/>
    <input type="hidden" name="max" value="150"/>
    <button type="submit">YGOrg — sync Q&amp;A (150)</button>
  </form>
  <form method="post" action="/admin/import" style="display:inline">
    <button type="submit">Importer les images</button>
  </form>
  <form method="post" action="/admin/rehydrate_storage" style="display:inline">
    <button type="submit">Remplir le stockage (URLs → fichiers)</button>
  </form>
  <form method="post" action="/admin/rehydrate_storage?force=true" style="display:inline">
    <button type="submit">Idem (forcer réécriture)</button>
  </form>
</p>
<p><small>Rafraîchir : API → DB + cache. Recharger cache : relit <code>cards</code> en base (ex. après un job <code>sync-cards</code> sans redémarrage). Importer : nouvelles URLs seulement. Remplir stockage : pour chaque ligne <code>images</code>, retélécharge et écrit aux chemins déjà en base (ex. après passage en GCS).</small></p>
<form method="post" action="/admin/logout"><button type="submit">Déconnexion</button></form>
</body></html>"#,
            style = ADMIN_DASHBOARD_STYLE,
            actions = ADMIN_DASHBOARD_ACTIONS_HTML,
        );
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
<p><small>Après connexion, vous accédez aux actions (catalogue YGOProDeck, enrichissement YGOrganization, images, stockage) avec une explication pour chaque bloc.</small></p>
</body></html>"#
    } else {
        r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Admin</title></head><body>
<h1>Admin</h1>
<p>Base de données requise pour la connexion email/mot de passe.</p>
<p>Si vous disposez d’une <strong>clé admin</strong> (<code>X-Admin-Key</code> ou équivalent), vous pouvez tout de même <a href="/admin/fetch_cards">rafraîchir le catalogue YGOProDeck</a> : cela met à jour <code>cards</code> / <code>card_sets</code> et le cache recherche (voir la doc des autres actions une fois la base disponible).</p>
<p><a href="/admin/fetch_cards">Rafraîchir les cartes</a> (si accès par clé) · <a href="/admin/reload_cache_from_db">Recharger le cache (Postgres)</a></p>
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
<html><head><meta charset="utf-8"><title>Admin – Token</title>{style}</head><body>
<h1>Connexion réussie</h1>
<p>Identité : <strong>{sub}</strong></p>
<p>Token JWT (valide {hours} h) — à utiliser en en-tête <code>Authorization: Bearer …</code> sur les routes <code>/admin/*</code> (ou <code>X-Admin-Key</code> si votre déploiement l’utilise à la place).</p>
<pre id="token" style="background:#f0f0f0;padding:0.5em;overflow-x:auto;">{token}</pre>
<button type="button" onclick="navigator.clipboard.writeText(document.getElementById('token').textContent)">Copier le token</button>
<p class="admin-help"><strong>Exemples curl</strong> — catalogue : <code>curl -H "Authorization: Bearer &lt;token&gt;" http://localhost:8080/admin/fetch_cards</code> · liste candidats archétype : <code>curl -H "Authorization: Bearer &lt;token&gt;" "http://localhost:8080/admin/preview_card_metadata_fill?max=500"</code> · simuler dérivation : <code>curl -H "Authorization: Bearer &lt;token&gt;" "http://localhost:8080/admin/apply_card_metadata_fill?max=200"</code> · <strong>écrire</strong> archétypes dérivés : <code>curl -H "Authorization: Bearer &lt;token&gt;" "http://localhost:8080/admin/apply_card_metadata_fill?max=200&amp;write=1"</code> · YGOrg Q&amp;A : <code>curl -H "Authorization: Bearer &lt;token&gt;" "http://localhost:8080/admin/enrich_ygorganization?mode=sync_qa&amp;max=150"</code></p>
<hr style="margin:1.25rem 0;border:none;border-top:1px solid #ddd"/>
{actions}
<p><a href="/admin/login">Retour espace admin</a></p>
<p>Exemple : <code>curl -H "Authorization: Bearer &lt;token&gt;" http://localhost:8080/admin/fetch_cards</code></p>
<p>YGOrganization : 1) <code>sync_index</code>, 2) <code>init</code>, 3) <code>backfill</code>, 4) <code>manifest</code>, 5) optionnel <code>sync_qa&amp;max=150</code> (Q&amp;A récents → associations). Ex. <code>curl …/enrich_ygorganization?mode=sync_qa&amp;max=150</code></p>
<p>
  <form method="get" action="/admin/fetch_cards" style="display:inline">
    <button type="submit">Rafraîchir les cartes</button>
  </form>
  <form method="get" action="/admin/reload_cache_from_db" style="display:inline">
    <button type="submit">Recharger le cache (Postgres)</button>
  </form>
  <form method="get" action="/admin/enrich_ygorganization" style="display:inline">
    <input type="hidden" name="mode" value="sync_index"/>
    <button type="submit">YGOrg — sync index EN (lourd)</button>
  </form>
  <form method="get" action="/admin/enrich_ygorganization" style="display:inline">
    <input type="hidden" name="mode" value="init"/>
    <button type="submit">YGOrg — init révision</button>
  </form>
  <form method="get" action="/admin/enrich_ygorganization" style="display:inline">
    <input type="hidden" name="mode" value="backfill"/>
    <input type="hidden" name="max" value="30"/>
    <button type="submit">YGOrg — backfill (30)</button>
  </form>
  <form method="get" action="/admin/enrich_ygorganization" style="display:inline">
    <input type="hidden" name="mode" value="manifest"/>
    <input type="hidden" name="max" value="50"/>
    <button type="submit">YGOrg — manifest (50)</button>
  </form>
  <form method="get" action="/admin/enrich_ygorganization" style="display:inline">
    <input type="hidden" name="mode" value="sync_qa"/>
    <input type="hidden" name="max" value="150"/>
    <button type="submit">YGOrg — sync Q&amp;A (150)</button>
  </form>
  <form method="post" action="/admin/import" style="display:inline">
    <button type="submit">Importer les images</button>
  </form>
  <form method="post" action="/admin/rehydrate_storage" style="display:inline">
    <button type="submit">Remplir le stockage</button>
  </form>
  <a href="/admin/login">Espace admin</a>
</p>
<form method="post" action="/admin/logout"><button type="submit">Déconnexion</button></form>
</body></html>"#,
        style = ADMIN_DASHBOARD_STYLE,
        sub = html_escape(sub),
        hours = ADMIN_TOKEN_HOURS,
        token = html_escape(&token),
        actions = ADMIN_DASHBOARD_ACTIONS_HTML,
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
        return HttpResponse::ServiceUnavailable().body("Base de données indisponible.");
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
            .body(
                "<p>Un compte admin existe déjà.</p><p><a href=\"/admin/login\">Connexion</a></p>",
            );
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

#[cfg(test)]
mod admin_key_tests {
    use super::x_admin_key_from_headers;
    use actix_web::http::header::{HeaderMap, HeaderValue};

    fn header_map_with(key: &str) -> HeaderMap {
        let mut h = HeaderMap::new();
        h.insert(
            actix_web::http::header::HeaderName::from_static("x-admin-key"),
            HeaderValue::from_str(key).unwrap(),
        );
        h
    }

    #[test]
    fn x_admin_key_reads_header() {
        let h = header_map_with("my-secret");
        assert_eq!(x_admin_key_from_headers(&h).as_deref(), Some("my-secret"));
    }

    #[test]
    fn x_admin_key_trims_value() {
        let h = header_map_with("  abc  ");
        assert_eq!(x_admin_key_from_headers(&h).as_deref(), Some("abc"));
    }

    #[test]
    fn x_admin_key_missing_returns_none() {
        let h = HeaderMap::new();
        assert!(x_admin_key_from_headers(&h).is_none());
    }

    #[test]
    fn x_admin_key_whitespace_only_returns_none() {
        let h = header_map_with("   ");
        assert!(x_admin_key_from_headers(&h).is_none());
    }
}
