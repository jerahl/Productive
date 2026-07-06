/**
 * Shared Windows-service definition for the Beacon web client, used by the
 * install/uninstall scripts.
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
export const SERVICE_NAME = 'Beacon Web'

/**
 * The port the web service listens on: BEACON_WEB_PORT from the install-time
 * shell if set, otherwise 5173. Deliberately NOT the generic PORT variable —
 * the backend service is often installed from the same shell, and a shared
 * PORT leaking between the two installs put them on each other's ports.
 */
export function resolvedPort() {
  return process.env.BEACON_WEB_PORT?.trim() || '5173'
}

/** The backend the preview server proxies /api to (see vite.config.ts). */
export function resolvedApi() {
  return process.env.BEACON_API?.trim() || 'http://localhost:3000'
}

/**
 * Environment variables baked into the service at install time, e.g.
 *
 *   set BEACON_WEB_PORT=5173
 *   set BEACON_API=http://localhost:3000
 *   pnpm --filter @beacon/web run service:install
 *
 * PORT and BEACON_API always get explicit values (see resolvedPort /
 * resolvedApi) so the service never inherits a stale shell variable.
 */
function serviceEnv() {
  return [
    { name: 'PORT', value: resolvedPort() },
    { name: 'BEACON_API', value: resolvedApi() },
    { name: 'NODE_ENV', value: process.env.NODE_ENV || 'production' },
  ]
}

/** Build the node-windows Service object for the Beacon web client. */
export function createBeaconWebService() {
  return new Service({
    name: SERVICE_NAME,
    description: 'Beacon — ADHD Work OS web client (serves the built app, proxies /api).',
    // node runs this launcher, which boots Vite's preview server.
    script: join(here, 'beacon-web-service.mjs'),
    nodeOptions: '',
    // Run from the web package so vite.config.ts and dist/ resolve.
    workingDirectory: resolve(here, '..'),
    env: serviceEnv(),
    // Restart with backoff if the process crashes, but stop retrying a
    // persistently failing service so it doesn't thrash.
    wait: 2,
    grow: 0.5,
    maxRestarts: 10,
  })
}
