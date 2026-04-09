/**
 * ═══════════════════════════════════════════════════════════════
 *  Sentry — Error Tracking & Performance Monitoring
 *  Initializes only when VITE_SENTRY_DSN is set.
 * ═══════════════════════════════════════════════════════════════
 */

import * as Sentry from '@sentry/react'

declare const __APP_VERSION__: string

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

export function initSentry() {
  if (!DSN) return

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,       // 'development' | 'production'
    release: `s4-demo@${__APP_VERSION__}`,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: 0.2,                   // 20% of transactions
    replaysSessionSampleRate: 0.1,           // 10% of sessions
    replaysOnErrorSampleRate: 1.0,           // 100% of error sessions
    beforeSend(event) {
      // Strip PII from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(b => {
          if (b.data?.url) {
            try {
              const url = new URL(b.data.url as string)
              url.searchParams.delete('token')
              url.searchParams.delete('apikey')
              b.data.url = url.toString()
            } catch { /* not a URL */ }
          }
          return b
        })
      }
      return event
    },
  })
}

export { Sentry }

/* ── Web Vitals → Sentry ──────────────────────────────────────── */

export function reportWebVitals() {
  import('web-vitals').then(({ onCLS, onLCP, onFCP, onTTFB, onINP }) => {
    const send = (metric: { name: string; value: number; id: string }) => {
      Sentry.setMeasurement(`web_vital.${metric.name}`, metric.value, metric.name === 'CLS' ? '' : 'millisecond')
    }
    onCLS(send)
    onLCP(send)
    onFCP(send)
    onTTFB(send)
    onINP(send)
  }).catch(() => { /* web-vitals unavailable */ })
}
