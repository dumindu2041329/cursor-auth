import type { PropsWithChildren } from 'react'

type AuthCardProps = PropsWithChildren<{
  title: string
  subtitle?: string
}>

function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div style={{ display: 'grid', placeItems: 'center' }}>
      <div className="surface" style={{ width: '100%', maxWidth: 480, padding: 24 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, letterSpacing: 0.2 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(180deg, #7c3aed, #5b21b6)' }} />
            Cursor Auth
          </div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          {subtitle && <p style={{ marginTop: 4, color: 'var(--muted)' }}>{subtitle}</p>}
        </div>
        <div style={{ marginTop: 16 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default AuthCard


