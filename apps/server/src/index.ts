import { createService, inboxItems, tasks } from '@beacon/core'
import { serve } from '@hono/node-server'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { createApp } from './app.ts'
import { openDb } from './db.ts'
import { migrationsDir, resolveDbPath } from './env.ts'
import { seed } from './seed.ts'

const path = resolveDbPath()
const { db } = openDb(path)

// Ensure the schema is present, then seed once if the workspace is empty so a
// fresh checkout boots with the demo data (docs/PLAN.md §4 daily-first pattern).
migrate(db, { migrationsFolder: migrationsDir() })
const taskCount = db.select({ n: sql<number>`count(*)` }).from(tasks).get()?.n ?? 0
const inboxCount = db.select({ n: sql<number>`count(*)` }).from(inboxItems).get()?.n ?? 0
if (taskCount === 0 && inboxCount === 0) {
  seed(db)
  console.log('✓ seeded demo data (empty database)')
}

const svc = createService(db)
const app = createApp(svc)

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`✓ Beacon server on http://localhost:${info.port}  (db: ${path})`)
})
