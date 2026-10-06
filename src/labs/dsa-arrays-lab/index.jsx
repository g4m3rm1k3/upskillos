import DSA01Arrays from './DSA01Arrays.jsx'

export const meta = {
  label: 'Arrays & Memory Lab',
  emoji: '🧮',
  color: 'cyan',
  desc: 'Full hacker-workstation DSA lab: implement get, insert, delete, linear search, and binary search with live memory visualization and step tracer. JS + Python dual-language.',
  tags: ['DSA', 'Memory', 'Python', 'Interactive'],
  cover: { grad: 'from-cyan-700 via-slate-800 to-slate-950', mark: '[0]', sub: 'Memory · Pointers · O(n)' },
}

export default function DSAArraysLabEntry({ onBack }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#080c0f', overflow: 'hidden', zIndex: 1700 }}>
      <DSA01Arrays onBack={onBack} />
    </div>
  )
}
