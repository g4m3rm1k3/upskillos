import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGlobalTheme } from '../../context/ThemeContext.jsx'
import Prism from '../../utils/prism.js'
import 'prismjs/components/prism-javascript'
import 'prismjs/themes/prism-tomorrow.css'

// ── Colour palette ─────────────────────────────────────────────────────────────
const P = {
  indigo: {
    dark:  { bg: '#1e1b4b', border: '#6366f1', text: '#a5b4fc', label: '#818cf8' },
    light: { bg: '#eef2ff', border: '#6366f1', text: '#3730a3', label: '#4338ca' },
  },
  violet: {
    dark:  { bg: '#2e1065', border: '#8b5cf6', text: '#c4b5fd', label: '#a78bfa' },
    light: { bg: '#f5f3ff', border: '#8b5cf6', text: '#5b21b6', label: '#7c3aed' },
  },
  pink: {
    dark:  { bg: '#500724', border: '#ec4899', text: '#f9a8d4', label: '#f472b6' },
    light: { bg: '#fdf2f8', border: '#ec4899', text: '#9d174d', label: '#db2777' },
  },
}

// ── Lesson data ────────────────────────────────────────────────────────────────
const LESSONS = [
  {
    id: 'callback',
    title: 'The Callback Pattern',
    tag: 'Functional',
    steps: [
      {
        title: 'A simple function',
        explanation:
          'Every callback starts as a plain function. Nothing special — greet takes a name and returns a greeting string. We will pass this exact function to another function in the next step.',
        code: `function greet(name) {\n  return \`Hello, \${name}!\`\n}`,
        newLines: [0, 1, 2],
        viz: {
          nodes: [
            { id: 'greet', x: 195, y: 156, w: 200, h: 78, label: 'greet', sig: '(name)', ret: '→ string', color: 'indigo' },
          ],
          edges: [],
          pulse: false,
        },
      },
      {
        title: 'A function that accepts a function',
        explanation:
          'runWith is a higher-order function. Its first parameter fn is a slot — it holds whatever function you pass in. Inside, fn(value) is called. The slot is empty for now; it accepts any function.',
        code: `function greet(name) {\n  return \`Hello, \${name}!\`\n}\n\nfunction runWith(fn, value) {\n  return fn(value)\n}`,
        newLines: [4, 5, 6],
        viz: {
          nodes: [
            { id: 'greet',   x: 30,  y: 161, w: 190, h: 78,  label: 'greet',   sig: '(name)',      ret: '→ string', color: 'indigo' },
            { id: 'runWith', x: 350, y: 139, w: 210, h: 112, label: 'runWith', sig: '(fn, value)',                  color: 'violet',
              slot: { label: 'fn = ?', note: 'any function', filled: false } },
          ],
          edges: [],
          pulse: false,
        },
      },
      {
        title: 'Injecting greet as the callback',
        explanation:
          'runWith(greet, "Alice") passes greet in as fn. At the call site, greet fills the fn slot. Inside runWith, fn("Alice") becomes greet("Alice"). The injection happens at the call — not inside the function.',
        code: `function greet(name) {\n  return \`Hello, \${name}!\`\n}\n\nfunction runWith(fn, value) {\n  return fn(value)\n}\n\nconst result = runWith(greet, 'Alice')\nconsole.log(result)  // 'Hello, Alice!'`,
        newLines: [8, 9],
        viz: {
          nodes: [
            { id: 'greet',   x: 30,  y: 161, w: 190, h: 78,  label: 'greet',   sig: '(name)',      ret: '→ string', color: 'indigo' },
            { id: 'runWith', x: 350, y: 139, w: 210, h: 112, label: 'runWith', sig: '(fn, value)',                  color: 'violet',
              slot: { label: 'fn = greet', note: 'greet fills the slot', filled: true, fillColor: 'indigo' } },
          ],
          edges: [
            { id: 'e1', from: 'greet', to: 'runWith', label: 'passed as fn', color: 'indigo' },
          ],
          pulse: false,
        },
      },
      {
        title: 'Watch the execution flow',
        explanation:
          'Hit Play to watch the call travel through the abstraction. The caller invokes runWith → runWith invokes the callback fn → greet executes → the result returns all the way back.',
        code: `function greet(name) {\n  return \`Hello, \${name}!\`\n}\n\nfunction runWith(fn, value) {\n  return fn(value)\n}\n\nconst result = runWith(greet, 'Alice')\nconsole.log(result)  // 'Hello, Alice!'`,
        newLines: [],
        viz: {
          nodes: [
            { id: 'greet',   x: 30,  y: 161, w: 190, h: 78,  label: 'greet',   sig: '(name)',      ret: '→ string', color: 'indigo' },
            { id: 'runWith', x: 350, y: 139, w: 210, h: 112, label: 'runWith', sig: '(fn, value)',                  color: 'violet',
              slot: { label: 'fn = greet', filled: true, fillColor: 'indigo' } },
          ],
          edges: [
            { id: 'e1', from: 'greet', to: 'runWith', label: 'passed as fn', color: 'indigo' },
          ],
          pulse: true,
        },
      },
      {
        title: 'Swap the callback',
        explanation:
          'runWith never changes. Any function with the right shape can fill the fn slot. greet is polite. shout is loud. Same runWith — completely different behaviour. This is the power of the callback pattern.',
        code: `function greet(name) {\n  return \`Hello, \${name}!\`\n}\n\nfunction shout(name) {\n  return \`HEY \${name.toUpperCase()}!\`\n}\n\nfunction runWith(fn, value) {\n  return fn(value)\n}\n\nrunWith(greet, 'Alice')  // → 'Hello, Alice!'\nrunWith(shout, 'Alice')  // → 'HEY ALICE!'`,
        newLines: [4, 5, 6, 12, 13],
        viz: {
          nodes: [
            { id: 'greet',   x: 30,  y: 70,  w: 190, h: 78,  label: 'greet',   sig: '(name)', ret: '→ string', color: 'indigo' },
            { id: 'shout',   x: 30,  y: 242, w: 190, h: 78,  label: 'shout',   sig: '(name)', ret: '→ string', color: 'pink' },
            { id: 'runWith', x: 350, y: 139, w: 210, h: 112, label: 'runWith', sig: '(fn, value)',              color: 'violet',
              slot: { label: 'fn = ?', note: 'pluggable — any function', filled: false } },
          ],
          edges: [
            { id: 'e1', from: 'greet', to: 'runWith', label: 'greet', color: 'indigo' },
            { id: 'e2', from: 'shout', to: 'runWith', label: 'shout', color: 'pink'   },
          ],
          pulse: false,
        },
      },
    ],
  },
]

// ── SVG helpers ────────────────────────────────────────────────────────────────
function edgePath(from, to) {
  const sx = from.x + from.w
  const sy = from.y + from.h / 2
  const ex = to.x
  const ey = to.y + to.h / 2
  const dx = (ex - sx) * 0.55
  return `M ${sx} ${sy} C ${sx + dx} ${sy} ${ex - dx} ${ey} ${ex} ${ey}`
}

function edgeMid(from, to) {
  const sx = from.x + from.w, sy = from.y + from.h / 2
  const ex = to.x,            ey = to.y + to.h / 2
  return { x: (sx + ex) / 2, y: (sy + ey) / 2 - 13 }
}

// ── SVG sub-components ─────────────────────────────────────────────────────────
function VizNode({ node, isDark }) {
  const c  = P[node.color][isDark ? 'dark' : 'light']
  const sc = node.slot?.fillColor ? P[node.slot.fillColor][isDark ? 'dark' : 'light'] : null
  const slotY = node.y + (node.ret ? 70 : 56)

  return (
    <g>
      <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={10}
        fill={c.bg} stroke={c.border} strokeWidth={2} />
      <text x={node.x + 14} y={node.y + 21} fontSize={13} fontWeight="700"
        fill={c.label} fontFamily="ui-monospace,Menlo,monospace">{node.label}</text>
      <text x={node.x + 14} y={node.y + 38} fontSize={11}
        fill={c.text} fontFamily="ui-monospace,Menlo,monospace">{node.sig}</text>
      {node.ret && (
        <text x={node.x + 14} y={node.y + 54} fontSize={10} opacity={0.65}
          fill={c.text} fontFamily="ui-monospace,Menlo,monospace">{node.ret}</text>
      )}
      {node.slot && (
        <>
          <rect x={node.x + 12} y={slotY} width={node.w - 24} height={42} rx={7}
            fill={sc ? sc.bg : 'transparent'}
            stroke={sc ? sc.border : c.border}
            strokeWidth={1.5}
            strokeDasharray={node.slot.filled ? '0' : '6 3'}
            opacity={0.9} />
          <text x={node.x + 22} y={slotY + 16} fontSize={10} fontWeight="600"
            fill={sc ? sc.text : c.text} fontFamily="ui-monospace,Menlo,monospace">
            {node.slot.label}
          </text>
          {node.slot.note && (
            <text x={node.x + 22} y={slotY + 31} fontSize={9} opacity={0.6}
              fill={sc ? sc.text : c.text} fontFamily="ui-sans-serif,system-ui,sans-serif">
              {node.slot.note}
            </text>
          )}
        </>
      )}
    </g>
  )
}

function VizEdge({ edge, nodes, isDark }) {
  const fromNode = nodes.find(n => n.id === edge.from)
  const toNode   = nodes.find(n => n.id === edge.to)
  if (!fromNode || !toNode) return null
  const c  = P[edge.color][isDark ? 'dark' : 'light']
  const d  = edgePath(fromNode, toNode)
  const mid = edgeMid(fromNode, toNode)
  const mid2 = { x: mid.x, y: mid.y - 1 }

  return (
    <g>
      <defs>
        <marker id={`arr-${edge.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0,10 3.5,0 7" fill={c.border} />
        </marker>
      </defs>
      <path d={d} fill="none" stroke={c.border} strokeWidth={2}
        markerEnd={`url(#arr-${edge.id})`} strokeOpacity={0.8} />
      {edge.label && (
        <>
          <rect x={mid2.x - 26} y={mid2.y - 11} width={52} height={14} rx={3}
            fill={isDark ? '#0f172a' : '#f8fafc'} opacity={0.85} />
          <text x={mid2.x} y={mid2.y} fontSize={9} textAnchor="middle" fontWeight="600"
            fill={c.label} fontFamily="ui-sans-serif,system-ui,sans-serif">
            {edge.label}
          </text>
        </>
      )}
    </g>
  )
}

function VizPulse({ edges, nodes }) {
  return edges.map(edge => {
    const fromNode = nodes.find(n => n.id === edge.from)
    const toNode   = nodes.find(n => n.id === edge.to)
    if (!fromNode || !toNode) return null
    const d = edgePath(fromNode, toNode)
    const c = P[edge.color].dark

    return (
      <g key={`pulse-${edge.id}`}>
        <defs>
          <filter id={`glow-${edge.id}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle r={7} fill={c.border} filter={`url(#glow-${edge.id})`} opacity={0.9}>
          <animateMotion dur="1.6s" repeatCount="indefinite" path={d} rotate="auto" />
        </circle>
        <circle r={4} fill="white" opacity={0.7}>
          <animateMotion dur="1.6s" repeatCount="indefinite" path={d} rotate="auto" />
        </circle>
      </g>
    )
  })
}

function VizCanvas({ viz, isDark }) {
  const bg   = isDark ? '#0f172a' : '#f1f5f9'
  const grid = isDark ? '#1e293b' : '#e2e8f0'

  return (
    <svg viewBox="0 0 590 400" className="w-full h-full" style={{ display: 'block' }}>
      <rect width="590" height="400" fill={bg} rx={14} />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={`v${i}`} x1={(i + 1) * 48} y1={0} x2={(i + 1) * 48} y2={400}
          stroke={grid} strokeWidth={0.5} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={(i + 1) * 48} x2={590} y2={(i + 1) * 48}
          stroke={grid} strokeWidth={0.5} />
      ))}

      {viz.edges.map(e => (
        <VizEdge key={e.id} edge={e} nodes={viz.nodes} isDark={isDark} />
      ))}

      {viz.pulse && <VizPulse edges={viz.edges} nodes={viz.nodes} />}

      {viz.nodes.map(node => (
        <VizNode key={node.id} node={node} isDark={isDark} />
      ))}
    </svg>
  )
}

// ── Code display ───────────────────────────────────────────────────────────────
function CodeDisplay({ code, newLines }) {
  const html  = Prism.highlight(code, Prism.languages.javascript, 'javascript')
  const lines = html.split('\n')

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border-b border-slate-700">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[10px] text-slate-500 font-mono ml-1">script.js</span>
      </div>
      <pre className="bg-slate-900 text-[12px] leading-relaxed font-mono p-4 overflow-x-auto m-0">
        {lines.map((lineHtml, i) => (
          <div
            key={i}
            className={`-mx-4 px-4 ${newLines.includes(i) ? 'bg-indigo-500/[0.12] border-l-2 border-indigo-500 pl-[14px]' : ''}`}
            dangerouslySetInnerHTML={{ __html: lineHtml || ' ' }}
          />
        ))}
      </pre>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AbstractionViz() {
  const { isDarkGlobal: isDark } = useGlobalTheme()
  const navigate = useNavigate()

  const [lessonIdx, setLessonIdx] = useState(0)
  const [stepIdx,   setStepIdx]   = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed,     setSpeed]     = useState(1)

  const lesson  = LESSONS[lessonIdx]
  const step    = lesson.steps[stepIdx]
  const isFirst = stepIdx === 0
  const isLast  = stepIdx === lesson.steps.length - 1

  const goNext = useCallback(() => {
    if (isLast) { setIsPlaying(false); return }
    setStepIdx(s => s + 1)
  }, [isLast])

  const goPrev = useCallback(() => {
    if (!isFirst) setStepIdx(s => s - 1)
  }, [isFirst])

  const reset = useCallback(() => {
    setStepIdx(0)
    setIsPlaying(false)
  }, [])

  useEffect(() => {
    if (!isPlaying) return
    const ms = Math.round(3000 / speed)
    const t  = setTimeout(goNext, ms)
    return () => clearTimeout(t)
  }, [isPlaying, speed, stepIdx, goNext])

  // Reset step when lesson changes
  useEffect(() => { setStepIdx(0); setIsPlaying(false) }, [lessonIdx])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">

      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >← Back</button>

        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Abstraction Visualizer</span>

        <span className="text-slate-300 dark:text-slate-700">|</span>

        {LESSONS.map((l, i) => (
          <button
            key={l.id}
            onClick={() => setLessonIdx(i)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
              i === lessonIdx
                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700'
                : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >{l.title}</button>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">

        {/* Left — lesson panel */}
        <div
          className="flex flex-col min-h-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
          style={{ width: '44%' }}
        >
          {/* Step header */}
          <div className="shrink-0 px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800/70">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold tracking-widest text-indigo-500 dark:text-indigo-400 uppercase">
                Step {stepIdx + 1} / {lesson.steps.length}
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                isDark
                  ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                  : 'bg-indigo-50 text-indigo-600 border-indigo-200'
              }`}>{lesson.tag}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{step.title}</h2>
          </div>

          {/* Explanation */}
          <div className="shrink-0 px-5 py-4 border-b border-slate-100 dark:border-slate-800/70">
            <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">{step.explanation}</p>
          </div>

          {/* Code */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <CodeDisplay code={step.code} newLines={step.newLines} />
          </div>
        </div>

        {/* Right — visualization */}
        <div className={`flex-1 flex items-center justify-center min-h-0 p-6 ${
          isDark ? 'bg-slate-900' : 'bg-slate-100'
        }`}>
          <div className="w-full h-full max-w-2xl">
            <VizCanvas viz={step.viz} isDark={isDark} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={`shrink-0 flex items-center gap-3 px-5 py-2.5 border-t ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <button
          onClick={goPrev}
          disabled={isFirst}
          className="text-xs px-3 py-1.5 rounded font-semibold disabled:opacity-30 transition-colors bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
        >← Back</button>

        <button
          onClick={() => setIsPlaying(p => !p)}
          disabled={isLast && !isPlaying}
          className={`text-xs px-4 py-1.5 rounded font-bold transition-colors disabled:opacity-30 ${
            isPlaying
              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
              : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-200 dark:hover:bg-indigo-900'
          }`}
        >{isPlaying ? '⏸ Pause' : '▶ Play'}</button>

        <button
          onClick={reset}
          className="text-xs px-3 py-1.5 rounded font-semibold transition-colors text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >↺ Reset</button>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 dark:text-slate-600 font-medium select-none">Speed</span>
          <input
            type="range" min={0.5} max={3} step={0.25} value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="w-20 accent-indigo-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono w-7">{speed}×</span>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          {lesson.steps.map((_, i) => (
            <button
              key={i}
              onClick={() => { setStepIdx(i); setIsPlaying(false) }}
              title={`Step ${i + 1}`}
              className={`rounded-full transition-all duration-200 ${
                i === stepIdx
                  ? 'w-5 h-2.5 bg-indigo-500'
                  : i < stepIdx
                    ? 'w-2.5 h-2.5 bg-indigo-300 dark:bg-indigo-700 hover:bg-indigo-400 dark:hover:bg-indigo-600'
                    : 'w-2.5 h-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
              }`}
            />
          ))}

          <button
            onClick={goNext}
            disabled={isLast}
            className="text-xs px-3 py-1.5 rounded font-bold disabled:opacity-30 transition-colors bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500"
          >Next →</button>
        </div>
      </div>
    </div>
  )
}
