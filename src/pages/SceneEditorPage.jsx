import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { SCENE_META } from '../components/eng-math/scenes/index.js'
import { SNIPPETS } from '../data/canvasSnippets.js'
import { SERIES  } from '../data/canvasTutorialSeries.js'
import { useGlobalTheme } from '../context/ThemeContext.jsx'
import { setupOpenCalcMonaco } from '../utils/monacoThemes.js'
import Prism from '../utils/prism.js'
import 'prismjs/components/prism-javascript'
import 'prismjs/themes/prism-tomorrow.css'

const API = '/api/dev-fs'
const SCENES_DIR = 'src/components/eng-math/scenes'
const INDEX_PATH = `${SCENES_DIR}/index.js`
const MOPTS = {
  fontSize: 13,
  minimap: { enabled: false },
  wordWrap: 'off',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  lineNumbers: 'on',
}

const isDark = () => document.documentElement.classList.contains('dark')

// Variables to hide from the Properties panel (canvas internals / animation state)
const SKIP_VARS = new Set(['w', 'h', 't', 'x', 'y', 'cx', 'cy', 'i', 'j', 'k', 'n',
  'dpr', 'start', 'rafId', 'row', 'col', 'phase', 'idx'])

function toPascalCase(s) {
  const words = s.replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  return words.map(w => w[0].toUpperCase() + w.slice(1)).join('')
}

function sceneTemplate(name) {
  return `import { useEffect, useRef } from 'react'

export default function ${name}() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let rafId, w, h

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.parentElement.getBoundingClientRect()
      w = rect.width; h = rect.height
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.scale(dpr, dpr)
    }

    let start
    function draw(ts) {
      if (!start) start = ts
      const t = ts - start
      const dark = document.documentElement.classList.contains('dark')

      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = dark ? '#0f172a' : '#f8fafc'
      ctx.fillRect(0, 0, w, h)

      // ── your drawing code here ─────────────────────────────
      const cx = w / 2, cy = h / 2

      ctx.font = \`bold \${Math.round(h * 0.06)}px system-ui\`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = dark ? '#e2e8f0' : '#1e293b'
      ctx.fillText('${name}', cx, cy)
      // ──────────────────────────────────────────────────────

      rafId = requestAnimationFrame(draw)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)
    resize()
    rafId = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(rafId); ro.disconnect() }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}
`
}

// Injected into the preview iframe when grid overlay is on.
// Draws coordinate labels on a transparent canvas sitting on top of the scene.
const GRID_OVERLAY_SCRIPT = `
;(function(){
  var ov = document.createElement('canvas')
  ov.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:100'
  document.getElementById('root').appendChild(ov)
  function drawGrid() {
    var dpr = window.devicePixelRatio||1
    var w = window.innerWidth, h = window.innerHeight
    ov.width = w*dpr; ov.height = h*dpr
    ov.style.width = w+'px'; ov.style.height = h+'px'
    var ctx = ov.getContext('2d')
    ctx.scale(dpr,dpr)
    // quarter-grid lines
    ctx.setLineDash([4,4])
    ctx.lineWidth = 1
    for(var p of [0.25,0.5,0.75]) {
      ctx.strokeStyle = p===0.5 ? 'rgba(255,80,80,0.35)' : 'rgba(80,180,255,0.2)'
      ctx.beginPath(); ctx.moveTo(p*w,0); ctx.lineTo(p*w,h); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0,p*h); ctx.lineTo(w,p*h); ctx.stroke()
    }
    ctx.setLineDash([])
    // x-axis labels along top
    ctx.font = '10px monospace'; ctx.textBaseline = 'top'
    for(var p of [0.25,0.5,0.75]) {
      var xPx = Math.round(p*w), yPx = Math.round(p*h)
      ctx.fillStyle = p===0.5 ? 'rgba(255,120,120,0.9)' : 'rgba(80,200,255,0.85)'
      ctx.textAlign = 'left'
      ctx.fillText('x='+xPx, p*w+3, 3)
      ctx.fillText('y='+yPx, 3, p*h+3)
    }
    // center marker
    ctx.fillStyle = 'rgba(255,80,80,0.9)'
    ctx.textAlign = 'left'
    ctx.fillText('cx='+Math.round(w/2)+' cy='+Math.round(h/2), w/2+4, h/2+4)
    // w/h labels in corners
    ctx.fillStyle = 'rgba(140,140,140,0.7)'
    ctx.textAlign = 'right'
    ctx.fillText('w='+Math.round(w)+' h='+Math.round(h), w-4, 3)
  }
  drawGrid()
  window.addEventListener('resize', drawGrid)
})();
`

function buildPreviewDoc(source, dark, showGrid = false) {
  let processed = source
    .replace(/import\s+\{[^}]+\}\s+from\s*['"]react['"]/g, '')
    .replace(/import\s+\w+\s*,\s*\{[^}]+\}\s+from\s*['"]react['"]/g, '')
    .replace(/import\s+\w+\s+from\s*['"]react['"]/g, '')
    .replace(/^import\s+.+$/gm, '')
    .replace(/export\s+default\s+function\s+(\w+)/, 'function __SceneComp')
    .replace(/export\s+default\s+(\w+)\s*;?\s*$/, 'var __sceneDefault = $1')

  return `<!DOCTYPE html>
<html class="${dark ? 'dark' : ''}">
<head>
<script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js"><\/script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{width:100%;height:100%}
body{background:${dark ? '#0f172a' : '#f8fafc'}}
#root{position:relative;width:100%;height:100%}
.absolute{position:absolute}.inset-0{top:0;right:0;bottom:0;left:0}.w-full{width:100%}.h-full{height:100%}
pre.err{color:#f87171;background:#1a0000;padding:10px;border-radius:6px;font-size:12px;white-space:pre-wrap;margin:12px;font-family:monospace}
</style>
<script>
window.addEventListener('error',function(e){var r=document.getElementById('root');if(r)r.innerHTML='<pre class="err">'+e.message+'</pre>';});
window.addEventListener('unhandledrejection',function(e){var r=document.getElementById('root');if(r)r.innerHTML='<pre class="err">'+(e.reason?.message||e.reason||'unknown')+'</pre>';});
<\/script>
</head>
<body><div id="root"></div>
<script type="text/babel" data-presets="react">
var { useState, useEffect, useRef, useCallback, useMemo } = React;
${processed}
;(function(){
  var Comp=typeof __SceneComp!=='undefined'?__SceneComp:typeof __sceneDefault!=='undefined'?__sceneDefault:null;
  if(!Comp){document.getElementById('root').innerHTML='<pre class="err">No default export found</pre>';return;}
  try{ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Comp));}
  catch(e){document.getElementById('root').innerHTML='<pre class="err">'+e.message+'</pre>';}
})();
<\/script>
${showGrid ? `<script>${GRID_OVERLAY_SCRIPT}<\/script>` : ''}
</body></html>`
}

// ── Variable parser ───────────────────────────────────────────────────────────
// Returns { name, value, type, expr?, line } for every const assignment that
// holds a standalone number or Math.min(expr, cap).
function parseVars(src) {
  const lines = src.split('\n')
  const found = []
  lines.forEach((line, i) => {
    // const NAME = NUMBER  (including negative)
    const m1 = line.match(/^\s*const\s+(\w+)\s*=\s*(-?\d+(?:\.\d+)?)\s*(?:\/\/.*)?$/)
    if (m1 && !SKIP_VARS.has(m1[1])) {
      found.push({ name: m1[1], value: parseFloat(m1[2]), type: 'simple', line: i + 1 })
      return
    }
    // const NAME = Math.min(expr, NUMBER)
    const m2 = line.match(/^\s*const\s+(\w+)\s*=\s*Math\.min\(([^,]+),\s*(-?\d+(?:\.\d+)?)\)/)
    if (m2 && !SKIP_VARS.has(m2[1])) {
      found.push({ name: m2[1], value: parseFloat(m2[3]), type: 'minCap', expr: m2[2].trim(), line: i + 1 })
    }
  })
  return found
}

// Patch one variable value back into source (by line number — safe)
function patchVar(src, v, newVal) {
  const lines = src.split('\n')
  const i = v.line - 1
  if (v.type === 'simple') {
    lines[i] = lines[i].replace(/(-?\d+(?:\.\d+)?)(\s*(?:\/\/.*)?)$/, (_, _n, tail) => `${newVal}${tail}`)
  } else if (v.type === 'minCap') {
    lines[i] = lines[i].replace(
      /(Math\.min\([^,]+,\s*)-?\d+(?:\.\d+)?(\))/,
      (_, pre, suf) => `${pre}${newVal}${suf}`
    )
  }
  return lines.join('\n')
}

// Human-readable description for common variable name patterns
function varHint(name) {
  const lower = name.toLowerCase()
  if (/boxw|bw/.test(lower)) return 'box width (px cap)'
  if (/boxh|bh/.test(lower)) return 'box height (px cap)'
  if (/gap/.test(lower)) return 'gap between elements'
  if (/radius|rad/.test(lower)) return 'circle radius'
  if (/period|dur/.test(lower)) return 'animation cycle (ms)'
  if (/colw|columnw/.test(lower)) return 'column width'
  if (/rowh/.test(lower)) return 'row height'
  if (/pad|margin/.test(lower)) return 'padding'
  if (/speed/.test(lower)) return 'animation speed'
  if (/total/.test(lower)) return 'total span'
  if (/arrow/.test(lower)) return 'arrow size'
  if (/font/.test(lower)) return 'font size'
  if (/step/.test(lower)) return 'step size'
  if (/startx/.test(lower)) return 'x start position'
  if (/starty/.test(lower)) return 'y start position'
  return ''
}

// ── Guide sections ────────────────────────────────────────────────────────────
const GUIDE_SECTIONS = [
  {
    title: '1. Canvas setup pattern',
    code: `const canvasRef = useRef(null)
useEffect(() => {
  const canvas = canvasRef.current
  const ctx = canvas.getContext('2d')
  let rafId, w, h
  // resize, draw, cleanup...
  return () => cancelAnimationFrame(rafId)
}, [])
return <canvas ref={canvasRef}
  className="absolute inset-0 w-full h-full" />`,
    note: 'Always return a cleanup that cancels the animation frame.',
  },
  {
    title: '2. HiDPI resize',
    code: `function resize() {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.parentElement
    .getBoundingClientRect()
  w = rect.width; h = rect.height
  canvas.width  = w * dpr
  canvas.height = h * dpr
  ctx.scale(dpr, dpr)          // logical px = w×h
}
const ro = new ResizeObserver(resize)
ro.observe(canvas.parentElement)`,
    note: 'After resize(), draw as if canvas is w×h — the DPR multiply is hidden.',
  },
  {
    title: '3. Animation timing',
    code: `let start
function draw(ts) {
  if (!start) start = ts
  const t = ts - start   // ms elapsed since mount
  // use t for animations: sin(t/1000), etc.
  rafId = requestAnimationFrame(draw)
}`,
    note: 't is milliseconds. t/1000 = seconds. Use Math.sin(t/800) for oscillation.',
  },
  {
    title: '4. Dark mode (check every frame)',
    code: `const dark = document.documentElement
  .classList.contains('dark')

ctx.fillStyle = dark ? '#0f172a' : '#f8fafc'  // bg
ctx.fillStyle = dark ? '#e2e8f0' : '#1e293b'  // text`,
    note: 'Check every frame — user can toggle dark mode while scene runs.',
  },
  {
    title: '5. Proportional sizes (critical)',
    code: `// ✗ BAD — breaks at different canvas sizes
ctx.fillText(label, x, y - 8)   // fixed 8px

// ✓ GOOD — use Properties panel to tune caps
const boxH = Math.min(h * 0.2, 80)
// label in top third of box:
ctx.fillText(label, x, y - boxH * 0.18)
// value in bottom third:
ctx.fillText(val,   x, y + boxH * 0.3)`,
    note: 'All sizes should derive from w and h. The Properties tab lets you tune the caps without reading the math.',
  },
  {
    title: '6. Rounded box with label + value',
    code: `const boxW = Math.min(w * 0.22, 100)
const boxH = Math.min(h * 0.26, 90)

// box outline
ctx.beginPath()
ctx.roundRect(x, y - boxH/2, boxW, boxH, 10)
ctx.fillStyle = bg; ctx.fill()
ctx.strokeStyle = color; ctx.lineWidth = 2.5
ctx.stroke()

// label — top third
ctx.font = \`bold \${boxH * 0.3}px system-ui\`
ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
ctx.fillText('P', x + boxW/2, y - boxH * 0.18)

// divider
ctx.beginPath()
ctx.moveTo(x + 10, y + boxH * 0.05)
ctx.lineTo(x + boxW - 10, y + boxH * 0.05)
ctx.stroke()

// value — bottom third
ctx.font = \`bold \${boxH * 0.22}px monospace\`
ctx.fillText('TRUE', x + boxW/2, y + boxH * 0.3)`,
    note: 'Top third = label, bottom third = value, divider in middle. Tune boxW/boxH in Properties.',
  },
  {
    title: '7. Arrow (any direction)',
    code: `function arrow(x1,y1,x2,y2,color,dashed) {
  const ang = Math.atan2(y2-y1, x2-x1)
  const tip = 14
  ctx.strokeStyle = color; ctx.lineWidth = 2.5
  ctx.setLineDash(dashed ? [8,5] : [])
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2-Math.cos(ang)*tip, y2-Math.sin(ang)*tip)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x2,y2)
  ctx.lineTo(x2-Math.cos(ang-.4)*tip, y2-Math.sin(ang-.4)*tip)
  ctx.lineTo(x2-Math.cos(ang+.4)*tip, y2-Math.sin(ang+.4)*tip)
  ctx.closePath(); ctx.fill()
}`,
    note: 'Works for any angle. Pass dashed=true for "broken" or conditional arrows.',
  },
  {
    title: '8. Cycling values',
    code: `const VALUES = [2, -1, 5, 0, 3]
const PERIOD = 2200  // ms per step — tune in Properties

function draw(ts) {
  const t = ts - start
  const idx = Math.floor(t / PERIOD) % VALUES.length
  const val = VALUES[idx]
}`,
    note: 'Use Math.floor(t / PERIOD) % N to cycle. Tune PERIOD in the Properties tab.',
  },
]

// ── Backend helpers ───────────────────────────────────────────────────────────
async function fetchSceneList() {
  const r = await fetch(`${API}/list?dir=${encodeURIComponent(SCENES_DIR)}&ext=jsx&_=${Date.now()}`)
  if (!r.ok) throw new Error('API unavailable — make sure npm run dev is running')
  const ct = r.headers.get('content-type') || ''
  if (!ct.includes('json')) throw new Error('Dev server API not available — run npm run dev')
  const files = await r.json()
  return (Array.isArray(files) ? files : [])
    .map(f => f.name.replace(/\.jsx$/, ''))
    .filter(name => name !== 'index')
    .sort()
}

async function fetchSceneSource(sceneId) {
  const filePath = `${SCENES_DIR}/${sceneId}.jsx`
  const r = await fetch(`${API}/read?path=${encodeURIComponent(filePath)}&_=${Date.now()}`)
  if (!r.ok) throw new Error(`File not found: ${filePath}`)
  return r.text()
}

async function saveSceneFile(sceneId, source) {
  const r = await fetch(`${API}/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath: `${SCENES_DIR}/${sceneId}.jsx`, content: source }),
  })
  const data = await r.json()
  if (!data.ok) throw new Error(data.error || 'Write failed')
}

async function registerInIndex(sceneId, label, desc) {
  const r = await fetch(`${API}/read?path=${encodeURIComponent(INDEX_PATH)}&_=${Date.now()}`)
  if (!r.ok) return false
  let src = await r.text()
  if (src.includes(`${sceneId}:`)) return false
  const regEntry = `  ${sceneId}:${' '.repeat(Math.max(1, 30 - sceneId.length))}lazy(() => import('./${sceneId}.jsx')),`
  const metEntry = `  ${sceneId}:${' '.repeat(Math.max(1, 30 - sceneId.length))}{ label: '${label}', desc: '${desc}' },`
  src = src.replace(/(export const SCENE_REGISTRY[\s\S]*?)(^})/m, (_, body, close) => body + regEntry + '\n' + close)
  src = src.replace(/(export const SCENE_META[\s\S]*?)(^})/m, (_, body, close) => body + metEntry + '\n' + close)
  const wr = await fetch(`${API}/write`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath: INDEX_PATH, content: src }),
  })
  return (await wr.json()).ok
}

// ── Properties panel ──────────────────────────────────────────────────────────
function PropertiesPanel({ source, onSourceChange, editorRef }) {
  const vars = useMemo(() => parseVars(source), [source])
  const [localVals, setLocalVals] = useState({})

  // Sync local values whenever the source changes from outside
  useEffect(() => {
    const next = {}
    vars.forEach(v => { next[v.line] = v.value })
    setLocalVals(next)
  }, [vars])

  const jumpToLine = (lineNum) => {
    const ed = editorRef.current
    if (!ed) return
    ed.revealLineInCenter(lineNum)
    ed.setPosition({ lineNumber: lineNum, column: 1 })
    ed.focus()
  }

  const handleChange = (v, rawVal) => {
    const num = parseFloat(rawVal)
    if (isNaN(num)) return
    setLocalVals(prev => ({ ...prev, [v.line]: num }))
    const patched = patchVar(source, v, num)
    onSourceChange(patched)
  }

  if (vars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-2 text-slate-500">
        <div className="text-2xl opacity-30">⚙</div>
        <p className="text-xs leading-relaxed">
          No numeric constants detected.<br />
          Declare variables as <code className="text-blue-500 dark:text-blue-300">const NAME = value</code><br />
          or <code className="text-blue-500 dark:text-blue-300">const NAME = Math.min(expr, cap)</code><br />
          and they'll appear here as editable inputs.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs mb-3 text-slate-500">
          Click any variable name to jump to it in the editor. Change values and hit{' '}
          <kbd className="bg-slate-200 dark:bg-[#21262d] text-slate-600 dark:text-[#8b949e] px-1.5 py-px rounded text-[10px] border border-slate-300 dark:border-[#30363d]">⌘S</kbd>
          {' '}to preview.
        </p>
      </div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="px-4 py-1.5 text-left font-semibold text-slate-500">Variable</th>
            <th className="px-2 py-1.5 text-left font-semibold text-slate-500">Formula</th>
            <th className="px-4 py-1.5 text-right font-semibold text-slate-500">Value</th>
          </tr>
        </thead>
        <tbody>
          {vars.map(v => {
            const hint = varHint(v.name)
            const localVal = localVals[v.line] ?? v.value
            return (
              <tr
                key={`${v.name}-${v.line}`}
                className="border-b border-slate-100 dark:border-[#161b22] hover:bg-black/[0.03] dark:hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-2">
                  <button
                    onClick={() => jumpToLine(v.line)}
                    className="text-left hover:underline text-blue-500 dark:text-[#79c0ff] font-mono"
                    title={`Line ${v.line} — click to jump`}
                  >
                    {v.name}
                  </button>
                  {hint && (
                    <div className="text-[10px] mt-0.5 text-slate-400 dark:text-[#484f58]">{hint}</div>
                  )}
                </td>
                <td className="px-2 py-2 text-slate-400 dark:text-[#484f58] font-mono text-[10px]">
                  {v.type === 'minCap' ? (
                    <span title="proportional formula">
                      Math.min(<span className="text-slate-500 dark:text-[#8b949e]">{v.expr}</span>, …)
                    </span>
                  ) : (
                    <span className="text-slate-500 dark:text-[#8b949e]">constant</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    value={localVal}
                    step={localVal < 10 ? 0.01 : localVal < 100 ? 1 : 10}
                    onChange={e => handleChange(v, e.target.value)}
                    className="text-right rounded px-2 py-0.5 w-20 font-mono text-xs bg-slate-200 dark:bg-[#21262d] text-slate-900 dark:text-[#e6edf3] border border-slate-300 dark:border-[#30363d] outline-none"
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Tutorial panel ────────────────────────────────────────────────────────────
function tutInline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="text-slate-700 dark:text-slate-200 font-semibold">{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 px-1 py-px rounded text-[10px] font-mono">{part.slice(1, -1)}</code>
    return part
  })
}

function TutBlock({ block }) {
  switch (block.type) {
    case 'build':
      return (
        <div className="border-l-[3px] border-green-500 bg-green-50 dark:bg-green-950/40 rounded-r-md px-3 py-2 mb-3">
          <div className="text-[9px] font-bold tracking-widest text-green-600 dark:text-green-400 mb-1">WHAT YOU'LL BUILD</div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{tutInline(block.text)}</p>
        </div>
      )
    case 'h3':
      return <h3 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-4 mb-1">{block.text}</h3>
    case 'p':
      return <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-2">{tutInline(block.text)}</p>
    case 'code': {
      const html = Prism.highlight(block.text.trim(), Prism.languages.javascript, 'javascript')
      return (
        <pre className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[10.5px] font-mono overflow-x-auto mb-3 leading-relaxed">
          <code className="language-js" dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      )
    }
    case 'walk':
      return (
        <div className="border-l-2 border-slate-200 dark:border-slate-700 pl-3 mb-3">
          {block.text.split('\n\n').map((para, i) => (
            <p key={i} className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed mb-1">{tutInline(para)}</p>
          ))}
        </div>
      )
    case 'cs':
      return (
        <div className="border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 rounded-lg px-3 py-2 mb-2">
          <div className="text-[9px] font-bold tracking-widest text-blue-600 dark:text-blue-400 mb-1">CS CONCEPT</div>
          <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed">{tutInline(block.text)}</p>
        </div>
      )
    case 'se':
      return (
        <div className="border border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/40 rounded-lg px-3 py-2 mb-2">
          <div className="text-[9px] font-bold tracking-widest text-violet-600 dark:text-violet-400 mb-1">SE PRINCIPLE</div>
          <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed">{tutInline(block.text)}</p>
        </div>
      )
    case 'breaks':
      return (
        <div className="border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2 mb-2">
          <div className="text-[9px] font-bold tracking-widest text-red-600 dark:text-red-400 mb-1">WHAT BREAKS</div>
          <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed">{tutInline(block.text)}</p>
        </div>
      )
    case 'note':
      return (
        <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2 mb-2">
          <div className="text-[9px] font-bold tracking-widest text-amber-600 dark:text-amber-400 mb-1">TRY IT</div>
          <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed">{tutInline(block.text)}</p>
        </div>
      )
    default:
      return null
  }
}

function TutorialPanel({ onLoadCode, series = SNIPPETS }) {
  const [tutIdx, setTutIdx] = useState(0)
  const [stepIdx, setStepIdx] = useState(0)

  const tutorial = series[tutIdx]
  const step = tutorial.steps[stepIdx]

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-slate-950">
      {/* Series selector */}
      <div className="flex gap-1.5 px-2.5 py-1.5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex-wrap">
        {series.map((t, i) => (
          <button
            key={t.id}
            onClick={() => { setTutIdx(i); setStepIdx(0) }}
            className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
              i === tutIdx
                ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                : 'text-slate-500 border border-transparent hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t.title}
          </button>
        ))}
      </div>

      {/* Step tabs */}
      <div className="flex gap-1 px-2 py-1 border-b border-slate-200 dark:border-slate-800 shrink-0 flex-wrap">
        {tutorial.steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStepIdx(i)}
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
              i === stepIdx
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
            }`}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3">
        <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100 mb-0.5">{step.title}</div>
        <div className="text-[9px] font-bold tracking-widest text-blue-600 dark:text-blue-400 mb-3">
          {tutorial.title} · Step {stepIdx + 1} / {tutorial.steps.length}
        </div>

        {step.content.map((block, i) => <TutBlock key={i} block={block} />)}

        {/* Load starter / answer buttons */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => onLoadCode(step.starterCode)}
            className="flex-1 text-[10px] font-semibold py-1.5 rounded cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Load Starter Code
          </button>
          <button
            onClick={() => onLoadCode(step.completeCode)}
            className="flex-1 text-[10px] font-semibold py-1.5 rounded cursor-pointer bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-950 transition-colors"
          >
            Show Answer
          </button>
        </div>

        {/* Prev / Next */}
        <div className="flex justify-between mt-2">
          <button
            disabled={stepIdx === 0 && tutIdx === 0}
            onClick={() => {
              if (stepIdx > 0) { setStepIdx(s => s - 1) }
              else if (tutIdx > 0) { setTutIdx(t => t - 1); setStepIdx(series[tutIdx - 1].steps.length - 1) }
            }}
            className="text-[10px] px-2.5 py-1 rounded cursor-pointer text-slate-500 border border-slate-200 dark:border-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors disabled:opacity-30"
          >
            ← Prev
          </button>
          <button
            disabled={tutIdx === series.length - 1 && stepIdx === tutorial.steps.length - 1}
            onClick={() => {
              if (stepIdx < tutorial.steps.length - 1) { setStepIdx(s => s + 1) }
              else if (tutIdx < series.length - 1) { setTutIdx(t => t + 1); setStepIdx(0) }
            }}
            className="text-[10px] px-2.5 py-1 rounded cursor-pointer bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SceneEditorPage() {
  const navigate = useNavigate()
  const { themeStyles } = useGlobalTheme()
  const [sceneList, setSceneList] = useState([])
  const [listError, setListError] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [source, setSource] = useState('')
  const [savedSource, setSavedSource] = useState('')
  const [previewDoc, setPreviewDoc] = useState('')
  const [previewKey, setPreviewKey] = useState(0)
  const [saveMsg, setSaveMsg] = useState('')
  const [rightTab, setRightTab] = useState('preview')
  const [newMode, setNewMode] = useState(false)
  const [newName, setNewName] = useState('')
  const [overlayGrid, setOverlayGrid] = useState(false)
  const editorRef = useRef(null)
  const saveHandlerRef = useRef(null)  // stable ref so Cmd+S always calls the latest save
  const overlayGridRef = useRef(false)  // stable ref for use inside callbacks

  // Load scene file list on mount
  useEffect(() => {
    fetchSceneList()
      .then(list => {
        setSceneList(list)
        const hash = window.location.hash.replace('#', '')
        const initial = (hash && list.includes(hash)) ? hash : list[0]
        if (initial) setSelectedId(initial)
      })
      .catch(e => setListError(e.message))
  }, [])

  // Load source when selection changes
  useEffect(() => {
    if (!selectedId || newMode) return
    fetchSceneSource(selectedId)
      .then(src => {
        setSource(src)
        setSavedSource(src)
        setPreviewDoc(buildPreviewDoc(src, isDark(), overlayGridRef.current))
        setPreviewKey(k => k + 1)
      })
      .catch(() => { setSource(''); setSavedSource(''); setPreviewDoc('') })
  }, [selectedId, newMode])

  // Rebuild preview when dark mode toggles (system-level)
  useEffect(() => {
    const obs = new MutationObserver(() => {
      if (source) {
        setPreviewDoc(buildPreviewDoc(source, isDark(), overlayGridRef.current))
        setPreviewKey(k => k + 1)
      }
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [source])

  const handleSourceChange = useCallback(v => {
    setSource(v ?? '')
    // No auto-preview — user triggers with Cmd+S or the Refresh button
  }, [])

  const handleRefreshPreview = useCallback(() => {
    setPreviewDoc(buildPreviewDoc(source, isDark(), overlayGridRef.current))
    setPreviewKey(k => k + 1)
    setRightTab('preview')
  }, [source])

  const handleSave = useCallback(async () => {
    if (!selectedId) return
    setSaveMsg('Saving…')
    try {
      await saveSceneFile(selectedId, source)
      setSavedSource(source)
      // Also refresh preview on save
      setPreviewDoc(buildPreviewDoc(source, isDark(), overlayGridRef.current))
      setPreviewKey(k => k + 1)
      setRightTab('preview')
      setSaveMsg('Saved ✓')
    } catch (e) {
      setSaveMsg('Error: ' + e.message)
    }
    setTimeout(() => setSaveMsg(''), 3000)
  }, [selectedId, source])

  // Keep refs in sync so closures always use the latest values
  saveHandlerRef.current = handleSave
  overlayGridRef.current = overlayGrid

  const handleMonacoMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => saveHandlerRef.current()
    )
  }, []) // empty deps — only runs once on mount

  const handleCreateNew = async () => {
    const raw = newName.trim()
    if (!raw) return
    let id = toPascalCase(raw)
    if (!id.endsWith('Scene')) id += 'Scene'
    const tmpl = sceneTemplate(id)
    setSelectedId(id)
    setSource(tmpl)
    setSavedSource('')
    setPreviewDoc(buildPreviewDoc(tmpl, isDark(), overlayGridRef.current))
    setPreviewKey(k => k + 1)
    setNewMode(false)
    setNewName('')
    setSaveMsg('Creating…')
    try {
      await saveSceneFile(id, tmpl)
      await registerInIndex(
        id,
        id.replace(/Scene$/, '').replace(/([A-Z])/g, ' $1').trim(),
        'Custom scene.'
      )
      setSceneList(prev => [...prev, id].sort())
      setSavedSource(tmpl)
      setSaveMsg('Created ✓')
    } catch (e) {
      setSaveMsg('Error: ' + e.message)
    }
    setTimeout(() => setSaveMsg(''), 3500)
  }

  const hasChanges = source !== savedSource

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-[#30363d]">
        <button
          onClick={() => navigate('/dev/scenes')}
          className="text-sm px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 text-slate-500 dark:text-[#8b949e]"
        >
          ← Sandbox
        </button>
        <span className="text-sm font-semibold text-slate-900 dark:text-[#e6edf3]">Scene Editor</span>
        <span className="text-slate-200 dark:text-[#30363d]">|</span>

        {/* Scene selector */}
        {listError ? (
          <span className="text-xs text-red-500 dark:text-[#f87171]">{listError}</span>
        ) : (
          <select
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setNewMode(false) }}
            className="text-sm rounded px-2 py-1 font-mono bg-slate-100 dark:bg-[#21262d] text-slate-900 dark:text-[#e6edf3] border border-slate-200 dark:border-[#30363d]"
          >
            {sceneList.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        )}

        {/* New scene */}
        {newMode ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateNew(); if (e.key === 'Escape') setNewMode(false) }}
              placeholder="e.g. Fourier Series"
              className="text-sm rounded px-2 py-1 font-mono w-44 bg-slate-100 dark:bg-[#21262d] text-slate-900 dark:text-[#e6edf3] border border-blue-400 dark:border-[#388bfd] outline-none"
            />
            <button onClick={handleCreateNew} className="text-sm px-3 py-1 rounded font-semibold bg-green-700 text-white">
              Create
            </button>
            <button onClick={() => setNewMode(false)} className="text-sm px-2 py-1 rounded text-slate-600 dark:text-[#8b949e] bg-slate-100 dark:bg-[#21262d] border border-slate-200 dark:border-[#30363d]">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setNewMode(true)}
            className="text-sm px-3 py-1 rounded font-semibold bg-slate-100 dark:bg-[#21262d] text-blue-600 dark:text-[#58a6ff] border border-slate-200 dark:border-[#30363d]"
          >
            + New Scene
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {saveMsg && (
            <span className={`text-xs ${/error/i.test(saveMsg) ? 'text-red-500 dark:text-[#f87171]' : 'text-green-600 dark:text-[#4ade80]'}`}>
              {saveMsg}
            </span>
          )}
          {hasChanges && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-[#d2992222] text-amber-700 dark:text-[#d29922] border border-amber-200 dark:border-[#d2992244]">
              unsaved
            </span>
          )}
          <span className="text-xs text-slate-400 dark:text-[#484f58]">
            {selectedId && `${SCENES_DIR}/${selectedId}.jsx`}
          </span>
          <button
            onClick={handleRefreshPreview}
            title="Refresh preview without saving"
            className="text-sm px-3 py-1.5 rounded font-semibold bg-slate-100 dark:bg-[#21262d] text-blue-500 dark:text-[#79c0ff] border border-slate-200 dark:border-[#30363d]"
          >
            ↻ Preview
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || !selectedId}
            title="Save file and refresh preview (⌘S)"
            className="text-sm px-4 py-1.5 rounded font-bold disabled:opacity-40 disabled:cursor-not-allowed bg-green-700 text-white"
          >
            Save  <span className="opacity-65 text-[10px]">⌘S</span>
          </button>
        </div>
      </div>

      {/* Sub-header hint */}
      <div className="shrink-0 px-4 py-1 text-xs bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-[#30363d] text-slate-400 dark:text-[#484f58]">
        Canvas 2D · JSX · <strong className="text-slate-500 dark:text-[#6e7681]">⌘S</strong> to save + refresh preview ·
        Properties tab shows editable variables — click a name to jump to its line
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Monaco editor — 55% */}
        <div className="flex flex-col min-h-0 border-r border-slate-200 dark:border-[#30363d]" style={{ width: '55%' }}>
          <div className="flex-1 min-h-0">
            <Editor
              value={source}
              onChange={handleSourceChange}
              language="javascript"
              theme={themeStyles.monaco}
              beforeMount={setupOpenCalcMonaco}
              options={MOPTS}
              onMount={handleMonacoMount}
            />
          </div>
        </div>

        {/* Right panel — 45% */}
        <div className="flex flex-col min-h-0" style={{ width: '45%' }}>
          {/* Tabs */}
          <div className="shrink-0 flex items-center border-b px-3 gap-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-[#30363d]" style={{ height: 33 }}>
            {[
              { id: 'preview', label: 'Preview' },
              { id: 'properties', label: 'Properties' },
              { id: 'guide', label: 'Guide' },
              { id: 'snippets', label: 'Snippets' },
              { id: 'tutorials', label: 'Tutorials' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                className={`text-xs px-3 py-1 rounded font-semibold transition-colors ${
                  rightTab === tab.id
                    ? 'bg-blue-50 dark:bg-[#1f6feb22] text-blue-600 dark:text-[#58a6ff] border border-blue-200 dark:border-[#1f6feb44]'
                    : 'text-slate-500 dark:text-[#6e7681] bg-transparent border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
            {/* Grid overlay toggle — only visible on Preview tab */}
            {rightTab === 'preview' && (
              <button
                onClick={() => {
                  const next = !overlayGrid
                  setOverlayGrid(next)
                  overlayGridRef.current = next
                  if (previewDoc) {
                    setPreviewDoc(buildPreviewDoc(source, isDark(), next))
                    setPreviewKey(k => k + 1)
                  }
                }}
                title="Toggle coordinate grid overlay"
                className={`ml-auto text-xs px-2 py-1 rounded font-semibold transition-colors ${
                  overlayGrid
                    ? 'bg-blue-100 dark:bg-[#1f6feb44] text-blue-600 dark:text-[#58a6ff] border border-blue-300 dark:border-[#1f6feb66]'
                    : 'text-slate-400 dark:text-[#484f58] bg-transparent border border-slate-200 dark:border-[#30363d]'
                }`}
              >
                ⊞ Grid
              </button>
            )}
          </div>

          {/* Panel content */}
          {rightTab === 'preview' && (
            <div className="flex-1 min-h-0">
              {previewDoc ? (
                <iframe
                  key={previewKey}
                  srcDoc={previewDoc}
                  title="scene-live-preview"
                  className="border-0 w-full h-full"
                  sandbox="allow-scripts"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-slate-500">
                  Select a scene, then press{' '}
                  <kbd className="mx-1 px-1.5 py-0.5 rounded text-xs bg-slate-200 dark:bg-[#21262d] border border-slate-300 dark:border-[#30363d] text-slate-600 dark:text-[#8b949e]">⌘S</kbd>
                  {' '}to preview
                </div>
              )}
            </div>
          )}

          {rightTab === 'properties' && (
            <PropertiesPanel
              source={source}
              onSourceChange={src => {
                setSource(src)
                editorRef.current?.setValue(src)
                // Instant preview on property change — no Cmd+S needed
                setPreviewDoc(buildPreviewDoc(src, isDark(), overlayGridRef.current))
                setPreviewKey(k => k + 1)
                setRightTab('preview')
              }}
              editorRef={editorRef}
            />
          )}

          {rightTab === 'snippets' && (
            <TutorialPanel
              onLoadCode={code => {
                setSource(code)
                editorRef.current?.setValue(code)
                setPreviewDoc(buildPreviewDoc(code, isDark(), overlayGridRef.current))
                setPreviewKey(k => k + 1)
                setRightTab('preview')
              }}
            />
          )}

          {rightTab === 'tutorials' && (
            <TutorialPanel
              series={SERIES}
              onLoadCode={code => {
                setSource(code)
                editorRef.current?.setValue(code)
                setPreviewDoc(buildPreviewDoc(code, isDark(), overlayGridRef.current))
                setPreviewKey(k => k + 1)
                setRightTab('preview')
              }}
            />
          )}

          {rightTab === 'guide' && (
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
              <div className="p-4 space-y-5">
                <div>
                  <h2 className="text-sm font-bold mb-1 text-slate-900 dark:text-[#e6edf3]">Scene anatomy</h2>
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-[#8b949e]">
                    Every scene is a React component that draws on a canvas using requestAnimationFrame.
                    The canvas fills its parent via <code className="text-blue-500 dark:text-[#79c0ff]">absolute inset-0 w-full h-full</code>.
                    Use the <strong className="text-slate-700 dark:text-[#c9d1d9]">Properties tab</strong> to adjust sizes without reading the math.
                  </p>
                </div>
                {GUIDE_SECTIONS.map(s => (
                  <div key={s.title}>
                    <div className="text-xs font-bold mb-1 text-blue-600 dark:text-[#58a6ff]">{s.title}</div>
                    <pre className="text-xs leading-relaxed rounded p-3 overflow-x-auto mb-1 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-[#c9d1d9] font-mono">
                      {s.code}
                    </pre>
                    <p className="text-xs text-slate-500 dark:text-[#8b949e]">{s.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
