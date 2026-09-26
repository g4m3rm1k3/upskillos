import React, { useEffect, useState } from 'react'
import * as runtime from './runtime.js'

// A bar shown anywhere in the ML Lab while lesson Python is starting or running, so a long run (or a
// stuck one) is visible and stoppable even when its notebook is scrolled away or in another lesson.
export function describeJob(ns, lessons = []) {
  if (!ns) return null
  if (ns.startsWith('ladder:')) return 'a practice check'
  const lesson = lessons.find(l => l.id === ns)
  return lesson ? `the notebook in “${lesson.title}”` : 'a lesson notebook'
}

export const SHOW_AFTER_MS = 1000     // quick cells finish before the bar would appear

export default function PythonStatus({ lessons }) {
  const [rt, setRt] = useState(null), [shown, setShown] = useState(false)
  useEffect(() => runtime.subscribe(setRt), [])
  const active = Boolean(rt && (rt.busy || rt.state === 'loading'))
  useEffect(() => {
    if (!active) { setShown(false); return }
    const t = setTimeout(() => setShown(true), SHOW_AFTER_MS)
    return () => clearTimeout(t)
  }, [active])
  if (!active || !shown) return null
  const what = describeJob(rt.running, lessons)
  return <p className="ml-python-status" role="status">
    <span className="ml-python-dot" aria-hidden="true" />
    <span>{rt.state === 'loading' ? rt.text : `Python is running ${what ?? 'code'}.`}{rt.queued ? ` ${rt.queued} more waiting.` : ''}</span>
    <button onClick={() => runtime.stop()}>Stop Python</button>
  </p>
}
