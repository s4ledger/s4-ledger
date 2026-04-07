#!/usr/bin/env node
/**
 * validate-env.js — Pre-build environment variable validation
 *
 * In production mode (VITE_APP_MODE=production), ensures all
 * required env vars are set before building. In demo mode,
 * only warns about missing optional vars.
 */

const mode = process.env.VITE_APP_MODE || 'demo'

const REQUIRED_PRODUCTION = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
]

const RECOMMENDED = [
  'VITE_SENTRY_DSN',
  'VITE_AZURE_TENANT_ID',
  'VITE_AZURE_CLIENT_ID',
  'VITE_PMS300_SITE_ID',
  'VITE_PMS300_DRL_LIST_ID',
]

console.log(`[validate-env] Mode: ${mode}`)

if (mode === 'production') {
  const missing = REQUIRED_PRODUCTION.filter(v => !process.env[v])
  if (missing.length > 0) {
    console.error(`\n❌ PRODUCTION BUILD BLOCKED — missing required env vars:\n`)
    for (const v of missing) {
      console.error(`   • ${v}`)
    }
    console.error(`\nSet these in your .env or CI/CD environment.\n`)
    process.exit(1)
  }
  console.log(`[validate-env] ✅ All required production vars present`)
}

// Warn about recommended vars (both modes)
const missingRec = RECOMMENDED.filter(v => !process.env[v])
if (missingRec.length > 0) {
  console.log(`[validate-env] ⚠️  Optional vars not set (features will be disabled):`)
  for (const v of missingRec) {
    console.log(`   • ${v}`)
  }
}

console.log(`[validate-env] Done\n`)
