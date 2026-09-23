import React, { useEffect, useMemo, useState } from 'react'
import { generateData, splitData, initialModel, stepModel, gradients, gradientCheck, closedForm, mse, mean, parseCSV, predict } from '../../engine.js'
import { experimentPython } from '../../python.js'
import { DataPlot, LossPlot } from '../../Charts.jsx'
import LessonText from '../../LessonText.jsx'
import DotProduct from './DotProduct.jsx'
import Slopes from './Slopes.jsx'

const fmt = n => Number.isFinite(n) ? (Math.abs(n) >= 10000 ? n.toExponential(3) : n.toFixed(4)) : '—'
function download(name, body, type='text/plain') {
  const url=URL.createObjectURL(new Blob([body],{type})), a=document.createElement('a')
  a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000)
}

// How the trainer's screen maps onto each lesson from 01 on.
const BRIDGE = {
  model: ['Each **dot** is one measurement: an input x (across) and the observed target y (up). Blue circles train the model; orange diamonds are held back to check it.', 'The **solid line** is the model ŷ = w·x + b — the weighted sum from lesson 00a with one input x, one weight w, plus a bias b — worked out for every x.', 'Type into **Weight w** and **Bias b** under the chart: w tilts the line, b shifts it up and down. Ignore the training buttons for now.'],
  loss: ['The faint **vertical segments** from each circle to the line are the errors e = ŷ − y.', '**Train MSE** is the average of those errors squared. Open “Inspect predictions and error contributions” to see each one.', 'Move w or b and watch Train MSE change: that number is what training will try to make small.'],
  gradient: ['**Inside one update** shows dw and db: the two partial derivatives from lesson 00b, now for the loss over all training points.', '**Check gradients** performs 00b’s nudge test: it changes w (then b) by a tiny amount and compares the measured change with the formula.'],
  training: ['**Step once** applies one update, w ← w − α·dw and b ← b − α·db, and shows the arithmetic.', '**Train** repeats it; the **loss chart** records the MSE after every step. Try learning rates 0.01, 0.1 and 1 from Reset.'],
  evaluate: ['Compare **Validation MSE** (the orange diamonds the model never trained on) with the **mean baseline**, which always predicts the average training y.', 'Choose **Curved relationship**: no amount of training makes a straight line fit a curve.'],
  transfer: ['Paste your own measurements under **Try your own paired measurements**.', '**Use least-squares reference** jumps straight to the direct solution (the dashed line) so you can compare it with gradient descent.'],
}
function Bridge({ lesson }) {
  const items = BRIDGE[lesson?.id]
  if (!items) return null
  return <div className="ml-update"><h3>How this connects to “{lesson.title.slice(lesson.title.indexOf('·') + 2)}”</h3><ul>{items.map((t, i) => <li key={i}><LessonText>{t}</LessonText></li>)}</ul></div>
}

// Lab 01's playground follows the lesson: two short workbenches for the
// preliminaries, then one regression trainer shared by lessons 01–06.
export default function Lab01Playground(props) {
  if (props.lesson?.id === 'arrays') return <DotProduct />
  if (props.lesson?.id === 'slopes') return <Slopes />
  return <Trainer {...props} />
}

// One-feature least squares, trained step by step.
function Trainer({ journal, setJournal, progress, lesson }) {
  const [config,setConfig]=useState({seed:42,count:60,noise:0.7,shape:'linear'}), [imported,setImported]=useState(null)
  const points=useMemo(()=>imported || generateData(config),[config,imported])
  const {train,validation}=useMemo(()=>splitData(points,config.seed),[points,config.seed])
  const [model,setModel]=useState(()=>initialModel(train,validation)), [rate,setRate]=useState(0.05), [running,setRunning]=useState(false)
  const [check,setCheck]=useState(null), [csv,setCsv]=useState('x,y\n1,3\n2,5\n3,7\n4,9\n5,11'), [csvError,setCsvError]=useState(''), [runs,setRuns]=useState([])
  const reference=useMemo(()=>closedForm(train),[train]), g=gradients(train,model.w,model.b)
  const current=model.history.at(-1), baseline=mse(validation,0,mean(train.map(p=>p.y)))
  useEffect(()=>{setRunning(false);setModel(initialModel(train,validation));setCheck(null)},[train,validation])
  useEffect(()=>{
    if(!running || model.stopped) return
    const id=setInterval(()=>setModel(m=>stepModel(m,train,validation,rate)),70)
    return ()=>clearInterval(id)
  },[running,model.stopped,train,validation,rate])
  useEffect(()=>{if(model.stopped)setRunning(false)},[model.stopped])
  const reset=()=>{setRunning(false);setModel(initialModel(train,validation));setCheck(null)}
  const editParameter=(name,value)=>{setRunning(false);setCheck(null);setModel(m=>initialModel(train,validation,name==='w'?value:m.w,name==='b'?value:m.b))}
  const changeConfig=(name,value)=>{setRunning(false);if(name!=='seed')setImported(null);setConfig(c=>({...c,[name]:value}));setCsvError('')}
  const snapshot=()=>({version:1,createdAt:new Date().toISOString(),dataSource:imported?'Imported CSV':'Synthetic',config,rate,parameters:{w:model.w,b:model.b},iteration:model.iteration,train,validation,history:model.history,baselineValidationMSE:baseline,journal})
  return <>
    <div className="ml-panel-heading"><div><span className="ml-eyebrow">Live experiment</span><h2>Fit a line to measurements: ŷ = w·x + b</h2></div><span className="ml-pill">{imported?'Your CSV':'Synthetic data'}</span></div>
    <Bridge lesson={lesson} />
    <div className="ml-controls"><label>Relationship<select value={imported?'imported':config.shape} onChange={e=>changeConfig('shape',e.target.value)}>{imported && <option value="imported">Imported CSV</option>}<option value="linear">Linear + noise</option><option value="curved">Curved relationship</option><option value="outlier">One outlier</option></select></label>
      <label>Noise: {config.noise}<input type="range" min="0" max="3" step="0.1" value={config.noise} onChange={e=>changeConfig('noise',+e.target.value)} /></label>
      <label>Samples<select value={config.count} onChange={e=>changeConfig('count',+e.target.value)}>{[20,60,120].map(n=><option key={n}>{n}</option>)}</select></label>
      <label>Seed<input type="number" min="0" max="999999" value={config.seed} onChange={e=>{if(e.target.value!=='')changeConfig('seed',Math.max(0,Math.min(999999,Math.trunc(+e.target.value))))}} /></label></div>
    <div className="ml-legend"><span>● Training ({train.length})</span><span>◆ Validation ({validation.length})</span><span>━ Current</span><span>┄ Least squares</span></div>
    <DataPlot train={train} validation={validation} model={model} reference={reference}/>
    <div className="ml-controls ml-parameters">{[['w','Weight w'],['b','Bias b']].map(([key,label])=><label key={key}>{label}<input type="number" step="0.1" value={Number(model[key].toFixed(5))} onChange={e=>{const v=Number(e.target.value);if(e.target.value!=='' && Number.isFinite(v) && Math.abs(v)<=1e6)editParameter(key,v)}} /></label>)}<label>Learning rate α<select value={rate} onChange={e=>{setRunning(false);setRate(+e.target.value)}}>{[0.0001,0.001,0.01,0.05,0.1,0.3,1].map(n=><option key={n}>{n}</option>)}</select></label></div>
    <div className="ml-actions"><button className="ml-primary" disabled={!!model.stopped} onClick={()=>setRunning(!running)}>{running?'Pause':'Train'}</button><button disabled={running || !!model.stopped} onClick={()=>{setCheck(null);setModel(m=>stepModel(m,train,validation,rate))}}>Step once</button><button disabled={running || !!model.stopped} onClick={()=>{setCheck(null);setModel(m=>{for(let i=0;i<100;i++)m=stepModel(m,train,validation,rate);return m})}}>100 steps</button><button onClick={reset}>Reset</button></div>
    <p className="ml-caption">Step {model.iteration} · Data changes and manual parameter edits reset the trace. Reset starts from w = b = 0.</p>
    {model.stopped && <p className="ml-warning" role="status">{model.stopped}</p>}
    <div className="ml-metrics"><div><small>Train MSE</small><strong>{fmt(current.train)}</strong></div><div><small>Validation MSE</small><strong>{fmt(current.validation)}</strong></div><div><small>Mean baseline · validation</small><strong>{fmt(baseline)}</strong></div></div>
    <LossPlot history={model.history}/><div className="ml-update"><h3>Inside one update</h3><p>Current gradient: dw = {fmt(g.w)} · db = {fmt(g.b)}</p>{model.last ? <><code>w: {fmt(model.last.w)} − {model.last.rate} × ({fmt(model.last.g.w)}) = {fmt(model.w)}</code><code>b: {fmt(model.last.b)} − {model.last.rate} × ({fmt(model.last.g.b)}) = {fmt(model.b)}</code><small>Both derivatives above came from the same previous parameter values.</small></> : <p>Press “Step once” to inspect the arithmetic.</p>}</div>
    <div className="ml-actions"><button disabled={running} onClick={()=>setCheck({...gradientCheck(train,model.w,model.b),atW:model.w,atB:model.b})}>Check gradients</button><button onClick={()=>{setRunning(false);setModel(initialModel(train,validation,reference.w,reference.b));setCheck(null)}}>Use least-squares reference</button></div>
    {check && <p className="ml-check-result" role="status">{check.passed?'✓ Match':'Mismatch'} at w={fmt(check.atW)}, b={fmt(check.atB)}. Analytic ({fmt(check.analytic.w)}, {fmt(check.analytic.b)}); finite difference ({fmt(check.numeric.w)}, {fmt(check.numeric.b)}). Relative error: {check.error.toExponential(2)}.</p>}
    <p className="ml-caption">Reference train MSE: {fmt(mse(train,reference.w,reference.b))}. {reference.degenerate?'All training x values are effectively identical; the slope is not identifiable. Reference uses w = 0.':'Dashed line minimizes training squared loss directly.'} Axes follow the data; a diverging line can leave the plot.</p>
    <details><summary>Inspect predictions and error contributions</summary><div className="ml-table-scroll"><table><thead><tr><th>x</th><th>observed y</th><th>predicted ŷ</th><th>error</th><th>error²</th></tr></thead><tbody>{train.slice(0,12).map((p,i)=>{const yhat=predict(p.x,model.w,model.b),e=yhat-p.y;return <tr key={i}><td>{fmt(p.x)}</td><td>{fmt(p.y)}</td><td>{fmt(yhat)}</td><td>{fmt(e)}</td><td>{fmt(e*e)}</td></tr>})}</tbody></table></div><p className="ml-caption">First {Math.min(12,train.length)} training rows. Loss and gradients use all {train.length} training rows.</p></details>
    <details><summary>Try your own paired measurements</summary><p>Paste numeric x,y rows (5–2,000). This uses a shuffled 80/20 split, suitable for independent observations. Time series and grouped data need a different split. Data stays in this browser unless you export it.</p><textarea aria-label="CSV observations" value={csv} onChange={e=>setCsv(e.target.value)} /><button onClick={()=>{try {const rows=parseCSV(csv);setRunning(false);setImported(rows);setCsvError('')}catch(e){setCsvError(e.message)}}}>Load CSV</button>{csvError && <p role="alert" className="ml-warning">{csvError}</p>}</details>
    <details open><summary>Experiment notebook</summary><label className="ml-reflection">Prediction → observation → explanation<textarea value={journal} onChange={e=>setJournal(e.target.value)} placeholder="I predict… I changed… I observed… I think this happened because…" /></label><div className="ml-actions"><button onClick={()=>setRuns(r=>[...r.slice(-3),snapshot()])}>Save run for comparison</button><button onClick={()=>download('ml-experiment.json',JSON.stringify({...snapshot(),savedRuns:runs,progress},null,2),'application/json')}>Export experiment & notes</button><button onClick={()=>download('ml-regression.py',experimentPython({train,validation,rate}))}>Export Python experiment</button></div>{runs.map((run,i)=><div className="ml-run" key={run.createdAt}><strong>Run {i+1} · {run.dataSource} · {run.config.shape} · seed {run.config.seed}</strong><span>α {run.rate} · step {run.iteration} · validation {fmt(run.history.at(-1).validation)}</span><small>{run.journal || 'No explanation recorded.'}</small></div>)}<p className="ml-caption">Notes and code save on this device. Data, training traces, and up to four comparison runs last for this session; export to keep them. Compare learning rates on identical data and initial parameters.</p></details>
  </>
}
