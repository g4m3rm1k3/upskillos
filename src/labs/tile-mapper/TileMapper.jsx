import { useCallback, useEffect, useRef, useState } from 'react'
import MapCanvas from './MapCanvas.jsx'
import TilesetPanel from './TilesetPanel.jsx'
import LayersPanel from './LayersPanel.jsx'
import ExportPanel from './ExportPanel.jsx'
import MapLibrary from './MapLibrary.jsx'
import ImportTilesetDialog from './ImportTilesetDialog.jsx'
import { MAX_DIM, MIN_DIM, createDoc, normalizeDoc } from './tilemapDoc.js'
import {
  addLayer,
  addTerrain,
  clearLayer,
  duplicateLayer,
  moveLayer,
  refreshTerrains,
  removeLayer,
  removeTerrain,
  resizeDoc,
  shiftDoc,
  updateLayer,
  updateTerrain,
  useAutosave,
  useTilemapDoc,
  withLayerCells,
} from './useTilemapDoc.js'
import { getPref, loadMap, setPref } from './db.js'
import { loadImage } from './tileset.js'

const TOOLS = [
  { id: 'paint', label: 'Paint', key: 'B', icon: '✏' },
  { id: 'eraser', label: 'Erase', key: 'E', icon: '⌫' },
  { id: 'rect', label: 'Filled rectangle', key: 'R', icon: '▬' },
  { id: 'rectOutline', label: 'Rectangle outline', key: '⇧R', icon: '▭' },
  { id: 'fill', label: 'Bucket fill', key: 'G', icon: '▨' },
  { id: 'terrain', label: 'Autotile terrain', key: 'T', icon: '⌬' },
  { id: 'picker', label: 'Pick tile', key: 'I', icon: '⛏' },
  { id: 'pan', label: 'Pan', key: 'H', icon: '✋' },
]

export default function TileMapper({ onBack }) {
  const { doc, commit, apply, undo, redo, replaceDoc, canUndo, canRedo } = useTilemapDoc()
  // As in the sprite editor: nothing is written to storage until the restore
  // attempt settles, or the blank starting document races it and overwrites
  // the pointer to the real map.
  const [ready, setReady] = useState(false)
  const saveStatus = useAutosave(doc, { enabled: ready })

  const [layerIndex, setLayerIndex] = useState(0)
  const [tool, setTool] = useState('paint')
  const [brush, setBrush] = useState({ w: 1, h: 1, tiles: [0] })
  const [terrainId, setTerrainId] = useState(null)
  const [showGrid, setShowGrid] = useState(true)
  const [showCollision, setShowCollision] = useState(true)
  const [dimOtherLayers, setDimOtherLayers] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [hover, setHover] = useState(null)
  const [image, setImage] = useState(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const canvasRef = useRef(null)

  const terrain = doc.terrains.find((t) => t.id === terrainId) ?? doc.terrains[0] ?? null

  // The tileset lives in the document as a data URL; decoding it into an
  // HTMLImageElement is what drawImage actually needs, and it only has to
  // happen when the URL itself changes.
  useEffect(() => {
    let cancelled = false
    if (!doc.tileset?.dataUrl) {
      setImage(null)
      return undefined
    }
    loadImage(doc.tileset.dataUrl)
      .then((img) => {
        if (!cancelled) setImage(img)
      })
      .catch(() => {
        if (!cancelled) setImage(null)
      })
    return () => {
      cancelled = true
    }
  }, [doc.tileset?.dataUrl])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const lastId = await getPref('lastMapId')
        const existing = lastId ? await loadMap(lastId) : null
        if (existing && !cancelled) replaceDoc(existing)
      } catch {
        // A map that will not load should not stop the editor from opening.
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [replaceDoc])

  useEffect(() => {
    if (ready) setPref('lastMapId', doc.id)
  }, [doc.id, ready])

  useEffect(() => {
    if (layerIndex > doc.layers.length - 1) setLayerIndex(doc.layers.length - 1)
  }, [doc.layers.length, layerIndex])

  // Opening the tileset picker on a map that has none is the one piece of
  // hand-holding worth doing automatically — there is nothing else to do first.
  useEffect(() => {
    if (ready && !doc.tileset) setImportOpen(true)
  }, [ready, doc.tileset])

  const commitCells = useCallback(
    (cells) => {
      commit((prev) => withLayerCells(prev, layerIndex, cells))
    },
    [commit, layerIndex],
  )

  const newMap = (opts) => {
    replaceDoc(createDoc(opts))
    setLayerIndex(0)
    setLibraryOpen(false)
  }

  const openMap = async (id) => {
    const next = await loadMap(id)
    if (next) {
      replaceDoc(next)
      setLayerIndex(0)
      setLibraryOpen(false)
    }
  }

  const importProject = async (file) => {
    const text = await file.text()
    replaceDoc(normalizeDoc(JSON.parse(text)))
    setLayerIndex(0)
  }

  // --- keyboard -----------------------------------------------------------

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) {
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (e.ctrlKey || e.metaKey) return

      const k = e.key
      if (k === "'") return setShowGrid((g) => !g)
      if (k === ';') return setShowCollision((c) => !c)
      if (k === 'd') return setDimOtherLayers((d) => !d)
      // Digits select a layer by paint order, which is how the list is indexed
      // internally even though it is displayed front-to-back.
      if (/^[1-9]$/.test(k)) {
        const n = Number(k) - 1
        if (n < doc.layers.length) setLayerIndex(n)
        return
      }
      const map = {
        b: 'paint',
        e: 'eraser',
        r: e.shiftKey ? 'rectOutline' : 'rect',
        g: 'fill',
        t: 'terrain',
        i: 'picker',
        h: 'pan',
      }
      const lower = k.toLowerCase()
      if (map[lower]) setTool(map[lower])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, doc.layers.length])

  const headerBtn =
    'rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent'

  return (
    <div className="flex h-full w-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        {onBack && (
          <button type="button" onClick={onBack} className={headerBtn} title="Back to labs">
            ← Labs
          </button>
        )}
        <span className="text-sm">🗺️</span>
        <input
          value={doc.name}
          onChange={(e) => apply((prev) => ({ ...prev, name: e.target.value }))}
          className="w-40 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-semibold hover:border-slate-300 focus:border-brand-500 focus:outline-none dark:hover:border-slate-700"
          title="Map name — also the export file name"
        />

        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
        <button type="button" onClick={undo} disabled={!canUndo} className={headerBtn} title="Undo (Ctrl+Z)">
          ↶
        </button>
        <button type="button" onClick={redo} disabled={!canRedo} className={headerBtn} title="Redo (Ctrl+Shift+Z)">
          ↷
        </button>

        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
        <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400" title="Map size in tiles">
          <input
            type="number"
            min={MIN_DIM}
            max={MAX_DIM}
            value={doc.cols}
            onChange={(e) => commit((prev) => resizeDoc(prev, e.target.value, prev.rows))}
            className="w-14 rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[11px] dark:border-slate-600 dark:bg-slate-800"
          />
          ×
          <input
            type="number"
            min={MIN_DIM}
            max={MAX_DIM}
            value={doc.rows}
            onChange={(e) => commit((prev) => resizeDoc(prev, prev.cols, e.target.value))}
            className="w-14 rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[11px] dark:border-slate-600 dark:bg-slate-800"
          />
        </label>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => commit((prev) => refreshTerrains(prev))}
            disabled={!doc.terrains.length}
            className={headerBtn}
            title="Re-derive every autotiled cell — the repair for terrain placed before the 4×4 block was marked"
          >
            Refresh autotiles
          </button>
          <label className={`${headerBtn} cursor-pointer`} title="Open a .tilemap.json project">
            Open file
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importProject(f).catch(() => {})
                e.target.value = ''
              }}
            />
          </label>
          <button type="button" onClick={() => setLibraryOpen(true)} className={headerBtn}>
            Maps…
          </button>
          <span className="ml-1 font-mono text-[10px] text-slate-400" title="Saved to this browser automatically">
            {saveStatus === 'saved' ? '● saved' : saveStatus === 'error' ? '● local save failed' : '○ saving'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Tool rail */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-slate-50 py-2 dark:border-slate-800 dark:bg-slate-900">
          {TOOLS.map((t) => {
            const disabled = t.id === 'terrain' && !doc.terrains.length
            return (
              <button
                key={t.id}
                type="button"
                disabled={disabled}
                onClick={() => setTool(t.id)}
                title={disabled ? 'Mark a 4×4 autotile block first' : `${t.label} (${t.key})`}
                className={`h-9 w-9 shrink-0 rounded-md text-base leading-none transition-colors ${
                  tool === t.id
                    ? 'bg-brand-500 text-white shadow-sm'
                    : disabled
                      ? 'text-slate-300 dark:text-slate-700'
                      : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {t.icon}
              </button>
            )
          })}

          <div className="my-1 h-px w-7 bg-slate-200 dark:bg-slate-700" />

          <button
            type="button"
            onClick={() => setShowGrid((g) => !g)}
            title="Tile grid (')"
            className={`h-9 w-9 rounded-md text-base ${showGrid ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            ⊞
          </button>
          <button
            type="button"
            onClick={() => setShowCollision((c) => !c)}
            title="Collision overlay (;)"
            className={`h-9 w-9 rounded-md text-base ${showCollision ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            ▩
          </button>
          <button
            type="button"
            onClick={() => setDimOtherLayers((d) => !d)}
            title="Dim the layers you are not painting on (D)"
            className={`h-9 w-9 rounded-md text-base ${dimOtherLayers ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            ◐
          </button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <MapCanvas
              ref={canvasRef}
              doc={doc}
              image={image}
              layerIndex={layerIndex}
              tool={tool}
              brush={brush}
              terrain={terrain}
              showGrid={showGrid}
              showCollision={showCollision}
              dimOtherLayers={dimOtherLayers}
              onStrokeCommit={commitCells}
              onPickTile={(tile) => {
                setBrush({ w: 1, h: 1, tiles: [tile] })
                setTool('paint')
              }}
              onHoverChange={setHover}
              onViewChange={setZoom}
            />
          </div>

          <div className="flex shrink-0 items-center gap-3 border-t border-slate-200 px-3 py-1 font-mono text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span className="w-20">{hover?.inside ? `${hover.x}, ${hover.y}` : '—'}</span>
            <span>
              {doc.cols}×{doc.rows} @ {doc.tileW}px
            </span>
            <span className="truncate">{doc.layers[layerIndex]?.name}</span>
            <button type="button" onClick={() => canvasRef.current?.zoomOut()} className="px-1 hover:text-slate-800 dark:hover:text-slate-100">
              −
            </button>
            <span className="w-12 text-center">{zoom < 1 ? `${Math.round(zoom * 100)}%` : `${zoom}x`}</span>
            <button type="button" onClick={() => canvasRef.current?.zoomIn()} className="px-1 hover:text-slate-800 dark:hover:text-slate-100">
              +
            </button>
            <button type="button" onClick={() => canvasRef.current?.fit()} className="px-1 hover:text-slate-800 dark:hover:text-slate-100">
              fit
            </button>
            <div className="ml-auto flex items-center gap-1">
              <span className="hidden lg:inline">nudge map</span>
              {[
                ['↑', 0, -1],
                ['↓', 0, 1],
                ['←', -1, 0],
                ['→', 1, 0],
              ].map(([icon, dx, dy]) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => commit((prev) => shiftDoc(prev, dx, dy))}
                  className="px-1 hover:text-slate-800 dark:hover:text-slate-100"
                  title="Shift every layer by one tile"
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
          <TilesetPanel
            doc={doc}
            image={image}
            brush={brush}
            onBrush={setBrush}
            terrains={doc.terrains}
            activeTerrainId={terrain?.id ?? null}
            onSelectTerrain={setTerrainId}
            onAddTerrain={(t) => {
              commit((prev) => addTerrain(prev, t))
              setTerrainId(t.id)
              setTool('terrain')
            }}
            onRemoveTerrain={(id) => commit((prev) => removeTerrain(prev, id))}
            onEditTerrain={(id, patch) => commit((prev) => updateTerrain(prev, id, patch))}
            onOpenImport={() => setImportOpen(true)}
          />

          <LayersPanel
            doc={doc}
            layerIndex={layerIndex}
            onSelect={setLayerIndex}
            onUpdate={(i, patch) => commit((prev) => updateLayer(prev, i, patch))}
            onAdd={(kind) => {
              commit((prev) => addLayer(prev, kind))
              setLayerIndex(doc.layers.length)
            }}
            onRemove={(i) => commit((prev) => removeLayer(prev, i))}
            onDuplicate={(i) => commit((prev) => duplicateLayer(prev, i))}
            onMove={(from, to) => {
              commit((prev) => moveLayer(prev, from, to))
              setLayerIndex(to)
            }}
            onClear={(i) => commit((prev) => clearLayer(prev, i))}
          />

          <ExportPanel doc={doc} image={image} />
        </div>
      </div>

      {libraryOpen && (
        <MapLibrary currentId={doc.id} onOpen={openMap} onNew={newMap} onClose={() => setLibraryOpen(false)} />
      )}
      {importOpen && (
        <ImportTilesetDialog
          doc={doc}
          onApply={(tileset) => {
            commit((prev) => ({
              ...prev,
              tileset,
              // A tileset carries its own tile size; adopting it keeps the map
              // grid and the art in step instead of scaling tiles to fit.
              tileW: tileset.tileW,
              tileH: tileset.tileH,
              updatedAt: Date.now(),
            }))
            setBrush({ w: 1, h: 1, tiles: [0] })
            setImportOpen(false)
          }}
          onClose={() => setImportOpen(false)}
        />
      )}
    </div>
  )
}
