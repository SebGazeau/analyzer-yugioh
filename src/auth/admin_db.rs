//! Authentification admin : hachage mot de passe (Argon2) et vérification en base.

use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
};
use rand_core::OsRng;
use sqlx::FromRow;
use uuid::Uuid;

use crate::db;

#[derive(Debug, Clone, FromRow)]
pub struct AdminUser {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
}

/// Hash un mot de passe avec Argon2id (format PHC).
pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    Ok(argon2
        .hash_password(password.as_bytes(), &salt)?
        .to_string())
}

/// Vérifie un mot de passe contre un hash PHC.
pub fn verify_password(password: &str, hash: &str) -> bool {
    let parsed = match PasswordHash::new(hash) {
        Ok(p) => p,
        Err(_) => return false,
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok()
}

/// Récupère un admin par email (insensible à la casse).
pub async fn get_admin_by_email(
    pool: &sqlx::PgPool,
    email: &str,
) -> Result<Option<AdminUser>, db::DbError> {
    let email_lower = email.trim().to_lowercase();
    if email_lower.is_empty() {
        return Ok(None);
    }
    let row = sqlx::query_as::<_, AdminUser>(
        "SELECT id, email, password_hash FROM admin_users WHERE LOWER(email) = $1",
    )
    .bind(&email_lower)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

/// Retourne le nombre d'admins (pour vérifier si le premier compte existe déjà).
pub async fn count_admins(pool: &sqlx::PgPool) -> Result<i64, db::DbError> {
    let row: (i64,) = sqlx::query_as("SELECT COUNT(*)::bigint FROM admin_users")
        .fetch_one(pool)
        .await?;
    Ok(row.0)
}

/// Crée un compte admin (email unique).
pub async fn create_admin(
    pool: &sqlx::PgPool,
    email: &str,
    password_hash: &str,
) -> Result<Uuid, db::DbError> {
    let email_trimmed = email.trim();
    let id = Uuid::new_v4();
    sqlx::query("INSERT INTO admin_users (id, email, password_hash) VALUES ($1, $2, $3)")
        .bind(id)
        .bind(email_trimmed)
        .bind(password_hash)
        .execute(pool)
        .await?;
    Ok(id)
}
