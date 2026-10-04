import React, { useEffect, useRef } from 'react'
import { createLessonRuntime } from './runtime'
import './style.css'
import { startDiscovery } from './discovery'
import CountingAssessment from './CountingAssessment'
/** Embeddable, independent experience; lesson order belongs to its containing course. */
export default function LessonExperience({ lesson, active = true }) {
  const root = useRef(null), lifecycle = useRef(null)
  useEffect(() => {
    const runtime = createLessonRuntime(root.current)
    const controls = lesson.mount(runtime) || {}
    lifecycle.current = { pause: () => { runtime.pause(); controls.pause?.() } }
    if (!active) lifecycle.current.pause()
    startDiscovery(runtime, lesson)
    return () => { runtime.dispose(); controls.dispose?.(); lifecycle.current = null }
  }, [lesson])
  useEffect(() => { if (!active) lifecycle.current?.pause() }, [active])
  return <section className="wm-experience" ref={root} id={lesson.id} hidden={!active} aria-label={lesson.title}>
    <p className="act">{lesson.chapter}</p>
    <h2>{lesson.title}</h2>
    <div className="wm-grid">
      <div className="wm-panel"><h3 className="wm-panel-label">Explore</h3><p className="wm-notice">{lesson.discovery.question}</p><div dangerouslySetInnerHTML={{ __html: lesson.panels.explore }} /></div>
      <div className="wm-panel wm-scene"><h3 className="wm-panel-label">Watch what happens</h3><div dangerouslySetInnerHTML={{ __html: lesson.panels.scene }} /></div>
      <div className="wm-panel"><h3 className="wm-panel-label">Look for a connection</h3>{lesson.prompt !== lesson.discovery.question && <p className="wm-notice">{lesson.prompt}</p>}<div dangerouslySetInnerHTML={{ __html: lesson.panels.connections }} />{lesson.assessment?.kind === 'counting' && <CountingAssessment lesson={lesson} />}</div>
      <div className="wm-panel wm-explanation">
        <h3 className="wm-panel-label">What your action reveals</h3>
        <p data-state="observation" className="wm-observation" />
        <p data-state="why" />
        <p data-state="tryNext" className="wm-notice" /><details className="wm-transfer"><summary>Try it in another situation</summary><p>{lesson.discovery.transfer}</p></details>
        <details><summary>Mathematical language and further connections</summary><div dangerouslySetInnerHTML={{ __html: lesson.panels.explanation }} /></details>
      </div>
    </div>
  </section>
}
