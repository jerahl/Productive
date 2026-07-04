import type { FocusSession } from './types.ts'

/** Query "topics" the UI (and MCP resources) can subscribe to for invalidation. */
export type BeaconTopic =
  | 'tasks'
  | 'inbox'
  | 'overview'
  | 'projects'
  | 'goals'
  | 'routines'
  | 'meetings'
  | 'docs'
  | 'notes'

/**
 * Events emitted by the service layer after a mutation. The server fans these
 * out to the web client over SSE (`/api/events`) and to MCP clients as
 * resource-updated notifications — one event source, so REST and MCP changes
 * both reach the open browser live (docs/PLAN.md §5).
 */
export type BeaconEvent =
  | { type: 'invalidate'; topics: BeaconTopic[] }
  | { type: 'focus:start'; session: FocusSession }
  | { type: 'focus:finish'; sessionId: string }

export type Emit = (event: BeaconEvent) => void
