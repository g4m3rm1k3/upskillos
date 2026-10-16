// Two optional views of a formula cell, for learning: how it is worked out
// one step at a time, and the same calculation written as Python, JavaScript
// and MATLAB. Both start closed and remember whether they were opened, so they
// stay out of the way of people just using the sheet.
import { useMemo, useState } from 'react'
import { explainFormula } from '../engine/explain.js'
import { translateFormula } from '../engine/translate.js'
import { LANGUAGES } from '../engine/code.js'

function useRemembered(key, initial) {
  const [value, setValue] = useState(() => {
    try { const v = localStorage.getItem(key); return v === null ? initial : v === '1' } catch { return initial }
  })
  const set = (v) => { setValue(v); try { localStorage.setItem(key, v ? '1' : '0') } catch { /* private window: not remembered */ } }
  return [value, set]
}

function Fold({ id, title, hint, initial = false, children }) {
  const [open, setOpen] = useRemembered('spreadsheet-lab:fold:' + id, initial)
  return (
    <section className="border-b border-slate-200 dark:border-slate-800">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-900">
        <span className={'text-[10px] text-slate-400 transition-transform ' + (open ? 'rotate-90' : '')}>▶</span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</span>
        {!open && <span className="ml-auto truncate text-[11px] text-slate-400">{hint}</span>}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </section>
  )
}

function WorkedOut({ wb, sheet, row, col, cell }) {
  // Evaluating again is cheap for most formulas, and only happens while open.
  const { steps } = useMemo(
    () => explainFormula(cell.input.slice(1), cell.tree, wb.context(sheet, row, col)),
    // version: a changed input re-explains with the new values
    [cell.tree, cell.input, wb.version, sheet, row, col],
  )
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li key={i} className="text-xs">
          <div className="flex gap-2">
            <span className="w-4 shrink-0 text-right text-[11px] text-slate-400">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <code className="block break-all rounded bg-slate-50 px-1.5 py-1 font-mono text-[12px] text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                {i < steps.length - 1 && '='}
                {s.segments.map((g, j) => (g.highlight
                  ? <mark key={j} className="rounded bg-amber-200 px-0.5 text-slate-900 dark:bg-amber-500/40 dark:text-amber-50">{g.text}</mark>
                  : <span key={j}>{g.text}</span>))}
              </code>
              <p className="mt-0.5 text-slate-600 dark:text-slate-300">{s.note}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

const LANG_ORDER = [['py', 'Python'], ['js', 'JavaScript'], ['matlab', 'MATLAB']]

function InCode({ cell, onMakeCode }) {
  const t = useMemo(() => translateFormula(cell.tree), [cell.tree])
  const [lang, setLang] = useState(() => { try { return LANGUAGES[localStorage.getItem('spreadsheet-lab:code-lang')] ? localStorage.getItem('spreadsheet-lab:code-lang') : 'py' } catch { return 'py' } })
  const pick = (id) => { setLang(id); try { localStorage.setItem('spreadsheet-lab:code-lang', id) } catch { /* not remembered */ } }
  const [copied, setCopied] = useState(false)
  if (t.unsupported) {
    return <p className="text-xs text-slate-600 dark:text-slate-300">No translation yet for {/^[A-Z][A-Z0-9.]*$/.test(t.unsupported) ? <b className="font-mono">{t.unsupported}</b> : t.unsupported}. The translations cover common maths, statistics, logic and text functions.</p>
  }
  const code = t[lang]
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ }
  }
  return (
    <div>
      <div className="mb-2 flex gap-1" role="tablist" aria-label="Language">
        {LANG_ORDER.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={lang === id} onClick={() => pick(id)}
            className={'rounded-full px-2.5 py-0.5 text-[11px] ' + (lang === id ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}>{label}</button>
        ))}
      </div>
      {code ? (
        <>
          <pre className="whitespace-pre-wrap break-all rounded bg-slate-900 px-2.5 py-2 font-mono text-[12px] leading-relaxed text-slate-100">{code}</pre>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => onMakeCode(lang, code)}
              className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500">Make a {LANGUAGES[lang].label} cell</button>
            <button type="button" onClick={copy}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">The new cell goes in the first empty cell to the right and should show the same value.</p>
        </>
      ) : (
        <p className="rounded bg-slate-50 px-2.5 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">{t.missing[lang]}</p>
      )}
      {t.notes.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
          {t.notes.map((n) => <li key={n} className="border-l-2 border-amber-400 pl-2">{n}</li>)}
        </ul>
      )}
    </div>
  )
}

// In a lesson (lesson: true) the steps start open: seeing how the formula is
// worked out is the point there. That choice is remembered apart from the lab's.
export default function FormulaLearn({ wb, sheet, row, col, cell, onMakeCode, lesson = false }) {
  if (cell?.kind !== 'formula' || !cell.tree) return null
  return (
    <>
      <Fold id={(lesson ? 'lesson-' : '') + 'worked-out'} initial={lesson} title="How it's worked out" hint="step by step">
        <WorkedOut wb={wb} sheet={sheet} row={row} col={col} cell={cell} />
      </Fold>
      <Fold id="in-code" title="This formula in code" hint="Python · JS · MATLAB">
        <InCode cell={cell} onMakeCode={onMakeCode} />
      </Fold>
    </>
  )
}
