//! Met à jour la ligne `version` dans la section `[package]` du `Cargo.toml` à la racine du dépôt.
//! Usage : `cargo run -p xtask --bin bump-cargo-version -- MAJOR.MINOR.PATCH`
//! (lancer depuis la racine du workspace ; chemin = `./Cargo.toml`).

use std::env;
use std::fs;

fn main() -> Result<(), String> {
    let new_ver = env::args()
        .nth(1)
        .ok_or_else(|| "usage: bump-cargo-version MAJOR.MINOR.PATCH".to_string())?;
    validate_semver(&new_ver)?;

    let manifest = env::current_dir()
        .map_err(|e| e.to_string())?
        .join("Cargo.toml");
    if !manifest.is_file() {
        return Err(format!(
            "Cargo.toml introuvable à la racine : {}",
            manifest.display()
        ));
    }

    let text = fs::read_to_string(&manifest).map_err(|e| e.to_string())?;
    let new_text = bump_manifest_text(&text, &new_ver)?;
    fs::write(&manifest, new_text).map_err(|e| e.to_string())?;
    Ok(())
}

fn validate_semver(s: &str) -> Result<(), String> {
    let parts: Vec<&str> = s.split('.').collect();
    if parts.len() != 3 {
        return Err(format!(
            "version invalide (attendu MAJOR.MINOR.PATCH) : {s:?}"
        ));
    }
    for p in parts {
        if p.is_empty() || !p.chars().all(|c| c.is_ascii_digit()) {
            return Err(format!(
                "version invalide (attendu MAJOR.MINOR.PATCH) : {s:?}"
            ));
        }
    }
    Ok(())
}

fn bump_manifest_text(text: &str, new_ver: &str) -> Result<String, String> {
    let mut out: Vec<String> = Vec::new();
    let mut in_package = false;
    let mut replaced = false;

    for line in text.lines() {
        let trimmed = line.trim();

        if trimmed == "[package]" {
            in_package = true;
            out.push(line.to_string());
            continue;
        }

        if in_package && trimmed.starts_with('[') {
            in_package = false;
        }

        if in_package && !replaced && is_package_version_line(line) {
            out.push(format!("version = \"{new_ver}\""));
            replaced = true;
        } else {
            out.push(line.to_string());
        }
    }

    if !replaced {
        return Err("section [package] ou clé version introuvable dans Cargo.toml".into());
    }

    let mut body = out.join("\n");
    body.push('\n');
    Ok(body)
}

fn is_package_version_line(line: &str) -> bool {
    let t = line.trim_start();
    t.starts_with("version") && t.contains('=')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bumps_only_package_version() {
        let raw = r#"[package]
name = "demo"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
"#;
        let out = bump_manifest_text(raw, "2.3.4").unwrap();
        assert!(out.contains("version = \"2.3.4\""));
        assert!(out.contains(r#"serde = { version = "1.0""#));
    }
}
