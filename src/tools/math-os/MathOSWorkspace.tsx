import { useState, useEffect, useRef, useMemo } from 'react'
import { useGlobalTheme } from '../../context/ThemeContext'
import { useDrag } from './hooks/useDrag'
import { useMathOSState } from './hooks/useMathOSState'
import TitleBar from './components/TitleBar'
import StatusBar from './components/StatusBar'
import ProjectControls from './components/ProjectControls'
import MathOSCenter from './MathOS'
import VariablesPanel from './views/VariablesPanel'
import InspectorPanel from './views/InspectorPanel'
import TimelinePanel from './views/TimelinePanel'
import AnimationPanel from './views/AnimationPanel'
import { platform } from './core/MathOSPlatform'
import { useMathDocument } from './hooks/useMathDocument'
import { objectsByKind } from './core/MathDocument'
import type { Variable } from './core/MathDocument'
import type { LessonConfig } from './core/LessonAdapter'
import type { UseMathDocumentReturn } from './hooks/useMathDocument'

export interface MathOSOpenConfig extends LessonConfig {
  section?: string
}

interface Props {
  open: boolean
  onClose: () => void
  lessonConfig?: MathOSOpenConfig | null
}

type RightTab = 'history' | 'inspector' | 'timeline' | 'animate'

export default function MathOSWorkspace({ open, onClose, lessonConfig }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { themeStyles } = useGlobalTheme() as any
  const ui: Record<string, string> = themeStyles.ui

  const { pos, setPos, dragging, onMouseDown } = useDrag({ x: 24, y: 24 })
  const [maximized, setMaximized] = useState(true)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  const width = Math.min(1240, viewport.width)
  const height = Math.min(850, Math.max(0, viewport.height - 48))
  const compact = (maximized ? viewport.width : width) < 1050
  const toggleMaximize = () => {
    setPos({ x: Math.max(0, (viewport.width - width) / 2), y: Math.min(24, viewport.height / 10) })
    setMaximized(value => !value)
  }

  // Single source of truth for classic compute state — passed down to MathOSCenter
  const s = useMathOSState()

  // Platform document for live panels
  const [doc] = useState(() => platform.createDocument())
  const bridge = useMathDocument(doc)

  // ─── Bridge: classic vars → platform doc ────────────────────────────────────
  const prevVarsRef = useRef<Record<string, number | string>>({})
  useEffect(() => {
    const prev = prevVarsRef.current
    // Add/update vars that changed
    Object.entries(s.vars).forEach(([name, val]) => {
      const num = Number(val)
      if (isNaN(num)) return
      if (prev[name] === undefined) {
        platform.addVariable(doc, name, num)
      } else if (prev[name] !== val) {
        platform.setVariable(doc, name, num)
      }
    })
    // Remove vars deleted from classic state
    const platformVars = objectsByKind<Variable>(doc, 'variable')
    Object.keys(prev).forEach(name => {
      if (!(name in s.vars)) {
        const v = platformVars.find(pv => pv.name === name)
        if (v) platform.removeObject(doc, v.id)
      }
    })
    prevVarsRef.current = { ...s.vars }
  }, [s.vars, doc])

  // ─── Bridge: platform vars → classic vars ───────────────────────────────────
  // Wrap the bridge so VariablesPanel mutations also update classic compute scope
  const syncedBridge: UseMathDocumentReturn = useMemo(() => ({
    ...bridge,
    addVariable: (name: string, value: number, unit?: string) => {
      const id = bridge.addVariable(name, value, unit)
      s.setVars({ ...s.vars, [name]: value })
      return id
    },
    setVariable: (idOrName: string, value: number) => {
      bridge.setVariable(idOrName, value)
      const found = objectsByKind<Variable>(doc, 'variable').find(
        v => v.id === idOrName || v.name === idOrName
      )
      if (found) s.setVars({ ...s.vars, [found.name]: value })
    },
    removeObject: (id: string) => {
      const found = objectsByKind<Variable>(doc, 'variable').find(v => v.id === id)
      bridge.removeObject(id)
      if (found) {
        const next = { ...s.vars }
        delete next[found.name]
        s.setVars(next)
      }
    },
  }), [bridge, s, doc]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Lesson config ──────────────────────────────────────────────────────────
  const appliedConfigRef = useRef<MathOSOpenConfig | null>(null)
  useEffect(() => {
    if (!lessonConfig || lessonConfig === appliedConfigRef.current) return
    appliedConfigRef.current = lessonConfig

    // Apply variables from lesson config to both systems
    if (lessonConfig.variables) {
      Object.entries(lessonConfig.variables).forEach(([name, value]) => {
        const existing = objectsByKind<Variable>(doc, 'variable').find(v => v.name === name)
        if (existing) {
          platform.setVariable(doc, name, value)
        } else {
          platform.addVariable(doc, name, value)
        }
      })
      s.setVars({ ...s.vars, ...lessonConfig.variables })
    }

    // Jump to a section if specified
    if (lessonConfig.section) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      s.setSection(lessonConfig.section as any)
    }
  }, [lessonConfig, doc]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Panel state ────────────────────────────────────────────────────────────
  const [showLeft, setShowLeft]   = useState(false)
  const [showRight, setShowRight] = useState(false)
  const [rightTab, setRightTab]   = useState<RightTab>('history')
  const [mobilePanel, setMobilePanel] = useState<'workspace' | 'variables' | 'details'>('workspace')

  if (!open) return null

  return (
    <div
      role="dialog" aria-label="MathOS workspace"
      className={`fixed z-[2000] flex flex-col ${maximized ? '' : 'rounded-2xl border'} ${ui.border} overflow-hidden backdrop-blur-3xl ${ui.bg0} ${ui.txt1} shadow-[0_20px_60px_rgba(0,0,0,0.5)]`}
      style={maximized ? { inset: 0 } : { left: Math.max(0, Math.min(pos.x, viewport.width - width)), top: Math.max(0, Math.min(pos.y, viewport.height - height)), width, height, userSelect: dragging.current ? 'none' : 'auto' }}
    >
      <TitleBar
        angleMode={s.angleMode}
        onAngleModeToggle={() => s.setAngleMode(a => a === 'RAD' ? 'DEG' : 'RAD')}
        onClose={onClose}
        onMouseDown={maximized ? () => {} : onMouseDown}
        maximized={maximized}
        onToggleMaximize={toggleMaximize}
        ui={ui}
      />

      {/* Panel toggle toolbar */}
      <div className={`flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-200/10 dark:border-white/5 ${ui.bg1} shrink-0`}>
        {compact && <button onClick={() => setMobilePanel('workspace')} aria-pressed={mobilePanel === 'workspace'} className="text-xs px-2 py-1 rounded border">Workspace</button>}
        <button
          type="button"
          onClick={() => compact ? setMobilePanel(p => p === 'variables' ? 'workspace' : 'variables') : setShowLeft(v => !v)}
          aria-pressed={compact ? mobilePanel === 'variables' : showLeft}
          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-colors border ${showLeft ? 'bg-brand-500/15 text-brand-400 border-brand-500/20' : 'text-slate-500 border-transparent hover:border-white/10 hover:bg-white/5'}`}
        >
          Variables
        </button>
        <button
          type="button"
          onClick={() => compact ? setMobilePanel(p => p === 'details' ? 'workspace' : 'details') : setShowRight(v => !v)}
          aria-pressed={compact ? mobilePanel === 'details' : showRight}
          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-colors border ${showRight ? 'bg-brand-500/15 text-brand-400 border-brand-500/20' : 'text-slate-500 border-transparent hover:border-white/10 hover:bg-white/5'}`}
        >
          History & tools
        </button>
        <div className="h-4 w-px bg-white/10 mx-1" />
        <span className="text-[11px] text-slate-500">{s.history.length} calculations saved locally</span>
        {lessonConfig?.title && (
          <>
            <div className="h-4 w-px bg-white/10 mx-1" />
            <span className="text-[11px] text-brand-400 font-semibold">{lessonConfig.title}</span>
          </>
        )}
      </div>

      <ProjectControls s={s} onClose={onClose} onWorkspace={() => setMobilePanel('workspace')} />

      {/* 3-column body */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left: Variables (synced to classic compute scope) */}
        {(compact ? mobilePanel === 'variables' : showLeft) && (
          <div className={`${compact ? 'w-full' : 'w-[240px]'} shrink-0 border-r border-slate-200/10 dark:border-white/5 overflow-y-auto p-3 space-y-3 ${ui.bg1}`}>
            <VariablesPanel bridge={syncedBridge} ui={ui} />
          </div>
        )}

        {/* Center: classic MathOS sections */}
        <div className={`${compact && mobilePanel !== 'workspace' ? 'hidden' : 'flex'} flex-1 flex-col overflow-hidden min-w-0`}>
          <MathOSCenter s={s} />
        </div>

        {/* Right: Inspector + Timeline + Animate */}
        {(compact ? mobilePanel === 'details' : showRight) && (
          <div className={`${compact ? 'w-full' : 'w-[300px]'} shrink-0 border-l border-slate-200/10 dark:border-white/5 flex flex-col overflow-hidden ${ui.bg1}`}>
            <div className="flex flex-wrap items-center border-b border-slate-200/10 dark:border-white/5 px-2 pt-2 gap-0.5 shrink-0">
              {([
                ['history', 'History'],
                ['inspector', 'Inspect'],
                ['timeline',  'Timeline'],
                ['animate',   'Animate'],
              ] as [RightTab, string][]).map(([tab, label]) => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={`px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-t-lg transition-colors ${rightTab === tab ? 'text-brand-400 bg-brand-500/10 border border-b-0 border-brand-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {rightTab === 'history' && <section aria-label="Calculation history" className="space-y-2">
                <p className={`text-xs ${ui.txt2}`}>Select a calculation to inspect its saved result. Press Compute to run it again with current variables.</p>
                {!s.history.length && <p className="text-sm py-4">Your calculations will appear here. Start with an expression such as 2^10.</p>}
                {s.history.slice().reverse().map((entry, index) => <button key={index} className={`block w-full text-left p-3 rounded-lg border ${ui.border} ${ui.hoverBg}`} onClick={() => {
                  s.setInput(entry.input); s.setResult(entry.result); s.setSection('compute'); s.setTab('symbolic'); setMobilePanel('workspace')
                }}>
                  <span className="block text-xs font-mono break-all">{entry.input}</span>
                  <span className="block text-sm font-semibold text-emerald-500 break-all mt-1">{entry.result?.numerical}</span>
                </button>)}
              </section>}
              {rightTab === 'inspector' && <InspectorPanel bridge={bridge} ui={ui} />}
              {rightTab === 'timeline'  && <TimelinePanel doc={doc} ui={ui} />}
              {rightTab === 'animate'   && <AnimationPanel bridge={syncedBridge} ui={ui} />}
            </div>
          </div>
        )}

      </div>

      <StatusBar varCount={Object.keys(s.vars).length} historyCount={s.history.length} ui={ui} />
    </div>
  )
}
