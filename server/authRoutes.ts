import { Router, type Request, type Response } from 'express'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { readDb, writeDb, toPublic, type StoredUser, type Activity } from './db'
import { OAuth2Client } from 'google-auth-library'

const router = Router()
router.use(cookieParser())
router.use((req, _res, next) => {
  ;(req as any).db = readDb()
  next()
})

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'
const COOKIE_NAME = 'session'
const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL
const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax' as const, secure: isProd, path: '/' }

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' })
}

function getUserFromReq(req: Request): StoredUser | null {
  const db = (req as any).db as ReturnType<typeof readDb>
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any
    const user = db.users.find((u) => u.id === payload.sub)
    return user || null
  } catch {
    return null
  }
}

function addActivity(db: ReturnType<typeof readDb>, userId: string, type: Activity['type'], message: string) {
  db.activities.unshift({ id: uuid(), userId, type, message, at: Date.now() })
}

router.post('/signup', async (req: Request, res: Response) => {
  const { name, email, password } = req.body as { name: string; email: string; password: string }
  const db = (req as any).db as ReturnType<typeof readDb>
  const normalizedEmail = email.trim().toLowerCase()
  if (db.users.some((u) => u.email === normalizedEmail)) return res.status(409).json({ error: 'Email already in use' })
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
  db.users.push(user)
  writeDb(db)
  addActivity(db, user.id, 'account', 'Account created')
  addActivity(db, user.id, 'auth', 'Signed in')
  const token = signToken(user.id)
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS)
  res.json({ user: toPublic(user) })
})

router.post('/signin', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string }
  const db = (req as any).db as ReturnType<typeof readDb>
  const normalizedEmail = email.trim().toLowerCase()
  const user = db.users.find((u) => u.email === normalizedEmail)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  user.loginCount = (user.loginCount ?? 0) + 1
  user.lastLoginAt = Date.now()
  user.updatedAt = Date.now()
  writeDb(db)
  addActivity(db, user.id, 'auth', 'Signed in')
  const token = signToken(user.id)
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS)
  res.json({ user: toPublic(user) })
})

router.post('/signout', (req: Request, res: Response) => {
  const db = (req as any).db as ReturnType<typeof readDb>
  const user = getUserFromReq(req)
  if (user) {
    addActivity(db, user.id, 'auth', 'Signed out')
    writeDb(db)
  }
  res.clearCookie(COOKIE_NAME, COOKIE_OPTS)
  res.status(204).end()
})

router.get('/me', (req: Request, res: Response) => {
  const user = getUserFromReq(req)
  if (!user) return res.status(200).json({ user: null })
  res.json({ user: toPublic(user) })
})

router.patch('/profile', (req: Request, res: Response) => {
  const db = (req as any).db as ReturnType<typeof readDb>
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  const updates = req.body as Partial<Pick<StoredUser, 'name' | 'email' | 'avatarUrl'>>
  if (updates.email) {
    const email = updates.email.trim().toLowerCase()
    if (db.users.some((u) => u.email === email && u.id !== user.id)) return res.status(409).json({ error: 'Email already in use' })
    user.email = email
  }
  if (typeof updates.name === 'string') user.name = updates.name
  if (typeof updates.avatarUrl === 'string') user.avatarUrl = updates.avatarUrl
  user.updatedAt = Date.now()
  writeDb(db)
  addActivity(db, user.id, 'profile', 'Updated profile')
  res.json({ user: toPublic(user) })
})

router.post('/password', async (req: Request, res: Response) => {
  const db = (req as any).db as ReturnType<typeof readDb>
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string }
  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) return res.status(400).json({ error: 'Current password is incorrect' })
  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(newPassword, salt)
  user.salt = salt
  user.passwordHash = hash
  user.updatedAt = Date.now()
  writeDb(db)
  addActivity(db, user.id, 'security', 'Changed password')
  res.status(204).end()
})

router.get('/activity', (req: Request, res: Response) => {
  const db = (req as any).db as ReturnType<typeof readDb>
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  const page = Math.max(1, parseInt(String(req.query.page ?? '1')) || 1)
  const pageSize = Math.max(1, Math.min(100, parseInt(String(req.query.pageSize ?? '10')) || 10))
  const itemsAll = db.activities.filter((a) => a.userId === user.id)
  const total = itemsAll.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const end = start + pageSize
  const items = itemsAll.slice(start, end)
  res.json({ items, total, page: safePage, pageSize, totalPages })
})

router.get('/meta', (req: Request, res: Response) => {
  const user = getUserFromReq(req)
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
  const db = (req as any).db as ReturnType<typeof readDb>
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
  let user = db.users.find((u) => u.email === email)
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
    db.users.push(user)
    addActivity(db, user.id, 'account', 'Account created (Google)')
  }
  user.loginCount = (user.loginCount ?? 0) + 1
  user.lastLoginAt = now
  user.updatedAt = now
  writeDb(db)
  addActivity(db, user.id, 'auth', 'Signed in with Google')
  const token = signToken(user.id)
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS)
  res.json({ user: toPublic(user) })
})

export default router


