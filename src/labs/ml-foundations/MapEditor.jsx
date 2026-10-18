import React, { useState } from 'react'
import MazeView from './MazeView.jsx'
import { makeRng, randomMaze, tryParse, stepsToGoal, unkey } from './world.js'

// Change the input: click squares to change them, or edit the text itself. Both stay in step.
// Bad text gets a plain message (the same one parse_map raises) and the picture keeps the last good map.
export default function MapEditor({ text, setText, example, size = 40, needPath = true }) {
  const [tool, setTool] = useState('#')
  const [draft, setDraft] = useState(null)
  const shown = draft ?? text
  const { maze, error } = tryParse(shown)
  const unreachable = maze && needPath && !(maze.start in stepsToGoal(maze))

  function commit(next) {
    const parsed = tryParse(next)
    setDraft(parsed.error ? next : null)
    if (!parsed.error) setText(next.trim())
  }

  function paint(cell) {
    if (!maze) return
    const [r, c] = unkey(cell)
    const rows = shown.trim().split(/\r?\n/).map(l => [...l.trim()])
    const was = rows[r][c]
    if (tool === 'S' || tool === 'G') {
      if (was === 'S' || was === 'G') return
      for (const row of rows) for (let i = 0; i < row.length; i++) if (row[i] === tool) row[i] = '.'
      rows[r][c] = tool
    } else {
      if (was === 'S' || was === 'G') return
      rows[r][c] = was === '#' ? '.' : '#'
    }
    commit(rows.map(row => row.join('')).join('\n'))
  }

  function resize(dr, dc) {
    if (!maze) return
    const rows = shown.trim().split(/\r?\n/).map(l => [...l.trim()])
    if (dr > 0) rows.push(Array(maze.cols).fill('.'))
    if (dr < 0 && maze.rows > 2) { const last = rows.at(-1); if (last.includes('S') || last.includes('G')) return; rows.pop() }
    if (dc > 0) rows.forEach(row => row.push('.'))
    if (dc < 0 && maze.cols > 2) { if (rows.some(row => row.at(-1) === 'S' || row.at(-1) === 'G')) return; rows.forEach(row => row.pop()) }
    commit(rows.map(row => row.join('')).join('\n'))
  }

  const surprise = () => commit(randomMaze(makeRng(Date.now() % 100000), 4 + Math.floor(Math.random() * 3), 5 + Math.floor(Math.random() * 3)))

  return (
    <div className="mlf-editor">
      <div className="mlf-editor-grid">
        {maze ? <MazeView maze={maze} size={size} onCell={paint} rc title="Your map: click a square to change it" /> : <p className="mlf-muted">Fix the text to see the map.</p>}
        <div className="mlf-editor-tools" role="group" aria-label="What a click does">
          {[['#', 'Wall ↔ floor'], ['S', 'Move start'], ['G', 'Move cheese']].map(([t, label]) => (
            <button key={t} type="button" className={`mlf-chip${tool === t ? ' on' : ''}`} aria-pressed={tool === t} onClick={() => setTool(t)}>{label}</button>
          ))}
        </div>
        <div className="mlf-editor-tools">
          <button type="button" className="mlf-chip" onClick={() => resize(0, 1)}>+ column</button>
          <button type="button" className="mlf-chip" onClick={() => resize(0, -1)}>− column</button>
          <button type="button" className="mlf-chip" onClick={() => resize(1, 0)}>+ row</button>
          <button type="button" className="mlf-chip" onClick={() => resize(-1, 0)}>− row</button>
        </div>
        <div className="mlf-editor-tools">
          <button type="button" className="mlf-chip" onClick={surprise}>🎲 Surprise me</button>
          {example && <button type="button" className="mlf-chip" onClick={() => { setDraft(null); setText(example) }}>Lesson example</button>}
        </div>
      </div>
      <label className="mlf-editor-text">
        <span>The same map as text</span>
        <textarea value={shown} spellCheck={false} rows={Math.max(4, shown.split('\n').length + 1)} onChange={e => commit(e.target.value)} aria-label="The map as text" />
        {error && <span className="mlf-bad-text" role="alert">parse_map says: {error}</span>}
        {unreachable && <span className="mlf-warn-text" role="status">The cheese can't be reached from S on this map. That is allowed, but nothing will ever get there.</span>}
        <span className="mlf-muted"># wall · . floor · S start · G cheese (the goal)</span>
      </label>
    </div>
  )
}
