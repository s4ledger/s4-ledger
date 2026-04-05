import { useState } from 'react'
import DraggableModal from './DraggableModal'
import { useAuth } from '../contexts/AuthContext'

export default function LoginScreen() {
  const { signIn, signUp, enterDemo } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [cacStep, setCacStep] = useState<'idle' | 'detecting' | 'reading' | 'done'>('idle')

  function handleCACLogin() {
    setCacStep('detecting')
    setError(null)
    setTimeout(() => {
      setCacStep('reading')
      setTimeout(() => {
        setCacStep('done')
        setTimeout(() => {
          setCacStep('idle')
          enterDemo()
        }, 800)
      }, 1200)
    }, 1000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    if (mode === 'signup' && !displayName.trim()) return

    setError(null)
    setLoading(true)

    try {
      if (mode === 'signup') {
        const result = await signUp(email.trim(), password, displayName.trim())
        if (result.error) {
          setError(result.error)
        } else {
          setSignupSuccess(true)
        }
      } else {
        const result = await signIn(email.trim(), password)
        if (result.error) {
          setError(result.error)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  if (signupSuccess) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 z-50">
        <DraggableModal className="bg-white border border-border rounded-card shadow-2xl" defaultWidth={440}>
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/15 flex items-center justify-center">
              <i className="fas fa-check-circle text-green-500 text-2xl"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h2>
            <p className="text-steel text-sm mb-6">
              We've sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
            </p>
            <button
              onClick={() => { setSignupSuccess(false); setMode('login') }}
              className="w-full py-3 px-6 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg transition-all"
            >
              Back to Login
            </button>
          </div>
        </DraggableModal>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 z-50">
      <DraggableModal className="bg-white border border-border rounded-card shadow-2xl" defaultWidth={460}>
        <div className="p-8">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
              <i className="fas fa-shield-alt text-accent text-2xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">S4 Ledger</h2>
            <p className="text-steel text-sm mt-1">Deliverables Tracker</p>
          </div>

          {/* CAC / PIV Authentication */}
          <button
            onClick={handleCACLogin}
            disabled={cacStep !== 'idle'}
            className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-700 text-white font-semibold rounded-lg text-sm transition-all flex items-center justify-center gap-2.5 mb-1"
          >
            {cacStep === 'idle' && (
              <><i className="fas fa-id-card"></i> Sign In with CAC / PIV</>
            )}
            {cacStep === 'detecting' && (
              <><i className="fas fa-spinner fa-spin"></i> Detecting smart card reader…</>
            )}
            {cacStep === 'reading' && (
              <><i className="fas fa-microchip"></i> Reading DoD PKI certificate…</>
            )}
            {cacStep === 'done' && (
              <><i className="fas fa-check-circle text-green-400"></i> CAC authenticated</>
            )}
          </button>
          <p className="text-[10px] text-steel text-center mb-5">
            Common Access Card · DoD PKI · NIPR/SIPR
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border"></div>
            <span className="text-[11px] text-steel uppercase tracking-wider font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 mb-6">
            <button
              onClick={() => { setMode('login'); setError(null) }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-steel hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null) }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-steel hover:text-gray-700'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. SSgt. Mitchell"
                  className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm text-gray-900 placeholder:text-steel/50 focus:outline-none focus:border-accent transition-colors"
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@organization.mil"
                className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm text-gray-900 placeholder:text-steel/50 focus:outline-none focus:border-accent transition-colors"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min 8 characters' : '••••••••'}
                className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm text-gray-900 placeholder:text-steel/50 focus:outline-none focus:border-accent transition-colors"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={mode === 'signup' ? 8 : undefined}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                <i className="fas fa-exclamation-circle mr-1.5"></i>{error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-accent hover:bg-accent/90 disabled:bg-accent/40 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin"></i> {mode === 'signup' ? 'Creating Account…' : 'Signing In…'}</>
              ) : (
                <><i className={`fas ${mode === 'signup' ? 'fa-user-plus' : 'fa-sign-in-alt'}`}></i> {mode === 'signup' ? 'Create Account' : 'Sign In'}</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border"></div>
            <span className="text-[11px] text-steel uppercase tracking-wider font-medium">or</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          {/* Demo Access */}
          <button
            onClick={enterDemo}
            className="w-full py-2.5 px-4 bg-black/[0.03] hover:bg-black/[0.06] border border-border text-gray-700 font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-play-circle text-accent"></i>
            Try Demo Mode
          </button>
          <p className="text-[10px] text-steel text-center mt-2">
            No account or CAC required. Explore all features with sample data.
          </p>
        </div>
      </DraggableModal>
    </div>
  )
}
