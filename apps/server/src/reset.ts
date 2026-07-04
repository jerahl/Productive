import { existsSync, rmSync } from 'node:fs'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { openDb } from './db.ts'
import { migrationsDir, resolveDbPath } from './env.ts'
import { seed } from './seed.ts'

/** Drop the database file, re-migrate from scratch, and re-seed the demo data. */
function main() {
  const path = resolveDbPath()
  for (const suffix of ['', '-wal', '-shm']) {
    const f = path + suffix
    if (existsSync(f)) rmSync(f)
  }
  const { db, sqlite } = openDb(path)
  migrate(db, { migrationsFolder: migrationsDir() })
  seed(db)
  sqlite.close()
  console.log(`✓ reset complete: ${path}`)
}

main()
