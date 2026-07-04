import type { Due, Priority } from './types.ts'

export const MONO = "'JetBrains Mono', ui-monospace, monospace"

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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
