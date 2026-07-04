import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { openDb } from './db.ts'
import { migrationsDir, resolveDbPath } from './env.ts'

/** Apply all pending migrations to the SQLite database, then exit. */
function main() {
  const path = resolveDbPath()
  const { db, sqlite } = openDb(path)
  migrate(db, { migrationsFolder: migrationsDir() })
  sqlite.close()
  console.log(`✓ migrations applied to ${path}`)
}

main()
