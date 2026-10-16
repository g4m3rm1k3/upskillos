import { useEffect, useMemo, useRef, useState } from 'react'
import { SECTIONS, HOW_TO_TYPE } from '../reference/special-characters-data.js'
import { NAMES, HTML_ENTITIES, WINDOWS_1252, CP437, MAC_KEYS } from '../reference/special-characters-tables.js'

// Special characters: learn a character's name and copy it in one click (data:
// src/reference/special-characters-data.js). Names, HTML entities, Alt codes and Mac keys come
// from the generated tables, never typed by hand.

const ALT_0 = Object.fromEntries(Object.entries(WINDOWS_1252).map(([n, ch]) => [ch, `Alt+0${n}`]))
const ALT = Object.fromEntries(Object.entries(CP437).map(([n, ch]) => [ch, `Alt+${n}`]))
const codePoint = ch => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`
const hexEntity = ch => `&#x${ch.codePointAt(0).toString(16).toUpperCase()};`
const nameOf = ch => (NAMES[ch] ?? '').toLowerCase()
const sentence = text => (text ? text[0].toUpperCase() + text.slice(1) : text)
const ALT_CHART = { id: 'alt', title: 'Alt code chart (Windows)' }
// The first entry for each character, so a chart cell shows the same details as its tile.
const BY_CHAR = {}
for (const s of SECTIONS) for (const c of s.chars) BY_CHAR[c.char] ??= { ...c, section: s.id }

// Copies text, with a fallback for windows where the Clipboard API isn't allowed.
async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true } catch { /* fall back below */ }
  try {
    const area = Object.assign(document.createElement('textarea'), { value: text })
    area.style.position = 'fixed'; area.style.opacity = '0'
    document.body.appendChild(area); area.select()
    const ok = document.execCommand('copy'); area.remove(); return ok
  } catch { return false }
}

function searchText(c) {
  return [c.char, c.short, nameOf(c.char), codePoint(c.char), ...(c.keywords ?? []), c.note, c.rl, c.latex,
    HTML_ENTITIES[c.char], ALT_0[c.char], ALT[c.char], MAC_KEYS[c.char]].filter(Boolean).join(' ').toLowerCase()
}

function Glyph({ c, className = '' }) {
  return c.shown
    ? <span className={`text-[10px] font-black tracking-wider px-1.5 py-0.5 rounded border border-dashed border-teal-500/60 text-teal-200 ${className}`}>{c.shown}</span>
    : <span className={`font-serif ${className}`}>{c.char}</span>
}

function Tile({ c, active, copied, onPick }) {
  return (
    <button
      onClick={() => onPick(c)}
      title={`${c.short ?? nameOf(c.char)}: click to copy`}
      aria-label={`Copy ${c.short ?? nameOf(c.char)}`}
      className={`relative flex flex-col items-center justify-center gap-1 h-20 rounded-xl border px-1 transition-colors ${
        active ? 'bg-teal-500/20 border-teal-400' : 'bg-[#12121f] border-slate-700/60 hover:border-teal-500/60 hover:bg-teal-950/30'}`}
    >
      <Glyph c={c} className="text-2xl leading-none text-white" />
      <span className="text-[10px] leading-tight text-slate-400 text-center line-clamp-2">{c.short ?? nameOf(c.char)}</span>
      {copied && <span className="absolute top-1 right-1 text-[9px] font-bold text-emerald-300">Copied</span>}
    </button>
  )
}

function GreekRow({ c, active, copied, onPick }) {
  return (
    <button
      onClick={() => onPick(c)}
      aria-label={`Copy ${c.short}`}
      className={`w-full flex items-start gap-4 text-left rounded-xl border px-4 py-2.5 transition-colors ${
        active ? 'bg-teal-500/20 border-teal-400' : 'bg-[#12121f] border-slate-700/60 hover:border-teal-500/60'}`}
    >
      <span className="w-8 text-center text-2xl font-serif text-white leading-none pt-0.5">{c.char}</span>
      <span className="w-28 shrink-0 text-sm font-bold text-slate-100">{sentence(c.short)}{copied && <span className="ml-2 text-[9px] font-bold text-emerald-300 normal-case">Copied</span>}</span>
      <span className="text-sm text-slate-300">{c.rl ?? c.note}</span>
    </button>
  )
}

function CopyChip({ label, text, show }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={async () => { if (await copy(text)) { setDone(true); setTimeout(() => setDone(false), 1000) } }}
      className="text-[11px] px-2 py-1 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800 font-mono"
      title={`Copy ${label}`}
    >
      {done ? 'Copied' : (show ?? text)}
    </button>
  )
}

function Details({ c, onClose }) {
  const rows = [
    ['Unicode name', <span key="n" className="font-mono text-xs">{NAMES[c.char]}</span>],
    ['Code point', <CopyChip key="u" label="code point" text={codePoint(c.char)} />],
    ['HTML', <span key="h" className="flex flex-wrap gap-1">{HTML_ENTITIES[c.char] && <CopyChip label="HTML entity" text={`&${HTML_ENTITIES[c.char]};`} />}<CopyChip label="HTML code" text={hexEntity(c.char)} /></span>],
    c.latex && ['LaTeX', <CopyChip key="l" label="LaTeX" text={c.latex} />],
    (ALT_0[c.char] || ALT[c.char]) && ['Windows', <span key="w" className="text-sm text-slate-200">{[ALT_0[c.char], ALT[c.char]].filter(Boolean).join('  or  ')} <span className="text-slate-500 text-xs">(numeric keypad)</span></span>],
    MAC_KEYS[c.char] && ['Mac', <span key="m" className="text-sm text-slate-200">{MAC_KEYS[c.char]}</span>],
  ].filter(Boolean)
  return (
    <div className="sticky bottom-0 z-10 mt-6 rounded-t-2xl border border-teal-700/50 bg-[#0b1416]/95 backdrop-blur p-4 shadow-2xl" role="region" aria-label="Character details">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 shrink-0 flex items-center justify-center rounded-xl bg-[#12121f] border border-slate-700"><Glyph c={c} className="text-4xl text-white" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-black text-white">{sentence(c.short ?? nameOf(c.char))}</h2>
            <CopyChip label="character" text={c.char} show={c.shown} />
            <button onClick={onClose} className="ml-auto text-slate-400 hover:text-white text-sm" aria-label="Close details">✕</button>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 mt-2 items-center">
            {rows.map(([k, v]) => [<dt key={`k${k}`} className="text-[10px] font-black uppercase tracking-widest text-slate-500">{k}</dt>, <dd key={`v${k}`} className="min-w-0">{v}</dd>])}
          </dl>
          {c.rl && <p className="text-sm text-teal-100 mt-2"><span className="font-bold">In RL: </span>{c.rl}</p>}
          {c.note && <p className="text-sm text-slate-300 mt-1">{c.note}</p>}
          {c.section === 'greek' && (
            <button className="text-xs underline text-amber-300 mt-1" onClick={() => window.dispatchEvent(new CustomEvent('oc-open-reference', { detail: { key: 'greek-letters' } }))}>
              Every meaning of this letter, in Greek Letters in Maths →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// The chart's cells that match a search: by code, character or name.
const altCells = (map, prefix, q) => Object.entries(map).filter(([n, ch]) => !q || `${prefix}${n} ${ch} ${nameOf(ch)}`.toLowerCase().includes(q))
const altMatches = q => altCells(WINDOWS_1252, '0', q).length + altCells(CP437, '', q).length

function AltChart({ query, onPick, selected }) {
  const q = query.trim().toLowerCase()
  if (!altMatches(q)) return null
  const table = (title, about, map, prefix) => {
    const cells = altCells(map, prefix, q)
    if (!cells.length) return null
    return (
      <div className="mb-6">
        <h3 className="font-bold text-slate-100 text-sm">{title}</h3>
        <p className="text-xs text-slate-400 mb-2">{about}</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5">
          {cells.map(([n, ch]) => (
            <button key={n} onClick={() => onPick(BY_CHAR[ch] ?? { char: ch, section: 'alt' })} title={nameOf(ch)}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left ${selected === ch ? 'bg-teal-500/20 border-teal-400' : 'bg-[#12121f] border-slate-700/60 hover:border-teal-500/60'}`}>
              <span className="min-w-5 text-center text-lg font-serif text-white">{BY_CHAR[ch]?.shown ? <Glyph c={BY_CHAR[ch]} /> : ch}</span>
              <span className="text-[10px] font-mono text-slate-400">{prefix}{n}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }
  return (
    <section id="sc-alt" className="mt-8">
      <h2 className="text-xl font-black text-white mb-1">{ALT_CHART.title}</h2>
      <p className="text-sm text-slate-400 mb-4">Hold Alt, type the digits on the numeric keypad (Num Lock on), let go of Alt. Click a cell to copy the character instead.</p>
      {table('Alt + 0 and three digits: Windows-1252', 'Works in most Windows programs. Codes 0032 to 0127 type the keyboard\'s own characters, so they are left out.', WINDOWS_1252, '0')}
      {table('Alt + three digits, no leading 0: code page 437', 'The original IBM PC character set, used on US-English Windows; Windows set to another language uses a different set here. The same number gives a different character than with the 0: Alt+0225 is á, Alt+225 is ß.', CP437, '')}
    </section>
  )
}

export default function SpecialCharactersPage() {
  const [query, setQuery] = useState('')
  const [section, setSection] = useState(null)
  const [selected, setSelected] = useState(null)
  const [copied, setCopied] = useState(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const pick = async c => {
    setSelected(c)
    if (await copy(c.char)) { setCopied(c.char); clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(null), 1100) }
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SECTIONS
      .filter(s => !section || s.id === section)
      .map(s => ({ ...s, chars: s.chars.map(c => ({ ...c, section: s.id })).filter(c => !q || searchText(c).includes(q) || c.char === query) }))
      .filter(s => s.chars.length)
  }, [query, section])

  const showAlt = !section || section === 'alt'
  return (
    <div className="min-h-full bg-[#07070f] text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-black tracking-tight mb-2">
            Special <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">Characters</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            Click any character to copy it and see its name, its code, its LaTeX and how to type it.
            Search by name, by use ("transpose", "pipe", "discount factor") or by code ("U+2211", "0176").
          </p>
        </header>

        <details className="rounded-2xl border border-teal-800/40 bg-teal-950/20 p-4 mb-5 text-sm text-slate-200">
          <summary className="cursor-pointer font-black text-teal-200">How to type a character that isn't on your keyboard</summary>
          <dl className="mt-3 space-y-2">
            {HOW_TO_TYPE.map(h => (
              <div key={h.system} className="grid sm:grid-cols-[7rem_1fr] gap-x-3">
                <dt className="font-bold text-teal-100">{h.system}</dt>
                <dd><ul className="list-disc ml-4 space-y-0.5 text-slate-300">{h.steps.map((s, i) => <li key={i}>{s}</li>)}</ul></dd>
              </div>
            ))}
          </dl>
        </details>

        <div className="sticky top-0 z-20 bg-[#07070f]/95 backdrop-blur pb-3 pt-1 mb-4 border-b border-slate-800/60">
          <input
            type="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search: arrow, sum, gamma, backtick, nbsp, U+00B0, 0176…" aria-label="Search special characters"
            className="w-full bg-[#12121f] border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500/60 mb-3"
          />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sections">
            {[{ id: null, title: 'All' }, ...SECTIONS, ALT_CHART].map(s => (
              <button key={s.id ?? 'all'} onClick={() => setSection(s.id)} aria-pressed={section === s.id}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${section === s.id ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                {s.title}
              </button>
            ))}
          </div>
        </div>

        {shown.map(s => (
          <section key={s.id} id={`sc-${s.id}`} className="mt-6">
            <h2 className="text-xl font-black text-white mb-1">{s.title}</h2>
            <p className="text-sm text-slate-400 mb-3">{s.blurb}</p>
            {s.id === 'greek'
              ? <div className="space-y-1.5">{s.chars.map(c => <GreekRow key={c.char} c={c} active={selected?.char === c.char} copied={copied === c.char} onPick={pick} />)}</div>
              : <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">{s.chars.map(c => <Tile key={c.char} c={c} active={selected?.char === c.char} copied={copied === c.char} onPick={pick} />)}</div>}
          </section>
        ))}
        {shown.length === 0 && !(showAlt && altMatches(query.trim().toLowerCase())) && <p className="text-center text-slate-500 py-12">Nothing matches. Try a name ("dagger"), a use ("checkbox") or a code ("U+2713").</p>}
        {showAlt && <AltChart query={query} onPick={pick} selected={selected?.char} />}

        {selected && <Details c={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  )
}
