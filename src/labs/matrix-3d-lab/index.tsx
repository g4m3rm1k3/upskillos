import Matrix3DLab from './Matrix3DLab.tsx'

export const meta = {
  label: 'Matrix 3D Lab',
  emoji: '⊕',
  color: 'cyan',
  desc: "See linear algebra live in a 3D world — manipulate a 3D object with translate/rotate/scale sliders and watch the 4×4 matrix update in real time. Covers vectors, dot product, determinant, RREF, eigenvalues, Cramer's rule, and subspaces.",
  tags: ['Math', 'Three.js', 'Linear Algebra'],
  cover: { grad: 'from-cyan-700 via-blue-800 to-indigo-950', mark: '4×4', sub: 'Transforms · Eigenvalues · 3D' },
}

interface Matrix3DLabEntryProps {
  onBack?: () => void
}

export default function Matrix3DLabEntry({ onBack }: Matrix3DLabEntryProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 1700 }}>
      <Matrix3DLab onBack={onBack} />
    </div>
  )
}
