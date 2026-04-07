//! Routes HTTP par domaine.
pub mod admin;
mod admin_auth;
mod admin_dashboard_html;
mod admin_inline_html;
pub mod images;
pub use admin::*;
pub use images::*;
