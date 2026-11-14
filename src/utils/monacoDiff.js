// Diff colouring for read-only Monaco code blocks.
//
// Monaco has no "diff" language, so a ```diff fence showed as plain text.
// Instead of a tokenizer we add whole-line decorations: a line starting with
// "+" gets a green background and a "+" gutter bar, "-" gets red, "@@" hunk
// headers get blue. "+++"/"---" file headers are left as plain context.
//
// Fences:
//   ```diff          plain text, coloured by line
//   ```diff-python   Python syntax colours AND diff line colours
//
// Use: const { monacoLang, isDiff } = parseDiffLang(lang)
//      <Editor language={monacoLang} onMount={(ed, m) => isDiff && applyDiffDecorations(ed, m)} />

const STYLE_ID = 'monaco-diff-line-styles'

const CSS = `
.monaco-editor .md-diff-add { background: rgba(46, 160, 67, 0.18); }
.monaco-editor .md-diff-del { background: rgba(248, 81, 73, 0.18); }
.monaco-editor .md-diff-hunk { background: rgba(56, 139, 253, 0.12); }
.monaco-editor .md-diff-add-gutter { border-left: 3px solid #2ea043; margin-left: 2px; }
.monaco-editor .md-diff-del-gutter { border-left: 3px solid #f85149; margin-left: 2px; }
.monaco-editor .md-diff-hunk-gutter { border-left: 3px solid #388bfd; margin-left: 2px; }
.monaco-editor .md-diff-add-text { color: #3fb950 !important; }
.monaco-editor .md-diff-del-text { color: #f85149 !important; }
.monaco-editor .md-diff-hunk-text { color: #58a6ff !important; }
`

function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = CSS
  document.head.appendChild(el)
}

// "diff" -> plaintext; "diff-python" / "diff_py" -> that language.
export function parseDiffLang(lang, aliases = {}) {
  const m = /^diff(?:[-_](.+))?$/i.exec(lang || '')
  if (!m) return { isDiff: false, monacoLang: aliases[lang] || lang, baseLang: lang }
  const base = (m[1] || '').toLowerCase()
  return { isDiff: true, baseLang: base, monacoLang: base ? aliases[base] || base : 'plaintext' }
}

// Which kind of diff line is this? 'add' | 'del' | 'hunk' | null
export function classifyDiffLine(line) {
  if (line.startsWith('+++') || line.startsWith('---')) return null
  if (line.startsWith('+')) return 'add'
  if (line.startsWith('-')) return 'del'
  if (line.startsWith('@@')) return 'hunk'
  return null
}

// colourText: true for plain ```diff (the whole line goes green/red);
// false for ```diff-<lang> so the language's own syntax colours stay.
export function applyDiffDecorations(editor, monaco, { colourText = true } = {}) {
  ensureStyles()
  const model = editor.getModel()
  if (!model) return null
  const decorations = []
  for (let n = 1; n <= model.getLineCount(); n++) {
    const kind = classifyDiffLine(model.getLineContent(n))
    if (!kind) continue
    decorations.push({
      range: new monaco.Range(n, 1, n, model.getLineMaxColumn(n)),
      options: {
        isWholeLine: true,
        className: `md-diff-${kind}`,
        linesDecorationsClassName: `md-diff-${kind}-gutter`,
        ...(colourText || kind === 'hunk' ? { inlineClassName: `md-diff-${kind}-text` } : {}),
      },
    })
  }
  return editor.createDecorationsCollection(decorations)
}
