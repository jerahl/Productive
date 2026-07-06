import { createServer } from 'node:http'
import { createService, inboxItems, tasks } from '@beacon/core'
import { getRequestListener } from '@hono/node-server'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { createApp } from './app.ts'
import { createBus } from './bus.ts'
import { openDb } from './db.ts'
import { migrationsDir, resolveDbPath } from './env.ts'
import { createMcpHandler } from './mcp-http.ts'
import { seed } from './seed.ts'

const path = resolveDbPath()
const { db } = openDb(path)

// Ensure the schema is present, then seed once if the workspace is empty so a
// fresh checkout boots with the demo data.
migrate(db, { migrationsFolder: migrationsDir() })
const taskCount = db.select({ n: sql<number>`count(*)` }).from(tasks).get()?.n ?? 0
const inboxCount = db.select({ n: sql<number>`count(*)` }).from(inboxItems).get()?.n ?? 0
if (taskCount === 0 && inboxCount === 0) {
  seed(db)
  console.log('✓ seeded demo data (empty database)')
}

// One event bus, one service — REST and MCP both mutate through it, so every
// change fans out to the SSE stream and to MCP clients.
const bus = createBus()
const svc = createService(db, bus.emit)

const app = createApp(svc, bus)
const honoListener = getRequestListener(app.fetch)
const mcpHandler = createMcpHandler(svc, bus, path)

// Route the MCP Streamable HTTP endpoint to the SDK transport (raw Node req/res),
// and everything else — REST + SSE — to Hono.
const server = createServer((req, res) => {
  if (req.url === '/mcp' || req.url?.startsWith('/mcp?') || req.url?.startsWith('/mcp/')) {
    void mcpHandler(req, res)
    return
  }
  void honoListener(req, res)
})

const port = Number(process.env.PORT ?? 3000)
server.listen(port, () => {
  console.log(`✓ Beacon server on http://localhost:${port}  (db: ${path})`)
  console.log('  REST: /api/*   SSE: /api/events   MCP: /mcp')
})
