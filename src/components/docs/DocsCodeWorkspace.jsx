import { useCallback, useEffect, useRef, useState } from 'react'
import { EXAMPLE_PROJECT } from '../../utils/exampleProject.js'
import Editor from '@monaco-editor/react'
import { ChevronDown, ChevronLeft, ChevronRight, Download, ExternalLink, FilePlus, FolderPlus, Play, RotateCcw, Upload, X } from 'lucide-react'
import { setupOpenCalcMonaco } from '../../utils/monacoThemes.js'
import { executeScript } from '../../engines/openmat/openmatEngine.js'
import WorkspaceTerminal from './WorkspaceTerminal.jsx'
import { useIsDark } from '../../utils/useIsDark.js'
import { useGlobalTheme } from '../../context/ThemeContext.jsx'
import { getCodeFontFamily, getCodeFontSize } from '../ui/CodeSettingsModal.jsx'
import DesktopDocsWorkspace from './DesktopDocsWorkspace.jsx'
import WorkspaceOutputDialog from './WorkspaceOutputDialog.jsx'
import { isDesktop } from '../../labs/project-studio/useProjectFs.js'



// ── Tree item helpers ─────────────────────────────────────────────────────────
const EXT_LANG = {
  html: 'html', css: 'css', js: 'javascript', ts: 'typescript',
  py: 'python', json: 'json', sh: 'shell', bash: 'shell', zsh: 'shell',
  cpp: 'cpp', c: 'c', txt: 'plaintext', md: 'markdown', m: 'openmat',
  sql: 'sql', lua: 'lua', rb: 'ruby', r: 'r', php: 'php',
  bf: 'brainfuck', rs: 'rust', go: 'go', java: 'java', kt: 'kotlin',
  swift: 'swift', cs: 'csharp', scss: 'scss', yaml: 'yaml', yml: 'yaml',
  toml: 'plaintext', xml: 'xml', csv: 'plaintext',
}
const LANG_DEFAULT_NAME = {
  html: 'index.html', css: 'style.css', javascript: 'script.js',
  typescript: 'main.ts', python: 'main.py', shell: 'script.sh',
  cpp: 'main.cpp', c: 'main.c', plaintext: 'notes.txt', openmat: 'script.m',
  sql: 'query.sql', lua: 'script.lua', ruby: 'script.rb', r: 'analysis.r',
  php: 'index.php', brainfuck: 'program.bf', rust: 'main.rs', go: 'main.go',
  java: 'Main.java', kotlin: 'Main.kt', swift: 'main.swift', csharp: 'Program.cs',
  yaml: 'config.yaml', xml: 'data.xml',
  json: 'data.json', markdown: 'README.md', scheme: 'main.scm',
}

/**
 * Returns the next available auto-generated filename for a language.
 * - First send: uses LANG_DEFAULT_NAME exactly (e.g. "Main.java")
 * - Subsequent sends: appends _2, _3, … for each file whose name still
 *   matches the default base pattern (renamed files are excluded from count).
 * Example: Main.java exists → Main_2.java; rename that → next is Main_2.java again.
 */
function nextAutoName(lang, items) {
  const defaultName = LANG_DEFAULT_NAME[lang] || 'file.txt'
  const dotIdx = defaultName.lastIndexOf('.')
  const stem = dotIdx >= 0 ? defaultName.slice(0, dotIdx) : defaultName
  const ext  = dotIdx >= 0 ? defaultName.slice(dotIdx) : ''           // e.g. ".java"

  // Collect names already taken by auto-named files (stem or stem_N pattern)
  const autoPattern = new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(_\\d+)?${ext.replace('.', '\\.')}$`, 'i')
  const existingFiles = items.filter(i => i.type === 'file')
  const taken = new Set(existingFiles.filter(f => autoPattern.test(f.name)).map(f => f.name.toLowerCase()))

  if (!taken.has(defaultName.toLowerCase())) return defaultName

  let n = 2
  while (true) {
    const candidate = `${stem}_${n}${ext}`
    if (!taken.has(candidate.toLowerCase())) return candidate
    n++
  }
}


const LANG_DOT = {
  html: '#e34c26', css: '#264de4', javascript: '#f0c000',
  typescript: '#3178c6', python: '#4B8BBE', json: '#6b7280',
  shell: '#4ade80', cpp: '#9ca3af', c: '#9ca3af',
  plaintext: '#475569', markdown: '#60a5fa', openmat: '#e04c28',
  sql: '#f29111', lua: '#000080', ruby: '#cc342d', r: '#276dc3',
  php: '#777bb4', brainfuck: '#9ca3af', rust: '#ce422b', go: '#00add8',
  java: '#b07219', kotlin: '#7f52ff', swift: '#f05138', csharp: '#178600',
  scss: '#c6538c', yaml: '#cb171e', xml: '#0060ac',
}

function extLang(name) {
  return EXT_LANG[name.split('.').pop().toLowerCase()] || 'plaintext'
}

let _uid = 10
function makeFile(name, content = '', parentId = null) {
  return { id: `f${++_uid}`, type: 'file', name, content, language: extLang(name), parentId }
}
function makeFolder(name, parentId = null) {
  return { id: `f${++_uid}`, type: 'folder', name, open: true, parentId }
}

// ── Error overlay injected into every Preview bundle ─────────────────────────
const PREVIEW_ERROR_OVERLAY = `<style>#__pe{display:none;position:fixed;inset:0;background:rgba(10,10,10,.92);color:#f87171;font-family:'JetBrains Mono',monospace;padding:24px;z-index:99999;white-space:pre-wrap;font-size:12px;line-height:1.6;overflow-y:auto}</style><div id="__pe"></div><script>function __showErr(msg){var e=document.getElementById('__pe');if(e){e.style.display='block';e.textContent=msg}}window.onerror=function(m,_s,l,c,err){__showErr('\\u274c JavaScript Error\\n\\n'+(err&&err.stack||m)+'\\n\\nat line '+l+(c?':'+c:''));return true};window.addEventListener('unhandledrejection',function(e){__showErr('\\u274c Unhandled Promise Rejection\\n\\n'+(e.reason&&e.reason.stack||String(e.reason)))})<\/script>`

// ── Bundle ────────────────────────────────────────────────────────────────────
function buildHtmlBundle(files) {
  const html = files.find(f => extLang(f.name) === 'html')
  const css = files.filter(f => extLang(f.name) === 'css').map(f => f.content).join('\n')
  const js = files.filter(f => ['javascript', 'typescript'].includes(extLang(f.name))).map(f => f.content).join('\n\n')

  let doc = html?.content || '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>'
  if (css && !doc.includes('<style>'))
    doc = doc.includes('</head>') ? doc.replace('</head>', `<style>\n${css}\n</style>\n</head>`) : `<style>\n${css}\n</style>\n` + doc
  if (js)
    doc = doc.includes('</body>') ? doc.replace('</body>', `<script>\n${js}\n</script>\n</body>`) : doc + `\n<script>\n${js}\n</script>`
  // Inject error overlay at the start of <body> so errors always surface
  doc = doc.includes('<body') ? doc.replace(/(<body[^>]*>)/, `$1\n${PREVIEW_ERROR_OVERLAY}`) : PREVIEW_ERROR_OVERLAY + doc
  return doc
}

// ── Colored dot for file language ─────────────────────────────────────────────
function LangDot({ name, size = 8 }) {
  return <span style={{ display: 'inline-block', flexShrink: 0, width: size, height: size, borderRadius: '50%', background: LANG_DOT[extLang(name)] || '#475569' }} />
}

// ── LocalStorage persistence ──────────────────────────────────────────────────
const LS_WS = 'studio_workspace_v1'

function loadSavedWorkspace() {
  try {
    const raw = localStorage.getItem(LS_WS)
    if (!raw) return null
    const { items, activeId } = JSON.parse(raw)
    if (!Array.isArray(items) || !items.length) return null
    // Advance _uid past any saved IDs to prevent collisions
    items.forEach(i => {
      const n = parseInt(i.id.replace(/\D/g, ''), 10)
      if (!isNaN(n) && n > _uid) _uid = n
    })
    return { items, activeId }
  } catch { return null }
}

function openInOpenMat(code, fileName) {
  try {
    const docs = (() => {
      try { return JSON.parse(localStorage.getItem('openmat-documents') || '[]') } catch { return [] }
    })()
    const id = `doc-studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const name = fileName || 'studio-import.m'
    const newDoc = { id, name, code }
    const updated = Array.isArray(docs) ? [...docs, newDoc] : [newDoc]
    localStorage.setItem('openmat-documents', JSON.stringify(updated))
    localStorage.setItem('openmat-active-document-id', JSON.stringify(id))
    window.location.href = '/#/openmat'
  } catch (e) {
    console.error('Failed to hand off to OpenMAT:', e)
  }
}

const _DEFAULT_FILE = makeFile('script.js', '// Welcome to Code Along!\nconsole.log("Hello!");\n')

const LS_WELCOME = 'oc-studio-welcome-seen'

// ── Component ─────────────────────────────────────────────────────────────────
export default function DocsCodeWorkspace(props) {
  const desktop = isDesktop()
  const [scratchpad, setScratchpad] = useState(!desktop)
  return <div className="flex flex-col h-full min-h-0">
    <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs border-b border-slate-500/20">
      <span>{scratchpad ? 'Browser scratchpad · limited runtimes' : 'Desktop project · real files & shell'}</span>
      {desktop && <button className="underline" onClick={() => setScratchpad(v => !v)}>{scratchpad ? 'Open desktop project' : 'Open scratchpad'}</button>}
    </div>
    <div className={`${scratchpad ? 'flex' : 'hidden'} flex-col flex-1 min-h-0`}><BrowserDocsWorkspace {...props} pendingRun={scratchpad ? props.pendingRun : null} onCodeChange={scratchpad ? props.onCodeChange : null} /></div>
    {desktop && <div className={`${scratchpad ? 'hidden' : 'flex'} flex-col flex-1 min-h-0`}><DesktopDocsWorkspace {...props} pendingRun={scratchpad ? null : props.pendingRun} onCodeChange={scratchpad ? null : props.onCodeChange} /></div>}
  </div>
}

function BrowserDocsWorkspace({ activeTitle = 'Docs', pendingRun = null, onCodeChange = null, accentColor = '#0ea5e9', monacoTheme = null, themeUi = null }) {
  const [saved] = useState(loadSavedWorkspace)
  const [items, setItems] = useState(() => saved?.items ?? [_DEFAULT_FILE])
  const [activeId, setActiveId] = useState(() => saved?.activeId ?? _DEFAULT_FILE.id)

  // Show welcome banner when workspace has only the default file and user hasn't dismissed it
  const [showWelcome, setShowWelcome] = useState(() => {
    if (localStorage.getItem(LS_WELCOME)) return false
    if (!saved) return true   // brand new workspace
    const files = saved.items?.filter(i => i.type === 'file') ?? []
    return files.length === 1 && !files[0].content?.trim().replace('//', '').trim()
  })
  const [treeOpen, setTreeOpen] = useState(true)
  const [adding, setAdding] = useState(null)   // { type: 'file'|'folder', parentId }
  const [addingName, setAddingName] = useState('')
  const [pendingReplace, setPendingReplace] = useState(null)
  const [previewDoc, setPreviewDoc] = useState('')
  const [bottomTab, setBottomTab] = useState('terminal')  // 'terminal' | 'preview'
  const [outputOpen, setOutputOpen] = useState(false)
  const addInputRef = useRef(null)
  const terminalRef = useRef(null)
  const importFileRef = useRef(null)
  const monacoRef = useRef(null)  // holds the live Monaco editor instance
  const isDark = useIsDark()
  const { codeTypography } = useGlobalTheme()

  // Stable refs so effects never go stale
  const itemsRef = useRef(items)
  const activeIdRef = useRef(activeId)
  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => { activeIdRef.current = activeId }, [activeId])

  const files = items.filter(i => i.type === 'file')
  const activeFile = files.find(f => f.id === activeId) ?? files[0]

  // ── Auto-save workspace to localStorage ───────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(LS_WS, JSON.stringify({ items, activeId })) } catch {}
  }, [items, activeId])

  // ── Notify parent (Ada) when active file changes ──────────────────────────
  useEffect(() => {
    if (!onCodeChange) return
    onCodeChange({
      code: activeFile?.content ?? '',
      language: activeFile?.language ?? '',
      filename: activeFile?.name ?? '',
      // Pass full file objects so Ada can read every file in the workspace
      fileList: files.map(f => ({ name: f.name, language: f.language, content: f.content })),
      getTerminalOutput: () => terminalRef.current?.getOutput?.() ?? '',
    })
  }, [activeFile?.content, activeFile?.language, activeFile?.name, files.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Focus add-name input ───────────────────────────────────────────────────
  useEffect(() => { if (adding) addInputRef.current?.focus() }, [adding])

  // ── Inject code from docs ──────────────────────────────────────────────────
  useEffect(() => {
    if (!pendingRun) return
    const { code, language: lang } = pendingRun
    const currentItems = itemsRef.current
    const currentActiveId = activeIdRef.current

    const allFiles = currentItems.filter(i => i.type === 'file')
    const active = allFiles.find(f => f.id === currentActiveId)

    // Priority: active file if language matches, else first matching file, else create
    const target = active?.language === lang
      ? active
      : allFiles.find(f => f.language === lang) ?? null

    if (!target) {
      const newFile = makeFile(nextAutoName(lang, itemsRef.current), code)
      setItems(prev => [...prev, newFile])
      setActiveId(newFile.id)
      terminalRef.current?.print('Code loaded — press ▶ Run to execute.', 'info')
      setPreviewDoc('')
      return
    }

    setActiveId(target.id)
    setPreviewDoc('')

    if (!target.content?.trim()) {
      setItems(prev => prev.map(i => i.id === target.id ? { ...i, content: code } : i))
      monacoRef.current?.setValue(code)  // push to editor — defaultValue is stale if activeId didn't change
      terminalRef.current?.print('Code loaded — press ▶ Run to execute.', 'info')
    } else {
      setPendingReplace({ code, fileId: target.id, fileName: target.name })
    }
  }, [pendingRun])

  // ── Replace confirm / cancel ───────────────────────────────────────────────
  const confirmReplace = useCallback(() => {
    if (!pendingReplace) return
    setItems(prev => prev.map(i => i.id === pendingReplace.fileId ? { ...i, content: pendingReplace.code } : i))
    monacoRef.current?.setValue(pendingReplace.code)  // push to editor directly
    terminalRef.current?.print('Code loaded — press ▶ Run to execute.', 'info')
    setPendingReplace(null)
  }, [pendingReplace])

  const cancelReplace = useCallback(() => setPendingReplace(null), [])

  // ── Tree mutations ─────────────────────────────────────────────────────────
  const commitAdd = useCallback(() => {
    const name = addingName.trim()
    if (!name || !adding) { setAdding(null); setAddingName(''); return }
    const newItem = adding.type === 'folder'
      ? makeFolder(name, adding.parentId)
      : makeFile(name, '', adding.parentId)
    setItems(prev => [...prev, newItem])
    if (adding.type === 'file') setActiveId(newItem.id)
    setAdding(null)
    setAddingName('')
  }, [adding, addingName])

  const loadExampleProject = useCallback(() => {
    const newItems = EXAMPLE_PROJECT.map(({ name, content }) => makeFile(name, content))
    setItems(newItems)
    // Open README first
    const readme = newItems.find(f => f.name === 'README.md')
    if (readme) setActiveId(readme.id)
    setShowWelcome(false)
    localStorage.setItem(LS_WELCOME, '1')
    terminalRef.current?.print('Demo project loaded — try ▶ Run on game.ts, or open the Preview tab on index.html', 'success')
  }, [])

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false)
    localStorage.setItem(LS_WELCOME, '1')
  }, [])

  const deleteItem = useCallback((id) => {
    setItems(prev => {
      // Remove item and all descendants
      const toRemove = new Set()
      const queue = [id]
      while (queue.length) {
        const cur = queue.shift()
        toRemove.add(cur)
        prev.filter(i => i.parentId === cur).forEach(i => queue.push(i.id))
      }
      const next = prev.filter(i => !toRemove.has(i.id))
      const remaining = next.filter(i => i.type === 'file')
      if (remaining.length > 0 && toRemove.has(activeIdRef.current))
        setActiveId(remaining[0].id)
      return next.length ? next : INIT
    })
  }, [])

  const toggleFolder = useCallback((id) => {
    setItems(prev => prev.map(i => i.id === id && i.type === 'folder' ? { ...i, open: !i.open } : i))
  }, [])

  const updateContent = useCallback((value) => {
    setItems(prev => prev.map(i => i.id === activeId ? { ...i, content: value ?? '' } : i))
  }, [activeId])

  // ── Run — delegates to terminal ───────────────────────────────────────────
  const run = useCallback(() => {
    const af = files.find(f => f.id === activeId) ?? files[0]
    if (!af) return
    setBottomTab('terminal')
    setOutputOpen(true)
    terminalRef.current?.run(af, files)
  }, [files, activeId])

  // ── Preview callback from terminal ────────────────────────────────────────
  const handlePreview = useCallback((doc) => {
    setPreviewDoc(doc)
    setBottomTab('preview')
    setOutputOpen(true)
  }, [])

  const clearOutput = useCallback(() => {
    terminalRef.current?.clear()
    setPreviewDoc('')
  }, [])

  // ── Import files from disk ─────────────────────────────────────────────────
  const onImportFiles = useCallback(async (e) => {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!picked.length) return
    const newFiles = await Promise.all(picked.map(async (f) => {
      const content = await f.text()
      return makeFile(f.name, content)
    }))
    setItems(prev => [...prev, ...newFiles])
    setActiveId(newFiles[newFiles.length - 1].id)
    terminalRef.current?.print(`Imported ${newFiles.map(f => f.name).join(', ')}`, 'success')
  }, [])

  // ── Download all files as ZIP ─────────────────────────────────────────────
  const downloadZip = useCallback(async () => {
    // Dynamically load JSZip from CDN if not already loaded
    if (!window.JSZip) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
        s.onload = resolve
        s.onerror = reject
        document.head.appendChild(s)
      })
    }
    const zip = new window.JSZip()
    files.forEach(f => zip.file(f.name, f.content))
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'workspace.zip'
    a.click()
    URL.revokeObjectURL(url)
  }, [files])


  // ── Recursive tree renderer ────────────────────────────────────────────────
  function renderTree(parentId = null, depth = 0) {
    return items
      .filter(i => (i.parentId ?? null) === (parentId ?? null))
      .map(item => {
        if (item.type === 'folder') {
          return (
            <div key={item.id}>
              <div
                className={`group flex items-center gap-1 px-1 py-1 cursor-pointer select-none transition-colors ${D ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'}`}
                style={{ paddingLeft: 6 + depth * 12 }}
                onClick={() => toggleFolder(item.id)}
              >
                {item.open
                  ? <ChevronDown className={`w-3 h-3 shrink-0 ${txt2}`} />
                  : <ChevronRight className={`w-3 h-3 shrink-0 ${txt2}`} />}
                <span className="text-amber-500 text-[10px]">📁</span>
                <span className="flex-1 truncate text-[11px] font-semibold">{item.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); deleteItem(item.id) }}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500 rounded p-0.5 transition-all"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
              {item.open && renderTree(item.id, depth + 1)}
            </div>
          )
        }

        const isActive = item.id === activeId
        return (
          <div
            key={item.id}
            onClick={() => setActiveId(item.id)}
            className={`group flex items-center gap-1.5 py-1 cursor-pointer text-xs transition-colors select-none ${
              isActive
                ? D ? 'bg-slate-700/60 text-white' : 'bg-slate-200/80 text-slate-900'
                : D ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
            style={{ paddingLeft: 10 + depth * 12, paddingRight: 6 }}
          >
            <LangDot name={item.name} />
            <span className="flex-1 truncate font-mono text-[11px]">{item.name}</span>
            {files.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); deleteItem(item.id) }}
                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 rounded p-0.5 transition-all"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )
      })
  }

  // ── Inline add input (shown at bottom of tree while typing) ───────────────
  function renderAddInput() {
    if (!adding) return null
    const indent = adding.parentId
      ? items.find(i => i.id === adding.parentId) ? 22 : 10
      : 10
    return (
      <div className="flex items-center gap-1.5 px-1 py-0.5" style={{ paddingLeft: indent }}>
        {adding.type === 'folder'
          ? <span className="text-[10px]">📁</span>
          : <LangDot name={addingName || 'file.txt'} size={7} />}
        <input
          ref={addInputRef}
          value={addingName}
          onChange={e => setAddingName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commitAdd()
            if (e.key === 'Escape') { setAdding(null); setAddingName('') }
          }}
          onBlur={commitAdd}
          placeholder={adding.type === 'folder' ? 'folder name' : 'file.py'}
          className={`flex-1 min-w-0 border border-sky-500 rounded text-[11px] px-1.5 py-0.5 outline-none font-mono ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-900'}`}
        />
      </div>
    )
  }

  const D = isDark
  const T = themeUi  // studio theme ui object — overrides defaults when provided

  // Extract hex from a Tailwind arbitrary-value class like 'bg-[#272822]' → '#272822'
  const themeHex = (cls) => cls?.match(/\[#([0-9a-fA-F]{3,8})\]/)?.[0]?.slice(1, -1)
    ? '#' + cls.match(/\[#([0-9a-fA-F]{3,8})\]/)[1]
    : null
  const termBg     = T ? (themeHex(T.bg1) ?? null) : null
  const termInputBg = T ? (themeHex(T.bg0) ?? null) : null

  const border    = T?.border    ?? (D ? 'border-slate-800'    : 'border-slate-200')
  const bg0       = T?.bg0       ?? (D ? 'bg-slate-950'        : 'bg-white')
  const bg1       = T?.bg1       ?? (D ? 'bg-slate-900'        : 'bg-slate-100')
  const bg2       = T?.bg2       ?? (D ? 'bg-[#0c1520]'        : 'bg-slate-50')
  const txt1      = T?.txt1      ?? (D ? 'text-slate-200'      : 'text-slate-800')
  const txt2      = T?.txt2      ?? (D ? 'text-slate-400'      : 'text-slate-500')
  const hoverBg   = T?.hoverBg   ?? (D ? 'hover:bg-slate-800'  : 'hover:bg-slate-200')
  const hoverTx   = T?.hoverTx   ?? (D ? 'hover:text-slate-200': 'hover:text-slate-900')
  const btnBorder = T?.btnBorder ?? (D ? 'border-slate-700'    : 'border-slate-300')

  return (
    <section className={`flex-1 min-h-0 flex flex-col ${bg0} ${D ? 'text-slate-100' : 'text-slate-900'} border-l ${border}`}>
      <input
        ref={importFileRef}
        type="file"
        multiple
        accept=".js,.ts,.jsx,.tsx,.py,.html,.css,.json,.md,.txt,.sh,.cpp,.c,.m"
        className="hidden"
        onChange={onImportFiles}
      />

      {/* ── Header ── */}
      <header className={`h-12 shrink-0 flex items-center gap-1.5 px-3 border-b ${border} ${bg1}`}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {activeFile && <LangDot name={activeFile.name} size={7} />}
            <span className={`text-xs font-bold font-mono truncate ${txt1}`}>
              {activeFile?.name ?? 'Code Along'}
            </span>
          </div>
          <div className={`text-[10px] truncate ${txt2}`}>{activeTitle}</div>
        </div>
        {activeFile?.language === 'openmat' && (
          <button
            onClick={() => openInOpenMat(activeFile.content, activeFile.name)}
            className="h-7 inline-flex items-center gap-1 rounded-md bg-orange-600 hover:bg-orange-500 px-2.5 text-xs font-bold text-white transition-colors"
            title="Open in OpenMAT Studio"
          >
            <ExternalLink className="w-3 h-3" /> OpenMAT
          </button>
        )}
        <button
          onClick={loadExampleProject}
          className={`h-7 px-2 rounded border text-[10px] font-semibold transition-colors ${btnBorder} ${txt2} ${hoverBg} ${hoverTx}`}
          title="Load the Snake demo project"
        >
          Demo
        </button>
        <button onClick={run} className="h-7 inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-500 px-2.5 text-xs font-bold text-white transition-colors">
          <Play className="w-3 h-3" /> Run
        </button>
        <button onClick={downloadZip} className={`h-7 w-7 flex items-center justify-center rounded border ${btnBorder} ${txt2} ${hoverBg} ${hoverTx} transition-colors`} title="Download all files as ZIP">
          <Download className="w-3.5 h-3.5" />
        </button>
        <button onClick={clearOutput} className={`h-7 w-7 flex items-center justify-center rounded border ${btnBorder} ${txt2} ${hoverBg} ${hoverTx} transition-colors`} title="Clear terminal">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setOutputOpen(true)} className={`h-7 px-2 flex items-center justify-center rounded border ${btnBorder} ${txt2} ${hoverBg} ${hoverTx} transition-colors`} title="Open terminal and output">
          Output
        </button>
      </header>

      {/* ── Welcome / demo banner ── */}
      {showWelcome && (
        <div className={`shrink-0 flex items-center gap-2 px-3 py-2 border-b text-xs ${D ? 'bg-violet-950/60 border-violet-800/40' : 'bg-violet-50 border-violet-200'}`}>
          <span className="text-lg leading-none select-none">🐍</span>
          <span className={`flex-1 min-w-0 ${D ? 'text-violet-200' : 'text-violet-900'}`}>
            <span className="font-bold">First time here?</span> Load the Snake demo to see the workspace in action — TypeScript, Preview, and the terminal all wired up.
          </span>
          <button
            onClick={loadExampleProject}
            className="shrink-0 px-2.5 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white font-bold transition-colors"
          >
            Load Demo
          </button>
          <button
            onClick={dismissWelcome}
            className={`shrink-0 px-2 py-1 rounded border ${btnBorder} ${txt2} ${hoverBg} transition-colors`}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Replace confirmation banner ── */}
      {pendingReplace && (
        <div className={`shrink-0 flex items-center gap-2 px-3 py-2 border-b text-xs ${D ? 'bg-amber-950/70 border-amber-800/50' : 'bg-amber-50 border-amber-200'}`}>
          <span className={`flex-1 truncate min-w-0 ${D ? 'text-amber-300' : 'text-amber-800'}`}>
            <span className="font-bold font-mono">{pendingReplace.fileName}</span> already has code — replace it?
          </span>
          <button onClick={confirmReplace} className="shrink-0 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors">Replace</button>
          <button onClick={cancelReplace} className={`shrink-0 px-2.5 py-1 rounded border ${btnBorder} ${txt2} ${hoverBg} transition-colors`}>Keep mine</button>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── File tree ── */}
        {treeOpen && (
          <div className={`w-44 shrink-0 border-r ${border} ${bg2} flex flex-col overflow-hidden`}>

            {/* VS Code-style explorer header */}
            <div className={`flex items-center px-2 py-1.5 border-b ${border} shrink-0`}>
              <span className={`flex-1 text-[9px] font-bold uppercase tracking-widest ${txt2}`}>Explorer</span>
              <button
                onClick={() => { setAdding({ type: 'file', parentId: null }); setAddingName('') }}
                className={`w-5 h-5 flex items-center justify-center rounded ${txt2} ${hoverTx} ${hoverBg} transition-colors`}
                title="New File"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setAdding({ type: 'folder', parentId: null }); setAddingName('') }}
                className={`w-5 h-5 flex items-center justify-center rounded ${txt2} ${hoverTx} ${hoverBg} transition-colors`}
                title="New Folder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => importFileRef.current?.click()}
                className={`w-5 h-5 flex items-center justify-center rounded ${txt2} ${hoverTx} ${hoverBg} transition-colors`}
                title="Import files (.js .ts .py .md .html …)"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto py-1 custom-scrollbar">
              {renderTree()}
              {renderAddInput()}
            </div>
          </div>
        )}

        {/* ── Editor + output ── */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">

          {/* Tab strip */}
          <div className={`flex items-center shrink-0 ${bg2} border-b ${border} overflow-x-auto`}>
            <button
              onClick={() => setTreeOpen(v => !v)}
              className={`shrink-0 h-8 w-8 flex items-center justify-center border-r ${border} ${txt2} ${hoverTx} ${hoverBg} transition-colors`}
              title={treeOpen ? 'Hide explorer' : 'Show explorer'}
            >
              {treeOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            {files.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveId(f.id)}
                className={`flex items-center gap-1.5 px-3 h-8 text-[11px] font-mono shrink-0 border-r ${border} transition-colors ${
                  f.id === activeId
                    ? D
                      ? 'bg-slate-800 text-white border-t-2'
                      : 'bg-white text-slate-900 border-t-2 shadow-sm'
                    : D
                      ? 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                      : 'text-slate-500 hover:bg-white/80 hover:text-slate-700'
                }`}
                style={f.id === activeId ? { borderTopColor: accentColor } : undefined}
              >
                <LangDot name={f.name} size={6} />
                {f.name}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0">
            <Editor
              path={`mdhub-scratchpad://${activeId}`}
              value={activeFile?.content ?? ''}
              language={activeFile?.language === 'openmat' ? 'plaintext' : (activeFile?.language ?? 'plaintext')}
              theme={monacoTheme ?? (isDark ? 'open-calc-dark' : 'open-calc-light')}
              beforeMount={setupOpenCalcMonaco}
              onChange={updateContent}
              onMount={(editor) => {
                monacoRef.current = editor
                requestAnimationFrame(() => requestAnimationFrame(() => editor.layout()))
              }}
              options={{
                minimap: { enabled: false },
                fontSize: parseInt(getCodeFontSize(codeTypography.fontSize), 10),
                fontFamily: getCodeFontFamily(codeTypography.font),
                fontLigatures: codeTypography.ligatures,
                wordWrap: 'off',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: 2,
                padding: { top: 8, bottom: 8 },
              }}
            />
          </div>

          {/* ── Bottom pane: Terminal | Preview ── */}
          <WorkspaceOutputDialog open={outputOpen} onClose={() => setOutputOpen(false)} title="Scratchpad output">
          <div className={`flex-1 min-h-0 border-t ${border} flex flex-col`}>
            {/* Tab bar */}
            <div className={`h-7 shrink-0 flex items-center border-b ${border} ${bg2} px-1 gap-0.5`}>
              {['terminal', 'preview'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setBottomTab(tab)}
                  className={`px-3 h-6 text-[10px] font-bold rounded transition-colors capitalize ${
                    bottomTab === tab
                      ? D ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-900'
                      : D ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/60'
                  }`}
                >
                  {tab === 'terminal' ? '⌨ Terminal' : '🖼 Preview'}
                </button>
              ))}
            </div>

            {/* Terminal */}
            <div className={`flex-1 min-h-0 ${bottomTab === 'terminal' ? 'flex flex-col' : 'hidden'}`}>
              <WorkspaceTerminal
                ref={terminalRef}
                files={files}
                isDark={isDark}
                onPreview={handlePreview}
                bgColor={termBg}
                inputBgColor={termInputBg}
              />
            </div>

            {/* Preview */}
            <div className={`flex-1 min-h-0 ${bottomTab === 'preview' ? 'flex flex-col' : 'hidden'}`}>
              {previewDoc
                ? <iframe title="preview" srcDoc={previewDoc} sandbox="allow-scripts allow-same-origin" className="flex-1 w-full bg-white" />
                : <div className={`flex-1 flex items-center justify-center text-xs ${txt2}`}>
                    Run an HTML or React file to see the preview here.
                  </div>
              }
            </div>

          </div>
          </WorkspaceOutputDialog>
        </div>
      </div>
    </section>
  )
}
