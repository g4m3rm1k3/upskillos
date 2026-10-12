import { useMemo, useState } from 'react'
import { zipSync, strToU8 } from 'fflate'
import GridMap from '../GridMap.jsx'
import Trainer from './Trainer.jsx'
import { A2CTrainer } from './part4.jsx'
import { GridWorld } from '../engine/gridworld.js'
import { MAPS } from '../engine/maps.js'
import { CELL } from '../engine/look.js'
import { valueIteration } from '../engine/planning.js'
import { greedyProbs } from '../engine/policies.js'
import { evaluateGreedy } from '../engine/evaluate.js'
import { SOURCES } from '../source.js'
import { num, Slider } from './ui.jsx'

// 5.1: paint a map, set its rules, check it, solve it exactly, then learn it three ways. The map is
// stored under the name 'custom' in MAPS, so every engine function and figure can use it.
const RULES = { C: { reward: 1.0, end: true }, c: { reward: 0.3, end: true }, X: { reward: -1.0, end: true }, H: { reward: 0.0, end: true }, G: { reward: 1.0, end: true }, K: { reward: -100.0, to_start: true } }
const PALETTE = ['.', '#', 'S', 'C', 'c', 'X', 'H', 'G', 'K']
const START = ['S....', '.##..', '...X.', '.#...', '....C']

function layoutOf(rows, step, slippery, maxSteps) {
  const used = new Set(rows.join(''))
  const cells = Object.fromEntries(Object.entries(RULES).filter(([k]) => used.has(k)))
  return { title: 'Your map', rows, step, ...(slippery ? { intended: 1 / 3 } : {}), cells, max_steps: maxSteps }
}

// Problems that would make the map unplayable, found by a breadth-first search from the start.
function problems(rows) {
  const flat = rows.join(''), out = []
  const starts = [...flat].filter(c => c === 'S').length
  if (starts !== 1) out.push(starts === 0 ? 'Put one S (start) on the map.' : 'Only one S (start) is allowed.')
  if (![...flat].some(c => RULES[c]?.end)) out.push('Add at least one ending (cheese, cat, hole or goal), or no episode can finish except by the time limit.')
  if (starts === 1 && out.length === 0) {
    const nR = rows.length, nC = rows[0].length, seen = new Set(), queue = [flat.indexOf('S')]
    let reachesGood = false
    while (queue.length) {
      const s = queue.shift(); if (seen.has(s)) continue; seen.add(s)
      const ch = flat[s]
      if (RULES[ch]?.end) { if (RULES[ch].reward > 0) reachesGood = true; continue }
      if (RULES[ch]?.to_start) continue
      const r = Math.floor(s / nC), c = s % nC
      for (const [dr, dc] of [[0, -1], [-1, 0], [0, 1], [1, 0]]) { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < nR && nc >= 0 && nc < nC && rows[nr][nc] !== '#') queue.push(nr * nC + nc) }
    }
    if (!reachesGood) out.push('No ending with a positive reward can be reached from the start: walls or cliffs cut it off.')
  }
  return out
}

const pyLiteral = (layout, name) => `    "${name}": {\n        "title": "${layout.title}",\n        "rows": [\n${layout.rows.map(r => `            "${r}",`).join('\n')}\n        ],\n        "step": ${layout.step},\n${layout.intended ? '        "intended": 1 / 3,\n' : ''}        "cells": {\n${Object.entries(layout.cells).map(([k, v]) => `            "${k}": {${Object.entries(v).map(([a, b]) => `"${a}": ${b === true ? 'True' : typeof b === 'number' && Number.isInteger(b) ? b.toFixed(1) : b}`).join(', ')}},`).join('\n')}\n        },\n        "max_steps": ${layout.max_steps},\n    },`

function downloadPython() {
  const files = Object.fromEntries(Object.entries(SOURCES).map(([name, src]) => [`qmaze-lab/${name}`, strToU8(src)]))
  files['qmaze-lab/README.txt'] = strToU8('QMaze Lab programs. Python 3.10+ with NumPy (all), PyTorch (a2c.py, a2c_check.py, dqn.py) and Gymnasium (gym_compare.py):\n\n    python -m pip install numpy torch gymnasium\n\nThen, in this folder:\n\n    python -c "from experiments import learn_q; Q, totals = learn_q(\'cheese_and_cat\'); print(Q.round(2))"\n\nAdd your own maps to maps.py.\n')
  const blob = new Blob([zipSync(files)], { type: 'application/zip' }), url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'qmaze-lab-python.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function MapBuilder() {
  const [rows, setRows] = useState(START)
  const [paint, setPaint] = useState('#'), [step, setStep] = useState(-0.04), [slippery, setSlippery] = useState(false), [maxSteps, setMaxSteps] = useState(100)
  const [gamma, setGamma] = useState(0.95), [version, setVersion] = useState(0), [learner, setLearner] = useState(null)
  const layout = layoutOf(rows, step, slippery, maxSteps)
  const issues = problems(rows)
  MAPS.custom = layout
  const env = useMemo(() => new GridWorld('custom', layout), [JSON.stringify(layout)])
  const solved = useMemo(() => issues.length ? null : valueIteration(env.P, gamma), [env, gamma, issues.length])
  const optimal = useMemo(() => solved ? evaluateGreedy('custom', solved.Q) : null, [solved])
  const set = (s, ch) => { const r = Math.floor(s / env.nCols), c = s % env.nCols; setRows(rs => rs.map((row, i) => i === r ? row.slice(0, c) + ch + row.slice(c + 1) : row)); setLearner(null); setVersion(v => v + 1) }
  const resize = (nR, nC) => { setRows(rs => Array.from({ length: nR }, (_, r) => Array.from({ length: nC }, (_, c) => rs[r]?.[c] ?? '.').join(''))); setLearner(null); setVersion(v => v + 1) }
  const change = f => (...args) => { f(...args); setLearner(null); setVersion(v => v + 1) }
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <span className="qm-buttons">Paint {PALETTE.map(ch => <button key={ch} className={paint === ch ? 'active' : ''} onClick={() => setPaint(ch)}>{CELL[ch]?.icon || ch} {CELL[ch]?.name ?? ch}</button>)}</span>
    </div>
    <div className="qm-fig-controls">
      <label>Rows <select value={rows.length} onChange={e => resize(Number(e.target.value), rows[0].length)}>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n}>{n}</option>)}</select></label>
      <label>Columns <select value={rows[0].length} onChange={e => resize(rows.length, Number(e.target.value))}>{[2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map(n => <option key={n}>{n}</option>)}</select></label>
      <Slider label="step reward" value={step} min={-1} max={0} step={0.01} onChange={change(setStep)} />
      <label><input type="checkbox" checked={slippery} onChange={e => change(setSlippery)(e.target.checked)} /> slippery ice</label>
      <label>max_steps <select value={maxSteps} onChange={e => change(setMaxSteps)(Number(e.target.value))}>{[50, 100, 200].map(n => <option key={n}>{n}</option>)}</select></label>
      <Slider label="γ" value={gamma} min={0.5} max={0.99} step={0.01} onChange={setGamma} />
    </div>
    <div className="qm-fig-row">
      <GridMap env={env} onCell={s => set(s, paint)} values={solved?.V} probs={solved ? greedyProbs(solved.Q) : undefined} size={env.nCols > 8 ? 44 : 60} />
      <div className="qm-fig-side">
        {issues.length ? <div className="qm-py-error">{issues.map((t, i) => <p key={i}>{t}</p>)}</div> : <>
          <p>Solved exactly by value iteration in {solved.sweeps} sweeps: the colours are V*, the arrows the optimal moves. Playing them greedily averages a return of <b>{num(optimal.mean)}</b> ({Object.entries(optimal.ends).map(([k, v]) => `${v} × ${k}`).join(', ')}).</p>
          <p className="qm-buttons">Now learn it: <button onClick={() => setLearner('q')}>Q-learning / SARSA</button><button onClick={() => setLearner('a2c')}>A2C</button></p>
        </>}
        <p className="qm-small">As Python, to paste into <span className="mono">MAPS</span> in maps.py (rename it):</p>
        <pre className="qm-mono-block qm-small">{pyLiteral(layout, 'my_map')}</pre>
        <button onClick={downloadPython}>Download all the lab's Python files (.zip)</button>
      </div>
    </div>
    {learner === 'q' && !issues.length && <Trainer key={`q${version}`} fixed={{ map: 'custom', gamma }} show={['algorithm', 'alpha', 'epsilon', 'episodes', 'initialQ', 'seed']} view="policy" />}
    {learner === 'a2c' && !issues.length && <A2CTrainer key={`a${version}`} map="custom" />}
  </div>
}
