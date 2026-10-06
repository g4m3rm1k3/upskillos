import DSA02LinkedLists from './DSA02LinkedLists.jsx'

export const meta = {
  label: 'Linked Lists Lab',
  emoji: '🔗',
  color: 'cyan',
  desc: 'Full hacker-workstation DSA lab: build nodes, prepend/append, delete, reverse, and cycle detection with animated pointer visualization and step tracer. JS + Python dual-language.',
  tags: ['DSA', 'Pointers', 'Python', 'Interactive'],
  cover: { grad: 'from-cyan-800 via-slate-800 to-slate-950', mark: '→○→', sub: 'Nodes · Pointers · Cycles' },
}

export default function DSALinkedListsLabEntry({ onBack }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#080c0f', overflow: 'hidden', zIndex: 1700 }}>
      <DSA02LinkedLists onBack={onBack} />
    </div>
  )
}
