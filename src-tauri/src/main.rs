// The Mac app is a thin native window around the website. It loads the
// live site, so every change pushed to the website reaches the app the
// next time it opens — no reinstall. The site's service worker keeps it
// usable offline once it has loaded once.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running Mouthkind");
}
