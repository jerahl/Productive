/**
 * Install (and start) the Beacon web client as a Windows service.
 *
 * Build the app first, then run from an elevated (Administrator) prompt:
 *
 *   pnpm --filter @beacon/web build
 *   pnpm --filter @beacon/web run service:install
 *
 * Configure it first via environment variables — see service.mjs (PORT,
 * BEACON_API). After install, manage it from services.msc or with
 * `net start "Beacon Web"` / `net stop "Beacon Web"`.
 */
import { SERVICE_NAME, createBeaconWebService, resolvedApi, resolvedPort } from './service.mjs'

const svc = createBeaconWebService()

svc.on('install', () => {
  console.log(
    `✓ "${SERVICE_NAME}" service installed (port: ${resolvedPort()}, api: ${resolvedApi()}). Starting…`,
  )
  svc.start()
})

svc.on('alreadyinstalled', () => {
  console.log(`"${SERVICE_NAME}" is already installed. Uninstall first to reconfigure.`)
})

svc.on('start', () => {
  console.log(
    `✓ "${SERVICE_NAME}" is running. Manage it in services.msc or via "net stop ${SERVICE_NAME}".`,
  )
})

svc.on('error', (err) => {
  console.error(`✗ "${SERVICE_NAME}" service error:`, err)
  process.exitCode = 1
})

svc.install()
