import { useState } from 'react'
import Prism from '../../utils/prism.js'
import '../../styles/prism-blog.css'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-markup-templating'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-lua'
import 'prismjs/components/prism-r'
import 'prismjs/components/prism-julia'
import 'prismjs/components/prism-haskell'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-scala'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-powershell'
import 'prismjs/components/prism-perl'

// Shared between the interactive blog CodeBlock and the read-only lesson
// StaticCodeBlock — the syntax highlighting, language labels, and copy
// button should look and behave identically everywhere code is shown;
// only whether it can also be edited/run is caller-specific.

export const LANG_LABEL = {
  python: 'Python', py: 'Python',
  javascript: 'JavaScript', js: 'JavaScript',
  typescript: 'TypeScript', ts: 'TypeScript',
  tsx: 'TSX', jsx: 'JSX',
  matlab: 'MATLAB', m: 'MATLAB',
  cpp: 'C++', 'c++': 'C++', c: 'C',
  java: 'Java', rust: 'Rust', go: 'Go', ruby: 'Ruby',
  php: 'PHP', swift: 'Swift', r: 'R', julia: 'Julia',
  lua: 'Lua', haskell: 'Haskell',
  csharp: 'C#', 'c#': 'C#', scala: 'Scala', kotlin: 'Kotlin',
  perl: 'Perl', bash: 'Bash', sh: 'Bash', shell: 'Bash',
  powershell: 'PowerShell', ps1: 'PowerShell',
  html: 'HTML', css: 'CSS', json: 'JSON',
}

// Maps Monaco theme name → editor background hex, so the static (Prism) view
// uses the same background as the edit-mode Monaco panel.
export const THEME_BG = {
  'open-calc-dark':  '#07111e',
  'open-calc-light': '#f3f9ff',
  'github-light':    '#ffffff',
  'github-dark':     '#0d1117',
  'dracula':         '#282a36',
  'nord-dark':       '#2e3440',
  'monokai':         '#272822',
  'tokyo-night':     '#1a1b26',
  'one-dark':        '#282c34',
  'solarized-dark':  '#002b36',
  'catppuccin':      '#1e1e2e',
  'openmat-dark':    '#081423',
  'openmat-light':   '#eef7ff',
}

export const PRISM_LANG = {
  'c++': 'cpp', 'c#': 'csharp',
  sh: 'bash', shell: 'bash',
  m: 'plaintext', matlab: 'plaintext',
  tsx: 'tsx', jsx: 'jsx',
}

export function CopyButton({ getText }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API unavailable (e.g. non-https) — silently ignore
    }
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy code"
      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors px-2 py-0.5 rounded"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

// Prism tokenizes `{`, `(`, `[` as flat "punctuation" tokens with no idea of
// nesting depth. This walks Prism's already-escaped HTML output, treating
// any `<...>` run as an opaque tag (safe — Prism escapes literal `<`/`>` in
// code as `&lt;`/`&gt;`, so a raw `<` in the string is always one of Prism's
// own tags, never source text) and wraps each bracket character found in a
// real text run with a depth-indexed span, cycling through RAINBOW_DEPTH
// colors defined in prism-blog.css. Depth is shared across all three
// bracket kinds, matching how editors' rainbow-bracket features read visual
// nesting (JSX/TSX mixes `{}`/`()`/`[]` constantly within one nested shape).
const RAINBOW_DEPTH = 6
const OPEN_BRACKETS = new Set(['{', '(', '['])
const CLOSE_BRACKETS = new Set(['}', ')', ']'])

export function rainbowifyBrackets(html) {
  let depth = 0
  return html.replace(/(<[^>]+>)|([^<]+)/g, (_match, tag, text) => {
    if (tag) return tag
    let out = ''
    for (const ch of text) {
      if (OPEN_BRACKETS.has(ch)) {
        out += `<span class="rainbow-bracket-${depth % RAINBOW_DEPTH}">${ch}</span>`
        depth += 1
      } else if (CLOSE_BRACKETS.has(ch)) {
        depth = Math.max(0, depth - 1)
        out += `<span class="rainbow-bracket-${depth % RAINBOW_DEPTH}">${ch}</span>`
      } else {
        out += ch
      }
    }
    return out
  })
}

export function HighlightedCode({ code, language }) {
  const prismKey = PRISM_LANG[language] || language
  const grammar = Prism.languages[prismKey]
  const highlighted = grammar
    ? Prism.highlight(code, grammar, prismKey)
    : code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = rainbowifyBrackets(highlighted)
  const lineCount = code.split('\n').length
  const gutterWidth = String(lineCount).length
  const lineNums = Array.from({ length: lineCount }, (_, i) =>
    String(i + 1).padStart(gutterWidth, ' ')
  ).join('\n')
  return (
    <div className="flex overflow-hidden">
      <pre
        aria-hidden
        className="m-0 py-4 pl-4 pr-3 leading-[1.6] select-none text-slate-500 dark:text-slate-600 border-r border-slate-600/25 flex-shrink-0 bg-transparent"
        style={{ fontFamily: 'inherit', fontSize: 'inherit' }}
      >
        {lineNums}
      </pre>
      <pre
        className="m-0 py-4 pl-4 pr-4 leading-[1.6] overflow-x-auto bg-transparent flex-1 min-w-0"
        style={{ fontFamily: 'inherit', fontSize: 'inherit' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
