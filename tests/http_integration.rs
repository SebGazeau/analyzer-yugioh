//! Tests d'intégration HTTP pour les routes.

use actix_web::test;

use analyzer_yugioh::{configure_app_for_tests, configure_app_for_tests_with_auth};

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

// --- Web (session) ---

#[actix_web::test]
async fn test_web_login_get_returns_200() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req = test::TestRequest::get().uri("/web/login").to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let body = test::read_body(resp).await;
    let body_str = String::from_utf8_lossy(&body);
    assert!(body_str.contains("user_id") && body_str.contains("form"));
}

#[actix_web::test]
async fn test_web_login_post_redirects_to_dashboard() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req = test::TestRequest::post()
        .uri("/web/login")
        .set_form(&[("user_id", "test-user")])
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 303);
    let loc = resp.headers().get("location").and_then(|v| v.to_str().ok());
    assert_eq!(loc, Some("/web/dashboard"));
}

#[actix_web::test]
async fn test_web_dashboard_without_session_redirects_to_login() {
    let app = test::init_service(configure_app_for_tests()).await;
    let req = test::TestRequest::get().uri("/web/dashboard").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status().as_u16(), 303);
    let loc = resp.headers().get("location").and_then(|v| v.to_str().ok());
    assert_eq!(loc, Some("/web/login"));
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
}

#[actix_web::test]
async fn test_post_register_without_pool_returns_error_page() {
    let app = test::init_service(configure_app_for_tests()).await;
    // Mot de passe URL-encodé (évite problème avec ! et autres caractères spéciaux)
    let payload = "pseudo=alice&password=Abcd1234%21&accept_conditions=on";
    let req = test::TestRequest::post()
        .uri("/register")
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
    let payload = "pseudo=alice&password=wrong";
    let req = test::TestRequest::post()
        .uri("/login")
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
    let req = test::TestRequest::post().uri("/logout").to_request();
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
