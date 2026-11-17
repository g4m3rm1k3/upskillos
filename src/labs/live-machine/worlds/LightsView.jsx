// LightsView.jsx
// The Meridian drawn in SVG: hull, six rooms, crew who walk between them. Lit rooms glow,
// alarms pulse, and a room the learner clicks is outlined: the inspector shows its data.
import { CREW, ROOMS, crewIn } from './ship.js'
import ShipFrame from './ShipFrame.jsx'

const ROOM = Object.fromEntries(ROOMS.map(r => [r.name, r]))
const CREW_INFO = Object.fromEntries(CREW.map(c => [c.id, c]))

function crewPos(c) {
  const r = ROOM[c.room]
  const cols = Math.max(1, Math.floor((r.w - 30) / 30))
  return { x: r.x + 24 + (c.slot % cols) * 30, y: r.y + r.h - 24 - Math.floor(c.slot / cols) * 30 }
}

export default function LightsView({ world, selected, onSelect }) {
  return (
    <ShipFrame>
      {world.rooms.map(r => {
        const box = ROOM[r.name]
        const n = crewIn(world, r.name)
        const isSel = selected === r.name
        const bad = r.error != null
        return (
          <g key={r.name} className={`lm-room${r.lit ? ' is-lit' : ''}${r.alarm ? ' is-alarm' : ''}${isSel ? ' is-sel' : ''}`}
            onClick={() => onSelect(r.name)} role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(r.name) }}
            aria-label={`${r.name}: ${r.lit ? 'lit' : 'dark'}, ${n} crew${r.alarm ? ', alarm' : ''}`}>
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="8" className="lm-room-floor" />
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="8" fill="url(#lm-lit)" className="lm-room-light" filter="url(#lm-glow)" />
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="8" className="lm-room-edge" />
            <text x={box.x + 12} y={box.y + 24} className="lm-room-name">{r.name}</text>
            <text x={box.x + box.w - 12} y={box.y + 24} textAnchor="end" className={`lm-room-answer${bad ? ' is-err' : ''}`}>
              {bad ? '⚠ error' : r.answer === undefined ? '' : `→ ${String(r.answer)}`}
            </text>
            {r.alarm > 0 && (
              <g className="lm-alarm-icon">
                <circle cx={box.x + box.w / 2} cy={box.y + box.h / 2 - 6} r="15" />
                <text x={box.x + box.w / 2} y={box.y + box.h / 2} textAnchor="middle">!</text>
              </g>
            )}
          </g>
        )
      })}

      {world.crew.map(c => {
        const info = CREW_INFO[c.id]
        const p = crewPos(c)
        const lit = world.rooms.find(r => r.name === c.room)?.lit
        return (
          <g key={c.id} className={`lm-crew${lit ? '' : ' in-dark'}`} style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
            <circle r="13" fill={info.color} />
            <text y="4.5" textAnchor="middle">{info.name[0]}</text>
            <title>{`${info.name}, ${info.role}`}</title>
          </g>
        )
      })}

      {world.blackout && (
        <g className="lm-blackout">
          <rect x="300" y="190" width="280" height="50" rx="10" />
          <text x="440" y="221" textAnchor="middle">BLACKOUT · reactor recharging</text>
        </g>
      )}
    </ShipFrame>
  )
}
