import { defineConfig } from 'vite';

// A relative base ('./') makes one build work no matter where it's hosted —
// the domain root (Vercel, Firebase) or a project subpath (GitHub Pages at
// /<repo>/) — because every asset URL is resolved relative to index.html.
// This avoids the classic "blank page / stuck loading" from a wrong base path.
// Can still be overridden with BASE_PATH for an absolute path if ever needed.
const base = process.env.BASE_PATH ?? './';

export default defineConfig({
  base,
  resolve: {
    alias: {
      // keep `three/addons/...` imports working with the npm package layout
      'three/addons/': 'three/examples/jsm/',
    },
  },
  build: {
    // Older iPads run older Safari — this keeps the bundle parseable there
    // (iOS 13+), instead of assuming very recent syntax support.
    target: ['es2019', 'safari13'],
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
});
