import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { blogMeta } from './src/data/blog-meta.js';
import { sections as llmOptimizationSections } from './src/blogs/llmoptimizations/sections.js';

const runtimeOptimizationsSlug = 'runtime-optimizations-for-llms';
const staticSpaRoutes = [
  '/artworks',
  '/cookies-policy',
  '/apps/becoming-an-ai-engineer',
  ...blogMeta.flatMap(({ slug }) => {
    const blogPath = `/blog/${slug}`;
    if (slug !== runtimeOptimizationsSlug) {
      return [blogPath];
    }
    return [
      blogPath,
      ...llmOptimizationSections.map(({ slug: sectionSlug }) => `${blogPath}/${sectionSlug}`),
    ];
  }),
];

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

function staticSpaRoutesPlugin(routes) {
  let outDir;

  return {
    name: 'static-spa-routes',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const indexPath = path.join(outDir, 'index.html');
      const indexHtml = fs.readFileSync(indexPath, 'utf8');

      for (const route of routes) {
        const routeDirectory = route.replace(/^\/+|\/+$/g, '');
        const routePath = path.join(outDir, routeDirectory);
        fs.mkdirSync(routePath, { recursive: true });
        fs.writeFileSync(path.join(routePath, 'index.html'), indexHtml);
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
    staticSpaRoutesPlugin(staticSpaRoutes),
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  build: {
    outDir: 'build',
    emptyOutDir: true
  }
});
