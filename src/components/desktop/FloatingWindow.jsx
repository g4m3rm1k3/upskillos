import { useEffect, useRef, useState } from 'react'
import LabErrorBoundary from '../ui/LabErrorBoundary.jsx'

const PANEL_W = 960
const PANEL_H = 640
const MIN_W = 420
const MIN_H = 320
const SNAP_EDGE_PX = 24
const TOP_MARGIN = 44 // stays clear of the app's own top bar, same margin used elsewhere in this file
const TITLE_BAR_H = 32 // matches the h-8 title bar below; the drag-clamp keeps this much visible vertically
const TITLE_BAR_MIN_VISIBLE = 80 // px of title bar kept on-screen horizontally at minimum — enough to grab and drag back

function MacDots({ onClose, onMinimize, onMaximize, isMaximized }) {
  return (
    <div className="flex items-center gap-[6px]">
      <button onClick={onClose} title="Close"
        className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-75 active:brightness-50 transition-all focus:outline-none" />
      <button
        onClick={isMaximized ? undefined : onMinimize}
        title={isMaximized ? undefined : 'Minimize'}
        className={`w-3 h-3 rounded-full bg-[#ffbd2e] transition-all focus:outline-none ${isMaximized ? 'opacity-30 cursor-default' : 'hover:brightness-75 active:brightness-50'}`}
      />
      <button onClick={onMaximize} title={isMaximized ? 'Restore' : 'Maximize'}
        className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-75 active:brightness-50 transition-all focus:outline-none" />
    </div>
  )
}

export default function FloatingWindow({ win, zIndex, onClose, onMinimize, onMaximize, onFocus, onDockChange }) {
  const offset = (win.offset ?? 0) * 24
  // A lab can request a bigger-than-default window (win.width/height, from
  // its own meta.js) — clamped against the actual screen so a request
  // bigger than the monitor can't open partly off-screen, the same
  // MIN_W/H-style clamp startResize below already applies to manual drags.
  const initialW = Math.min(win.width ?? PANEL_W, window.innerWidth - 40)
  const initialH = Math.min(win.height ?? PANEL_H, window.innerHeight - 80)
  const [pos, setPos] = useState(() => ({
    x: Math.max(0, (window.innerWidth - initialW) / 2 + offset),
    y: Math.max(44, 80 + offset),
  }))
  const [size, setSize] = useState(() => ({ w: initialW, h: initialH }))
  const dragging = useRef(false)
  const origin = useRef({ mx: 0, my: 0, wx: 0, wy: 0 })
  const resizing = useRef(false)
  const resizeOrigin = useRef({ mx: 0, my: 0, sw: 0, sh: 0 })
  const isMax = win.state === 'maximized'
  const Component = win.Component

  // Edge-snap docking: drag the title bar to the left/right screen edge to
  // snap the window to exactly that half. `isDocked`/`preDock` are refs, not
  // state — nothing about them needs to trigger a render on their own, they
  // only matter to startDrag/up, which read the current pos/size directly.
  const isDocked = useRef(null) // 'left' | 'right' | null
  const preDock = useRef(null) // { pos, size } captured just before the last dock
  const [snapPreview, setSnapPreview] = useState(null) // 'left' | 'right' | null, live feedback while dragging

  function startDrag(e) {
    if (isMax || e.button !== 0) return
    e.preventDefault()
    if (isDocked.current && preDock.current) {
      // Picking a docked window back up restores its pre-dock size first,
      // centered under the cursor — following the mouse at exactly
      // half-screen width would feel like dragging a slab, not a window.
      const restored = preDock.current
      const wx = e.clientX - restored.size.w / 2
      const wy = Math.max(TOP_MARGIN, e.clientY - 16)
      setSize(restored.size)
      setPos({ x: wx, y: wy })
      origin.current = { mx: e.clientX, my: e.clientY, wx, wy }
      isDocked.current = null
      onDockChange?.(null)
    } else {
      origin.current = { mx: e.clientX, my: e.clientY, wx: pos.x, wy: pos.y }
    }
    dragging.current = true
  }

  function startResize(e) {
    if (isMax || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    if (isDocked.current) onDockChange?.(null)
    isDocked.current = null // manual resize breaks the exact-half-screen docked state
    resizing.current = true
    resizeOrigin.current = { mx: e.clientX, my: e.clientY, sw: size.w, sh: size.h }
  }

  useEffect(() => {
    const move = (e) => {
      if (dragging.current) {
        const nx = origin.current.wx + e.clientX - origin.current.mx
        const ny = origin.current.wy + e.clientY - origin.current.my
        // Clamp so the title bar — the only thing close/minimize/resize
        // live on — can never be dragged fully off-screen. Without this, a
        // fast drag past the top or a side edge leaves the window
        // unreachable with no visible chrome left to grab or click.
        // Keeping at least TITLE_BAR_MIN_VISIBLE px on-screen both axes
        // guarantees there's always something left to click back into view.
        setPos({
          x: Math.max(TITLE_BAR_MIN_VISIBLE - size.w, Math.min(nx, window.innerWidth - TITLE_BAR_MIN_VISIBLE)),
          y: Math.max(0, Math.min(ny, window.innerHeight - TITLE_BAR_H)),
        })
        if (e.clientX <= SNAP_EDGE_PX) setSnapPreview('left')
        else if (e.clientX >= window.innerWidth - SNAP_EDGE_PX) setSnapPreview('right')
        else setSnapPreview(null)
      }
      if (resizing.current) {
        const maxW = window.innerWidth - 40
        const maxH = window.innerHeight - 80
        setSize({
          w: Math.min(maxW, Math.max(MIN_W, resizeOrigin.current.sw + (e.clientX - resizeOrigin.current.mx))),
          h: Math.min(maxH, Math.max(MIN_H, resizeOrigin.current.sh + (e.clientY - resizeOrigin.current.my))),
        })
      }
    }
    const up = () => {
      if (dragging.current && snapPreview) {
        preDock.current = { pos, size }
        const dockedSize = { w: Math.round(window.innerWidth / 2), h: window.innerHeight - TOP_MARGIN }
        setSize(dockedSize)
        setPos({ x: snapPreview === 'right' ? window.innerWidth - dockedSize.w : 0, y: TOP_MARGIN })
        isDocked.current = snapPreview
        onDockChange?.(snapPreview)
      }
      dragging.current = false
      resizing.current = false
      setSnapPreview(null)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    // pos/size/snapPreview/onDockChange are read (not just set) inside `up`,
    // so — unlike the original zero-dependency version of this effect —
    // this one has to resubscribe when they change to avoid `up` closing
    // over stale values. Re-attaching two window listeners on drag/resize
    // is cheap.
  }, [pos, size, snapPreview, onDockChange])

  if (isMax) {
    return (
      <div
        data-desktop-window={win.id}
        className="fixed inset-0 flex flex-col"
        style={{ zIndex, pointerEvents: 'auto' }}
        onMouseDown={onFocus}
      >
        {/* A real row (not absolute-over-content) — reserves actual height so
            every lab's own top-left UI (back buttons, headers, ...) gets
            pushed below the dots instead of colliding with them. Absolute
            positioning here used to overlap whatever a lab drew in that same
            corner, on every lab, every time — fixed once here rather than
            padding each lab individually. Solid background, not translucent —
            this bar sits at z-1800 above the app's own top bar (z-100), and a
            translucent fill let that page chrome show through underneath it. */}
        <div className="flex-shrink-0 h-7 flex items-center px-3 bg-[#e8e8e8] dark:bg-[#2c2c2e]">
          <MacDots onClose={onClose} onMinimize={undefined} onMaximize={onMaximize} isMaximized />
        </div>
        <div className="flex-1 overflow-hidden" style={{ transform: 'translate(0,0)' }}>
          <LabErrorBoundary label={win.label} backTo={win.backTo}>
            {/* Games/labs were written against two different close-prop conventions
                (onBack vs onClose) with no single source of truth — pass both so
                either works, instead of each one silently no-oping when wired the
                "wrong" way (this is how golf's close button and fullscreen-detection
                broke when opened through the window manager). */}
            <Component onBack={onClose} onClose={onClose} />
          </LabErrorBoundary>
        </div>
      </div>
    )
  }

  return (
    <>
      {snapPreview && (
        <div
          className="fixed pointer-events-none bg-blue-400/20 border-2 border-blue-400/60 rounded-lg"
          style={{
            top: TOP_MARGIN,
            left: snapPreview === 'right' ? '50%' : 0,
            width: '50%',
            height: `calc(100vh - ${TOP_MARGIN}px)`,
            // Deliberately above every normal window (BASE_Z=1700+) and above
            // maximized (1800) — while dragging, the window being dragged is
            // often sitting right over the target edge itself, and the
            // preview needs to stay visible on top of it, not hidden under it.
            zIndex: 5000,
          }}
        />
      )}
      <div
        data-desktop-window={win.id}
        className="fixed flex flex-col rounded-xl overflow-hidden shadow-2xl border border-black/15 dark:border-white/[0.08]"
        style={{ left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex, pointerEvents: 'auto' }}
        onMouseDown={onFocus}
      >
        <div
          className="flex-shrink-0 h-8 flex items-center gap-3 px-3 select-none cursor-grab active:cursor-grabbing bg-[#e8e8e8] dark:bg-[#2c2c2e] border-b border-black/10 dark:border-white/[0.08]"
          onMouseDown={startDrag}
        >
          <MacDots onClose={onClose} onMinimize={onMinimize} onMaximize={onMaximize} isMaximized={false} />
          <span className="flex-1 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate pr-14">
            {win.emoji ? `${win.emoji} ` : ''}{win.label}
          </span>
        </div>
        {/* transform creates a containing block so fixed-position lab canvases clip to this window */}
        <div className="flex-1 overflow-hidden relative" style={{ transform: 'translate(0,0)' }}>
          <LabErrorBoundary label={win.label} backTo={win.backTo}>
            <Component onBack={onClose} onClose={onClose} />
          </LabErrorBoundary>
        </div>
        <div
          onMouseDown={startResize}
          title="Resize"
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10 group"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" className="absolute bottom-0.5 right-0.5 pointer-events-none text-slate-400 dark:text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity">
            <path d="M12 2L2 12M12 7L7 12M12 12L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </>
  )
}
