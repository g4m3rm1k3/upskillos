import SpriteForge from './SpriteForge.jsx'

export { default as meta } from './meta.js'

export default function SpriteForgeEntry({ onBack, onClose }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <SpriteForge onBack={onBack ?? onClose} />
    </div>
  )
}
