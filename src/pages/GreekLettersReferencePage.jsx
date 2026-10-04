import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Katex from '../components/concept-explorer/Katex.jsx'
import {
  GREEK_LETTERS, FIELDS, FREQUENCY_LABELS, LOOK_ALIKES, LATIN_LOOKING_CAPITALS,
} from '../reference/greek-letters-data.js'
import { GREEK_CELLS } from '../reference/greek-letters-cells.js'
import GreekCell from '../components/reference/GreekCell.jsx'

// Greek letters in mathematics (data: src/reference/greek-letters-data.js).
// Nobody has to type a Greek letter to use it: the common letters are always buttons,
// the rest are in "More letters", and search accepts English names and meanings
// ("sigma", "standard deviation", "angle").

const FREQ_STYLE = {
  common: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
  field: 'bg-sky-900/50 text-sky-300 border-sky-700/50',
  rare: 'bg-slate-800 text-slate-400 border-slate-700',
}

const COMMON = GREEK_LETTERS.filter(l => l.frequency === 'common')
const MORE = GREEK_LETTERS.filter(l => l.frequency !== 'common')

function searchText(letter) {
  return [
    letter.symbol, letter.name, letter.id, ...(letter.keywords ?? []), letter.beware ?? '',
    ...letter.meanings.flatMap(m => [m.field, m.role, m.note ?? '']),
  ].join(' ').toLowerCase()
}

function LetterButton({ letter, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={letter.name}
      title={letter.name}
      className={`flex flex-col items-center justify-center w-12 h-14 rounded-xl border transition-all ${
        active
          ? 'bg-amber-500 border-amber-400 text-slate-950'
          : 'bg-[#12121f] border-slate-700/60 text-slate-100 hover:border-amber-500/60 hover:bg-amber-950/30'
      }`}
    >
      <span className="text-xl leading-none font-serif">{letter.symbol}</span>
      <span className={`text-[9px] mt-1 ${active ? 'text-slate-900' : 'text-slate-500'}`}>{letter.id.length > 7 ? letter.id.slice(0, 6) + '.' : letter.id}</span>
    </button>
  )
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200) } catch { /* no clipboard */ }
      }}
      className="text-[10px] px-2 py-0.5 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800"
      title={`Copy ${label}`}
    >
      {copied ? 'Copied' : `Copy ${label}`}
    </button>
  )
}

function Meaning({ meaning, cellKey, cells }) {
  const cell = GREEK_CELLS[cellKey]
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0b0b16] p-4">
      <div className="flex flex-wrap items-baseline gap-2 mb-3">
        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/50">{meaning.field}</span>
        <span className="font-bold text-slate-100 text-sm">{meaning.role}</span>
      </div>
      <div className="overflow-x-auto py-1 text-slate-100"><Katex latex={meaning.latex} display /></div>

      {meaning.parts?.length > 0 && (
        <table className="w-full text-sm mt-3">
          <caption className="text-left text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">What everything means</caption>
          <tbody>
            {meaning.parts.map(([sym, text], i) => (
              <tr key={i} className="border-t border-slate-800/70">
                <td className="py-1.5 pr-4 align-top whitespace-nowrap text-slate-100"><Katex latex={sym} display={false} /></td>
                <td className="py-1.5 text-slate-300">{text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {meaning.example && (
        <div className="mt-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 p-3">
          <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400/80 mb-1">Example</div>
          <p className="text-sm text-slate-300 mb-1">{meaning.example.given}</p>
          {meaning.example.steps.map((step, i) => (
            // Inline mode with \displaystyle: full-size fractions without the app's boxed display style.
            <div key={i} className="overflow-x-auto text-slate-100 py-1 pl-2"><Katex latex={`\\displaystyle ${step}`} display={false} /></div>
          ))}
          {meaning.example.result && <p className="text-sm text-emerald-200/90 mt-1">{meaning.example.result}</p>}
        </div>
      )}

      {meaning.note && <p className="text-xs text-slate-400 mt-3">{meaning.note}</p>}
      {cell && <GreekCell cellKey={cellKey} cell={cell} register={cells.register} onResult={cells.onResult} />}
    </div>
  )
}

function LetterCard({ letter, field, onSelect, cells }) {
  const partner = letter.partner ? GREEK_LETTERS.find(l => l.id === letter.partner) : null
  // Keep each meaning's position in the letter: cells are keyed by it ("alpha:3").
  const meanings = letter.meanings.map((meaning, index) => ({ meaning, index })).filter(({ meaning }) => !field || meaning.field === field)
  const hidden = letter.meanings.length - meanings.length

  return (
    <article id={`greek-${letter.id}`} className="rounded-2xl border border-slate-700/50 bg-[#0e0e1a] overflow-hidden">
      <header className="flex flex-wrap items-center gap-4 px-5 py-4 bg-gradient-to-br from-amber-600/30 via-orange-700/20 to-transparent border-b border-slate-800">
        <div className="text-5xl font-serif text-white w-14 text-center leading-none">{letter.symbol}</div>
        <div className="flex-1 min-w-[180px]">
          <h2 className="text-lg font-black text-white capitalize">{letter.name}</h2>
          <div className="text-xs text-slate-400">Say: {letter.say} · LaTeX: <code className="text-amber-200">{letter.tex}</code></div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${FREQ_STYLE[letter.frequency]}`}>{FREQUENCY_LABELS[letter.frequency]}</span>
            <CopyButton text={letter.symbol} label="symbol" />
            <CopyButton text={letter.tex} label="LaTeX" />
            {partner && (
              <button onClick={() => onSelect(partner.id)} className="text-[10px] px-2 py-0.5 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800">
                {letter.case === 'lower' ? 'Capital' : 'Lowercase'}: {partner.symbol} →
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="p-5 space-y-3">
        {letter.case === 'upper' && (
          <p className="text-xs text-slate-400">A capital is a separate symbol with its own meanings, not a bigger version of the lowercase letter.</p>
        )}
        {letter.variants?.map(v => (
          <p key={v.symbol} className="text-xs text-slate-400"><span className="font-serif text-base text-slate-200 mr-1">{v.symbol}</span> {v.note}</p>
        ))}
        {meanings.map(({ meaning, index }) => <Meaning key={index} meaning={meaning} cellKey={`${letter.id}:${index}`} cells={cells} />)}
        {hidden > 0 && <p className="text-xs text-slate-500">{hidden} more meaning{hidden === 1 ? '' : 's'} in other fields; clear the field filter to see them.</p>}
        {letter.beware && (
          <div className="rounded-xl border border-rose-800/50 bg-rose-950/30 p-3 text-sm text-rose-100">
            <span className="font-black text-rose-300">Don't assume: </span>{letter.beware}
          </div>
        )}
      </div>
    </article>
  )
}

export default function GreekLettersReferencePage() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)   // a letter id, or null for all
  const [field, setField] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)

  // ── Python cells: each registers its run function; results are kept here so
  // "Run all" can report them and search can look inside what the cells printed.
  const runners = useRef(new Map())
  const [results, setResults] = useState({})          // cell key -> { status, output }
  const [runningAll, setRunningAll] = useState(null)  // { done, total } while running
  const cells = useMemo(() => ({
    register: (key, run) => { runners.current.set(key, run); return () => runners.current.delete(key) },
    onResult: (key, result) => setResults(current => ({ ...current, [key]: result })),
  }), [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return GREEK_LETTERS.filter(letter =>
      (!selected || letter.id === selected) &&
      (!field || letter.meanings.some(m => m.field === field)) &&
      (!q || searchText(letter).includes(q) ||
        Object.entries(results).some(([key, r]) => key.startsWith(`${letter.id}:`) && r.output.toLowerCase().includes(q))))
  }, [query, selected, field, results])

  // Runs the cells of the letters on screen, in page order, one after another.
  const runAll = useCallback(async () => {
    const keys = [...runners.current.keys()].filter(key => shown.some(l => key.startsWith(`${l.id}:`)))
    const order = new Map(Object.keys(GREEK_CELLS).map((key, i) => [key, i]))
    keys.sort((a, b) => order.get(a) - order.get(b))
    setRunningAll({ done: 0, total: keys.length })
    for (const [i, key] of keys.entries()) {
      await runners.current.get(key)?.()
      setRunningAll({ done: i + 1, total: keys.length })
    }
    setRunningAll(null)
  }, [shown])

  const ran = Object.entries(results).filter(([key]) => shown.some(l => key.startsWith(`${l.id}:`)))
  const failed = ran.filter(([, r]) => r.status !== 'match')

  // ── The controls bar slides away while scrolling down and back on any scroll up.
  // The page scrolls inside the reference overlay, not the window, so listen to the
  // nearest scrolling ancestor.
  const rootRef = useRef(null)
  const [barHidden, setBarHidden] = useState(false)
  useEffect(() => {
    let scroller = rootRef.current?.parentElement
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement
    const target = scroller ?? window
    const position = () => (scroller ? scroller.scrollTop : window.scrollY)
    let last = position()
    const onScroll = () => {
      const now = position()
      if (Math.abs(now - last) < 6) return       // ignore tiny jitters
      setBarHidden(now > last && now > 300)      // keep it while near the top
      last = now
    }
    target.addEventListener('scroll', onScroll, { passive: true })
    return () => target.removeEventListener('scroll', onScroll)
  }, [])

  const choose = (id) => {
    setSelected(current => (current === id ? null : id))
    setMoreOpen(false)
  }
  const selectedLetter = GREEK_LETTERS.find(l => l.id === selected)
  const filtering = selected || field || query

  return (
    <div ref={rootRef} className="min-h-full bg-[#07070f] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-black tracking-tight mb-2">
            Greek Letters <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">in Mathematics</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            Every letter with the equations it appears in, what each symbol in them means, and a worked example.
            Scroll through them all, or pick a letter below.
          </p>
        </header>

        <section className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-5 mb-6 text-sm text-slate-200">
          <h2 className="font-black text-amber-200 mb-2">A Greek letter is not a definition</h2>
          <p className="mb-2">
            Mathematicians use Greek letters as a second alphabet: more names for things. A symbol means what the text
            around it says it means. θ doesn't inherently mean "angle", μ doesn't inherently mean "mean", λ doesn't
            inherently mean "eigenvalue". These are habits that make writing shorter, and every letter below has several.
          </p>
          <p className="font-bold text-amber-100 mb-1">When you meet a Greek letter, ask:</p>
          <ol className="list-decimal ml-5 space-y-0.5 text-slate-300">
            <li>What kind of thing is it: a number, a function, a set, an operation, a unit?</li>
            <li>Where was it defined? Look a few lines back, or at the start of the chapter.</li>
            <li>Which field am I in: statistics, geometry, physics…?</li>
            <li>Does it have units?</li>
            <li>What role does it play in this equation: something chosen, something unknown, something computed?</li>
          </ol>
        </section>

        {/* Controls */}
        <div className={`sticky top-0 z-10 bg-[#07070f]/95 backdrop-blur pb-3 pt-1 mb-4 border-b border-slate-800/60 transition-transform duration-300 ${barHidden && !moreOpen ? "-translate-y-full" : "translate-y-0"}`}>
          <div className="flex gap-2 mb-3">
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or meaning (sigma, angle, eigenvalue), or for text a cell printed"
              aria-label="Search Greek letters"
              className="flex-1 min-w-0 bg-[#12121f] border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/60"
            />
            <button
              onClick={runAll}
              disabled={!!runningAll}
              title="Run the Python cell of every letter shown, in order, and check each prints its example's answer"
              className="shrink-0 px-3 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white"
            >
              {runningAll ? `Running ${runningAll.done}/${runningAll.total}…` : 'Run all cells'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Letters">
            <button
              onClick={() => { setSelected(null); setMoreOpen(false) }}
              aria-pressed={!selected}
              className={`h-14 px-3 rounded-xl border text-xs font-bold ${!selected ? 'bg-amber-500 border-amber-400 text-slate-950' : 'bg-[#12121f] border-slate-700/60 text-slate-300 hover:border-amber-500/60'}`}
            >
              All
            </button>
            {COMMON.map(letter => <LetterButton key={letter.id} letter={letter} active={selected === letter.id} onClick={() => choose(letter.id)} />)}
            <div className="relative">
              <button
                onClick={() => setMoreOpen(open => !open)}
                aria-expanded={moreOpen}
                className={`h-14 px-3 rounded-xl border text-xs font-bold ${selectedLetter && selectedLetter.frequency !== 'common' ? 'bg-amber-500 border-amber-400 text-slate-950' : 'bg-[#12121f] border-slate-700/60 text-slate-300 hover:border-amber-500/60'}`}
              >
                {selectedLetter && selectedLetter.frequency !== 'common' ? `${selectedLetter.symbol} ${selectedLetter.name}` : `More letters (${MORE.length})`} ▾
              </button>
              {moreOpen && (
                <div className="absolute left-0 mt-2 w-[min(90vw,420px)] rounded-xl border border-slate-700 bg-[#0e0e1a] p-3 shadow-2xl z-20">
                  {['field', 'rare'].map(freq => (
                    <div key={freq} className="mb-2 last:mb-0">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">{FREQUENCY_LABELS[freq]}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {MORE.filter(l => l.frequency === freq).map(letter => (
                          <LetterButton key={letter.id} letter={letter} active={selected === letter.id} onClick={() => choose(letter.id)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3" role="group" aria-label="Fields">
            <button onClick={() => setField(null)} aria-pressed={!field} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${!field ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>All fields</button>
            {FIELDS.map(f => (
              <button key={f} onClick={() => setField(current => (current === f ? null : f))} aria-pressed={field === f}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${field === f ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtering && (
          <p className="text-xs text-slate-500 mb-3">
            {shown.length} of {GREEK_LETTERS.length} letters shown.{' '}
            <button className="underline hover:text-slate-300" onClick={() => { setQuery(''); setSelected(null); setField(null) }}>Show all</button>
          </p>
        )}

        {ran.length > 0 && !runningAll && (
          <div role="status" className={`mb-4 rounded-xl border p-3 text-sm ${failed.length ? 'border-amber-800/60 bg-amber-950/30 text-amber-100' : 'border-emerald-800/60 bg-emerald-950/30 text-emerald-100'}`}>
            {ran.length - failed.length} of {ran.length} cells run printed their example's answer.
            {failed.length > 0 && (
              <span> Check:{' '}
                {failed.map(([key]) => (
                  <button key={key} className="underline mr-2" onClick={() => document.getElementById(`greek-cell-${key.replace(':', '-')}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                    {key}
                  </button>
                ))}
              </span>
            )}
          </div>
        )}

        <div className="space-y-5">
          {shown.map(letter => <LetterCard key={letter.id} letter={letter} field={field} onSelect={choose} cells={cells} />)}
          {shown.length === 0 && <p className="text-center text-slate-500 py-12">No letter matches. Try a name ("lambda") or a meaning ("rate").</p>}
        </div>

        {!filtering && (
          <>
            <section className="mt-10 rounded-2xl border border-slate-700/50 bg-[#0e0e1a] p-5">
              <h2 className="font-black text-white mb-1">Look-alikes</h2>
              <p className="text-sm text-slate-400 mb-3">Pairs that are easy to confuse, in print and especially in handwriting.</p>
              <ul className="space-y-2">
                {LOOK_ALIKES.map((pair, i) => (
                  <li key={i} className="flex items-baseline gap-3 text-sm text-slate-300">
                    <span className="w-20 shrink-0 text-slate-100"><Katex latex={`${pair.a} \\;\\text{vs}\\; ${pair.b}`} display={false} /></span>
                    <span>{pair.text}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-700/50 bg-[#0e0e1a] p-5">
              <h2 className="font-black text-white mb-1">Capitals you'll almost never see</h2>
              <p className="text-sm text-slate-400 mb-3">
                These Greek capitals look exactly like Latin capitals, so writing them would be indistinguishable from A, B, E…
                Mathematicians simply use the Latin letter. That's why only Γ Δ Θ Λ Ξ Π Σ Φ Ψ Ω have entries above.
              </p>
              <div className="flex flex-wrap gap-2">
                {LATIN_LOOKING_CAPITALS.map(([symbol, name]) => (
                  <span key={name} className="px-2 py-1 rounded-lg border border-slate-700 text-xs text-slate-300"><span className="font-serif text-base text-white mr-1">{symbol}</span>{name}</span>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
