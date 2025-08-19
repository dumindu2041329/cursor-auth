import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getActivityPage, getCurrentSession, getUserMeta } from '../auth/api'
import SiteHeader from '../shared/SiteHeader'

function Dashboard() {
  const { user, signOut } = useAuth()
  const [meta, setMeta] = useState<any | null>(null)
  const [session, setSession] = useState<any | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      const [m, s] = await Promise.all([getUserMeta(user.id), getCurrentSession()])
      if (!cancelled) {
        setMeta(m)
        setSession(s)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <>
      <SiteHeader />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 64 }}>
        <div className="surface" style={{ padding: 24, display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ marginTop: 0 }}>Welcome{user ? `, ${user.name}` : ''}</h2>
            <div style={{ color: 'var(--muted)' }}>{user?.email}</div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.16)' }}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.06)' }}>
                <span style={{ color: 'var(--muted)' }}>{user?.name?.[0] ?? '?'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Overview cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <div className="surface" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total logins</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>
              {user ? (meta?.loginCount ?? 0) : '--'}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>
              Last login: {user ? (meta?.lastLoginAt ? new Date(meta.lastLoginAt).toLocaleString() : 'N/A') : '--'}
            </div>
          </div>
          <div className="surface" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Session</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{session ? 'Active' : 'None'}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Started: {session ? new Date(session.startedAt).toLocaleString() : '—'}</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="surface" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Quick actions</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link className="btn" to="/settings">Profile settings</Link>
            <button className="btn" onClick={() => signOut()}>Sign out</button>
          </div>
        </div>

        {/* Recent activity with pagination */}
        <RecentActivity />
        </div>
      </div>
    </>
  )
}

export default Dashboard



function formatDateTime(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(ts))
  } catch {
    return new Date(ts).toISOString()
  }
}

function RecentActivity() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const pageSize = 8
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [user?.id])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      setLoading(true)
      try {
        const data = await getActivityPage(user.id, page, pageSize)
        if (!cancelled) {
          setItems((data as any).items || [])
          setTotal((data as any).total || 0)
          setTotalPages((data as any).totalPages || 1)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id, page])

  if (!user) return null

  return (
    <div className="surface" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Recent activity</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{total} total</div>
      </div>
      <ul style={{ marginTop: 8 }}>
        {loading && <li style={{ color: 'var(--muted)' }}>Loading…</li>}
        {!loading && items.map((a) => (
          <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: 'var(--muted)' }}>
            <span style={{ textTransform: 'capitalize' }}>{a.type}</span>
            <span>{a.message}</span>
            <span title={new Date(a.at).toISOString()} style={{ whiteSpace: 'nowrap' }}>{formatDateTime(a.at)}</span>
          </li>
        ))}
        {!loading && items.length === 0 && (
          <li style={{ color: 'var(--muted)' }}>No recent activity.</li>
        )}
      </ul>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <button className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>Page {page} of {totalPages}</div>
        <button className="btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
      </div>
    </div>
  )
}
