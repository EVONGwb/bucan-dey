import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg"],
      manifest: false,
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,ico,json}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "bucan-media-cache",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 14,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/bucan-dey-api\.onrender\.com\/api\/health$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "bucan-api-health",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 60 * 10,
              },
            },
          },
        ],
      },
    }),
  ],
});
