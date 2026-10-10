import type { Matrix } from './types'
import type { MathOSProject } from './project'
import { isDataset, type Dataset } from './dataset'
const LS_DATASET = 'oc_math_os_dataset'
export function loadDataset(): Dataset | null {
  const value = safeGet(LS_DATASET, null)
  return isDataset(value) ? value : null
}
export const saveDataset = (value: Dataset | null) => safeSet(LS_DATASET, value)

// Save every persistent project collection before changing the live workspace.
export function saveProjectMemory(project: MathOSProject): void {
  const entries = [[LS_VARS, project.variables], [LS_FORMULAS, project.formulas],
    [LS_SCRIPTS, project.savedScripts], [LS_MAT_VARS, project.matrices], [LS_DATASET, project.dataset ?? null]] as const
  const previous = entries.map(([key]) => [key, localStorage.getItem(key)] as const)
  try { for (const [key, value] of entries) localStorage.setItem(key, JSON.stringify(value)) }
  catch (error) {
    for (const [key, value] of previous) {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    }
    throw error
  }
}

const LS_VARS     = 'oc_memory'
const LS_FORMULAS = 'oc_formulas'
const LS_SCRIPTS  = 'oc_scripts'
const LS_HISTORY  = 'oc_math_os_history'
const LS_MAT_VARS = 'oc_mat_vars'

function safeGet<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}
function safeSet(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export const loadVars    = (): Record<string, number | string> => safeGet(LS_VARS, {})
export const saveVars    = (v: Record<string, number | string>) => safeSet(LS_VARS, v)

export const loadFormulas = (): Record<string, string> => safeGet(LS_FORMULAS, {})
export const saveFormulas = (f: Record<string, string>) => safeSet(LS_FORMULAS, f)

export const loadScripts = (): Record<string, string> => safeGet(LS_SCRIPTS, {})
export const saveScripts = (s: Record<string, string>) => safeSet(LS_SCRIPTS, s)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const loadHistory = (): any[] => safeGet(LS_HISTORY, [])
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const saveHistory = (h: any[]) => safeSet(LS_HISTORY, h.slice(-100))

export const loadMatVars = (): Record<string, Matrix> => safeGet(LS_MAT_VARS, {})
export const saveMatVars = (v: Record<string, Matrix>) => safeSet(LS_MAT_VARS, v)
