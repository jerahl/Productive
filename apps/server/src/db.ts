import { schema } from '@beacon/core'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { resolveDbPath } from './env.ts'

/**
 * Open the single-file SQLite database and wrap it in Drizzle. WAL mode keeps
 * the web UI's reads from blocking Claude's MCP writes; foreign keys are
 * enforced so cascades in the schema actually fire.
 */
export function openDb(path = resolveDbPath()) {
  const sqlite = new Database(path)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  return { db, sqlite }
}

export type Db = ReturnType<typeof openDb>['db']
