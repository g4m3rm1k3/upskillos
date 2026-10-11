import { useEffect, useMemo, useRef, useState } from 'react'
import { EXAMPLES } from './examples.js'
import { automaticConcept, automaticMath, exampleMath, SUPERVISED_PHASES } from './automatic.js'
import { NumericHistory, RegressionPlot } from './Plots.jsx'
import { framesOf, kernelCode, lineInfo, parseKernelResult, valueAtPath } from './trace.js'
import { CONCEPTS, MEASUREMENTS, PHASES, SLOT_NAMES, VARIABLE_HELP, translation } from './teaching.js'
import './style.css'

const display = value => typeof value === 'number' ? Number(value.toFixed(5)).toString() : JSON.stringify(value)
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function ArrayCells({ value, path, observation, onSelect }) {
  if (!Array.isArray(value)) return <button className="pc-number" onClick={() => onSelect(path)}>{display(value)}</button>
  return <div className="pc-array">{value.map((item, index) => <div className="pc-cell" key={index}>
    <button className="pc-index" onClick={() => onSelect(`${path}[${index}]`)}>{observation && !Array.isArray(item) ? MEASUREMENTS[index] : `[${index}]`}</button>
    {Array.isArray(item) ? <ArrayCells value={item} path={`${path}[${index}]`} observation={observation} onSelect={onSelect}/> : <button className="pc-number" onClick={() => onSelect(`${path}[${index}]`)}>{display(item)}</button>}
  </div>)}</div>
}
function ValueTree({ node, name, path = name, onSelect, depth = 0, cartpole = false }) {
  if (!node) return null
  const summary = `${node.type}${node.shape ? ` [${node.shape.join(' × ') || 'scalar'}] · ${node.dtype}${node.requires_grad ? ' · tracks gradients' : ''}` : node.length !== undefined ? ` · ${node.length} items` : ''}`
  const observation = cartpole && (/^(obs|next_obs|x)(\[|$)/.test(path) || /result.*\[0\]/.test(path))
  if (!node.items && !Array.isArray(node.value)) return <div className="pc-leaf"><button onClick={() => onSelect(path)}>{name}</button><span>{summary}</span><strong>{display(node.value)}</strong></div>
  return <details className="pc-tree" open={depth === 0 || undefined}>
    <summary><span>{name}</span> <small>{summary}</small></summary>
    <button className="pc-why" onClick={() => onSelect(path)}>Explain this value ↗</button>
    {(node.preview || node.truncated) && <p className="pc-hint">Bounded preview: {node.preview || "some nested items are omitted"}. {node.preview && "Displayed indices address this flat preview, not the original axes."}</p>}
    {Array.isArray(node.value) ? <ArrayCells value={node.value} path={path} observation={observation} onSelect={onSelect}/> : Array.isArray(node.items) ? node.items.map((child, index) => {
      const tupleSlot = cartpole && node.type === 'tuple' && (node.length === 5 || (node.length === 2 && path === 'reset_result'))
      const label = tupleSlot ? (node.length === 2 ? ['initial observation', 'info · extra diagnostics'][index] : SLOT_NAMES[index]) : 'item'
      return <ValueTree key={index} node={child} name={`[${index}] ${label}`} path={`${path}[${index}]`} onSelect={onSelect} depth={depth + 1} cartpole={cartpole}/>
    }) : Object.entries(node.items || {}).map(([key, child]) => <ValueTree key={key} node={child} name={key} path={`${path}.${key}`} depth={depth + 1} onSelect={onSelect}/>)}
  </details>
}
function World({ memory, origins, world, onSelect }) {
  const resultName = memory.results ? 'results' : 'step_result'
  const result = (origins[resultName] ?? -1) > (origins.obs ?? -1) ? (memory.results?.items?.[world]?.items?.[0]?.value ?? memory.step_result?.items?.[0]?.value) : null
  const observed = memory.obs?.value
  const state = result ?? (Array.isArray(observed?.[0]) ? observed[world] : observed)
  if (!Array.isArray(state) || state.length !== 4) return <div className="pc-world-empty">The world appears when Python creates the first observation. Step forward to reset().</div>
  const x = 200 + state[0] * 55, angle = state[2]
  return <button className="pc-world" onClick={() => onSelect(result ? (memory.results ? `results[${world}][0]` : 'step_result[0]') : 'obs')} aria-label="Explain the CartPole observation">
    <svg viewBox="0 0 400 150" role="img" aria-label={`Cart position ${display(state[0])} metres, pole angle ${display(angle)} radians`}>
      <path d="M20 120H380" stroke="#496b70" strokeWidth="2"/><path d="M68 20V130M332 20V130" stroke="#a17954" strokeDasharray="3 5"/>
      <rect x={x - 22} y="98" width="44" height="18" rx="5" fill="#78e6bd"/>
      <circle cx={x - 14} cy="119" r="4" fill="#c7e1da"/><circle cx={x + 14} cy="119" r="4" fill="#c7e1da"/>
      <path d={`M${x} 98L${x + Math.sin(angle) * 75} ${98 - Math.cos(angle) * 75}`} stroke="#f4b779" strokeWidth="6" strokeLinecap="round"/>
      <text x="20" y="145" fill="#bad3ce" fontSize="10">Gymnasium state · click to inspect the four measurements</text>
    </svg>
  </button>
}
export default function PyCade() {
  const [mode, setMode] = useState('q'), [trace, setTrace] = useState(EXAMPLES.q.recording), [source, setSource] = useState(EXAMPLES.q.source)
  const [cursor, setCursor] = useState(0), [playing, setPlaying] = useState(false), [editor, setEditor] = useState(false)
  const [path, setPath] = useState(['whole']), [selected, setSelected] = useState(null), [world, setWorld] = useState(0)
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('Recorded real Python run · replay, not a live interpreter'), [error, setError] = useState('')
  const [memoryView, setMemoryView] = useState('changes'), [journey, setJourney] = useState(0)
  const activeLine = useRef(null), codePane = useRef(null), fileInput = useRef(null), drafts = useRef({})
  const example = EXAMPLES[mode], cartpole = example.cartpole === true
  const phases = cartpole ? PHASES : SUPERVISED_PHASES
  const kernel = window.openCalcDesktop?.kernel
  const frames = useMemo(() => framesOf(trace), [trace]), frame = frames[cursor]
  const lines = trace.source.split('\n'), metadata = trace.metadata?.[frame?.line]
  const info = lineInfo(lines[frame?.line - 1], metadata), memory = frame?.memory || {}
  const math = cartpole ? translation(info.code || '', memory) : exampleMath(mode, info.code || '', memory) || automaticMath(metadata, memory, Object.keys(frame?.changes || {}))
  const dirty = source !== trace.source
  const phaseKeys = new Set(frames.map(item => lineInfo(lines[item.line - 1], trace.metadata?.[item.line]).phase))
  const concept = CONCEPTS[path.at(-1)] || CONCEPTS.python
  const lessons = ['See the whole loop', cartpole ? 'Unpack a real return value' : 'Inspect inputs and outputs', mode === 'custom' ? 'Follow a function call' : 'Follow one learning update', 'Change Python and run it']
  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => setCursor(current => { if (current >= frames.length - 1) { setPlaying(false); return current } return current + 1 }), 900)
    return () => clearInterval(timer)
  }, [playing, frames.length])
  useEffect(() => {
    const pane = codePane.current, line = activeLine.current
    if (pane && line) pane.scrollTop = line.offsetTop - pane.clientHeight / 3
  }, [cursor, trace])
  function seek(index) { setPlaying(false); setCursor(Math.max(0, Math.min(frames.length - 1, index))) }
  function select(valuePath) {
    setSelected(valuePath)
    const root = valuePath.split(/[.\[]/)[0]
    let topic = cartpole ? VARIABLE_HELP[root] || 'python' : automaticConcept(valueAtPath(memory, valuePath))
    if (cartpole && /result/.test(root)) {
      const slots = [...valuePath.matchAll(/\[(\d+)\]/g)].map(match => Number(match[1]))
      const slot = slots[root === 'results' ? 1 : 0]
      if (slot !== undefined) topic = root === 'reset_result' ? ['observation', 'info'][slot] : ['observation', 'reward', 'ending', 'ending', 'info'][slot]
    }
    setPath([topic || 'tuple'])
  }
  function changeMode(next) {
    drafts.current[mode] = source
    setPlaying(false); setMode(next); setTrace(EXAMPLES[next].recording); setSource(drafts.current[next] ?? EXAMPLES[next].source); setCursor(0)
    setPath([EXAMPLES[next].cartpole ? 'whole' : EXAMPLES[next].concept]); setSelected(null); setWorld(0); setEditor(next === 'custom'); setError(''); setNotice('Recorded real Python run · replay, not a live interpreter')
  }
  function jumpTo(predicate) {
    const next = frames.findIndex((item, i) => i > cursor && predicate(lines[item.line - 1]))
    const first = frames.findIndex(item => predicate(lines[item.line - 1]))
    if (next >= 0 || first >= 0) seek(next >= 0 ? next : first)
  }
  async function run() {
    if (!kernel || busy) return
    setBusy(true); setPlaying(false); setError('')
    try {
      const result = parseKernelResult(await kernel.run(kernelCode(source)))
      setTrace(result); setCursor(0); setSelected(null); setPath([example.cartpole ? 'whole' : example.concept]); setEditor(false)
      setNotice('Native Python run · recorded after each executed statement')
      if (result.error) setError(result.error)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function choosePython() {
    setError('')
    try { const result = await kernel.choosePython(); setNotice(result?.ok === false ? result.reason : 'Python selection updated. Run Python to capture a new trace.') } catch (err) { setError(err.message) }
  }
  async function chooseFolder() {
    setError('')
    try { const result = await kernel.chooseFolder(); if (result?.ok === false && result.reason) setError(result.reason) } catch (err) { setError(err.message) }
  }
  function guided(index) {
    setJourney(index)
    if (index === 0) { setPath([cartpole ? 'whole' : example.concept]); seek(0) }
    if (index === 1) {
      if (mode === 'custom') {
        const target = frames.findIndex(item => item.returned || Object.values(item.changes).some(node => node.items || node.shape))
        if (target >= 0) { seek(target); setSelected(Object.keys(frames[target].changes).at(-1)) }
      } else { jumpTo(code => code.includes(example.inspect)); setSelected(example.value) }
      setPath([cartpole ? 'tuple' : example.concept]); setEditor(false)
    }
    if (index === 2) {
      if (mode === 'custom') { const target = frames.findIndex(item => item.stack?.length > 1); seek(target >= 0 ? target : 0); setPath(['function']) }
      else { jumpTo(code => code.includes(example.update)); setPath([example.concept]) }
      setEditor(false)
    }
    if (index === 3) { setEditor(true); setPath(['python']); setPlaying(false) }
  }
  const changed = Object.keys(frame?.changes || {}), selectedRoot = selected?.split(/[.\[]/)[0]
  const selectedValue = valueAtPath(memory, selected)
  const names = memoryView === 'all' ? Object.keys(memory) : [...new Set([...changed, ...(selectedRoot && memory[selectedRoot] ? [selectedRoot] : [])])]
  return <div className="pc-lab" role="region" aria-label="PyCade Python learning lab">
    <header className="pc-header"><div><span className="pc-eyebrow">PYTHON YOU CAN TAKE APART</span><h1>PyCade <span>from zero to “I see it.”</span></h1></div><select aria-label="Learning program" value={mode} onChange={event => changeMode(event.target.value)} disabled={busy}>{Object.entries(EXAMPLES).map(([key, value]) => <option value={key} key={key}>{value.title}</option>)}</select></header>
    <div className="pc-journey" aria-label="Guided learning path">{lessons.map((label, index) => <button key={label} aria-pressed={journey === index} onClick={() => guided(index)}>{index + 1}. {label}</button>)}</div>
    <div className="pc-map" aria-label="Whole program map">{Object.entries(phases).filter(([key]) => phaseKeys.has(key)).map(([key, [label, description]]) => <button key={key} title={description} className={info.phase === key ? 'active' : ''} onClick={() => jumpTo(code => lineInfo(code).phase === key)}><strong>{label}</strong><small>{description}</small></button>)}</div>
    <div className="pc-toolbar"><button onClick={() => seek(0)} disabled={busy}>↤ Start trace</button><button onClick={() => seek(cursor - 1)} disabled={cursor === 0 || busy}>← Back</button><button onClick={() => seek(cursor + 1)} disabled={cursor === frames.length - 1 || busy}>Next statement →</button><button onClick={() => setPlaying(!playing)} disabled={cursor === frames.length - 1 || busy}>{playing ? 'Pause' : 'Play trace'}</button><span>Statement {cursor + 1} / {frames.length} · line {frame?.line}</span><input aria-label="Trace position" type="range" min="0" max={frames.length - 1} value={cursor} onChange={event => seek(Number(event.target.value))}/></div>
    <p className="pc-status">{notice}. Snapshots show memory <strong>after</strong> the highlighted statement. {dirty && <strong>Editor changed: run Python to trace your edits; the displayed trace still uses its recorded source.</strong>}</p>
    <div className="pc-workspace">
      <section className="pc-source"><div className="pc-panel-heading"><h2>{editor ? 'Edit the whole program' : 'The whole Python program'}</h2><button onClick={() => { setEditor(!editor); setPlaying(false) }}>{editor ? 'Show recorded code' : 'Edit Python'}</button></div>
        {editor ? <><p className="pc-hint">{example.experiment} Keep runs small for a readable trace.</p><textarea aria-label="Python source editor" spellCheck="false" value={source} onChange={event => setSource(event.target.value)} disabled={busy}/></> : <div className="pc-code" ref={codePane}>{lines.map((line, index) => <button key={index} ref={frame?.line === index + 1 ? activeLine : null} className={frame?.line === index + 1 ? 'active' : ''} onClick={() => { const next = frames.findIndex((item, i) => i > cursor && item.line === index + 1); seek(next >= 0 ? next : frames.findIndex(item => item.line === index + 1)) }} disabled={!frames.some(item => item.line === index + 1)} aria-label={`Line ${index + 1}: ${lineInfo(line).code}`}><span>{index + 1}</span><code>{lineInfo(line).code || ' '}</code></button>)}</div>}
        <div className="pc-runtime"><button onClick={run} disabled={!kernel || busy}>{busy ? 'Running Python…' : 'Run Python & capture trace'}</button>{kernel && <><button onClick={choosePython} disabled={busy}>Choose Python</button><button onClick={chooseFolder} disabled={busy}>Working folder</button></>}<button onClick={() => download(`pycade-${mode}.py`, source)}>Download .py</button><button onClick={() => fileInput.current?.click()} disabled={busy}>Load .py</button><input ref={fileInput} type="file" accept=".py,text/x-python,text/plain" aria-label="Load Python file" hidden onChange={async event => { const file = event.target.files?.[0]; if (!file) return; try { if (file.size > 200000) throw new Error("Use a Python file smaller than 200 KB."); const text = await file.text(); changeMode("custom"); setSource(text); setEditor(true); } catch (err) { setError(err.message); } event.target.value = "" }}/>
          <details><summary>{kernel ? 'Python setup & run details' : 'Desktop Python setup'}</summary><p>{kernel ? 'Uses the same native Python interpreter as desktop notebooks. Wait for any notebook job to finish first.' : 'This browser shows recorded real Python runs. Open PyCade in the Electron desktop app to run edits with your own Python.'}</p><p>Install the packages your program imports in the interpreter you select. The supplied ML examples use:</p><code>python -m pip install numpy gymnasium torch</code><p>Or download the program and run it in your own virtual environment. The short built-in runs teach execution, not performance on unseen data. Custom Python needs no annotations. Only the supplied file is traced; imported library internals, other threads, and blocking calls are not stepped. Large values use labeled previews.</p><p>Recorded with {Object.entries(trace.versions).map(([key, value]) => `${key} ${value}`).join(' · ')}</p></details>
        </div>
      </section>
      <section className="pc-inspection"><div className="pc-panel-heading"><h2>What this statement did</h2><span>{phases[info.phase]?.[0]}</span></div>
        <code className="pc-current">{info.code}</code>
        {frame.stack && <div className="pc-flow"><strong>Call path: {frame.stack.map(name => name === '<module>' ? 'program' : name).join(' → ')}</strong>{frame.returned && <span>Returning to caller · inspect “return value”</span>}</div>}
        {metadata && <div className="pc-flow"><span>Reads → statement → assigns</span><div>{metadata.reads.filter(name => memory[name]).map(name => <button key={name} onClick={() => select(name)}>{name}</button>)}<span> → </span>{metadata.writes.map(name => <button key={name} onClick={() => select(name)}>{name}</button>)}</div></div>}<p className="pc-explanation">{info.explanation}</p>
        {mode === 'regression' && <RegressionPlot memory={memory} onSelect={select}/>}
        {!cartpole && <NumericHistory key={mode} frames={frames} cursor={cursor}/>}
        <details className="pc-math" key={info.phase} open={info.phase === 'learn' || info.phase === 'represent'}><summary>Code ↔ math ↔ this run</summary><strong>{math[0]}</strong><code>{math[1]}</code><p>{math[2]}</p></details>
        {cartpole && <><div className="pc-world-bar"><strong>The world behind these numbers</strong>{mode === 'a2c' && <select aria-label="Visible world" value={world} onChange={event => setWorld(Number(event.target.value))}><option value="0">World 0</option><option value="1">World 1</option></select>}</div><World memory={memory} origins={frame.origins} world={world} onSelect={select}/></>}
        <div className="pc-panel-heading"><h2>Python memory</h2><select aria-label="Memory filter" value={memoryView} onChange={event => setMemoryView(event.target.value)}><option value="changes">Changed + selected</option><option value="all">All variables</option></select></div>
        <p className="pc-hint">Gold marks values changed by this statement. Click an index or value to ask what it means. Expand containers to see their pieces.</p>
        {!names.length && <p className="pc-hint">No inspected variable changed. Imports and loop control can run without producing a new numerical value.</p>}
        {names.map(name => <div key={name} className={`pc-value ${changed.includes(name) ? 'changed' : ''}`}><ValueTree name={name} node={memory[name]} onSelect={select} cartpole={cartpole}/><button className="pc-why" onClick={() => { select(name); seek(frame.origins[name]) }}>Last changed at line {frames[frame.origins[name]]?.line} ↗</button></div>)}
      </section>
      <aside className="pc-guide"><div className="pc-panel-heading"><h2>Explain it here</h2><button onClick={() => { setPath([cartpole ? 'whole' : example.concept]); setSelected(null) }}>Whole puzzle</button></div>
        <div className="pc-breadcrumb">{path.map((key, index) => <button key={`${key}-${index}`} onClick={() => setPath(path.slice(0, index + 1))}>{index ? '› ' : ''}{CONCEPTS[key]?.[0]}</button>)}</div>
        {selected && <div className="pc-selected"><small>YOU CLICKED</small><code>{selected}</code>{selectedValue && <><strong>{selectedValue.value !== undefined ? JSON.stringify(selectedValue.value).slice(0, 350) : `${selectedValue.type} container`}</strong><span>{selectedValue.type}{selectedValue.shape ? ` · shape [${selectedValue.shape.join(', ')}]` : ''}</span></>}{selectedRoot && memory[selectedRoot] && <button className="pc-why" onClick={() => seek(frame.origins[selectedRoot])}>Show the statement that last changed {selectedRoot} → line {frames[frame.origins[selectedRoot]].line}</button>}{cartpole && selectedRoot === 'q' && <p>q[row, column]: the row is a binned state; column 0 means left and column 1 means right. The number estimates future reward.</p>}{cartpole && ['advantages', 'targets', 'baselines', 'log_probs'].includes(selectedRoot) && <p>First index = time step (0–3). Second index = world (0 or 1). Compare the same two indices across targets, baselines and advantages.</p>}{cartpole && ['logits', 'probabilities'].includes(selectedRoot) && <p>First index = world. Second index = action: 0 left, 1 right.</p>}</div>}
        <h3>{concept[0]}</h3><p>{concept[1]}</p>
        <p className="pc-eyebrow">BREAK THIS IDEA INTO SMALLER PIECES</p><div className="pc-prerequisites">{concept[2].map(key => <button key={key} onClick={() => setPath([...path, key])}>{CONCEPTS[key][0]} <span>↗</span></button>)}</div>
        {path.length > 1 && <button onClick={() => setPath(path.slice(0, -1))}>← Back one explanation</button>}
        <div className="pc-task"><strong>Make one prediction</strong><p>{example.experiment}</p></div>
        <details><summary>Where the library contract comes from</summary><p><a href="https://gymnasium.farama.org/api/env/" target="_blank" rel="noreferrer">Gymnasium reset / step</a></p><p><a href="https://docs.pytorch.org/docs/stable/distributions.html" target="_blank" rel="noreferrer">PyTorch Categorical / log_prob</a></p></details>
      </aside>
    </div>
    {error && <pre className="pc-error" role="alert">{error}</pre>}
    {trace.stdout && <details className="pc-stdout"><summary>Program output · first 8,000 characters from the entire run</summary><pre>{trace.stdout}</pre></details>}
  </div>
}
