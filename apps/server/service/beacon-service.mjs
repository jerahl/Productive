/**
 * Windows-service entrypoint.
 *
 * The service wrapper (node-windows / WinSW) launches this file with plain
 * `node`. Beacon ships as TypeScript with no build step — the app and its
 * `@beacon/*` workspace imports resolve to `.ts` source — so we register
 * tsx's ESM loader before importing the real server entrypoint. This mirrors
 * how the app runs in development (`tsx src/index.ts`).
 */
import { register } from 'tsx/esm/api'

// Global registration so the whole transitive import graph (including the
// `@beacon/core` / `@beacon/mcp` TypeScript sources) is transpiled on the fly.
register()

await import('../src/index.ts')
