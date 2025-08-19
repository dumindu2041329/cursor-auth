import { Router, type Request, type Response } from 'express'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { toPublic, type StoredUser, type Activity } from './db'
import { findUserByEmail, insertUser, updateUser, addActivity as supaAddActivity, listActivities, findUserById } from './supabaseRepo'
import { OAuth2Client } from 'google-auth-library'

const router = Router()
router.use(cookieParser())
// No in-memory/file DB injection. Using Supabase per request.

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'
const COOKIE_NAME = 'session'
const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL
const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax' as const, secure: isProd, path: '/' }

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' })
}

async function getUserFromReq(req: Request): Promise<StoredUser | null> {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any
    const user = await findUserById(payload.sub)
    return user || null
  } catch {
    return null
  }
}

async function addActivity(userId: string, type: Activity['type'], message: string) {
  await supaAddActivity(userId, type, message)
}

router.post('/signup', async (req: Request, res: Response) => {
  const { name, email, password } = req.body as { name: string; email: string; password: string }
  const normalizedEmail = email.trim().toLowerCase()
  const existing = await findUserByEmail(normalizedEmail)
  if (existing) return res.status(409).json({ error: 'Email already in use' })
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(password, salt)
  const now = Date.now()
  const user: StoredUser = {
    id: uuid(),
    name: name.trim(),
    email: normalizedEmail,
    avatarUrl: '',
    salt,
    passwordHash,
    createdAt: now,
    updatedAt: now,
    loginCount: 1,
    lastLoginAt: now,
    emailVerified: false,
    provider: 'password',
  }
  await insertUser(user)
  await addActivity(user.id, 'account', 'Account created')
  await addActivity(user.id, 'auth', 'Signed in')
  const token = signToken(user.id)
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS)
  res.json({ user: toPublic(user) })
})

router.post('/signin', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string }
  const normalizedEmail = email.trim().toLowerCase()
  const user = await findUserByEmail(normalizedEmail)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const updated = await updateUser(user.id, { loginCount: (user.loginCount ?? 0) + 1, lastLoginAt: Date.now(), updatedAt: Date.now() })
  await addActivity(user.id, 'auth', 'Signed in')
  const token = signToken(user.id)
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS)
  res.json({ user: toPublic(updated) })
})

router.post('/signout', async (req: Request, res: Response) => {
  const user = await getUserFromReq(req)
  if (user) await addActivity(user.id, 'auth', 'Signed out')
  res.clearCookie(COOKIE_NAME, COOKIE_OPTS)
  res.status(204).end()
})

router.get('/me', async (req: Request, res: Response) => {
  const user = await getUserFromReq(req)
  if (!user) return res.status(200).json({ user: null })
  res.json({ user: toPublic(user) })
})

router.patch('/profile', async (req: Request, res: Response) => {
  const user = await getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  const updates = req.body as Partial<Pick<StoredUser, 'name' | 'email' | 'avatarUrl'>>
  if (updates.email) {
    const email = updates.email.trim().toLowerCase()
    const existing = await findUserByEmail(email)
    if (existing && existing.id !== user.id) return res.status(409).json({ error: 'Email already in use' })
    user.email = email
  }
  if (typeof updates.name === 'string') user.name = updates.name
  if (typeof updates.avatarUrl === 'string') user.avatarUrl = updates.avatarUrl
  user.updatedAt = Date.now()
  const saved = await updateUser(user.id, user)
  await addActivity(user.id, 'profile', 'Updated profile')
  res.json({ user: toPublic(saved) })
})

router.post('/password', async (req: Request, res: Response) => {
  const user = await getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string }
  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) return res.status(400).json({ error: 'Current password is incorrect' })
  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(newPassword, salt)
  user.salt = salt
  user.passwordHash = hash
  user.updatedAt = Date.now()
  await updateUser(user.id, user)
  await addActivity(user.id, 'security', 'Changed password')
  res.status(204).end()
})

router.get('/activity', async (req: Request, res: Response) => {
  const user = await getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  const page = Math.max(1, parseInt(String(req.query.page ?? '1')) || 1)
  const pageSize = Math.max(1, Math.min(100, parseInt(String(req.query.pageSize ?? '10')) || 10))
  const { items, total } = await listActivities(user.id, page, pageSize)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  res.json({ items, total, page: safePage, pageSize, totalPages })
})

router.get('/meta', async (req: Request, res: Response) => {
  const user = await getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  res.json({
    meta: {
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      loginCount: user.loginCount,
      lastLoginAt: user.lastLoginAt,
      emailVerified: !!user.emailVerified,
    }
  })
})

router.get('/session', (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return res.json({ session: null })
  try {
    const payload: any = jwt.verify(token, JWT_SECRET)
    const startedAt = payload.iat ? payload.iat * 1000 : Date.now()
    return res.json({ session: { startedAt } })
  } catch {
    return res.json({ session: null })
  }
})

// replaced by Google library verification

router.post('/google', async (req: Request, res: Response) => {
  const { idToken } = req.body as { idToken: string }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return res.status(500).json({ error: 'Server not configured for Google login' })
  const client = new OAuth2Client(clientId)
  let payload: any
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId })
    payload = ticket.getPayload()
  } catch {
    return res.status(401).json({ error: 'Invalid Google token' })
  }

  if (!payload?.email) return res.status(400).json({ error: 'Invalid Google token' })
  const email = String(payload.email).trim().toLowerCase()
  const now = Date.now()
  let user = await findUserByEmail(email)
  if (!user) {
    user = {
      id: uuid(),
      name: String(payload.name ?? email.split('@')[0]),
      email,
      avatarUrl: String(payload.picture ?? ''),
      salt: 'oauth-google',
      passwordHash: 'oauth-google',
      createdAt: now,
      updatedAt: now,
      loginCount: 0,
      lastLoginAt: null,
      emailVerified: !!payload.email_verified,
      provider: 'google',
    }
    await insertUser(user)
    await addActivity(user.id, 'account', 'Account created (Google)')
  }
  await updateUser(user.id, { loginCount: (user.loginCount ?? 0) + 1, lastLoginAt: now, updatedAt: now })
  await addActivity(user.id, 'auth', 'Signed in with Google')
  const token = signToken(user.id)
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS)
  res.json({ user: toPublic(user) })
})

export default router


