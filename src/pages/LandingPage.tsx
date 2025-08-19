import { Link, useLocation, useNavigate } from 'react-router-dom'
import SiteHeader from '../shared/SiteHeader'
import { useAuth } from '../auth/AuthContext'
import Modal from '../shared/Modal'
import SignInForm from '../shared/SignInForm'
import SignUpForm from '../shared/SignUpForm'

function LandingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isSignInOpen = location.pathname === '/signin'
  const isSignUpOpen = location.pathname === '/signup'

  const closeModal = () => navigate('/', { replace: true })
  return (
    <>
      <SiteHeader />

      <main className="container" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          <div>
            <h1 style={{ fontSize: 56, margin: 0, lineHeight: 1.05 }}>Authentication that just works</h1>
            <p style={{ marginTop: 16, color: 'var(--muted)', fontSize: 18 }}>
              Secure sign-in, sign-up, and session management. Drop-in UI, robust patterns, and clean code so you can ship faster.
            </p>
            <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {!user && (
                <Link to="/signup" className="btn primary">Get started</Link>
              )}
            </div>
            <ul style={{ marginTop: 28, paddingLeft: 18, color: 'var(--muted)' }}>
              <li>Built with React + Vite</li>
              <li>Router-ready pages</li>
              <li>Accessible, responsive layout</li>
            </ul>
          </div>
          <div>
            <div className="surface" style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="surface" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Auth</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>Sign In</div>
                </div>
                <div className="surface" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Auth</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>Sign Up</div>
                </div>
                <div className="surface" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Security</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>MFA Ready</div>
                </div>
                <div className="surface" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Sessions</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>JWT or Cookies</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 80 }}>
          <div className="surface" style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Features</div>
                <h3 style={{ marginTop: 6 }}>Email + Social Login</h3>
                <p style={{ color: 'var(--muted)' }}>Plug in providers easily and keep your users safe.</p>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Developer-first</div>
                <h3 style={{ marginTop: 6 }}>TypeScript APIs</h3>
                <p style={{ color: 'var(--muted)' }}>Strongly typed routes and utilities out of the box.</p>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>UI</div>
                <h3 style={{ marginTop: 6 }}>Accessible Components</h3>
                <p style={{ color: 'var(--muted)' }}>Keyboard-first focus order and screen-reader friendly.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="container" style={{ paddingBottom: 32, paddingTop: 24, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
        <div>© {new Date().getFullYear()} Cursor Auth</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
      </footer>

      <Modal open={isSignInOpen} title="Sign in" onClose={closeModal}>
        <SignInForm />
      </Modal>
      <Modal open={isSignUpOpen} title="Create account" onClose={closeModal}>
        <SignUpForm />
      </Modal>
    </>
  )
}

export default LandingPage


