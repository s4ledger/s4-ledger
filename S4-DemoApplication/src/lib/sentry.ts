/**
 * ═══════════════════════════════════════════════════════════════
 *  Sentry — Error Tracking & Performance Monitoring
 *  Initializes only when VITE_SENTRY_DSN is set.
 * ═══════════════════════════════════════════════════════════════
 */

import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

export function initSentry() {
  if (!DSN) return

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,       // 'development' | 'production'
    release: 's4-demo@8.3.0',
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
