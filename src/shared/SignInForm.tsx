import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from './AuthCard'
import { useAuth } from '../auth/AuthContext'
import GoogleButton from './GoogleButton'

function SignInForm() {
  const { signInWithPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signInWithPassword(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err?.message ?? 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your account">
      <div style={{ marginBottom: 12 }}>
        <GoogleButton clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''} text="signin_with" />
      </div>
      <form style={{ display: 'grid', gap: 12 }} onSubmit={handleSubmit}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="you@example.com" className="surface" style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)', outline: 'none', color: 'var(--text)', background: 'rgba(0,0,0,0.2)' }} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>Password</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" placeholder="••••••••" className="surface" style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)', outline: 'none', color: 'var(--text)', background: 'rgba(0,0,0,0.2)' }} />
        </label>
        {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
        <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
      <div style={{ marginTop: 12, fontSize: 14, color: 'var(--muted)' }}>
        Don't have an account? <Link to="/signup">Create one</Link>
      </div>
    </AuthCard>
  )
}

export default SignInForm


