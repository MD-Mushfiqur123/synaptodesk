//! The SynaptoDesk icon shared by the native tray on every desktop platform.

pub fn icon() -> tauri::image::Image<'static> {
    tauri::include_image!("icons/64x64.png")
}

#[cfg(test)]
mod tests {
    use super::icon;

    #[test]
    fn embedded_icon_has_complete_64px_rgba_pixels() {
        let image = icon();
        assert_eq!((image.width(), image.height()), (64, 64));
        assert_eq!(image.rgba().len(), 64 * 64 * 4);
    }

    #[test]
    fn icon_corners_are_fully_transparent() {
        let image = icon();
        for (x, y) in [(0, 0), (63, 0), (0, 63), (63, 63)] {
            assert_eq!(image.rgba()[(y * 64 + x) * 4 + 3], 0);
        }
    }

    #[test]
    fn icon_interior_is_visible() {
        let image = icon();
        let mut visible_count = 0;
        for y in 24..40 {
            for x in 24..40 {
                let offset = (y * 64 + x) * 4;
                let pixel = &image.rgba()[offset..offset + 4];
                if pixel[3] >= 128 {
                    visible_count += 1;
                }
            }
        }
        assert!(visible_count > 100, "the icon interior must remain visible");
    }
}
