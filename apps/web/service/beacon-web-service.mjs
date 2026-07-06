/**
 * Windows-service entrypoint for the Beacon web client.
 *
 * The service wrapper (node-windows / WinSW) launches this with plain `node`.
 * It boots Vite's production preview server, which serves the built `dist/`
 * and proxies `/api` to the backend (see vite.config.ts `preview`). Run
 * `pnpm --filter @beacon/web build` before installing/starting the service so
 * `dist/` exists.
 *
 * PORT (default 5173) and BEACON_API (default http://localhost:3000) are read
 * from the environment by vite.config.ts.
 */
import { preview } from 'vite'

const server = await preview()
server.printUrls()
