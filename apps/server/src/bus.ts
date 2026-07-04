import type { BeaconEvent } from '@beacon/core'

export type Listener = (event: BeaconEvent) => void

/**
 * In-process event bus. The service emits into it after every mutation; the
 * SSE endpoint and each MCP session subscribe, so a change made over REST or
 * MCP reaches the open browser and connected MCP clients alike.
 */
export function createBus() {
  const listeners = new Set<Listener>()
  return {
    emit(event: BeaconEvent): void {
      for (const l of listeners) {
        try {
          l(event)
        } catch (err) {
          console.error('event listener error', err)
        }
      }
    },
    subscribe(l: Listener): () => void {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

export type Bus = ReturnType<typeof createBus>
