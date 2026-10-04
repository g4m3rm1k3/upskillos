export const INSPECTOR_IDS = ['explain', 'events', 'output', 'variables', 'heap', 'calltree', 'scope', 'structure', 'tokens', 'ast'] as const
export type InspectorId = typeof INSPECTOR_IDS[number]
export interface InspectorPane { tabs: InspectorId[]; active: InspectorId | null }
export interface InspectorWorkspace {
  panes: InspectorPane[]
  direction: 'row' | 'column'
  sizes: number[]
}
export const WORKSPACE_KEY = 'codelens-inspector-workspace-v1'
const isId = (value: unknown): value is InspectorId => INSPECTOR_IDS.includes(value as InspectorId)

export function defaultWorkspace(): InspectorWorkspace {
  return {
    panes: [
      { tabs: ['explain', 'events'], active: 'explain' },
      { tabs: ['output', 'variables', 'heap', 'calltree', 'scope', 'structure', 'tokens', 'ast'], active: 'output' },
    ],
    direction: 'row', sizes: [1, 1],
  }
}

// Treat saved layout as untrusted: every known tab appears exactly once,
// even after an interrupted save or a newer version adds a tab.
export function restoreWorkspace(value: unknown): InspectorWorkspace {
  const candidate = value as Partial<InspectorWorkspace> | null
  if (!candidate || !Array.isArray(candidate.panes) || candidate.panes.length < 1 || candidate.panes.length > 3) return defaultWorkspace()
  const seen = new Set<InspectorId>()
  const panes = candidate.panes.map(pane => {
    const tabs = (Array.isArray(pane?.tabs) ? pane.tabs : []).filter(id => {
      if (!isId(id) || seen.has(id)) return false
      seen.add(id)
      return true
    })
    return { tabs, active: tabs.includes(pane?.active as InspectorId) ? pane.active! : tabs[0] ?? null }
  })
  panes[0].tabs.push(...INSPECTOR_IDS.filter(id => !seen.has(id)))
  if (!panes[0].active) panes[0].active = panes[0].tabs[0] ?? null
  return {
    panes, direction: candidate.direction === 'column' ? 'column' : 'row',
    sizes: panes.map((_, i) => {
      const size = candidate.sizes?.[i]
      return typeof size === 'number' && Number.isFinite(size) && size >= 0.1 && size <= 10 ? size : 1
    }),
  }
}

export function moveInspector(state: InspectorWorkspace, id: InspectorId, target: number, before?: InspectorId): InspectorWorkspace {
  if (!isId(id) || !state.panes[target] || id === before) return state
  const panes = state.panes.map(pane => {
    const tabs = pane.tabs.filter(tab => tab !== id)
    return { tabs, active: pane.active === id ? tabs[0] ?? null : pane.active }
  })
  const at = before ? panes[target].tabs.indexOf(before) : -1
  panes[target].tabs.splice(at < 0 ? panes[target].tabs.length : at, 0, id)
  panes[target].active = id
  return { ...state, panes }
}

export function activateInspector(state: InspectorWorkspace, id: InspectorId): InspectorWorkspace {
  return { ...state, panes: state.panes.map(pane => pane.tabs.includes(id) ? { ...pane, active: id } : pane) }
}

export function setPaneCount(state: InspectorWorkspace, count: number): InspectorWorkspace {
  if (!Number.isInteger(count) || count < 1 || count > 3) return state
  const panes = state.panes.slice(0, count).map(p => ({ ...p, tabs: [...p.tabs] }))
  for (const removed of state.panes.slice(count)) panes[0].tabs.push(...removed.tabs)
  while (panes.length < count) panes.push({ tabs: [], active: null })
  return { ...state, panes, sizes: panes.map(() => 1) }
}

export function readWorkspace(): InspectorWorkspace {
  try { return restoreWorkspace(JSON.parse(localStorage.getItem(WORKSPACE_KEY) ?? 'null')) }
  catch { return defaultWorkspace() }
}
