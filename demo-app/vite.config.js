import { defineConfig } from 'vite'
import { resolve } from 'path'

// S4 Ledger Demo — Vite Build Configuration
export default defineConfig({
  root: 'src',
  base: '/demo-app/dist/',
  publicDir: '../public',

  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,

    rollupOptions: {
      input: resolve(__dirname, 'src/index.html'),
      output: {
        manualChunks: {
          'engine': [resolve(__dirname, 'src/js/engine.js')],
          'enhancements': [resolve(__dirname, 'src/js/enhancements.js')],
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    target: 'es2020',
    minify: 'esbuild',
    chunkSizeWarningLimit: 500,
  },

  server: {
    port: 3001,
    open: true,
  },
})
