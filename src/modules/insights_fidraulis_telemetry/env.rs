//! Mode télémétrie Fidraulis (`FIDRAULIS_INSIGHT_TELEMETRY`).
//!
//! - absent / `0` / `off` : routes désactivées (404).
//! - `log` : logs structurés `tracing`, **aucune** écriture SQL (phase 0 / vérification).
//! - `1` / `on` / `persist` : écriture agrégats + état empreinte.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FidraulisTelemetryMode {
    Disabled,
    LogOnly,
    Persist,
}

pub fn fidraulis_telemetry_mode() -> FidraulisTelemetryMode {
    match std::env::var("FIDRAULIS_INSIGHT_TELEMETRY")
        .map(|s| s.to_ascii_lowercase())
        .as_deref()
    {
        Ok("1") | Ok("on") | Ok("persist") | Ok("true") | Ok("yes") => {
            FidraulisTelemetryMode::Persist
        }
        Ok("log") => FidraulisTelemetryMode::LogOnly,
        _ => FidraulisTelemetryMode::Disabled,
    }
}

/// Valeur injectée dans le template (`off` | `log` | `on`) pour le front.
pub fn fidraulis_telemetry_mode_template_value() -> &'static str {
    match fidraulis_telemetry_mode() {
        FidraulisTelemetryMode::Disabled => "off",
        FidraulisTelemetryMode::LogOnly => "log",
        FidraulisTelemetryMode::Persist => "on",
    }
}
