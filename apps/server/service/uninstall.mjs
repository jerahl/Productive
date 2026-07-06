/**
 * Stop and uninstall the Beacon Windows service.
 *
 * Run from an elevated (Administrator) prompt on Windows:
 *
 *   pnpm --filter @beacon/server run service:uninstall
 */
import { SERVICE_NAME, createBeaconService } from './service.mjs'

const svc = createBeaconService()

svc.on('uninstall', () => {
  console.log(
    svc.exists
      ? `✗ "${SERVICE_NAME}" could not be uninstalled — it still exists.`
      : `✓ "${SERVICE_NAME}" service uninstalled.`,
  )
})

svc.on('error', (err) => {
  console.error(`✗ "${SERVICE_NAME}" service error:`, err)
  process.exitCode = 1
})

// node-windows stops the service as part of uninstall.
svc.uninstall()
