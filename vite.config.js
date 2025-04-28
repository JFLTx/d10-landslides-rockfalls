import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: '/d10-landslides-rockfalls/', // very important for GitHub Pages!!
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),   // your landing page
        threeD: resolve(__dirname, '3D/index.html') // your 3D map page
      }
    }
  }
});
