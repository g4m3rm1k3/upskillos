// Figures placed between the paragraphs of Lab 34 (34.2, 34.3), built on the lab's own engine.
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Radio, Readout, Bars, r } from '../../kit/fig.jsx'
import { DOCS, QUERIES, chunk, buildIndex, retrieve, evaluate } from './engine.js'

const METHODS = [['keyword', 'shared words'], ['tfidf', 'TF-IDF'], ['bm25', 'BM25'], ['semantic', 'toy semantic']]
const INDEX2 = buildIndex(chunk(DOCS, 2))

// ---------- 34.2 ----------
const PICK = [0, 6, 12, 13, 16].map(i => QUERIES[i])
export function RetrievalRace() {
  const [qi, setQi] = useState('2'), [method, setMethod] = useState('bm25')
  const { q, relevant } = PICK[Number(qi)]
  const top = retrieve(INDEX2, q, { method, k: 5, canSeeRestricted: true })
  const hit = top.findIndex(d => relevant.includes(d.id))
  return <div>
    <Controls>
      <Radio name="q34" value={qi} onChange={setQi} options={PICK.map((p, i) => [String(i), `“${p.q}”`])} />
      <Radio name="m34" value={method} onChange={setMethod} options={METHODS} />
    </Controls>
    {top.length
      ? <Bars items={top.map(d => ({ label: d.id, value: d.score, highlight: relevant.includes(d.id) }))} digits={2} label={`Top ${top.length} runbooks for “${q}” with ${method}: ${top.map(d => `${d.id} ${r(d.score, 2)}`).join(', ')}`} />
      : <p>No runbook shares a word with this question: nothing is retrieved.</p>}
    <Readout>{hit === 0 ? 'The answering runbook (highlighted) is ranked first.' : hit > 0 ? `The answering runbook is ranked ${hit + 1}${hit === 1 ? 'nd' : hit === 2 ? 'rd' : 'th'}: a generator reading only the top result would miss it.` : `The answering runbook (${relevant.join(', ')}) is not retrieved at all.`} {method === 'semantic' ? 'The toy semantic method maps synonyms to shared concepts by a hand-written list — which was written while reading these very questions (34.3).' : 'Lexical scores need shared words: a paraphrase with none scores zero everywhere.'}</Readout>
  </div>
}

// ---------- 34.3 ----------
export function RecallTable() {
  const [size, setSize] = useState(2)
  const rows = useMemo(() => { const idx = buildIndex(chunk(DOCS, size)); return METHODS.map(([m, label]) => ({ label, r1: evaluate(idx, { method: m, k: 1 }).recall, r3: evaluate(idx, { method: m, k: 3 }).recall, mrr: evaluate(idx, { method: m, k: 3 }).mrr })) }, [size])
  return <div>
    <Controls><Slider label="sentences per chunk" value={size} min={1} max={4} step={1} onChange={setSize} digits={0} /></Controls>
    <table className="ml-fig-table">
      <caption>Retrieval on the 17 labelled questions ({size} sentence{size > 1 ? 's' : ''} per chunk; best chunk per runbook)</caption>
      <thead><tr><th scope="col">Method</th><th scope="col">recall@1</th><th scope="col">recall@3</th><th scope="col">MRR</th></tr></thead>
      <tbody>{rows.map(x => <tr key={x.label}><th scope="row" style={{ textAlign: 'left' }}>{x.label}</th><td>{r(x.r1, 3)}</td><td>{r(x.r3, 3)}</td><td>{r(x.mrr, 3)}</td></tr>)}</tbody>
    </table>
    <Readout>The lexical methods stop at recall@3 {r(rows[2].r3, 3)}; two paraphrases share no word with their runbook and are never retrieved at all. The toy semantic method looks almost perfect — on questions its synonym list was written from. That number is a leak, not a result.</Readout>
  </div>
}
