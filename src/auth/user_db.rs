//! Comptes utilisateurs du site : pseudo + mot de passe (Argon2).

use rustrict::{Censor, Type};
use sqlx::FromRow;
use uuid::Uuid;

use crate::auth::admin_db::{hash_password, verify_password};
use crate::db;

const PSEUDO_MIN_LEN: usize = 4;

#[derive(Debug, Clone, FromRow)]
pub struct SiteUser {
    pub id: Uuid,
    pub pseudo: String,
    pub password_hash: String,
}

/// Vérifie que le mot de passe respecte les critères (min 8, maj, min, chiffre, spécial).
pub fn validate_password_strength(password: &str) -> Result<(), PasswordError> {
    if password.len() < 8 {
        return Err(PasswordError::TooShort);
    }
    let has_lower = password.chars().any(|c| c.is_ascii_lowercase());
    let has_upper = password.chars().any(|c| c.is_ascii_uppercase());
    let has_digit = password.chars().any(|c| c.is_ascii_digit());
    let has_special = password
        .chars()
        .any(|c| c.is_ascii_punctuation() || (c.is_ascii_graphic() && !c.is_ascii_alphanumeric()));
    if !has_lower {
        return Err(PasswordError::MissingLowercase);
    }
    if !has_upper {
        return Err(PasswordError::MissingUppercase);
    }
    if !has_digit {
        return Err(PasswordError::MissingDigit);
    }
    if !has_special {
        return Err(PasswordError::MissingSpecial);
    }
    Ok(())
}

#[derive(Debug, Clone, thiserror::Error)]
pub enum PasswordError {
    #[error("Le mot de passe doit contenir au moins 8 caractères")]
    TooShort,
    #[error("Le mot de passe doit contenir au moins une minuscule")]
    MissingLowercase,
    #[error("Le mot de passe doit contenir au moins une majuscule")]
    MissingUppercase,
    #[error("Le mot de passe doit contenir au moins un chiffre")]
    MissingDigit,
    #[error("Le mot de passe doit contenir au moins un caractère spécial")]
    MissingSpecial,
}

pub fn normalize_and_validate_pseudo(pseudo: &str) -> Result<String, PseudoError> {
    let s = pseudo.trim();
    if s.len() < PSEUDO_MIN_LEN {
        return Err(PseudoError::TooShort(PSEUDO_MIN_LEN));
    }
    Ok(s.to_string())
}

/// Filtre grossièretés, contenus offensants / sexuels (seuil « inappropriate » de rustrict),
/// et insultes très graves (mean sévère). Faux positifs possibles : liste ajustable côté produit.
pub fn validate_pseudo_content(pseudo: &str) -> Result<(), PseudoError> {
    let mut censor = Censor::from_str(pseudo);
    if censor.analyze().is(Type::INAPPROPRIATE) {
        return Err(PseudoError::Inappropriate);
    }
    Ok(())
}

#[derive(Debug, Clone, thiserror::Error)]
pub enum PseudoError {
    #[error("Le pseudo doit contenir au moins {0} caractères")]
    TooShort(usize),
    #[error("Ce pseudo n'est pas autorisé (langage inapproprié).")]
    Inappropriate,
}

impl PseudoError {
    pub fn too_short() -> Self {
        PseudoError::TooShort(PSEUDO_MIN_LEN)
    }
}

pub async fn get_user_by_pseudo(
    pool: &sqlx::PgPool,
    pseudo: &str,
) -> Result<Option<SiteUser>, db::DbError> {
    let key = pseudo.trim().to_lowercase();
    if key.is_empty() {
        return Ok(None);
    }
    let row = sqlx::query_as::<_, SiteUser>(
        "SELECT id, pseudo, password_hash FROM site_users WHERE LOWER(TRIM(pseudo)) = $1",
    )
    .bind(&key)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

pub async fn create_user(
    pool: &sqlx::PgPool,
    pseudo: &str,
    password: &str,
) -> Result<Uuid, CreateUserError> {
    let pseudo_ok = normalize_and_validate_pseudo(pseudo).map_err(CreateUserError::Pseudo)?;
    validate_pseudo_content(&pseudo_ok).map_err(CreateUserError::Pseudo)?;
    validate_password_strength(password).map_err(CreateUserError::Password)?;
    if get_user_by_pseudo(pool, &pseudo_ok).await?.is_some() {
        return Err(CreateUserError::PseudoTaken);
    }
    let hash = hash_password(password).map_err(|_| CreateUserError::Hash)?;
    let id = Uuid::new_v4();
    sqlx::query("INSERT INTO site_users (id, pseudo, password_hash) VALUES ($1, $2, $3)")
        .bind(id)
        .bind(&pseudo_ok)
        .bind(&hash)
        .execute(pool)
        .await
        .map_err(db::DbError::from)
        .map_err(CreateUserError::Db)?;
    Ok(id)
}

#[derive(Debug, thiserror::Error)]
pub enum CreateUserError {
    #[error("{0}")]
    Pseudo(#[from] PseudoError),
    #[error("{0}")]
    Password(#[from] PasswordError),
    #[error("Ce pseudo est déjà utilisé")]
    PseudoTaken,
    #[error("Erreur technique")]
    Hash,
    #[error("Erreur base de données")]
    Db(#[from] db::DbError),
}

/// Vérifie pseudo + mot de passe ; retourne l'utilisateur si OK. Message identique si échec (sécurité).
pub async fn authenticate(
    pool: &sqlx::PgPool,
    pseudo: &str,
    password: &str,
) -> Result<Option<SiteUser>, db::DbError> {
    let user = get_user_by_pseudo(pool, pseudo).await?;
    match user {
        Some(u) if verify_password(password, &u.password_hash) => Ok(Some(u)),
        _ => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_password_too_short() {
        assert!(matches!(
            validate_password_strength("Ab1!"),
            Err(PasswordError::TooShort)
        ));
    }

    #[test]
    fn validate_password_missing_requirements() {
        assert!(matches!(
            validate_password_strength("ABCD1234!"),
            Err(PasswordError::MissingLowercase)
        ));
        assert!(matches!(
            validate_password_strength("abcd1234!"),
            Err(PasswordError::MissingUppercase)
        ));
        assert!(matches!(
            validate_password_strength("Abcdefgh!"),
            Err(PasswordError::MissingDigit)
        ));
        assert!(matches!(
            validate_password_strength("Abcdefg1"),
            Err(PasswordError::MissingSpecial)
        ));
    }

    #[test]
    fn validate_password_valid() {
        assert!(validate_password_strength("Abcd1234!").is_ok());
        assert!(validate_password_strength("XyZ9@min").is_ok());
    }

    #[test]
    fn normalize_pseudo_too_short() {
        assert!(normalize_and_validate_pseudo("").is_err());
        assert!(normalize_and_validate_pseudo("a").is_err());
        assert!(normalize_and_validate_pseudo("abc").is_err());
        assert!(matches!(
            normalize_and_validate_pseudo("  x  "),
            Err(PseudoError::TooShort(4))
        ));
    }

    #[test]
    fn normalize_pseudo_valid() {
        assert_eq!(
            normalize_and_validate_pseudo("user").ok(),
            Some("user".to_string())
        );
        assert_eq!(
            normalize_and_validate_pseudo("  alice  ").ok(),
            Some("alice".to_string())
        );
        assert_eq!(
            normalize_and_validate_pseudo("Bob42").ok(),
            Some("Bob42".to_string())
        );
    }

    #[test]
    fn validate_pseudo_content_allows_clean() {
        assert!(validate_pseudo_content("Alice").is_ok());
        assert!(validate_pseudo_content("DarkMagician").is_ok());
    }

    #[test]
    fn validate_pseudo_content_blocks_listed_profanity() {
        assert!(matches!(
            validate_pseudo_content("arse"),
            Err(PseudoError::Inappropriate)
        ));
    }
}
