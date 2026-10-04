// The learning library browser (library.ts): pick an example, read what it teaches and what
// to watch, look at it in each language (or two side by side), then load it into the editor.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { BookOpen, Check, Columns2, Copy, Play, X } from 'lucide-react'
import { useCodeLensTheme } from './ThemeContext'
import { LANGUAGE_LABELS, LIBRARY, libraryGroups, type Difficulty, type LibraryExample } from './library'
import type { Lang } from './types'

interface LibraryBrowserProps {
  /** Languages CodeLens can run here (C# and C++ only in the desktop app). */
  available: Lang[]
  /** The language to show first when an example has it. */
  preferredLang: Lang
  initialExampleId?: string
  onLoad: (example: LibraryExample, lang: Lang) => void
  onClose: () => void
}

const LANGUAGE_ORDER: Lang[] = ['js', 'ts', 'py', 'cs', 'cpp', 'c', 'go']
const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced']

export function variantLanguages(example: LibraryExample): Lang[] {
  return LANGUAGE_ORDER.filter(lang => example.variants[lang])
}

export default function LibraryBrowser({ available, preferredLang, initialExampleId, onLoad, onClose }: LibraryBrowserProps) {
  const { theme: { ui } } = useCodeLensTheme()
  const [selectedId, setSelectedId] = useState(initialExampleId ?? LIBRARY[0].id)
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const example = LIBRARY.find(e => e.id === selectedId) ?? LIBRARY[0]
  const languages = variantLanguages(example)
  const fallbackLang = languages.includes(preferredLang) ? preferredLang : languages[0]
  const [chosenLang, setLang] = useState<Lang>(fallbackLang)
  // Worked out while rendering, not fixed up afterwards: an example without a variant in
  // the chosen language (a Python-only one while JavaScript is chosen) must never be
  // rendered with that language, even for one render.
  const lang = example.variants[chosenLang] ? chosenLang : fallbackLang
  const [compareWith, setCompareWith] = useState<Lang | null>(null)
  const [copied, setCopied] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Keep the compared language valid for the selected example.
  useEffect(() => {
    if (compareWith && !example.variants[compareWith]) setCompareWith(null)
  }, [example]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus moves into the dialog when it opens, and Escape closes it. Once, on open: the
  // parent passes a new onClose on every render, which must not pull focus back here.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const returnFocus = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      returnFocus?.focus?.()   // back to the button that opened it
    }
  }, [])

  const groups = useMemo(() => {
    const text = query.trim().toLowerCase()
    return libraryGroups()
      .map(g => ({
        ...g,
        examples: g.examples.filter(e =>
          (!difficulty || e.difficulty === difficulty) &&
          (!text || `${e.title} ${e.concept} ${e.group}`.toLowerCase().includes(text))),
      }))
      .filter(g => g.examples.length > 0)
  }, [query, difficulty])

  // Up and down arrows move through the list.
  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-example]') ?? [])]
    const index = buttons.findIndex(b => b === document.activeElement)
    const next = buttons[Math.max(0, Math.min(buttons.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1)))]
    if (next) { e.preventDefault(); next.focus(); setSelectedId(next.dataset.example!) }
  }

  const variant = example.variants[lang]!
  const canRun = available.includes(lang)
  const copy = async () => {
    try { await navigator.clipboard.writeText(variant.code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* no clipboard */ }
  }

  const chip = (active: boolean): React.CSSProperties => ({
    background: active ? ui.accentBgSolid : 'transparent',
    border: `1px solid ${active ? ui.accentSolid : ui.borderStrong}`,
    color: active ? ui.accentBright : ui.textMuted,
    borderRadius: 999, padding: '2px 10px', fontSize: 11, cursor: 'pointer',
  })
  const section = (title: string, body: ReactNode) => (
    <section style={{ marginTop: 14 }}>
      <h3 style={{ margin: '0 0 6px', fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: ui.textMuted }}>{title}</h3>
      {body}
    </section>
  )
  const list = (items: string[]) => (
    <ul style={{ margin: 0, paddingLeft: 18, color: ui.textSoft, fontSize: 13, lineHeight: 1.55 }}>
      {items.map((item, i) => <li key={i}>{inlineCode(item, ui.accent)}</li>)}
    </ul>
  )
  const codeBlock = (code: string) => (
    <pre style={{
      margin: 0, padding: 12, background: ui.bg, border: `1px solid ${ui.border}`, borderRadius: 8,
      fontSize: 12, lineHeight: 1.5, overflow: 'auto', color: ui.text, fontFamily: 'JetBrains Mono, monospace', maxHeight: 420,
      fontVariantLigatures: 'none',   // show <= and == as typed, not as ≤ and a long =
    }}>{code}</pre>
  )

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(8px, 4vw, 40px)' }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="CodeLens example library"
        onClick={e => e.stopPropagation()}
        style={{
          background: ui.panelBg, border: `1px solid ${ui.border}`, borderRadius: 12, width: '100%', maxWidth: 1200, height: '100%',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${ui.border}`, background: ui.headerBg, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <BookOpen size={16} color={ui.accent} />
          <span style={{ fontWeight: 600, color: ui.text }}>Example library</span>
          <input
            data-autofocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search examples…"
            aria-label="Search examples"
            style={{ marginLeft: 12, background: ui.bg, border: `1px solid ${ui.borderStrong}`, color: ui.text, borderRadius: 6, padding: '4px 10px', fontSize: 12, minWidth: 180 }}
          />
          <div role="group" aria-label="Filter by difficulty" style={{ display: 'flex', gap: 6 }}>
            {DIFFICULTIES.map(d => (
              <button key={d} aria-pressed={difficulty === d} onClick={() => setDifficulty(difficulty === d ? null : d)} style={chip(difficulty === d)}>{d}</button>
            ))}
          </div>
          <button onClick={onClose} aria-label="Close the library" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: ui.textMuted }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexWrap: 'wrap' }}>
          <div
            ref={listRef}
            onKeyDown={onListKey}
            aria-label="Examples"
            style={{ flex: '0 0 260px', maxWidth: '100%', borderRight: `1px solid ${ui.border}`, overflow: 'auto', padding: 10, maxHeight: '100%' }}
          >
            {groups.length === 0 && <div style={{ color: ui.textMuted, fontSize: 12, padding: 8 }}>No examples match.</div>}
            {groups.map(g => (
              <div key={g.group} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: ui.textMuted, margin: '4px 6px' }}>{g.group}</div>
                {g.examples.map(e => (
                  <button
                    key={e.id}
                    data-example={e.id}
                    aria-current={e.id === example.id}
                    onClick={() => setSelectedId(e.id)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '7px 8px', borderRadius: 6, cursor: 'pointer',
                      background: e.id === example.id ? ui.accentBg : 'transparent',
                      border: `1px solid ${e.id === example.id ? ui.accentDeep : 'transparent'}`,
                      color: ui.text,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                    <div style={{ fontSize: 11, color: ui.textMuted, marginTop: 2 }}>
                      {e.difficulty} · {variantLanguages(e).map(l => LANGUAGE_LABELS[l]).join(', ')}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div style={{ flex: '1 1 420px', minWidth: 0, overflow: 'auto', padding: '16px 20px', maxHeight: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 20, color: ui.textBright }}>{example.title}</h2>
              <span style={{ fontSize: 12, color: ui.textMuted }}>{example.group} · {example.difficulty}</span>
            </div>
            <p style={{ color: ui.textSoft, fontSize: 14, lineHeight: 1.6, margin: '10px 0 0' }}>{inlineCode(example.concept, ui.accent)}</p>
            {example.prerequisites.length > 0 && (
              <p style={{ color: ui.textMuted, fontSize: 12, margin: '8px 0 0' }}>Before this: {example.prerequisites.join(' · ')}</p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, flexWrap: 'wrap' }} role="tablist" aria-label="Language">
              {languages.map(l => (
                <button key={l} role="tab" aria-selected={l === lang} onClick={() => setLang(l)} style={chip(l === lang)}
                  title={available.includes(l) ? undefined : 'Runs in the UpSkillOS desktop app'}>
                  {LANGUAGE_LABELS[l]}{available.includes(l) ? '' : ' (desktop)'}
                </button>
              ))}
              {languages.length > 1 && (
                <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: ui.textMuted }}>
                  <Columns2 size={14} />
                  Compare with
                  <select
                    value={compareWith ?? ''}
                    onChange={e => setCompareWith((e.target.value || null) as Lang | null)}
                    style={{ background: ui.bg, color: ui.text, border: `1px solid ${ui.borderStrong}`, borderRadius: 6, fontSize: 12, padding: '2px 6px' }}
                  >
                    <option value="">nothing</option>
                    {languages.filter(l => l !== lang).map(l => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
                  </select>
                </label>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: compareWith ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr', gap: 10, marginTop: 10 }}>
              <div>
                {compareWith && <div style={{ fontSize: 11, color: ui.textMuted, marginBottom: 4 }}>{LANGUAGE_LABELS[lang]}</div>}
                {codeBlock(variant.code)}
                {variant.input && (
                  <>
                    <div style={{ fontSize: 11, color: ui.textMuted, margin: '8px 0 4px' }}>Input box (loaded with the code; each line is read in turn)</div>
                    {codeBlock(variant.input.replace(/\n$/, ''))}
                  </>
                )}
              </div>
              {compareWith && example.variants[compareWith] && (
                <div>
                  <div style={{ fontSize: 11, color: ui.textMuted, marginBottom: 4 }}>{LANGUAGE_LABELS[compareWith]}</div>
                  {codeBlock(example.variants[compareWith]!.code)}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => onLoad(example, lang)}
                disabled={!canRun}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  cursor: canRun ? 'pointer' : 'default', border: 'none',
                  background: canRun ? ui.accentSolid : ui.border, color: canRun ? '#fff' : ui.textFaint,
                }}
              >
                <Play size={14} /> Load into the editor
              </button>
              <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer', background: 'transparent', border: `1px solid ${ui.borderStrong}`, color: ui.textSoft }}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy code'}
              </button>
              {!canRun && <span style={{ fontSize: 12, color: ui.amber }}>{LANGUAGE_LABELS[lang]} runs in the UpSkillOS desktop app, with your own tools.</span>}
            </div>

            {section('Expected output', codeBlock(variant.output.join('\n')))}
            {section('What to watch while stepping', list(example.watch))}
            {example.complexity && section('Complexity', <p style={{ margin: 0, color: ui.textSoft, fontSize: 13 }}>{inlineCode(example.complexity, ui.accent)}</p>)}
            {example.invariants && section('Invariants', list(example.invariants))}
            {example.edgeCases && section('Edge cases to try', list(example.edgeCases))}
            {section('Exercises', list(example.exercises))}
          </div>
        </div>
      </div>
    </div>
  )
}

// `code` spans inside the notes.
function inlineCode(text: string, color: string): ReactNode {
  return text.split(/(`[^`]+`)/).map((part, i) => part.startsWith('`') && part.endsWith('`')
    ? <code key={i} style={{ color, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.92em' }}>{part.slice(1, -1)}</code>
    : part)
}
