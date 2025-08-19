import { getSupabase } from './supabaseClient'
import type { StoredUser, Activity, PublicUser } from './db'
import { v4 as uuid } from 'uuid'

// Database row shapes (snake_case) to align with Postgres conventions
type DbUser = {
  id: string
  name: string
  email: string
  avatar_url: string | null
  salt: string
  password_hash: string
  created_at: number
  updated_at: number
  login_count: number
  last_login_at: number | null
  email_verified: boolean | null
  provider: 'password' | 'google' | null
}

type DbActivity = {
  id: string
  user_id: string
  type: Activity['type']
  message: string
  at: number
}

function fromDbUser(row: DbUser): StoredUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url ?? undefined,
    salt: row.salt,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    loginCount: row.login_count,
    lastLoginAt: row.last_login_at,
    emailVerified: !!row.email_verified,
    provider: (row.provider ?? 'password') as StoredUser['provider'],
  }
}

function toDbUser(user: StoredUser): DbUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.avatarUrl ?? null,
    salt: user.salt,
    password_hash: user.passwordHash,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
    login_count: user.loginCount,
    last_login_at: user.lastLoginAt,
    email_verified: !!user.emailVerified,
    provider: (user.provider ?? 'password') as 'password' | 'google',
  }
}

function toDbUserUpdates(updates: Partial<StoredUser>): Partial<DbUser> {
  const db: Partial<DbUser> = {}
  if (updates.name !== undefined) db.name = updates.name
  if (updates.email !== undefined) db.email = updates.email
  if (updates.avatarUrl !== undefined) db.avatar_url = updates.avatarUrl ?? null
  if (updates.salt !== undefined) db.salt = updates.salt
  if (updates.passwordHash !== undefined) db.password_hash = updates.passwordHash
  if (updates.createdAt !== undefined) db.created_at = updates.createdAt
  if (updates.updatedAt !== undefined) db.updated_at = updates.updatedAt
  if (updates.loginCount !== undefined) db.login_count = updates.loginCount
  if (updates.lastLoginAt !== undefined) db.last_login_at = updates.lastLoginAt
  if (updates.emailVerified !== undefined) db.email_verified = updates.emailVerified
  if (updates.provider !== undefined) db.provider = updates.provider as any
  return db
}

const USERS_TABLE = 'users'
const ACTIVITIES_TABLE = 'activities'

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from(USERS_TABLE).select('*').eq('email', email).single()
  if (error && error.code !== 'PGRST116') throw error
  return data ? fromDbUser(data as DbUser) : null
}

export async function insertUser(user: StoredUser): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from(USERS_TABLE).insert(toDbUser(user) as any)
  if (error) throw error
}

export async function updateUser(userId: string, updates: Partial<StoredUser>): Promise<StoredUser> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update(toDbUserUpdates(updates) as any)
    .eq('id', userId)
    .select('*')
    .single()
  if (error) throw error
  return fromDbUser(data as DbUser)
}

export async function addActivity(userId: string, type: Activity['type'], message: string): Promise<void> {
  const supabase = getSupabase()
  const item: DbActivity = { id: uuid(), user_id: userId, type, message, at: Date.now() }
  const { error } = await supabase.from(ACTIVITIES_TABLE).insert(item as any)
  if (error) throw error
}

export async function listActivities(userId: string, page: number, pageSize: number) {
  const supabase = getSupabase()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const { data, error, count } = await supabase
    .from(ACTIVITIES_TABLE)
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('at', { ascending: false })
    .range(from, to)
  if (error) throw error
  const total = count ?? 0
  const items = (data as DbActivity[] | null)?.map((d) => ({
    id: d.id,
    userId: d.user_id,
    type: d.type,
    message: d.message,
    at: d.at,
  })) || []
  return { items, total }
}

export function toPublic(u: StoredUser): PublicUser {
  const { id, name, email, avatarUrl } = u
  return { id, name, email, avatarUrl }
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from(USERS_TABLE).select('*').eq('id', id).single()
  if (error && error.code !== 'PGRST116') throw error
  return data ? fromDbUser(data as DbUser) : null
}


