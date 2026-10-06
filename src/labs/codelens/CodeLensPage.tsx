export const meta = {
  title: 'CodeLens Lab',
  description: 'Lab shell for the code execution visualizer. Handles back navigation, lesson handoff state, and mounts the full CodeLens experience as a fixed full-screen overlay.',
  concept: 'Lab Shell Pattern',
  conceptDetail: 'Each lab has a thin Page wrapper (routing, title, back nav) and a heavy inner component (the experience). Keeps routing concerns out of the feature logic.',
  jumpTo: '/codelens',
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGlobalTheme } from '../../context/ThemeContext.jsx'
import CodeLens from './codelens/CodeLens'

interface CodelensHandoff { code?: string; lang?: string }

function peekHandoff(): CodelensHandoff | null {
  try {
    const raw = localStorage.getItem('codelens-handoff')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function peekLessonReturn(): { path: string | null; label: string | null } {
  try {
    return {
      path:  sessionStorage.getItem('codelens_return_path')  || null,
      label: sessionStorage.getItem('codelens_return_label') || null,
    }
  } catch { return { path: null, label: null } }
}

export default function CodeLensPage() {
  const navigate = useNavigate()
  const [handoff] = useState(peekHandoff)
  const [lessonReturn] = useState(peekLessonReturn)
  const cleanedUp = useRef(false)

  useEffect(() => {
    if (!cleanedUp.current) {
      cleanedUp.current = true
      localStorage.removeItem('codelens-handoff')
    }
  }, [])

  useEffect(() => {
    document.title = 'CodeLens — UpSkillOS'
    return () => { document.title = 'UpSkillOS' }
  }, [])

  function handleBack() {
    if (lessonReturn?.path) {
      try {
        sessionStorage.removeItem('codelens_return_path')
        sessionStorage.removeItem('codelens_return_label')
      } catch {}
      window.location.hash = lessonReturn.path.replace(/^#/, '')
    } else {
      navigate(-1)
    }
  }

  return (
    <div
      className="fixed inset-x-0 top-0 bottom-0 overflow-hidden"
      style={{
        background: '#080c14',
        zIndex: 1700,
      }}
    >
      <CodeLens
        onBack={handleBack}
        initialCode={handoff?.code}
        initialLang={handoff?.lang}
        backLabel={lessonReturn?.label || undefined}
      />
    </div>
  )
}
