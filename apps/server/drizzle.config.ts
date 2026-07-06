import { defineConfig } from 'drizzle-kit'
import { resolveDbPath } from './src/env.ts'

/**
 * drizzle-kit reads the shared table definitions from @beacon/core and writes
 * generated migration SQL into ./drizzle. `pnpm db:generate` regenerates them.
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: '../../packages/core/src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: resolveDbPath(),
  },
  strict: true,
  verbose: true,
})
