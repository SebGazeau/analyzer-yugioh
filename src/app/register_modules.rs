//! Enregistrement des routes HTTP (hors `/api` et Swagger, gérés dans `make_app`).

use std::future::Future;
use std::pin::Pin;

use actix_files::Files;
use actix_web::dev::Service;
use actix_web::http::StatusCode;
use actix_web::{HttpResponse, web};

use crate::auth::web as auth_web;
use crate::routes;

/// Routes publiques : static, catalogue, decks, auth site, images, `/admin`, `/web`.
pub fn register_core_and_admin_routes(cfg: &mut web::ServiceConfig, admin_secret: Option<String>) {
    cfg.service(Files::new("/static", "static"))
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
        .service({
            let secret = admin_secret.clone();
            web::scope("/admin")
                .wrap_fn({
                    let secret = secret.clone();
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
                .service(crate::modules::admin_sync::fetch_cards)
                .service(crate::modules::admin_sync::reload_cache_from_db)
                .service(crate::modules::admin_sync::enrich_ygorganization)
                .service(crate::modules::admin_sync::preview_card_metadata_fill)
                .service(crate::modules::admin_sync::apply_card_metadata_fill)
                .service(routes::admin_import)
                .service(routes::admin_rehydrate_storage)
        })
        .service(
            web::scope("/web")
                .service(auth_web::login_page)
                .service(auth_web::logout)
                .service(auth_web::dashboard),
        );
}
