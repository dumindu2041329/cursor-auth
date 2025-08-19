export type PublicUser = {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

const API_BASE = '/api/auth'

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  return text ? (JSON.parse(text) as T) : ({} as T)
}

export async function signUp(name: string, email: string, password: string): Promise<PublicUser> {
  const res = await fetch(`${API_BASE}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  const data = await parseJson<{ user?: PublicUser; error?: string }>(res)
  if (!res.ok) throw new Error(data.error || 'Sign up failed')
  return data.user as PublicUser
}

export async function signIn(email: string, password: string): Promise<PublicUser> {
  const res = await fetch(`${API_BASE}/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await parseJson<{ user?: PublicUser; error?: string }>(res)
  if (!res.ok) throw new Error(data.error || 'Sign in failed')
  return data.user as PublicUser
}

export async function signOut(): Promise<void> {
  await fetch(`${API_BASE}/signout`, { method: 'POST' })
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const res = await fetch(`${API_BASE}/me`)
  if (!res.ok) return null
  const data = await parseJson<{ user: PublicUser | null }>(res)
  return data.user ?? null
}

export function onAuthChange(_callback: (user: PublicUser | null) => void) {
  return () => {}
}

export async function updateProfile(updates: Partial<Pick<PublicUser, 'name' | 'email' | 'avatarUrl'>>): Promise<PublicUser> {
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  const data = await parseJson<{ user?: PublicUser; error?: string }>(res)
  if (!res.ok) throw new Error(data.error || 'Update failed')
  return data.user as PublicUser
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  if (!res.ok) {
    const data = await parseJson<{ error?: string }>(res)
    throw new Error(data.error || 'Password change failed')
  }
}

export async function signInWithGoogleIdToken(idToken: string): Promise<PublicUser> {
  const res = await fetch(`${API_BASE}/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  const data = await parseJson<{ user?: PublicUser; error?: string }>(res)
  if (!res.ok) throw new Error(data.error || 'Google sign-in failed')
  return data.user as PublicUser
}

// Dashboard helpers
export async function getActivityPage(
  _userId: string,
  page = 1,
  pageSize = 10,
): Promise<{ items: Array<{ id: string; type: string; message: string; at: number }>; total: number; page: number; pageSize: number; totalPages: number } | { items: never[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const url = new URL(`${API_BASE}/activity`, window.location.origin)
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(pageSize))
  const res = await fetch(url)
  if (!res.ok) return { items: [], total: 0, page: 1, pageSize, totalPages: 1 }
  return parseJson(res)
}

export async function getUserMeta(_userId: string): Promise<{
  createdAt: number
  updatedAt: number
  loginCount: number
  lastLoginAt: number | null
  emailVerified: boolean
} | null> {
  const res = await fetch(`${API_BASE}/meta`)
  if (!res.ok) return null
  const data = await parseJson<{ meta: any }>(res)
  return data.meta
}

export async function getCurrentSession(): Promise<{ startedAt: number } | null> {
  const res = await fetch(`${API_BASE}/session`)
  if (!res.ok) return null
  const data = await parseJson<{ session: { startedAt: number } | null }>(res)
  return data.session
}


