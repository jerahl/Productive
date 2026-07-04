import type { Due, Priority } from './types.ts'

export const MONO = "'JetBrains Mono', ui-monospace, monospace"

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Saturday, Jul 4" */
export function dateLong(): string {
  const now = new Date()
  return `${DAYS_LONG[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`
}

/** Local time of an ISO timestamp as "H:MM" (24-hour), matching the mock. */
export function meetingTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Time-of-day greeting, mirroring the mock's copy. */
export function greeting(name?: string): string {
  const h = new Date().getHours()
  const base =
    h < 5
      ? 'Late night — take it easy'
      : h < 12
        ? 'Good morning'
        : h < 18
          ? 'Good afternoon'
          : 'Good evening'
  return name && h >= 5 ? `${base}, ${name}` : base
}

/** "Sat · Jul 4 · 1:57 PM" */
export function dateLine(): string {
  const now = new Date()
  const ap = now.getHours() < 12 ? 'AM' : 'PM'
  let h12 = now.getHours() % 12
  if (h12 === 0) h12 = 12
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${DAYS[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()} · ${h12}:${mm} ${ap}`
}

/** Kind, fuzzy relative time for note/doc timestamps. */
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso)
  const mins = Math.round(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'Last week'
  return `${Math.round(days / 7)} weeks ago`
}

/** Expand a #rrggbb color to rgba() at the given alpha (falls back to white). */
export function tint(hex: string | null, alpha: number): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(255,255,255,${alpha})`
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

export const PRIORITY_COLOR: Record<Priority, string> = {
  high: '#e07a8a',
  med: '#e0a05a',
  low: 'rgba(255,255,255,0.18)',
}

export const PRIORITY_TITLE: Record<Priority, string> = {
  high: 'Priority: high',
  med: 'Priority: medium',
  low: 'Priority: low',
}

type DuePill = { label: string; color: string; bg: string }
export const DUE_META: Record<Due, DuePill> = {
  today: { label: 'Today', color: '#e0a05a', bg: 'rgba(224,160,90,0.14)' },
  tomorrow: { label: 'Tomorrow', color: 'rgba(232,234,240,0.6)', bg: 'rgba(255,255,255,0.05)' },
  week: { label: 'This week', color: 'rgba(232,234,240,0.6)', bg: 'rgba(255,255,255,0.05)' },
  someday: { label: 'Someday', color: 'rgba(232,234,240,0.45)', bg: 'rgba(255,255,255,0.04)' },
}
