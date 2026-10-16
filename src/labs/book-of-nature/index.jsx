import React, { useState } from 'react'
import MomentPlayer from './MomentPlayer'
import { moments } from './registry'
import { loadProgress, markDone } from './progress'

export default function BookOfNature() {
  const [progress, setProgress] = useState(loadProgress)
  const firstOpen = moments.find(m => !progress[m.id]) || moments[0]
  const [currentId, setCurrentId] = useState(firstOpen.id)
  const current = moments.find(m => m.id === currentId)

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto mb-6 flex max-w-3xl flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-amber-300">Book of Nature</h1>
          <p className="text-sm text-slate-400">Mathematics, one five-minute moment at a time.</p>
        </div>
        <label className="text-sm text-slate-400">
          Moment{' '}
          <select
            aria-label="Moment"
            value={currentId}
            onChange={e => setCurrentId(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {moments.map(m => (
              <option key={m.id} value={m.id}>
                {m.order} {m.title}{progress[m.id] ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <MomentPlayer
        key={current.id}
        moment={current}
        done={Boolean(progress[current.id])}
        onDone={() => setProgress(markDone(current.id))}
      />
    </div>
  )
}
