// What a pygame program's window shows at the current step (python/codelens_pygame.py).
// The window changes only when the program calls display.flip(): drawing in between
// happens off screen, so the picture here is the last one flipped, and the caption says
// which frame the program is drawing meanwhile.
//
// The whole picture always fits the space it is given (the Data dock, or a pop-out
// window: ScreenPopOut), scaled down if needed but never cropped or scrolled.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink } from 'lucide-react'
import { useCodeLensTheme } from './ThemeContext'
import type { ScreenFrame, TraceEvent } from './types'

interface ScreenPanelProps {
  frames: ScreenFrame[]
  event: TraceEvent | null
  /** The most height the picture may take: px, 'column' (the side panel) or 'window' (a pop-out window). */
  fit?: number | 'column' | 'window'
  onPopOut?: () => void
}

export default function ScreenPanel({ frames, event, fit, onPopOut }: ScreenPanelProps) {
  const { theme: { ui } } = useCodeLensTheme()
  const picture = event?.screen != null ? frames[event.screen] : undefined
  const drawing = event?.gameFrame ?? 0
  const maxHeight = fit === 'window' ? 'calc(100vh - 64px)' : fit === 'column' ? 'calc(100vh - 330px)' : fit ? `${fit}px` : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: fit === 'window' ? '100vh' : undefined, padding: fit === 'window' ? 10 : 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: ui.textMuted, flexWrap: 'wrap' }}>
        <span style={{ color: ui.text, fontWeight: 600 }}>{picture ? `Frame ${picture.frame}` : 'Nothing shown yet'}</span>
        {picture && <span>{picture.timeMs} ms</span>}
        <span>· drawing frame {drawing}{picture && picture.frame < drawing - 1 ? ` (frames ${picture.frame + 1}–${drawing - 1} looked the same)` : ''}</span>
        {event?.gameEvents?.length ? <span style={{ color: ui.amberSoft }}>· just received {event.gameEvents.join(', ')}</span> : null}
        {onPopOut && (
          <button onClick={onPopOut} title="Open the screen in its own window, which follows the step you are on"
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 5, border: `1px solid ${ui.border}`, background: 'transparent', color: ui.text, cursor: 'pointer' }}>
            <ExternalLink size={12} /> Pop out
          </button>
        )}
      </div>
      {picture ? (
        <img
          src={`data:image/png;base64,${picture.png}`}
          alt={`The window at frame ${picture.frame}`}
          style={{ display: 'block', maxWidth: '100%', maxHeight, width: 'auto', height: 'auto', objectFit: 'contain', alignSelf: 'center', borderRadius: 4, background: '#000' }}
        />
      ) : (
        <div style={{ fontSize: 11, color: ui.textMuted, padding: '12px 4px' }}>
          The window shows nothing until the program first calls <code>pygame.display.flip()</code>.
        </div>
      )}
      <div style={{ fontSize: 10.5, color: ui.textFaint }}>What the program draws now appears at its next <code>flip()</code>.</div>
    </div>
  )
}

/**
 * Renders its children in a separate browser (or desktop app) window, through a React
 * portal, so the content keeps updating with the step. Keys pressed in that window are
 * passed to onKey, so stepping works from there too. Calls onClosed when the learner
 * closes the window, or right away (with blocked = true) when the browser refuses to open it.
 */
let popOutWindow: Window | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null

export function ScreenPopOut({ title, background, onKey, onClosed, children }: {
  title: string
  background: string
  onKey: (e: KeyboardEvent) => void
  onClosed: (blocked: boolean) => void
  children: ReactNode
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const onKeyRef = useRef(onKey)
  onKeyRef.current = onKey
  const onClosedRef = useRef(onClosed)
  onClosedRef.current = onClosed

  useEffect(() => {
    // Reuse a window that is still open: React mounts twice in development, and closing
    // and reopening would flash (or lose) the window. Closing is deferred for the same reason.
    if (closeTimer) clearTimeout(closeTimer)
    const win = popOutWindow && !popOutWindow.closed ? popOutWindow : window.open('', 'codelens-screen', 'width=780,height=760')
    if (!win) { onClosedRef.current(true); return }
    popOutWindow = win
    const doc = win.document
    doc.title = title
    doc.body.innerHTML = ''
    doc.body.style.cssText = `margin:0;background:${background};font-family:system-ui,sans-serif;overflow:hidden`
    const root = doc.createElement('div')
    doc.body.appendChild(root)
    const key = (e: KeyboardEvent) => onKeyRef.current(e)
    const closed = () => onClosedRef.current(false)
    win.addEventListener('keydown', key)
    win.addEventListener('pagehide', closed)
    setContainer(root)
    return () => {
      win.removeEventListener('keydown', key)
      win.removeEventListener('pagehide', closed)
      closeTimer = setTimeout(() => { win.close(); if (popOutWindow === win) popOutWindow = null }, 0)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return container ? createPortal(children, container) : null
}
