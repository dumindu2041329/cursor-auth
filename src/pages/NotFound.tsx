import { Link, useNavigate } from 'react-router-dom'

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="container" style={{ paddingTop: 80, paddingBottom: 80 }}>
      <div className="surface" style={{ padding: 32, display: 'grid', gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1 }}>404</div>
        <h2 style={{ margin: 0 }}>Page not found</h2>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button className="btn" onClick={() => navigate(-1)}>Go back</button>
          <Link to="/" className="btn primary">Go home</Link>
          <Link to="/signin" className="btn">Sign in</Link>
          <Link to="/signup" className="btn">Create account</Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound


