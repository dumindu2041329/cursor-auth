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

const dataDir = path.resolve(process.cwd(), 'server', 'data')
const dbFile = path.join(dataDir, 'db.json')

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(dbFile)) {
    const initial: DbSchema = { users: [], activities: [] }
    fs.writeFileSync(dbFile, JSON.stringify(initial, null, 2))
  }
}

export function readDb(): DbSchema {
  ensureDb()
  const raw = fs.readFileSync(dbFile, 'utf-8')
  return JSON.parse(raw) as DbSchema
}

export function writeDb(db: DbSchema) {
  ensureDb()
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2))
}

export function toPublic(u: StoredUser): PublicUser {
  const { id, name, email, avatarUrl } = u
  return { id, name, email, avatarUrl }
}


