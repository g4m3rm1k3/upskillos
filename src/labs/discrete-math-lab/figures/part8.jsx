// Interactive figures for Part 8: Discrete Probability, Boolean Algebra & Automata (+ EquationAnatomy)
import { useState } from 'react'
import Markdown from '../../qmaze-lab/Markdown.jsx'
import { C, Slider, Bars, Working, fmt } from './ui.jsx'
import {
  bayesPosterior, binomialPmf, harmonicNumber, couponCollectorExpected,
  birthdayCollisionProb, runDfa,
} from '../engine/discrete.js'
import { EQUATIONS } from '../decoder.js'
import { lessonById, refs } from '../lessons/index.js'

export function BayesTreeGridFig() {
  const [priorPct, setPriorPct] = useState(1)
  const [sensPct, setSensPct] = useState(99)
  const [fpPct, setFpPct] = useState(5)

  const prior = priorPct / 100
  const sens = sensPct / 100
  const fp = fpPct / 100
  const post = bayesPosterior(prior, sens, fp)

  const pop = 10000
  const sick = Math.round(pop * prior)
  const healthy = pop - sick
  const truePos = Math.round(sick * sens)
  const falsePos = Math.round(healthy * fp)

  return <div className="qm-fig-body">
    <Slider label="Prior prevalence P(D) (%)" value={priorPct} min={1} max={50} step={1} onChange={setPriorPct} show={v => `${v}%`} />
    <Slider label="Sensitivity P(+ | D) (%)" value={sensPct} min={50} max={100} step={1} onChange={setSensPct} show={v => `${v}%`} />
    <Slider label="False-positive rate P(+ | ¬D) (%)" value={fpPct} min={1} max={25} step={1} onChange={setFpPct} show={v => `${v}%`} />
    <Bars digits={1} max={100} rows={[
      { label: 'Prior P(D) (%)', value: priorPct, color: C.violet },
      { label: 'Posterior P(D | +) (%)', value: post * 100, color: C.teal, mark: true },
    ]} />
    <Working rows={[
      ['Natural frequencies (per 10,000)', `${sick} have condition, ${healthy} do not`, `True Positives = ${truePos}, False Positives = ${falsePos}`],
      ['Total Positive Alarms P(+)', `${truePos} + ${falsePos} = ${truePos + falsePos} out of 10,000`, `P(+) = ${fmt((truePos + falsePos) / pop, 4)}`],
      ['Bayes Posterior P(D | +)', `${truePos} / (${truePos} + ${falsePos})`, `${fmt(post * 100, 2)}% (Fraction = ${fmt(post, 4)})`],
    ]} />
  </div>
}

export function LinearityExpectationFig() {
  const [nCoupons, setNCoupons] = useState(5)
  const [kPeople, setKPeople] = useState(23)
  const hVal = harmonicNumber(nCoupons)
  const expDraws = couponCollectorExpected(nCoupons)
  const bdayProb = birthdayCollisionProb(kPeople, 365)
  const bdayExpectedPairs = (kPeople * (kPeople - 1)) / (2 * 365)

  const pmfRows = Array.from({ length: 6 }, (_, k) => ({
    label: `Binomial(5, 0.5): P(X = ${k})`,
    value: binomialPmf(k, 5, 0.5),
    color: C.teal,
  }))

  return <div className="qm-fig-body">
    <Slider label="Coupon types n (Coupon Collector)" value={nCoupons} min={1} max={12} step={1} onChange={setNCoupons} />
    <Slider label="Room size k (Birthday Paradox)" value={kPeople} min={2} max={60} step={1} onChange={setKPeople} />
    <Bars digits={3} rows={pmfRows} />
    <Working rows={[
      ['Coupon Collector E[T] = n · Hₙ', `${nCoupons} × H_${nCoupons} = ${nCoupons} × ${fmt(hVal, 3)}`, `${fmt(expDraws, 2)} expected draws`],
      ['Birthday Paradox (365 days)', `k = ${kPeople} people (${(kPeople * (kPeople - 1)) / 2} pairs)`, `P(collision) = ${fmt(bdayProb * 100, 2)}%, E[shared pairs] = ${fmt(bdayExpectedPairs, 3)}`],
      ['Random permutation fixed points', 'E[X] = ∑_{i=1}^n P(π(i)=i) = n · (1/n)', 'Always 1.000 (for every n ≥ 1!)'],
    ]} />
  </div>
}

// 2x4 Karnaugh map for 3 variables (x in {0,1}, yz in Gray code {00, 01, 11, 10})
const GRAY_YZ = ['00', '01', '11', '10']

export function KarnaughGateFig() {
  // Default: consensus example f(x,y,z) = xy + x'z (1 at x=1,yz=11,10 and x=0,yz=01,11)
  const [cells, setCells] = useState([
    [0, 1, 1, 0], // x = 0: yz = 00, 01, 11, 10
    [0, 0, 1, 1], // x = 1: yz = 00, 01, 11, 10
  ])
  const toggle = (r, c) => setCells(cs => cs.map((row, ri) => row.map((v, ci) => (ri === r && ci === c ? 1 - v : v))))

  const minterms = []
  cells.forEach((row, x) => {
    row.forEach((v, ci) => {
      if (v === 1) {
        const y = Number(GRAY_YZ[ci][0]), z = Number(GRAY_YZ[ci][1])
        minterms.push(`${x ? 'x' : 'x̄'}${y ? 'y' : 'ȳ'}${z ? 'z' : 'z̄'}`)
      }
    })
  })

  return <div className="qm-fig-body">
    <p className="dm-fig-lead">Click cells in the 3-variable Karnaugh Map (note Gray code column order `00, 01, 11, 10` so adjacent columns differ in 1 bit):</p>
    <table className="qm-mathcode dm-matrix-table">
      <thead>
        <tr><th>x \ yz</th><th>00 (ȳz̄)</th><th>01 (ȳz)</th><th>11 (yz)</th><th>10 (yz̄)</th></tr>
      </thead>
      <tbody>
        {[0, 1].map(x => (
          <tr key={x}>
            <td><b>x = {x} ({x ? 'x' : 'x̄'})</b></td>
            {GRAY_YZ.map((yz, c) => (
              <td key={yz}>
                <button type="button" className={`dm-cell-btn${cells[x][c] ? ' on' : ''}`} onClick={() => toggle(x, c)}>
                  {cells[x][c]}
                </button>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <Working rows={[
      ['On-set minterms (1-cells)', `${minterms.length} of 8 cells active`, minterms.join(' + ') || '0 (Always False)'],
      ['Universal gate check', 'NAND(a, a) = ¬(a · a) = ā', 'Every Boolean SOP function can be built from NAND gates alone'],
    ]} />
  </div>
}

const DFA_PRESETS = {
  evenOnes: {
    label: 'Even number of 1s',
    transitions: {
      q0: { 0: 'q0', 1: 'q1' },
      q1: { 0: 'q1', 1: 'q0' },
    },
    start: 'q0',
    accept: ['q0'],
    rule: 'q₀ = even 1s (accept), q₁ = odd 1s',
  },
  ends01: {
    label: 'Ends with "01"',
    transitions: {
      q0: { 0: 'q1', 1: 'q0' },
      q1: { 0: 'q1', 1: 'q2' },
      q2: { 0: 'q1', 1: 'q0' },
    },
    start: 'q0',
    accept: ['q2'],
    rule: 'q₀ = start/saw 1, q₁ = just saw 0, q₂ = just saw 01 (accept)',
  },
  mult3: {
    label: 'Binary multiple of 3 (val mod 3 = 0)',
    transitions: {
      r0: { 0: 'r0', 1: 'r1' },
      r1: { 0: 'r2', 1: 'r0' },
      r2: { 0: 'r1', 1: 'r2' },
    },
    start: 'r0',
    accept: ['r0'],
    rule: 'State rₖ tracks (value mod 3); reading bit b transitions rₖ → r_{(2k + b) mod 3}',
  },
}

export function AutomatonSimFig() {
  const [preset, setPreset] = useState('evenOnes')
  const [input, setInput] = useState('10110')
  const dfa = DFA_PRESETS[preset]
  const res = runDfa(dfa.transitions, dfa.start, dfa.accept, input)

  return <div className="qm-fig-body">
    <div className="qm-buttons">
      {Object.entries(DFA_PRESETS).map(([k, cfg]) => (
        <button key={k} className={preset === k ? 'qm-primary' : ''} onClick={() => setPreset(k)}>{cfg.label}</button>
      ))}
    </div>
    <div className="qm-buttons">
      <span>Input string w ∈ {'{0, 1}*'}:</span>
      <button onClick={() => setInput(s => (s.length < 12 ? s + '0' : s))}>Append 0</button>
      <button onClick={() => setInput(s => (s.length < 12 ? s + '1' : s))}>Append 1</button>
      <button onClick={() => setInput(s => s.slice(0, -1))}>Backspace</button>
      <button onClick={() => setInput('')}>Clear (ε)</button>
      {['10110', '1101', '110', '1001'].map(sample => (
        <button key={sample} className={input === sample ? 'qm-primary' : ''} onClick={() => setInput(sample)}>"{sample}"</button>
      ))}
    </div>
    <Working rows={[
      ['DFA State Invariant', dfa.label, dfa.rule],
      ['Input string w', input === '' ? 'ε (empty string, length 0)' : `"${input}" (length ${input.length})`, `Final state: ${res.finalState}`],
      ['State trace δ*(q₀, w)', res.trace.join(' → '), res.accepted ? 'ACCEPTED ✓ (in F)' : 'REJECTED ✗ (not in F)'],
    ]} />
  </div>
}

export function EquationAnatomy({ ids, onLesson }) {
  const list = ids ? EQUATIONS.filter(e => ids.includes(e.id)) : EQUATIONS
  const [id, setId] = useState(list[0].id), [part, setPart] = useState(0)
  const eq = list.find(e => e.id === id) ?? list[0], p = eq.parts[Math.min(part, eq.parts.length - 1)], lesson = lessonById(p[2])
  return <div className="qm-fig mm-anatomy">
    {list.length > 1 && <div className="qm-fig-controls"><label>Theorem / Identity <select value={eq.id} onChange={e => { setId(e.target.value); setPart(0) }}>{list.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label></div>}
    <p className="qm-hint">{refs(eq.source)}</p>
    <div className="mm-equation"><Markdown>{`$$${eq.tex}$$`}</Markdown></div>
    <div className="mm-parts">{eq.parts.map(([tex], i) => <button key={i} className={i === part ? 'active' : ''} onClick={() => setPart(i)}><Markdown inline>{`$${tex}$`}</Markdown></button>)}</div>
    <div className="mm-part-explain"><Markdown inline>{`$${p[0]}$: ${refs(p[1])}.`}</Markdown> {lesson && (onLesson ? <button className="qm-link" onClick={() => onLesson(lesson.id)}>Lesson {lesson.number}: {lesson.title}</button> : <span className="qm-hint">Lesson {lesson.number}: {lesson.title}</span>)}</div>
    <p><b>In one sentence:</b> <Markdown inline>{refs(eq.whole)}</Markdown></p>
  </div>
}
