//! Fragments HTML/CSS du tableau de bord admin — contenu externalisé dans `templates/admin_inline/`.

pub const ADMIN_DASHBOARD_STYLE: &str =
    include_str!("../../templates/admin_inline/dashboard_style.html");

pub const ADMIN_DASHBOARD_NAV_HTML: &str =
    include_str!("../../templates/admin_inline/dashboard_nav.html");

pub const ADMIN_DASHBOARD_ACTIONS_HTML: &str =
    include_str!("../../templates/admin_inline/dashboard_actions.html");

#[cfg(test)]
mod tests {
    use super::{ADMIN_DASHBOARD_ACTIONS_HTML, ADMIN_DASHBOARD_NAV_HTML};

    #[test]
    fn admin_actions_keep_expected_routes() {
        for expected in [
            "/admin/fetch_cards",
            "/admin/enrich_ygorganization",
            "/admin/preview_card_metadata_fill",
            "/admin/apply_card_metadata_fill",
            "/admin/import",
            "/admin/rehydrate_storage",
        ] {
            assert!(
                ADMIN_DASHBOARD_ACTIONS_HTML.contains(expected),
                "action fragment must keep route: {expected}"
            );
        }
    }

    #[test]
    fn admin_actions_keep_nav_placeholder() {
        assert!(ADMIN_DASHBOARD_ACTIONS_HTML.contains("%%NAV%%"));
    }

    #[test]
    fn admin_nav_keeps_admin_entrypoints() {
        for expected in ["/admin/login", "/admin/ygo", "/admin/fidraulis-gy"] {
            assert!(
                ADMIN_DASHBOARD_NAV_HTML.contains(expected),
                "nav fragment must keep route: {expected}"
            );
        }
    }
}
