//! Auth formulaires site (hors `/web` dashboard) : register, login, logout.

pub mod login;
pub mod logout;
pub mod register;

pub use login::{login_submit, LoginForm};
pub use logout::{logout_submit, LogoutForm};
pub use register::{register_page, register_submit, RegisterForm};
