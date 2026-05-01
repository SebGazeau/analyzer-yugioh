//! Routes HTTP par domaine.
pub mod admin;
mod admin_auth;
pub mod admin_dashboard_html;
pub use admin_dashboard_html::{
    ADMIN_DASHBOARD_ACTIONS_HTML, ADMIN_DASHBOARD_NAV_HTML, ADMIN_DASHBOARD_STYLE,
};
mod admin_inline_html;
pub mod images;
pub use admin::*;
pub use images::*;
