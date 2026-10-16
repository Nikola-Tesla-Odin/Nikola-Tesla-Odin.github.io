import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/", // served at the root of https://nikola-tesla-odin.github.io/
  define: { global: "globalThis" }, // the ICP libraries inside odin-connect expect Node's `global`
});
