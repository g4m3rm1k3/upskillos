// ─── Shared types for MathOS ──────────────────────────────────────────────────

export type AngleMode = 'RAD' | 'DEG'
export type SectionId =
  | 'compute' | 'matrix' | 'sigma' | 'poly' | 'stats' | 'data'
  | 'physics' | 'machinist' | 'triangle' | 'graph' | 'script' | 'formulas'
export type ResultTab = 'symbolic' | 'visual' | 'code' | 'explain' | 'connections'
export type ExplainLevel = 'eli5' | 'student' | 'college' | 'advanced'
export type ScriptLang = 'js' | 'python' | 'matlab'
export type MLStatus = 'idle' | 'running' | 'done' | 'error'
export type PyodideStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface StepDef {
  label?: string
  latex: string
}

export interface CodeDef {
  js?: string
  py?: string
  mpl?: string
  ml?: string
  pt?: string
}

export interface ComputeResult {
  type: string
  numerical: string
  steps: StepDef[]
  code?: CodeDef | string
  expr?: string
  operation?: string
  explainKey?: string | null
  connKey?: string | null
  tableRows?: [number, number][]
  // matrix-specific
  matA?: (string | number)[][]
  matB?: (string | number)[][]
  // poly-specific
  roots?: number[]
  rootSteps?: StepDef[]
  quadSteps?: StepDef[]
  // stats-specific
  statsVals?: Record<string, number | string>
  // sigma-specific
  sigmaVal?: number
  // triangle
  a?: number; b?: number; c?: number
  A?: number; B?: number; C?: number
  area?: number; R?: number; r?: number
  error?: string
  // allow domain-specific extra fields without type errors
  [key: string]: unknown
}

export type Matrix = string[][]
export type MatrixOp =
  | 'det' | 'rref' | 'rank' | 'null_space' | 'col_space' | 'inverse'
  | 'trace' | 'lu' | 'eigen' | 'char_poly' | 'svd' | 'qr' | 'gram_schmidt'
  | 'condition' | 'power' | 'multiply' | 'add' | 'subtract' | 'scalar_mul'
  | 'dot' | 'cross' | 'norm' | 'linear_system' | 'projection' | 'least_squares'
  | 'basis' | 'independence' | 'similarity' | 'span' | 'transform2d'

export interface TriSides { a: string; b: string; c: string }
export interface TriAngles { A: string; B: string; C: string }

export interface PhysicsFormula {
  name: string
  latex: string
  vars: Record<string, { label: string; unit: string }>
  solve: (vals: Record<string, number>) => Record<string, number>
}

export interface MachinistFormula {
  name: string
  vars: Record<string, { label: string; unit?: string }>
  solve: (vals: Record<string, number>) => Record<string, number>
  latex?: string
}

export type { WorkspaceEntry } from '@opencalc/openmat'
import type { WorkspaceEntry } from '@opencalc/openmat'

// ─── State slices ─────────────────────────────────────────────────────────────

export interface CoreState {
  input: string
  setInput: (v: string) => void
  result: ComputeResult | null
  setResult: (r: ComputeResult | null) => void
  tab: ResultTab
  setTab: (t: ResultTab) => void
  explainLevel: ExplainLevel
  setExplainLevel: (l: ExplainLevel) => void
  activeView: string
  setActiveView: (v: string) => void
  angleMode: AngleMode
  setAngleMode: (m: AngleMode) => void
  vars: Record<string, number | string>
  setVars: (v: Record<string, number | string>) => void
  formulas: Record<string, string>
  setFormulas: (f: Record<string, string>) => void
  history: string[]
  histIdx: number
  section: SectionId
  setSection: (s: SectionId) => void
  compute: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  inputRef: React.RefObject<HTMLInputElement>
}

export interface MatrixState {
  matA: Matrix
  setMatA: (m: Matrix) => void
  matB: Matrix
  setMatB: (m: Matrix) => void
  matOp: MatrixOp
  setMatOp: (op: MatrixOp) => void
  matN: number
  setMatN: (n: number) => void
  matAugB: Matrix
  setMatAugB: (m: Matrix) => void
  matVars: Record<string, Matrix>
  setMatVars: (v: Record<string, Matrix>) => void
  matExpr: string
  setMatExpr: (e: string) => void
  matExprResult: ComputeResult | null
  setMatExprResult: (r: ComputeResult | null) => void
}

export interface SigmaState {
  sigExpr: string
  setSigExpr: (e: string) => void
  sigLo: string
  setSigLo: (v: string) => void
  sigHi: string
  setSigHi: (v: string) => void
  sigN: number
  setSigN: (n: number) => void
}

export interface PolyState {
  polyExpr: string
  setPolyExpr: (e: string) => void
}

export interface StatsState {
  statsData: string
  setStatsData: (d: string) => void
}

export interface PhysicsState {
  physFormula: PhysicsFormula | null
  setPhysFormula: (f: PhysicsFormula | null) => void
  physVarsLocal: Record<string, string>
  setPhysVarsLocal: (v: Record<string, string>) => void
}

export interface MachinistState {
  machFormula: MachinistFormula | null
  setMachFormula: (f: MachinistFormula | null) => void
  machVarsLocal: Record<string, string>
  setMachVarsLocal: (v: Record<string, string>) => void
  machResult: ComputeResult | null
  setMachResult: (r: ComputeResult | null) => void
}

export interface GraphState {
  graphFns: string[]
  setGraphFns: (fns: string[]) => void
  graphXMin: number
  setGraphXMin: (v: number) => void
  graphXMax: number
  setGraphXMax: (v: number) => void
  graphYMin: number
  setGraphYMin: (v: number) => void
  graphYMax: number
  setGraphYMax: (v: number) => void
}

export interface TriangleState {
  triSides: TriSides
  setTriSides: (s: TriSides) => void
  triAngles: TriAngles
  setTriAngles: (a: TriAngles) => void
  triResult: ComputeResult | null
  setTriResult: (r: ComputeResult | null) => void
  computeTriangle: () => void
}

export interface ScriptState {
  scriptLang: ScriptLang
  setScriptLang: (l: ScriptLang) => void
  script: string
  setScript: (s: string) => void
  pyScript: string
  setPyScript: (s: string) => void
  mlScript: string
  setMlScript: (s: string) => void
  mlOutput: string
  setMlOutput: (s: string) => void
  mlWorkspace: WorkspaceEntry[]
  setMlWorkspace: (w: WorkspaceEntry[]) => void
  mlStatus: MLStatus
  setMlStatus: (s: MLStatus) => void
  scriptOutput: string
  setScriptOutput: (s: string) => void
  scriptName: string
  setScriptName: (n: string) => void
  scripts: Record<string, string>
  setScripts: (s: Record<string, string>) => void
  pyodideStatus: PyodideStatus
  setPyodideStatus: (s: PyodideStatus) => void
  pyImages: string[]
  setPyImages: (imgs: string[]) => void
  iframeRef: React.RefObject<HTMLIFrameElement>
}

export interface MathOSState extends
  CoreState,
  MatrixState,
  SigmaState,
  PolyState,
  StatsState,
  PhysicsState,
  MachinistState,
  GraphState,
  TriangleState,
  ScriptState {}
