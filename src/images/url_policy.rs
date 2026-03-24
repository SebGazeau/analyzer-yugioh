//! Règles d’URL pour le fetch d’images (anti-SSRF partiel : schéma, IP littérales, allowlist de suffixes).

use std::net::IpAddr;

use reqwest::Url;

/// Suffixes d’hôte autorisés si la variable d’environnement n’est pas définie ou est vide.
pub const DEFAULT_ALLOWED_HOST_SUFFIXES: &[&str] = &["ygoprodeck.com"];

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum UrlPolicyError {
    #[error("URL invalide ou schéma interdit (HTTPS uniquement, sans userinfo)")]
    InvalidOrInsecure,
    #[error("hôte interdit ou non routable publiquement")]
    HostNotAllowed,
    #[error("hôte non couvert par la liste autorisée (IMAGE_IMPORT_ALLOWED_HOST_SUFFIXES)")]
    HostNotInAllowlist,
}

fn blocked_hostname(host: &str) -> bool {
    let h = host.trim().to_lowercase();
    matches!(
        h.as_str(),
        "localhost" | "metadata" | "metadata.google.internal" | "169.254.169.254"
    )
}

fn is_routable_public_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            !(v4.is_private()
                || v4.is_loopback()
                || v4.is_link_local()
                || v4.is_broadcast()
                || v4.is_documentation())
        }
        IpAddr::V6(v6) => {
            !(v6.is_loopback()
                || v6.is_unspecified()
                || v6.is_unique_local()
                || v6.is_unicast_link_local())
        }
    }
}

fn host_matches_allowed_suffix(host: &str, suffixes: &[String]) -> bool {
    let h = host.to_lowercase();
    suffixes
        .iter()
        .any(|s| h == s.as_str() || h.ends_with(&format!(".{}", s)))
}

/// Liste des suffixes depuis `IMAGE_IMPORT_ALLOWED_HOST_SUFFIXES` (virgules) ou défaut YGOProDeck.
pub fn allowed_host_suffixes_from_env() -> Vec<String> {
    match std::env::var("IMAGE_IMPORT_ALLOWED_HOST_SUFFIXES") {
        Ok(s) if !s.trim().is_empty() => s
            .split(',')
            .map(|x| x.trim().to_lowercase())
            .filter(|x| !x.is_empty())
            .collect(),
        _ => DEFAULT_ALLOWED_HOST_SUFFIXES
            .iter()
            .map(|s| (*s).to_string())
            .collect(),
    }
}

/// Vérifie qu’une URL peut être fetchée comme image importée (HTTPS, hôte public, allowlist).
pub fn validate_image_import_url(
    url_str: &str,
    allowed_suffixes: &[String],
) -> Result<Url, UrlPolicyError> {
    let url = Url::parse(url_str.trim()).map_err(|_| UrlPolicyError::InvalidOrInsecure)?;
    if !url.scheme().eq_ignore_ascii_case("https") {
        return Err(UrlPolicyError::InvalidOrInsecure);
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err(UrlPolicyError::InvalidOrInsecure);
    }
    let host = url.host_str().ok_or(UrlPolicyError::InvalidOrInsecure)?;
    if blocked_hostname(host) {
        return Err(UrlPolicyError::HostNotAllowed);
    }
    if let Ok(ip) = host.parse::<IpAddr>() {
        if !is_routable_public_ip(ip) {
            return Err(UrlPolicyError::HostNotAllowed);
        }
        // IP publique explicite : on exige aussi la liste (évite contournements par IP d’un CDN non listé).
        if !host_matches_allowed_suffix(host, allowed_suffixes) {
            return Err(UrlPolicyError::HostNotInAllowlist);
        }
    } else if !host_matches_allowed_suffix(host, allowed_suffixes) {
        return Err(UrlPolicyError::HostNotInAllowlist);
    }
    Ok(url)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ygo_suffixes() -> Vec<String> {
        vec!["ygoprodeck.com".to_string()]
    }

    #[test]
    fn allows_ygoprodeck_https() {
        let u = validate_image_import_url(
            "https://images.ygoprodeck.com/images/cards/1.jpg",
            &ygo_suffixes(),
        )
        .unwrap();
        assert_eq!(u.scheme(), "https");
    }

    #[test]
    fn rejects_http() {
        assert_eq!(
            validate_image_import_url("http://images.ygoprodeck.com/x", &ygo_suffixes()),
            Err(UrlPolicyError::InvalidOrInsecure)
        );
    }

    #[test]
    fn rejects_wrong_suffix() {
        assert_eq!(
            validate_image_import_url("https://evil.com/x", &ygo_suffixes()),
            Err(UrlPolicyError::HostNotInAllowlist)
        );
    }

    #[test]
    fn rejects_private_ipv4() {
        assert_eq!(
            validate_image_import_url("https://10.0.0.1/x", &ygo_suffixes()),
            Err(UrlPolicyError::HostNotAllowed)
        );
    }

    #[test]
    fn rejects_loopback_ipv4() {
        assert_eq!(
            validate_image_import_url("https://127.0.0.1/x", &ygo_suffixes()),
            Err(UrlPolicyError::HostNotAllowed)
        );
    }

    #[test]
    fn rejects_localhost_hostname() {
        assert_eq!(
            validate_image_import_url("https://localhost/x", &ygo_suffixes()),
            Err(UrlPolicyError::HostNotAllowed)
        );
    }

    #[test]
    fn rejects_userinfo() {
        assert_eq!(
            validate_image_import_url("https://user:pass@images.ygoprodeck.com/x", &ygo_suffixes()),
            Err(UrlPolicyError::InvalidOrInsecure)
        );
    }

    #[test]
    fn custom_suffix_allows_other_host() {
        let sfx = vec!["cdn.example.com".to_string()];
        assert!(validate_image_import_url("https://cdn.example.com/a", &sfx).is_ok());
    }
}
