import { useQueryClient } from '@tanstack/react-query'
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { FocusOverlay } from '../components/FocusOverlay.tsx'
import { api } from '../lib/api.ts'

export type ActiveFocus = {
  sessionId: string
  taskId: string | null
  title: string
  totalSeconds: number
  secondsLeft: number
  elapsed: number
  running: boolean
}

type OpenOpts = { taskId?: string; minutes?: number }

type FocusApi = {
  open: (opts?: OpenOpts) => Promise<void>
  active: ActiveFocus | null
  togglePause: () => void
  addFive: () => void
  finish: (completed: boolean) => Promise<void>
}

const FocusCtx = createContext<FocusApi | null>(null)

export function useFocus(): FocusApi {
  const ctx = useContext(FocusCtx)
  if (!ctx) throw new Error('useFocus must be used within FocusProvider')
  return ctx
}

export function FocusProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [active, setActive] = useState<ActiveFocus | null>(null)
  const finishing = useRef(false)

  const open = useCallback(async (opts: OpenOpts = {}) => {
    const minutes = opts.minutes ?? 25
    const session = await api.startFocus({ taskId: opts.taskId, minutes })
    const total = session.plannedMinutes * 60
    finishing.current = false
    setActive({
      sessionId: session.id,
      taskId: session.taskId,
      title: session.taskTitle,
      totalSeconds: total,
      secondsLeft: total,
      elapsed: 0,
      running: true,
    })
  }, [])

  const togglePause = useCallback(() => {
    // Toggle run/pause, but don't resume a finished (0:00) timer.
    setActive((f) => (f ? { ...f, running: f.running ? false : f.secondsLeft > 0 } : f))
  }, [])

  const addFive = useCallback(() => {
    setActive((f) =>
      f
        ? {
            ...f,
            totalSeconds: f.totalSeconds + 300,
            secondsLeft: f.secondsLeft + 300,
            running: true,
          }
        : f,
    )
  }, [])

  const finish = useCallback(
    async (completed: boolean) => {
      if (finishing.current) return
      const current = active
      if (!current) return
      finishing.current = true
      setActive(null)
      try {
        await api.finishFocus(current.sessionId, { completed, actualSeconds: current.elapsed })
      } finally {
        qc.invalidateQueries({ queryKey: ['tasks'] })
        qc.invalidateQueries({ queryKey: ['overview'] })
      }
    },
    [active, qc],
  )

  // One-second tick while running; stops the clock at zero (overlay stays open).
  useEffect(() => {
    if (!active?.running) return
    const t = setInterval(() => {
      setActive((f) => {
        if (!f || !f.running) return f
        const secondsLeft = Math.max(0, f.secondsLeft - 1)
        return { ...f, secondsLeft, elapsed: f.elapsed + 1, running: secondsLeft > 0 }
      })
    }, 1000)
    return () => clearInterval(t)
  }, [active?.running])

  return (
    <FocusCtx.Provider value={{ open, active, togglePause, addFive, finish }}>
      {children}
      {active && <FocusOverlay />}
    </FocusCtx.Provider>
  )
}
