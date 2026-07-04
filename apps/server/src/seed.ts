import {
  appState,
  canvasCards,
  canvasEdges,
  docs,
  focusSessions,
  goals,
  inboxItems,
  meetings,
  newId,
  notes,
  projects,
  routineChecks,
  routines,
  taskSteps,
  taskTags,
  tasks,
  visionTiles,
} from '@beacon/core'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { openDb } from './db.ts'
import type { Db } from './db.ts'
import { migrationsDir, resolveDbPath } from './env.ts'

/**
 * Reproduces the demo data from the design mock
 * (docs/design-reference/Beacon.dc.html) so a fresh checkout boots with a
 * populated, screenshot-matching workspace. Deletes existing rows first, so it
 * is safe to re-run.
 */

const iso = (d: Date) => d.toISOString()
const now = new Date()
const minutesAgo = (m: number) => iso(new Date(now.getTime() - m * 60_000))
const hoursAgo = (h: number) => minutesAgo(h * 60)
const daysAgo = (d: number) => hoursAgo(d * 24)

/** Today's local calendar date as YYYY-MM-DD (used for routine check-state). */
function localDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** A Date at today's local h:m — used for the demo meeting agenda. */
function todayAt(h: number, m: number): Date {
  const d = new Date(now)
  d.setHours(h, m, 0, 0)
  return d
}

export function seed(db: Db): void {
  // Clear in FK-safe order (children before parents).
  db.delete(canvasEdges).run()
  db.delete(canvasCards).run()
  db.delete(routineChecks).run()
  db.delete(routines).run()
  db.delete(taskSteps).run()
  db.delete(taskTags).run()
  db.delete(focusSessions).run()
  db.delete(tasks).run()
  db.delete(inboxItems).run()
  db.delete(projects).run()
  db.delete(goals).run()
  db.delete(meetings).run()
  db.delete(docs).run()
  db.delete(notes).run()
  db.delete(visionTiles).run()
  db.delete(appState).run()

  // --- Projects -------------------------------------------------------------
  const projectRows = [
    { name: 'App Redesign', color: '#7c8cff', dueLabel: 'Due Jul 18' },
    { name: 'Q3 Roadmap', color: '#5ec98a', dueLabel: 'Due Aug 1' },
    { name: 'Content Engine', color: '#e0a05a', dueLabel: 'Ongoing' },
    { name: 'Home Office Setup', color: '#c98ad6', dueLabel: 'This week' },
  ].map((p) => ({ id: newId(), ...p, createdAt: daysAgo(30) }))
  db.insert(projects).values(projectRows).run()
  const projectId = (name: string) => projectRows.find((p) => p.name === name)?.id ?? null

  // --- Goals ----------------------------------------------------------------
  db.insert(goals)
    .values([
      { id: newId(), name: 'Ship v2 of the app', detail: 'Target: September', pct: 60 },
      { id: newId(), name: 'Read 12 books this year', detail: '7 of 12 finished', pct: 58 },
      { id: newId(), name: 'Exercise 4× per week', detail: '2 of 4 this week', pct: 50 },
      { id: newId(), name: 'Build a 3-month runway', detail: 'On track', pct: 72 },
    ])
    .run()

  // --- Tasks (+ steps + tags) ----------------------------------------------
  type SeedTask = {
    title: string
    done?: boolean
    est: number
    project: string
    due: 'today' | 'tomorrow' | 'week' | 'someday'
    priority: 'high' | 'med' | 'low'
    tags: string[]
    note: string
    steps: { t: string; done: boolean }[]
  }
  const seedTasks: SeedTask[] = [
    {
      title: 'Finish the Q3 planning doc',
      est: 45,
      project: 'Q3 Roadmap',
      due: 'today',
      priority: 'high',
      tags: ['Deep work'],
      note: 'Leadership needs this by end of day',
      steps: [
        { t: 'Outline the main sections', done: true },
        { t: 'Draft the three goals', done: false },
        { t: 'Add success metrics', done: false },
        { t: 'Share with the team for feedback', done: false },
      ],
    },
    {
      title: 'Reply to Dana about the budget',
      est: 10,
      project: 'Admin',
      due: 'today',
      priority: 'med',
      tags: ['Email'],
      note: '',
      steps: [],
    },
    {
      title: 'Review the design feedback',
      est: 20,
      project: 'App Redesign',
      due: 'today',
      priority: 'med',
      tags: ['Design'],
      note: '',
      steps: [],
    },
    {
      title: 'Water the plants',
      done: true,
      est: 5,
      project: 'Home',
      due: 'today',
      priority: 'low',
      tags: [],
      note: '',
      steps: [],
    },
    {
      title: 'Prep for 1:1 with my manager',
      est: 15,
      project: 'Admin',
      due: 'tomorrow',
      priority: 'high',
      tags: ['Mgmt'],
      note: 'Keep it to 30 minutes',
      steps: [
        { t: 'Note 2 wins from this week', done: false },
        { t: 'List my blockers', done: false },
        { t: 'One career question', done: false },
      ],
    },
    {
      title: 'Book a dentist appointment',
      est: 5,
      project: 'Personal',
      due: 'tomorrow',
      priority: 'low',
      tags: ['Errand'],
      note: '',
      steps: [],
    },
    {
      title: 'Outline the next blog post',
      est: 30,
      project: 'Content Engine',
      due: 'week',
      priority: 'med',
      tags: ['Writing'],
      note: '',
      steps: [],
    },
    {
      title: 'Research standing desks',
      est: 0,
      project: 'Home',
      due: 'someday',
      priority: 'low',
      tags: [],
      note: '',
      steps: [],
    },
    {
      title: 'Learn a new keyboard shortcut a week',
      est: 0,
      project: 'Personal',
      due: 'someday',
      priority: 'low',
      tags: [],
      note: '',
      steps: [],
    },
  ]

  seedTasks.forEach((t, i) => {
    const id = newId()
    const done = t.done ?? false
    db.insert(tasks)
      .values({
        id,
        title: t.title,
        done,
        doneAt: done ? hoursAgo(2) : null,
        estMinutes: t.est > 0 ? t.est : null,
        projectId: projectId(t.project),
        goalId: null,
        due: t.due,
        priority: t.priority,
        note: t.note,
        sortOrder: i,
        createdAt: daysAgo(2),
        updatedAt: daysAgo(1),
      })
      .run()
    if (t.tags.length) {
      db.insert(taskTags)
        .values(t.tags.map((tag) => ({ taskId: id, tag })))
        .run()
    }
    if (t.steps.length) {
      db.insert(taskSteps)
        .values(
          t.steps.map((s, j) => ({
            id: newId(),
            taskId: id,
            text: s.t,
            done: s.done,
            sortOrder: j,
          })),
        )
        .run()
    }
  })

  // --- Inbox (oldest first) -------------------------------------------------
  db.insert(inboxItems)
    .values([
      { id: newId(), text: 'Call the insurance company about the claim', createdAt: hoursAgo(6) },
      { id: newId(), text: 'Idea: build a weekly review template', createdAt: hoursAgo(4) },
      { id: newId(), text: 'Buy a birthday gift for Sam', createdAt: hoursAgo(2) },
    ])
    .run()

  // --- Routines (+ today's check-state) ------------------------------------
  const routineSeed: { period: 'morning' | 'evening'; text: string; done: boolean }[] = [
    { period: 'morning', text: 'Make the bed', done: true },
    { period: 'morning', text: 'Meds + a glass of water', done: true },
    { period: 'morning', text: 'Plan my top 3', done: true },
    { period: 'morning', text: '10-minute journal', done: false },
    { period: 'evening', text: 'Shut the laptop down', done: false },
    { period: 'evening', text: "Set tomorrow's top 3", done: false },
    { period: 'evening', text: 'Read 10 pages', done: false },
  ]
  const today = localDate(now)
  let morningOrder = 0
  let eveningOrder = 0
  for (const r of routineSeed) {
    const id = newId()
    const sortOrder = r.period === 'morning' ? morningOrder++ : eveningOrder++
    db.insert(routines).values({ id, period: r.period, text: r.text, sortOrder }).run()
    db.insert(routineChecks).values({ routineId: id, date: today, done: r.done }).run()
  }

  // --- Meetings (today's agenda) -------------------------------------------
  db.insert(meetings)
    .values([
      { id: newId(), title: 'Daily standup', startsAt: iso(todayAt(9, 30)), who: 'Team · 15 min' },
      {
        id: newId(),
        title: '1:1 with Dana',
        startsAt: iso(todayAt(13, 30)),
        who: 'Dana R. · 30 min',
      },
      {
        id: newId(),
        title: 'Design review',
        startsAt: iso(todayAt(16, 0)),
        who: 'Product + Design · 45 min',
      },
    ])
    .run()

  // --- Docs -----------------------------------------------------------------
  db.insert(docs)
    .values([
      {
        id: newId(),
        title: 'Q3 Planning',
        tag: 'Roadmap',
        bodyMd: '# Q3 Planning\n\nDraft of the quarter goals and success metrics.',
        updatedAt: hoursAgo(2),
        createdAt: daysAgo(10),
      },
      {
        id: newId(),
        title: 'Meeting notes — Jun 24',
        tag: 'Notes',
        bodyMd: '# Jun 24\n\n- Standup notes\n- Action items',
        updatedAt: daysAgo(1),
        createdAt: daysAgo(10),
      },
      {
        id: newId(),
        title: 'Personal operating manual',
        tag: 'Reference',
        bodyMd: '# How I work best\n\nDeep work in the mornings; async by default.',
        updatedAt: daysAgo(3),
        createdAt: daysAgo(40),
      },
      {
        id: newId(),
        title: 'Brand guidelines',
        tag: 'Reference',
        bodyMd: '# Brand\n\nColors, type, voice.',
        updatedAt: daysAgo(7),
        createdAt: daysAgo(60),
      },
      {
        id: newId(),
        title: 'Onboarding checklist',
        tag: 'Process',
        bodyMd: '# Onboarding\n\n- [ ] Accounts\n- [ ] Tools\n- [ ] First task',
        updatedAt: daysAgo(7),
        createdAt: daysAgo(60),
      },
    ])
    .run()

  // --- Notes (accent color mirrors the mock's tint families) ---------------
  db.insert(notes)
    .values([
      {
        id: newId(),
        text: 'Ask about the new design tokens before the Friday handoff.',
        color: '#7c8cff',
        updatedAt: hoursAgo(2),
        createdAt: hoursAgo(2),
      },
      {
        id: newId(),
        text: 'Standing desk + walking pad combo — check reviews. Budget ~$400.',
        color: '#e0a05a',
        updatedAt: daysAgo(1),
        createdAt: daysAgo(1),
      },
      {
        id: newId(),
        text: 'Weekly review ritual: Sunday 5pm, 20 minutes, coffee, phone in another room.',
        color: '#5ec98a',
        updatedAt: daysAgo(2),
        createdAt: daysAgo(2),
      },
      {
        id: newId(),
        text: 'Book recs from Dana — the one about deep work, and the four thousand weeks one.',
        color: '#c98ad6',
        updatedAt: daysAgo(4),
        createdAt: daysAgo(4),
      },
      {
        id: newId(),
        text: 'Remember: done is better than perfect. Ship the rough version, polish later.',
        color: null,
        updatedAt: daysAgo(7),
        createdAt: daysAgo(7),
      },
    ])
    .run()

  // --- Vision board ---------------------------------------------------------
  db.insert(visionTiles)
    .values(
      [
        { tag: 'Mornings', caption: 'Calm, focused mornings — no chaos before coffee.' },
        { tag: 'Health', caption: 'Run a half marathon by spring.' },
        { tag: 'Space', caption: 'A quiet cabin workspace with real daylight.' },
        { tag: 'Build', caption: 'Take the side project to its first 100 users.' },
        { tag: 'Travel', caption: 'Two weeks in Japan, fully offline.' },
        { tag: 'Habits', caption: 'Read more, scroll less.' },
      ].map((v, i) => ({
        id: newId(),
        tag: v.tag,
        caption: v.caption,
        imagePath: null,
        sortOrder: i,
      })),
    )
    .run()

  // --- Canvas (cards + the one demo connection: card 1 → card 3) -----------
  const cards = [
    {
      x: 40,
      y: 30,
      text: 'Brain dump everything here — drag it around, group it, sort it out later.',
      color: '#7c8cff',
    },
    {
      x: 360,
      y: 70,
      text: 'Idea: a Friday "shutdown" ritual to close open loops',
      color: '#5ec98a',
    },
    { x: 150, y: 230, text: 'Email the landlord about the lease', color: '#e0a05a' },
    { x: 470, y: 280, text: 'Maybe: switch the newsletter to monthly?', color: '#c98ad6' },
    { x: 60, y: 410, text: 'Worry: am I overcommitting for July?', color: '#e07a8a' },
  ].map((c) => ({ id: newId(), ...c, createdAt: daysAgo(1) }))
  db.insert(canvasCards).values(cards).run()
  db.insert(canvasEdges)
    .values([{ id: newId(), fromCardId: cards[0]!.id, toCardId: cards[2]!.id }])
    .run()

  // --- App state ------------------------------------------------------------
  db.insert(appState)
    .values([
      { key: 'user_name', value: 'Stephen' },
      { key: 'focus_default_minutes', value: '25' },
      { key: 'energy', value: null },
    ])
    .run()
}

/** CLI entry: ensure the schema exists, then seed. Safe to run repeatedly. */
function main() {
  const path = resolveDbPath()
  const { db, sqlite } = openDb(path)
  migrate(db, { migrationsFolder: migrationsDir() })
  seed(db)
  sqlite.close()
  console.log(`✓ seeded demo data into ${path}`)
}

// Run only when invoked directly (not when imported by reset.ts).
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
