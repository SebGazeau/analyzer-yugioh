//! Auth formulaires site (hors `/web` dashboard) : register, login, logout.

pub mod login;
pub mod logout;
pub mod register;

pub use login::{LoginForm, login_submit};
pub use logout::{LogoutForm, logout_submit};
pub use register::{RegisterForm, register_page, register_submit};
