# @beacon/web

The Beacon web client — React 19 + TypeScript + Vite + Tailwind v4 + TanStack
Query. Phase 1 ships the persistent shell (sidebar, header with the brain-dump
capture bar) and the **Tasks view** pixel-matched to `docs/design-reference/`:
inbox triage, Today / Upcoming / Someday groups, checkable steps, due/priority
cycling, and drag-to-reorder.

```bash
pnpm --filter @beacon/web dev   # http://localhost:5173 (proxies /api → :3000)
```

The dev server proxies `/api` to the Beacon server (`BEACON_API`, default
`http://localhost:3000`), so start `@beacon/server` alongside it. The remaining
nav views (Overview, Projects, …) show a placeholder until their phases land.
