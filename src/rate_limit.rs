//! Limitation du débit sur les POST d’authentification (sec-10).
//!
//! `/login` et `/register` ont des compteurs **distincts** : l’inscription peut être plafonnée
//! plus bas pour limiter bots / comptes jetables sans pénaliser les connexions.
//!
//! Fenêtre fixe par clé (IP du pair, sans port). Derrière un proxy de confiance, brancher
//! une extraction d’IP réelle (ex. `X-Forwarded-For`) reste un chantier séparé.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use actix_web::HttpResponse;
use actix_web::dev::ServiceRequest;
use actix_web::http::{Method, StatusCode};

/// Compteur simple : au plus `max` requêtes par fenêtre `window` et par clé.
#[derive(Debug)]
pub struct FixedWindowLimiter {
    inner: Mutex<HashMap<String, (Instant, u32)>>,
    window: Duration,
    max: u32,
}

impl FixedWindowLimiter {
    pub fn new(window: Duration, max: u32) -> Self {
        Self {
            inner: Mutex::new(HashMap::new()),
            window,
            max: max.max(1),
        }
    }

    /// `true` si la requête est autorisée, `false` si la limite est dépassée.
    pub fn check(&self, key: &str) -> bool {
        let now = Instant::now();
        let mut g = match self.inner.lock() {
            Ok(m) => m,
            Err(p) => p.into_inner(),
        };
        use std::collections::hash_map::Entry;
        match g.entry(key.to_string()) {
            Entry::Vacant(v) => {
                v.insert((now, 1));
                true
            }
            Entry::Occupied(mut o) => {
                let e = o.get_mut();
                if now.duration_since(e.0) >= self.window {
                    *e = (now, 1);
                    true
                } else if e.1 >= self.max {
                    false
                } else {
                    e.1 += 1;
                    true
                }
            }
        }
    }
}

/// Limite `POST /login`, `POST /register` (séparé) et `POST /admin/login`.
#[derive(Debug)]
pub struct RateLimitState {
    pub site: FixedWindowLimiter,
    pub register: FixedWindowLimiter,
    pub admin: FixedWindowLimiter,
}

impl RateLimitState {
    pub fn new(
        site_window: Duration,
        site_max: u32,
        register_window: Duration,
        register_max: u32,
        admin_window: Duration,
        admin_max: u32,
    ) -> Self {
        Self {
            site: FixedWindowLimiter::new(site_window, site_max),
            register: FixedWindowLimiter::new(register_window, register_max),
            admin: FixedWindowLimiter::new(admin_window, admin_max),
        }
    }

    /// Valeur très permissive pour les tests d’intégration (évite les courses sur `unknown`).
    pub fn permissive_for_tests() -> Self {
        Self::new(
            Duration::from_secs(60),
            50_000,
            Duration::from_secs(60),
            50_000,
            Duration::from_secs(60),
            50_000,
        )
    }
}

/// Limites depuis l’environnement (fenêtre **1 minute** pour site et admin).
pub fn rate_limit_state_from_env() -> RateLimitState {
    fn parse_u32(name: &str, default: u32) -> u32 {
        std::env::var(name)
            .ok()
            .and_then(|s| s.parse::<u32>().ok())
            .filter(|&n| n >= 1)
            .unwrap_or(default)
    }
    let site = parse_u32("SITE_AUTH_RATE_LIMIT_PER_MINUTE", 30);
    let register = parse_u32("REGISTER_RATE_LIMIT_PER_MINUTE", 5);
    let admin = parse_u32("ADMIN_LOGIN_RATE_LIMIT_PER_MINUTE", 15);
    RateLimitState::new(
        Duration::from_secs(60),
        site,
        Duration::from_secs(60),
        register,
        Duration::from_secs(60),
        admin,
    )
}

/// Extrait l’IP depuis `peer_addr` (`a.b.c.d:port` ou `[ipv6]:port`).
pub fn peer_ip_key(peer: Option<&str>) -> String {
    let Some(s) = peer else {
        return "unknown".to_string();
    };
    if let Some(rest) = s.strip_prefix('[') {
        if let Some((ip, _)) = rest.split_once(']') {
            return ip.to_string();
        }
    }
    s.rsplit_once(':')
        .map(|(ip, _)| ip.to_string())
        .unwrap_or_else(|| s.to_string())
}

pub fn site_login_post_path(path: &str) -> bool {
    path == "/login"
}

pub fn site_register_post_path(path: &str) -> bool {
    path == "/register"
}

pub fn admin_login_post_path(path: &str) -> bool {
    path == "/admin/login"
}

/// Si la requête est un POST d’auth ciblé et que la limite est dépassée, réponse **429** à renvoyer.
pub fn login_post_blocked_response(
    req: &ServiceRequest,
    lim: &RateLimitState,
) -> Option<HttpResponse> {
    if *req.method() != Method::POST {
        return None;
    }
    let path = req.path();
    let peer = req.peer_addr().map(|a| a.to_string());
    let key = peer_ip_key(peer.as_deref());
    let body = "Trop de tentatives. Réessayez plus tard.";
    if admin_login_post_path(path) && !lim.admin.check(&key) {
        return Some(
            HttpResponse::build(StatusCode::TOO_MANY_REQUESTS)
                .insert_header(("Retry-After", "60"))
                .body(body),
        );
    }
    if site_register_post_path(path) && !lim.register.check(&key) {
        return Some(
            HttpResponse::build(StatusCode::TOO_MANY_REQUESTS)
                .insert_header(("Retry-After", "60"))
                .body(body),
        );
    }
    if site_login_post_path(path) && !lim.site.check(&key) {
        return Some(
            HttpResponse::build(StatusCode::TOO_MANY_REQUESTS)
                .insert_header(("Retry-After", "60"))
                .body(body),
        );
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixed_window_blocks_after_max() {
        let l = FixedWindowLimiter::new(Duration::from_secs(3600), 3);
        assert!(l.check("k"));
        assert!(l.check("k"));
        assert!(l.check("k"));
        assert!(!l.check("k"));
    }

    #[test]
    fn fixed_window_independent_keys() {
        let l = FixedWindowLimiter::new(Duration::from_secs(3600), 1);
        assert!(l.check("a"));
        assert!(!l.check("a"));
        assert!(l.check("b"));
    }

    #[test]
    fn peer_ip_key_ipv4() {
        assert_eq!(peer_ip_key(Some("192.0.2.1:4444")), "192.0.2.1");
    }

    #[test]
    fn peer_ip_key_ipv6() {
        assert_eq!(peer_ip_key(Some("[::1]:8080")), "::1");
    }

    #[test]
    fn peer_ip_key_none() {
        assert_eq!(peer_ip_key(None), "unknown");
    }

    #[test]
    fn site_login_and_register_paths() {
        assert!(site_login_post_path("/login"));
        assert!(!site_login_post_path("/register"));
        assert!(site_register_post_path("/register"));
        assert!(!site_register_post_path("/login"));
        assert!(
            !site_login_post_path("/web/login"),
            "POST /web/login supprimé (sec-11)"
        );
    }
}
