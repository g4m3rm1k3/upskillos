import CmmLab from './CmmLab.jsx'

export const meta = {
  label: 'CMM Lab',
  emoji: '⊹',
  color: 'emerald',
  desc: 'Simulate a coordinate measuring machine — probe circles, planes, and cylinders, watch the normal equation solve live, and read a real GD&T report with diameter deviation, circularity, flatness, and cylindricity.',
  tags: ['Engineering', 'Math', 'Metrology'],
  cover: { grad: 'from-emerald-700 via-teal-800 to-cyan-950', mark: 'AᵀAx=Aᵀb', sub: 'Circle · Plane · Cylinder' },
}

export default function CmmLabEntry({ onBack }) {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 1700 }}>
      <CmmLab onBack={onBack} />
    </div>
  )
}
