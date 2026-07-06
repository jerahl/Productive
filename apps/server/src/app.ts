import { createReadStream, existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { Readable } from 'node:stream'
import {
  type BeaconService,
  NotFoundError,
  addStepsInput,
  captureThoughtInput,
  connectCanvasInput,
  createCanvasCardInput,
  createDocInput,
  createGoalInput,
  createMeetingInput,
  createMilestoneInput,
  createNoteInput,
  createProjectInput,
  createTaskInput,
  finishFocusInput,
  newId,
  promoteCanvasInput,
  setEnergyInput,
  startFocusInput,
  triageInboxInput,
  updateCanvasCardInput,
  updateDocInput,
  updateGoalInput,
  updateMilestoneInput,
  updateNoteInput,
  updateProjectInput,
  updateTaskInput,
  updateVisionTileInput,
} from '@beacon/core'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'
import type { Bus } from './bus.ts'
import { uploadsDir } from './env.ts'

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

const reorderInput = z.object({
  group: z.enum(['today', 'upcoming', 'someday']),
  orderedIds: z.array(z.string()),
})

// Accept either { steps: string[] } or a single { text: string }.
const stepsBody = z.union([addStepsInput, z.object({ text: z.string().trim().min(1) })])

/**
 * Build the REST API over the service layer (docs/PLAN.md §5). Kept as a pure
 * factory so tests can mount it against a temp-DB service.
 */
export function createApp(svc: BeaconService, bus: Bus) {
  const app = new Hono()

  app.use('/api/*', cors())

  app.get('/api/health', (c) => c.json({ ok: true }))

  // Server-Sent Events: the web client subscribes and invalidates its caches
  // on each event, so REST/MCP changes appear live (docs/PLAN.md §5).
  app.get('/api/events', (c) =>
    streamSSE(c, async (stream) => {
      const unsubscribe = bus.subscribe((event) => {
        void stream.writeSSE({ event: 'beacon', data: JSON.stringify(event) }).catch(() => {})
      })
      stream.onAbort(unsubscribe)
      await stream.writeSSE({ event: 'hello', data: '{}' })
      while (!stream.aborted) {
        await stream.sleep(15_000)
        await stream.writeSSE({ event: 'ping', data: '{}' }).catch(() => {})
      }
      unsubscribe()
    }),
  )

  // --- Capture & triage ----------------------------------------------------
  app.post('/api/capture', async (c) => {
    const { text } = captureThoughtInput.parse(await c.req.json())
    return c.json(svc.capture(text), 201)
  })

  app.get('/api/inbox', (c) => c.json(svc.listInbox()))

  app.post('/api/inbox/:id/triage', async (c) => {
    const body = triageInboxInput.parse(await c.req.json().catch(() => ({})))
    return c.json(svc.triageInboxItem(c.req.param('id'), body), 201)
  })

  app.post('/api/inbox/:id/dismiss', (c) => {
    svc.dismissInboxItem(c.req.param('id'))
    return c.body(null, 204)
  })

  // --- Overview, energy, focus --------------------------------------------
  app.get('/api/overview', (c) => {
    svc.runDailyRollover()
    return c.json(svc.getOverview())
  })

  app.post('/api/energy', async (c) => {
    const { level } = setEnergyInput.parse(await c.req.json())
    svc.setEnergy(level)
    return c.json(svc.getOverview())
  })

  app.post('/api/focus/start', async (c) => {
    const body = startFocusInput.parse(await c.req.json().catch(() => ({})))
    return c.json(svc.startFocus(body), 201)
  })

  app.post('/api/focus/:id/finish', async (c) => {
    const body = finishFocusInput.parse(await c.req.json())
    return c.json(svc.finishFocus(c.req.param('id'), body))
  })

  app.get('/api/meetings', (c) => c.json(svc.listMeetings()))

  // --- Tasks ---------------------------------------------------------------
  app.get('/api/tasks', (c) => {
    svc.runDailyRollover()
    return c.json({ groups: svc.listTaskGroups() })
  })

  app.post('/api/tasks', async (c) => {
    const body = createTaskInput.parse(await c.req.json())
    return c.json(svc.createTask(body), 201)
  })

  app.get('/api/tasks/:id', (c) => c.json(svc.getTask(c.req.param('id'))))

  app.patch('/api/tasks/:id', async (c) => {
    const body = updateTaskInput.parse(await c.req.json())
    return c.json(svc.updateTask(c.req.param('id'), body))
  })

  app.post('/api/tasks/:id/toggle', (c) => c.json(svc.toggleTask(c.req.param('id'))))
  app.post('/api/tasks/:id/cycle-due', (c) => c.json(svc.cycleDue(c.req.param('id'))))
  app.post('/api/tasks/:id/cycle-priority', (c) => c.json(svc.cyclePriority(c.req.param('id'))))

  app.post('/api/tasks/:id/steps', async (c) => {
    const body = stepsBody.parse(await c.req.json())
    const steps = 'steps' in body ? body.steps : [body.text]
    return c.json(svc.addSteps(c.req.param('id'), steps), 201)
  })

  app.post('/api/tasks/:id/steps/:sid/toggle', (c) =>
    c.json(svc.toggleStep(c.req.param('id'), c.req.param('sid'))),
  )

  app.post('/api/tasks/reorder', async (c) => {
    const { group, orderedIds } = reorderInput.parse(await c.req.json())
    svc.reorderGroup(group, orderedIds)
    return c.json({ groups: svc.listTaskGroups() })
  })

  // --- Projects ------------------------------------------------------------
  app.get('/api/projects', (c) => c.json(svc.listProjects()))
  app.post('/api/projects', async (c) =>
    c.json(svc.createProject(createProjectInput.parse(await c.req.json())), 201),
  )
  app.patch('/api/projects/:id', async (c) =>
    c.json(svc.updateProject(c.req.param('id'), updateProjectInput.parse(await c.req.json()))),
  )
  app.get('/api/projects/:id/detail', (c) => c.json(svc.getProjectDetail(c.req.param('id'))))

  // --- Milestones ----------------------------------------------------------
  app.post('/api/milestones', async (c) =>
    c.json(svc.createMilestone(createMilestoneInput.parse(await c.req.json())), 201),
  )
  app.patch('/api/milestones/:id', async (c) =>
    c.json(svc.updateMilestone(c.req.param('id'), updateMilestoneInput.parse(await c.req.json()))),
  )
  app.delete('/api/milestones/:id', (c) => {
    svc.deleteMilestone(c.req.param('id'))
    return c.body(null, 204)
  })

  // --- Goals ---------------------------------------------------------------
  app.get('/api/goals', (c) => c.json(svc.listGoals()))
  app.post('/api/goals', async (c) =>
    c.json(svc.createGoal(createGoalInput.parse(await c.req.json())), 201),
  )
  app.patch('/api/goals/:id', async (c) =>
    c.json(svc.updateGoal(c.req.param('id'), updateGoalInput.parse(await c.req.json()))),
  )
  app.get('/api/goals/:id/detail', (c) => c.json(svc.getGoalDetail(c.req.param('id'))))
  app.delete('/api/goals/:id', (c) => {
    svc.deleteGoal(c.req.param('id'))
    return c.body(null, 204)
  })

  // --- Routines ------------------------------------------------------------
  app.get('/api/routines', (c) => c.json(svc.listRoutines()))
  app.post('/api/routines/:id/check', (c) => c.json(svc.toggleRoutineCheck(c.req.param('id'))))

  // --- Meetings ------------------------------------------------------------
  app.post('/api/meetings', async (c) =>
    c.json(svc.createMeeting(createMeetingInput.parse(await c.req.json())), 201),
  )
  app.delete('/api/meetings/:id', (c) => {
    svc.deleteMeeting(c.req.param('id'))
    return c.body(null, 204)
  })

  // --- Docs ----------------------------------------------------------------
  app.get('/api/docs', (c) => c.json(svc.listDocs()))
  app.get('/api/docs/:id', (c) => c.json(svc.getDoc(c.req.param('id'))))
  app.post('/api/docs', async (c) =>
    c.json(svc.createDoc(createDocInput.parse(await c.req.json())), 201),
  )
  app.patch('/api/docs/:id', async (c) =>
    c.json(svc.updateDoc(c.req.param('id'), updateDocInput.parse(await c.req.json()))),
  )

  // --- Notes ---------------------------------------------------------------
  app.get('/api/notes', (c) => c.json(svc.listNotes()))
  app.post('/api/notes', async (c) =>
    c.json(svc.createNote(createNoteInput.parse(await c.req.json())), 201),
  )
  app.patch('/api/notes/:id', async (c) =>
    c.json(svc.updateNote(c.req.param('id'), updateNoteInput.parse(await c.req.json()))),
  )
  app.delete('/api/notes/:id', (c) => {
    svc.deleteNote(c.req.param('id'))
    return c.body(null, 204)
  })

  // --- Canvas --------------------------------------------------------------
  app.get('/api/canvas', (c) => c.json(svc.listCanvas()))
  app.post('/api/canvas/cards', async (c) =>
    c.json(
      svc.createCanvasCard(createCanvasCardInput.parse(await c.req.json().catch(() => ({})))),
      201,
    ),
  )
  app.patch('/api/canvas/cards/:id', async (c) =>
    c.json(
      svc.updateCanvasCard(c.req.param('id'), updateCanvasCardInput.parse(await c.req.json())),
    ),
  )
  app.delete('/api/canvas/cards/:id', (c) => {
    svc.deleteCanvasCard(c.req.param('id'))
    return c.body(null, 204)
  })
  app.post('/api/canvas/edges', async (c) =>
    c.json(svc.connectCanvasCards(connectCanvasInput.parse(await c.req.json())), 201),
  )
  app.delete('/api/canvas/edges/:id', (c) => {
    svc.deleteCanvasEdge(c.req.param('id'))
    return c.body(null, 204)
  })
  app.post('/api/canvas/cards/:id/promote', async (c) =>
    c.json(
      svc.promoteCanvasCard(c.req.param('id'), promoteCanvasInput.parse(await c.req.json())),
      201,
    ),
  )

  // --- Vision board --------------------------------------------------------
  app.get('/api/vision', (c) => c.json(svc.listVision()))
  app.patch('/api/vision/:id', async (c) =>
    c.json(
      svc.updateVisionTile(c.req.param('id'), updateVisionTileInput.parse(await c.req.json())),
    ),
  )
  app.post('/api/vision/:id/image', async (c) => {
    const form = await c.req.parseBody()
    const file = form.file
    if (!(file instanceof File)) return c.json({ error: 'Expected a file field named "file"' }, 400)
    const ext = extname(file.name || '').toLowerCase() || '.png'
    const name = `${newId()}${ext}`
    await writeFile(join(uploadsDir(), name), Buffer.from(await file.arrayBuffer()))
    return c.json(svc.setVisionImage(c.req.param('id'), name), 201)
  })
  app.get('/api/uploads/:name', (c) => {
    const name = c.req.param('name')
    if (name.includes('/') || name.includes('..')) return c.body(null, 400)
    const path = join(uploadsDir(), name)
    if (!existsSync(path)) return c.body(null, 404)
    c.header('content-type', MIME[extname(name).toLowerCase()] ?? 'application/octet-stream')
    c.header('cache-control', 'public, max-age=31536000, immutable')
    return c.body(Readable.toWeb(createReadStream(path)) as ReadableStream)
  })

  // --- Errors --------------------------------------------------------------
  app.onError((err, c) => {
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message, entity: err.entity, id: err.id }, 404)
    }
    if (err instanceof z.ZodError) {
      return c.json({ error: 'Invalid request', issues: err.issues }, 400)
    }
    console.error('Unhandled error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  })

  return app
}
