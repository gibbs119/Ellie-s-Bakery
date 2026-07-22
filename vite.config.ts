import { defineConfig } from 'vite';

// GitHub Pages project site serves from /<repo>/. Override with BASE_PATH if
// you deploy elsewhere (e.g. Firebase Hosting uses '/').
const base = process.env.BASE_PATH ?? '/Ellie-s-Bakery/';

export default defineConfig({
  base,
  resolve: {
    alias: {
      // keep `three/addons/...` imports working with the npm package layout
      'three/addons/': 'three/examples/jsm/',
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
});
