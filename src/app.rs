//! Configuration de l'application Actix (prod + tests).

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use std::time::Duration;

use actix_web::cookie::Key;
use actix_web::dev::Service;
use actix_web::middleware::Compress;
use actix_web::{App, web};
use sqlx::PgPool;
use tera::Tera;
use utoipa_swagger_ui::SwaggerUi;

use crate::auth::{ApiDoc, api};
use crate::rate_limit::{RateLimitState, login_post_blocked_response};
use crate::routes;
use crate::session_cookies::{SessionCookieSettings, cookie_session_middleware};
use crate::shared::search::cache::CardCache;
use crate::shared::utils::templates::create_template;
use crate::storage::Storage;
use utoipa::OpenApi;

mod register_modules;

fn test_rate_limit_data() -> web::Data<RateLimitState> {
    web::Data::new(RateLimitState::permissive_for_tests())
}

fn test_turnstile_config() -> web::Data<crate::auth::turnstile::TurnstileConfig> {
    web::Data::new(crate::auth::turnstile::TurnstileConfig::disabled())
}

/// Construit l'`App` depuis ses dépendances.
/// `admin_secret` : si présent, protège /admin via le header X-Admin-Key.
/// `session_key` : si présent, active les sessions (CookieSessionStore) et les routes /web.
/// `session_cookie_settings` : attributs `Secure` / `SameSite` / `HttpOnly` (sec-08).
/// `jwt_secret` + `api_token_issuer_secret` : si présents, activent /api (token + profile).
/// Swagger UI : si `enable_swagger_ui`, enregistre `/swagger-ui/` et `/api-docs/openapi.json`.
/// Le corps `api_key` de POST /api/auth/token doit égaler `api_token_issuer_secret` (souvent `API_ISSUER_SECRET`).
/// `rate_limit` : fenêtres fixes sur `POST` `/login`, `/register` (compteur dédié), `/admin/login` (sec-10).
/// `turnstile` : clés optionnelles ; si les deux sont définies, `/register` exige le jeton widget.
#[allow(clippy::too_many_arguments)]
pub fn make_app(
    cache: web::Data<CardCache>,
    tera_data: web::Data<Tera>,
    cards_path: web::Data<String>,
    pool: Option<web::Data<PgPool>>,
    storage: Option<web::Data<Arc<dyn Storage>>>,
    admin_secret: Option<String>,
    session_key: Option<Key>,
    session_cookie_settings: SessionCookieSettings,
    jwt_secret: Option<web::Data<crate::auth::jwt::JwtSecret>>,
    api_token_issuer_secret: Option<String>,
    enable_swagger_ui: bool,
    rate_limit: web::Data<RateLimitState>,
    turnstile: web::Data<crate::auth::turnstile::TurnstileConfig>,
) -> App<
    impl actix_web::dev::ServiceFactory<
        actix_web::dev::ServiceRequest,
        Config = (),
        InitError = (),
        Response = actix_web::dev::ServiceResponse,
        Error = actix_web::Error,
    >,
> {
    // Clé de session : fournie ou dérivée (pour unifier le type App).
    let key = session_key.unwrap_or_else(|| Key::from(&[0u8; 64]));
    let app = App::new()
        .wrap(Compress::default())
        .wrap_fn({
            move |req, srv| {
                type RlResp = Result<
                    actix_web::dev::ServiceResponse<actix_web::body::BoxBody>,
                    actix_web::Error,
                >;
                if let Some(lim) = req.app_data::<web::Data<RateLimitState>>() {
                    if let Some(block) = login_post_blocked_response(&req, lim) {
                        let res = req.into_response(block).map_into_boxed_body();
                        return Box::pin(async move { Ok(res) })
                            as Pin<Box<dyn Future<Output = RlResp>>>;
                    }
                }
                let fut = srv.call(req);
                Box::pin(async move {
                    let res = fut.await?.map_into_boxed_body();
                    Ok(res)
                }) as Pin<Box<dyn Future<Output = RlResp>>>
            }
        })
        .wrap(cookie_session_middleware(key, session_cookie_settings))
        .app_data(rate_limit)
        .app_data(turnstile);
    let app = app.app_data(cache).app_data(tera_data).app_data(cards_path);
    let app = if let Some(p) = pool {
        app.app_data(p)
    } else {
        app
    };
    let app = if let Some(s) = storage {
        app.app_data(s)
    } else {
        app
    };
    let app = app.app_data(web::Data::new(routes::AdminSecret(admin_secret.clone())));
    let app = if let Some(ref jwt) = jwt_secret {
        app.app_data(jwt.clone())
            .service(api::api_scope(jwt.clone(), api_token_issuer_secret.clone()))
    } else {
        app
    };
    let app = app.configure({
        let admin = admin_secret.clone();
        move |c| register_modules::register_core_and_admin_routes(c, admin)
    });
    if enable_swagger_ui {
        app.service(
            SwaggerUi::new("/swagger-ui/{_:.*}").url("/api-docs/openapi.json", ApiDoc::openapi()),
        )
    } else {
        app
    }
}

/// Comme [`configure_app_for_tests`] mais avec la politique cookies **production**
/// (`Secure` + `SameSite=Strict`) pour vérifier les en-têtes `Set-Cookie` (sec-08).
pub fn configure_app_for_tests_production_cookies() -> App<
    impl actix_web::dev::ServiceFactory<
        actix_web::dev::ServiceRequest,
        Config = (),
        InitError = (),
        Response = actix_web::dev::ServiceResponse,
        Error = actix_web::Error,
    >,
> {
    let cache = web::Data::new(CardCache::empty());
    let tera = create_template().expect("templates must load for tests");
    let tera_data = web::Data::new(tera);
    let cards_path = web::Data::new(crate::modules::CARDS_PATH_DEFAULT.to_string());

    make_app(
        cache,
        tera_data,
        cards_path,
        None,
        None,
        None,
        None,
        SessionCookieSettings::for_production(),
        None,
        None,
        true,
        test_rate_limit_data(),
        test_turnstile_config(),
    )
}

/// Configure l'application pour les tests (cache vide, chemin par défaut).
pub fn configure_app_for_tests() -> App<
    impl actix_web::dev::ServiceFactory<
        actix_web::dev::ServiceRequest,
        Config = (),
        InitError = (),
        Response = actix_web::dev::ServiceResponse,
        Error = actix_web::Error,
    >,
> {
    let cache = web::Data::new(CardCache::empty());
    let tera = create_template().expect("templates must load for tests");
    let tera_data = web::Data::new(tera);
    let cards_path = web::Data::new(crate::modules::CARDS_PATH_DEFAULT.to_string());

    make_app(
        cache,
        tera_data,
        cards_path,
        None,
        None,
        None,
        None,
        SessionCookieSettings::for_local_development(),
        None,
        None,
        true,
        test_rate_limit_data(),
        test_turnstile_config(),
    )
}

/// Tests sec-10 : plafond **2** `POST` `/login` par heure et par IP (`/register` reste large ici).
pub fn configure_app_for_tests_rate_limit_strict_site() -> App<
    impl actix_web::dev::ServiceFactory<
        actix_web::dev::ServiceRequest,
        Config = (),
        InitError = (),
        Response = actix_web::dev::ServiceResponse,
        Error = actix_web::Error,
    >,
> {
    let cache = web::Data::new(CardCache::empty());
    let tera = create_template().expect("templates must load for tests");
    let tera_data = web::Data::new(tera);
    let cards_path = web::Data::new(crate::modules::CARDS_PATH_DEFAULT.to_string());
    let rl = web::Data::new(RateLimitState::new(
        Duration::from_secs(3600),
        2,
        Duration::from_secs(3600),
        10_000,
        Duration::from_secs(3600),
        10_000,
        Duration::from_secs(3600),
        10_000,
        Duration::from_secs(3600),
        10_000,
        Duration::from_secs(3600),
        10_000,
        Duration::from_secs(3600),
        10_000,
        Duration::from_secs(3600),
        10_000,
    ));
    make_app(
        cache,
        tera_data,
        cards_path,
        None,
        None,
        None,
        None,
        SessionCookieSettings::for_local_development(),
        None,
        None,
        true,
        rl,
        test_turnstile_config(),
    )
}

/// Tests sans Swagger UI (sec-05).
pub fn configure_app_for_tests_without_swagger() -> App<
    impl actix_web::dev::ServiceFactory<
        actix_web::dev::ServiceRequest,
        Config = (),
        InitError = (),
        Response = actix_web::dev::ServiceResponse,
        Error = actix_web::Error,
    >,
> {
    let cache = web::Data::new(CardCache::empty());
    let tera = create_template().expect("templates must load for tests");
    let tera_data = web::Data::new(tera);
    let cards_path = web::Data::new(crate::modules::CARDS_PATH_DEFAULT.to_string());

    make_app(
        cache,
        tera_data,
        cards_path,
        None,
        None,
        None,
        None,
        SessionCookieSettings::for_local_development(),
        None,
        None,
        false,
        test_rate_limit_data(),
        test_turnstile_config(),
    )
}

/// JWT de signature et clé d’échange token **distincts** (tests sec-03).
pub fn configure_app_for_tests_with_api_keys(
    admin_secret: Option<&str>,
    jwt_signing_secret: &str,
    api_token_issuer_secret: &str,
) -> App<
    impl actix_web::dev::ServiceFactory<
        actix_web::dev::ServiceRequest,
        Config = (),
        InitError = (),
        Response = actix_web::dev::ServiceResponse,
        Error = actix_web::Error,
    >,
> {
    let cache = web::Data::new(CardCache::empty());
    let tera = create_template().expect("templates must load for tests");
    let tera_data = web::Data::new(tera);
    let cards_path = web::Data::new(crate::modules::CARDS_PATH_DEFAULT.to_string());
    let admin = admin_secret.map(String::from);
    let jwt_data = Some(web::Data::new(crate::auth::jwt::JwtSecret(
        jwt_signing_secret.as_bytes().to_vec(),
    )));
    let issuer = Some(api_token_issuer_secret.to_string());
    make_app(
        cache,
        tera_data,
        cards_path,
        None,
        None,
        admin,
        None,
        SessionCookieSettings::for_local_development(),
        jwt_data,
        issuer,
        true,
        test_rate_limit_data(),
        test_turnstile_config(),
    )
}

/// Comme `configure_app_for_tests` mais avec admin et/ou JWT pour les tests d'intégration.
/// - `admin_secret`: si `Some(s)`, les routes `/admin` acceptent le header `X-Admin-Key: s`.
/// - `api_key`: si `Some(s)`, active `/api` avec `s` à la fois comme secret de signature JWT et comme clé POST /api/auth/token.
pub fn configure_app_for_tests_with_auth(
    admin_secret: Option<&str>,
    api_key: Option<&str>,
) -> App<
    impl actix_web::dev::ServiceFactory<
        actix_web::dev::ServiceRequest,
        Config = (),
        InitError = (),
        Response = actix_web::dev::ServiceResponse,
        Error = actix_web::Error,
    >,
> {
    let cache = web::Data::new(CardCache::empty());
    let tera = create_template().expect("templates must load for tests");
    let tera_data = web::Data::new(tera);
    let cards_path = web::Data::new(crate::modules::CARDS_PATH_DEFAULT.to_string());
    let admin = admin_secret.map(String::from);
    let (jwt_data, api_token_issuer) = match api_key {
        Some(k) => (
            Some(web::Data::new(crate::auth::jwt::JwtSecret(
                k.as_bytes().to_vec(),
            ))),
            Some(k.to_string()),
        ),
        None => (None, None),
    };
    make_app(
        cache,
        tera_data,
        cards_path,
        None,
        None,
        admin,
        None,
        SessionCookieSettings::for_local_development(),
        jwt_data,
        api_token_issuer,
        true,
        test_rate_limit_data(),
        test_turnstile_config(),
    )
}
