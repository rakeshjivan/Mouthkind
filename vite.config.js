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
        name: "Mouthkind Testing",
        short_name: "MK Testing",
        description: "Check your risk of dry mouth from your medicines, health and habits, and track how dry your mouth is with the GC SIP-SCORE and saliva pH.",
        theme_color: "#faf7f2",
        background_color: "#faf7f2",
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
