//! Reset mot de passe (sans email) : parcours 2FA et support/admin.

pub mod repository;
pub mod routes;

pub use routes::{
    admin_approve_password_reset, admin_issue_temp_code, admin_password_reset_page,
    admin_password_reset_queue, enable_2fa, enforce_2fa_page, forgot_password,
    forgot_password_page, reset_password, setup_2fa, support_password_reset_request,
    support_password_reset_status, verify_2fa, verify_recovery_code, verify_temp_code,
};
