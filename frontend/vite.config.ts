import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
