use std::sync::OnceLock;
use tera::{Error, Tera};

static COMPILED_TEMPLATE: OnceLock<Tera> = OnceLock::new();

/// Crée un moteur Tera chargé depuis `templates/**/*`. À appeler au démarrage.
pub fn create_template() -> Result<Tera, Error> {
    Tera::new("templates/**/*")
}

pub fn get_template() -> Result<&'static Tera, Error> {
    let template = create_template()?;
    Ok(COMPILED_TEMPLATE.get_or_init(|| template))
}
