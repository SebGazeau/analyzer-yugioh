//! Décodage, redimensionnement et encodage WebP (original, desktop, mobile).

use image::imageops::FilterType;
use tracing::instrument;
use webp::Encoder;

#[derive(Debug, thiserror::Error)]
pub enum ProcessError {
    #[error("decode: {0}")]
    Decode(#[from] image::ImageError),
    #[error("webp: {0}")]
    Webp(String),
}

/// Trois variantes WebP produites par le pipeline.
#[derive(Debug, Clone)]
pub struct ImageVariants {
    pub width: u32,
    pub height: u32,
    pub original: Vec<u8>,
    pub desktop: Vec<u8>,
    pub mobile: Vec<u8>,
}

const DESKTOP_MAX_WIDTH: u32 = 1920;
const DESKTOP_QUALITY: f32 = 85.0;
const MOBILE_MAX_WIDTH: u32 = 768;
const MOBILE_QUALITY: f32 = 80.0;

/// Décode les bytes, génère les 3 variantes WebP.
#[instrument(skip(bytes))]
pub fn process_image(bytes: &[u8]) -> Result<ImageVariants, ProcessError> {
    let format = image::guess_format(bytes).map_err(ProcessError::Decode)?;
    let img = image::load_from_memory_with_format(bytes, format).map_err(ProcessError::Decode)?;
    let (width, height) = (img.width(), img.height());

    let original = encode_lossless(&img)?;
    let desktop_img = resize_to_max_width(&img, DESKTOP_MAX_WIDTH);
    let desktop = encode_quality(&desktop_img, DESKTOP_QUALITY)?;
    let mobile_img = resize_to_max_width(&img, MOBILE_MAX_WIDTH);
    let mobile = encode_quality(&mobile_img, MOBILE_QUALITY)?;

    Ok(ImageVariants {
        width,
        height,
        original,
        desktop,
        mobile,
    })
}

fn resize_to_max_width(img: &image::DynamicImage, max_width: u32) -> image::DynamicImage {
    if img.width() <= max_width {
        return img.clone();
    }
    let h = (img.height() * max_width / img.width()).max(1);
    img.resize(max_width, h, FilterType::Triangle)
}

fn encode_lossless(img: &image::DynamicImage) -> Result<Vec<u8>, ProcessError> {
    let encoder = Encoder::from_image(img).map_err(|e| ProcessError::Webp(e.to_string()))?;
    let mem = encoder.encode_lossless();
    Ok((&*mem).to_vec())
}

fn encode_quality(img: &image::DynamicImage, quality: f32) -> Result<Vec<u8>, ProcessError> {
    let encoder = Encoder::from_image(img).map_err(|e| ProcessError::Webp(e.to_string()))?;
    let mem = encoder.encode(quality);
    Ok((&*mem).to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// PNG 1x1 pixel rouge (minimal valide).
    const MINIMAL_PNG: &[u8] = &[
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8,
        0xFF, 0xFF, 0x3F, 0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59, 0xE7, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ];

    #[test]
    fn process_image_produces_three_variants() {
        let out = process_image(MINIMAL_PNG).unwrap();
        assert_eq!(out.width, 1);
        assert_eq!(out.height, 1);
        assert!(!out.original.is_empty());
        assert!(!out.desktop.is_empty());
        assert!(!out.mobile.is_empty());
    }

    #[test]
    fn process_image_invalid_bytes_fails() {
        let r = process_image(b"not an image");
        assert!(r.is_err());
    }

    #[test]
    fn process_error_display() {
        let e = process_image(b"x").unwrap_err();
        let s = e.to_string();
        assert!(!s.is_empty());
        assert!(s.contains("decode") || s.contains("Decode"));
    }
}
