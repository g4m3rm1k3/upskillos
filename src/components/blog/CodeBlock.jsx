import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { runCode, RUNNABLE_LANGS, WANDBOX_COMPILER, IMG_SENTINEL, IMG_SENTINEL_END } from '../../utils/codeRunner.js'
import { useGlobalTheme } from '../../context/ThemeContext.jsx'
import { setupOpenCalcMonaco } from '../../utils/monacoThemes.js'
import { LANG_LABEL, THEME_BG, CopyButton, HighlightedCode } from '../markdown/codeDisplay.jsx'
import CodeSettingsModal, { getCodeFontFamily, getCodeFontSize } from '../ui/CodeSettingsModal.jsx'
import { Settings } from 'lucide-react'

// ── "Open With" helpers — hand code off to a standalone lab via localStorage,
// mirroring the pattern MarkdownHub.jsx already uses for its own code blocks.
const CODELENS_LANG_MAP = { javascript: 'js', js: 'js', typescript: 'ts', ts: 'ts', python: 'py', py: 'py', go: 'go' }

function openInCodeLens(code, lang, navigateFn) {
  try {
    const clLang = CODELENS_LANG_MAP[lang] ?? 'js'
    localStorage.setItem('codelens-handoff', JSON.stringify({ code, lang: clLang, ts: Date.now() }))
    navigateFn('/codelens')
  } catch (e) {
    console.error('Failed to hand off to CodeLens:', e)
  }
}

// The Abstraction Visualizer only traces plain JavaScript (no lang param, no
// TypeScript stripping in "Your Code" mode) — gate the button accordingly.
function openInAbstractionViz(code, navigateFn) {
  try {
    localStorage.setItem('abstraction-viz-handoff', JSON.stringify({ code, ts: Date.now() }))
    navigateFn('/lab/abstraction-viz')
  } catch (e) {
    console.error('Failed to hand off to Abstraction Visualizer:', e)
  }
}

const MonacoEditor = lazy(() => import('@monaco-editor/react').then((m) => ({ default: m.default })))

const MONACO_LANG = {
  python: 'python', py: 'python',
  javascript: 'javascript', js: 'javascript',
  typescript: 'typescript', ts: 'typescript',
  matlab: 'plaintext', m: 'plaintext',
  cpp: 'cpp', 'c++': 'cpp', c: 'c',
  java: 'java', rust: 'rust', go: 'go', ruby: 'ruby',
  php: 'php', swift: 'swift', r: 'r', julia: 'julia',
  lua: 'lua', haskell: 'haskell',
  csharp: 'csharp', 'c#': 'csharp', scala: 'scala', kotlin: 'kotlin',
  perl: 'perl', bash: 'shell', sh: 'shell', shell: 'shell',
  powershell: 'powershell', ps1: 'powershell',
}

const PISTON_LANGS = new Set(['kotlin', 'powershell', 'ps1'])

const STDIN_PATTERNS = {
  python: /\binput\s*\(/, py: /\binput\s*\(/,
  c: /\bscanf\s*\(|\bfgets\s*\(|\bgetchar\s*\(/,
  cpp: /\bscanf\s*\(|\bcin\s*>>|\bstd::cin\b|\bgetline\s*\(/, 'c++': /\bscanf\s*\(|\bcin\s*>>|\bstd::cin\b|\bgetline\s*\(/,
  java: /\bScanner\b|\bSystem\.in\b/,
  rust: /\bstdin\(\)|\bread_line\b/,
  go: /\bfmt\.Scan\b|\bbufio\.NewReader\b/,
  ruby: /\bgets\b/,
  kotlin: /\breadLine\s*\(\)/,
  haskell: /\bgetLine\b|\bgetContents\b/,
  bash: /\bread\s/, sh: /\bread\s/, shell: /\bread\s/,
  javascript: /\bprompt\s*\(/, js: /\bprompt\s*\(/,
}

function needsStdin(lang, code) {
  const re = STDIN_PATTERNS[lang]
  return re ? re.test(code) : false
}

// Splits output on __OC_IMG__....__OC_IMG_END__ markers and renders
// base64 PNG images inline alongside any text output.
function OutputBody({ output, isError, isDarkGlobal }) {
  const textClass = `m-0 px-4 pb-3 text-[13px] leading-[1.6] font-mono overflow-x-auto whitespace-pre-wrap ${
    isError
      ? isDarkGlobal ? 'text-red-300' : 'text-red-700'
      : isDarkGlobal ? 'text-emerald-300' : 'text-emerald-800'
  }`

  const parts = output.split(new RegExp(`(${IMG_SENTINEL}[\\s\\S]*?${IMG_SENTINEL_END})`))

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith(IMG_SENTINEL) && part.endsWith(IMG_SENTINEL_END)) {
          const b64 = part.slice(IMG_SENTINEL.length, part.length - IMG_SENTINEL_END.length).trim()
          return (
            <div key={i} className="px-4 pb-3">
              <img
                src={`data:image/png;base64,${b64}`}
                alt="matplotlib figure"
                className="max-w-full rounded-lg border border-slate-200 dark:border-slate-700"
                style={{ display: 'block' }}
              />
            </div>
          )
        }
        const text = part.trim()
        if (!text) return null
        return <pre key={i} className={textClass}>{text}</pre>
      })}
    </>
  )
}

/**
 * @param {{ language?: string, code: string, cellIndex?: number,
 * getPriorContext?: (index: number | undefined, language: string, code: string) => string,
 * onCodeChange?: (index: number | undefined, language: string, code: string) => void }} props
 */
export default function CodeBlock({ language = '', code, cellIndex, getPriorContext, onCodeChange }) {
  const { isDarkGlobal, themeStyles, codeTypography } = useGlobalTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const navigate = useNavigate()
  const trimmedCode = code.trimEnd()
  const isTerminalOutput = !language
  const lang = language.toLowerCase()
  const isRunnable = RUNNABLE_LANGS.has(lang)
  const isPiston = PISTON_LANGS.has(lang)
  const isWandbox = lang in WANDBOX_COMPILER
  const isCodeLensable = CODELENS_LANG_MAP[lang] != null
  const isAbstractionVizable = lang === 'javascript' || lang === 'js'
  const label = LANG_LABEL[lang] || language || 'output'
  const monacoLang = MONACO_LANG[lang] || 'plaintext'
  const monacoTheme = themeStyles?.monaco ?? (isDarkGlobal ? 'vs-dark' : 'vs')
  const codeBgColor = THEME_BG[monacoTheme] ?? (isDarkGlobal ? '#1e1e2e' : '#f6f8fa')

  const [editing, setEditing] = useState(false)
  const [editorCode, setEditorCode] = useState(trimmedCode)
  const [output, setOutput] = useState(null)
  const [running, setRunning] = useState(false)
  const [isError, setIsError] = useState(false)
  const [stdinValue, setStdinValue] = useState('')
  const showStdin = isRunnable && needsStdin(lang, editorCode)

  const fontSizePx = parseInt(getCodeFontSize(codeTypography?.fontSize)) || 14
  const lineHeight = fontSizePx * 1.5
  const lineCount = editorCode.split('\n').length
  const editorHeight = Math.min(Math.max(lineCount * lineHeight + 24, 80), 560)

  const prevCode = useRef(trimmedCode)
  useEffect(() => {
    if (prevCode.current !== trimmedCode) {
      prevCode.current = trimmedCode
      setEditorCode(trimmedCode)
      setOutput(null)
    }
  }, [trimmedCode])

  function handleEditorChange(v) {
    const updated = v ?? ''
    setEditorCode(updated)
    onCodeChange?.(cellIndex, lang, updated)
  }

  async function handleRun() {
    setRunning(true)
    setOutput(null)
    setIsError(false)
    onCodeChange?.(cellIndex, lang, editorCode)
    try {
      const priorCode = getPriorContext ? getPriorContext(cellIndex, lang, editorCode) : ''
      const result = await runCode(language, editorCode, priorCode, stdinValue)
      const err = typeof result === 'string' && (result.startsWith('Error:') || result.startsWith('No runner'))
      setOutput(result || '(no output)')
      setIsError(err)
    } catch (e) {
      setOutput('Error: ' + e.message)
      setIsError(true)
    } finally {
      setRunning(false)
    }
  }

  // Terminal / plain output block
  if (isTerminalOutput) {
    return (
      <div className={`my-3 rounded-xl overflow-hidden border ${isDarkGlobal ? 'border-slate- bg-slate-' : 'border-slate-200 bg-white'}`}>
        <div className={`px-4 py-1.5 flex items-center gap-2 ${isDarkGlobal ? 'bg-slate-' : 'bg-slate-100 border-b border-slate-200'}`}>
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          <span className={`ml-2 text-xs font-mono flex-1 ${isDarkGlobal ? 'text-slate-' : 'text-slate-500'}`}>output</span>
          <CopyButton getText={() => trimmedCode} />
        </div>
        <pre className={`m-0 px-4 py-3 text-[13px] leading-[1.6] font-mono overflow-x-auto whitespace-pre-wrap ${isDarkGlobal ? 'text-emerald-300' : 'text-slate-700'}`}>
          {trimmedCode}
        </pre>
      </div>
    )
  }

  return (
    <div className={`my-4 rounded-xl border border-indigo-500/20 shadow-[0_4px_20px_-5px_rgba(99,102,241,0.3),inset_0_0_0_1px_rgba(99,102,241,0.15)] transition-all duration-300 hover:shadow-[0_8px_30px_-5px_rgba(99,102,241,0.4),inset_0_0_0_1px_rgba(99,102,241,0.25),0_0_15px_rgba(99,102,241,0.2)]`}>
      {/* Header */}
      <div className={`rounded-t-xl flex items-center justify-between px-4 py-2.5 border-b border-indigo-500/30 border-t border-indigo-500/40 bg-gradient-to-br ${isDarkGlobal ? 'from-slate-900 via-indigo-900/15 to-sky-900/10' : 'from-slate-100 via-indigo-500/10 to-sky-500/5'}`}>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-black uppercase tracking-[0.15em] bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent font-mono drop-shadow-[0_0_10px_rgba(129,140,248,0.2)]">
            {label}
          </span>
          {isWandbox && isRunnable && (
            <span className={`text-[10px] font-mono ${isDarkGlobal ? 'text-slate-500' : 'text-slate-400'}`}>via Wandbox</span>
          )}
          {!isWandbox && isPiston && isRunnable && (
            <span className={`text-[10px] font-mono ${isDarkGlobal ? 'text-slate-500' : 'text-slate-400'}`}>via Piston</span>
          )}
          {(lang === 'matlab' || lang === 'm') && (
            <span className={`text-[10px] font-mono ${isDarkGlobal ? 'text-slate-500' : 'text-slate-400'}`}>via OpenMAT</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 relative">
          <button 
            onClick={() => setSettingsOpen(!settingsOpen)} 
            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors px-2 py-0.5 rounded flex items-center justify-center"
            title="Code Settings"
          >
            <Settings className="w-3 h-3" />
          </button>
          <CodeSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
          <CopyButton getText={() => editing ? editorCode : trimmedCode} />
          {editing && editorCode !== trimmedCode && (
            <button
              onClick={() => { setEditorCode(trimmedCode); setOutput(null); onCodeChange?.(cellIndex, lang, trimmedCode) }}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors px-2 py-0.5 rounded"
            >
              Reset
            </button>
          )}
          {isCodeLensable && (
            <button
              onClick={() => openInCodeLens(editing ? editorCode : trimmedCode, lang, navigate)}
              title="Open in CodeLens visualizer"
              className={`text-[11px] transition-colors px-2 py-0.5 rounded border ${isDarkGlobal ? 'text-indigo-300 hover:text-indigo-200 border-indigo-500/40 hover:border-indigo-400/60' : 'text-indigo-600 hover:text-indigo-700 border-indigo-300 hover:border-indigo-400'}`}
            >
              ↗ CodeLens
            </button>
          )}
          {isAbstractionVizable && (
            <button
              onClick={() => openInAbstractionViz(editing ? editorCode : trimmedCode, navigate)}
              title="Open in Abstraction Visualizer"
              className={`text-[11px] transition-colors px-2 py-0.5 rounded border ${isDarkGlobal ? 'text-violet-300 hover:text-violet-200 border-violet-500/40 hover:border-violet-400/60' : 'text-violet-600 hover:text-violet-700 border-violet-300 hover:border-violet-400'}`}
            >
              ↗ Abstraction
            </button>
          )}
          <button 
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-md border transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm hover:-translate-y-px active:translate-y-0 ${
              isDarkGlobal 
                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-400 hover:shadow-[0_2px_10px_rgba(99,102,241,0.2)]'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-500/40 hover:text-indigo-600 hover:shadow-[0_2px_10px_rgba(99,102,241,0.2)]'
            }`}
            title="Code Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {isRunnable && !editing && (
            <button
              onClick={() => setEditing(true)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-md border transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm hover:-translate-y-px active:translate-y-0 ${
                isDarkGlobal 
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-sky-500/20 hover:border-sky-500/50 hover:text-sky-400 hover:shadow-[0_2px_10px_rgba(14,165,233,0.2)]'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-sky-50 hover:border-sky-500/40 hover:text-sky-600 hover:shadow-[0_2px_10px_rgba(14,165,233,0.2)]'
              }`}
            >
              Edit
            </button>
          )}

          {isRunnable && (
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-4 py-1.5 rounded-md bg-gradient-to-br from-indigo-500 to-sky-500 text-white border-none shadow-[0_2px_10px_rgba(99,102,241,0.4)] hover:shadow-[0_4px_15px_rgba(99,102,241,0.6)] transition-all duration-200 hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
            >
              {running ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running…
                </>
              ) : (
                <>▶ Run</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Code area */}
      <div style={{ backgroundColor: codeBgColor }}>
        {editing ? (
          <Suspense fallback={<div className="px-4 py-3 text-slate-400 text-sm font-mono">Loading editor…</div>}>
            <MonacoEditor
              height={`${editorHeight}px`}
              language={monacoLang}
              value={editorCode}
              onChange={handleEditorChange}
              theme={monacoTheme}
              beforeMount={setupOpenCalcMonaco}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: codeTypography ? parseInt(getCodeFontSize(codeTypography.fontSize)) : 13,
                fontFamily: codeTypography ? getCodeFontFamily(codeTypography.font) : "'JetBrains Mono', Consolas, 'Courier New', monospace",
                fontLigatures: codeTypography ? codeTypography.ligatures : true,
                padding: { top: 12, bottom: 12 },
                wordWrap: 'off',
                folding: false,
                renderLineHighlight: 'gutter',
              }}
            />
          </Suspense>
        ) : (
          <div 
        className="rounded-b-xl overflow-hidden"
        style={{ 
          backgroundColor: codeBgColor, 
          color: isDarkGlobal ? '#ccc' : '#24292e',
          fontFamily: codeTypography ? getCodeFontFamily(codeTypography.font) : undefined,
          fontSize: codeTypography ? getCodeFontSize(codeTypography.fontSize) : undefined,
          fontVariantLigatures: codeTypography?.ligatures ? 'normal' : 'none'
        }}
      >
            <HighlightedCode code={trimmedCode} language={lang} />
          </div>
        )}
      </div>

      {/* Stdin panel — shown when code contains input calls */}
      {showStdin && (
        <div className="border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 dark:bg-amber-950/20">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Stdin</span>
              <span className="text-[10px] text-amber-500/70 dark:text-amber-600/70">one value per line</span>
            </div>
            {stdinValue && (
              <button
                onClick={() => setStdinValue('')}
                className="text-[10px] text-amber-500 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={stdinValue}
            onChange={e => setStdinValue(e.target.value)}
            placeholder="Type program inputs here…"
            rows={Math.min(Math.max(stdinValue.split('\n').length, 2), 6)}
            spellCheck={false}
            className="w-full px-4 py-2.5 text-[13px] font-mono leading-relaxed bg-amber-50/60 dark:bg-amber-950/10 text-slate-800 dark:text-slate-200 border-0 outline-none resize-none placeholder-amber-400/60 dark:placeholder-amber-700/60"
          />
        </div>
      )}

      {/* Output panel */}
      {output !== null && (
        <div className={`border-t ${isError ? isDarkGlobal ? 'border-red-500/30 bg-red-950/40' : 'border-red-200 bg-red-50' : isDarkGlobal ? 'border-emerald-500/20 bg-slate-' : 'border-emerald-200 bg-emerald-50/50'}`}>
          <div className="flex items-center justify-between px-3 py-1">
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isError ? isDarkGlobal ? 'text-red-400' : 'text-red-600' : isDarkGlobal ? 'text-emerald-500' : 'text-emerald-700'}`}>
              {isError ? 'Error' : 'Output'}
            </span>
            <CopyButton getText={() => output.replace(new RegExp(`${IMG_SENTINEL}[\\s\\S]*?${IMG_SENTINEL_END}`, 'g'), '[image]')} />
          </div>
          <OutputBody output={output} isError={isError} isDarkGlobal={isDarkGlobal} />
        </div>
      )}
    </div>
  )
}
