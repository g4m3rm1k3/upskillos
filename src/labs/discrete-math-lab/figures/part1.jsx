// Interactive figures for Part 1: Propositional & Predicate Logic
import { useState } from 'react'
import { C, Working } from './ui.jsx'
import { implies, iff, xor, truthRows2 } from '../engine/discrete.js'

const TF = v => (v ? 'T' : 'F')
const evalConnectives = (p, q) => ({
  notP: !p,
  and: Boolean(p && q),
  or: Boolean(p || q),
  xor: xor(p, q),
  imp: implies(p, q),
  iff: iff(p, q),
})

export function TruthTableFig() {
  const [p, setP] = useState(true)
  const [q, setQ] = useState(false)
  const cur = evalConnectives(p, q)
  const rows = [
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ]
  return <div className="qm-fig-body">
    <div className="qm-buttons">
      <button className={p ? 'qm-primary' : ''} onClick={() => setP(v => !v)}>p = {TF(p)} (click to flip)</button>
      <button className={q ? 'qm-primary' : ''} onClick={() => setQ(v => !v)}>q = {TF(q)} (click to flip)</button>
    </div>
    <table className="qm-mathcode dm-truth-table">
      <thead>
        <tr>
          <th>p</th><th>q</th><th>¬p</th><th>p ∧ q</th><th>p ∨ q</th><th>p ⊕ q</th><th>p → q</th><th>p ↔ q</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([rp, rq], i) => {
          const r = evalConnectives(rp, rq)
          const active = rp === p && rq === q
          return <tr key={i} className={active ? 'dm-active-row' : ''} onClick={() => { setP(rp); setQ(rq) }} style={{ cursor: 'pointer' }}>
            <td><b>{TF(rp)}</b></td>
            <td><b>{TF(rq)}</b></td>
            <td style={{ color: r.notP ? C.teal : C.red }}>{TF(r.notP)}</td>
            <td style={{ color: r.and ? C.teal : C.red }}>{TF(r.and)}</td>
            <td style={{ color: r.or ? C.teal : C.red }}>{TF(r.or)}</td>
            <td style={{ color: r.xor ? C.teal : C.red }}>{TF(r.xor)}</td>
            <td style={{ color: r.imp ? C.teal : C.red }}><b>{TF(r.imp)}</b></td>
            <td style={{ color: r.iff ? C.teal : C.red }}>{TF(r.iff)}</td>
          </tr>
        })}
      </tbody>
    </table>
    <Working rows={[
      ['Active assignment', `(p, q) = (${TF(p)}, ${TF(q)})`, cur.imp ? 'p → q holds' : 'p → q broken!'],
      ['Conjunction vs Disjunction', `p ∧ q = ${TF(cur.and)}, p ∨ q = ${TF(cur.or)}`, `p ⊕ q = ${TF(cur.xor)}`],
    ]} />
  </div>
}

export function ImplicationContractFig() {
  const [cards, setCards] = useState([false, false, false, false])
  const deck = [
    { front: 'E', back: '4', p: true, q: true, role: 'p = T (vowel): MUST flip to check q = T', mustFlip: true },
    { front: 'K', back: '7', p: false, q: false, role: 'p = F (consonant): vacuously true regardless of back', mustFlip: false },
    { front: '4', back: 'A', p: true, q: true, role: 'q = T (even): already satisfies ¬p ∨ q regardless of front', mustFlip: false },
    { front: '7', back: 'E', p: true, q: false, role: 'q = F (odd): MUST flip to check ¬p (contrapositive ¬q → ¬p!)', mustFlip: true },
  ]
  const toggle = i => setCards(c => c.map((v, k) => (k === i ? !v : v)))
  return <div className="qm-fig-body">
    <p className="dm-fig-lead">Rule under test: <b>“If a card has a vowel on its letter side (p), then it has an even number on its number side (q).”</b> Click cards to flip them:</p>
    <div className="dm-card-grid">
      {deck.map((card, i) => {
        const flipped = cards[i]
        return <button key={i} type="button" className={`dm-wason-card${flipped ? ' flipped' : ''}${card.mustFlip ? ' critical' : ''}`} onClick={() => toggle(i)}>
          <span className="dm-card-face">{flipped ? `${card.front} ⇄ ${card.back}` : card.front}</span>
          <span className="dm-card-sub">{flipped ? card.role : 'Click to flip'}</span>
        </button>
      })}
    </div>
    <Working rows={[
      ['Direct test (Modus Ponens)', 'Card "E" has p = T', 'Must verify q = T (even)'],
      ['Contrapositive test (Modus Tollens)', 'Card "7" has q = F', 'Must verify p = F (not a vowel)'],
      ['Vacuous / irrelevant cards', 'Cards "K" (p = F) and "4" (q = T)', 'Can never falsify p → q'],
    ]} />
  </div>
}

const FORMULAS = [
  {
    label: 'De Morgan 1: ¬(p ∧ q) vs ¬p ∨ ¬q',
    lhs: (p, q) => !(p && q),
    rhs: (p, q) => !p || !q,
    note: 'Equivalent on all 4 rows (Tautological ↔)',
  },
  {
    label: 'De Morgan 2: ¬(p ∨ q) vs ¬p ∧ ¬q',
    lhs: (p, q) => !(p || q),
    rhs: (p, q) => !p && !q,
    note: 'Equivalent on all 4 rows (Tautological ↔)',
  },
  {
    label: 'Implication: p → q vs ¬p ∨ q',
    lhs: (p, q) => !p || q,
    rhs: (p, q) => !p || q,
    note: 'Material Implication Law',
  },
  {
    label: 'Fallacy trap: ¬(p ∧ q) vs ¬p ∧ ¬q',
    lhs: (p, q) => !(p && q),
    rhs: (p, q) => !p && !q,
    note: 'NOT equivalent! Disagrees on (T, F) and (F, T).',
  },
]

export function DeMorganFig() {
  const [idx, setIdx] = useState(0)
  const spec = FORMULAS[idx]
  const tableL = truthRows2(spec.lhs)
  const tableR = truthRows2(spec.rhs)
  const allMatch = tableL.every((r, i) => r.value === tableR[i].value)
  return <div className="qm-fig-body">
    <div className="qm-buttons">
      {FORMULAS.map((f, i) => (
        <button key={i} className={idx === i ? 'qm-primary' : ''} onClick={() => setIdx(i)}>{f.label}</button>
      ))}
    </div>
    <table className="qm-mathcode dm-truth-table">
      <thead>
        <tr><th>p</th><th>q</th><th>Left formula</th><th>Right formula</th><th>Match (LHS ↔ RHS)</th></tr>
      </thead>
      <tbody>
        {tableL.map((row, i) => {
          const rOut = tableR[i].value
          const match = row.value === rOut
          return <tr key={i} className={!match ? 'dm-mismatch-row' : ''}>
            <td>{TF(row.p)}</td>
            <td>{TF(row.q)}</td>
            <td><b>{TF(row.value)}</b></td>
            <td><b>{TF(rOut)}</b></td>
            <td style={{ color: match ? C.teal : C.red }}><b>{match ? '✓ T' : '✗ F (Counterexample)'}</b></td>
          </tr>
        })}
      </tbody>
    </table>
    <Working rows={[
      ['Comparison result', spec.label, allMatch ? 'Logically Equivalent (≡)' : 'Not Equivalent (≢)'],
      ['Takeaway', spec.note, `${tableL.filter((r, i) => r.value === tableR[i].value).length}/4 rows agree`],
    ]} />
  </div>
}

export function QuantifierGridFig() {
  // 3x3 binary relation matrix R(x, y) on X = {1,2,3}, Y = {1,2,3}
  const [grid, setGrid] = useState([
    [true, false, false],
    [false, true, false],
    [false, false, true],
  ])
  const toggle = (r, c) => setGrid(g => g.map((row, ri) => row.map((v, ci) => (ri === r && ci === c ? !v : v))))

  const forallExists = grid.every(row => row.some(Boolean)) // ∀x ∃y R(x,y): every row has ≥ 1 true
  const existsForall = [0, 1, 2].some(c => grid.every(row => row[c])) // ∃y ∀x R(x,y): some column is all true
  const forallForall = grid.every(row => row.every(Boolean))
  const existsExists = grid.some(row => row.some(Boolean))

  return <div className="qm-fig-body">
    <p className="dm-fig-lead">Click cells in R(x, y) on {'{1, 2, 3} × {1, 2, 3}'} to compare row-by-row vs. single-column quantifiers:</p>
    <table className="qm-mathcode dm-matrix-table">
      <thead>
        <tr><th>x \ y</th><th>y = 1</th><th>y = 2</th><th>y = 3</th><th>∃y R(x, y) (Row has ≥1 T?)</th></tr>
      </thead>
      <tbody>
        {grid.map((row, r) => {
          const rowOk = row.some(Boolean)
          return <tr key={r}>
            <td><b>x = {r + 1}</b></td>
            {row.map((val, c) => (
              <td key={c}>
                <button type="button" className={`dm-cell-btn${val ? ' on' : ''}`} onClick={() => toggle(r, c)}>
                  {val ? '1 (T)' : '0 (F)'}
                </button>
              </td>
            ))}
            <td style={{ color: rowOk ? C.teal : C.red }}><b>{rowOk ? '✓ Yes' : '✗ No'}</b></td>
          </tr>
        })}
        <tr>
          <td><b>∀x R(x, y) (Col all T?)</b></td>
          {[0, 1, 2].map(c => {
            const colOk = grid.every(row => row[c])
            return <td key={c} style={{ color: colOk ? C.teal : C.red }}><b>{colOk ? '✓ All T' : '✗'}</b></td>
          })}
          <td />
        </tr>
      </tbody>
    </table>
    <Working rows={[
      ['∀x ∃y R(x, y)', 'Every row has at least one 1', forallExists ? 'TRUE' : 'FALSE'],
      ['∃y ∀x R(x, y)', 'At least one column is all 1s', existsForall ? 'TRUE' : 'FALSE'],
      ['∀x ∀y R(x, y) / ∃x ∃y R(x, y)', `All 9 cells: ${TF(forallForall)}`, `At least 1 cell: ${TF(existsExists)}`],
    ]} />
  </div>
}

export function InferenceChainFig() {
  const [p, setP] = useState(true)
  const [q, setQ] = useState(true)
  const [r, setR] = useState(true)
  const pImpQ = !p || q
  const qImpR = !q || r
  const pImpR = !p || r
  const modusPonensPremises = p && pImpQ
  const modusTollensPremises = !q && pImpQ
  const fallacyAffirmConsequent = q && pImpQ

  return <div className="qm-fig-body">
    <div className="qm-buttons">
      <button className={p ? 'qm-primary' : ''} onClick={() => setP(v => !v)}>p = {TF(p)}</button>
      <button className={q ? 'qm-primary' : ''} onClick={() => setQ(v => !v)}>q = {TF(q)}</button>
      <button className={r ? 'qm-primary' : ''} onClick={() => setR(v => !v)}>r = {TF(r)}</button>
    </div>
    <Working rows={[
      ['Modus Ponens: p ∧ (p → q) ⇒ q', `Premises: ${TF(modusPonensPremises)}`, `Conclusion q = ${TF(q)} (${!modusPonensPremises || q ? 'Valid ✓' : 'Broken'})`],
      ['Modus Tollens: ¬q ∧ (p → q) ⇒ ¬p', `Premises: ${TF(modusTollensPremises)}`, `Conclusion ¬p = ${TF(!p)} (${!modusTollensPremises || !p ? 'Valid ✓' : 'Broken'})`],
      ['Hypothetical Syllogism: (p→q)∧(q→r) ⇒ (p→r)', `Premises: ${TF(pImpQ && qImpR)}`, `p → r = ${TF(pImpR)} (Valid ✓)`],
      ['Fallacy (Affirming Consequent): q ∧ (p → q) ⇏ p', `Premises: ${TF(fallacyAffirmConsequent)}`, fallacyAffirmConsequent && !p ? 'COUNTEREXAMPLE! Premises T, but p = F!' : `p = ${TF(p)} (Try p=F, q=T)`],
    ]} />
  </div>
}
