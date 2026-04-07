//! Fragments HTML/CSS du tableau de bord admin — contenu externalisé dans `templates/admin_inline/`.

pub const ADMIN_DASHBOARD_STYLE: &str =
    include_str!("../../templates/admin_inline/dashboard_style.html");

pub const ADMIN_DASHBOARD_ACTIONS_HTML: &str =
    include_str!("../../templates/admin_inline/dashboard_actions.html");
