// DoorsView.jsx
// The Meridian with its doors: green gap = open, grey bar = closed, red bar = locked. Breached
// rooms flash red. Crew stand inside a room, at a door, in a doorway, or out in the corridor.
// Click a door (or its room) to inspect it.
import { CREW_INFO, ROOMS } from './ship.js'
import { DOORS, crewPoint } from './doors.js'
import ShipFrame from './ShipFrame.jsx'

const DOOR_LEN = 38
const DOOR_THICK = 9

export default function DoorsView({ world, selected, onSelect }) {
  return (
    <ShipFrame>
      {ROOMS.map(box => {
        const room = world.rooms.find(r => r.name === box.name)
        const isSel = selected === box.name
        return (
          <g key={box.name} className={`lm-room lm-room-plain${room.breach ? ' is-breach' : ''}${isSel ? ' is-sel' : ''}`}
            onClick={() => onSelect(box.name)} role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(box.name) }}
            aria-label={`${box.name}${room.breach ? ', hull breach' : ''}`}>
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="8" className="lm-room-floor" />
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="8" className="lm-room-edge" />
            <text x={box.x + 12} y={box.y + 24} className="lm-room-name">{box.name}</text>
            {room.breach > 0 && (
              <g className="lm-breach">
                <path d={`M${box.x + box.w - 40} ${box.y + 34} l14 10 l-8 6 l16 14`} />
                <text x={box.x + box.w / 2} y={box.y + box.h / 2 + 4} textAnchor="middle">HULL BREACH</text>
              </g>
            )}
          </g>
        )
      })}

      {world.doors.map(d => {
        const p = DOORS[d.room]
        const w = p.vertical ? DOOR_THICK : DOOR_LEN
        const h = p.vertical ? DOOR_LEN : DOOR_THICK
        const isSel = selected === d.room
        return (
          <g key={d.room} className={`lm-door is-${d.state}${isSel ? ' is-sel' : ''}${d.error ? ' is-err' : ''}`}
            onClick={() => onSelect(d.room)} role="button" tabIndex={0} aria-label={`${d.room} door: ${d.state}`}>
            <rect x={p.x - w / 2 - 4} y={p.y - h / 2 - 4} width={w + 8} height={h + 8} rx="3" className="lm-door-frame" />
            {d.state === 'open'
              ? (p.vertical
                ? <><rect x={p.x - w / 2} y={p.y - h / 2} width={w} height="7" rx="2" /><rect x={p.x - w / 2} y={p.y + h / 2 - 7} width={w} height="7" rx="2" /></>
                : <><rect x={p.x - w / 2} y={p.y - h / 2} width="7" height={h} rx="2" /><rect x={p.x + w / 2 - 7} y={p.y - h / 2} width="7" height={h} rx="2" /></>)
              : <rect x={p.x - w / 2} y={p.y - h / 2} width={w} height={h} rx="2" />}
            {d.state === 'locked' && <text x={p.x} y={p.y + (p.vertical ? 4 : -10)} textAnchor="middle" className="lm-door-lock">🔒</text>}
          </g>
        )
      })}

      {world.crew.map(c => {
        const info = CREW_INFO[c.id]
        const p = crewPoint(c)
        return (
          <g key={c.id} className={`lm-crew${c.phase === 'leaving' || c.phase === 'entering' ? ' is-waiting' : ''}`} style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
            <circle r="12" fill={info.color} />
            <text y="4.5" textAnchor="middle">{info.name[0]}</text>
            <title>{`${info.name}, ${info.role}${c.dest ? ` → ${c.dest}` : ''}`}</title>
          </g>
        )
      })}

      {/* each door's state, written next to it */}
      {world.doors.map(d => {
        const l = DOORS[d.room].label
        return <text key={`l-${d.room}`} x={l.x} y={l.y} textAnchor={l.anchor} className={`lm-door-label is-${d.error ? 'err' : d.state}`}>{d.error ? '⚠ error' : d.state}</text>
      })}
    </ShipFrame>
  )
}
