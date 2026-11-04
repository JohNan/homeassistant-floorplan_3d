import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: resolve(__dirname, 'custom_components/floorplan_3d/frontend/dist'),
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2022',
    rollupOptions: {
      input: {
        'floorplan-panel': resolve(__dirname, 'src/editor/floorplan-editor-panel.ts'),
        'floorplan-card': resolve(__dirname, 'src/card/floorplan-3d-card.ts')
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    globals: true
  }
});
