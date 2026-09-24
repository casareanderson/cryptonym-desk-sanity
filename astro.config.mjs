import { defineConfig } from "astro/config";

// Served from GitHub Pages under /cryptonym-desk-sanity/.
export default defineConfig({
  site: "https://casareanderson.github.io",
  base: "/cryptonym-desk-sanity",
  trailingSlash: "ignore",
});
