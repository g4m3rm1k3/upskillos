// The Input box under the editor: what the program reads while it is traced, written
// before the run (format and reasons in scriptedInput.ts).
import { useState } from 'react'
import { ChevronDown, ChevronRight, HelpCircle, Keyboard } from 'lucide-react'
import { useCodeLensTheme } from './ThemeContext'
import type { ScriptedInput } from './scriptedInput'
import type { Lang } from './types'

/** Whether a program reads standard input or uses pygame, so the Input box is worth opening. */
export function readsInput(source: string, lang: Lang): boolean {
  switch (lang) {
    case 'py': return /\binput\s*\(|\bsys\.stdin\b|^\s*(?:import|from)\s+pygame\b/m.test(source)
    case 'js':
    case 'ts': return /\bprompt\s*\(/.test(source)
    case 'c':
    case 'cpp': return /\b(?:scanf|getline|getchar|fgets|cin)\b/.test(source)
    case 'cs': return /\bConsole\.Read(?:Line|Key)?\s*\(/.test(source)
    default: return false
  }
}

const READ_WITH: Partial<Record<Lang, string>> = {
  py: 'input()',
  js: 'prompt()',
  ts: 'prompt()',
  c: 'scanf, getchar or fgets',
  cpp: 'std::cin or std::getline',
  cs: 'Console.ReadLine()',
}

interface InputPanelProps {
  lang: Lang
  value: string
  onChange: (value: string) => void
  parsed: ScriptedInput
  open: boolean
  onToggle: () => void
}

export default function InputPanel({ lang, value, onChange, parsed, open, onToggle }: InputPanelProps) {
  const { theme: { ui } } = useCodeLensTheme()
  const [help, setHelp] = useState(false)
  const lines = parsed.stdin.length
  const events = new Set(parsed.events.map(e => e.line)).size
  const summary = [
    lines ? `${lines} line${lines === 1 ? '' : 's'}` : '',
    events ? `${events} game event${events === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' · ') || 'empty'
  const games = lang === 'py'

  return (
    <div style={{
      marginTop: 8, background: ui.panelBg, border: `1px solid ${ui.border}`, borderRadius: 10,
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: ui.headerBg }}>
        <button
          onClick={onToggle}
          aria-expanded={open}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: ui.text, cursor: 'pointer', padding: 0 }}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Keyboard size={13} color={ui.accent} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Input</span>
        </button>
        <span style={{ fontSize: 10, color: parsed.errors.length ? ui.redSoft : ui.textFaint }}>
          {parsed.errors.length ? `${parsed.errors.length} line${parsed.errors.length === 1 ? '' : 's'} not understood` : summary}
        </span>
        {open && (
          <button
            onClick={() => setHelp(h => !h)}
            title="How to write input"
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: help ? ui.accent : ui.textMuted, cursor: 'pointer', fontSize: 10 }}
          >
            <HelpCircle size={12} /> How it works
          </button>
        )}
      </div>
      {open && (
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {help && (
            <div style={{ fontSize: 11, lineHeight: 1.5, color: ui.textMuted, background: ui.bg, borderRadius: 6, padding: '8px 10px' }}>
              <p style={{ margin: '0 0 6px' }}>
                CodeLens records the whole run first, then you step through it, so nobody can type
                while the program runs. Write what it will read here instead, one line per answer:
                each {READ_WITH[lang] ?? 'read'} takes the next line. Run out, and the program sees
                the end of the input.
              </p>
              {games && (
                <p style={{ margin: '0 0 6px' }}>
                  For a pygame program, lines starting with <code>@</code> are things the player does.
                  Frame 0 is everything before the first <code>display.flip()</code>, frame 1 runs until
                  the second, and so on:
                </p>
              )}
              <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ui.text, whiteSpace: 'pre-wrap' }}>
{`Ada                      a line of input
@@starts with @          a line of input that starts with @
@# a note                ignored`}{games ? `
@frame 3 key right       tap → on frame 3 (released on frame 4)
@frame 3 keydown space   hold space from frame 3...
@frame 9 keyup space     ...until frame 9
@frame 5 click 120 80    left click at x=120, y=80 (add "right" for a right click)
@frame 5 move 200 40     move the mouse
@frame 12 quit           the window's close button` : ''}
              </pre>
              {games && (
                <p style={{ margin: '6px 0 0' }}>
                  Without an <code>@frame N quit</code>, the window is closed one frame after the last
                  event, so a game loop ends. <code>clock.tick(60)</code> doesn't wait: it moves a
                  pretend clock on by 1000/60 ms, so every run is the same.
                </p>
              )}
            </div>
          )}
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            spellCheck={false}
            rows={Math.min(8, Math.max(3, value.split('\n').length))}
            placeholder={games ? 'One line per input() answer, or @frame 3 key right' : `One line per ${READ_WITH[lang] ?? 'read'} answer`}
            aria-label="Program input"
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 54,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.5,
              background: ui.bg, color: ui.text, border: `1px solid ${ui.border}`, borderRadius: 6, padding: '6px 8px',
            }}
          />
          {parsed.errors.map(error => (
            <div key={error.line} style={{ fontSize: 11, color: ui.redSoft }}>Line {error.line}: {error.message}</div>
          ))}
          {!games && parsed.events.length > 0 && (
            <div style={{ fontSize: 11, color: ui.amberSoft }}>@frame events are for Python programs that use pygame; this language ignores them.</div>
          )}
        </div>
      )}
    </div>
  )
}
