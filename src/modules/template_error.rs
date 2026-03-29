//! Erreur Tera pour les pages HTML (partagée entre `pages` et `site_auth`).

use actix_web::{HttpResponse, ResponseError, http::StatusCode};

#[derive(Debug)]
pub struct TemplateError(pub tera::Error);

impl std::fmt::Display for TemplateError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}

impl ResponseError for TemplateError {
    fn status_code(&self) -> StatusCode {
        StatusCode::INTERNAL_SERVER_ERROR
    }
    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).body(self.0.to_string())
    }
}
