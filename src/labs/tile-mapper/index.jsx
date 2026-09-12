import TileMapper from './TileMapper.jsx'

export { default as meta } from './meta.js'

export default function TileMapperEntry({ onBack, onClose }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <TileMapper onBack={onBack ?? onClose} />
    </div>
  )
}
