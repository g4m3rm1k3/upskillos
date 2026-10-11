import { useEffect, useRef, useState } from 'react'
import { Session, PHASES } from './session.js'
import { MAZE, actor, encode, evaluate, value } from './engine.js'
import { COMPONENTS, CHAPTERS } from './content.js'
import snapshots from './snapshots.json'
import engineSource from './engine.js?raw'
import sessionSource from './session.js?raw'
import './style.css'

const DEFAULTS = { learning: false, epsilon: .2, alpha: .12, gamma: .99, randomActions: false, blind: false, representation: true, rewardEnabled: true, criticEnabled: true, entropyEnabled: true }
const fmt = (n, digits = 3) => Number.isFinite(n) ? n.toFixed(digits) : '—'
const actionName = (world, a) => (world === 'maze' ? ['↑ Up', '→ Right', '↓ Down', '← Left'] : ['← Left', 'Right →'])[a] ?? 'Waiting'
function download(name, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a')
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function sourceFor(name) {
  const start = engineSource.search(new RegExp(`export (?:function|const) ${name}\\b`))
  if (start < 0) return engineSource
  const next = engineSource.indexOf('\nexport ', start + 1)
  return engineSource.slice(start, next < 0 ? undefined : next).trim()
}
function World({ world, state, action, ended }) {
  if (world === 'maze') return <svg viewBox="0 0 600 270" role="img" aria-label="QMaze: cyan agent navigating from S to G">
    {MAZE.flatMap((row, r) => [...row].map((cell, c) => <g key={`${r}-${c}`}>
      <rect x={175+c*47} y={12+r*47} width="43" height="43" rx="8" fill={cell === '#' ? '#394b5a' : cell === 'G' ? '#99e6c3' : '#192d3a'} />
      {['S','G'].includes(cell) && <text x={196+c*47} y={40+r*47} textAnchor="middle" fill={cell === 'G' ? '#143a30' : '#94a8b5'} fontSize="16">{cell}</text>}
    </g>))}
    <circle cx={196+state[1]*47} cy={33+state[0]*47} r="13" fill="#65ddd3" stroke="#e6fffc" strokeWidth="3" />
    <text x="20" y="254" fill="#94a8b5" fontSize="12">Walls block motion · goal +1 · other steps −0.02</text>
  </svg>
  const x = 300 + state[0]*85, y = 188, tipX = x + Math.sin(state[2])*133, tipY = y - Math.cos(state[2])*133
  return <svg viewBox="0 0 600 270" role="img" aria-label={`CartPole, cart position ${fmt(state[0])}, pole angle ${fmt(state[2])} radians`}>
    <defs><pattern id="a-arcade-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ffffff" strokeOpacity=".04" /></pattern></defs>
    <rect width="600" height="270" fill="url(#a-arcade-grid)" />
    <line x1="96" y1="42" x2="96" y2="220" stroke="#ffae7d" strokeDasharray="4 6" opacity=".4" />
    <line x1="504" y1="42" x2="504" y2="220" stroke="#ffae7d" strokeDasharray="4 6" opacity=".4" />
    <line x1="40" y1="217" x2="560" y2="217" stroke="#657887" strokeWidth="2" />
    <line x1="300" y1="217" x2="300" y2="231" stroke="#657887" />
    <text x="96" y="245" textAnchor="middle" fill="#94a8b5" fontSize="12">−2.4 m</text><text x="300" y="250" textAnchor="middle" fill="#94a8b5" fontSize="12">0</text><text x="504" y="245" textAnchor="middle" fill="#94a8b5" fontSize="12">+2.4 m</text>
    <rect x={x-32} y="184" width="64" height="24" rx="7" fill={ended ? '#f4a783' : '#68dbd0'} />
    <circle cx={x-20} cy="211" r="6" fill="#a1b5c1"/><circle cx={x+20} cy="211" r="6" fill="#a1b5c1"/>
    <line x1={x} y1={y} x2={tipX} y2={tipY} stroke="#ffb28a" strokeWidth="8" strokeLinecap="round" />
    <circle cx={tipX} cy={tipY} r="9" fill="#ffe0b9"/><circle cx={x} cy={y} r="5" fill="#0c1d28"/>
    {action !== undefined && <text x={x} y="172" textAnchor="middle" fill="#8ff2e8" fontSize="17">{action === 1 ? '→' : '←'}</text>}
  </svg>
}
function Toggle({ label, checked, onChange, disabled }) {
  return <label className="aa-toggle"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled}/><span>{label}</span></label>
}
function EpisodeChart({ results, limit }) {
  if (!results.length) return <p className="aa-caption">Finish an episode to see its length here. This chart follows the visible world only.</p>
  const points = results.map((r,i) => `${20+i*440/Math.max(1,results.length-1)},${80-r.steps/limit*65}`).join(' ')
  return <><svg className="aa-episode-chart" viewBox="0 0 480 100" role="img" aria-label={`Visible episode lengths: ${results.map(r => r.steps).join(', ')}`}><line x1="20" y1="80" x2="460" y2="80" stroke="#cddbd2"/><line x1="20" y1="15" x2="460" y2="15" stroke="#cddbd2" strokeDasharray="3 5"/><polyline points={points} fill="none" stroke="#238e7b" strokeWidth="2"/>{results.map((r,i) => <circle key={r.episode} cx={20+i*440/Math.max(1,results.length-1)} cy={80-r.steps/limit*65} r="3" fill={r.success ? '#238e7b' : '#cf825c'}/>)}<text x="20" y="96" fontSize="9" fill="#637579">episode {results[0].episode}</text><text x="460" y="96" textAnchor="end" fontSize="9" fill="#637579">episode {results.at(-1).episode}</text><text x="460" y="11" textAnchor="end" fontSize="9" fill="#637579">{limit} steps</text></svg><p className="aa-caption">Visible episode lengths; green = goal or time-limit survivor, orange = failure or maze timeout. Settings may vary; use frozen evaluation for a controlled comparison.</p></>
}
export default function AArcade() {
  const ref = useRef(null)
  if (!ref.current) ref.current = new Session()
  const [version, render] = useState(0), [running, setRunning] = useState(true), [speed, setSpeed] = useState(1)
  const [options, setOptions] = useState(DEFAULTS), [chapter, setChapter] = useState(0), [component, setComponent] = useState('action')
  const [tab, setTab] = useState('inspect'), [replay, setReplay] = useState(null), [tableRow, setTableRow] = useState(null)
  const [evaluation, setEvaluation] = useState(null), [notice, setNotice] = useState('Supplied Q-learning checkpoint · learning frozen')
  const [complete, setComplete] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('a-arcade-progress') || '[]'); return Array.isArray(saved) ? saved.filter(n => Number.isInteger(n) && n >= 0 && n < CHAPTERS.length) : [] } catch { return [] } })
  const session = ref.current, guide = CHAPTERS[chapter], card = COMPONENTS.find(c => c.id === component) ?? COMPONENTS[0]
  const trace = replay ?? session.trace, world = session.world, algorithm = session.algorithm
  const activeIndex = trace?.encoding?.index ?? encode(world, session.state).index
  const selectedIndex = tableRow ?? activeIndex
  const row = session.table[selectedIndex] ?? session.table[0]
  const observation = trace?.observed ?? session.state
  const refresh = () => render(v => v + 1)
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => {
      for (let i = 0; i < speed * 5; i++) ref.current.advance(options)
      render(v => v + 1)
    }, 40)
    return () => clearInterval(timer)
  }, [running, speed, options])
  function change(key, value) {
    setRunning(false); setReplay(null); session.interrupt()
    setOptions(o => ({ ...o, [key]: value })); refresh()
  }
  function load(nextWorld = world, nextAlgorithm = algorithm, supplied = true) {
    setRunning(false); ref.current = new Session(nextWorld, nextAlgorithm, supplied)
    setReplay(null); setTableRow(null); setEvaluation(null); setOptions({ ...DEFAULTS, learning: !supplied }); setSpeed(1)
    setNotice(supplied ? 'Supplied learned checkpoint restored · learning frozen' : 'Empty learner · learning enabled · no prior training'); refresh()
  }
  function navigate(index) {
    setChapter(index); setComponent(CHAPTERS[index].component); setTab('inspect'); setReplay(null); setRunning(false)
    if (index === 0) load('cartpole', 'q')
    else if (index === 5) load('cartpole', 'a2c')
    else if (index === 6) load('maze', 'q')
    else if (world !== 'cartpole' || algorithm !== 'q') load('cartpole', 'q')
    if (index === 4) {
      load('cartpole', 'q', false)
      setOptions({ ...DEFAULTS, randomActions: true, representation: false, rewardEnabled: false })
      setNotice('Rebuild mode · empty table · restore the four components below')
    }
  }
  function step(single = false) {
    setRunning(false); setReplay(null)
    if (single) session.advance(options)
    else { do { session.advance(options) } while (session.phase !== 0) }
    setComponent((session.algorithm === 'q' ? ['state','bins','action','transition','update'] : ['state','features','actor','transition','rollout'])[session.lastPhase])
    refresh()
  }
  function assess() {
    setRunning(false)
    const seeds = Array.from({ length: 20 }, (_, i) => 901 + i)
    const results = evaluate(world, s => {
      const seen = options.blind && world === 'cartpole' ? [s[0], 0, s[2], 0] : s
      if (algorithm === 'a2c') return actor(seen, session.network.actor).probabilities[1] >= .5 ? 1 : 0
      const r = session.table[options.representation ? encode(world, seen).index : 0]
      return r.indexOf(Math.max(...r))
    }, seeds)
    setEvaluation({ results, seeds, updates: session.updates }); setTab('results')
  }
  function mark() {
    const next = complete.includes(chapter) ? complete.filter(n => n !== chapter) : [...complete, chapter]
    setComplete(next); try { localStorage.setItem('a-arcade-progress', JSON.stringify(next)) } catch { /* The lab works without persistence. */ }
  }
  const phaseCards = algorithm === 'q' ? ['state', 'bins', 'action', 'transition', 'update'] : ['state', 'features', 'actor', 'transition', 'rollout']
  const displayedState = replay ? replay.next ?? replay.state : session.state
  const policy = algorithm === 'a2c' ? trace?.policy ?? actor(observation, session.network.actor) : null
  return <div className="aa-lab" data-version={version} tabIndex={0} role="region" aria-label="A-Arcade scrollable workbench">
    <header className="aa-header"><div className="aa-brand"><span className="aa-logo">a<span>↗</span></span><div><h1>A-Arcade</h1><p>Understand it by taking it apart.</p></div></div><div className="aa-header-right"><span className="aa-badge">INTERACTIVE WORKBENCH</span><span>01 / Reinforcement learning</span></div></header>
    <div className="aa-layout">
      <aside className="aa-journey"><p className="aa-eyebrow">THE LEARNING PATH</p><h2>Start with<br/>something working.</h2><p className="aa-muted">Then uncover one piece at a time.</p>
        <nav aria-label="Learning journey">{CHAPTERS.map((item, i) => <button key={item.title} className={chapter === i ? 'active' : ''} onClick={() => navigate(i)} aria-current={chapter === i ? 'step' : undefined}><span className="aa-step-number">{complete.includes(i) ? '✓' : String(i+1).padStart(2,'0')}</span><span><strong>{item.title}</strong><small>{item.subtitle}</small></span></button>)}</nav>
        <div className="aa-path-note"><span>↗</span><p><strong>No blank-page start.</strong><br/>A working example stays within reach. Restore the supplied agent at any time.</p></div>
        <button className="aa-link" onClick={() => download('a-arcade-engine.js', engineSource)}>↓ Download learning engine</button>
        <button className="aa-link" onClick={() => download('a-arcade-experiment.json', JSON.stringify({ world, algorithm, options, table: session.table, network: session.network, history: session.history, evaluation }, null, 2), 'application/json')}>↓ Export this experiment</button>
      </aside>
      <main className="aa-workbench">
        <section className="aa-intro"><div><p className="aa-eyebrow">CHAPTER {String(chapter+1).padStart(2,'0')} / {guide.subtitle.toUpperCase()}</p><h2>{guide.title}</h2><p>{guide.text}</p></div><button className="aa-check" onClick={mark} aria-pressed={complete.includes(chapter)}>{complete.includes(chapter) ? '✓ Understood' : 'Mark understood'}</button></section>
        <div className="aa-columns"><div className="aa-main-column">
          <section className="aa-world-card"><div className="aa-world-top"><div><span className="aa-live-dot"/> {world === 'maze' ? 'QMaze' : 'CartPole'} <span className="aa-world-tag">{algorithm === 'q' ? 'TABULAR Q-LEARNING' : 'ADVANTAGE ACTOR–CRITIC'}</span></div><span>{replay ? 'RECORDED EXPERIENCE' : running ? 'RUNNING' : 'PAUSED'}</span></div>
            <World world={world} state={displayedState} action={trace?.action} ended={trace?.terminated}/>
            <div className="aa-world-stats"><div><span>EPISODE</span><strong>{replay?.episode ?? session.episode}</strong></div><div><span>STEPS</span><strong>{replay?.step ?? session.steps}<small> / {world === 'maze' ? 100 : 500}</small></strong></div><div><span>VISIBLE RETURN</span><strong>{fmt(replay?.total ?? session.total, world === 'maze' ? 2 : 0)}</strong></div><div><span>LIVE UPDATES</span><strong>{session.updates}</strong></div></div>
            <div className="aa-controls"><button className="aa-primary" onClick={() => { setReplay(null); setRunning(v => !v) }}>{running ? 'Ⅱ Pause' : '▶ Play'}</button><button onClick={() => step()}>One action</button><button onClick={() => step(true)}>Next operation</button><label>Speed <select aria-label="Playback speed" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value="1">1×</option><option value="5">5×</option><option value="25">25×</option></select></label></div>
          </section>
          <div className="aa-status" role="status">{notice}. {options.learning ? 'Training changes the learner.' : 'Frozen evaluation uses greedy actions.'}</div>
          <section className="aa-flow" aria-label="Execution phases">{PHASES.map((name, i) => <button key={name} className={!replay && session.lastPhase === i ? 'active' : ''} onClick={() => setComponent(phaseCards[i])}><span>0{i+1}</span>{name}{i < 4 && <b>›</b>}</button>)}</section>
          <section className="aa-panel"><div className="aa-tabs" role="tablist" aria-label="Inspector view">{[['inspect','Live memory'],['code','Executable source'],['results','Evaluation']].map(([id,label]) => <button role="tab" aria-selected={tab === id} key={id} onClick={() => setTab(id)}>{label}</button>)}</div>
            {tab === 'inspect' && <div className="aa-inspector">
              <div className="aa-section-label"><h3>{replay ? `Recorded episode ${replay.episode} · step ${replay.step}` : 'Follow the data'}</h3>{replay && <button className="aa-link" onClick={() => setReplay(null)}>Back to live</button>}</div>
              <div className="aa-observations">{observation.map((v,i) => <button key={i} onClick={() => setComponent('state')}><span>{(world === 'maze' ? ['row','column'] : ['position · m','velocity · m/s','angle · rad','spin · rad/s'])[i]}</span><strong>{fmt(v)}</strong></button>)}</div>
              <p className="aa-caption">Observation before the action. {trace?.next ? `After the action: [${trace.next.map(v => fmt(v)).join(', ')}]. The scene shows this resulting state.` : 'The next operation will extend this record.'}</p>
              {algorithm === 'q' ? <>
                <p className="aa-data-path">{trace?.encoding ? `[${trace.encoding.bins.join(', ')}] → row ${trace.encoding.index}${world === 'cartpole' && trace.encoding.bins.length ? ` · ((b₀ × 2 + b₁) × 8 + b₂) × 8 + b₃` : ''}` : 'Next: Represent turns this observation into a memory address.'}</p>
                <div className="aa-section-label"><h3>Q-table <small>list of lists</small></h3><label>Inspect row <input aria-label="Inspect table row" type="number" min="0" max={session.table.length-1} value={selectedIndex} onChange={e => setTableRow(Math.max(0, Math.min(session.table.length-1, Number(e.target.value) || 0)))}/></label><button className="aa-link" onClick={() => setTableRow(null)}>Follow agent</button></div>
                <div className="aa-q-row">{row.map((q,a) => <button key={a} className={a === trace?.action && selectedIndex === activeIndex ? 'chosen' : ''} onClick={() => setComponent('table')}><span>Q[{selectedIndex}][{a}]</span><strong>{fmt(q)}</strong><small>{actionName(world,a)}</small></button>)}</div>
                <p className="aa-caption">Live memory · {session.table.length} rows × {row.length} actions. {replay ? `Before this recorded choice the row was [${replay.row.map(v => fmt(v)).join(', ')}].` : 'Click a value to learn what it means.'}</p>
                {trace?.action !== undefined && <p className="aa-caption">Decision used [{trace.row.map(v => fmt(v)).join(', ')}] → {actionName(world,trace.action)}. Reason: {trace.explore ? 'random exploration (which may also choose the best action)' : 'highest stored value; ties choose the first index'}.</p>}
                {trace?.update && <div className="aa-equation"><span>{trace.applied ? 'APPLIED UPDATE' : 'PREVIEW · MEMORY FROZEN'}</span><p><b>{fmt(trace.update.before)}</b> + {fmt(trace.alpha,2)} × (<b>{fmt(trace.update.target)}</b> − <b>{fmt(trace.update.before)}</b>) = <strong>{fmt(trace.update.after)}</strong></p><small>target {fmt(trace.update.target)} = reward {fmt(trace.reward)} + {fmt(trace.gamma,2)} × future {fmt(trace.update.bootstrap)}<br/>α = {fmt(trace.alpha,2)} · γ = {fmt(trace.gamma,2)} · TD error = {fmt(trace.update.error)} · next row {trace.nextIndex}</small></div>}
              </> : <>
                <div className="aa-q-row">{policy.probabilities.map((p,a) => <button key={a} onClick={() => setComponent('actor')}><span>{actionName(world,a)}</span><strong>{fmt(p*100,1)}%</strong><meter min="0" max="1" value={p}/></button>)}</div>
                {trace?.action !== undefined && <p className="aa-caption">Decision: {actionName(world,trace.action)} · {trace.sampled ? 'sampled from the displayed probability distribution' : 'greedy evaluation chooses the higher probability'}.</p>}
                <p className="aa-caption">Actor weights: [{session.network.actor.map(v => fmt(v)).join(', ')}]. Five features; no hidden layers.</p>
                <p className="aa-caption">Actor features: [{policy.phi.map(v => fmt(v)).join(', ')}]<br/>Live critic V(observation): {options.criticEnabled ? fmt(value(observation,session.network.critic)) : '0 · critic removed'}<br/>Critic weights: [{session.network.critic.map(v => fmt(v)).join(', ')}]</p>
                <div className="aa-equation"><span>SYNCHRONOUS ROLLOUT</span><p>{session.rollout.length} / 5 visible transitions collected</p><small>8 environments × 5 steps → one 40-transition update. Seven environments run offscreen. All use the same pre-update policy.</small></div>
                {session.batch && <><h3>Last batch · return minus baseline</h3><div className="aa-batch"><table><thead><tr><th>World / step</th><th>Return</th><th>V(s)</th><th>Advantage</th><th>End</th></tr></thead><tbody>{session.batch.records.map((r,i) => <tr key={i}><td>{Math.floor(i/5)+1} / {i%5+1}</td><td>{fmt(r.target)}</td><td>{fmt(r.baseline)}</td><td>{fmt(r.advantage)}</td><td>{r.terminated ? 'terminal' : r.truncated ? 'time limit' : '—'}</td></tr>)}</tbody></table></div><p className="aa-caption">Actor before: [{session.batch.before.actor.map(v => fmt(v)).join(', ')}]<br/>Actor after: [{session.batch.after.actor.map(v => fmt(v)).join(', ')}]</p></>}
                {session.batch?.actorGradient && <details className="aa-gradient"><summary>Inspect the loss and parameter update</summary><p>Mean actor loss (without entropy): {fmt(session.batch.records.reduce((sum,r) => sum+r.actorLoss,0)/session.batch.count)}<br/>Mean critic loss: {fmt(session.batch.records.reduce((sum,r) => sum+r.criticLoss,0)/session.batch.count)}</p><p>Actor ascent gradient: [{session.batch.actorGradient.mean.map(v => fmt(v)).join(', ')}]<br/>Norm: {fmt(session.batch.actorGradient.norm)} · clipping scale: {fmt(session.batch.actorGradient.scale)}<br/>weight += {session.batch.actorGradient.rate} × scale × gradient</p><p>Critic before: [{session.batch.before.critic.map(v => fmt(v)).join(', ')}]<br/>Critic after: [{session.batch.after.critic.map(v => fmt(v)).join(', ')}]</p></details>}
              </>}
              {trace?.action !== undefined && <div className="aa-transition"><span>action <b>{actionName(world,trace.action)}</b></span><span>reward <b>{fmt(trace.reward)}</b></span><span>terminated <b>{String(trace.terminated ?? '—')}</b></span><span>truncated <b>{String(trace.truncated ?? '—')}</b></span></div>}
            </div>}
            {tab === 'code' && <div className="aa-source"><p>This is the JavaScript actually used by this lab. Select a component to inspect its function. The learning engine download is a standalone ES module; the desktop and browser use the same engine.</p><h3>{card.code}</h3><pre><code>{sourceFor(card.code)}</code></pre><details><summary>See the complete five-phase runner</summary><pre><code>{sessionSource}</code></pre></details></div>}
            {tab === 'results' && <div className="aa-results"><h3>Measure the frozen policy</h3><p>Twenty fresh starting seeds (901–920), greedy actions, no exploration and no learning. Active observation / representation removals remain in effect. The random-action override is ignored here.</p><button className="aa-primary" onClick={assess}>Evaluate 20 seeds</button>{evaluation && <><div className="aa-eval-summary"><strong>{fmt(evaluation.results.reduce((s,r) => s+r.total,0)/20,1)}</strong><span>mean return · {evaluation.results.filter(r => r.success).length}/20 {world === 'maze' ? 'goals reached' : '500-step survivors'}<br/>Measured at learning update {evaluation.updates}; later training does not refresh this result.</span></div><div className="aa-batch"><table><thead><tr><th>Seed</th><th>Steps</th><th>Return</th><th>Outcome</th></tr></thead><tbody>{evaluation.results.map((r,i) => <tr key={i}><td>{evaluation.seeds[i]}</td><td>{r.steps}</td><td>{fmt(r.total,2)}</td><td>{r.success ? 'Success' : 'Ended early / timeout'}</td></tr>)}</tbody></table></div></>}<p className="aa-caption">Supplied checkpoint: seed 7; {algorithm === 'q' ? `${snapshots[world].episodes} training episodes` : `${snapshots.a2c.updates} synchronous updates`}. Selected on separate seeds 101–105. Selection scores are not held-out performance. QMaze has a fixed start and deterministic dynamics, so its seed repeats are the same route, not distinct test mazes.</p></div>}
          </section>
          <section className="aa-panel aa-timeline"><div className="aa-section-label"><h3>Experience timeline</h3><span>Last {session.history.length} actions · click to replay</span></div><div className="aa-trace-buttons">{session.history.map((t,i) => <button key={`${t.episode}-${t.step}`} className={`${t.terminated ? 'failed' : ''} ${replay === t ? 'selected' : ''}`} title={`Episode ${t.episode}, step ${t.step}: ${actionName(world,t.action)}`} aria-label={`Replay episode ${t.episode} step ${t.step}`} onClick={() => { setRunning(false); setReplay(t); setTableRow(null); setTab('inspect') }}>{i+1}</button>)}</div><p className="aa-caption">Replay shows recorded state and arithmetic. It does not rewind or retrain the live model.</p></section>
          <section className="aa-panel aa-timeline"><h3>Watch the behaviour over episodes</h3><EpisodeChart results={session.returns} limit={world === 'maze' ? 100 : 500}/></section>
        </div>
        <aside className="aa-explain-column">
          <section className="aa-panel aa-guide"><p className="aa-eyebrow">UNDER THE SURFACE</p><label className="aa-select-label">Inspect a component<select value={component} onChange={e => setComponent(e.target.value)}>{COMPONENTS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label><h2>{card.title}</h2><dl><dt>What is it?</dt><dd>{card.what}</dd><dt>A small example</dt><dd className="aa-example">{card.example}</dd><dt>The general idea</dt><dd>{card.abstract}</dd><dt>Inputs → outputs</dt><dd className="aa-contract">{card.io}</dd><dt>What if we remove it?</dt><dd>{card.remove}</dd><dt>Try it here</dt><dd>{card.experiment}</dd></dl><button className="aa-link" onClick={() => setTab('code')}>Open its executable source ↗</button></section>
          <section className="aa-panel aa-switches"><h3>{chapter === 4 ? 'Rebuild the components' : 'Experiment controls'}</h3><Toggle label="Learning / parameter updates" checked={options.learning} onChange={v => change('learning',v)}/>{algorithm === 'q' && <><Toggle label="State representation" checked={options.representation} onChange={v => change('representation',v)}/><Toggle label="Use the learned action policy" checked={!options.randomActions} onChange={v => change('randomActions',!v)}/><Toggle label="Reward reaches the learner" checked={options.rewardEnabled} onChange={v => change('rewardEnabled',v)}/>{world === 'cartpole' && <Toggle label="Observe velocities" checked={!options.blind} onChange={v => change('blind',!v)}/>}</>}
            {algorithm === 'a2c' && <><Toggle label="Critic baseline and bootstrap" checked={options.criticEnabled} onChange={v => change('criticEnabled',v)}/><Toggle label="Entropy exploration bonus" checked={options.entropyEnabled} onChange={v => change('entropyEnabled',v)}/>{!options.criticEnabled && <p className="aa-caption">Critic removed: targets use short rollout rewards with zero bootstrap, advantages use a zero baseline, and critic weights are frozen. This deliberately incomplete learner is no longer full A2C.</p>}</>}
            {(algorithm === 'q' ? [['epsilon','Exploration ε',0,1,.05],['alpha','Learning rate α',0,1,.01],['gamma','Future discount γ',0,1,.01]] : [['gamma','Future discount γ',0,1,.01]]).map(([key,label,min,max,increment]) => <label className="aa-slider" key={key}><span>{label}<b>{fmt(options[key],2)}</b></span><input aria-label={label} type="range" min={min} max={max} step={increment} value={options[key]} onChange={e => change(key,Number(e.target.value))}/></label>)}
            <p className="aa-caption">Changing a control pauses execution and discards any incomplete transition or rollout.</p><div className="aa-reset-buttons"><button onClick={() => load(world,algorithm)}>Restore supplied agent</button><button onClick={() => load(world,algorithm,false)}>Start learner from zero</button></div>
          </section>
          <section className="aa-challenge"><span>YOUR NEXT EXPERIMENT</span><p>{guide.task}</p><small>Explain your prediction before pressing Play.</small>{chapter < CHAPTERS.length-1 && <button onClick={() => navigate(chapter+1)}>Next chapter →</button>}</section>
        </aside></div>
        <footer className="aa-footer">A-Arcade · standalone learning lab · physics at 0.02 s per action · browser & desktop engine · progress saved locally</footer>
      </main>
    </div>
  </div>
}
