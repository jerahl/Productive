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
 * Environment variables forwarded from the install-time shell into the service.
 * Set these before running `service:install` to configure the deployment, e.g.
 *
 *   set BEACON_DB=C:\ProgramData\Beacon\beacon.db
 *   set PORT=3000
 *   pnpm --filter @beacon/server run service:install
 *
 * A service runs as LocalSystem by default, whose home directory is under
 * C:\Windows — so pointing BEACON_DB at a stable, writable location such as
 * C:\ProgramData\Beacon is strongly recommended.
 */
function serviceEnv() {
  const forwarded = ['PORT', 'BEACON_DB', 'NODE_ENV']
  const env = []
  for (const name of forwarded) {
    const value = process.env[name]
    if (value != null && value !== '') env.push({ name, value })
  }
  if (!env.some((e) => e.name === 'NODE_ENV')) {
    env.push({ name: 'NODE_ENV', value: 'production' })
  }
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
