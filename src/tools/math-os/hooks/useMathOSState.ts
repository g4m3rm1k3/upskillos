import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  fmtNum, buildScope, calcEval, nDeriv, fnInt, solveZero,
  parseMatrix, hasNaN, matLatex, vecLatex, toFrac,
  solveRREF, solveDeterminant, solveInverse, solveTranspose, solveTrace,
  solveRank, solveNullSpace, solveColumnSpace, solveLU, solveEigenvalues,
  solveQR, solveSVD, solveGramSchmidt, solveConditionNumber, solveMatrixPower,
  solveCharPoly, solveMultiply, solveAdd, solveSubtract, solveScalarMul,
  solveDot, solveCross, solveNorm, solveLinearSystem, solveProjection, solveLeastSquares,
  safeEval, matchClosedForm,
  polyEvalAt, findRoots, detectDegree, buildQuadSteps,
  solveStats, generateCode, EXPLANATIONS, CONNECTIONS,
  solveBasis, solveLinearIndependence, solveSimilarity, solveSpan,
  simplifyExpr, expandExpr,
} from '../mathEngines.js'
import { executeScript as openmatExec } from '../../../engines/openmat/openmatEngine.js'
import { createPyodide as createBundledPyodide } from '../../../utils/pyodideRuntime.js'
import {
  loadVars, saveVars, loadFormulas, saveFormulas,
  loadScripts, saveScripts, loadHistory, saveHistory,
  loadMatVars, saveMatVars, saveProjectMemory,
} from '../storage'
import type { MathOSProject } from '../project'
import type { Dataset } from '../dataset'
import { loadDataset, saveDataset } from '../storage'
import type {
  AngleMode, SectionId, ResultTab, ExplainLevel, ScriptLang, MLStatus, PyodideStatus,
  Matrix, ComputeResult, WorkspaceEntry,
} from '../types'

export function useMathOSState() {
  const [dataset, setDatasetState] = useState<Dataset | null>(loadDataset)
  function setDataset(value: Dataset) {
    saveDataset(value)
    setDatasetState(value)
  }
  // ─── CORE ────────────────────────────────────────────────────────────────────
  const [input, setInput]           = useState('')
  const [result, setResult]         = useState<ComputeResult | null>(null)
  const [activeView, setActiveView] = useState('symbolic')
  const [explainLevel, setExplainLevel] = useState<ExplainLevel>('student')
  const [angleMode, setAngleMode]   = useState<AngleMode>('RAD')
  const [vars, setVarsState]        = useState<Record<string, number | string>>(loadVars)
  const [formulas, setFormulasState]= useState<Record<string, string>>(loadFormulas)
  const [history, setHistory]       = useState<{ input: string; result: ComputeResult }[]>(loadHistory)
  const [histIdx, setHistIdx]       = useState(-1)
  const [section, setSection]       = useState<SectionId>('compute')
  const [tab, setTab]               = useState<ResultTab>('symbolic')
  const inputRef                    = useRef<HTMLInputElement>(null)

  // ─── MATRIX ──────────────────────────────────────────────────────────────────
  const [matA, setMatA]             = useState<Matrix>([['1','0'],['0','1']])
  const [matB, setMatB]             = useState<Matrix>([['1','0'],['0','1']])
  const [matOp, setMatOp]           = useState('det')
  const [matN, setMatN]             = useState(2)
  const [matAugB, setMatAugB]       = useState<Matrix>([['1'],['0']])
  const [matVars, setMatVarsState]  = useState<Record<string, Matrix>>(loadMatVars)
  const [matExpr, setMatExpr]       = useState('')
  const [matExprResult, setMatExprResult] = useState<ComputeResult | null>(null)

  // ─── SIGMA ───────────────────────────────────────────────────────────────────
  const [sigExpr, setSigExpr] = useState('i')
  const [sigLo, setSigLo]     = useState('1')
  const [sigHi, setSigHi]     = useState('n')
  const [sigN, setSigN]       = useState(10)

  // ─── POLY ────────────────────────────────────────────────────────────────────
  const [polyExpr, setPolyExpr] = useState('x^2 - 5*x + 6')

  // ─── STATS ───────────────────────────────────────────────────────────────────
  const [statsData, setStatsData] = useState('1, 2, 3, 4, 5')

  // ─── PHYSICS / MACHINIST ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [physFormula, setPhysFormula]     = useState<any>(null)
  const [physVarsLocal, setPhysVarsLocal] = useState<Record<string, string>>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [machFormula, setMachFormula]     = useState<any>(null)
  const [machVarsLocal, setMachVarsLocal] = useState<Record<string, string>>({})
  const [machResult, setMachResult]       = useState<ComputeResult | null>(null)

  // ─── GRAPH ───────────────────────────────────────────────────────────────────
  const [graphFns, setGraphFns]   = useState(['x^2','sin(x)','',''])
  const [graphXMin, setGraphXMin] = useState(-10)
  const [graphXMax, setGraphXMax] = useState(10)
  const [graphYMin, setGraphYMin] = useState(-10)
  const [graphYMax, setGraphYMax] = useState(10)

  // ─── TRIANGLE ────────────────────────────────────────────────────────────────
  const [triSides, setTriSides]   = useState({ a:'', b:'', c:'' })
  const [triAngles, setTriAngles] = useState({ A:'', B:'', C:'' })
  const [triResult, setTriResult] = useState<ComputeResult | null>(null)

  // ─── SCRIPT ──────────────────────────────────────────────────────────────────
  const [scriptLang, setScriptLang]     = useState<ScriptLang>('js')
  const [script, setScript]             = useState(
    '// All stored variables are available\n// console.log output appears below\nconsole.log("Hello from MathOS script!");'
  )
  const [pyScript, setPyScript]         = useState(
    '# numpy and matplotlib available\nimport numpy as np\nimport matplotlib.pyplot as plt\n\nx = np.linspace(0, 2*np.pi, 100)\ny = np.sin(x)\nprint("sin(pi/2) =", np.sin(np.pi/2))\nplt.plot(x, y)\nplt.title("sin(x)")\nplt.grid(True)\nplt.show()'
  )
  const [mlScript, setMlScript]         = useState(
    '% OpenMAT — MATLAB-like engine (runs in browser)\nA = [-3 1; 5 2];\nM = [1 1; 1 0];\nB = inv(M) * A * M;\ndisp(\'A =\'); disp(A)\ndisp(\'M =\'); disp(M)\ndisp(\'B = inv(M)*A*M =\'); disp(B)'
  )
  const [mlOutput, setMlOutput]         = useState('')
  const [mlWorkspace, setMlWorkspace]   = useState<WorkspaceEntry[]>([])
  const [mlStatus, setMlStatus]         = useState<MLStatus>('idle')
  const [scriptOutput, setScriptOutput] = useState('')
  const [scriptName, setScriptName]     = useState('')
  const [scripts, setScriptsState]      = useState<Record<string, string>>(loadScripts)
  const [pyodideStatus, setPyodideStatus] = useState<PyodideStatus>('idle')
  const [pyImages, setPyImages]         = useState<string[]>([])
  const iframeRef                       = useRef<HTMLIFrameElement>(null)
  const pyodideRef                      = useRef<unknown>(null)

  // ─── PERSISTENCE SETTERS ─────────────────────────────────────────────────────
  const setVars     = useCallback((v: Record<string, number | string>) => { setVarsState(v); saveVars(v) }, [])
  const setFormulas = useCallback((f: Record<string, string>) => { setFormulasState(f); saveFormulas(f) }, [])
  const setScripts  = useCallback((s: Record<string, string>) => { setScriptsState(s); saveScripts(s) }, [])
  const setMatVars  = useCallback((v: Record<string, Matrix>) => { setMatVarsState(v); saveMatVars(v) }, [])

  // ─── MATRIX AUTO-RESHAPE ON OP CHANGE ────────────────────────────────────────
  useEffect(() => {
    const vectorOps = new Set(['dot','cross','norm'])
    const squareOps = new Set(['det','inverse','trace','lu','eigen','char_poly','condition','power','transform2d'])
    const fixedOps: Record<string, number> = { transform2d: 2 }
    const needsBOps = new Set(['multiply','add','subtract','dot','cross'])
    const needsAugOps = new Set(['linear_system','projection','least_squares'])

    if (fixedOps[matOp] !== undefined) {
      const n = fixedOps[matOp]
      setMatA(Array.from({length:n}, () => Array(n).fill('0')))
    } else if (vectorOps.has(matOp)) {
      const n = Math.max(2, matA.length)
      if (matA[0]?.length !== 1) setMatA(Array.from({length:n}, (_,r) => [matA[r]?.[0] ?? '0']))
      if (needsBOps.has(matOp) && matB[0]?.length !== 1)
        setMatB(Array.from({length:n}, (_,r) => [matB[r]?.[0] ?? '0']))
    } else if (squareOps.has(matOp) && matA.length !== matA[0]?.length) {
      const n = matA.length
      setMatA(Array.from({length:n}, (_,r) => Array.from({length:n}, (_,c) => matA[r]?.[c] ?? '0')))
    }
    if (needsAugOps.has(matOp) && matAugB.length !== matA.length) {
      setMatAugB(Array.from({length:matA.length}, (_,r) => [matAugB[r]?.[0] ?? '0']))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matOp])

  // ─── IFRAME MESSAGE HANDLER ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'script-output') {
        const out = [...e.data.log, ...e.data.err.map((s: string) => '[ERR] ' + s)]
        setScriptOutput(out.join('\n'))
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // ─── HELPERS ─────────────────────────────────────────────────────────────────
  function detectIntent(raw: string) {
    const s = raw.toLowerCase().trim()
    if (/\bintegrat(e|ion)\b|\b∫\b|∫|integral/.test(s)) return 'integral'
    if (/\bderivat(ive|e)\b|d\/d[a-z]|f'\(|differentiat/.test(s)) return 'derivative'
    if (/\bright triangle\b|\bpythagorean\b/.test(s)) return 'pythagorean'
    if (/\bsolve\b.*=.*/.test(s) && !/matrix|vector/.test(s)) return 'solve_eq'
    if (/\bfactor\b/.test(s) && !/matrix/.test(s)) return 'factor'
    if (/\bplot\b|\bgraph\b/.test(s)) return 'graph'
    if (/\bstat(istic)?\b|\bmean\b|\bmedian\b|\bstd dev\b|\bstandard dev/.test(s)) return 'stats'
    if (/F\s*=\s*ma|kinetic|potential energy|ohm|Newton|gravity|displacement|wavelength|ideal gas|velocity|torque|pressure/.test(raw)) return 'physics'
    if (/SFM|RPM|feed rate|tap drill|machinist/.test(raw)) return 'machinist'
    if (/^table\s*\(/.test(s)) return 'table'
    if (/^simplify\b/.test(s)) return 'simplify'
    if (/^expand\b/.test(s)) return 'expand'
    if (/^factor\b/.test(s)) return 'factor'
    if (/nDeriv\(|fnInt\(/.test(raw)) return 'calc_fn'
    return 'calc'
  }

  function mathEvalSafe(expr: string, scope: Record<string, number>) {
    try {
      const cleaned = expr.replace(/(\d)([a-zA-Z(])/g, '$1*$2').replace(/\)(\d|[a-zA-Z(])/g, ')*$1')
        .replace(/÷/g,'/').replace(/×/g,'*').replace(/−/g,'-').replace(/π/g,'pi')
      const r = calcEval(cleaned, scope)
      return typeof r === 'number' ? r : (r && typeof r === 'object' ? r : null)
    } catch { return null }
  }

  function buildArithSteps(expr: string, val: number, scope: Record<string, number>) {
    const steps = [{ label: 'Expression', latex: expr.replace(/_/g,'\\_') }]
    const cleaned = expr.replace(/(\d)([a-zA-Z(])/g, '$1*$2').replace(/÷/g,'/').replace(/×/g,'*').replace(/π/g,'\\pi')
    if (cleaned !== expr) steps.push({ label: 'Expand implicit multiplication', latex: cleaned })
    if (angleMode === 'DEG') steps.push({ label: 'Angle mode: degrees', latex: '\\theta_{\\text{rad}} = \\theta_{\\text{deg}} \\cdot \\frac{\\pi}{180}' })
    steps.push({ label: 'Answer', latex: `\\boxed{${fmtNum(val)}}` })
    return steps
  }

  // ─── COMPUTE ─────────────────────────────────────────────────────────────────
  function compute() {
    const raw = input.trim(); if (!raw) return
    const scope = buildScope(angleMode, vars['ans'] ?? 0, vars)
    let res: ComputeResult | null = null

    try {
      const intent = detectIntent(raw)

      if (intent === 'integral') {
        const m = raw.match(/integrat\w*\s+(.+?)\s+(?:from|d?x)\s+(-?[\d.]+)\s+to\s+(-?[\d.]+)/i)
          || raw.match(/∫\s*(.+?)\s*(?:from|dx)?\s*(-?[\d.]+)\s*to\s*(-?[\d.]+)/i)
        if (m) {
          const expr = m[1].trim(), a = parseFloat(m[2]), b = parseFloat(m[3])
          const val = fnInt(expr, 'x', a, b, scope)
          const steps = [
            { label: 'Integral', latex: `\\int_{${a}}^{${b}} ${expr}\\,dx` },
            { label: "Numerical method: Simpson's Rule (n=1000)", latex: `\\int_{a}^{b} f(x)\\,dx \\approx \\tfrac{h}{3}\\Bigl[f(a)+4f(a{+}h)+2f(a{+}2h)+\\cdots+f(b)\\Bigr]` },
            { label: 'Result', latex: `\\boxed{\\int_{${a}}^{${b}} ${expr}\\,dx \\approx ${fmtNum(val)}}` },
          ]
          const code = generateCode('integral', { expr, a, b })
          res = { type: 'integral', numerical: fmtNum(val), steps, code, expr, a, b, explainKey: 'integral', connKey: 'integral' }
        }
      } else if (intent === 'derivative') {
        const m = raw.match(/derivat\w*\s+(?:of\s+)?(.+?)\s+(?:at\s+)?x\s*=\s*(-?[\d.]+)/i)
        if (m) {
          const expr = m[1].trim(), xv = parseFloat(m[2])
          const val = nDeriv(expr, 'x', xv, scope)
          const steps = [
            { label: 'Expression', latex: `f(x) = ${expr}` },
            { label: 'Numerical derivative (central difference)', latex: `f'(x) \\approx \\frac{f(x+h)-f(x-h)}{2h},\\quad h=10^{-7}` },
            { label: 'At x = ' + xv, latex: `\\boxed{f'(${xv}) \\approx ${fmtNum(val)}}` },
          ]
          const code = generateCode('derivative', { expr, x: xv })
          res = { type: 'derivative', numerical: fmtNum(val), steps, code, expr, xv, explainKey: 'derivative', connKey: 'derivative' }
        }
      } else if (intent === 'table') {
        const m = raw.match(/table\s*\(\s*(.+?)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)(?:\s*,\s*(-?[\d.]+))?\s*\)/i)
        if (m) {
          const expr = m[1].trim()
          const lo = parseFloat(m[2]), hi = parseFloat(m[3])
          const step = m[4] ? parseFloat(m[4]) : (hi - lo) / 20
          const rows: [number, number][] = []
          for (let x = lo; x <= hi + step * 0.001; x += step) {
            try { rows.push([x, Number(calcEval(expr, { ...scope, x }))]) } catch { rows.push([x, NaN]) }
          }
          const steps = [
            { label: `Table: ${expr}`, latex: `x \\in [${lo}, ${hi}],\\quad \\Delta x = ${fmtNum(step)}` },
            { label: `${rows.length} values`, latex: `f(${lo}) = ${fmtNum(rows[0]?.[1])},\\quad \\cdots ,\\quad f(${hi.toFixed(4)}) = ${fmtNum(rows[rows.length-1]?.[1])}` },
          ]
          res = { type: 'table', numerical: `${rows.length} rows`, steps, tableRows: rows, code: {
            js: `// Table: ${expr}\nfor (let x=${lo}; x<=${hi}; x+=${step}) {\n  const y = ${expr.replace(/\^/g,'**')};\n  console.log(x.toFixed(4), y);\n}`,
            py: `import numpy as np\nx = np.arange(${lo}, ${hi+step*0.001}, ${step})\ny = ${expr.replace(/\^/g,'**')}\nfor xi, yi in zip(x, y):\n    print(f'{xi:.4f}  {yi:.6f}')`,
            ml: `x = ${lo}:${step}:${hi};\ny = ${expr.replace(/\^/g,'.^')};\n[x(:), y(:)]`,
          }, explainKey: null, connKey: null }
          setTab('visual')
        }
      } else if (intent === 'solve_eq') {
        const m = raw.match(/solve\s+(.+?)\s*=\s*(.+)/i)
        if (m) {
          const lhs = m[1].trim(), rhs = m[2].trim()
          const expr = `(${lhs})-(${rhs})`
          const root = solveZero(expr, 'x', 0, scope)
          const steps = [
            { label: 'Equation', latex: `${lhs} = ${rhs}` },
            { label: 'Rearrange: f(x) = 0', latex: `f(x) = ${lhs} - (${rhs}) = 0` },
            { label: 'Newton-Raphson: x₁ = x₀ − f(x₀)/f\'(x₀)', latex: `x_0 = 0` },
            { label: 'Answer', latex: `\\boxed{x \\approx ${fmtNum(root)}}` },
          ]
          res = { type: 'solve_eq', numerical: fmtNum(root), steps, code: generateCode('calc', { expr }), explainKey: 'derivative', connKey: 'poly' }
        }
      } else if (intent === 'simplify' || intent === 'expand' || intent === 'factor') {
        const expr = raw.replace(/^(simplify|expand|factor)\s*/i,'').trim()
        if (intent === 'factor') {
          const roots = findRoots(expr)
          const degree = detectDegree(expr)
          const steps = [
            { label: `Factor: ${expr}`, latex: `f(x) = ${expr}` },
            ...(roots.length
              ? [{ label: 'Real roots (Newton-Raphson scan)', latex: `x = ${roots.map(toFrac).join(',\\;')}` },
                 { label: 'Factored form', latex: `f(x) = ${roots.map((r: number) => `(x - ${toFrac(r)})`).join('')}` }]
              : [{ label: 'No real roots in [-15, 15]', latex: '\\text{No real factors found — may have complex roots}' }]),
          ]
          res = { type: 'poly', numerical: roots.map(toFrac).join(', ') || 'No real roots', steps, code: generateCode('poly',{expr}), expr, roots: roots || [], degree, explainKey: 'poly', connKey: 'poly' }
        } else {
          const r = intent === 'expand' ? expandExpr(expr) : simplifyExpr(expr)
          const label = intent === 'expand' ? 'Expanded' : 'Simplified'
          const steps = r.ok
            ? [{ label: `${label}: ${expr}`, latex: expr }, { label, latex: `\\boxed{${r.latex || r.result}}` }]
            : [{ label: 'Error', latex: `\\text{${r.error?.slice(0,80)?.replace(/[<>&]/g,' ')}}` }]
          res = { type: 'calc', numerical: r.ok ? (r.result ?? 'Error') : 'Error', steps, code: generateCode('calc',{expr}), expr, explainKey: null, connKey: null }
        }
      } else if (intent === 'pythagorean') {
        const nums = raw.match(/-?[\d.]+/g)?.map(Number) || []
        if (nums.length >= 2) {
          const [a, b] = nums; const c = Math.sqrt(a**2 + b**2)
          const steps = [
            { label: 'Pythagorean Theorem', latex: 'a^2 + b^2 = c^2' },
            { label: 'Substitute', latex: `${a}^2 + ${b}^2 = ${a*a} + ${b*b} = ${a*a+b*b}` },
            { label: 'Answer', latex: `\\boxed{c = \\sqrt{${a*a+b*b}} = ${fmtNum(c)}}` },
          ]
          res = { type: 'pythagorean', numerical: fmtNum(c), steps, explainKey: 'poly', connKey: 'poly' }
        }
      } else if (intent === 'graph') {
        const expr = raw.replace(/^(plot|graph)\s+/i, '').trim()
        setGraphFns([expr, '', '', ''])
        setSection('graph')
        return
      } else {
        const sto = raw.match(/^(.+?)\s*sto→?\s*([a-zA-Z]\w*)$/i) || raw.match(/^([a-zA-Z]\w*)\s*=\s*([^=].*)$/)
        if (sto) {
          const varName = sto[2]?.trim() || sto[1]?.trim()
          const exprPart = sto[1]?.trim() || sto[2]?.trim()
          if (varName && !/^\d+$/.test(varName)) {
            let val: number
            try { val = Number(mathEvalSafe(exprPart ?? '', scope)) } catch { val = parseFloat(exprPart ?? '') }
            if (isFinite(val)) {
              const newVars = { ...vars, [varName]: val }; setVars(newVars)
              const steps = [{ label: 'Store', latex: `${varName} \\leftarrow ${fmtNum(val)}` }]
              res = { type: 'store', numerical: fmtNum(val), steps, varName, code: generateCode('calc', { expr: exprPart }), explainKey: null, connKey: null }
            }
          }
        } else {
          const val = mathEvalSafe(raw, scope)
          if (val !== null) {
            const numVal = Number(val)
            const newVars = { ...vars, ans: numVal }; setVars(newVars)
            const steps = buildArithSteps(raw, numVal, scope)
            const code = generateCode('calc', { expr: raw })
            res = { type: 'calc', numerical: fmtNum(numVal), steps, code, expr: raw, explainKey: null, connKey: null }
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      res = { type: 'error', numerical: 'Error', steps: [{ label: 'Error', latex: `\\text{${msg.replace(/[<>]/g,' ')}}` }], code: { js: '', py: '', ml: '' }, explainKey: null, connKey: null }
    }

    if (!res) {
      res = { type: 'unrecognized', numerical: '?', steps: [{ label: 'Not recognized', latex: `\\text{Try: "integrate x^2 from 0 to 1", "derivative of x^3 at x=2", or use a section below.}` }], code: { js: '', py: '', ml: '' }, explainKey: null, connKey: null }
    }

    setResult(res)
    setTab('symbolic')
    const newHistory = [...history, { input, result: res }].slice(-100)
    setHistory(newHistory); saveHistory(newHistory)
    setHistIdx(-1)
  }

  // ─── MATRIX COMPUTE ──────────────────────────────────────────────────────────
  function computeMatrix() {
    const A = parseMatrix(matA)
    const B = parseMatrix(matB)
    if (hasNaN(A)) {
      setResult({ type: 'error', numerical: 'Error', steps: [{ label: 'Error', latex: '\\text{Matrix A has invalid entries.}' }], code: { js:'',py:'',ml:'' }, explainKey: null, connKey: null })
      return
    }

    let steps: { label?: string; latex: string }[] = []
    let numerical = ''
    let code = {js:'',py:'',ml:''}
    const N = typeof matN === 'number' ? matN : parseInt(String(matN))

    const opMap: Record<string, () => { explainKey: string | null; connKey: string | null; rank?: number } | null> = {
      det: () => { steps = solveDeterminant(A); try { const last = steps[steps.length-1]?.latex || ''; const m = last.match(/\\boxed\{.*?=(.+?)\}/); numerical = m ? m[1].trim() : '' } catch {}; code = generateCode('det',{matrix:A}); return { explainKey:'det', connKey:'det' } },
      rref: () => { const r = solveRREF(A); steps = r.steps; code = generateCode('rref',{matrix:A}); return { explainKey:'rref', connKey:'rref', rank: r.rank } },
      inverse: () => { steps = solveInverse(A); code = generateCode('det',{matrix:A}); return { explainKey:'det', connKey:'inverse' } },
      transpose: () => { steps = solveTranspose(A); return { explainKey:null, connKey:null } },
      trace: () => { steps = solveTrace(A); return { explainKey:null, connKey:'det' } },
      rank: () => { steps = solveRank(A); return { explainKey:'rref', connKey:'rref' } },
      null_space: () => { steps = solveNullSpace(A); return { explainKey:'rref', connKey:'rref' } },
      col_space: () => { steps = solveColumnSpace(A); return { explainKey:'rref', connKey:'rref' } },
      lu: () => { steps = solveLU(A); return { explainKey:null, connKey:'lu' } },
      eigen: () => { steps = solveEigenvalues(A); code = generateCode('eigen',{matrix:A}); return { explainKey:'eigen', connKey:'eigen' } },
      char_poly: () => { steps = solveCharPoly(A); return { explainKey:'eigen', connKey:'eigen' } },
      qr: () => { steps = solveQR(A); return { explainKey:null, connKey:'qr' } },
      svd: () => { steps = solveSVD(A); return { explainKey:null, connKey:'svd' } },
      gram_schmidt: () => { steps = solveGramSchmidt(A); return { explainKey:null, connKey:'qr' } },
      condition: () => { steps = solveConditionNumber(A); return { explainKey:null, connKey:'eigen' } },
      power: () => { steps = solveMatrixPower(A, N); return { explainKey:null, connKey:'eigen' } },
      multiply: () => { if (hasNaN(B)) return null; steps = solveMultiply(A, B); return { explainKey:null, connKey:'dot' } },
      add: () => { if (hasNaN(B)) return null; steps = solveAdd(A, B); return { explainKey:null, connKey:null } },
      subtract: () => { if (hasNaN(B)) return null; steps = solveSubtract(A, B); return { explainKey:null, connKey:null } },
      scalar: () => { steps = solveScalarMul(A, N); return { explainKey:null, connKey:null } },
      dot: () => { if (hasNaN(B)) return null; steps = solveDot(A, B); return { explainKey:null, connKey:'dot' } },
      cross: () => { if (hasNaN(B)) return null; steps = solveCross(A, B); return { explainKey:null, connKey:'cross' } },
      norm: () => { steps = solveNorm(A); return { explainKey:null, connKey:'dot' } },
      linear_system: () => { if (hasNaN(matAugB)) return null; const bParsed = parseMatrix(matAugB); steps = solveLinearSystem(A, bParsed); return { explainKey:'rref', connKey:'rref' } },
      projection: () => { if (hasNaN(matAugB)) return null; const bParsed = parseMatrix(matAugB); steps = solveProjection(A, bParsed); return { explainKey:null, connKey:'dot' } },
      least_squares: () => { if (hasNaN(matAugB)) return null; const bParsed = parseMatrix(matAugB); steps = solveLeastSquares(A, bParsed); return { explainKey:null, connKey:'qr' } },
      transform2d: () => { steps = [{ label:'2D Transform', latex: matLatex(A,'T = ') }, { label:'Apply to i, j', latex:`T\\begin{pmatrix}1\\\\0\\end{pmatrix}=${vecLatex(A.map((r: string[]) => r[0]))},\\;T\\begin{pmatrix}0\\\\1\\end{pmatrix}=${vecLatex(A.map((r: string[]) => r[1]))}` }]; return { explainKey:null, connKey:'eigen' } },
      basis: () => { steps = solveBasis(A); return { explainKey:'rref', connKey:'rref' } },
      span: () => { steps = solveSpan(A); return { explainKey:'rref', connKey:'rref' } },
      linear_independence: () => { steps = solveLinearIndependence(A); return { explainKey:'rref', connKey:'rref' } },
      similarity: () => { if (hasNaN(B)) return null; steps = solveSimilarity(A, B); return { explainKey:'eigen', connKey:'eigen' } },
    }

    const fn = opMap[matOp]
    if (!fn) { setResult({ type:'error', numerical:'?', steps:[{label:'Unknown op',latex:`\\text{Unknown operation: ${matOp}}`}], code, explainKey:null, connKey:null }); return }
    const meta = fn()
    if (!meta) { setResult({ type:'error', numerical:'?', steps:[{label:'Error',latex:'\\text{Matrix B has invalid entries.}'}], code, explainKey:null, connKey:null }); return }

    setResult({ type: 'matrix', operation: matOp, numerical: steps[steps.length-1]?.latex || '', steps, code, ...meta })
    setTab('symbolic')
  }

  // ─── SIGMA COMPUTE ────────────────────────────────────────────────────────────
  function computeSigma() {
    const n = parseInt(String(sigN))
    const lo = parseInt(sigLo) || 1
    const hiNum = sigHi === 'n' ? n : parseInt(sigHi)
    const terms: number[] = []
    let total = 0
    for (let i = lo; i <= hiNum; i++) {
      const v = safeEval(sigExpr, { i, n })
      if (!isFinite(v)) continue
      terms.push(v); total += v
    }
    const cf = matchClosedForm(sigExpr, sigLo, sigHi, n)
    const steps = [
      { label: 'Expression', latex: `\\sum_{i=${sigLo}}^{${sigHi==='n'?`n=${n}`:sigHi}} ${sigExpr}` },
      ...(cf
        ? [{ label: 'Closed form recognized', latex: cf.label }, { label: 'Apply formula', latex: cf.resultLatex }, { label: cf.explanation || 'Formula applied', latex: `\\boxed{${cf.resultLatex}}` }]
        : [{ label: 'Expand (first few terms)', latex: terms.slice(0,8).map(toFrac).join(' + ') + (terms.length > 8 ? ' + \\cdots' : '') },
           { label: 'Sum', latex: `\\boxed{\\sum = ${toFrac(total)}}` }]),
    ]
    const code = generateCode('sigma', { expr: sigExpr, lo: sigLo, hi: sigHi, n })
    setResult({ type: 'sigma', numerical: toFrac(total), steps, code, terms, total, explainKey: 'sigma', connKey: 'sigma' })
    setTab('symbolic')
  }

  // ─── POLY COMPUTE ─────────────────────────────────────────────────────────────
  function computePoly() {
    const norm = polyExpr.trim().replace(/(\d)([a-zA-Z(])/g,'$1*$2').replace(/([a-zA-Z)])(\d)/g,'$1*$2')
    const degree = detectDegree(norm)
    const roots = findRoots(norm)
    const steps = degree === 2
      ? buildQuadSteps(norm)
      : [
          { label: 'Expression', latex: `f(x) = ${polyExpr}` },
          { label: `Detected degree: ${degree !== null ? degree : '?'}`, latex: `f(x) \\text{ — degree-${degree ?? '?'} polynomial}` },
          { label: 'Roots (Newton-Raphson scan)', latex: roots.length ? `x = ${roots.map(toFrac).join(',\\;')}` : '\\text{No real roots found in [-15, 15]}' },
          ...(roots.length ? [{ label: 'Verify', latex: roots.map((r: number) => `f(${toFrac(r)}) \\approx ${toFrac(polyEvalAt(norm, r))}`).join(',\\;') }] : []),
          { label: 'Answer', latex: `\\boxed{\\text{Roots: }${roots.length ? roots.map(toFrac).join(',\\;') : '\\text{none (real)}'}}` },
        ]
    const code = generateCode('poly', { expr: polyExpr })
    setResult({ type: 'poly', numerical: roots.map(toFrac).join(', ') || 'No real roots', steps, code, expr: norm, roots, degree, explainKey: 'poly', connKey: 'poly' })
    setTab('symbolic')
  }

  // ─── STATS COMPUTE ────────────────────────────────────────────────────────────
  function computeStats() {
    const data = statsData.split(/[,\s]+/).map(Number).filter(n => !isNaN(n))
    if (data.length < 2) {
      setResult({ type: 'error', numerical: 'Error', steps: [{ label: 'Error', latex: '\\text{Enter at least 2 numbers, comma-separated.}' }], code: {js:'',py:'',ml:''}, explainKey:null, connKey:null })
      return
    }
    const steps = solveStats(data)
    setResult({ type: 'stats', numerical: toFrac(data.reduce((s: number,x: number)=>s+x,0)/data.length), steps, data, code: {
      js: `const data=[${data}];\nconst mean=data.reduce((s,x)=>s+x,0)/data.length;\nconsole.log('mean',mean);`,
      py: `import numpy as np\ndata=[${data}]\nprint('mean',np.mean(data))\nprint('std',np.std(data))`,
      ml: `data=[${data}];\nmean(data), std(data)`,
    }, explainKey:null, connKey:null })
    setTab('symbolic')
  }

  // ─── PHYSICS COMPUTE ─────────────────────────────────────────────────────────
  function computePhysics() {
    if (!physFormula) return
    const scope: Record<string, number> = { pi: Math.PI, e: Math.E }
    for (const [k,v] of Object.entries(physVarsLocal)) { if (v !== '') scope[k] = parseFloat(v as string) }

    const unknown = (physFormula.vars || []).find((v: string) => !physVarsLocal[v] || physVarsLocal[v] === '')
    let val: number, solveFor = unknown || '?'
    const steps = [{ label: `${physFormula.name} — ${physFormula.desc}`, latex: physFormula.latex }]
    const knownStr = Object.entries(scope).filter(([k]) => k!=='pi'&&k!=='e').map(([k,v])=>`${k}=${v}`).join(',\\;')
    if (knownStr) steps.push({ label: 'Known', latex: knownStr })

    try {
      if (physFormula.formula.includes('=')) {
        const [lhs, rhs] = physFormula.formula.split('=').map((s: string) => s.trim())
        if (!unknown || unknown === lhs) {
          val = Number(calcEval(rhs, scope))
          solveFor = lhs
          steps.push({ label: `Evaluate RHS`, latex: `${lhs} = ${rhs.replace(/\*/g,'\\cdot ')}` })
        } else {
          const lhsVal = scope[lhs]
          solveFor = unknown
          let x = 1
          for (let i = 0; i < 60; i++) {
            const fx = Number(calcEval(rhs, { ...scope, [unknown]: x })) - lhsVal
            const h = Math.max(Math.abs(x)*1e-6, 1e-8)
            const fpx = (Number(calcEval(rhs, { ...scope, [unknown]: x+h })) - Number(calcEval(rhs, { ...scope, [unknown]: x-h }))) / (2*h)
            if (!isFinite(fpx) || Math.abs(fpx) < 1e-14) break
            const xn = x - fx/fpx; if (!isFinite(xn)) break
            if (Math.abs(xn-x) < 1e-10) { x = xn; break }
            x = xn
          }
          val = x
          steps.push({ label: `Solve for ${unknown}`, latex: `${lhs} = ${rhs} \\Rightarrow ${unknown} = ?` })
        }
      } else {
        val = Number(calcEval(physFormula.formula, scope))
      }
      steps.push({ label: 'Answer', latex: `\\boxed{${solveFor} = ${isFinite(val) ? fmtNum(val) : String(val)}}` })
      setResult({ type: 'physics', numerical: isFinite(val) ? fmtNum(val) : String(val), steps, code:{js:'',py:'',ml:''}, explainKey:null, connKey:null })
      setTab('symbolic')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      steps.push({ label: 'Error', latex: `\\text{${msg.slice(0,80).replace(/[<>]/g,' ')}}` })
      setResult({ type: 'physics', numerical: 'Error', steps, code:{js:'',py:'',ml:''}, explainKey:null, connKey:null })
      setTab('symbolic')
    }
  }

  // ─── TRIANGLE COMPUTE ────────────────────────────────────────────────────────
  function computeTriangle() {
    const deg = angleMode === 'DEG'
    const toRad = (v: number) => deg ? v * Math.PI / 180 : v
    const toDeg = (v: number) => deg ? v * 180 / Math.PI : v
    const fmt = (v: number) => parseFloat(v.toFixed(6))
    const fmtAng = (v: number) => parseFloat((toDeg(v)).toFixed(4))

    let a = triSides.a !== '' ? parseFloat(triSides.a) : null
    let b = triSides.b !== '' ? parseFloat(triSides.b) : null
    let c = triSides.c !== '' ? parseFloat(triSides.c) : null
    let A = triAngles.A !== '' ? toRad(parseFloat(triAngles.A)) : null
    let B = triAngles.B !== '' ? toRad(parseFloat(triAngles.B)) : null
    let C = triAngles.C !== '' ? toRad(parseFloat(triAngles.C)) : null

    const known = [a,b,c,A,B,C].filter(v=>v!==null).length
    if (known < 3) { setTriResult({ type:'error', error: 'Enter at least 3 values (e.g. two sides + one angle, or all three sides).', numerical:'', steps:[] }); return }

    const solveAngles = () => {
      if (A!==null && B!==null && C===null) C = Math.PI - A - B
      else if (A!==null && C!==null && B===null) B = Math.PI - A - C
      else if (B!==null && C!==null && A===null) A = Math.PI - B - C
    }

    if (a!==null && b!==null && c!==null) {
      const cosA = (b*b+c*c-a*a)/(2*b*c)
      const cosB = (a*a+c*c-b*b)/(2*a*c)
      if (Math.abs(cosA)>1||Math.abs(cosB)>1) { setTriResult({ type:'error', error:'Triangle inequality violated — no such triangle.', numerical:'', steps:[] }); return }
      A = Math.acos(cosA); B = Math.acos(cosB); C = Math.PI-A-B
    } else {
      solveAngles()
      if (A!==null && B!==null && C!==null) {
        if (a!==null) { b = a*Math.sin(B)/Math.sin(A); c = a*Math.sin(C)/Math.sin(A) }
        else if (b!==null) { a = b*Math.sin(A)/Math.sin(B); c = b*Math.sin(C)/Math.sin(B) }
        else if (c!==null) { a = c*Math.sin(A)/Math.sin(C); b = c*Math.sin(B)/Math.sin(C) }
      } else if (a!==null && b!==null && C!==null) {
        c = Math.sqrt(a*a+b*b-2*a*b*Math.cos(C))
        A = Math.asin(a*Math.sin(C)/c); B = Math.PI-A-C
      } else if (a!==null && c!==null && B!==null) {
        b = Math.sqrt(a*a+c*c-2*a*c*Math.cos(B))
        A = Math.asin(a*Math.sin(B)/b); C = Math.PI-A-B
      } else if (b!==null && c!==null && A!==null) {
        a = Math.sqrt(b*b+c*c-2*b*c*Math.cos(A))
        B = Math.asin(b*Math.sin(A)/a); C = Math.PI-A-B
      } else if (a!==null && b!==null && A!==null) {
        const sinB = b*Math.sin(A)/a
        if (sinB>1) { setTriResult({ type:'error', error:'No triangle — sin(B) > 1 for these values (SSA ambiguous case).', numerical:'', steps:[] }); return }
        B = Math.asin(sinB); C = Math.PI-A-B; c = a*Math.sin(C)/Math.sin(A)
      } else if (a!==null && c!==null && A!==null) {
        const sinC = c*Math.sin(A)/a
        if (sinC>1) { setTriResult({ type:'error', error:'No triangle — sin(C) > 1 for these values.', numerical:'', steps:[] }); return }
        C = Math.asin(sinC); B = Math.PI-A-C; b = a*Math.sin(B)/Math.sin(A)
      } else if (b!==null && c!==null && B!==null) {
        const sinC = c*Math.sin(B)/b
        if (sinC>1) { setTriResult({ type:'error', error:'No triangle — sin(C) > 1 for these values.', numerical:'', steps:[] }); return }
        C = Math.asin(sinC); A = Math.PI-B-C; a = b*Math.sin(A)/Math.sin(B)
      } else {
        setTriResult({ type:'error', error:'Cannot solve — enter a valid combination: SSS, SAS, ASA, AAS, or SSA.', numerical:'', steps:[] }); return
      }
    }

    if ([a,b,c,A,B,C].some(v=>v===null||!isFinite(v!)||v!<=0)) { setTriResult({ type:'error', error:'Invalid triangle — check your values.', numerical:'', steps:[] }); return }

    const area = 0.5*a!*b!*Math.sin(C!)
    const s = (a!+b!+c!)/2
    const R = a!/(2*Math.sin(A!))
    const r = area/s

    const steps = [
      { label: 'Law of Cosines: c² = a² + b² − 2ab·cos(C)', latex: 'c^2 = a^2 + b^2 - 2ab\\cos(C)' },
      { label: 'Law of Sines: a/sin A = b/sin B = c/sin C', latex: '\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C}' },
      { label: 'Sides', latex: `a = ${fmtNum(a!)},\\quad b = ${fmtNum(b!)},\\quad c = ${fmtNum(c!)}` },
      { label: 'Angles', latex: `A = ${fmtNum(fmtAng(A!))}^\\circ,\\quad B = ${fmtNum(fmtAng(B!))}^\\circ,\\quad C = ${fmtNum(fmtAng(C!))}^\\circ` },
      { label: 'Area (Heron / cross-product)', latex: `\\text{Area} = \\tfrac{1}{2}ab\\sin C = ${fmtNum(area)}` },
      { label: 'Circumradius, Inradius', latex: `R = \\dfrac{a}{2\\sin A} = ${fmtNum(R)},\\quad r = \\dfrac{\\text{Area}}{s} = ${fmtNum(r)}` },
    ]

    setTriResult({ type:'triangle', a:fmt(a!), b:fmt(b!), c:fmt(c!), A:fmtAng(A!), B:fmtAng(B!), C:fmtAng(C!), area:fmt(area), R:fmt(R), r:fmt(r), steps, numerical: `a=${fmt(a!)}, b=${fmt(b!)}, c=${fmt(c!)}` })
  }

  // ─── MACHINIST COMPUTE ────────────────────────────────────────────────────────
  function computeMachinist() {
    if (!machFormula) return
    const scope: Record<string, number> = { pi: Math.PI, e: Math.E }
    for (const [k,v] of Object.entries(machVarsLocal)) { if (v !== '') scope[k] = parseFloat(v as string) }

    const steps = [{ label: machFormula.fullName, latex: machFormula.latex }]
    const knownStr = Object.entries(scope).filter(([k]) => k!=='pi'&&k!=='e').map(([k,v])=>`${k}=${v}`).join(',\\;')
    if (knownStr) steps.push({ label: 'Given', latex: knownStr })

    if (machFormula.viz === 'boltcircle') {
      const n = parseInt(machVarsLocal.n) || 0
      const bcr = parseFloat(machVarsLocal.BCR) || 0
      const sa = parseFloat(machVarsLocal.start_angle) || 0
      if (n < 1 || bcr <= 0) { setMachResult({ type:'machinist', numerical: 'Enter BCR and n', steps, coords: null } as unknown as ComputeResult); return }
      const coords = []
      for (let k = 0; k < n; k++) {
        const angle = (2 * Math.PI * k / n) + (sa * Math.PI / 180)
        coords.push({ k, x: bcr * Math.cos(angle), y: bcr * Math.sin(angle) })
      }
      steps.push({ label: `${n} hole coordinates`, latex: `x_k = BCR\\cos\\!\\left(\\tfrac{2\\pi k}{n}+\\theta_0\\right),\\quad y_k = BCR\\sin\\!\\left(\\tfrac{2\\pi k}{n}+\\theta_0\\right)` })
      setMachResult({ type:'machinist', numerical: `${n} holes on BCR=${bcr}`, steps, coords } as unknown as ComputeResult)
      return
    }

    try {
      const val = Number(calcEval(machFormula.formula, scope))
      const solves = machFormula.solves || '?'
      const unitStr = machFormula.units?.[solves] || ''
      steps.push({ label: 'Result', latex: `\\boxed{${solves} = ${isFinite(val) ? fmtNum(val) : String(val)}}` })
      setMachResult({ type:'machinist', numerical: isFinite(val) ? `${fmtNum(val)}  ${unitStr.split(' ')[0]}` : 'Error', steps, coords: null } as unknown as ComputeResult)
    } catch(e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      steps.push({ label: 'Error', latex: `\\text{${msg.slice(0,80).replace(/[<>&]/g,' ')}}` })
      setMachResult({ type:'machinist', numerical: 'Error', steps, coords: null } as unknown as ComputeResult)
    }
  }

  // ─── MATRIX EXPRESSION ───────────────────────────────────────────────────────
  function computeMatExpr() {
    const expr = matExpr.trim()
    if (!expr) return
    try {
      const preamble = Object.entries(matVars).map(([name, mat]) =>
        `${name} = [${(mat as string[][]).map(r => r.join(' ')).join('; ')}];`
      ).join('\n')
      const result = openmatExec(preamble + '\n_result = ' + expr + ';')
      const w = (result.workspace || []).find((v: { name: string }) => v.name === '_result')
      if (w) {
        const val = w.value
        if (Array.isArray(val) && val.length > 0 && val.every(
          (row): row is number[] => Array.isArray(row) && row.every(x => typeof x === 'number')
        )) {
          const strMat = val.map(r => r.map(x => String(+x.toFixed(6))))
          setMatA(strMat)
          setMatExprResult({ mat: val, preview: w.preview, expr } as unknown as ComputeResult)
        } else {
          setMatExprResult({ scalar: w.preview, expr } as unknown as ComputeResult)
        }
      } else {
        setMatExprResult({ scalar: result.output, expr } as unknown as ComputeResult)
      }
    } catch(e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setMatExprResult({ error: msg, expr } as unknown as ComputeResult)
    }
  }

  // ─── JS SCRIPT RUNNER ────────────────────────────────────────────────────────
  function runScript() {
    const varInit = Object.entries(vars).filter(([,v])=>typeof v==='number').map(([k,v])=>`var ${k}=${v};`).join('\n')
    const html = `<!DOCTYPE html><html><head></head><body><script>
var __log=[];var __err=[];
var console={log:function(){__log.push(Array.from(arguments).join(' '));},error:function(){__err.push(Array.from(arguments).join(' '));},warn:function(){__log.push('[WARN] '+Array.from(arguments).join(' '));},table:function(){__log.push('[TABLE] '+JSON.stringify(arguments[0]));},info:function(){__log.push(Array.from(arguments).join(' '));}};
${varInit}
try { ${script} } catch(e) { __err.push(e.message); }
window.parent.postMessage({type:'script-output',log:__log,err:__err},'*');
<\/script></body></html>`
    if (iframeRef.current) iframeRef.current.srcdoc = html
  }

  // ─── PYTHON RUNNER (Pyodide) ──────────────────────────────────────────────────
  async function loadPyodide() {
    if (pyodideRef.current) return pyodideRef.current
    setPyodideStatus('loading')
    setScriptOutput('⏳ Loading Python runtime (first run ~5–15 s, downloads once)...')
    try {
      const py = await createBundledPyodide()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (py as any).loadPackage(['numpy', 'matplotlib'])
      pyodideRef.current = py
      setPyodideStatus('ready')
      return py
    } catch(e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setPyodideStatus('error')
      setScriptOutput('[Pyodide Error] ' + msg + '\n\nReload the page and try starting Python again.')
      throw e
    }
  }

  async function runPython() {
    setPyImages([])
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const py: any = await loadPyodide()
      py.runPython(`
import sys
from io import StringIO
_out_buf = StringIO()
sys.stdout = _out_buf
sys.stderr = _out_buf
`)
      for (const [k,v] of Object.entries(vars)) {
        if (typeof v === 'number' && /^[a-zA-Z_]\w*$/.test(k)) {
          try { py.runPython(`${k} = ${v}`) } catch {}
        }
      }
      try {
        py.runPython(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io, base64, json as _json
_mpl_images = []
_orig_show = plt.show
def _patched_show(*a, **kw):
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
    buf.seek(0)
    _mpl_images.append('data:image/png;base64,' + base64.b64encode(buf.read()).decode())
    plt.clf()
plt.show = _patched_show
`)
      } catch { /* matplotlib not available in this build */ }

      py.runPython(pyScript)
      py.runPython(`sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__`)
      const output = py.runPython(`_out_buf.getvalue()`)
      setScriptOutput(output || '(done — no print output)')

      try {
        const imgs = py.runPython(`_json.dumps(_mpl_images)`)
        const parsed = JSON.parse(imgs)
        if (parsed.length) setPyImages(parsed)
      } catch {}
    } catch(e: unknown) {
      try { (pyodideRef.current as { runPython?: (s: string) => void } | null)?.runPython?.(`sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__`) } catch {}
      const msg = e instanceof Error ? e.message : String(e)
      setScriptOutput('[Python Error]\n' + msg)
    }
  }

  // ─── OPENMAT RUNNER ──────────────────────────────────────────────────────────
  function runMatlab() {
    setMlStatus('running')
    setMlOutput('')
    setMlWorkspace([])
    try {
      const preamble = [
        ...Object.entries(matVars).map(([name, mat]) =>
          `${name} = [${(mat as string[][]).map(r => r.join(' ')).join('; ')}];`),
        ...Object.entries(vars).filter(([,v]) => typeof v === 'number').map(([k,v]) => `${k} = ${v};`),
      ].join('\n')
      const result = openmatExec(preamble ? preamble + '\n' + mlScript : mlScript)
      setMlOutput(result.output || '(done — no output)')
      setMlWorkspace((result.workspace || []).filter((w: { name: string }) => !w.name.startsWith('_')))
      setMlStatus('done')
    } catch(e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setMlOutput('Error: ' + msg)
      setMlStatus('error')
    }
  }

  // ─── KEYBOARD ─────────────────────────────────────────────────────────────────
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); compute() }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newIdx = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1)
      setHistIdx(newIdx)
      if (history[newIdx]) setInput(history[newIdx].input)
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newIdx = histIdx === -1 ? -1 : histIdx + 1
      if (newIdx >= history.length) { setHistIdx(-1); setInput('') }
      else { setHistIdx(newIdx); setInput(history[newIdx]?.input || '') }
    }
  }

  // ─── GRAPH FN BUILDERS ───────────────────────────────────────────────────────
  const builtGraphFns = useMemo(() => {
    const scope = buildScope(angleMode, 0, vars)
    return graphFns.map((expr: string) => {
      if (!expr.trim()) return null
      return (x: number) => { try { return Number(calcEval(expr, { ...scope, x })) } catch { return NaN } }
    }).filter(Boolean) as ((x: number) => number)[]
  }, [graphFns, angleMode, vars])

  // ─── EXPLAIN ─────────────────────────────────────────────────────────────────
  function getExplain(level: ExplainLevel): string | null {
    if (!result) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (result.explainKey && (EXPLANATIONS as any)[result.explainKey]) return (EXPLANATIONS as any)[result.explainKey][level]
    const opExplainMap: Record<string, string> = {
      det:'det', rref:'rref', rank:'rref', null_space:'rref', col_space:'rref',
      linear_system:'rref', inverse:'det', eigen:'eigen', char_poly:'eigen', svd:'svd', qr:'qr',
      lu:'lu', dot:'dot', cross:'cross', projection:'dot', least_squares:'qr', gram_schmidt:'qr',
    }
    if (result.type === 'matrix' && result.operation && opExplainMap[result.operation]) {
      const key = opExplainMap[result.operation]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (EXPLANATIONS as any)[key]?.[level] ?? null
    }
    return null
  }

  // ─── OPERATIONS ──────────────────────────────────────────────────────────────
  const OPERATIONS = [
    { id:'det', label:'Determinant', squareOnly:true }, { id:'rref', label:'RREF', squareOnly:false },
    { id:'inverse', label:'Inverse', squareOnly:true }, { id:'transpose', label:'Transpose', squareOnly:false },
    { id:'trace', label:'Trace', squareOnly:true }, { id:'rank', label:'Rank', squareOnly:false },
    { id:'null_space', label:'Null Space', squareOnly:false }, { id:'col_space', label:'Col Space', squareOnly:false },
    { id:'lu', label:'LU', squareOnly:true }, { id:'eigen', label:'Eigenvalues', squareOnly:true },
    { id:'char_poly', label:'Char Poly', squareOnly:true }, { id:'qr', label:'QR', squareOnly:false },
    { id:'svd', label:'SVD', squareOnly:false }, { id:'gram_schmidt', label:'Gram-Schmidt', squareOnly:false },
    { id:'condition', label:'Condition #', squareOnly:true }, { id:'power', label:'Aⁿ', squareOnly:true },
    { id:'transform2d', label:'2D Transform', squareOnly:true },
    { id:'multiply', label:'A × B', needsB:true }, { id:'add', label:'A + B', needsB:true },
    { id:'subtract', label:'A − B', needsB:true }, { id:'scalar', label:'cA', squareOnly:false },
    { id:'dot', label:'Dot ·', needsB:true, vectorMode:true }, { id:'cross', label:'Cross ×', needsB:true, vectorMode:true },
    { id:'norm', label:'Norm ‖v‖', vectorMode:true }, { id:'linear_system', label:'Ax = b', needsAug:true },
    { id:'projection', label:'Proj onto col(A)', needsAug:true }, { id:'least_squares', label:'Least Squares', needsAug:true },
    { id:'basis', label:'Basis col(A)', squareOnly:false }, { id:'span', label:'Span', squareOnly:false },
    { id:'linear_independence', label:'Lin. Independence', squareOnly:false },
    { id:'similarity', label:'A ~ B (Similar?)', needsB:true },
  ]

  function importProject(project: MathOSProject) {
    saveProjectMemory(project)
    setVarsState(project.variables); setFormulasState(project.formulas)
    setScriptsState(project.savedScripts); setMatVarsState(project.matrices)
    setScript(project.programs.javascript); setPyScript(project.programs.python); setMlScript(project.programs.openmat)
    setDatasetState(project.dataset ?? null)
    setStatsData(project.statsData); setMatA(project.matrixA); setMatB(project.matrixB)
    setGraphFns(project.graph.functions)
    const [xmin, xmax, ymin, ymax] = project.graph.bounds
    setGraphXMin(xmin); setGraphXMax(xmax); setGraphYMin(ymin); setGraphYMax(ymax)
    setAngleMode(project.angleMode); setInput(project.input); setResult(null)
    setScriptOutput(''); setMlOutput(''); setMlWorkspace([]); setPyImages([])
    setSection('compute')
  }

  return {
    importProject, dataset, setDataset,
    // core
    input, setInput, result, setResult, activeView, setActiveView,
    explainLevel, setExplainLevel, angleMode, setAngleMode,
    vars, setVars, formulas, setFormulas, history, histIdx,
    section, setSection, tab, setTab, inputRef,
    compute, onKeyDown, getExplain,

    // matrix
    matA, setMatA, matB, setMatB, matOp, setMatOp, matN, setMatN,
    matAugB, setMatAugB, matVars, setMatVars, matExpr, setMatExpr,
    matExprResult, setMatExprResult,
    computeMatrix, computeMatExpr, OPERATIONS,

    // sigma
    sigExpr, setSigExpr, sigLo, setSigLo, sigHi, setSigHi, sigN, setSigN,
    computeSigma,

    // poly
    polyExpr, setPolyExpr, computePoly,

    // stats
    statsData, setStatsData, computeStats,

    // physics
    physFormula, setPhysFormula, physVarsLocal, setPhysVarsLocal,
    computePhysics,

    // machinist
    machFormula, setMachFormula, machVarsLocal, setMachVarsLocal,
    machResult, setMachResult, computeMachinist,

    // graph
    graphFns, setGraphFns, graphXMin, setGraphXMin, graphXMax, setGraphXMax,
    graphYMin, setGraphYMin, graphYMax, setGraphYMax, builtGraphFns,

    // triangle
    triSides, setTriSides, triAngles, setTriAngles, triResult, setTriResult,
    computeTriangle,

    // script
    scriptLang, setScriptLang, script, setScript, pyScript, setPyScript,
    mlScript, setMlScript, mlOutput, setMlOutput, mlWorkspace, setMlWorkspace,
    mlStatus, setMlStatus, scriptOutput, setScriptOutput, scriptName, setScriptName,
    scripts, setScripts, pyodideStatus, setPyodideStatus, pyImages, setPyImages,
    iframeRef, runScript, runPython, runMatlab,
  }
}

export type MathOSState = ReturnType<typeof useMathOSState>
