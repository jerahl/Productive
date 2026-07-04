import {
  type BeaconService,
  NotFoundError,
  addStepsInput,
  captureThoughtInput,
  createTaskInput,
  triageInboxInput,
  updateTaskInput,
} from '@beacon/core'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

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
export function createApp(svc: BeaconService) {
  const app = new Hono()

  app.use('/api/*', cors())

  app.get('/api/health', (c) => c.json({ ok: true }))

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

  // --- Tasks ---------------------------------------------------------------
  app.get('/api/tasks', (c) => c.json({ groups: svc.listTaskGroups() }))

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

  // --- Projects (read) -----------------------------------------------------
  app.get('/api/projects', (c) => c.json(svc.listProjects()))

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
