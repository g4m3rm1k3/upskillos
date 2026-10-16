// The lessons that teach a function, under its help: Data Science Studio's spreadsheet exercises name
// the functions they ask for (data-science-studio/lessons/exercises.js), and each lesson derives
// what its function computes. Loaded the first time a function's help is shown.
import { useEffect, useState } from 'react'
import { useOpenLab } from '../../../components/desktop/useOpenLab.js'

let loading = null
const load = () => (loading ??= import('../../data-science-studio/lessons/exercises.js').then((m) => m.FUNCTION_LESSONS))

export default function LessonLinks({ name }) {
  const [byName, setByName] = useState(null)
  const openLab = useOpenLab()
  useEffect(() => { let live = true; load().then((m) => { if (live) setByName(m) }); return () => { live = false } }, [])
  const lessons = byName?.[name] ?? []
  if (!lessons.length) return null
  return (
    <p>
      Worked out by hand in Data Science Studio:{' '}
      {lessons.map((l, i) => (
        <span key={l.id}>{i > 0 && ', '}
          <button type="button" className="text-sky-700 underline hover:text-sky-600 dark:text-sky-300"
            onClick={() => openLab('data-science-studio', '?lesson=' + encodeURIComponent(l.id))}>{l.label}</button>
        </span>
      ))}
    </p>
  )
}
