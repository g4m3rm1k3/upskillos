import React, { useMemo, useState } from 'react'
import { DOCS, QUERIES, chunk, buildIndex, retrieve, evaluate, answer } from './engine.js'
import { Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Table, Caption, Actions, Warning } from '../../kit/ui.jsx'
import { pct, fmt } from '../../kit/math.js'

const METHODS = [['keyword', 'Keyword overlap'], ['tfidf', 'TF-IDF cosine'], ['bm25', 'BM25'], ['semantic', 'Toy semantic (concept map)']]

export default function Playground() {
  const [query, setQuery] = useState('why are my builds slow after changing the lockfile'), [method, setMethod] = useState('bm25'), [size, setSize] = useState(2), [k, setK] = useState(3), [role, setRole] = useState(false)
  const index = useMemo(() => buildIndex(chunk(DOCS, size)), [size])
  const results = retrieve(index, query, { method, k, canSeeRestricted: role })
  const ans = answer(results, query, { semantic: method === 'semantic' })
  const table = useMemo(() => METHODS.map(([m, label]) => { const e = evaluate(index, { method: m, k: 1 }), e3 = evaluate(index, { method: m, k: 3 }); return [label, pct(e.recall), pct(e3.recall), fmt(e3.mrr, 3)] }), [index])
  const hidden = retrieve(index, query, { method, k, canSeeRestricted: true }).filter(d => d.restricted && !role)
  return <>
    <PanelHeading title="Find the right runbook, then answer from it." pill={`${index.chunks.length} chunks`} />
    <Caption>An assistant for on-call engineers answers questions from 12 runbooks. Two are restricted to specific teams. The answer is only as good as what retrieval finds, so retrieval is evaluated on its own, with 17 labelled questions.</Caption>
    <label className="ml-reflection" style={{ display: 'grid', gap: 6 }}>Question<input aria-label="Question" value={query} onChange={e => setQuery(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} /></label>
    <Actions>{[QUERIES[0], ...QUERIES.slice(10, 17)].map(q => <button key={q.q} onClick={() => setQuery(q.q)}>{q.q}</button>)}</Actions>
    <Controls>
      <Choice label="Retrieval method" value={method} onChange={setMethod} options={METHODS} />
      <Slider label="Sentences per chunk" value={size} min={1} max={4} onChange={setSize} />
      <Slider label="Passages retrieved (k)" value={k} min={1} max={5} onChange={setK} />
      <Toggle label="User belongs to the database/payments teams" checked={role} onChange={setRole} />
    </Controls>
    {results.length ? <Bars label="Retrieval scores" format={v => v.toFixed(3)} items={results.map(r => ({ label: r.chunkId, value: r.score }))} /> : <Warning>Nothing retrieved: no passage shares anything with this question under this method.</Warning>}
    {results.length > 0 && <Table head={['rank', 'runbook', 'passage']} rows={results.map((r, i) => [i + 1, r.title, r.text])} />}
    <div className="ml-update"><h3>Grounded answer</h3>{ans ? <p>{ans.s} <strong>[source: {ans.title}]</strong></p> : <p>I could not find this in the runbooks available to you.</p>}</div>
    {hidden.length > 0 && <Caption>{`${hidden.length} restricted runbook(s) matched but were filtered out before ranking, because this user may not see them. Filtering happens before retrieval, never after generation.`}</Caption>}
    <Table head={['method', 'recall@1', 'recall@3', 'MRR']} rows={table} caption="Measured on all 17 labelled questions with every runbook visible. Six questions are paraphrases that share few words with their runbook." />
    <Insight title="Read the evaluation critically">Lexical methods miss paraphrases (“RAM” vs “memory”, “piling up” vs “backlog”). The toy semantic method maps synonyms to shared concepts and nearly aces the test — but its concept list was written while looking at these questions, which is exactly the evaluation leak of Lab 06. A real embedding model must be judged on questions it has never seen. Evaluate retrieval (did we find the right passage?) separately from the answer (is it correct and supported by the cited passage?).</Insight>
  </>
}
