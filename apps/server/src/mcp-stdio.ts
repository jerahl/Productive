import { createService } from '@beacon/core'
import { createBeaconMcpServer } from '@beacon/mcp'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { openDb } from './db.ts'
import { migrationsDir, resolveDbPath } from './env.ts'

/**
 * `beacon-mcp` — a stdio MCP server for clients that only speak stdio (e.g.
 * Claude Desktop). It operates on the same SQLite file as the web server, so
 * state is shared. Live browser updates flow through the HTTP server's SSE, so
 * for the "watch it happen" demo use the HTTP transport at /mcp instead.
 */
async function main() {
  const dbPath = resolveDbPath()
  const { db } = openDb(dbPath)
  migrate(db, { migrationsFolder: migrationsDir() })
  const svc = createService(db) // no emit: stdio is a standalone process
  const server = createBeaconMcpServer(svc, { dbPath, transport: 'stdio', liveUpdates: false })
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // stderr is safe for logs; stdout is the MCP channel. Log the resolved DB path
  // so a client writing to the "wrong" database is diagnosable from the log —
  // the web server must use the same file (set BEACON_DB to match it).
  console.error(`beacon-mcp (stdio) ready — db: ${dbPath} (no live browser updates on stdio)`)
}

main().catch((err) => {
  console.error('beacon-mcp failed:', err)
  process.exit(1)
})
