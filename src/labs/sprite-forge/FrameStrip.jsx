import { useEffect, useRef, useState } from 'react'
import { frameToCanvas } from './render.js'

// Frame timeline: thumbnails, ordering, per-frame timing, and the playback
// clock that both this strip and the preview pane read from.

// Playback advances on a chained setTimeout rather than a fixed-interval rAF
// loop, because frames carry individual durations in milliseconds. A uniform
// tick would force every frame to the same length and quantize the timing to
// the display refresh rate — and holding one key frame twice as long is the
// most basic tool there is for making an animation read.
export function usePlayback(doc, playing) {
  const [index, setIndex] = useState(0)
  const timer = useRef(null)
  const frames = doc.frames

  useEffect(() => {
    if (!playing || frames.length < 2) {
      if (timer.current) clearTimeout(timer.current)
      return undefined
    }
    let cancelled = false
    let i = index
    const step = () => {
      if (cancelled) return
      i = (i + 1) % frames.length
      setIndex(i)
      timer.current = setTimeout(step, Math.max(16, frames[i]?.duration || 100))
    }
    timer.current = setTimeout(step, Math.max(16, frames[i]?.duration || 100))
    return () => {
      cancelled = true
      if (timer.current) clearTimeout(timer.current)
    }
    // `index` is deliberately not a dependency: including it would restart the
    // timer on every tick, which is the classic way to get a drifting clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, frames])

  // A deleted frame must not leave playback pointing past the end of the array.
  useEffect(() => {
    if (index >= frames.length) setIndex(0)
  }, [frames.length, index])

  return [index, setIndex]
}

function Thumb({ doc, frame, size = 44 }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const src = frameToCanvas(frame.pixels, doc.width, doc.height, doc.palette)
    // Letterbox rather than stretch: a non-square sprite shown squashed in the
    // strip is genuinely confusing when you are checking silhouettes.
    const scale = Math.min(canvas.width / doc.width, canvas.height / doc.height)
    const w = doc.width * scale
    const h = doc.height * scale
    ctx.drawImage(src, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
  }, [doc, frame, frame.pixels, size])
  return <canvas ref={ref} style={{ width: size, height: size }} className="block" />
}

// The animation preview. Kept separate from the strip so it can live wherever
// there is room — currently the right-hand column, where it sits directly above
// the export controls it is effectively a proof for.
export function AnimationPreview({ doc, index, scale, onScale, playing, onTogglePlay, fps }) {
  const ref = useRef(null)
  const frame = doc.frames[Math.min(index, doc.frames.length - 1)]

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !frame) return
    canvas.width = doc.width * scale
    canvas.height = doc.height * scale
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const src = frameToCanvas(frame.pixels, doc.width, doc.height, doc.palette)
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  }, [doc, frame, scale])

  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Preview
        </h3>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onScale(s)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                scale === s
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
      <div
        className="flex items-center justify-center rounded p-2"
        style={{
          // Checkerboard so a sprite with transparent edges is unmistakable —
          // and at preview scale, transparency against a flat panel background
          // looks identical to a filled background color.
          backgroundImage:
            'linear-gradient(45deg,#334155 25%,transparent 25%,transparent 75%,#334155 75%),linear-gradient(45deg,#334155 25%,transparent 25%,transparent 75%,#334155 75%)',
          backgroundSize: '12px 12px',
          backgroundPosition: '0 0,6px 6px',
          backgroundColor: '#1e293b',
          minHeight: 88,
        }}
      >
        <canvas ref={ref} className="block" />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={doc.frames.length < 2}
          className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
            doc.frames.length < 2
              ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
              : playing
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : 'bg-brand-500 text-white hover:bg-brand-600'
          }`}
          title={doc.frames.length < 2 ? 'Add a second frame to animate' : 'Play / pause (Enter)'}
        >
          {playing ? '■ Stop' : '▶ Play'}
        </button>
        <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
          {doc.frames.length < 2 ? '—' : `~${fps} fps`}
        </span>
      </div>
    </div>
  )
}

export default function FrameStrip({
  doc,
  frameIndex,
  playbackIndex,
  playing,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
  onMove,
  onDurationChange,
  onAllDurations,
}) {
  const current = doc.frames[frameIndex]

  return (
    <div className="flex shrink-0 flex-col border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 px-3 pt-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Frames
        </h3>
        <span className="font-mono text-[11px] text-slate-400">
          {doc.frames.length} · {doc.frames.reduce((s, f) => s + (f.duration || 100), 0)}ms total
        </span>

        <div className="ml-auto flex items-center gap-1">
          <label className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            hold
            <input
              type="number"
              min={16}
              max={5000}
              step={10}
              value={current?.duration ?? 100}
              onChange={(e) => onDurationChange(frameIndex, Math.max(16, Number(e.target.value) || 100))}
              className="w-16 rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[11px] dark:border-slate-600 dark:bg-slate-800"
              title="How long this frame is held, in milliseconds"
            />
            ms
          </label>
          <button
            type="button"
            onClick={() => onAllDurations(current?.duration ?? 100)}
            className="rounded px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Apply this frame's hold time to every frame"
          >
            → all
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto p-3">
        {doc.frames.map((frame, i) => {
          const isEditing = i === frameIndex
          // While playing, the strip tracks the clock as well as the edit
          // cursor, so you can see which thumbnail is on screen right now.
          const isPlayhead = playing && i === playbackIndex
          return (
            <div key={frame.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(i)}
                className={`relative block rounded border-2 p-0.5 transition-colors ${
                  isEditing
                    ? 'border-brand-500 bg-white dark:bg-slate-800'
                    : isPlayhead
                      ? 'border-amber-400 bg-white dark:bg-slate-800'
                      : 'border-transparent bg-white/60 hover:border-slate-300 dark:bg-slate-800/60 dark:hover:border-slate-600'
                }`}
                style={{
                  backgroundImage:
                    'linear-gradient(45deg,#e2e8f0 25%,transparent 25%,transparent 75%,#e2e8f0 75%),linear-gradient(45deg,#e2e8f0 25%,transparent 25%,transparent 75%,#e2e8f0 75%)',
                  backgroundSize: '10px 10px',
                  backgroundPosition: '0 0,5px 5px',
                }}
                title={`${frame.name} — ${frame.duration}ms`}
              >
                <Thumb doc={doc} frame={frame} />
                <span className="absolute -left-0.5 -top-0.5 rounded bg-slate-900/75 px-1 font-mono text-[9px] text-white">
                  {i}
                </span>
              </button>
              <div className="mt-0.5 flex items-center justify-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onMove(i, i - 1)}
                  disabled={i === 0}
                  className="rounded px-1 text-[10px] text-slate-400 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-800"
                  title="Move earlier"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicate(i)}
                  className="rounded px-1 text-[10px] text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Duplicate — the usual way to start the next frame of an animation"
                >
                  ⧉
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  disabled={doc.frames.length <= 1}
                  className="rounded px-1 text-[10px] text-slate-400 hover:bg-rose-100 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-950/40"
                  title="Delete frame"
                >
                  ✕
                </button>
                <button
                  type="button"
                  onClick={() => onMove(i, i + 1)}
                  disabled={i === doc.frames.length - 1}
                  className="rounded px-1 text-[10px] text-slate-400 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-800"
                  title="Move later"
                >
                  ▶
                </button>
              </div>
            </div>
          )
        })}

        <div className="flex shrink-0 flex-col gap-1 pl-1">
          <button
            type="button"
            onClick={() => onAdd(frameIndex, { copy: false })}
            className="rounded border border-dashed border-slate-400 px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Add an empty frame after the current one"
          >
            + empty
          </button>
          <button
            type="button"
            onClick={() => onAdd(frameIndex, { copy: true })}
            className="rounded border border-dashed border-slate-400 px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Add a copy of the current frame after it (Alt+N)"
          >
            + copy
          </button>
        </div>
      </div>
    </div>
  )
}
