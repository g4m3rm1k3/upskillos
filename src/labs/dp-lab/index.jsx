import DP01DynamicProgramming from './DP01DynamicProgramming.jsx'

export const meta = {
  label: 'Dynamic Programming Lab',
  emoji: '🧬',
  color: 'cyan',
  desc: 'Write six DP recurrences yourself — Climbing Stairs through Edit Distance — and watch the table fill cell-by-cell as dependencies resolve. JS + Python dual-language.',
  tags: ['DSA', 'Dynamic Programming', 'Python', 'Interactive', 'Algorithms'],
  cover: { grad: 'from-cyan-700 via-slate-800 to-slate-950', mark: 'dp[i]', sub: 'Recurrence · Table · O(n·k)' },
}

export default function DPLabEntry({ onBack }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#080c0f', overflow: 'hidden', zIndex: 1700 }}>
      <DP01DynamicProgramming onBack={onBack} />
    </div>
  )
}
