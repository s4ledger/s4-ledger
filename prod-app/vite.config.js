import { defineConfig } from 'vite'
import { resolve } from 'path'

// S4 Ledger — Vite Build Configuration
// Builds the modular source files into optimized production bundles.
// The build output goes to dist/ which Vercel serves.
export default defineConfig({
  root: 'src',
  base: '/prod-app/dist/',
  publicDir: '../public',

  build: {
    outDir: '../dist',
    emptyOutDir: true,

    // Disable source maps in production (security + performance)
    sourcemap: false,

    rollupOptions: {
      input: resolve(__dirname, 'src/index.html'),

      // Tree-shaking is safe: window.xyz = fn assignments are side-effectful
      // and Rollup preserves them. Verified by demo-app which uses default
      // treeshake: true with the same codebase.

      output: {
        // Split vendor chunks for better caching
        manualChunks: {
          // The main engine is the largest chunk (~8.5K lines source)
          'engine': [resolve(__dirname, 'src/js/engine.js')],
          // Enhancement suite is the second largest (~7.3K lines source)
          'enhancements': [resolve(__dirname, 'src/js/enhancements.js')],
          // Navigation + roles + onboarding (HIW buttons, role selector, wizard)
          'navigation': [
            resolve(__dirname, 'src/js/navigation.js'),
            resolve(__dirname, 'src/js/roles.js'),
            resolve(__dirname, 'src/js/onboarding.js'),
          ],
          // Metrics + observability
          'metrics': [
            resolve(__dirname, 'src/js/metrics.js'),
            resolve(__dirname, 'src/js/web-vitals.js'),
          ],
          // Everything else bundles together as 'core'
        },
        // Use content hashes for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    // Target modern browsers (DoD uses Edge/Chrome on Flankspeed)
    target: 'es2020',

    // Minification — use terser to preserve window-exported functions
    // esbuild's dead code elimination removes functions only referenced
    // via window.xyz = xyz (not detectable as ES module exports)
    minify: 'terser',
    terserOptions: {
      compress: {
        dead_code: true,
        unused: true,
        side_effects: false,
        drop_console: true,   // Strip console.log in production
        drop_debugger: true,  // Strip debugger statements
      },
      mangle: true,
    },

    // Warn if chunks exceed 500KB
    chunkSizeWarningLimit: 500,
  },

  // Dev server configuration
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'https://s4ledger.com',
        changeOrigin: true,
      },
    },
  },
})
