// LightsView.jsx
// The Meridian drawn in SVG: hull, six rooms, crew who walk between them. Lit rooms glow,
// alarms pulse, and a room the learner clicks is outlined: the inspector shows its data.
import { CREW, ROOMS, crewIn } from './lights.js'

const ROOM = Object.fromEntries(ROOMS.map(r => [r.name, r]))
const CREW_INFO = Object.fromEntries(CREW.map(c => [c.id, c]))

function crewPos(c) {
  const r = ROOM[c.room]
  const cols = Math.max(1, Math.floor((r.w - 30) / 30))
  return { x: r.x + 24 + (c.slot % cols) * 30, y: r.y + r.h - 24 - Math.floor(c.slot / cols) * 30 }
}

export default function LightsView({ world, selected, onSelect }) {
  return (
    <svg className="lm-ship" viewBox="0 52 870 326" role="img" aria-label="The ship Meridian, seen from above">
      <defs>
        <radialGradient id="lm-lit" cx="50%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#fff4d6" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#b45309" stopOpacity="0.35" />
        </radialGradient>
        <linearGradient id="lm-hull" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0b1220" />
        </linearGradient>
        <filter id="lm-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="9" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <pattern id="lm-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="#334155" strokeOpacity="0.35" strokeWidth="0.6" />
        </pattern>
      </defs>

      {/* engine plume */}
      <g className="lm-plume">
        <ellipse cx="38" cy="215" rx="34" ry="30" fill="#38bdf8" opacity="0.18" />
        <ellipse cx="44" cy="215" rx="20" ry="18" fill="#7dd3fc" opacity="0.35" />
      </g>

      {/* hull */}
      <path d="M58 132 L120 80 L230 66 L640 66 L760 110 L852 200 L852 230 L760 320 L640 364 L230 364 L120 350 L58 298 Z"
        fill="url(#lm-hull)" stroke="#475569" strokeWidth="2" />
      <path d="M58 132 L120 80 L230 66 L640 66 L760 110 L852 200 L852 230 L760 320 L640 364 L230 364 L120 350 L58 298 Z"
        fill="url(#lm-grid)" />
      {/* spine corridor */}
      <rect x="228" y="207" width="404" height="16" rx="3" fill="#0f172a" stroke="#334155" />

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
    </svg>
  )
}
