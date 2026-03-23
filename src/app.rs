//! Configuration de l'application Actix (prod + tests).

use std::pin::Pin;
use std::sync::Arc;

use actix_files::Files;
use actix_session::{SessionMiddleware, storage::CookieSessionStore};
use actix_web::cookie::Key;
use actix_web::dev::Service;
use actix_web::http::StatusCode;
use actix_web::{App, HttpResponse, web};
use sqlx::PgPool;
use tera::Tera;
use utoipa_swagger_ui::SwaggerUi;

use crate::auth::{ApiDoc, api, web as auth_web};
use crate::handlers;
use crate::routes;
use crate::shared::search::cache::CardCache;
use crate::shared::utils::templates::create_template;
use crate::storage::Storage;
use utoipa::OpenApi;

/// Construit l'`App` depuis ses dépendances.
/// `admin_secret` : si présent, protège /admin via le header X-Admin-Key.
/// `session_key` : si présent, active les sessions (CookieSessionStore) et les routes /web.
/// `jwt_secret` + `api_key` : si présents, activent /api (token + profile) et Swagger.
pub fn make_app(
    cache: web::Data<CardCache>,
    tera_data: web::Data<Tera>,
    cards_path: web::Data<String>,
    pool: Option<web::Data<PgPool>>,
    storage: Option<web::Data<Arc<dyn Storage>>>,
    admin_secret: Option<String>,
    session_key: Option<Key>,
    jwt_secret: Option<web::Data<crate::auth::jwt::JwtSecret>>,
    api_key: Option<String>,
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
    let app = App::new().wrap(SessionMiddleware::new(CookieSessionStore::default(), key));
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
            .service(api::api_scope(jwt.clone(), api_key.clone()))
    } else {
        app
    };
    app.service(Files::new("/static", "static"))
        .service(handlers::index)
        .service(handlers::count)
        .service(handlers::search)
        .service(handlers::card_by_name)
        .service(handlers::validate_deck)
        .service(handlers::create_deck_handler)
        .service(handlers::list_decks_handler)
        .service(handlers::get_deck_handler)
        .service(handlers::update_deck_handler)
        .service(handlers::delete_deck_handler)
        .service(handlers::register_page)
        .service(handlers::register_submit)
        .service(handlers::login_submit)
        .service(handlers::logout_submit)
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
                .service(routes::admin_import)
                .service(routes::admin_rehydrate_storage),
        )
        .service(
            web::scope("/web")
                .service(auth_web::login_page)
                .service(auth_web::login)
                .service(auth_web::logout)
                .service(auth_web::dashboard),
        )
        .service(
            SwaggerUi::new("/swagger-ui/{_:.*}").url("/api-docs/openapi.json", ApiDoc::openapi()),
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
    let cards_path = web::Data::new(handlers::CARDS_PATH_DEFAULT.to_string());

    make_app(
        cache, tera_data, cards_path, None, None, None, None, None, None,
    )
}

/// Comme `configure_app_for_tests` mais avec admin et/ou JWT pour les tests d'intégration.
/// - `admin_secret`: si `Some(s)`, les routes `/admin` acceptent le header `X-Admin-Key: s`.
/// - `api_key`: si `Some(s)`, active `/api` (auth/token, profile) avec `s` comme secret JWT et clé pour obtenir un token.
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
    let cards_path = web::Data::new(handlers::CARDS_PATH_DEFAULT.to_string());
    let admin = admin_secret.map(String::from);
    let (jwt_data, api_key_opt) = match api_key {
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
        jwt_data,
        api_key_opt,
    )
}
