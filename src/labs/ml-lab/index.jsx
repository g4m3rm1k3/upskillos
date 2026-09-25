import React, { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { labs, labByNumber, labForLesson } from './labs/index.js'
import { roadmap } from './roadmap.js'
import './ml.css'
import { useGlobalTheme, getFontFamily, getFontSize, getLineHeight } from '../../context/ThemeContext.jsx'
import { STUDIO_THEMES } from '../../utils/studioThemes.js'
import StaticCodeBlock from '../../components/markdown/StaticCodeBlock.jsx'
import LessonText from './LessonText.jsx'
import Derivation from './Derivation.jsx'
import { MathCode, NotebookCells, MathLinks } from './LessonMath.jsx'
import PythonEditor from './PythonEditor.jsx'
import LearningPath from './LearningPath.jsx'
import Checkpoint from './Checkpoint.jsx'
import JumpIn from './JumpIn.jsx'
import { jumpIns } from './jumpIn.js'
const LessonFlow = lazy(() => import('./LessonFlow.jsx'))

const STORE = 'upskillos.ml-lab.v1'
const allLabs = roadmap.flatMap(phase => phase.labs.map(lab => ({ ...lab, phase })))
function readSaved() { try { return JSON.parse(localStorage.getItem(STORE)) || {} } catch { return {} } }
function download(name, body, type='text/plain') {
  const url=URL.createObjectURL(new Blob([body],{type})), a=document.createElement('a')
  a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function Notebook({ lab, journal, setJournal, progress }) {
  return <details open className="ml-notebook"><summary>Experiment notebook</summary>
    <label className="ml-reflection">Prediction → observation → explanation<textarea value={journal} onChange={e=>setJournal(e.target.value)} placeholder="I predict… I changed… I observed… I think this happened because…" /></label>
    <div className="ml-actions"><button onClick={()=>download(`ml-lab-${String(lab.number).padStart(2,'0')}-notes.json`,JSON.stringify({lab:lab.number,exportedAt:new Date().toISOString(),journal,checkpoints:Object.fromEntries(lab.lessons.map(l=>[l.id,progress[l.id]||{}]))},null,2),'application/json')}>Export notes & checkpoints</button></div>
    <p className="ml-caption">Your notebook saves on this device. Experiment settings last for this session; record the seed and settings you used so a run can be reproduced.</p>
  </details>
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
  const [saved]=useState(readSaved), [progress,setProgress]=useState(saved.progress || {})
  // Lab 01 predates per-lab storage: its notes and code keep their original keys.
  const [journals,setJournals]=useState(()=>({...(saved.journals||{}),1:saved.journals?.[1] ?? saved.journal ?? ''}))
  const [codes,setCodes]=useState(()=>({...(saved.codes||{}),...(saved.code!==undefined?{1:saved.code}:{})}))
  const [labNumber,setLabNumber]=useState(()=>labForLesson(saved.lessonId)?.number ?? 1)
  const lab=labByNumber(labNumber), lessons=lab.lessons, plan=allLabs.find(l=>l.number===lab.number)
  const [lessonIndex,setLessonIndex]=useState(()=>Math.max(0,lessons.findIndex(l=>l.id===saved.lessonId)))
  const [storageError,setStorageError]=useState(''), [tab,setTab]=useState('learn'), [returnTo,setReturnTo]=useState(null)
  const [output,setOutput]=useState('Implement the functions, then run the checks.'), [busy,setBusy]=useState(false), [pythonStatus,setPythonStatus]=useState(''), [showSolution,setShowSolution]=useState(false)
  const worker=useRef(null), timer=useRef(null), playgroundRef=useRef(null), rootRef=useRef(null)
  const lesson=lessons[Math.min(lessonIndex,lessons.length-1)], code=codes[lab.number] ?? lab.python.starter, journal=journals[lab.number] ?? ''
  const setCode=value=>setCodes(c=>({...c,[lab.number]:value})), setJournal=value=>setJournals(j=>({...j,[lab.number]:value}))
  useEffect(()=>{try {localStorage.setItem(STORE,JSON.stringify({progress,journal:journals[1]??'',code:codes[1]??labByNumber(1).python.starter,journals,codes,lessonId:lesson.id}));setStorageError('')} catch {setStorageError('Device storage is unavailable. Export your notes before leaving.')}},[progress,journals,codes,lesson.id])
  useEffect(()=>()=>{worker.current?.terminate();clearTimeout(timer.current)},[])
  const stopWorker=()=>{worker.current?.terminate();worker.current=null;clearTimeout(timer.current);setBusy(false)}
  const openLab=(number,index=0,nextTab='learn',back=null)=>{stopWorker();setReturnTo(back);setLabNumber(number);setLessonIndex(index);setTab(nextTab);setShowSolution(false);setPythonStatus('');setOutput('Implement the functions, then run the checks.')}
  const stopPython=()=>{stopWorker();setPythonStatus('Stopped');setOutput(o=>o+'\nExecution stopped. You can edit and retry.')}
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
      const limit=lab.python.timeout??90
      timer.current=setTimeout(()=>{instance.terminate();setBusy(false);setPythonStatus('Time limit reached');setOutput(o=>o+`\nStopped after ${limit} seconds. Check for an infinite loop or retry if the runtime download was slow.`)},limit*1000)
      instance.postMessage({code,checks:lab.python.checks,packages:lab.python.packages||['numpy']})
    } catch(error){setBusy(false);setPythonStatus('Could not start Python');setOutput(String(error))}
  }
  const py=lab.python, Playground=lab.Playground, n2=String(lab.number).padStart(2,'0')
  const prevLab=labs[labs.indexOf(lab)-1], nextLab=labs[labs.indexOf(lab)+1]
  return <div ref={rootRef} className="ml-lab" style={themeVariables}>
    <header className="ml-header"><div className="ml-brand"><button className="ml-back" onClick={()=>onBack ? onBack() : window.history.back()} aria-label="Back to labs">←</button><div><span className="ml-eyebrow">UpSkillOS / {plan.phase.optional?'Optional specialization':plan.phase.title}</span><h1>Machine Learning Lab <span>{n2}</span></h1><p className="ml-lab-title">{plan.title}</p></div></div>
      <div className="ml-lab-switch"><button disabled={!prevLab} onClick={()=>openLab(prevLab.number)} aria-label="Previous lab">←</button><label><span className="ml-eyebrow">Lab</span><select aria-label="Choose lab" value={lab.number} onChange={e=>openLab(Number(e.target.value))}>{labs.map(l=><option key={l.number} value={l.number}>{String(l.number).padStart(2,'0')} · {allLabs.find(p=>p.number===l.number).title}</option>)}</select></label><button disabled={!nextLab} onClick={()=>openLab(nextLab.number)} aria-label="Next lab">→</button></div></header>
    <nav className="ml-tabs" aria-label="ML workspace">{[['learn','Learn & experiment'],['code','Implement in Python'],['path','Your learning path']].map(([id,label])=><button key={id} aria-current={tab===id?'page':undefined} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}<span>{lessons.filter(l=>progress[l.id]?.passed).length}/{lessons.length} checkpoints</span></nav>
    {storageError && <p className="ml-warning" role="alert">{storageError}</p>}
    {returnTo && returnTo.number!==lab.number && <p className="ml-return" role="note">Reviewing a prerequisite. <button onClick={()=>{openLab(returnTo.number,returnTo.index);rootRef.current?.scrollTo?.({top:0})}}>← Back to Lab {String(returnTo.number).padStart(2,'0')}</button></p>}
    {tab==='learn' && <div className="ml-layout">
      <aside className="ml-syllabus"><span className="ml-eyebrow">Module {n2} / {lab.short}</span><h2>{lab.question}</h2><p>{lab.intro}</p>
        <nav aria-label="Lessons">{lessons.map((l,i)=><button key={l.id} className={i===lessonIndex?'selected':''} aria-current={i===lessonIndex?'step':undefined} onClick={()=>setLessonIndex(i)}><span>{l.title}</span>{progress[l.id]?.passed && <span aria-label="Checkpoint passed">✓</span>}</button>)}</nav>
        <div className="ml-side-note">The goal is not to finish the page.<br/>It is to explain what changed—and why.</div>
      </aside>
      <article className="ml-lesson"><span className="ml-eyebrow">Understand → derive → test → explain</span><h2>{lesson.title.slice(lesson.title.indexOf('·')+2)}</h2><p className="ml-objective">You will be able to: <LessonText>{lesson.skill}</LessonText></p><p className="ml-prereq"><strong>Before you start:</strong> <LessonText>{lesson.prerequisite}</LessonText></p><MathLinks key={`m-${lesson.id}`} lessonKeys={lesson.math} labKeys={lab.math} /><button className="ml-jump" onClick={()=>playgroundRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}>Jump to live experiment ↓</button>
        <JumpIn key={`j-${lab.number}`} lab={lab} jumpIn={jumpIns[lab.number]} onReview={(number,index)=>{openLab(number,index,'learn',{number:lab.number,index:lessonIndex});rootRef.current?.scrollTo?.({top:0})}} />
        {(() => {
          const prose = <div className="ml-reading">{lesson.paragraphs.map((p,i)=><section className="ml-reading-section" key={i}><h3><LessonText>{lesson.sections?.[i] || `Step ${i+1}`}</LessonText></h3><p><LessonText>{p}</LessonText></p></section>)}</div>
          const renderMath = () => <div className="ml-equation"><span className="ml-eyebrow">Math ↔ code</span>{lesson.formulaTex ? <div className="ml-formula-tex"><LessonText>{lesson.formulaTex}</LessonText></div> : <div>{lesson.formula}</div>}<MathCode mathCode={lesson.mathCode} /></div>
          const renderDerivation = () => lesson.derivation ? <Derivation key={`d-${lesson.id}`} derivation={lesson.derivation} saved={progress[lesson.id] || {}} onSave={value=>setProgress(p=>({...p,[lesson.id]:value}))} /> : null
          if (lesson.blocks) return <Suspense fallback={prose}><LessonFlow key={`f-${lesson.id}`} lab={lab} lesson={lesson} saved={progress[lesson.id] || {}} onSave={value=>setProgress(p=>({...p,[lesson.id]:value}))} renderMath={renderMath} renderDerivation={renderDerivation} /></Suspense>
          return <>{prose}{renderMath()}{renderDerivation()}<NotebookCells key={`n-${lesson.id}`} id={lesson.id} notebook={lesson.notebook} /></>
        })()}
        <div className="ml-experiment"><span className="ml-eyebrow">Predict before you run</span><p><LessonText>{lesson.experiment}</LessonText></p></div>
        <Checkpoint key={lesson.id} lesson={lesson} saved={progress[lesson.id] || {}} onSave={value=>setProgress(p=>({...p,[lesson.id]:value}))} />
        <div className="ml-next"><button disabled={lessonIndex===0} onClick={()=>setLessonIndex(i=>i-1)}>← Previous</button><button onClick={()=>lessonIndex<lessons.length-1 ? setLessonIndex(i=>i+1) : setTab('code')}>{lessonIndex<lessons.length-1?'Next lesson →':'Implement it →'}</button></div>
        <details className="ml-sources"><summary>References & content scope</summary><p>Original lessons for this lab. Further reading and checks against established treatments:</p>{lab.sources.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a></p>)}<p>Scope: {lab.scope}</p></details>
      </article>
      <section ref={playgroundRef} className="ml-playground" aria-label={`Lab ${n2} playground`}>
        <div className="ml-scope" role="note">{lab.lessonAware
          ? <p><strong>This experiment changes with the lesson you are reading.</strong> It now shows the part for {lesson.title}{/[.?!]$/.test(lesson.title) ? '' : '.'}</p>
          : <><p><strong>One experiment for the whole lab.</strong> All {lessons.length} lessons of Lab {n2} use this same panel; each lesson asks you to try something different in it.{lab.viewPerLesson && ' It has opened the view this lesson uses — you can still switch.'}</p><p><span className="ml-eyebrow">For {lesson.title.slice(0, lesson.title.indexOf('·')).trim()}</span> <LessonText>{lesson.experiment}</LessonText></p></>}</div>
        <Suspense fallback={<p className="ml-caption" role="status">Loading the experiment…</p>}><Playground key={lab.number} journal={journal} setJournal={setJournal} progress={progress} lesson={lesson} /></Suspense>
        {!lab.ownNotebook && <Notebook lab={lab} journal={journal} setJournal={setJournal} progress={progress} />}
      </section>
    </div>}
    {tab==='code' && <main className="ml-code-layout"><section><span className="ml-eyebrow">From equation to implementation</span><h2>{py.title}</h2><p><LessonText>{py.intro}</LessonText></p><ol>{py.steps.map((s,i)=><li key={i}><LessonText>{s}</LessonText></li>)}</ol>{py.hints.map(([title,text],i)=><details key={title}><summary>Hint {i+1} · {title}</summary><p><LessonText>{text}</LessonText></p></details>)}<button onClick={()=>setShowSolution(s=>!s)}>{showSolution?'Hide':'Reveal'} explained solution</button>{showSolution && <><StaticCodeBlock language="python" code={py.solution} /><p><LessonText>{py.solutionNote}</LessonText></p></>}
      <h3>What the checks establish</h3><p><LessonText>{py.checkSummary}</LessonText></p><details><summary>Inspect the exact checks</summary><StaticCodeBlock language="python" code={py.checks} /></details><p>Python runs in an isolated worker. The first run downloads Python and {(py.packages||['numpy']).map(p=>({numpy:'NumPy',pandas:'pandas','scikit-learn':'scikit-learn',scipy:'SciPy'})[p]||p).join(', ')}; Stop can terminate an infinite loop. This workspace has a {py.timeout ?? 90}-second execution limit.</p>{py.local && <div className="ml-experiment"><span className="ml-eyebrow">Run on your own machine</span><p><LessonText>{py.local.note}</LessonText></p><details><summary>{py.local.filename}</summary><StaticCodeBlock language="python" code={py.local.code} /></details><button onClick={()=>download(py.local.filename,py.local.code)}>Download {py.local.filename}</button></div>}</section>
      <section><h2 className="ml-editor-title">Implement it yourself</h2><PythonEditor code={code} onChange={setCode} filename={py.filename} packages={py.packages} /><div className="ml-actions"><button className="ml-primary" disabled={busy} onClick={runPython}>{busy?'Running…':'Run exercise checks'}</button>{busy && <button onClick={stopPython}>Stop Python</button>}<button onClick={()=>download(py.filename,code)}>Download my code</button><button onClick={()=>{if(window.confirm?.('Replace your code with the original starter?') ?? true)setCode(py.starter)}}>Restore starter</button></div><p role="status">{pythonStatus}</p><pre className="ml-output" aria-label="Python output">{output}</pre></section></main>}
    {tab==='path' && <LearningPath progress={progress} currentLab={lab} lessonIndex={lessonIndex} onOpen={openLab} />}
  </div>
}
