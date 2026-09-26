import React, { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import LessonText from '../LessonText.jsx'
import { setupOpenCalcMonaco } from '../../../utils/monacoThemes.js'
import { useGlobalTheme } from '../../../context/ThemeContext.jsx'
import { getCodeFontFamily, getCodeFontSize } from '../../../components/ui/CodeSettingsModal.jsx'
import * as runtime from './runtime.js'
import { loadDraft, saveDraft, rebaseDraft, clearDraft, summarizeDraft, getSession, setSession } from './drafts.js'

// A lesson's runnable cells. The learner's code is the source of truth: it is saved as a draft
// on every edit and is what "Download" and "Copy to Notebook Lab" export. Python runs in a
// worker (runtime.js), so Stop always works; cells of one notebook share variables.

const NOTEBOOK_LAB_KEY = 'oc-notebook-lab'
const emptySession = n => ({ outputs: Array(n).fill(null), counts: Array(n).fill(null), ranCode: Array(n).fill(null), counter: 0, generation: null, reset: false })

// Plain-language guidance next to an ordinary Python traceback. Never replaces it.
// Alt text for a matplotlib image: the worker's description of the figure (titles, axis labels,
// legend, what each panel contains), or a plain label when it could not describe it.
export function figureAlt(out, k, index) {
  const about = out.figureAlts?.[k]
  return `Figure ${k + 1} from cell ${index + 1}${about ? `: ${about}` : ' (no description available)'}`
}

export function errorHint(result) {
  if (result.stopped) return 'Stopped. Python restarted, so variables from earlier cells are gone. Your code is kept.'
  if (result.runtimeError) return 'Python itself could not run (often a network problem while downloading Python or a package). Check your connection and run the cell again.'
  const { ename, evalue = '' } = result
  if (ename === 'NameError') return `Python does not know ${evalue.match(/'([^']+)'/)?.[1] ?? 'that name'} yet. Check the spelling, or run the cells above first — after Stop or Restart, earlier variables are gone. “Run all” runs every cell in order.`
  if (ename === 'SyntaxError' || ename === 'IndentationError') return 'Python could not read this cell. Look at the line the traceback points to: a missing bracket, colon or quote, or inconsistent indentation.'
  if (ename === 'ModuleNotFoundError') return 'That package is not available in the browser’s Python. The lessons use numpy, pandas, scikit-learn, scipy and matplotlib.'
  if (ename === 'ValueError' && /broadcast/.test(evalue)) return 'Two arrays have shapes NumPy cannot line up. Print both shapes just before this line.'
  if (ename === 'TypeError') return 'An operation received a kind of value it cannot handle — for example a list where an array was expected, or text where a number was expected.'
  if (ename === 'AssertionError') return 'An assert failed: the condition it checks is false for these values. That is a signal, not a crash — read what it was checking.'
  return null
}

// Outputs are exported as the app showed them (printed text, the final expression's value,
// figures, errors) with their run numbers, but only for cells whose code has not been edited since
// that run, so an output is never attributed to code that did not produce it. Python variables are
// not saved: the reader re-runs the notebook to recreate them.
const lines = text => text.split(/(?<=\n)/)
export function toIpynb(notebook, codes, session) {
  const md = text => ({ cell_type: 'markdown', metadata: {}, source: lines(text) })
  const cells = [md(`# ${notebook.title}\n\n${notebook.intro ?? ''}\n\n*Exported from the ML Lab. Outputs are from your last run in the app; Python variables are not saved, so run the cells in order to recreate them.*`)]
  notebook.cells.forEach((c, i) => {
    if (c.title || c.prose) cells.push(md(`### ${c.title ?? ''}\n\n${c.prose ?? ''}`))
    const out = session?.outputs?.[i], count = session?.counts?.[i] ?? null
    const current = out && !out.running && session.ranCode?.[i] === codes[i]
    const outputs = []
    if (current) {
      if (out.text) outputs.push({ output_type: 'stream', name: 'stdout', text: lines(out.text) })
      if (out.value != null) outputs.push({ output_type: 'execute_result', execution_count: count, data: { 'text/plain': lines(out.value) }, metadata: {} })
      out.figures?.forEach((png, k) => outputs.push({ output_type: 'display_data', data: { 'image/png': png, 'text/plain': [out.figureAlts?.[k] ? `<Figure ${k + 1}: ${out.figureAlts[k]}>` : `<Figure ${k + 1}>`] }, metadata: {} }))
      if (out.error && !out.error.stopped) outputs.push({ output_type: 'error', ename: out.error.ename ?? 'Error', evalue: out.error.evalue ?? '', traceback: (out.error.traceback || `${out.error.ename}: ${out.error.evalue}`).split('\n') })
    }
    cells.push({ cell_type: 'code', metadata: {}, execution_count: current ? count : null, source: lines(codes[i]), outputs })
  })
  return JSON.stringify({ nbformat: 4, nbformat_minor: 4, metadata: { kernelspec: { name: 'python3', display_name: 'Python 3', language: 'python' }, language_info: { name: 'python' } }, cells }, null, 1)
}

function download(name, body) {
  const url = URL.createObjectURL(new Blob([body], { type: 'application/x-ipynb+json' })), a = document.createElement('a')
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function copyToNotebookLab(notebook, codes) {
  const id = `nb-ml-${Date.now()}`
  const nb = { id, name: notebook.title, createdAt: Date.now(), updatedAt: Date.now(), cells: notebook.cells.map((c, i) => ({ id: `cell-${i + 1}`, cellTitle: c.title ?? '', prose: c.prose ?? '', instructions: '', code: codes[i], output: '', status: 'idle', figureJson: null })) }
  try { const db = JSON.parse(localStorage.getItem(NOTEBOOK_LAB_KEY) ?? '{}'); db[id] = nb; localStorage.setItem(NOTEBOOK_LAB_KEY, JSON.stringify(db)); return true } catch { return false }
}

export function CellEditor({ code, onChange, onRun, label }) {
  const { themeStyles, isDarkGlobal, codeTypography } = useGlobalTheme()
  const runRef = useRef(onRun)
  runRef.current = onRun
  const lines = Math.max(3, code.split('\n').length)
  return <div className="ml-nb-editor">
    <Editor
      height={`${Math.min(480, lines * 19 + 24)}px`}
      language="python"
      value={code}
      onChange={value => onChange(value ?? '')}
      beforeMount={setupOpenCalcMonaco}
      onMount={(editor, monaco) => editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => runRef.current())}
      theme={themeStyles?.monaco ?? (isDarkGlobal ? 'open-calc-dark' : 'open-calc-light')}
      loading={<pre className="ml-nb-fallback">{code}</pre>}
      options={{
        ariaLabel: label,
        fontFamily: getCodeFontFamily(codeTypography?.font),
        fontSize: parseInt(getCodeFontSize(codeTypography?.fontSize), 10),
        minimap: { enabled: false }, lineNumbers: 'on', tabSize: 4, insertSpaces: true,
        automaticLayout: true, scrollBeyondLastLine: false, wordWrap: 'on',
        padding: { top: 8, bottom: 8 }, scrollbar: { alwaysConsumeMouseWheel: false },
      }}
    />
  </div>
}

function Output({ out, index }) {
  if (!out) return null
  const hint = out.error ? errorHint(out.error) : null
  return <div className="ml-nb-output" aria-live="polite">
    {out.text && <pre>{out.text}</pre>}
    {out.value != null && <pre className="ml-nb-value">{out.value}</pre>}
    {out.error && !out.error.stopped && <pre className="ml-nb-error">{out.error.traceback || `${out.error.ename}: ${out.error.evalue}`}</pre>}
    {hint && <p className="ml-nb-hint">{hint}</p>}
    {out.figures?.map((png, k) => <figure key={k} className="ml-nb-figure">
      <img src={`data:image/png;base64,${png}`} alt={figureAlt(out, k, index)} />
      <figcaption className="ml-caption">Static image from matplotlib (it cannot be zoomed or hovered).{out.figureAlts?.[k] ? ` ${out.figureAlts[k]}` : ''}</figcaption>
    </figure>)}
  </div>
}

// The notebook's state — drafts, outputs, run queue — as one hook, so a lesson can show its
// cells one at a time beside the paragraphs they illustrate and still behave as a single
// notebook: same drafts, same variables, same run counter.
export function useNotebook(id, notebook) {
  const originals = notebook.cells.map(c => c.code)
  const [draft, setDraft] = useState(() => loadDraft(id, originals))
  const [session, setSessionState] = useState(() => getSession(id) ?? emptySession(originals.length))
  const [rt, setRt] = useState(null), [pending, setPending] = useState([]), [notice, setNotice] = useState('')
  const codes = draft.codes, codesRef = useRef(codes), draftRef = useRef(draft), mounted = useRef(true)
  codesRef.current = codes
  draftRef.current = draft
  useEffect(() => { mounted.current = true; const off = runtime.subscribe(setRt); return () => { mounted.current = false; off() } }, [])
  // The session store, not component state, is the source of truth: a run that finishes after
  // the learner hides the notebook or moves to another lesson still records its output.
  const updateSession = fn => {
    const next = fn(getSession(id) ?? emptySession(originals.length))
    setSession(id, next)
    if (mounted.current) setSessionState(next)
  }
  const setPendingSafe = fn => { if (mounted.current) setPending(fn) }

  const setCode = (i, code) => {
    const next = codesRef.current.map((c, k) => k === i ? code : c)
    codesRef.current = next
    // Undoing a cell back to the lesson's code also drops what that cell's edit was based on.
    const { bases, orphans } = draftRef.current
    const nextBases = bases.map((b, k) => k === i && code === originals[k] ? null : b)
    const saved = saveDraft(id, originals, next, { bases: nextBases, orphans })
    const nextDraft = summarizeDraft(next, nextBases, orphans, originals)
    draftRef.current = nextDraft
    setDraft(nextDraft)
    setNotice(saved ? '' : 'Could not save your edits on this device (storage is full or blocked). Download the notebook to keep them.')
  }

  // Runs cells in order; stops at the first error or when Python is stopped.
  const runCells = async indices => {
    setPendingSafe(indices)
    for (const i of indices) {
      let text = ''
      updateSession(s => ({ ...s, outputs: s.outputs.map((o, k) => k === i ? { text: '', running: true } : o) }))
      const code = codesRef.current[i]              // the latest edit, even during "Run all"
      const result = await runtime.run(id, code, { onStream: (_, chunk) => { text += chunk + '\n'; updateSession(s => ({ ...s, outputs: s.outputs.map((o, k) => k === i ? { ...o, text } : o) })) } })
      updateSession(s => {
        const counter = result.ok || !result.stopped ? s.counter + 1 : s.counter
        return {
          // Only a run that completed proves which Python session holds this notebook's variables.
          ...s, counter, generation: result.stopped ? s.generation : result.generation, reset: result.stopped ? s.reset : false,
          outputs: s.outputs.map((o, k) => k === i ? { text, value: result.value, error: result.ok ? null : result, figures: result.figures ?? [], figureAlts: result.figureAlts ?? [] } : o),
          counts: s.counts.map((c, k) => k === i ? (result.stopped ? null : counter) : c),
          ranCode: s.ranCode.map((c, k) => k === i ? code : c),
        }
      })
      setPendingSafe(p => p.filter(k => k !== i))
      if (!result.ok) { setPendingSafe(() => []); break }
    }
  }

  const restart = () => { runtime.resetNamespace(id); updateSession(s => ({ ...s, counts: s.counts.map(() => null), reset: true })) }
  const resetAll = () => {
    if (!(window.confirm?.('Replace every cell in this notebook with the original lesson code? Your edits to this notebook will be lost; other notebooks are not affected.') ?? true)) return
    clearDraft(id); setDraft(summarizeDraft([...originals], originals.map(() => null), [], originals)); setNotice('Restored the original cells.')
  }
  // Keep the learner's code in the cells, accepting the updated lesson as its new base.
  const keepMine = () => {
    const { orphans } = draftRef.current
    rebaseDraft(id, originals, codes, { orphans })
    setDraft(summarizeDraft(codes, codes.map((c, k) => c !== originals[k] ? originals[k] : null), orphans, originals))
  }
  // Edits that no longer match any cell are shown to the learner; this lets them let go of them.
  const discardOrphans = () => {
    const { bases } = draftRef.current
    saveDraft(id, originals, codes, { bases, orphans: [] })
    setDraft(summarizeDraft(codes, bases, [], originals))
  }

  const everRan = session.counts.some(c => c != null) || session.generation != null
  const variablesLost = session.reset || (session.generation != null && rt && rt.generation !== session.generation)
  // Cells above i that have not run in the current Python session (their variables may be missing).
  const missingBefore = i => codes.slice(0, i).map((_, k) => k).filter(k => session.counts[k] == null || variablesLost)
  return { id, notebook, originals, codes, draft, session, rt, pending, notice, setNotice, setCode, runCells, restart, resetAll, keepMine, discardOrphans, everRan, variablesLost, missingBefore, busy: pending.length > 0 }
}

export function NotebookToolbar({ nb }) {
  const { id, notebook, codes, session, rt, draft, notice, busy, everRan, variablesLost } = nb
  return <>
    <div className="ml-actions ml-nb-toolbar">
      <button className="ml-primary" disabled={busy} onClick={() => nb.runCells(codes.map((_, i) => i))}>Run all</button>
      <button disabled={!rt?.busy} onClick={() => runtime.stop()}>Stop</button>
      <button disabled={busy} onClick={nb.restart} title="Forget this notebook’s variables; keep the code">Restart Python for this notebook</button>
      <button onClick={() => download(`${id}.ipynb`, toIpynb(notebook, codes, session))}>Download my notebook (.ipynb)</button>
      <button onClick={() => { const ok = copyToNotebookLab(notebook, codes); nb.setNotice(ok ? `Copied your version — edits included — to Notebook Lab as “${notebook.title}”.` : 'Could not save to this browser’s storage.'); if (ok) window.open('#/notebook-lab', '_blank', 'noopener') }}>Copy my version to Notebook Lab ↗</button>
      {draft.edited && <button onClick={nb.resetAll}>Reset to the original cells</button>}
    </div>
    <p className="ml-caption" role="status">
      {rt?.state === 'loading' || rt?.state === 'running' ? rt.text : variablesLost ? `${rt?.state === 'idle' ? 'Python was shut down to free memory' : 'Python was restarted'} since this notebook last ran, so its variables are gone (your code is kept). Use “Run all”, or run the cells from the top.` : everRan ? 'Cells in this notebook share variables, like a Jupyter notebook. Other lessons’ notebooks cannot see them.' : rt?.text}
      {' '}Shift + Enter runs the cell you are editing. In an editor, press Ctrl + M to let Tab move focus out.
    </p>
    {draft.bases.some((b, i) => b !== null && b !== nb.originals[i] && codes[i] !== nb.originals[i]) && <p className="ml-warning" role="status">This lesson’s notebook has been updated since you edited it. Your version is kept. <button onClick={nb.keepMine}>Keep my version</button> <button onClick={nb.resetAll}>Use the updated version</button></p>}
    {draft.orphans.length > 0 && <div className="ml-warning" role="status">
      <p>This lesson’s notebook has been updated, and {draft.orphans.length === 1 ? 'one of your earlier edits no longer matches' : `${draft.orphans.length} of your earlier edits no longer match`} any cell, so {draft.orphans.length === 1 ? 'it is' : 'they are'} not shown in the notebook. Copy anything you want to keep. <button onClick={nb.discardOrphans}>Discard {draft.orphans.length === 1 ? 'it' : 'them'}</button></p>
      {draft.orphans.map((o, k) => <details key={k}><summary>Earlier edit {k + 1}</summary><pre>{o.code}</pre></details>)}
    </div>}
    {notice && <p className="ml-caption" role="status">{notice}</p>}
  </>
}

// One cell. `inline` cells sit inside the lesson text, so they offer to run the cells above first
// (they share variables) instead of failing with a NameError.
export function NotebookCell({ nb, i, inline = false }) {
  const { notebook, codes, originals, session, rt, pending, busy } = nb, cell = notebook.cells[i]
  const edited = codes[i] !== originals[i], stale = session.ranCode[i] != null && session.ranCode[i] !== codes[i]
  const state = pending[0] === i && rt?.busy ? 'running' : pending.includes(i) ? 'queued' : null
  const before = inline ? nb.missingBefore(i) : []
  return <section className={`ml-nb-cell${inline ? ' ml-nb-inline' : ''}`} aria-label={`Cell ${i + 1}${cell.title ? `: ${cell.title}` : ''}`}>
    {inline && <span className="ml-eyebrow">Run it · cell {i + 1} of {notebook.cells.length}</span>}
    {cell.title && <h4>{cell.title}</h4>}
    {cell.prose && <p><LessonText>{cell.prose}</LessonText></p>}
    <div className="ml-nb-cellbar">
      <span className="ml-nb-count" aria-label={session.counts[i] ? `Run number ${session.counts[i]}` : 'Not run'}>[{state === 'running' ? '*' : session.counts[i] ?? ' '}]</span>
      <button disabled={busy} className={inline ? 'ml-primary' : undefined} onClick={() => nb.runCells(before.length ? [...before, i] : [i])}>{before.length ? `Run cells ${before.map(k => k + 1).join(', ')} and this one` : 'Run cell'}</button>
      {state && <span className="ml-caption">{state === 'running' ? 'Running…' : 'Waiting to run'}</span>}
      {stale && <span className="ml-nb-badge">edited since it ran</span>}
      {edited && <button onClick={() => nb.setCode(i, originals[i])}>Undo my edits to this cell</button>}
      {cell.showRestart && <button disabled={busy} onClick={nb.restart} title="Forget this notebook’s variables; keep the code">Restart Python for this notebook</button>}
    </div>
    <CellEditor code={codes[i]} onChange={v => nb.setCode(i, v)} onRun={() => !busy && nb.runCells(before.length ? [...before, i] : [i])} label={`Notebook cell ${i + 1} code`} />
    <Output out={session.outputs[i]} index={i} />
    {inline && cell.tryThis && <p className="ml-nb-try"><strong>Try this:</strong> <LessonText>{cell.tryThis}</LessonText></p>}
  </section>
}

export default function LessonNotebook({ id, notebook, nb: shared }) {
  const own = useNotebook(id, notebook)
  const nb = shared ?? own
  return <div className="ml-nb" data-notebook={id}>
    <NotebookToolbar nb={nb} />
    {notebook.cells.map((_, i) => <NotebookCell key={i} nb={nb} i={i} />)}
  </div>
}
