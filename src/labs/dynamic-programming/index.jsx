import React, { useMemo, useRef, useState } from 'react'
import { LEVELS, CONCEPTS, filterCurriculum } from './curriculum.js'
import './style.css'

const STAGES = [
  ['01', 'Concept walkthrough', 'Build intuition, define the state, derive the recurrence, and explain why it works.'],
  ['02', 'Worked example', 'Trace a concrete input, inspect the table, and reconstruct the answer step by step.'],
  ['03', 'Solve a problem', 'Apply the idea independently with a problem statement, starter code, hints, and tests.'],
]
const count = level => level.groups.reduce((sum, group) => sum + group.concepts.length, 0)
const Soon = () => <span className="dp-soon">Coming soon</span>

export default function DynamicProgrammingLab() {
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [collapsed, setCollapsed] = useState(new Set())
  const [language, setLanguage] = useState('Python')
  const detailRef = useRef(null)
  const visible = useMemo(() => filterCurriculum(query, difficulty), [query, difficulty])
  const selected = CONCEPTS.find(concept => concept.id === selectedId)
  const level = LEVELS.find(item => item.id === selected?.levelId)
  const visibleCount = visible.reduce((sum, item) => sum + count(item), 0)
  const filtering = Boolean(query.trim()) || difficulty !== 'all'
  function toggle(id) {
    setCollapsed(previous => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  function select(id) {
    setSelectedId(id)
    detailRef.current?.scrollTo?.({ top: 0 })
  }
  return <div className="dp-lab">
    <header className="dp-header">
      <div className="dp-mark" aria-hidden="true">dp<span>[ ]</span></div>
      <div><p className="dp-eyebrow">ALGORITHMS / LEARNING LAB</p><h1>Dynamic programming</h1></div>
      <span className="dp-shell-badge">Curriculum preview</span>
    </header>
    <div className="dp-workspace">
      <aside className="dp-sidebar" aria-label="Curriculum navigation">
        <div className="dp-sidebar-tools">
          <div className="dp-sidebar-title"><h2>Concept map</h2><span>{CONCEPTS.length} topics</span></div>
          <label className="dp-search">Search concepts<input type="search" placeholder="Try knapsack, parsing, tree…" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <label className="dp-filter">Difficulty<select value={difficulty} onChange={event => setDifficulty(event.target.value)}><option value="all">All levels</option>{LEVELS.map((item, i) => <option key={item.id} value={item.id}>L{i + 1} · {item.difficulty}</option>)}</select></label>
          <div className="dp-tree-actions"><button onClick={() => setCollapsed(new Set())}>Expand all</button><button onClick={() => setCollapsed(new Set(LEVELS.flatMap(item => [item.id, ...item.groups.map(group => group.id)])))}>Collapse all</button></div>
          <button className={`dp-overview-button ${!selected ? 'is-selected' : ''}`} aria-current={!selected ? 'page' : undefined} onClick={() => select(null)}>▦ <span>Curriculum overview</span></button>
          <p className="dp-results" role="status">{visibleCount} of {CONCEPTS.length} concepts{filtering ? ' match' : ' · all coming soon'}</p>
        </div>
        <nav className="dp-tree" aria-label="Concepts by difficulty">
          {visible.map(item => {
            const open = filtering || !collapsed.has(item.id)
            return <section className="dp-level" key={item.id} style={{ '--level-color': item.color }}>
              <button className="dp-level-toggle" aria-expanded={open} aria-controls={`dp-${item.id}`} onClick={() => toggle(item.id)} disabled={filtering}>
                <span aria-hidden="true">{open ? '▾' : '▸'}</span><span className="dp-level-number">L{LEVELS.findIndex(l => l.id === item.id) + 1}</span><span>{item.title}<small>{item.difficulty}</small></span><span className="dp-count">{count(item)}</span>
              </button>
              {open && <div id={`dp-${item.id}`} className="dp-groups">{item.groups.map(group => {
                const groupOpen = filtering || !collapsed.has(group.id)
                return <div key={group.id} className="dp-group">
                  <button className="dp-group-toggle" aria-expanded={groupOpen} aria-controls={`dp-${group.id}`} onClick={() => toggle(group.id)} disabled={filtering}><span aria-hidden="true">{groupOpen ? '−' : '+'}</span><span>{group.title}</span><span className="dp-count">{group.concepts.length}</span></button>
                  {groupOpen && <ul id={`dp-${group.id}`}>{group.concepts.map(concept => <li key={concept.id}><button className={`dp-concept ${selectedId === concept.id ? 'is-selected' : ''}`} aria-current={selectedId === concept.id ? 'page' : undefined} onClick={() => select(concept.id)}><span className="dp-node" aria-hidden="true" /><span>{concept.title}<small>Coming soon</small></span></button></li>)}</ul>}
                </div>
              })}</div>}
            </section>
          })}
          {!visibleCount && <div className="dp-empty"><p>No concepts match your filters.</p><button onClick={() => { setQuery(''); setDifficulty('all') }}>Clear filters</button></div>}
        </nav>
      </aside>
      <main ref={detailRef} className="dp-detail" aria-label={selected ? 'Concept preview' : 'Curriculum overview'}>
        {!selected ? <>
          <div className="dp-hero"><p className="dp-eyebrow">THE COMPLETE LEARNING PATH · IN DEVELOPMENT</p><h2>Small states.<br /><span>Deep understanding.</span></h2><p>A map from your first recurrence to specialist techniques. Explore every branch, review the coverage, and choose what we build next.</p><div className="dp-stats"><div><strong>{LEVELS.length}</strong><span>difficulty levels</span></div><div><strong>{LEVELS.reduce((sum, item) => sum + item.groups.length, 0)}</strong><span>topic families</span></div><div><strong>{CONCEPTS.length}</strong><span>planned concepts</span></div><div><strong>0</strong><span>ready to learn</span></div></div></div>
          <section className="dp-path"><div className="dp-section-heading"><h3>Coverage by level</h3><span>Every concept is coming soon</span></div><p className="dp-muted">Levels suggest a learning order, not prerequisites enforced by the app. Specialist branches are optional extensions. This map can grow as gaps are identified.</p>
            <div className="dp-level-cards">{LEVELS.map((item, i) => <article key={item.id} style={{ '--level-color': item.color }}><div className="dp-card-top"><span className="dp-level-tag">LEVEL {i + 1} · {item.difficulty}</span><span>{count(item)} concepts</span></div><h4>{item.title}</h4><p>{item.summary}</p><ul>{item.groups.map(group => <li key={group.id}><button onClick={() => { setQuery(''); setDifficulty(item.id); select(group.concepts[0].id) }}><span>{group.title}</span><span>{group.concepts.length} ↗</span></button></li>)}</ul><Soon /></article>)}</div>
          </section>
          <section className="dp-format"><h3>One concept. Three steps.</h3><StageCards /></section>
        </> : <>
          <button className="dp-back" onClick={() => select(null)}>← Curriculum overview</button>
          <div className="dp-concept-hero" style={{ '--level-color': level.color }}><p className="dp-level-tag">LEVEL {LEVELS.indexOf(level) + 1} · {level.difficulty} / {selected.groupTitle}</p><h2>{selected.title}</h2><Soon /><p>{selected.scope}</p></div>
          <section className="dp-plan"><h3>Your learning path</h3><p className="dp-muted">This concept is mapped, but its lesson and challenge have not been built yet.</p><StageCards /></section>
          <section className="dp-practice"><div className="dp-section-heading"><div><p className="dp-eyebrow">03 / PRACTICE WORKSPACE</p><h3>Solve it your way</h3></div><Soon /></div><fieldset className="dp-language"><legend>Preview language</legend>{['Python', 'JavaScript'].map(item => <label key={item} className={language === item ? 'is-active' : ''}><input type="radio" name="dp-language" value={item} checked={language === item} onChange={() => setLanguage(item)} />{item}</label>)}</fieldset><div className="dp-editor-preview"><div><span>{language === 'Python' ? 'solution.py' : 'solution.js'}</span><span>Workspace preview</span></div><pre>{language === 'Python' ? '# Your Python challenge will appear here.\n# Problem statement, starter code, and tests: coming soon.' : '// Your JavaScript challenge will appear here.\n// Problem statement, starter code, and tests: coming soon.'}</pre></div><div className="dp-practice-footer"><p>No executable exercise is available yet.</p><button disabled>Run code · coming soon</button></div></section>
          <section className="dp-hints" aria-label="Progressive hints"><div className="dp-section-heading"><div><p className="dp-eyebrow">A NUDGE, NOT THE ANSWER</p><h3>Hints when you need them</h3></div><Soon /></div><p className="dp-muted">For harder problems, ask for one small hint at a time. Each hint helps you take the next step while leaving the solution to you.</p><ol>{[
            ['A small nudge', 'A useful observation to revisit in the problem statement.'],
            ['A guiding question', 'A question that helps you reason about your choices and state.'],
            ['A checkpoint', 'A tiny case or invariant to test your own approach.'],
          ].map(([title, description]) => <li key={title}><div><h4>{title}</h4><p>{description}</p></div><button disabled aria-label={`${title} hint coming soon`}>Coming soon</button></li>)}</ol><p className="dp-muted">Hints will be optional and revealed individually. They will not reveal the full recurrence, solution code, or final answer. Problem-specific hints are not written yet.</p></section>
          <section className="dp-related"><h3>In this topic family</h3><div>{CONCEPTS.filter(item => item.groupId === selected.groupId).map(item => <button key={item.id} aria-current={item.id === selectedId ? 'page' : undefined} onClick={() => select(item.id)}>{item.title}<span>Coming soon</span></button>)}</div></section>
        </>}
      </main>
    </div>
  </div>
}

function StageCards() {
  return <div className="dp-stage-cards">{STAGES.map(([number, title, text]) => <article key={number}><span className="dp-stage-number">{number}</span><h4>{title}</h4><p>{text}</p><Soon /></article>)}</div>
}
