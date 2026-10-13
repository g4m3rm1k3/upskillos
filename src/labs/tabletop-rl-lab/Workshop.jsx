// The Workshop: train a TD(0) player (Part 4) in a background worker, grade any two players on the
// same seeds with a paired comparison (lesson 4.4), and keep the players you want in a library for
// the Table. Nothing here is a different implementation: the worker runs engine/game.js.
import { useEffect, useRef, useState } from 'react'
import { newCard, value, FEATURE_NAMES, mean, standardError } from './engine/game.js'
import { Bars } from './figures/ui.jsx'

const DEFAULTS = { games: 1000, alpha: 0.01, bonus: true, seed: 0 }
function useWorker() {
  const ref = useRef(null)
  useEffect(() => () => ref.current?.terminate(), [])
  return {
    start(message, onMessage, onError) {
      ref.current?.terminate()
      const w = new Worker(new URL('./engine/trainer.worker.js', import.meta.url), { type: 'module' })
      ref.current = w
      w.onmessage = ({ data }) => { if (data.type === 'error') { onError(data.message); w.terminate() } else onMessage(data, () => { w.terminate(); if (ref.current === w) ref.current = null }) }
      w.onerror = () => { onError('The worker failed to load. Reload the lab and try again.'); w.terminate() }
      w.postMessage(message)
    },
    stop() { ref.current?.terminate(); ref.current = null },
  }
}

export default function Workshop({ players, onSave, onRemove }) {
  const [config, setConfig] = useState(DEFAULTS), [training, setTraining] = useState(null), [message, setMessage] = useState('')
  const [name, setName] = useState('My learner'), [pair, setPair] = useState(['bonus', 'boxes']), [grading, setGrading] = useState(null), [evalSeed, setEvalSeed] = useState(2000000), [evalGames, setEvalGames] = useState(500)
  const trainer = useWorker(), grader = useWorker(), file = useRef(null)
  const change = (k, v) => setConfig(c => ({ ...c, [k]: v }))
  const custom = players.filter(p => p.custom)
  function train() {
    setMessage(''); setTraining({ games: 0, weights: null, recipe: { ...config }, running: true })
    trainer.start({ cmd: 'train', config }, (data, finish) => {
      if (data.type === 'progress') setTraining(t => ({ ...t, games: data.games, weights: data.weights }))
      if (data.type === 'trained') { setTraining(t => ({ ...t, weights: data.weights, running: false })); finish() }
    }, error => { setMessage(error); setTraining(t => t && { ...t, running: false }) })
  }
  function grade() {
    const [a, b] = pair.map(id => players.find(p => p.id === id))
    if (!a || !b) return
    setGrading({ games: 0, running: true, names: [a.name, b.name] })
    grader.start({ cmd: 'compare', a, b, games: evalGames, seed: evalSeed }, (data, finish) => {
      if (data.type === 'progress') setGrading(g => ({ ...g, games: data.games }))
      if (data.type === 'compared') {
        const d = data.a.map((x, i) => x - data.b[i])
        setGrading(g => ({ ...g, running: false, games: data.a.length, a: { mean: mean(data.a), se: standardError(data.a) }, b: { mean: mean(data.b), se: standardError(data.b) }, d: { mean: mean(d), se: standardError(d) } }))
        finish()
      }
    }, error => { setMessage(error); setGrading(null) })
  }
  function save() {
    const t = training
    const error = onSave({ name: name.trim().slice(0, 32) || 'My learner', kind: 'learned', weights: t.weights, bonus: t.recipe.bonus, recipe: t.recipe })
    setMessage(error ?? `Saved "${name.trim() || 'My learner'}". It can now sit at the Table and be graded below.`)
  }
  function download(p) {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'tabletop-player-v2', name: p.name, weights: p.weights, bonus: p.bonus, recipe: p.recipe })], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `${p.name.replace(/[^a-z0-9_-]/gi, '-') || 'player'}.tabletop.json`; document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function load(e) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    try {
      if (f.size > 100000) throw new Error('that file is too big to be a player')
      const data = JSON.parse(await f.text())
      const n = data.bonus ? 19 : 13
      if (data.format !== 'tabletop-player-v2' || typeof data.name !== 'string' || !Array.isArray(data.weights) || data.weights.length !== n || !data.weights.every(w => Number.isFinite(w) && Math.abs(w) < 1000)) throw new Error('not a Tabletop RL Lab player file')
      const error = onSave({ name: data.name.slice(0, 32), kind: 'learned', weights: data.weights, bonus: !!data.bonus, recipe: data.recipe ?? null })
      setMessage(error ?? `Imported "${data.name}".`)
    } catch (err) { setMessage(`Could not import: ${err.message}.`) }
  }
  const t = training
  return <section className="tt-workshop">
    <header><span className="tt-eyebrow">THE WORKSHOP</span><h2>Train a player. Grade it fairly.</h2><p>TD(0) with a linear value of the card left (lessons 4.6 and 4.7), the same engine the lessons use, in a background worker.</p></header>
    <div className="tt-workshop-grid">
      <section className="tt-panel"><h3>01 / Train</h3>
        <fieldset disabled={t?.running}>
          <label>Training games <select value={config.games} onChange={e => change('games', Number(e.target.value))}>{[100, 300, 1000, 3000, 5000].map(n => <option key={n} value={n}>{n.toLocaleString()}</option>)}</select></label>
          <label>Step size α <select value={config.alpha} onChange={e => change('alpha', Number(e.target.value))}>{[0.001, 0.003, 0.01, 0.03, 0.1].map(a => <option key={a} value={a}>{a}</option>)}</select></label>
          <label><input type="checkbox" checked={config.bonus} onChange={e => change('bonus', e.target.checked)} /> Upper-bonus bands (lesson 4.8)</label>
          <label>Training seed <input type="number" min="0" max="999999" value={config.seed} onChange={e => change('seed', Math.max(0, Math.min(999999, Math.floor(Number(e.target.value) || 0))))} /></label>
        </fieldset>
        <div className="tt-actions"><button className="tt-primary" disabled={t?.running} onClick={train}>Train a new player</button>{t?.running && <button onClick={() => { trainer.stop(); setTraining(null); setMessage('Cancelled. The partial player was discarded.') }}>Cancel</button>}</div>
        {t && <><p role="status">{t.running ? 'Training' : 'Trained'} · {t.games.toLocaleString()} / {t.recipe.games.toLocaleString()} games</p><progress value={t.games} max={t.recipe.games} /></>}
        {t?.weights && <><p>Value of the empty card: <b>{value(t.weights, newCard(), t.recipe.bonus).toFixed(1)}</b> (its own estimate of its average score).</p><Bars digits={1} rows={t.weights.map((w, i) => ({ label: FEATURE_NAMES[i], value: w }))} /></>}
        {t && !t.running && t.weights && <div className="tt-actions"><label>Name <input maxLength={32} value={name} onChange={e => setName(e.target.value)} /></label><button className="tt-primary" onClick={save}>Save to the library</button></div>}
      </section>
      <section className="tt-panel"><h3>02 / Grade two players on the same dice</h3>
        <div className="tt-pair">{[0, 1].map(k => <label key={k}>{k ? 'against' : 'Player'} <select value={pair[k]} onChange={e => setPair(p => p.map((x, j) => j === k ? e.target.value : x))}>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>)}</div>
        <label>Games <select value={evalGames} onChange={e => setEvalGames(Number(e.target.value))}>{[100, 500, 1000, 2000].map(n => <option key={n} value={n}>{n.toLocaleString()}</option>)}</select></label>
        <label>First seed <input type="number" min="0" value={evalSeed} onChange={e => setEvalSeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))} /></label>
        <p className="tt-muted">The lessons graded on seeds from 1,000,000. Use another range (2,000,000 here) for your final claims, and change it if you have tuned against it.</p>
        <div className="tt-actions"><button className="tt-primary" disabled={grading?.running || pair[0] === pair[1]} onClick={grade}>Play the games</button>{grading?.running && <button onClick={() => { grader.stop(); setGrading(null) }}>Cancel</button>}</div>
        {grading?.running && <p role="status">{grading.games} of {evalGames} paired games…</p>}
        {grading?.d && <table className="tt-results"><thead><tr><th /><th>Average</th><th>± SE</th></tr></thead><tbody>
          <tr><td>{grading.names[0]}</td><td>{grading.a.mean.toFixed(2)}</td><td>{grading.a.se.toFixed(2)}</td></tr>
          <tr><td>{grading.names[1]}</td><td>{grading.b.mean.toFixed(2)}</td><td>{grading.b.se.toFixed(2)}</td></tr>
          <tr><td><b>Paired difference</b></td><td><b>{grading.d.mean.toFixed(2)}</b></td><td>{grading.d.se.toFixed(2)}</td></tr></tbody></table>}
        {grading?.d && <p role="status">{Math.abs(grading.d.mean) > 2 * grading.d.se ? `${(Math.abs(grading.d.mean) / grading.d.se).toFixed(1)} standard errors: unlikely to be luck of the dice.` : `Within ${(Math.abs(grading.d.mean) / grading.d.se).toFixed(1)} standard errors: this many games can't tell them apart.`}</p>}
      </section>
    </div>
    {message && <p className="tt-message" role="status">{message}</p>}
    <section className="tt-panel tt-library"><h3>Your library</h3>
      <input ref={file} type="file" accept=".json,application/json" hidden aria-label="Import a player file" onChange={load} />
      <div className="tt-actions"><button onClick={() => file.current?.click()}>Import a player…</button></div>
      {custom.length === 0 && <p className="tt-muted">Saved players appear here, at the Table, and in the grader.</p>}
      {custom.map(p => <div key={p.id}><b>{p.name}</b><span>{p.recipe ? `${p.recipe.games} games · α ${p.recipe.alpha} · ${p.bonus ? 'bonus bands' : 'open boxes'} · seed ${p.recipe.seed}` : p.bonus ? 'bonus bands' : 'open boxes'}</span><button onClick={() => download(p)}>Export</button><button onClick={() => onRemove(p.id)}>Remove</button></div>)}
    </section>
  </section>
}
