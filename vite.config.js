import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };

// BASE_PATH lets the same build serve from a domain root or a GitHub Pages
// sub-path (e.g. /mouthkind/). The workflow sets it automatically.
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate", // new versions install themselves on next open
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: base.includes("/testing/") ? "Mouthkind: Dry Mouth Care (Testing)" : "Mouthkind: Dry Mouth Care",
        short_name: base.includes("/testing/") ? "MK Testing" : "Mouthkind",
        description: "Check your dry mouth, track saliva pH and get a personal plan to protect your teeth.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: ".",
        scope: ".",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: { navigateFallback: "index.html", navigateFallbackDenylist: [/\/testing\//], globPatterns: ["**/*.{js,css,html,svg,png}"], globIgnores: ["testing/**"] },
    }),
  ],
});
