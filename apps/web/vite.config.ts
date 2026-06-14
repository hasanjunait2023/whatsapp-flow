import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split heavy, route-specific vendor libs into their own chunks so they
        // load only when a page that uses them is opened.
        manualChunks: {
          recharts: ["recharts"],
          xyflow: ["@xyflow/react"],
          jspdf: ["jspdf", "jspdf-autotable"],
          "emoji-mart": ["emoji-mart", "@emoji-mart/data", "@emoji-mart/react"],
          "framer-motion": ["framer-motion"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
}));
