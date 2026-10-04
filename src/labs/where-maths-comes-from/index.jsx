import React, { useState } from 'react'
import { lessons } from './registry'
import LessonExperience from './LessonExperience'
import './style.css'
export default function WhereMathsComesFrom() {
  const [current, setCurrent] = useState(0)
  return <div className="wm-lab bg-slate-950 text-slate-100">
    <header className="wm-toolbar border-b border-slate-800">
      <div><h1 className="text-lg font-semibold">Where Maths Comes From</h1><p className="text-sm text-slate-400">Explore patterns in things you can see and change.</p></div>
      <label className="text-sm">Explore <select aria-label="Experience" value={current} onChange={e => setCurrent(Number(e.target.value))}>
        {lessons.map((lesson, i) => <option key={lesson.id} value={i}>{i + 1}. {lesson.title}</option>)}
      </select></label>
    </header>
    <div className="wm-content">
      {lessons.map((lesson, i) => <LessonExperience key={lesson.id} lesson={lesson} active={i === current} />)}
    </div>
    <footer className="wm-footer border-t border-slate-800">
      <button disabled={current === 0} onClick={() => setCurrent(i => i - 1)}>← Previous</button>
      <span className="text-sm text-slate-400">{current + 1} / {lessons.length} experiences</span>
      <button disabled={current === lessons.length - 1} onClick={() => setCurrent(i => i + 1)}>Next →</button>
    </footer>
  </div>
}
