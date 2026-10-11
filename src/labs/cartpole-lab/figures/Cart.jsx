// The cart and pole drawn to scale from the 4 numbers: 1 m of track is 100 px, the pole is 1 m
// long (2 × half_length), the dashed lines are the ±2.4 m limits and the faint wedge is ±12°.
import { ARROWS } from '../engine/cartpole.js'

export const fmt = (x, d = 3) => x == null ? '—' : typeof x !== 'number' ? String(x) : Number.isInteger(x) ? String(x) : Math.abs(x) < 1e-3 && x !== 0 ? x.toExponential(2) : x.toFixed(d)

export default function Cart({ state, ghost, action, halfLength = 0.5, label, height = 190, showNumbers = true, fallen = false, compact = false }) {
  const W = 620, ground = height - 34, scale = 100
  const X = x => W / 2 + x * scale
  const draw = (s, faint) => {
    const [x, , theta] = s
    const cx = X(x), tipX = cx + Math.sin(theta) * halfLength * 2 * scale, tipY = ground - 18 - Math.cos(theta) * halfLength * 2 * scale
    return <g opacity={faint ? 0.25 : 1}>
      <rect x={cx - 30} y={ground - 26} width="60" height="22" rx="5" fill={faint ? '#b9a98f' : '#2c241b'} />
      <circle cx={cx - 17} cy={ground - 3} r="5" fill={faint ? '#b9a98f' : '#5a4a38'} /><circle cx={cx + 17} cy={ground - 3} r="5" fill={faint ? '#b9a98f' : '#5a4a38'} />
      <line x1={cx} y1={ground - 18} x2={tipX} y2={tipY} stroke={faint ? '#d8b98c' : fallen ? '#a8402f' : '#d9822b'} strokeWidth="8" strokeLinecap="round" />
      <circle cx={cx} cy={ground - 18} r="4" fill="#f6ead6" />
    </g>
  }
  const s = state ?? [0, 0, 0, 0]
  const limitAngle = 12 * Math.PI / 180
  const wedge = a => `${X(s[0]) + Math.sin(a) * 90},${ground - 18 - Math.cos(a) * 90}`
  return <svg viewBox={`0 0 ${W} ${height}`} className="cp-cart" role="img" aria-label={state ? `CartPole: cart at ${fmt(s[0])} m, pole at ${fmt(s[2])} rad` : 'CartPole'}>
    <rect x="0" y="0" width={W} height={height} fill="#fbf7ef" rx="8" />
    <polygon points={`${X(s[0])},${ground - 18} ${wedge(-limitAngle)} ${wedge(limitAngle)}`} fill="#2f7d4f" opacity=".08" />
    {[-2.4, 2.4].map(l => <g key={l}><line x1={X(l)} y1="12" x2={X(l)} y2={ground + 4} stroke="#a8402f" strokeDasharray="4 5" opacity=".55" /><text x={X(l)} y={height - 6} textAnchor="middle" className="qm-tick">{l > 0 ? '+' : '−'}2.4 m</text></g>)}
    <line x1="10" y1={ground + 4} x2={W - 10} y2={ground + 4} stroke="#8a7a66" strokeWidth="2" />
    <text x={X(0)} y={height - 6} textAnchor="middle" className="qm-tick">0</text>
    {ghost && draw(ghost, true)}
    {draw(s, false)}
    {action != null && <text x={X(s[0])} y={ground - 34} textAnchor="middle" fontSize="22" fill="#1f6f68">{ARROWS[action]}</text>}
    {label && <text x="12" y="20" className="cp-cart-label">{label}</text>}
    {showNumbers && state && !compact && <text x={W - 12} y="20" textAnchor="end" className="cp-cart-label mono">x {fmt(s[0])} · ẋ {fmt(s[1])} · θ {fmt(s[2])} · θ̇ {fmt(s[3])}</text>}
  </svg>
}
