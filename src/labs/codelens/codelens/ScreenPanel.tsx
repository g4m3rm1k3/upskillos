// What a pygame program's window shows at the current step (python/codelens_pygame.py).
// The window changes only when the program calls display.flip(): drawing in between
// happens off screen, so the picture here is the last one flipped, and the caption says
// which frame the program is drawing meanwhile.
import { Monitor } from 'lucide-react'
import { useCodeLensTheme } from './ThemeContext'
import type { ScreenFrame, TraceEvent } from './types'

interface ScreenPanelProps {
  frames: ScreenFrame[]
  event: TraceEvent | null
}

export default function ScreenPanel({ frames, event }: ScreenPanelProps) {
  const { theme: { ui } } = useCodeLensTheme()
  const picture = event?.screen != null ? frames[event.screen] : undefined
  const drawing = event?.gameFrame ?? 0

  return (
    <div style={{ background: ui.panelBg, border: `1px solid ${ui.border}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: `1px solid ${ui.border}`, background: ui.headerBg }}>
        <Monitor size={13} color={ui.accent} />
        <span style={{ fontSize: 11, fontWeight: 600, color: ui.text }}>Screen</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: ui.textFaint }}>
          {picture ? `frame ${picture.frame} · ${picture.timeMs} ms` : 'nothing shown yet'}
        </span>
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {picture ? (
          <img
            src={`data:image/png;base64,${picture.png}`}
            width={picture.width}
            height={picture.height}
            alt={`The window at frame ${picture.frame}`}
            style={{ width: '100%', height: 'auto', imageRendering: 'pixelated', borderRadius: 4, background: '#000' }}
          />
        ) : (
          <div style={{ fontSize: 11, color: ui.textMuted, padding: '12px 4px' }}>
            The window shows nothing until the program first calls <code>pygame.display.flip()</code>.
          </div>
        )}
        <div style={{ fontSize: 11, color: ui.textMuted, lineHeight: 1.5 }}>
          Drawing frame {drawing}
          {picture && picture.frame < drawing - 1 && ` (frames ${picture.frame + 1}–${drawing - 1} looked the same)`}
          . What it draws now appears at its next <code>flip()</code>.
          {event?.gameEvents?.length ? <><br />Just received: {event.gameEvents.join(', ')}</> : null}
        </div>
      </div>
    </div>
  )
}
