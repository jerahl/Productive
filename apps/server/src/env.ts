import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Resolve the SQLite file path. Defaults to ~/.beacon/beacon.db; override with
 * BEACON_DB (docs/PLAN.md §5). The parent directory is created on demand.
 */
export function resolveDbPath(): string {
  const configured = process.env.BEACON_DB?.trim()
  const dbPath =
    configured && configured.length > 0 ? configured : join(homedir(), '.beacon', 'beacon.db')
  const dir = dirname(dbPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dbPath
}

/** Directory holding the generated migration SQL, resolved relative to this file.
 *  Uses fileURLToPath so it resolves correctly on Windows (drive letters) too. */
export function migrationsDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle')
}

/** Vision-board uploads live beside the database (docs/PLAN.md §5). */
export function uploadsDir(): string {
  const dir = join(dirname(resolveDbPath()), 'uploads')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}
