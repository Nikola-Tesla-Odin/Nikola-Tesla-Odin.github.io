import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  base: "/", // served at the root of https://nikola-tesla-odin.github.io/
  define: { global: "globalThis" }, // the ICP libraries inside odin-connect expect Node's `global`
  build: {
    rollupOptions: {
      input: {
        studio: resolve(__dirname, "index.html"),
        wardenclyffe: resolve(__dirname, "wardenclyffe/index.html"),
      },
    },
  },
});
