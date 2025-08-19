import fs from 'fs'
import path from 'path'
import { Client } from 'pg'

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
  if (!url) throw new Error('DATABASE_URL (or SUPABASE_DB_URL) is required to run migrations')
  return url
}

export async function runMigrations(): Promise<void> {
  const migrationsDir = path.resolve(process.cwd(), 'migrations')
  if (!fs.existsSync(migrationsDir)) return

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  if (files.length === 0) return

  const client = new Client({ connectionString: getDatabaseUrl() })
  await client.connect()
  try {
    // Create migrations table if not exists
    await client.query(
      'create table if not exists public.__migrations (id serial primary key, filename text unique not null, applied_at timestamptz not null default now())',
    )

    const { rows } = await client.query<{ filename: string }>('select filename from public.__migrations')
    const alreadyApplied = new Set(rows.map((r: { filename: string }) => r.filename))

    for (const file of files) {
      if (alreadyApplied.has(file)) continue
      const fullPath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(fullPath, 'utf-8')
      console.log(`[migrate] applying ${file}`)
      await client.query('begin')
      try {
        await client.query(sql)
        await client.query('insert into public.__migrations (filename) values ($1)', [file])
        await client.query('commit')
        console.log(`[migrate] applied ${file}`)
      } catch (e) {
        await client.query('rollback')
        console.error(`[migrate] failed ${file}`, e)
        throw e
      }
    }
  } finally {
    await client.end()
  }
}

// Allow running directly with tsx/node
if (require.main === module) {
  runMigrations().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}


