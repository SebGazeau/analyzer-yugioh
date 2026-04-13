//! Pages HTML admin servies en inline (fichiers sous `templates/admin_inline/`, pas Tera).

use super::admin_dashboard_html::{ADMIN_DASHBOARD_ACTIONS_HTML, ADMIN_DASHBOARD_STYLE};

fn tpl_connected() -> &'static str {
    include_str!("../../templates/admin_inline/page_login_connected.html")
}

fn tpl_token_success() -> &'static str {
    include_str!("../../templates/admin_inline/page_token_success.html")
}

pub fn render_admin_login_connected() -> String {
    tpl_connected()
        .replace("%%STYLE%%", ADMIN_DASHBOARD_STYLE)
        .replace("%%ACTIONS%%", ADMIN_DASHBOARD_ACTIONS_HTML)
}

pub fn render_admin_token_success(sub_esc: &str, token_esc: &str, token_hours: i64) -> String {
    tpl_token_success()
        .replace("%%STYLE%%", ADMIN_DASHBOARD_STYLE)
        .replace("%%ACTIONS%%", ADMIN_DASHBOARD_ACTIONS_HTML)
        .replace("%%SUB_ESC%%", sub_esc)
        .replace("%%TOKEN_ESC%%", token_esc)
        .replace("%%TOKEN_HOURS%%", &token_hours.to_string())
}

pub fn page_login_form() -> &'static str {
    include_str!("../../templates/admin_inline/page_login_form.html")
}

pub fn page_login_no_db() -> &'static str {
    include_str!("../../templates/admin_inline/page_login_no_db.html")
}

pub fn error_db_unavailable() -> &'static str {
    include_str!("../../templates/admin_inline/error_db_unavailable.html")
}

pub fn error_login_failed() -> &'static str {
    include_str!("../../templates/admin_inline/error_login_failed.html")
}

pub fn page_setup_form() -> &'static str {
    include_str!("../../templates/admin_inline/page_setup_form.html")
}

pub fn error_setup_key() -> &'static str {
    include_str!("../../templates/admin_inline/error_setup_key.html")
}

pub fn error_admin_exists() -> &'static str {
    include_str!("../../templates/admin_inline/error_admin_exists.html")
}

/// Page outil « analyse display » (formulaire + JS inline).
pub fn render_ygo_analysis() -> String {
    include_str!("../../templates/admin_inline/ygo_analysis.html")
        .replace("%%STYLE%%", ADMIN_DASHBOARD_STYLE)
        .replace("%%ACTIONS%%", ADMIN_DASHBOARD_ACTIONS_HTML)
}
