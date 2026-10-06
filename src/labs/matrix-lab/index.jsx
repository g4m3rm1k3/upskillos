import MatrixLab from './MatrixLab.jsx'

export const meta = {
  label: 'Matrix Lab',
  emoji: '⊡',
  color: 'violet',
  desc: 'Master linear algebra by coding it — row ops, Gaussian elimination, determinants, inverse, and Gram-Schmidt in JS, Python, and MATLAB.',
  tags: ['Math', 'Python', 'MATLAB'],
  cover: { grad: 'from-violet-700 via-purple-800 to-indigo-950', mark: 'Ax=b', sub: 'Row Ops · RREF · QR' },
}

export default function MatrixLabEntry({ onBack }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1a1a1a', overflow: 'hidden', zIndex: 1700 }}>
      <MatrixLab onBack={onBack} />
    </div>
  )
}
