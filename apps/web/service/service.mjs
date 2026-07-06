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
 * Environment variables forwarded from the install-time shell into the service.
 * Set these before running `service:install` to configure the deployment, e.g.
 *
 *   set PORT=5173
 *   set BEACON_API=http://localhost:3000
 *   pnpm --filter @beacon/web run service:install
 *
 * PORT is the port the web server listens on; BEACON_API is the backend the
 * preview server proxies /api requests to (see vite.config.ts).
 */
function serviceEnv() {
  const forwarded = ['PORT', 'BEACON_API', 'NODE_ENV']
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
