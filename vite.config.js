import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Serves ort-wasm-simd-threaded.mjs from node_modules in dev (as a proper ES
// module — public/ files can't be imported as modules in Vite) and copies it
// to the build output for production.
function ortWasmPlugin() {
  const ORT_DIST = path.resolve('node_modules/onnxruntime-web/dist');

  return {
    name: 'ort-wasm',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const filename = decodeURIComponent((req.url || '').split('?')[0].slice(1));
        if (filename === 'ort-wasm-simd-threaded.mjs') {
          const filePath = path.join(ORT_DIST, filename);
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        }
        next();
      });
    },
    writeBundle(options) {
      const outDir = options.dir || 'build';
      const src = path.join(ORT_DIST, 'ort-wasm-simd-threaded.mjs');
      const dest = path.join(outDir, 'ort-wasm-simd-threaded.mjs');
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react({
      include: ['**/*.jsx', '**/*.js', '**/*.tsx', '**/*.ts']
    }),
    ortWasmPlugin(),
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  build: {
    outDir: 'build',
    emptyOutDir: true
  }
});
