import React, { useMemo, useRef, useState } from 'react'
import { LEVELS, CONCEPTS, filterCurriculum } from './curriculum.js'
import './style.css'
import { LESSONS } from './lessons/index.js'
import Lesson from './Lesson.jsx'
import CodeViewer from './CodeViewer.jsx'
import { readProgress, isSolved } from './progress.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { TRACES } from './tables.js'
import { TREE_FOR } from './trees.js'

const STAGES = [
  ['01', 'Concept walkthrough', 'Build intuition, define the state, derive the recurrence, and understand why it works.'],
  ['02', 'Worked example', 'Trace a concrete input step by step, observe the state, and verify intermediate transitions.'],
  ['03', 'Solve a problem', 'Apply the idea independently with problem constraints, starter code, test suites, and hints.'],
]

const count = level => level.groups.reduce((sum, group) => sum + group.concepts.length, 0)
const readyCount = Object.keys(LESSONS).length
const challengeCount = Object.values(LESSONS).filter(l => l.challenge).length
// Lessons with a live table or a call tree to watch and fill.
const liveCount = new Set([...Object.keys(TRACES), ...Object.keys(TREE_FOR)]).size

// The open concept survives a trip to CodeLens and back (and a reload).
const PLACE = 'upskillos.dp-lab.place'
const readPlace = () => { try { return localStorage.getItem(PLACE) || null } catch { return null } }
const writePlace = id => { try { id ? localStorage.setItem(PLACE, id) : localStorage.removeItem(PLACE) } catch { /* private window */ } }

const Soon = () => <span className="dp-soon">Coming soon</span>

export default function DynamicProgrammingLab() {
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState('all')
  const [selectedId, setSelectedId] = useState(() => { const id = readPlace(); return CONCEPTS.some(c => c.id === id) ? id : null })
  const [collapsed, setCollapsed] = useState(new Set())
  const [language, setLanguage] = useState('Python')
  const [progress, setProgress] = useState(() =>
    Object.fromEntries(
      Object.values(LESSONS).map(lesson => [lesson.id, readProgress(lesson.id, lesson.revision)])
    )
  )

  // Signed in, progress follows the learner (oc-dp-lab is a synced key); a new solve is pushed at once.
  const { user, pushNow } = useAuth() ?? {}
  const solvedIn = concepts => concepts.filter(c => isSolved(progress[c.id])).length
  const solvedCount = solvedIn(CONCEPTS)
  function recordProgress(id, record) {
    const before = progress[id]
    if ((isSolved(record) && !isSolved(before)) || (record.design?.done && !before?.design?.done)) pushNow?.()
    setProgress(previous => ({ ...previous, [id]: record }))
  }
  const countLabel = (concepts, total = concepts.length) => {
    const n = solvedIn(concepts)
    return n ? `✓ ${n}/${total}` : String(total)
  }

  const statusLabel = concept => {
    const isRecursion = concept.id === 'recursion'
    const record = progress[concept.id]
    const doneLangs = ['Python', 'JavaScript'].filter(lang => record?.[lang]?.passed)

    if (doneLangs.length === 2) return 'Solved · both languages'
    if (doneLangs.length === 1) return `Solved · ${doneLangs[0]}`
    if (record?.quiz?.passed) return 'Solved · quiz passed'
    if (record?.design?.done) return LESSONS[concept.id]?.challenge ? 'Designed · challenge next' : 'Designed · quiz next'

    if (isRecursion) return 'Walkthrough available'
    if (concept.status === 'ready') {
      return LESSONS[concept.id]?.challenge ? 'Practice ready' : 'Walkthrough available'
    }
    return 'Coming soon'
  }

  const detailRef = useRef(null)
  const visible = useMemo(() => filterCurriculum(query, difficulty), [query, difficulty])
  const selected = CONCEPTS.find(concept => concept.id === selectedId)
  const level = LEVELS.find(item => item.id === selected?.levelId)
  const visibleCount = visible.reduce((sum, item) => sum + count(item), 0)
  const filtering = Boolean(query.trim()) || difficulty !== 'all'

  function toggle(id) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function select(id) {
    setSelectedId(id)
    writePlace(id)
    detailRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  const previewCode = {
    Python: `# Your Python challenge will appear here.\n# Problem statement, starter code, and tests: coming soon.`,
    JavaScript: `// Your JavaScript challenge will appear here.\n// Problem statement, starter code, and tests: coming soon.`,
  }

  return (
    <div className="dp-lab">
      <header className="dp-header">
        <div className="dp-mark" aria-hidden="true">
          dp<span>[ ]</span>
        </div>
        <div>
          <p className="dp-eyebrow">ALGORITHMS / INTERACTIVE LEARNING LAB</p>
          <h1>Dynamic programming</h1>
        </div>
        <div className="dp-header-stats">
          <div className="dp-progress" role="group" aria-label="Your progress">
            <span><strong>{solvedCount}</strong> of {readyCount} lessons solved</span>
            <span className="dp-progress-bar" aria-hidden="true"><span style={{ width: `${(solvedCount / readyCount) * 100}%` }} /></span>
            <small>{user ? '☁ Saved to your account' : 'Saved on this device · sign in to keep it on every device'}</small>
          </div>
        </div>
      </header>

      <div className="dp-workspace">
        <aside className="dp-sidebar" aria-label="Curriculum navigation">
          <div className="dp-sidebar-tools">
            <div className="dp-sidebar-title">
              <h2>Concept map</h2>
              <span>{CONCEPTS.length} topics</span>
            </div>

            <label className="dp-search">
              Search concepts
              <input
                type="search"
                placeholder="Try knapsack, tree, interval, bitmask…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </label>

            <label className="dp-filter">
              Difficulty
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="all">All levels</option>
                {LEVELS.map((item, i) => (
                  <option key={item.id} value={item.id}>
                    L{i + 1} · {item.difficulty}
                  </option>
                ))}
              </select>
            </label>

            <div className="dp-tree-actions">
              <button type="button" onClick={() => setCollapsed(new Set())}>
                Expand all
              </button>
              <button
                type="button"
                onClick={() =>
                  setCollapsed(new Set(LEVELS.flatMap(item => [item.id, ...item.groups.map(g => g.id)])))
                }
              >
                Collapse all
              </button>
            </div>

            <button
              type="button"
              className={`dp-overview-button ${!selected ? 'is-selected' : ''}`}
              aria-current={!selected ? 'page' : undefined}
              onClick={() => select(null)}
            >
              ▦ <span>Curriculum overview</span>
            </button>

            <p className="dp-results" role="status">
              {visibleCount} of {CONCEPTS.length} concepts
              {filtering ? ' match' : ` · ${readyCount} ready to learn`}
            </p>
          </div>

          <nav className="dp-tree" aria-label="Concepts by difficulty">
            {visible.map(item => {
              const open = filtering || !collapsed.has(item.id)
              return (
                <section className="dp-level" key={item.id} style={{ '--level-color': item.color }}>
                  <button
                    type="button"
                    className="dp-level-toggle"
                    aria-expanded={open}
                    aria-controls={`dp-${item.id}`}
                    onClick={() => toggle(item.id)}
                    disabled={filtering}
                  >
                    <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                    <span className="dp-level-number">
                      L{LEVELS.findIndex(l => l.id === item.id) + 1}
                    </span>
                    <span>
                      {item.title}
                      <small>{item.difficulty}</small>
                    </span>
                    <span className="dp-count">{countLabel(item.groups.flatMap(g => g.concepts))}</span>
                  </button>

                  {open && (
                    <div id={`dp-${item.id}`} className="dp-groups">
                      {item.groups.map(grp => {
                        const grpOpen = filtering || !collapsed.has(grp.id)
                        return (
                          <div key={grp.id} className="dp-group">
                            <button
                              type="button"
                              className="dp-group-toggle"
                              aria-expanded={grpOpen}
                              aria-controls={`dp-${grp.id}`}
                              onClick={() => toggle(grp.id)}
                              disabled={filtering}
                            >
                              <span aria-hidden="true">{grpOpen ? '−' : '+'}</span>
                              <span>{grp.title}</span>
                              <span className="dp-count">{countLabel(grp.concepts)}</span>
                            </button>

                            {grpOpen && (
                              <ul id={`dp-${grp.id}`}>
                                {grp.concepts.map(concept => {
                                  const isSelected = selectedId === concept.id
                                  const isReady = concept.status === 'ready' || concept.status === 'walkthrough'
                                  const labelText = statusLabel(concept)
                                  const solved = isSolved(progress[concept.id])
                                  return (
                                    <li key={concept.id}>
                                      <button
                                        type="button"
                                        className={`dp-concept ${isSelected ? 'is-selected' : ''} ${isReady ? 'dp-is-ready' : ''} ${solved ? 'is-solved' : ''}`}
                                        aria-current={isSelected ? 'page' : undefined}
                                        onClick={() => select(concept.id)}
                                      >
                                        <span className="dp-node" aria-hidden="true">{solved ? '✓' : ''}</span>
                                        <span>
                                          {concept.title}
                                          <small className={isReady ? 'is-available' : ''}>
                                            {labelText}
                                          </small>
                                        </span>
                                      </button>
                                    </li>
                                  )
                                })}
                              </ul>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            })}

            {!visibleCount && (
              <div className="dp-empty">
                <p>No concepts match your filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setDifficulty('all')
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </nav>
        </aside>

        <main
          ref={detailRef}
          className="dp-detail"
          aria-label={selected ? 'Concept preview' : 'Curriculum overview'}
        >
          {!selected ? (
            <>
              <div className="dp-hero">
                <p className="dp-eyebrow">THE COMPLETE DP CURRICULUM · FOUNDATIONS TO SPECIALIST</p>
                <h2>
                  Small states.<br />
                  <span>Deep understanding.</span>
                </h2>
                <p>
                  Dynamic programming is not formula memorization: it is the art of recognizing optimal
                  substructure, defining precise states, and reasoning about subproblem dependencies.
                  Explore {CONCEPTS.length} mapped concepts. Break problems into smaller questions and watch
                  tables fill, step by step, in {liveCount} interactive lessons; then fill them yourself. Solve{' '}
                  {challengeCount} coding challenges in Python or JavaScript: run and print as you work, then check.
                </p>

                <div className="dp-hero-actions">
                  <button
                    type="button"
                    className="dp-primary dp-hero-start"
                    onClick={() => select('recursion')}
                  >
                    Start foundations with Recursion →
                  </button>
                </div>

                <div className="dp-stats">
                  <div>
                    <strong>{LEVELS.length}</strong>
                    <span>Difficulty levels</span>
                  </div>
                  <div>
                    <strong>{LEVELS.reduce((sum, item) => sum + item.groups.length, 0)}</strong>
                    <span>Topic families</span>
                  </div>
                  <div>
                    <strong>{readyCount}</strong>
                    <span>Walkthroughs & quizzes</span>
                  </div>
                  <div>
                    <strong>{challengeCount}</strong>
                    <span>Coding challenges</span>
                  </div>
                </div>
              </div>

              <section className="dp-path">
                <div className="dp-section-heading">
                  <h3>Coverage by level</h3>
                  <span>
                    {readyCount} available · {CONCEPTS.length - readyCount} coming soon
                  </span>
                </div>
                <p className="dp-muted">
                  Levels represent a natural learning order, from fundamentals of state design to advanced
                  optimizations and specialist applications. Explore any level freely.
                </p>

                <div className="dp-level-cards">
                  {LEVELS.map((item, i) => {
                    const readyInLevel = item.groups
                      .flatMap(g => g.concepts)
                      .filter(c => c.status === 'ready' || c.status === 'walkthrough').length

                    return (
                      <article key={item.id} style={{ '--level-color': item.color }}>
                        <div className="dp-card-top">
                          <span className="dp-level-tag">
                            LEVEL {i + 1} · {item.difficulty}
                          </span>
                          <span>{count(item)} concepts</span>
                        </div>
                        <h4>{item.title}</h4>
                        <p>{item.summary}</p>
                        <ul>
                          {item.groups.map(group => (
                            <li key={group.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuery('')
                                  setDifficulty(item.id)
                                  select(group.concepts[0].id)
                                }}
                              >
                                <span>{group.title}</span>
                                <span>{group.concepts.length} ↗</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                        {solvedIn(item.groups.flatMap(g => g.concepts)) > 0 && (
                          <span className="dp-solved">✓ {solvedIn(item.groups.flatMap(g => g.concepts))} of {count(item)} solved</span>
                        )}
                        {readyInLevel > 0 ? (
                          <span className="dp-ready">{readyInLevel} ready to learn</span>
                        ) : (
                          <Soon />
                        )}
                      </article>
                    )
                  })}
                </div>
              </section>

              <section className="dp-format">
                <h3>One concept. Three steps.</h3>
                <StageCards preview />
              </section>
            </>
          ) : (
            <>
              <button
                type="button"
                className="dp-back"
                onClick={() => select(null)}
              >
                ← Curriculum overview
              </button>

              <div className="dp-concept-hero" style={{ '--level-color': level?.color || '#c4b5fd' }}>
                <p className="dp-level-tag">
                  LEVEL {LEVELS.indexOf(level) + 1} · {level?.difficulty} / {selected.groupTitle}
                </p>
                <h2>{selected.title}</h2>
                <span
                  className={
                    isSolved(progress[selected.id])
                      ? 'dp-solved'
                      : selected.status === 'ready' || selected.status === 'walkthrough'
                        ? 'dp-ready'
                        : 'dp-soon'
                  }
                >
                  {isSolved(progress[selected.id]) ? '✓ ' : ''}{statusLabel(selected)}
                </span>
                <p>{selected.scope}</p>
              </div>

              {LESSONS[selected.id] ? (
                <Lesson
                  key={selected.id}
                  lesson={LESSONS[selected.id]}
                  concepts={CONCEPTS}
                  onSelect={select}
                  language={language}
                  setLanguage={setLanguage}
                  onProgress={recordProgress}
                />
              ) : (
                <>
                  <section className="dp-plan">
                    <h3>Your learning path</h3>
                    <p className="dp-muted">
                      This specialist concept is mapped into the curriculum. Its dedicated interactive
                      walkthrough and coding challenge are being authored.
                    </p>
                    <StageCards />
                  </section>

                  <section className="dp-practice">
                    <div className="dp-section-heading">
                      <div>
                        <p className="dp-eyebrow">03 / PRACTICE WORKSPACE PREVIEW</p>
                        <h3>Solve it your way</h3>
                      </div>
                      <Soon />
                    </div>

                    <fieldset className="dp-language">
                      <legend>Preview language</legend>
                      {['Python', 'JavaScript'].map(item => (
                        <label key={item} className={language === item ? 'is-active' : ''}>
                          <input
                            type="radio"
                            name="dp-language"
                            value={item}
                            checked={language === item}
                            onChange={() => setLanguage(item)}
                          />
                          {item}
                        </label>
                      ))}
                    </fieldset>

                    <div className="dp-editor-preview">
                      <CodeViewer
                        code={previewCode[language]}
                        language={language}
                        filename={language === 'Python' ? 'solution.py' : 'solution.js'}
                        showLineNumbers={false}
                        allowCopy={false}
                      />
                    </div>

                    <div className="dp-practice-footer">
                      <p>No executable exercise is available yet.</p>
                      <button type="button" disabled>
                        Run code · coming soon
                      </button>
                    </div>
                  </section>

                  <section className="dp-hints" aria-label="Progressive hints">
                    <div className="dp-section-heading">
                      <div>
                        <p className="dp-eyebrow">A NUDGE, NOT THE ANSWER</p>
                        <h3>Hints when you need them</h3>
                      </div>
                      <Soon />
                    </div>
                    <p className="dp-muted">
                      For harder problems, ask for one small hint at a time. Each hint helps you take the
                      next step while leaving the solution to you.
                    </p>
                    <ol>
                      {[
                        ['A small nudge', 'A useful observation to revisit in the problem statement.'],
                        ['A guiding question', 'A question that helps you reason about your choices and state.'],
                        ['A checkpoint', 'A tiny case or invariant to test your own approach.'],
                      ].map(([title, description]) => (
                        <li key={title}>
                          <div>
                            <h4>{title}</h4>
                            <p>{description}</p>
                          </div>
                          <button type="button" disabled aria-label={`${title} hint coming soon`}>
                            Coming soon
                          </button>
                        </li>
                      ))}
                    </ol>
                    <p className="dp-muted">
                      Hints will be optional and revealed individually. They will not reveal the full
                      recurrence, solution code, or final answer. Problem-specific hints are not written yet.
                    </p>
                  </section>
                </>
              )}

              <section className="dp-related">
                <h3>In this topic family: {selected.groupTitle}</h3>
                <div>
                  {CONCEPTS.filter(item => item.groupId === selected.groupId).map(item => (
                    <button
                      type="button"
                      key={item.id}
                      aria-current={item.id === selectedId ? 'page' : undefined}
                      onClick={() => select(item.id)}
                    >
                      {item.title}
                      <span>{statusLabel(item)}</span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function StageCards({ preview = false }) {
  return (
    <div className="dp-stage-cards">
      {STAGES.map(([number, title, text]) => (
        <article key={number}>
          <span className="dp-stage-number">{number}</span>
          <h4>{title}</h4>
          <p>{text}</p>
          {!preview && <Soon />}
        </article>
      ))}
    </div>
  )
}
