/**
 * Install (and start) Beacon as a Windows service.
 *
 * Run from an elevated (Administrator) prompt on Windows:
 *
 *   pnpm --filter @beacon/server run service:install
 *
 * Configure it first via environment variables — see service.mjs (BEACON_DB,
 * PORT). After install, manage it from services.msc or with `net start Beacon`
 * / `net stop Beacon`.
 */
import { SERVICE_NAME, createBeaconService, resolvedDbPath, resolvedPort } from './service.mjs'

const svc = createBeaconService()

svc.on('install', () => {
  console.log(
    `✓ "${SERVICE_NAME}" service installed (port: ${resolvedPort()}, db: ${resolvedDbPath()}). Starting…`,
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
