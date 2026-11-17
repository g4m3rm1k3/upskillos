// ShipFrame.jsx
// The Meridian's hull, engine plume, corridor and shared SVG effects. Each world's view draws
// its rooms, doors and crew inside it.
export default function ShipFrame({ children }) {
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

      {children}
    </svg>
  )
}
