import { DUE_BUCKETS } from '@beacon/core'

/**
 * Placeholder for the Beacon MCP surface. Phase 3 fills this in with ~20 tools,
 * resources, and prompts (docs/MCP_SERVER.md), each delegating to the
 * @beacon/core service layer. Kept minimal so the workspace layout is real from
 * P0 onward.
 */
export const MCP_SERVER_NAME = 'beacon'

/** The fuzzy due buckets the MCP tools expose, re-exported for convenience. */
export const dueBuckets = DUE_BUCKETS
