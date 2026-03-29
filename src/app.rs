//! Configuration de l'application Actix (prod + tests).

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use std::time::Duration;

use actix_files::Files;
use actix_web::cookie::Key;
use actix_web::dev::Service;
use actix_web::http::StatusCode;
use actix_web::middleware::Compress;
use actix_web::{App, HttpResponse, web};
use sqlx::PgPool;
use tera::Tera;
use utoipa_swagger_ui::SwaggerUi;

use crate::auth::{ApiDoc, api, web as auth_web};
use crate::rate_limit::{RateLimitState, login_post_blocked_response};
use crate::routes;
use crate::session_cookies::{SessionCookieSettings, cookie_session_middleware};
use crate::shared::search::cache::CardCache;
use crate::shared::utils::templates::create_template;
use crate::storage::Storage;
use utoipa::OpenApi;

fn test_rate_limit_data() -> web::Data<RateLimitState> {
    web::Data::new(RateLimitState::permissive_for_tests())
}

/// Construit l'`App` depuis ses dépendances.
/// `admin_secret` : si présent, protège /admin via le header X-Admin-Key.
/// `session_key` : si présent, active les sessions (CookieSessionStore) et les routes /web.
/// `session_cookie_settings` : attributs `Secure` / `SameSite` / `HttpOnly` (sec-08).
/// `jwt_secret` + `api_token_issuer_secret` : si présents, activent /api (token + profile).
/// Swagger UI : si `enable_swagger_ui`, enregistre `/swagger-ui/` et `/api-docs/openapi.json`.
/// Le corps `api_key` de POST /api/auth/token doit égaler `api_token_issuer_secret` (souvent `API_ISSUER_SECRET`).
/// `rate_limit` : fenêtres fixes sur `POST` `/login`, `/register`, `/admin/login` (sec-10).
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
        .app_data(rate_limit);
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
    let app = app
        .service(Files::new("/static", "static"))
        .service(crate::modules::pages::index)
        .service(crate::modules::catalog::count)
        .service(crate::modules::catalog::search)
        .service(crate::modules::associations::associations_catalog)
        .service(crate::modules::associations::associations_qa_related)
        .service(crate::modules::catalog::card_by_name)
        .service(crate::modules::catalog::validate_deck)
        .service(crate::modules::decks::create_deck_handler)
        .service(crate::modules::decks::list_decks_handler)
        .service(crate::modules::decks::get_deck_handler)
        .service(crate::modules::decks::update_deck_handler)
        .service(crate::modules::decks::delete_deck_handler)
        .service(crate::modules::site_auth::register_page)
        .service(crate::modules::site_auth::register_submit)
        .service(crate::modules::site_auth::login_submit)
        .service(crate::modules::site_auth::logout_submit)
        .service(routes::import_image)
        .service(routes::list_images)
        .service(routes::get_image)
        .service(routes::serve_image_file)
        .service(
            web::scope("/admin")
                .wrap_fn({
                    let secret = admin_secret.clone();
                    move |req, srv| {
                        let secret = secret.clone();
                        let authorized = routes::is_admin_allowed(&req, &secret);
                        type AdminResp = Result<
                            actix_web::dev::ServiceResponse<
                                actix_web::body::EitherBody<
                                    actix_web::body::BoxBody,
                                    actix_web::body::BoxBody,
                                >,
                            >,
                            actix_web::Error,
                        >;
                        if !authorized {
                            let res = req
                                .into_response(
                                    HttpResponse::build(StatusCode::FORBIDDEN).body("Accès refusé"),
                                )
                                .map_into_right_body();
                            let f: Pin<Box<dyn Future<Output = AdminResp>>> =
                                Box::pin(async move { Ok(res) });
                            return f;
                        }
                        let fut = srv.call(req);
                        Box::pin(async move {
                            let res = fut.await?.map_into_left_body::<actix_web::body::BoxBody>();
                            Ok(res)
                        }) as Pin<Box<dyn Future<Output = AdminResp>>>
                    }
                })
                .service(routes::admin_index)
                .service(routes::admin_login_page)
                .service(routes::admin_login)
                .service(routes::admin_logout)
                .service(routes::admin_setup_page)
                .service(routes::admin_setup)
                .service(handlers::fetch_cards)
                .service(handlers::enrich_ygorganization)
                .service(handlers::preview_card_metadata_fill)
                .service(handlers::apply_card_metadata_fill)
                .service(crate::modules::admin_sync::fetch_cards)
                .service(crate::modules::admin_sync::reload_cache_from_db)
                .service(crate::modules::admin_sync::enrich_ygorganization)
                .service(routes::admin_import)
                .service(routes::admin_rehydrate_storage),
        )
        .service(
            web::scope("/web")
                .service(auth_web::login_page)
                .service(auth_web::logout)
                .service(auth_web::dashboard),
        );
    let app = if enable_swagger_ui {
        app.service(
            SwaggerUi::new("/swagger-ui/{_:.*}").url("/api-docs/openapi.json", ApiDoc::openapi()),
        )
    } else {
        app
    };
    app
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
    )
}

/// Tests sec-10 : plafond **2** `POST` site (`/login`, `/register`) par heure et par IP.
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
    )
}
