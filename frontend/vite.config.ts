import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "Pymeet Workplace",
        short_name: "Pymeet",
        description: "Pymeet - Video Conferencing App",
        theme_color: "#0a0f1f",
        background_color: "#0a0f1f",
        display: "standalone",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml"
          },
          {
            src: "/icon.svg",
            sizes: "192x192",
            type: "image/svg+xml"
          },
          {
            src: "/icon.svg",
            sizes: "512x512",
            type: "image/svg+xml"
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
      "/api": "http://backend:8000",
      "/socket.io": {
        target: "http://backend:8000",
        ws: true
      }
    }
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/api": "http://backend:8000",
      "/socket.io": {
        target: "http://backend:8000",
        ws: true
      }
    }
  }
});
