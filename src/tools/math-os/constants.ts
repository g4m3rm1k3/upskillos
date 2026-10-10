import type { SectionId } from './types'

export interface SectionDef {
  id: SectionId
  label: string
}

export const SECTIONS: SectionDef[] = [
  { id: 'data', label: 'Data & models' },
  { id: 'compute',   label: '∑ Compute' },
  { id: 'matrix',    label: '⊞ Matrix' },
  { id: 'sigma',     label: 'Σ Sigma' },
  { id: 'poly',      label: 'f(x) Poly' },
  { id: 'stats',     label: '📊 Stats' },
  { id: 'physics',   label: '⚛ Physics' },
  { id: 'machinist', label: '⚙ Machinist' },
  { id: 'triangle',  label: '△ Triangle' },
  { id: 'graph',     label: '📈 Graph' },
  { id: 'script',    label: '</> Script' },
  { id: 'formulas',  label: '📐 Formulas' },
]

export const GRAPH_COLORS = ['#60a5fa', '#34d399', '#f472b6', '#fb923c'] as const
