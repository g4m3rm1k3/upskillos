import { useCallback, useEffect, useRef, useState } from 'react'
import { runPythonInline } from '../../utils/inlineRunner.js'

// One runnable Python cell in the Greek letters reference (cells: src/reference/greek-letters-cells.js).
// It runs in the browser's shared Pyodide, the same one every Python cell in the app uses.
// The expected answer is the one its worked example states; after a run the cell says
// whether the output contains it.

// Pyodide has one stdout, so runs must not overlap: each waits for the one before.
let queue = Promise.resolve()
let pythonStarted = false

export function runQueued(code, onLine) {
  const run = queue.then(() => runPythonInline(code, onLine))
  queue = run.catch(() => {})
  return run
}

export default function GreekCell({ cellKey, cell, register, onResult }) {
  const [code, setCode] = useState(cell.code)
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [lines, setLines] = useState([])
  const [status, setStatus] = useState(null)   // null | 'match' | 'mismatch' | 'error'
  const codeRef = useRef(code)
  codeRef.current = code

  const run = useCallback(async () => {
    setOpen(true)
    setRunning(true)
    const out = []
    const first = !pythonStarted
    setLines(first ? [{ type: 'note', text: 'Starting Python in your browser (the first run takes a few seconds)…' }] : [])
    let result
    try {
      result = await runQueued(codeRef.current, line => { out.push(line); setLines([...out]) })
      pythonStarted = true
    } catch (error) {
      result = { error: String(error?.message ?? error) }
    }
    if (result.error) out.push({ type: 'error', text: result.error.split('\n').filter(Boolean).slice(-3).join('\n') })
    setLines([...out])
    const text = out.filter(l => l.type === 'output').map(l => l.text).join('\n')
    const next = result.error ? 'error' : text.includes(cell.expect) ? 'match' : 'mismatch'
    setStatus(next)
    setRunning(false)
    onResult?.(cellKey, { status: next, output: text })
    return next
  }, [cell.expect, cellKey, onResult])

  useEffect(() => register?.(cellKey, run), [register, cellKey, run])

  const edited = code !== cell.code
  return (
    <div id={`greek-cell-${cellKey.replace(':', '-')}`} className="mt-3 rounded-lg border border-sky-900/50 bg-[#08101c] overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-sky-950/40">
        <span className="text-[9px] font-black uppercase tracking-widest text-sky-300/80">Python</span>
        <button onClick={run} disabled={running} className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white">
          {running ? 'Running…' : status ? 'Run again' : 'Run'}
        </button>
        <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="text-[11px] text-sky-300 hover:text-sky-100">
          {open ? 'Hide code' : 'Show code'}
        </button>
        {status === 'match' && <span className="text-[11px] text-emerald-300">✓ printed {edited ? 'the original answer' : "the example's answer"}</span>}
        {status === 'mismatch' && <span className="text-[11px] text-amber-300">✗ didn't print "{cell.expect}"{edited ? ' (you edited the code)' : ''}</span>}
        {status === 'error' && <span className="text-[11px] text-rose-300">✗ stopped with an error</span>}
      </div>
      {open && (
        <div className="p-3 space-y-2">
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            spellCheck={false}
            aria-label={`Python code for ${cellKey}`}
            rows={Math.min(18, code.split('\n').length + 1)}
            className="w-full font-mono text-[12px] leading-5 bg-[#050a14] text-slate-200 border border-slate-800 rounded-md p-2 resize-y"
          />
          <div className="flex gap-3 text-[11px] text-slate-500">
            <span>Change the numbers and run it again.</span>
            {edited && <button onClick={() => setCode(cell.code)} className="underline hover:text-slate-300">Reset the code</button>}
          </div>
          {lines.length > 0 && (
            <div className="rounded-md bg-black/40 p-2 space-y-1">
              {lines.map((line, i) => line.type === 'image'
                ? <img key={i} src={`data:image/png;base64,${line.src}`} alt="Plot drawn by the cell" className="max-w-full rounded bg-white" />
                : <pre key={i} className={`font-mono text-[12px] whitespace-pre-wrap ${line.type === 'error' ? 'text-rose-300' : line.type === 'note' ? 'text-slate-500 italic' : 'text-slate-200'}`}>{line.text}</pre>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
