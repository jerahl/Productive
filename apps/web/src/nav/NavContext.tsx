import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ViewId } from '../components/Sidebar.tsx'

type NavApi = {
  view: ViewId
  projectFocus: string | null
  setView: (v: ViewId) => void
  openProject: (id: string) => void
  clearProjectFocus: () => void
}

const NavCtx = createContext<NavApi | null>(null)

export function useNav(): NavApi {
  const ctx = useContext(NavCtx)
  if (!ctx) throw new Error('useNav must be used within NavProvider')
  return ctx
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<ViewId>('overview')
  const [projectFocus, setProjectFocus] = useState<string | null>(null)

  const setView = useCallback((v: ViewId) => {
    setProjectFocus(null) // a nav click always lands on the view's top level
    setViewState(v)
  }, [])

  const openProject = useCallback((id: string) => {
    setViewState('projects')
    setProjectFocus(id)
  }, [])

  const clearProjectFocus = useCallback(() => setProjectFocus(null), [])

  const value = useMemo(
    () => ({ view, projectFocus, setView, openProject, clearProjectFocus }),
    [view, projectFocus, setView, openProject, clearProjectFocus],
  )
  return <NavCtx.Provider value={value}>{children}</NavCtx.Provider>
}
