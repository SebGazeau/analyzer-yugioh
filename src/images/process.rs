//! Décodage, redimensionnement et encodage WebP (original, desktop, mobile).

use std::io::Cursor;

use image::ImageReader;
use image::imageops::FilterType;
use tracing::instrument;
use webp::Encoder;

use super::fetch::max_image_fetch_bytes_from_env;

#[derive(Debug, thiserror::Error)]
pub enum ProcessError {
    #[error("entrée trop volumineuse (max {max} octets)")]
    InputTooLarge { max: usize },
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

/// Largeur / hauteur max décodées (anti image bomb / RAM).
const MAX_DECODE_DIMENSION: u32 = 4096;
/// Plafond mémoire pour le buffer décodé (voir `image::Limits::max_alloc`).
const MAX_DECODE_ALLOC_BYTES: u64 = 96 * 1024 * 1024;

fn decode_limits() -> image::Limits {
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(MAX_DECODE_DIMENSION);
    limits.max_image_height = Some(MAX_DECODE_DIMENSION);
    limits.max_alloc = Some(MAX_DECODE_ALLOC_BYTES);
    limits
}

/// Décode les bytes, génère les 3 variantes WebP.
///
/// - Rejette d’abord les buffers plus longs que [`max_image_fetch_bytes_from_env`] (sec-12,
///   défense en profondeur même hors import HTTP).
/// - Applique des limites de dimensions et d’allocation via `image::ImageReader` (sec-12).
#[instrument(skip(bytes))]
pub fn process_image(bytes: &[u8]) -> Result<ImageVariants, ProcessError> {
    let max_in = max_image_fetch_bytes_from_env();
    if bytes.len() > max_in {
        return Err(ProcessError::InputTooLarge { max: max_in });
    }

    let mut reader = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(image::ImageError::IoError)?;
    reader.limits(decode_limits());

    let img = reader.decode()?;
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
    Ok(mem.to_vec())
}

fn encode_quality(img: &image::DynamicImage, quality: f32) -> Result<Vec<u8>, ProcessError> {
    let encoder = Encoder::from_image(img).map_err(|e| ProcessError::Webp(e.to_string()))?;
    let mem = encoder.encode(quality);
    Ok(mem.to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{DynamicImage, ImageBuffer, ImageFormat, Rgb};
    use std::io::Cursor;

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

    #[test]
    fn process_image_input_exceeds_max_bytes_returns_too_large() {
        let max = max_image_fetch_bytes_from_env();
        let buf = vec![0u8; max + 1];
        let r = process_image(&buf);
        match r {
            Err(ProcessError::InputTooLarge { max: m }) => assert_eq!(m, max),
            other => panic!("attendu InputTooLarge, got {other:?}"),
        }
    }

    #[test]
    fn process_image_dimensions_over_limit_returns_decode_limits() {
        let w = MAX_DECODE_DIMENSION + 500;
        let img: ImageBuffer<Rgb<u8>, Vec<u8>> =
            ImageBuffer::from_fn(w, 1, |_, _| Rgb([10u8, 20u8, 30u8]));
        let dyn_img = DynamicImage::ImageRgb8(img);
        let mut png_bytes = Vec::new();
        dyn_img
            .write_to(&mut Cursor::new(&mut png_bytes), ImageFormat::Png)
            .expect("encode png test");

        let r = process_image(&png_bytes);
        assert!(
            matches!(r, Err(ProcessError::Decode(image::ImageError::Limits(_)))),
            "attendu erreur limites décodeur, got {r:?}"
        );
    }
}
