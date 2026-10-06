import MeshEngineLab from './MeshEngineLab.tsx'
import metaData from './meta.js'

export const meta = metaData;

interface MeshEngineLabEntryProps {
  onBack?: () => void
}

export default function MeshEngineLabEntry({ onBack }: MeshEngineLabEntryProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 1700 }}>
      <MeshEngineLab onBack={onBack} />
    </div>
  )
}
