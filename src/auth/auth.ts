// Deprecated: replaced by server-backed API client in ./api.ts

export type PublicUser = {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

type StoredUser = PublicUser & {
  salt: string
  passwordHash: string
  createdAt: number
  updatedAt: number
  loginCount: number
  lastLoginAt: number | null
  emailVerified?: boolean
}

type Session = {
  userId: string
  token: string
  createdAt: number
}

const USERS_KEY = 'auth_users'
const SESSION_KEY = 'auth_session'
const ACTIVITY_PREFIX = 'auth_activity_'

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as StoredUser[]) : []
  } catch {
    return []
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function writeSession(session: Session | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toBase64(new Uint8Array(digest))
}

function createSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toBase64(bytes)
}

function toPublic(user: StoredUser): PublicUser {
  const { id, name, email } = user
  return { id, name, email, avatarUrl: user.avatarUrl }
}

export async function signUp(name: string, email: string, password: string): Promise<PublicUser> {
  const normalizedEmail = email.trim().toLowerCase()
  const users = readUsers()
  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error('Email already in use')
  }
  const salt = createSalt()
  const passwordHash = await hashPassword(password, salt)
  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    avatarUrl: '',
    salt,
    passwordHash,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    loginCount: 1,
    lastLoginAt: Date.now(),
    emailVerified: false,
  }
  users.push(newUser)
  writeUsers(users)
  // Create session
  const session: Session = { userId: newUser.id, token: crypto.randomUUID(), createdAt: Date.now() }
  writeSession(session)
  logActivity(newUser.id, 'account', 'Account created')
  logActivity(newUser.id, 'auth', 'Signed in')
  return toPublic(newUser)
}

export async function signIn(email: string, password: string): Promise<PublicUser> {
  const normalizedEmail = email.trim().toLowerCase()
  const users = readUsers()
  const found = users.find((u) => u.email === normalizedEmail)
  if (!found) throw new Error('Invalid email or password')
  const passwordHash = await hashPassword(password, found.salt)
  if (passwordHash !== found.passwordHash) throw new Error('Invalid email or password')
  // update meta
  const idx = users.findIndex((u) => u.id === found.id)
  let userRecord: StoredUser = found
  if (idx !== -1) {
    const updated: StoredUser = { ...users[idx], loginCount: (users[idx].loginCount ?? 0) + 1, lastLoginAt: Date.now(), updatedAt: Date.now() }
    users[idx] = updated
    writeUsers(users)
    userRecord = updated
  }
  const session: Session = { userId: userRecord.id, token: crypto.randomUUID(), createdAt: Date.now() }
  writeSession(session)
  logActivity(userRecord.id, 'auth', 'Signed in')
  return toPublic(userRecord)
}

export async function signOut(): Promise<void> {
  const s = readSession()
  if (s) logActivity(s.userId, 'auth', 'Signed out')
  writeSession(null)
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const session = readSession()
  if (!session) return null
  const users = readUsers()
  const user = users.find((u) => u.id === session.userId)
  return user ? toPublic(user) : null
}

export function onAuthChange(callback: (user: PublicUser | null) => void) {
  const handler = async () => {
    const user = await getCurrentUser()
    callback(user)
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

export async function updateProfile(updates: Partial<Pick<PublicUser, 'name' | 'email' | 'avatarUrl'>>): Promise<PublicUser> {
  const session = readSession()
  if (!session) throw new Error('Not authenticated')
  const users = readUsers()
  const idx = users.findIndex((u) => u.id === session.userId)
  if (idx === -1) throw new Error('User not found')
  const current = users[idx]
  let nextEmail = current.email
  if (typeof updates.email === 'string' && updates.email.trim().toLowerCase() !== current.email) {
    nextEmail = updates.email.trim().toLowerCase()
    if (users.some((u) => u.email === nextEmail && u.id !== current.id)) {
      throw new Error('Email already in use')
    }
  }
  const next: StoredUser = {
    ...current,
    name: typeof updates.name === 'string' ? updates.name.trim() : current.name,
    email: nextEmail,
    avatarUrl: typeof updates.avatarUrl === 'string' ? updates.avatarUrl : current.avatarUrl,
    updatedAt: Date.now(),
  }
  users[idx] = next
  writeUsers(users)
  logActivity(current.id, 'profile', 'Updated profile')
  return toPublic(next)
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const session = readSession()
  if (!session) throw new Error('Not authenticated')
  const users = readUsers()
  const idx = users.findIndex((u) => u.id === session.userId)
  if (idx === -1) throw new Error('User not found')
  const user = users[idx]
  const currentHash = await hashPassword(currentPassword, user.salt)
  if (currentHash !== user.passwordHash) throw new Error('Current password is incorrect')
  const newSalt = createSalt()
  const newHash = await hashPassword(newPassword, newSalt)
  users[idx] = { ...user, salt: newSalt, passwordHash: newHash, updatedAt: Date.now() }
  writeUsers(users)
  logActivity(user.id, 'security', 'Changed password')
}

// Activity log helpers
export type Activity = { id: string; type: 'auth' | 'profile' | 'security' | 'account'; message: string; at: number }

function getActivityKey(userId: string) {
  return ACTIVITY_PREFIX + userId
}

export function logActivity(userId: string, type: Activity['type'], message: string) {
  try {
    const key = getActivityKey(userId)
    const raw = localStorage.getItem(key)
    const list: Activity[] = raw ? (JSON.parse(raw) as Activity[]) : []
    list.unshift({ id: crypto.randomUUID(), type, message, at: Date.now() })
    const trimmed = list.slice(0, 50)
    localStorage.setItem(key, JSON.stringify(trimmed))
  } catch {}
}

export function getRecentActivity(userId: string, limit = 10): Activity[] {
  try {
    const raw = localStorage.getItem(getActivityKey(userId))
    const list: Activity[] = raw ? (JSON.parse(raw) as Activity[]) : []
    return list.slice(0, limit)
  } catch {
    return []
  }
}

export function getActivityPage(
  userId: string,
  page = 1,
  pageSize = 10,
): { items: Activity[]; total: number; page: number; pageSize: number; totalPages: number } {
  try {
    const raw = localStorage.getItem(getActivityKey(userId))
    const list: Activity[] = raw ? (JSON.parse(raw) as Activity[]) : []
    const total = list.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(Math.max(1, page), totalPages)
    const start = (safePage - 1) * pageSize
    const end = start + pageSize
    const items = list.slice(start, end)
    return { items, total, page: safePage, pageSize, totalPages }
  } catch {
    return { items: [], total: 0, page: 1, pageSize, totalPages: 1 }
  }
}

export type UserMeta = {
  createdAt: number
  updatedAt: number
  loginCount: number
  lastLoginAt: number | null
  emailVerified: boolean
}

export function getUserMeta(userId: string): UserMeta | null {
  const users = readUsers()
  const u = users.find((x) => x.id === userId)
  if (!u) return null
  return {
    createdAt: u.createdAt ?? Date.now(),
    updatedAt: u.updatedAt ?? Date.now(),
    loginCount: u.loginCount ?? 0,
    lastLoginAt: u.lastLoginAt ?? null,
    emailVerified: !!u.emailVerified,
  }
}

export function getCurrentSession(): Session | null {
  return readSession()
}

export function getProfileCompleteness(user: PublicUser): number {
  let score = 0
  if (user.name) score += 1
  if (user.email) score += 1
  if (user.avatarUrl) score += 1
  return Math.round((score / 3) * 100)
}

// Google OAuth (client-only demo) -------------------------------------------
function base64UrlDecode(input: string): string {
  // Replace non-url compatible chars with base64 standard chars
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with trailing '='s
  const pad = input.length % 4;
  if (pad) input += '='.repeat(4 - pad);
  // atob decode
  try {
    return atob(input)
  } catch {
    return ''
  }
}

export function decodeJwtPayload<T = any>(jwt: string): T | null {
  const parts = jwt.split('.')
  if (parts.length !== 3) return null
  try {
    const json = base64UrlDecode(parts[1])
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

type GoogleIdToken = {
  sub: string
  name?: string
  email?: string
  picture?: string
  email_verified?: boolean
}

export async function signInWithGoogleIdToken(idToken: string): Promise<PublicUser> {
  const payload = decodeJwtPayload<GoogleIdToken>(idToken)
  if (!payload || !payload.email) throw new Error('Invalid Google token')
  const normalizedEmail = payload.email.trim().toLowerCase()
  const users = readUsers()
  const existingIdx = users.findIndex((u) => u.email === normalizedEmail)
  const now = Date.now()
  if (existingIdx !== -1) {
    const current = users[existingIdx]
    const updated: StoredUser = {
      ...current,
      name: payload.name ?? current.name,
      avatarUrl: payload.picture ?? current.avatarUrl,
      updatedAt: now,
      lastLoginAt: now,
      loginCount: (current.loginCount ?? 0) + 1,
      emailVerified: payload.email_verified ?? current.emailVerified,
    }
    users[existingIdx] = updated
    writeUsers(users)
    const session: Session = { userId: updated.id, token: crypto.randomUUID(), createdAt: now }
    writeSession(session)
    logActivity(updated.id, 'auth', 'Signed in with Google')
    return toPublic(updated)
  }

  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    name: payload.name ?? normalizedEmail.split('@')[0],
    email: normalizedEmail,
    avatarUrl: payload.picture ?? '',
    // Mark as oauth user; password fields are placeholders
    salt: 'oauth-google',
    passwordHash: 'oauth-google',
    createdAt: now,
    updatedAt: now,
    loginCount: 1,
    lastLoginAt: now,
    emailVerified: payload.email_verified ?? true,
  }
  users.push(newUser)
  writeUsers(users)
  const session: Session = { userId: newUser.id, token: crypto.randomUUID(), createdAt: now }
  writeSession(session)
  logActivity(newUser.id, 'account', 'Account created (Google)')
  logActivity(newUser.id, 'auth', 'Signed in with Google')
  return toPublic(newUser)
}


