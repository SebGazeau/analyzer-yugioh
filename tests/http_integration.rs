//! Tests d'intégration HTTP pour les routes.

use actix_web::dev::ServiceResponse;
use actix_web::http::header::HeaderMap;
use actix_web::http::header::SET_COOKIE;
use actix_web::test;
use uuid::Uuid;

use std::net::SocketAddr;

use analyzer_yugioh::{
    configure_app_for_tests, configure_app_for_tests_production_cookies,
    configure_app_for_tests_rate_limit_strict_site, configure_app_for_tests_with_api_keys,
    configure_app_for_tests_with_auth, configure_app_for_tests_without_swagger,
};

fn id_session_set_cookie(headers: &HeaderMap) -> Option<String> {
    for v in headers.get_all(SET_COOKIE) {
        if let Ok(s) = v.to_str() {
            if s.starts_with("id=") {
                return Some(s.to_owned());
            }
        }
    }
    None
}

fn cookie_has_flag(set_cookie: &str, flag: &str) -> bool {
    set_cookie
        .split(';')
        .any(|p| p.trim().eq_ignore_ascii_case(flag))
}

fn cookie_samesite_is(set_cookie: &str, expected: &str) -> bool {
    let want = format!("samesite={}", expected.to_ascii_lowercase());
    set_cookie.split(';').any(|p| {
        let t = p.trim().to_ascii_lowercase();
        t == want
    })
}

fn cookie_header_for_next_request(resp: &ServiceResponse) -> String {
    let mut parts = Vec::new();
    for v in resp.headers().get_all(SET_COOKIE) {
        if let Ok(s) = v.to_str() {
            if let Some(nv) = s.split(';').next() {
                parts.push(nv.trim().to_string());
            }
        }
    }
    parts.join("; ")
}

fn extract_csrf_hidden_value(html: &str) -> Option<String> {
    let idx = html.find("name=\"csrf_token\"")?;
    let end_window = (idx + 500).min(html.len());
    let window = &html[idx..end_window];
    let vi = window.find("value=\"")?;
    let start = vi + 7;
    let rest = &window[start..];
    let end = rest.find('"')?;
    Some(rest[..end].to_string())
}

#[actix_web::test]
async fn test_index_returns_200() {
    let app = test::init_service(configure_app_for_tests()).await;

    let req = test::TestRequest::get().uri("/").to_request();
    let resp = test::call_service(&app, req).await;

    assert!(resp.status().is_success(), "GET / doit répondre 200 OK");
    let body = test::read_body(resp).await;
    let body_str = String::from_utf8_lossy(&body);
    assert!(body_str.contains("<!DOCTYPE html") || body_str.contains("<html"));
}

#[actix_web::test]
async fn test_openapi_json_when_swagger_enabled() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req = test::TestRequest::get()
        .uri("/api-docs/openapi.json")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(
        resp.status().is_success(),
        "OpenAPI doit être servi quand Swagger est activé"
    );
}

#[actix_web::test]
async fn test_swagger_routes_absent_when_disabled() {
    let app = test::init_service(configure_app_for_tests_without_swagger()).await;
    for uri in ["/api-docs/openapi.json", "/swagger-ui/index.html"] {
        let req = test::TestRequest::get().uri(uri).to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(
            resp.status().as_u16(),
            404,
            "sans Swagger, {} doit répondre 404",
            uri
        );
    }
}

#[actix_web::test]
async fn test_search_short_query_returns_400() {
    let app = test::init_service(configure_app_for_tests()).await;

    let req = test::TestRequest::get().uri("/search?q=abc").to_request();
    let resp = test::call_service(&app, req).await;

    assert_eq!(
        resp.status().as_u16(),
        400,
        "Requête < 4 caractères doit répondre 400"
    );
}

#[actix_web::test]
async fn test_search_valid_query_returns_200() {
    let app = test::init_service(configure_app_for_tests()).await;

    let req = test::TestRequest::get().uri("/search?q=test").to_request();
    let resp = test::call_service(&app, req).await;

    assert!(
        resp.status().is_success(),
        "Requête valide doit répondre 200"
    );
    let body: Vec<serde_json::Value> = test::read_body_json(resp).await;
    assert!(body.is_empty(), "Cache vide => tableau vide");
}

#[actix_web::test]
async fn test_count_returns_0_with_empty_cache() {
    let app = test::init_service(configure_app_for_tests()).await;

    let req = test::TestRequest::get().uri("/count").to_request();
    let resp = test::call_service(&app, req).await;

    assert!(resp.status().is_success());
    let body = test::read_body(resp).await;
    assert_eq!(body.as_ref(), b"0");
}

#[actix_web::test]
async fn test_card_by_name_empty_returns_400() {
    let app = test::init_service(configure_app_for_tests()).await;

    let req = test::TestRequest::get().uri("/card?name=").to_request();
    let resp = test::call_service(&app, req).await;

    assert_eq!(resp.status().as_u16(), 400);
}

#[actix_web::test]
async fn test_card_by_name_not_found_returns_null() {
    let app = test::init_service(configure_app_for_tests()).await;

    let req = test::TestRequest::get()
        .uri("/card?name=CarteInexistante123")
        .to_request();
    let resp = test::call_service(&app, req).await;

    assert!(resp.status().is_success());
    let body: serde_json::Value = test::read_body_json(resp).await;
    assert!(body.is_null());
}

#[actix_web::test]
async fn test_validate_deck_valid_returns_200() {
    let app = test::init_service(configure_app_for_tests()).await;

    let main: Vec<serde_json::Value> = (1..=40)
        .map(|i| serde_json::json!({ "name": format!("Carte {}", i), "quantity": 1 }))
        .collect();
    let deck = serde_json::json!({ "main": main, "extra": [], "side": [] });

    let req = test::TestRequest::post()
        .uri("/validate_deck")
        .set_json(&deck)
        .to_request();
    let resp = test::call_service(&app, req).await;

    assert!(
        resp.status().is_success(),
        "Deck valide (40 main) doit retourner 200"
    );
    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["valid"], true);
    assert_eq!(body["main_count"], 40);
}

#[actix_web::test]
async fn test_validate_deck_too_few_returns_400() {
    let app = test::init_service(configure_app_for_tests()).await;

    let main: Vec<serde_json::Value> = (1..=39)
        .map(|i| serde_json::json!({ "name": format!("Carte {}", i), "quantity": 1 }))
        .collect();
    let deck = serde_json::json!({ "main": main, "extra": [], "side": [] });

    let req = test::TestRequest::post()
        .uri("/validate_deck")
        .set_json(&deck)
        .to_request();
    let resp = test::call_service(&app, req).await;

    assert_eq!(resp.status().as_u16(), 400);
    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["valid"], false);
    let errors = body["errors"].as_array().unwrap();
    assert!(!errors.is_empty());
}

#[actix_web::test]
async fn test_validate_deck_same_passcode_two_names_returns_400() {
    let app = test::init_service(configure_app_for_tests()).await;

    let mut main: Vec<serde_json::Value> = (3..=40)
        .map(|i| serde_json::json!({ "name": format!("Carte {}", i), "quantity": 1 }))
        .collect();
    main.push(serde_json::json!({ "name": "Variant A", "id": 999001_u64, "quantity": 2 }));
    main.push(serde_json::json!({ "name": "Variant B", "id": 999001_u64, "quantity": 2 }));
    let deck = serde_json::json!({ "main": main, "extra": [], "side": [] });

    let req = test::TestRequest::post()
        .uri("/validate_deck")
        .set_json(&deck)
        .to_request();
    let resp = test::call_service(&app, req).await;

    assert_eq!(resp.status().as_u16(), 400);
    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["valid"], false);
    let errs = body["errors"].as_array().unwrap();
    assert!(
        errs.iter()
            .any(|e| e.as_str().is_some_and(|s| s.contains("passcode 999001"))),
        "erreur attendue pour agrégation par passcode: {:?}",
        errs
    );
}

// --- Web (session) — sec-11 : plus de POST /web/login factice ---

#[actix_web::test]
async fn test_web_login_get_redirects_to_index() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req = test::TestRequest::get().uri("/web/login").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 303);
    let loc = resp.headers().get("location").and_then(|v| v.to_str().ok());
    assert_eq!(loc, Some("/"));
}

#[actix_web::test]
async fn test_web_login_post_no_longer_exists_returns_404() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req = test::TestRequest::post()
        .uri("/web/login")
        .set_form(&[("user_id", "attacker"), ("csrf_token", "ignored")])
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(
        resp.status().as_u16(),
        404,
        "impossible d’établir une session via user_id arbitraire (sec-11)"
    );
}

#[actix_web::test]
async fn test_web_dashboard_without_session_redirects_to_index() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req = test::TestRequest::get().uri("/web/dashboard").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 303);
    let loc = resp.headers().get("location").and_then(|v| v.to_str().ok());
    assert_eq!(loc, Some("/"));
}

/// Attributs du cookie de session après `GET /` (CSRF sync) — sec-08.
#[actix_web::test]
async fn test_index_get_session_cookie_dev_httponly_lax_without_secure() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req_get = test::TestRequest::get().uri("/").to_request();
    let resp_get = test::call_service(&app, req_get).await;
    assert!(resp_get.status().is_success());
    let line = id_session_set_cookie(resp_get.headers()).expect("Set-Cookie pour id après GET /");
    assert!(
        cookie_has_flag(&line, "HttpOnly"),
        "HttpOnly attendu (sec-08), cookie: {line}"
    );
    assert!(
        cookie_samesite_is(&line, "lax"),
        "SameSite=Lax hors prod, cookie: {line}"
    );
    assert!(
        !cookie_has_flag(&line, "Secure"),
        "Sans Secure en dev HTTP, cookie: {line}"
    );
}

#[actix_web::test]
async fn test_index_get_session_cookie_prod_secure_httponly_strict() {
    let app = test::init_service(configure_app_for_tests_production_cookies()).await;
    let req_get = test::TestRequest::get().uri("/").to_request();
    let resp_get = test::call_service(&app, req_get).await;
    assert!(resp_get.status().is_success());
    let line = id_session_set_cookie(resp_get.headers()).expect("Set-Cookie pour id après GET /");
    assert!(cookie_has_flag(&line, "HttpOnly"));
    assert!(
        cookie_samesite_is(&line, "strict"),
        "SameSite=Strict en prod, cookie: {line}"
    );
    assert!(cookie_has_flag(&line, "Secure"));
}

// --- Admin (X-Admin-Key) ---

#[actix_web::test]
async fn test_admin_import_without_key_returns_403() {
    let app = test::init_service(configure_app_for_tests_with_auth(Some("secret-key"), None)).await;
    let req = test::TestRequest::post().uri("/admin/import").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 403);
}

#[actix_web::test]
async fn test_preview_card_metadata_fill_without_key_returns_403() {
    let app = test::init_service(configure_app_for_tests_with_auth(Some("secret-key"), None)).await;
    let req = test::TestRequest::get()
        .uri("/admin/preview_card_metadata_fill")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 403);
}

#[actix_web::test]
async fn test_apply_card_metadata_fill_without_key_returns_403() {
    let app = test::init_service(configure_app_for_tests_with_auth(Some("secret-key"), None)).await;
    let req = test::TestRequest::get()
        .uri("/admin/apply_card_metadata_fill?max=10")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 403);
}

#[actix_web::test]
async fn test_preview_card_metadata_fill_with_admin_key_no_pool_returns_503() {
    let app = test::init_service(configure_app_for_tests_with_auth(
        Some(TEST_ADMIN_KEY_32),
        None,
    ))
    .await;
    let req = test::TestRequest::get()
        .uri("/admin/preview_card_metadata_fill?max=10")
        .insert_header(("x-admin-key", TEST_ADMIN_KEY_32))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 503);
}

#[actix_web::test]
async fn test_apply_card_metadata_fill_with_admin_key_no_pool_returns_503() {
    let app = test::init_service(configure_app_for_tests_with_auth(
        Some(TEST_ADMIN_KEY_32),
        None,
    ))
    .await;
    let req = test::TestRequest::get()
        .uri("/admin/apply_card_metadata_fill?max=10")
        .insert_header(("x-admin-key", TEST_ADMIN_KEY_32))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 503);
}

#[actix_web::test]
async fn test_admin_import_with_wrong_key_returns_403() {
    let app = test::init_service(configure_app_for_tests_with_auth(Some("secret-key"), None)).await;
    let req = test::TestRequest::post()
        .uri("/admin/import")
        .insert_header(("x-admin-key", "wrong"))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 403);
}

#[actix_web::test]
async fn test_admin_import_admin_key_in_query_string_ignored_returns_403() {
    let app = test::init_service(configure_app_for_tests_with_auth(Some("secret-key"), None)).await;
    let req = test::TestRequest::post()
        .uri("/admin/import?admin_key=secret-key")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(
        resp.status().as_u16(),
        403,
        "admin_key en query n'est plus accepté (fuites Referer / logs)"
    );
}

#[actix_web::test]
async fn test_admin_import_with_correct_key_accepts_request() {
    let app = test::init_service(configure_app_for_tests_with_auth(Some("secret-key"), None)).await;
    let req = test::TestRequest::post()
        .uri("/admin/import")
        .insert_header(("x-admin-key", "secret-key"))
        .to_request();
    let resp = test::call_service(&app, req).await;
    // 202 si pool+storage configurés, 503 en test sans DB/storage
    assert!(
        resp.status().as_u16() == 202 || resp.status().as_u16() == 503,
        "guard OK => 202 ou 503 (backend non configuré)"
    );
    if resp.status().as_u16() == 202 {
        let body = test::read_body(resp).await;
        let body_str = String::from_utf8_lossy(&body);
        assert!(body_str.contains("import started"));
    }
}

#[actix_web::test]
async fn test_admin_rehydrate_storage_with_correct_key_accepts_request() {
    let app = test::init_service(configure_app_for_tests_with_auth(Some("secret-key"), None)).await;
    let req = test::TestRequest::post()
        .uri("/admin/rehydrate_storage")
        .insert_header(("x-admin-key", "secret-key"))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(
        resp.status().as_u16() == 202 || resp.status().as_u16() == 503,
        "guard OK => 202 ou 503 (backend non configuré)"
    );
    if resp.status().as_u16() == 202 {
        let body = test::read_body(resp).await;
        let body_str = String::from_utf8_lossy(&body);
        assert!(body_str.contains("rehydrate_storage started"));
    }
}

// --- API (JWT) ---

#[actix_web::test]
async fn test_api_auth_token_without_key_returns_401() {
    let app = test::init_service(configure_app_for_tests_with_auth(None, Some("jwt-secret"))).await;
    let req = test::TestRequest::post()
        .uri("/api/auth/token")
        .set_json(&serde_json::json!({ "api_key": "wrong" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 401);
}

#[actix_web::test]
async fn test_api_auth_token_issuer_split_from_jwt_signing_secret() {
    let signing = "ssssssssssssssssssssssssssssss";
    let issuer = "iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii";
    let app =
        test::init_service(configure_app_for_tests_with_api_keys(None, signing, issuer)).await;

    let req_signing = test::TestRequest::post()
        .uri("/api/auth/token")
        .set_json(&serde_json::json!({ "api_key": signing }))
        .to_request();
    let resp_bad = test::call_service(&app, req_signing).await;
    assert_eq!(
        resp_bad.status().as_u16(),
        401,
        "JWT_SECRET seul ne doit pas servir de clé d'échange"
    );

    let req_ok = test::TestRequest::post()
        .uri("/api/auth/token")
        .set_json(&serde_json::json!({ "api_key": issuer }))
        .to_request();
    let resp_ok = test::call_service(&app, req_ok).await;
    assert!(resp_ok.status().is_success());
    let body: serde_json::Value = test::read_body_json(resp_ok).await;
    let token = body["token"].as_str().expect("token");
    let profile_req = test::TestRequest::get()
        .uri("/api/profile")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let profile_resp = test::call_service(&app, profile_req).await;
    assert!(
        profile_resp.status().is_success(),
        "JWT signé avec JWT_SECRET doit valider /api/profile"
    );
}

#[actix_web::test]
async fn test_api_auth_token_with_correct_key_returns_200_and_token() {
    let app = test::init_service(configure_app_for_tests_with_auth(None, Some("jwt-secret"))).await;
    let req = test::TestRequest::post()
        .uri("/api/auth/token")
        .set_json(&serde_json::json!({ "api_key": "jwt-secret" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let body: serde_json::Value = test::read_body_json(resp).await;
    assert!(
        body.get("token")
            .and_then(|t| t.as_str())
            .unwrap_or("")
            .len()
            > 0
    );
}

#[actix_web::test]
async fn test_api_profile_without_bearer_returns_401() {
    let app = test::init_service(configure_app_for_tests_with_auth(None, Some("jwt-secret"))).await;
    let req = test::TestRequest::get().uri("/api/profile").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 401);
}

#[actix_web::test]
async fn test_api_profile_with_valid_token_returns_200() {
    let app = test::init_service(configure_app_for_tests_with_auth(None, Some("jwt-secret"))).await;
    let token_req = test::TestRequest::post()
        .uri("/api/auth/token")
        .set_json(&serde_json::json!({ "api_key": "jwt-secret" }))
        .to_request();
    let token_resp = test::call_service(&app, token_req).await;
    assert!(token_resp.status().is_success(), "obtenir un token");
    let body: serde_json::Value = test::read_body_json(token_resp).await;
    let token = body["token"].as_str().expect("token dans la réponse");
    let req = test::TestRequest::get()
        .uri("/api/profile")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(
        resp.status().is_success(),
        "GET /api/profile avec Bearer doit être 200"
    );
    let body_bytes = test::read_body(resp).await;
    let profile: serde_json::Value = serde_json::from_slice(&body_bytes).expect("réponse JSON");
    assert_eq!(
        profile.get("sub").and_then(|s| s.as_str()),
        Some("api-user")
    );
    assert_eq!(profile.get("role").and_then(|r| r.as_str()), Some("api"));
}

// --- Decks (sans pool → 503) ---

#[actix_web::test]
async fn test_decks_list_without_pool_returns_503() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req = test::TestRequest::get().uri("/decks").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 503);
}

#[actix_web::test]
async fn test_decks_get_by_id_without_pool_returns_503() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req = test::TestRequest::get().uri("/decks/1").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 503);
}

#[actix_web::test]
async fn test_decks_create_without_pool_returns_503() {
    let app = test::init_service(configure_app_for_tests()).await;
    let main: Vec<serde_json::Value> = (1..=40)
        .map(|i| serde_json::json!({ "name": format!("Carte {}", i), "quantity": 1 }))
        .collect();
    let body = serde_json::json!({ "name": "Test", "main": main, "extra": [], "side": [] });
    let req = test::TestRequest::post()
        .uri("/decks")
        .set_json(&body)
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 503);
}

#[actix_web::test]
async fn test_decks_update_without_pool_returns_503() {
    let app = test::init_service(configure_app_for_tests()).await;
    let main: Vec<serde_json::Value> = (1..=40)
        .map(|i| serde_json::json!({ "name": format!("Carte {}", i), "quantity": 1 }))
        .collect();
    let body = serde_json::json!({ "name": "Updated", "main": main, "extra": [], "side": [] });
    let req = test::TestRequest::put()
        .uri("/decks/1")
        .set_json(&body)
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 503);
}

#[actix_web::test]
async fn test_decks_delete_without_pool_returns_503() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req = test::TestRequest::delete().uri("/decks/1").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 503);
}

// --- Auth site (inscription / connexion / déconnexion) ---

#[actix_web::test]
async fn test_get_register_returns_200_and_form() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req = test::TestRequest::get().uri("/register").to_request();
    let resp = test::call_service(&app, req).await;
    assert!(
        resp.status().is_success(),
        "GET /register doit répondre 200"
    );
    let body = test::read_body(resp).await;
    let body_str = String::from_utf8_lossy(&body);
    assert!(
        body_str.contains("Créer mon compte") || body_str.contains("Créer un compte"),
        "La page doit contenir le libellé du bouton d'inscription"
    );
    assert!(
        body_str.contains("pseudo") || body_str.contains("Pseudo"),
        "Formulaire avec champ pseudo"
    );
    assert!(
        body_str.contains("name=\"csrf_token\""),
        "Jeton CSRF attendu (sec-09)"
    );
}

#[actix_web::test]
async fn test_post_register_without_pool_returns_error_page() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req_get = test::TestRequest::get().uri("/register").to_request();
    let resp_get = test::call_service(&app, req_get).await;
    let cookie = cookie_header_for_next_request(&resp_get);
    let body_get = test::read_body(resp_get).await;
    let html = String::from_utf8_lossy(&body_get);
    let csrf = extract_csrf_hidden_value(&html).expect("csrf sur /register");
    // Mot de passe URL-encodé (évite problème avec ! et autres caractères spéciaux)
    let payload = format!(
        "pseudo=alice&password=Abcd1234%21&accept_conditions=on&csrf_token={}",
        csrf
    );
    let req = test::TestRequest::post()
        .uri("/register")
        .insert_header(("Cookie", cookie))
        .insert_header(("Content-Type", "application/x-www-form-urlencoded"))
        .set_payload(payload)
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(
        resp.status().is_success(),
        "Sans pool, POST /register doit renvoyer 200 avec message d'erreur, got {}",
        resp.status()
    );
    let body = test::read_body(resp).await;
    let body_str = String::from_utf8_lossy(&body);
    assert!(
        body_str.contains("indisponible") || body_str.contains("Service indisponible"),
        "Le corps doit indiquer que le service est indisponible"
    );
}

#[actix_web::test]
async fn test_post_login_without_pool_redirects_to_index() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req_get = test::TestRequest::get().uri("/").to_request();
    let resp_get = test::call_service(&app, req_get).await;
    let cookie = cookie_header_for_next_request(&resp_get);
    let body_get = test::read_body(resp_get).await;
    let html = String::from_utf8_lossy(&body_get);
    let csrf = extract_csrf_hidden_value(&html).expect("csrf sur /");
    let payload = format!("pseudo=alice&password=wrong&csrf_token={}", csrf);
    let req = test::TestRequest::post()
        .uri("/login")
        .insert_header(("Cookie", cookie))
        .insert_header(("Content-Type", "application/x-www-form-urlencoded"))
        .set_payload(payload)
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(
        resp.status().as_u16(),
        303,
        "Sans pool, POST /login redirige (See Other)"
    );
    let loc = resp.headers().get("Location").and_then(|v| v.to_str().ok());
    assert_eq!(loc, Some("/"), "Redirection vers /");
}

#[actix_web::test]
async fn test_post_logout_redirects_to_index() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req_get = test::TestRequest::get().uri("/").to_request();
    let resp_get = test::call_service(&app, req_get).await;
    let cookie = cookie_header_for_next_request(&resp_get);
    let body_get = test::read_body(resp_get).await;
    let html = String::from_utf8_lossy(&body_get);
    let csrf = extract_csrf_hidden_value(&html).expect("csrf sur /");
    let req = test::TestRequest::post()
        .uri("/logout")
        .insert_header(("Cookie", cookie))
        .set_form(&[("csrf_token", csrf.as_str())])
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(
        resp.status().as_u16(),
        303,
        "POST /logout redirige (See Other)"
    );
    let loc = resp.headers().get("Location").and_then(|v| v.to_str().ok());
    assert_eq!(loc, Some("/"), "Redirection vers /");
}

#[actix_web::test]
async fn test_post_login_rate_limited_returns_429_after_two_same_ip() {
    let app = test::init_service(configure_app_for_tests_rate_limit_strict_site()).await;
    let addr: SocketAddr = "198.51.100.42:12345".parse().unwrap();

    let req_get = test::TestRequest::get()
        .uri("/")
        .peer_addr(addr)
        .to_request();
    let resp_get = test::call_service(&app, req_get).await;
    let cookie = cookie_header_for_next_request(&resp_get);
    let body_get = test::read_body(resp_get).await;
    let html = String::from_utf8_lossy(&body_get);
    let csrf = extract_csrf_hidden_value(&html).expect("csrf");

    for _ in 0..2 {
        let payload = format!("pseudo=alice&password=x&csrf_token={}", csrf);
        let req = test::TestRequest::post()
            .uri("/login")
            .peer_addr(addr)
            .insert_header(("Cookie", cookie.clone()))
            .insert_header(("Content-Type", "application/x-www-form-urlencoded"))
            .set_payload(payload)
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(
            resp.status().as_u16(),
            303,
            "deux premiers POST /login autorisés par le rate limit"
        );
    }

    let payload3 = format!("pseudo=alice&password=x&csrf_token={}", csrf);
    let req3 = test::TestRequest::post()
        .uri("/login")
        .peer_addr(addr)
        .insert_header(("Cookie", cookie))
        .insert_header(("Content-Type", "application/x-www-form-urlencoded"))
        .set_payload(payload3)
        .to_request();
    let resp3 = test::call_service(&app, req3).await;
    assert_eq!(resp3.status().as_u16(), 429);
    assert!(
        resp3.headers().get("Retry-After").is_some(),
        "en-tête Retry-After attendu"
    );
}

#[actix_web::test]
async fn test_post_login_without_csrf_returns_403() {
    let app = test::init_service(configure_app_for_tests()).await;
    let payload = "pseudo=alice&password=x";
    let req = test::TestRequest::post()
        .uri("/login")
        .insert_header(("Content-Type", "application/x-www-form-urlencoded"))
        .set_payload(payload)
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 403);
}

#[actix_web::test]
async fn test_post_register_without_csrf_returns_403() {
    let app = test::init_service(configure_app_for_tests()).await;
    let payload = "pseudo=alice&password=Abcd1234%21&accept_conditions=on";
    let req = test::TestRequest::post()
        .uri("/register")
        .insert_header(("Content-Type", "application/x-www-form-urlencoded"))
        .set_payload(payload)
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 403);
}

#[actix_web::test]
async fn test_post_logout_without_valid_csrf_returns_403() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req_get = test::TestRequest::get().uri("/").to_request();
    let resp_get = test::call_service(&app, req_get).await;
    let cookie = cookie_header_for_next_request(&resp_get);
    let req = test::TestRequest::post()
        .uri("/logout")
        .insert_header(("Cookie", cookie))
        .set_form(&[("csrf_token", "wrong-token")])
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 403);
}

#[actix_web::test]
async fn test_index_with_login_error_param_returns_200() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req = test::TestRequest::get().uri("/?login_error=1").to_request();
    let resp = test::call_service(&app, req).await;
    assert!(
        resp.status().is_success(),
        "GET /?login_error=1 doit répondre 200"
    );
    let body = test::read_body(resp).await;
    let body_str = String::from_utf8_lossy(&body);
    assert!(
        body_str.contains("login_error")
            || body_str.contains("incorrect")
            || body_str.contains("erreur")
            || body_str.contains("Identifiant"),
        "La page doit afficher ou utiliser le paramètre d'erreur de connexion"
    );
}

// --- Import images (sec-02) ---

const TEST_ADMIN_KEY_32: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

#[actix_web::test]
async fn test_images_import_forbidden_when_admin_secret_set_and_no_key() {
    let app = test::init_service(configure_app_for_tests_with_auth(
        Some(TEST_ADMIN_KEY_32),
        None,
    ))
    .await;
    let req = test::TestRequest::post()
        .uri("/images/import")
        .insert_header((actix_web::http::header::CONTENT_TYPE, "application/json"))
        .set_json(&serde_json::json!({
            "url": "https://images.ygoprodeck.com/images/cards/1.jpg"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 403);
}

#[actix_web::test]
async fn test_images_import_bad_host_returns_400_before_pool() {
    let app = test::init_service(configure_app_for_tests_with_auth(
        Some(TEST_ADMIN_KEY_32),
        None,
    ))
    .await;
    let req = test::TestRequest::post()
        .uri("/images/import")
        .insert_header(("x-admin-key", TEST_ADMIN_KEY_32))
        .insert_header((actix_web::http::header::CONTENT_TYPE, "application/json"))
        .set_json(&serde_json::json!({ "url": "https://evil.example.com/x.png" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 400);
}

#[actix_web::test]
async fn test_images_import_with_admin_key_no_pool_returns_503() {
    let app = test::init_service(configure_app_for_tests_with_auth(
        Some(TEST_ADMIN_KEY_32),
        None,
    ))
    .await;
    let req = test::TestRequest::post()
        .uri("/images/import")
        .insert_header(("x-admin-key", TEST_ADMIN_KEY_32))
        .insert_header((actix_web::http::header::CONTENT_TYPE, "application/json"))
        .set_json(&serde_json::json!({
            "url": "https://images.ygoprodeck.com/images/cards/1.jpg"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 503);
}

#[actix_web::test]
async fn test_images_import_open_when_no_admin_secret_then_503_no_pool() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req = test::TestRequest::post()
        .uri("/images/import")
        .insert_header((actix_web::http::header::CONTENT_TYPE, "application/json"))
        .set_json(&serde_json::json!({
            "url": "https://images.ygoprodeck.com/images/cards/1.jpg"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(
        resp.status().as_u16(),
        503,
        "Sans ADMIN_SECRET, import passe l’auth puis échoue sur pool"
    );
}

// --- Lecture images (sec-06) : même auth que POST /images/import ---

#[actix_web::test]
async fn test_images_list_forbidden_without_admin_key_when_secret_set() {
    let app = test::init_service(configure_app_for_tests_with_auth(
        Some(TEST_ADMIN_KEY_32),
        None,
    ))
    .await;
    let req = test::TestRequest::get().uri("/images").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 403);
}

#[actix_web::test]
async fn test_images_list_with_admin_key_no_pool_returns_503() {
    let app = test::init_service(configure_app_for_tests_with_auth(
        Some(TEST_ADMIN_KEY_32),
        None,
    ))
    .await;
    let req = test::TestRequest::get()
        .uri("/images")
        .insert_header(("x-admin-key", TEST_ADMIN_KEY_32))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 503);
}

#[actix_web::test]
async fn test_images_get_by_id_forbidden_without_admin_key() {
    let app = test::init_service(configure_app_for_tests_with_auth(
        Some(TEST_ADMIN_KEY_32),
        None,
    ))
    .await;
    let id = Uuid::nil();
    let req = test::TestRequest::get()
        .uri(&format!("/images/{id}"))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 403);
}

#[actix_web::test]
async fn test_images_serve_file_public_without_admin_key_needs_pool_storage() {
    let app = test::init_service(configure_app_for_tests_with_auth(
        Some(TEST_ADMIN_KEY_32),
        None,
    ))
    .await;
    let id = Uuid::nil();
    let req = test::TestRequest::get()
        .uri(&format!("/images/{id}/file/desktop"))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(
        resp.status().as_u16(),
        503,
        "GET fichier image est public mais exige pool + storage (tests sans DB)"
    );
}
