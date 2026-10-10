import type { MathOSState } from './hooks/useMathOSState'
import type { Matrix } from './types'
import { isDataset, type Dataset } from './dataset'

export interface MathOSProject {
  format: 'upskillos-mathos'
  version: 1
  dataset?: Dataset | null
  input: string
  variables: Record<string, string | number>
  formulas: Record<string, string>
  matrices: Record<string, Matrix>
  savedScripts: Record<string, string>
  programs: { javascript: string; python: string; openmat: string }
  statsData: string
  matrixA: Matrix
  matrixB: Matrix
  graph: { functions: string[]; bounds: number[] }
  angleMode: 'RAD' | 'DEG'
}

export function captureProject(s: MathOSState): MathOSProject {
  return { format: 'upskillos-mathos', version: 1, dataset: s.dataset, input: s.input, variables: s.vars,
    formulas: s.formulas, matrices: s.matVars, savedScripts: s.scripts,
    programs: { javascript: s.script, python: s.pyScript, openmat: s.mlScript },
    statsData: s.statsData, matrixA: s.matA, matrixB: s.matB, angleMode: s.angleMode,
    graph: { functions: s.graphFns, bounds: [s.graphXMin, s.graphXMax, s.graphYMin, s.graphYMax] } }
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string'
const matrix = (value: unknown): value is Matrix => Array.isArray(value) && value.length > 0 && value.length <= 100
  && value.every(row => Array.isArray(row) && row.length > 0 && row.length <= 100 && row.length === value[0].length && row.every(text))
const dictionary = (value: unknown, valid: (entry: unknown) => boolean) => record(value)
  && Object.entries(value).every(([key, entry]) => !['__proto__', 'prototype', 'constructor'].includes(key) && valid(entry))

export function parseProject(source: string): MathOSProject {
  if (source.length > 5_000_000) throw new Error('Project is too large (maximum 5 MB).')
  const p = JSON.parse(source)
  if (!record(p) || p.format !== 'upskillos-mathos' || p.version !== 1
    || (p.dataset != null && !isDataset(p.dataset))
    || !text(p.input) || !text(p.statsData) || !['RAD', 'DEG'].includes(p.angleMode as string)
    || !dictionary(p.variables, v => text(v) || (typeof v === 'number' && Number.isFinite(v)))
    || !dictionary(p.formulas, text) || !dictionary(p.savedScripts, text) || !dictionary(p.matrices, matrix)
    || !matrix(p.matrixA) || !matrix(p.matrixB) || !record(p.programs)
    || !text(p.programs.javascript) || !text(p.programs.python) || !text(p.programs.openmat)
    || !record(p.graph) || !Array.isArray(p.graph.functions) || p.graph.functions.length > 4
    || !p.graph.functions.every(text) || !Array.isArray(p.graph.bounds) || p.graph.bounds.length !== 4
    || !p.graph.bounds.every(v => typeof v === 'number' && Number.isFinite(v))
    || !(p.graph.bounds[0] < p.graph.bounds[1]) || !(p.graph.bounds[2] < p.graph.bounds[3])) {
    throw new Error('Not a valid MathOS project (version 1). No work was replaced.')
  }
  return p as unknown as MathOSProject
}

export const REGRESSION_EXAMPLE = `// Linear regression: fit on training data, evaluate on held-out data.
// Change the measurements and rerun. This example does not need a server.
const train = [[0, 1.1], [1, 2.9], [2, 5.2], [3, 6.8], [4, 9.1]];
const test = [[5, 11], [6, 13.2]];
let slope = 0, intercept = 0;
for (let epoch = 0; epoch < 4000; epoch++) {
  let dm = 0, db = 0;
  for (const [x, y] of train) {
    const error = slope * x + intercept - y;
    dm += 2 * error * x / train.length;
    db += 2 * error / train.length;
  }
  slope -= 0.02 * dm;
  intercept -= 0.02 * db;
}
const mse = test.reduce((sum, [x, y]) => sum + (slope * x + intercept - y) ** 2, 0) / test.length;
console.log('Slope:', slope.toFixed(4), 'Intercept:', intercept.toFixed(4));
console.log('Held-out MSE:', mse.toFixed(4));
console.log('Prediction at x=7:', (slope * 7 + intercept).toFixed(4));
`;
