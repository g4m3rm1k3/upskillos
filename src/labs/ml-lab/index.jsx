import React, { useEffect, useMemo, useRef, useState } from 'react'
import { generateData, splitData, initialModel, stepModel, gradients, gradientCheck, closedForm, mse, mean, parseCSV, predict } from './engine.js'
import { lessons, sources } from './lessons.js'
import { starter, solution, checks, experimentPython } from './python.js'
import { DataPlot, LossPlot } from './Charts.jsx'
import './ml.css'
import { useGlobalTheme, getFontFamily, getFontSize, getLineHeight } from '../../context/ThemeContext.jsx'
import { STUDIO_THEMES } from '../../utils/studioThemes.js'
import StaticCodeBlock from '../../components/markdown/StaticCodeBlock.jsx'
import LessonText from './LessonText.jsx'
import PythonEditor from './PythonEditor.jsx'
import LearningPath from './LearningPath.jsx'

const STORE = 'upskillos.ml-lab.v1'
const fmt = n => Number.isFinite(n) ? (Math.abs(n) >= 10000 ? n.toExponential(3) : n.toFixed(4)) : '—'
function readSaved() { try { return JSON.parse(localStorage.getItem(STORE)) || {} } catch { return {} } }
function download(name, body, type='text/plain') {
  const url=URL.createObjectURL(new Blob([body],{type})), a=document.createElement('a')
  a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function Checkpoint({ lesson, saved, onSave }) {
  const [answer,setAnswer]=useState(''), [feedback,setFeedback]=useState('')
  return <section className="ml-checkpoint">
    <span className="ml-eyebrow">Check your understanding</span><h3>{lesson.question}</h3>
    <form onSubmit={e=>{e.preventDefault(); const good=answer.trim()!=='' && Number.isFinite(Number(answer)) && Math.abs(Number(answer)-lesson.answer)<1e-6; setFeedback(good ? `Correct. ${lesson.explanation}` : 'Not quite. Work through the numbers, then try again.'); if(good) onSave({...saved,passed:true})}}>
      <input aria-label="Checkpoint answer" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Your numeric answer" /><button>Check answer</button>
    </form>
    <p role="status">{feedback || (saved.passed ? 'Numeric checkpoint passed previously. Try it again from memory.' : 'Try before opening the explanation.')}</p>
    <details><summary>Worked explanation</summary><p><LessonText>{lesson.explanation}</LessonText></p></details>
    <label className="ml-reflection"><LessonText>{lesson.reflection}</LessonText><textarea value={saved.note || ''} onChange={e=>onSave({...saved,note:e.target.value})} placeholder="Explain it in your own words. Saved on this device." /></label>
    <small>Numeric checks are automatic. Written explanations are for your own review; they are not AI-graded.</small>
  </section>
}
export default function MLLab({ onBack }) {
  const { themeStyles, isDarkGlobal, typography } = useGlobalTheme()
  const md = themeStyles?.md ?? (isDarkGlobal ? STUDIO_THEMES.default.mdDark : STUDIO_THEMES.default.mdLight)
  const themeVariables = {
    '--ml-heading-1': md.h1, '--ml-heading-2': md.h2, '--ml-heading-3': md.h3,
    '--ml-heading-4': md.h4, '--ml-prose': md.text, '--ml-strong': md.strong,
    '--ml-inline-bg': md.codeBg, '--ml-inline-color': md.codeText,
    '--ml-code-bg': md.preBg, '--ml-code-border': md.preBorder,
    '--ml-quote-bg': md.quoteBg, '--ml-quote-border': md.quoteBorder,
    '--ml-prose-font': getFontFamily(typography?.font),
    '--ml-prose-size': getFontSize(typography?.fontSize),
    '--ml-prose-leading': getLineHeight(typography?.lineHeight),
    '--ml-prose-align': typography?.textAlign || 'left',
    colorScheme: isDarkGlobal ? 'dark' : 'light',
  }
  const [saved]=useState(readSaved), [progress,setProgress]=useState(saved.progress || {}), [journal,setJournal]=useState(saved.journal || ''), [code,setCode]=useState(saved.code || starter)
  const [storageError,setStorageError]=useState('')
  const [tab,setTab]=useState('learn'), [lessonIndex,setLessonIndex]=useState(()=>Math.max(0,lessons.findIndex(l=>l.id===saved.lessonId)))
  const [config,setConfig]=useState({seed:42,count:60,noise:0.7,shape:'linear'}), [imported,setImported]=useState(null)
  const points=useMemo(()=>imported || generateData(config),[config,imported])
  const {train,validation}=useMemo(()=>splitData(points,config.seed),[points,config.seed])
  const [model,setModel]=useState(()=>initialModel(train,validation)), [rate,setRate]=useState(0.05), [running,setRunning]=useState(false)
  const [check,setCheck]=useState(null), [csv,setCsv]=useState('x,y\n1,3\n2,5\n3,7\n4,9\n5,11'), [csvError,setCsvError]=useState(''), [runs,setRuns]=useState([])
  const [output,setOutput]=useState('Implement the four functions, then run the checks.'), [busy,setBusy]=useState(false), [pythonStatus,setPythonStatus]=useState(''), [showSolution,setShowSolution]=useState(false)
  const worker=useRef(null), timer=useRef(null), playgroundRef=useRef(null)
  const lesson=lessons[lessonIndex], reference=useMemo(()=>closedForm(train),[train]), g=gradients(train,model.w,model.b)
  const current=model.history.at(-1), baseline=mse(validation,0,mean(train.map(p=>p.y)))
  useEffect(()=>{try {localStorage.setItem(STORE,JSON.stringify({progress,journal,code,lessonId:lessons[lessonIndex].id}));setStorageError('')} catch {setStorageError('Device storage is unavailable. Export your notes before leaving.')}},[progress,journal,code,lessonIndex])
  useEffect(()=>{setRunning(false);setModel(initialModel(train,validation));setCheck(null)},[train,validation])
  useEffect(()=>{
    if(!running || model.stopped) return
    const id=setInterval(()=>setModel(m=>stepModel(m,train,validation,rate)),70)
    return ()=>clearInterval(id)
  },[running,model.stopped,train,validation,rate])
  useEffect(()=>{if(model.stopped)setRunning(false)},[model.stopped])
  useEffect(()=>()=>{worker.current?.terminate();clearTimeout(timer.current)},[])
  const reset=()=>{setRunning(false);setModel(initialModel(train,validation));setCheck(null)}
  const editParameter=(name,value)=>{setRunning(false);setCheck(null);setModel(m=>initialModel(train,validation,name==='w'?value:m.w,name==='b'?value:m.b))}
  const changeConfig=(name,value)=>{setRunning(false);if(name!=='seed')setImported(null);setConfig(c=>({...c,[name]:value}));setCsvError('')}
  const snapshot=()=>({version:1,createdAt:new Date().toISOString(),dataSource:imported?'Imported CSV':'Synthetic',config,rate,parameters:{w:model.w,b:model.b},iteration:model.iteration,train,validation,history:model.history,baselineValidationMSE:baseline,journal})
  const stopPython=()=>{worker.current?.terminate();worker.current=null;clearTimeout(timer.current);setBusy(false);setPythonStatus('Stopped');setOutput(o=>o+'\nExecution stopped. You can edit and retry.')}
  const runPython=()=>{
    setBusy(true);setOutput('');setPythonStatus('Starting Python…')
    try {
      worker.current?.terminate()
      const instance=new Worker(new URL('./python.worker.js',import.meta.url));worker.current=instance
      const finish=()=>{clearTimeout(timer.current);setBusy(false);instance.terminate();if(worker.current===instance)worker.current=null}
      instance.onmessage=({data})=>{
        if(data.type==='status')setPythonStatus(data.text)
        if(data.type==='output')setOutput(o=>(o+'\n'+data.text).slice(-24000))
        if(data.type==='done'){setPythonStatus(data.checked?'All exercise checks passed':'Execution complete');finish()}
        if(data.type==='error'){setOutput(o=>o+'\n'+data.text);setPythonStatus('Execution failed — inspect the feedback below');finish()}
      }
      instance.onerror=e=>{setOutput(e.message || 'Python worker could not start. Check network access and retry.');setPythonStatus('Runtime error');finish()}
      timer.current=setTimeout(()=>{instance.terminate();setBusy(false);setPythonStatus('Time limit reached');setOutput(o=>o+'\nStopped after 90 seconds. Check for an infinite loop or retry if the runtime download was slow.')},90000)
      instance.postMessage({code,checks})
    } catch(error){setBusy(false);setPythonStatus('Could not start Python');setOutput(String(error))}
  }
  return <div className="ml-lab" style={themeVariables}>
    <header className="ml-header"><div className="ml-brand"><button className="ml-back" onClick={()=>onBack ? onBack() : window.history.back()} aria-label="Back to labs">←</button><div><span className="ml-eyebrow">UpSkillOS / First principles</span><h1>Machine Learning Lab <span>01</span></h1></div></div><div className="ml-header-note">From a line of algebra<br/><strong>to a model you understand.</strong></div></header>
    <nav className="ml-tabs" aria-label="ML workspace">{[['learn','Learn & experiment'],['code','Implement in Python'],['path','Your learning path']].map(([id,label])=><button key={id} aria-current={tab===id?'page':undefined} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}<span>{Object.values(progress).filter(p=>p.passed).length}/{lessons.length} numeric checkpoints</span></nav>
    {storageError && <p className="ml-warning" role="alert">{storageError}</p>}
    {tab==='learn' && <div className="ml-layout">
      <aside className="ml-syllabus"><span className="ml-eyebrow">Module 01 / foundations</span><h2>How does a model learn?</h2><p>Start with Python basics and algebra. Build the missing intuition one step at a time.</p>
        <nav aria-label="Lessons">{lessons.map((l,i)=><button key={l.id} className={i===lessonIndex?'selected':''} aria-current={i===lessonIndex?'step':undefined} onClick={()=>setLessonIndex(i)}><span>{l.title}</span>{progress[l.id]?.passed && <span aria-label="Numeric checkpoint passed">✓</span>}</button>)}</nav>
        <div className="ml-side-note">The goal is not to finish the page.<br/>It is to explain what changed—and why.</div>
      </aside>
      <article className="ml-lesson"><span className="ml-eyebrow">Understand → derive → test → explain</span><h2>{lesson.title.slice(lesson.title.indexOf('·')+2)}</h2><p className="ml-objective">You will be able to: {lesson.skill}</p><p className="ml-prereq"><strong>Before you start:</strong> {lesson.prerequisite}</p><button className="ml-jump" onClick={()=>playgroundRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}>Jump to live experiment ↓</button>
        <div className="ml-reading">{lesson.paragraphs.map((p,i)=><section className="ml-reading-section" key={i}><h3>{lesson.sections?.[i] || `Step ${i+1}`}</h3><p><LessonText>{p}</LessonText></p></section>)}</div>
        <div className="ml-equation"><span className="ml-eyebrow">Math ↔ code</span><div>{lesson.formula}</div></div>
        <div className="ml-experiment"><span className="ml-eyebrow">Predict before you run</span><p><LessonText>{lesson.experiment}</LessonText></p></div>
        <Checkpoint key={lesson.id} lesson={lesson} saved={progress[lesson.id] || {}} onSave={value=>setProgress(p=>({...p,[lesson.id]:value}))} />
        <div className="ml-next"><button disabled={lessonIndex===0} onClick={()=>setLessonIndex(i=>i-1)}>← Previous</button><button onClick={()=>lessonIndex<lessons.length-1 ? setLessonIndex(i=>i+1) : setTab('code')}>{lessonIndex<lessons.length-1?'Next lesson →':'Implement it →'}</button></div>
        <details className="ml-sources"><summary>References & content scope</summary><p>Original lessons for this lab. Further reading and checks against established treatments:</p>{sources.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a></p>)}<p>Scope: one-feature, unregularized linear regression with an intercept. These lessons and exercises do not cover the full ML engineering curriculum.</p></details>
      </article>
      <section ref={playgroundRef} className="ml-playground" aria-label="Regression playground"><div className="ml-panel-heading"><div><span className="ml-eyebrow">Live experiment</span><h2>Fit. Inspect. Understand.</h2></div><span className="ml-pill">{imported?'Your CSV':'Synthetic data'}</span></div>
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
      </section>
    </div>}
    {tab==='code' && <main className="ml-code-layout"><section><span className="ml-eyebrow">From equation to implementation</span><h2>You write the learning algorithm.</h2><p>Implement prediction, MSE, the gradient, and a training loop. Inputs are one-dimensional NumPy arrays. Start with the lesson examples, then run the independent checks.</p><ol><li>Prediction: apply the same line equation to every x.</li><li>Loss: return one scalar, the average squared error.</li><li>Gradient: return two scalars, <code>(dw, db)</code>.</li><li>Training: initialize at zero; apply simultaneous updates; return <code>(w, b)</code>.</li></ol><details><summary>Hint 1 · NumPy operations</summary><p>Array multiplication and subtraction act elementwise. <code>np.mean</code> adds values and divides by the number of entries. Do not reshape these one-dimensional exercise inputs.</p></details><details><summary>Hint 2 · Gradient and training</summary><p>Compute error once. Weight sensitivity averages twice error times x. Bias sensitivity averages twice error. Save both derivatives before updating either parameter.</p></details><button onClick={()=>setShowSolution(s=>!s)}>{showSolution?'Hide':'Reveal'} explained solution</button>{showSolution && <><StaticCodeBlock language="python" code={solution} /><p>The two gradient variables are computed before either assignment, so the update is simultaneous. There is no fitting library inside the loop.</p></>}
      <h3>What the checks establish</h3><p>Prediction shape and values, MSE, gradients against finite differences, convergence on a known line, a single simultaneous update, and behavior with zero steps. Passing these checks is evidence about these behaviors, not proof of all possible inputs.</p><details><summary>Inspect the exact checks</summary><StaticCodeBlock language="python" code={checks} /></details><p>Python runs in an isolated worker. The first run downloads Python and NumPy; Stop can terminate an infinite loop. This workspace has a 90-second execution limit.</p></section>
      <section><h2 className="ml-editor-title">Implement it yourself</h2><PythonEditor code={code} onChange={setCode} /><div className="ml-actions"><button className="ml-primary" disabled={busy} onClick={runPython}>{busy?'Running…':'Run exercise checks'}</button>{busy && <button onClick={stopPython}>Stop Python</button>}<button onClick={()=>download('my-regression.py',code)}>Download my code</button></div><p role="status">{pythonStatus}</p><pre className="ml-output" aria-label="Python output">{output}</pre></section></main>}
    {tab==='path' && <LearningPath progress={progress} lessonIndex={lessonIndex} onLesson={index=>{setLessonIndex(index);setTab('learn')}} onCode={()=>setTab('code')} />}
  </div>
}
