import { useState, useMemo, useCallback, useRef } from 'react'
import SliderControl from '../../calculus/viz/SliderControl.jsx'
import { POPULATIONS, makeRng, drawSampleMeans } from './cltPopulations.js'


function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const y = 1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x)
  return x >= 0 ? y : -y
}
const normpdf = (x, mu, s) => Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI))

const W = 540, H = 170, PL = 44, PR = 16, PT = 10, PB = 30
const BINS = 30

function buildHistogram(data, min, max) {
  if (!data.length) return []
  const binW = (max - min) / BINS
  const counts = Array(BINS).fill(0)
  data.forEach(x => {
    const i = Math.min(BINS - 1, Math.floor((x - min) / binW))
    if (i >= 0) counts[i]++
  })
  return counts.map((c, i) => ({ x: min + i * binW, count: c, density: c / (data.length * binW) }))
}

export default function CLTSimulatorViz() {
  const [popKey, setPopKey] = useState('exponential')
  const [sampleSize, setSampleSize] = useState(30)
  const [sampleMeans, setSampleMeans] = useState([])
  const [seed, setSeed] = useState(1)
  // One generator stream per run: the same seed and the same clicks reproduce the same histogram.
  const rng = useRef(makeRng(1))
  const restart = (s = seed) => { rng.current = makeRng(s); setSampleMeans([]) }

  const pop = POPULATIONS[popKey]
  const theoreticalSE = pop.sigma / Math.sqrt(sampleSize)

  const addSamples = useCallback((batchSize = 200) => {
    const batch = drawSampleMeans(pop, sampleSize, batchSize, rng.current)
    setSampleMeans(prev => [...prev, ...batch])
  }, [pop, sampleSize])

  const reset = () => restart()

  const { hist, xMin, xMax, yMax, normalPath } = useMemo(() => {
    if (!sampleMeans.length) return { hist: [], xMin: 0, xMax: 1, yMax: 1, normalPath: '' }

    const mu = pop.mu
    const se = pop.sigma / Math.sqrt(sampleSize)
    const xMin = mu - 4 * se
    const xMax = mu + 4 * se
    const hist = buildHistogram(sampleMeans, xMin, xMax)
    const yMax = Math.max(...hist.map(b => b.density), 0.001)

    const innerW = W - PL - PR, innerH = H - PT - PB
    const xScale = x => PL + ((x - xMin) / (xMax - xMin)) * innerW
    const yScale = y => PT + innerH - (y / (yMax * 1.1)) * innerH

    const pts = Array.from({ length: 201 }, (_, i) => {
      const x = xMin + (i / 200) * (xMax - xMin)
      const y = normpdf(x, mu, se)
      return `${xScale(x)},${yScale(y)}`
    })
    const normalPath = `M${pts[0]}` + pts.slice(1).map(p => `L${p}`).join('')

    return { hist, xMin, xMax, yMax, normalPath }
  }, [sampleMeans, pop, sampleSize])

  const mu = sampleMeans.length ? sampleMeans.reduce((a, b) => a + b, 0) / sampleMeans.length : null
  const sd = sampleMeans.length > 1
    ? Math.sqrt(sampleMeans.reduce((s, x) => s + (x - mu) ** 2, 0) / (sampleMeans.length - 1))
    : null

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
      <h3 className="text-sm font-semibold mb-3 text-slate-800 dark:text-slate-100">
        Central Limit Theorem Simulator
      </h3>

      {/* Population selector */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {Object.entries(POPULATIONS).map(([key, { label, color }]) => (
          <button key={key} onClick={() => { setPopKey(key); restart() }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              popKey === key ? 'text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            style={popKey === key ? { backgroundColor: color } : {}}>
            {label}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <SliderControl label={`n = ${sampleSize}`} min={1} max={100} step={1} value={sampleSize} onChange={v => { setSampleSize(v); restart() }} />
      </div>
      <label className="flex items-center gap-2 mb-3 text-xs text-slate-600 dark:text-slate-300">
        Seed
        <input type="number" min="0" max="999999" value={seed} aria-label="Random seed"
          onChange={e => { if (e.target.value === '') return; const s = Math.max(0, Math.min(999999, Math.trunc(+e.target.value))); setSeed(s); restart(s) }}
          className="w-24 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
        <span className="text-slate-500 dark:text-slate-400">Same seed, same clicks → the same histogram. Change it to see another run.</span>
      </label>

      {/* Histogram of sample means */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible mb-3">
        <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="#94a3b8" strokeWidth="1" />

        {hist.map((bin, i) => {
          const innerW = W - PL - PR, innerH = H - PT - PB
          const xScale = x => PL + ((x - xMin) / (xMax - xMin)) * innerW
          const yScale = y => PT + innerH - (y / (yMax * 1.1)) * innerH
          const binW = (xMax - xMin) / BINS
          const x = xScale(bin.x)
          const w = Math.max(1, xScale(bin.x + binW) - x - 1)
          const y = yScale(bin.density)
          const h = H - PB - y
          return <rect key={i} x={x} y={y} width={w} height={Math.max(0, h)} fill={pop.color} fillOpacity="0.6" rx="1" />
        })}

        {/* Normal curve overlay */}
        {normalPath && <path d={normalPath} fill="none" stroke="#6366f1" strokeWidth="2" />}

        {/* Mean line */}
        {mu !== null && (() => {
          const innerW = W - PL - PR
          const x = PL + ((mu - xMin) / (xMax - xMin)) * innerW
          return <line x1={x} y1={PT} x2={x} y2={H - PB} stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" />
        })()}

        <text x={W / 2} y={H} textAnchor="middle" fontSize="9" fill="#94a3b8">x̄ (sample mean)</text>
        {!sampleMeans.length && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="12" fill="#94a3b8">Press "Draw Samples" to begin</text>
        )}
      </svg>

      <div className="flex gap-2 mb-3">
        <button onClick={() => addSamples(200)}
          className="px-4 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/300 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors">
          Draw 200 Samples
        </button>
        <button onClick={() => addSamples(1000)}
          className="px-4 py-2 rounded-lg bg-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 dark:bg-indigo-900/300 text-white text-xs font-semibold transition-colors">
          +1000
        </button>
        <button onClick={reset}
          className="px-4 py-2 rounded-lg bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors">
          Reset
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-2 text-center">
          <div className="text-slate-500 mb-1">Samples</div>
          <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">{sampleMeans.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-2 text-center">
          <div className="text-slate-500 mb-1">Observed x̄</div>
          <div className="font-mono font-semibold text-amber-600 dark:text-amber-400">{mu !== null ? mu.toFixed(3) : '—'}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-2 text-center">
          <div className="text-slate-500 mb-1">Observed SE</div>
          <div className="font-mono font-semibold text-green-600 dark:text-green-400">{sd !== null ? sd.toFixed(3) : '—'}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-2 text-center">
          <div className="text-slate-500 mb-1">Theory σ/√n</div>
          <div className="font-mono font-semibold text-slate-600 dark:text-slate-400">{theoreticalSE.toFixed(3)}</div>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
        The indigo curve shows N(μ, σ²/n) — what the CLT predicts for large n, whatever the population’s shape. This population has μ = {pop.mu.toFixed(3)} and σ = {pop.sigma.toFixed(3)}.
      </p>
    </div>
  )
}
