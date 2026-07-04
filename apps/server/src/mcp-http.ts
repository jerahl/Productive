import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { BeaconEvent, BeaconService, BeaconTopic } from '@beacon/core'
import { createBeaconMcpServer } from '@beacon/mcp'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { Bus } from './bus.ts'

/** Map an invalidation event to the resource URIs it affects. */
function eventUris(event: BeaconEvent): string[] {
  if (event.type !== 'invalidate') return []
  const map: Partial<Record<BeaconTopic, string>> = {
    inbox: 'beacon://inbox',
    tasks: 'beacon://tasks/today',
    overview: 'beacon://overview',
  }
  return event.topics.map((t) => map[t]).filter((u): u is string => Boolean(u))
}

/**
 * A Node HTTP handler for the MCP Streamable HTTP endpoint at /mcp, in stateful
 * mode (one session per initialized client). Each session gets its own MCP
 * server bound to the shared service, and subscribes to the event bus so that
 * changes (from REST or from another MCP client) fire resource-updated
 * notifications to subscribed MCP clients.
 */
export function createMcpHandler(svc: BeaconService, bus: Bus) {
  const transports = new Map<string, StreamableHTTPServerTransport>()

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined

      if (req.method === 'POST') {
        let transport = sessionId ? transports.get(sessionId) : undefined
        if (!transport) {
          // A new client — its first POST is the `initialize` request.
          const created: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid: string) => {
              transports.set(sid, created)
            },
          })
          const mcp = createBeaconMcpServer(svc)
          const unsubscribe = bus.subscribe((event) => {
            for (const uri of eventUris(event)) {
              mcp.server.sendResourceUpdated({ uri }).catch(() => {})
            }
          })
          created.onclose = () => {
            unsubscribe()
            if (created.sessionId) transports.delete(created.sessionId)
          }
          await mcp.connect(created)
          transport = created
        }
        await transport.handleRequest(req, res)
        return
      }

      if (req.method === 'GET' || req.method === 'DELETE') {
        const transport = sessionId ? transports.get(sessionId) : undefined
        if (!transport) {
          res.statusCode = 400
          res.end('Missing or unknown mcp-session-id')
          return
        }
        await transport.handleRequest(req, res)
        return
      }

      res.statusCode = 405
      res.end()
    } catch (err) {
      console.error('MCP handler error:', err)
      if (!res.headersSent) {
        res.statusCode = 500
        res.end()
      }
    }
  }
}
