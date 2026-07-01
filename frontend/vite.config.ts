import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon.svg"],
      manifest: {
        name: "Ardvmeetinghub Workplace",
        short_name: "Ardvmeetinghub",
        description: "Ardvmeetinghub - Video Conferencing App",
        theme_color: "#0a0f1f",
        background_color: "#0a0f1f",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"]
      }
    })
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:8000",
      "/socket.io": {
        target: "http://localhost:8000",
        ws: true
      }
    }
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:8000",
      "/socket.io": {
        target: "http://localhost:8000",
        ws: true
      }
    }
  }
});
