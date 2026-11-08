import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

// Works both in the Lovable root and the exported GitHub interface/ directory.
const serviceRoot = new URL(existsSync(new URL("./servico/package.json", import.meta.url)) ? "./servico/" : "../servico/", import.meta.url);

// Separate browser-only build; never imports the TanStack/Worker plugin stack.
export default defineConfig({
  root: fileURLToPath(new URL("./operational", import.meta.url)),
  base: "/interface/",
  publicDir: false,
  plugins: [react(), tailwind()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    outDir: fileURLToPath(new URL("dist/interface", serviceRoot)),
    emptyOutDir: true,
    sourcemap: false,
  },
});