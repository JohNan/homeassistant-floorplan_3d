import { defineConfig } from 'vite';
import { resolve } from 'path';

const rootDir = import.meta.dirname;

export default defineConfig({
  build: {
    outDir: resolve(rootDir, 'custom_components/floorplan_3d/frontend/dist'),
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    target: 'es2022',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        'floorplan-panel': resolve(rootDir, 'src/editor/floorplan-editor-panel.ts'),
        'floorplan-card': resolve(rootDir, 'src/card/floorplan-3d-card.ts')
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three-vendor';
          }
          if (id.includes('node_modules/konva')) {
            return 'konva-vendor';
          }
          if (id.includes('node_modules/lit') || id.includes('node_modules/@lit')) {
            return 'lit-vendor';
          }
          return undefined;
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    globals: true
  }
});

