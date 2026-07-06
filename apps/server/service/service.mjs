/**
 * Shared Windows-service definition used by the install/uninstall scripts.
 *
 * `node-windows` throws on import unless it is running on Windows, so these
 * scripts are Windows-only by design — run them from an elevated (Administrator)
 * prompt. Everything is defined once here so install and uninstall agree on the
 * service name (which is how the OS identifies it).
 */
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// node-windows is CommonJS; load it with createRequire from this ESM module.
const require = createRequire(import.meta.url)
const { Service } = require('node-windows')

const here = dirname(fileURLToPath(import.meta.url))

/** Display name shown in services.msc and used as the service identifier. */
export const SERVICE_NAME = 'Beacon'

/**
 * Where the service's database lives: BEACON_DB from the install-time shell if
 * set (note: `set X=Y` is cmd.exe syntax; in PowerShell use `$env:X = "Y"`),
 * otherwise %ProgramData%\Beacon\beacon.db. A service runs as LocalSystem,
 * whose home directory is under C:\Windows — defaulting there would bury the
 * database in C:\Windows\system32\config\systemprofile\.beacon, invisible to
 * every other process that uses the normal default.
 */
export function resolvedDbPath() {
  const configured = process.env.BEACON_DB?.trim()
  if (configured) return configured
  const programData = process.env.ProgramData || 'C:\\ProgramData'
  return join(programData, 'Beacon', 'beacon.db')
}

/**
 * The port the backend service listens on: BEACON_PORT from the install-time
 * shell if set, otherwise 3000. Deliberately NOT the generic PORT variable —
 * the web service's install instructions also use PORT, and a value left over
 * in the same shell would silently move the backend onto the web port.
 */
export function resolvedPort() {
  return process.env.BEACON_PORT?.trim() || '3000'
}

/**
 * Environment variables baked into the service at install time, e.g.
 *
 *   set BEACON_PORT=3000
 *   set BEACON_DB=C:\ProgramData\Beacon\beacon.db
 *   pnpm --filter @beacon/server run service:install
 *
 * PORT and BEACON_DB always get explicit values (see resolvedPort /
 * resolvedDbPath) so the service never inherits a stale shell variable or
 * falls back to LocalSystem's home directory.
 */
function serviceEnv() {
  const env = [
    { name: 'PORT', value: resolvedPort() },
    { name: 'BEACON_DB', value: resolvedDbPath() },
    { name: 'NODE_ENV', value: process.env.NODE_ENV || 'production' },
  ]
  return env
}

/** Build the node-windows Service object for Beacon. */
export function createBeaconService() {
  return new Service({
    name: SERVICE_NAME,
    description: 'Beacon — ADHD Work OS server (REST API, SSE, and MCP endpoint).',
    // node forks this launcher, which registers tsx and boots src/index.ts.
    script: join(here, 'beacon-service.mjs'),
    // The launcher enables TypeScript itself; no extra node flags needed.
    nodeOptions: '',
    // Run from the server package so relative paths resolve as in `pnpm dev`.
    workingDirectory: resolve(here, '..'),
    env: serviceEnv(),
    // Restart with backoff if the process crashes, but stop retrying a
    // persistently failing service so it doesn't thrash.
    wait: 2,
    grow: 0.5,
    maxRestarts: 10,
  })
}
