import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function SiteHeader() {
  const { user } = useAuth()
  return (
    <header className="container" style={{ paddingTop: 24 }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, letterSpacing: 0.2 }}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ borderRadius: 8 }}
          >
            <circle cx="16" cy="16" r="16" fill="#222" />
            <rect x="10" y="14" width="12" height="8" rx="2" fill="#fff" />
            <rect x="13" y="11" width="6" height="6" rx="3" fill="none" stroke="#fff" strokeWidth="2" />
            <circle cx="16" cy="18" r="1" fill="#7c3aed" />
          </svg>
          Cursor Auth
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user ? (
            <Link to="/dashboard" className="btn primary">Dashboard</Link>
          ) : (
            <>
              <Link to="/signin" className="btn">Sign in</Link>
              <Link to="/signup" className="btn primary">Create account</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

export default SiteHeader


