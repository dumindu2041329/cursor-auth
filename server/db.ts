// Deprecated: file-based demo DB. Keeping types for reuse in Supabase repo.
import fs from 'fs'
import path from 'path'

export type PublicUser = {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export type StoredUser = PublicUser & {
  salt: string
  passwordHash: string
  createdAt: number
  updatedAt: number
  loginCount: number
  lastLoginAt: number | null
  emailVerified?: boolean
  provider?: 'password' | 'google'
}

export type Activity = { id: string; userId: string; type: 'auth' | 'profile' | 'security' | 'account'; message: string; at: number }

type DbSchema = {
  users: StoredUser[]
  activities: Activity[]
}

// In serverless (Vercel), the filesystem is read-only except for /tmp.
// Use /tmp for runtime writes and seed from the repo's read-only data if available.
const isServerless = !!process.env.VERCEL
const runtimeDataDir = isServerless
  ? path.join('/tmp', 'cursor-auth')
  : path.resolve(process.cwd(), 'server', 'data')
const runtimeDbFile = path.join(runtimeDataDir, 'db.json')
const seedDbFile = path.resolve(process.cwd(), 'server', 'data', 'db.json')

function ensureDb() {
  if (!fs.existsSync(runtimeDataDir)) fs.mkdirSync(runtimeDataDir, { recursive: true })
  if (!fs.existsSync(runtimeDbFile)) {
    if (fs.existsSync(seedDbFile)) {
      try {
        fs.copyFileSync(seedDbFile, runtimeDbFile)
        return
      } catch {
        // fall through to creating a new file if copy fails
      }
    }
    const initial: DbSchema = { users: [], activities: [] }
    fs.writeFileSync(runtimeDbFile, JSON.stringify(initial, null, 2))
  }
}

export function readDb(): DbSchema {
  ensureDb()
  const raw = fs.readFileSync(runtimeDbFile, 'utf-8')
  return JSON.parse(raw) as DbSchema
}

export function writeDb(db: DbSchema) {
  ensureDb()
  fs.writeFileSync(runtimeDbFile, JSON.stringify(db, null, 2))
}

export function toPublic(u: StoredUser): PublicUser {
  const { id, name, email, avatarUrl } = u
  return { id, name, email, avatarUrl }
}


