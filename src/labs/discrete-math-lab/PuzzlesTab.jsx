// Interactive Puzzles & Challenges Workbench for the Discrete Math Lab.
// Houses 7 playable multi-level mathematical puzzle studios + the Infinite Practice & Mastery Drill Generator.
import { useState } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { parseAnswer } from '../ml-lab/Checkpoint.jsx'
import {
  choose, perm, starsAndBars, derangements, gcd, modInverse, modPow, crtSolve,
  totient, latticePaths, relationProps, runDfa, fib, hanoiMoves, catalan,
  completeEdges, cayleyTrees, frobeniusNumber,
} from './engine/discrete.js'

export const PUZZLES = [
  { id: 'knights', icon: '🛡️', title: 'Knights, Knaves & SAT Detective', topic: 'Part 1 · Logic' },
  { id: 'tiling', icon: '🧱', title: 'L-Tromino Tiler & Stamp Forge', topic: 'Part 2 · Induction' },
  { id: 'relations', icon: '🔗', title: 'Relation Matrix & Poset Architect', topic: 'Part 3 · Sets & Relations' },
  { id: 'counting', icon: '🗺️', title: 'Lattice Paths & Counting Classifier', topic: 'Part 4 · Combinatorics' },
  { id: 'modular', icon: '🔐', title: 'Modular Lockbreaker & RSA Cracker', topic: 'Part 5 · Number Theory' },
  { id: 'graphs', icon: '🎨', title: 'Graph Coloring & Spanning Tree Arena', topic: 'Part 7 · Graph Theory' },
  { id: 'automata', icon: '🤖', title: 'DFA State Machine Architect', topic: 'Part 8 · Automata & Circuits' },
  { id: 'practice', icon: '♾️', title: 'Infinite Practice & Challenge Drill', topic: 'All 8 Parts · Mastery' },
]

// ─── 1. Knights & Knaves Detective ─────────────────────────────────────────
const KNIGHT_LEVELS = [
  {
    id: 'kk-1',
    title: 'Level 1: The Accusation',
    story: 'You meet **A** and **B** on the Island of Knights (always tell the truth, $\\text{T}$) and Knaves (always lie, $\\text{F}$).',
    islanders: ['A', 'B'],
    statements: [
      { speaker: 0, text: 'A says: “At least one of us is a Knave.” ($\\neg a \\lor \\neg b$)', eval: ([a, b]) => !a || !b },
      { speaker: 1, text: 'B says nothing (no constraint from B’s speech).', eval: ([a, b]) => b },
    ],
    solution: [true, false],
    explain: 'If A were a Knave ($a = \\text{F}$), then “at least one of us is a Knave” would be TRUE, contradicting that Knaves lie! So A must be a Knight ($a = \\text{T}$), which makes A’s statement true, forcing B to be a Knave ($b = \\text{F}$).',
  },
  {
    id: 'kk-2',
    title: 'Level 2: Twin Claims',
    story: 'Two islanders **A** and **B** speak in turn:',
    islanders: ['A', 'B'],
    statements: [
      { speaker: 0, text: 'A says: “We are both Knights.” ($a \\land b$)', eval: ([a, b]) => a && b },
      { speaker: 1, text: 'B says: “A is a Knave!” ($\\neg a$)', eval: ([a, b]) => !a },
    ],
    solution: [false, true],
    explain: 'Since B says $\\neg a$, A and B have opposite truth values ($b \\leftrightarrow \\neg a$). Thus they cannot both be Knights, so A’s claim $a \\land b$ is false, making A a Knave ($a = \\text{F}$) and B a Knight ($b = \\text{T}$).',
  },
  {
    id: 'kk-3',
    title: 'Level 3: Three Islanders at the Fork',
    story: 'Three islanders **A**, **B**, and **C** guard a fork in the road:',
    islanders: ['A', 'B', 'C'],
    statements: [
      { speaker: 0, text: 'A says: “B and C are of the same type.” ($b \\leftrightarrow c$)', eval: ([a, b, c]) => b === c },
      { speaker: 1, text: 'B says: “A and C are both Knaves.” ($\\neg a \\land \\neg c$)', eval: ([a, , c]) => !a && !c },
      { speaker: 2, text: 'C says: “Exactly one of A, B, C is a Knight.”', eval: ([a, b, c]) => [a, b, c].filter(Boolean).length === 1 },
    ],
    solution: [false, false, true],
    explain: 'With $A = \\text{F}$ (Knave), $B = \\text{F}$ (Knave), and $C = \\text{T}$ (Knight): A’s claim ($b \\leftrightarrow c$) is False ✓; B’s claim ($\\neg a \\land \\neg c$) is False ✓; and C’s claim (exactly 1 Knight) is True ✓!',
  },
]

function KnightsStudio({ solved, onSolve }) {
  const [lvlIdx, setLvlIdx] = useState(0)
  const lvl = KNIGHT_LEVELS[lvlIdx]
  const [assign, setAssign] = useState([true, true, true])
  const [checked, setChecked] = useState(false)

  const cur = assign.slice(0, lvl.islanders.length)
  const checks = lvl.statements.map(s => {
    const speakerTruth = cur[s.speaker]
    const claimTruth = Boolean(s.eval(cur))
    return { ...s, speakerTruth, claimTruth, consistent: speakerTruth === claimTruth }
  })
  const allConsistent = checks.every(c => c.consistent) && cur.every((v, i) => v === lvl.solution[i])

  const flip = i => {
    setAssign(a => a.map((v, k) => (k === i ? !v : v)))
    setChecked(false)
  }

  return <div className="dm-studio">
    <div className="qm-buttons">
      {KNIGHT_LEVELS.map((l, i) => (
        <button key={l.id} className={lvlIdx === i ? 'qm-primary' : ''} onClick={() => { setLvlIdx(i); setChecked(false) }}>
          {solved.includes(l.id) ? '✓ ' : ''}{l.title}
        </button>
      ))}
    </div>
    <div className="qm-md"><Markdown>{lvl.story}</Markdown></div>
    <div className="dm-islander-row">
      {lvl.islanders.map((name, i) => (
        <button key={name} type="button" className={`dm-islander-card ${cur[i] ? 'knight' : 'knave'}`} onClick={() => flip(i)}>
          <span className="dm-islander-name">Islander {name}</span>
          <strong className="dm-islander-role">{cur[i] ? '🛡️ Knight (T)' : '🎭 Knave (F)'}</strong>
          <small>Click to toggle T / F</small>
        </button>
      ))}
    </div>
    <table className="qm-mathcode dm-worked-table">
      <thead>
        <tr><th>Statement</th><th>Speaker</th><th>Statement Truth</th><th>Biconditional (Speaker ↔ Claim)</th></tr>
      </thead>
      <tbody>
        {checks.map((c, i) => (
          <tr key={i}>
            <td><Markdown inline>{c.text}</Markdown></td>
            <td><b>{c.speakerTruth ? 'T (Knight)' : 'F (Knave)'}</b></td>
            <td><b>{c.claimTruth ? 'T' : 'F'}</b></td>
            <td style={{ color: c.consistent ? '#1f6f68' : '#c0533a' }}>
              <b>{c.consistent ? '✓ Consistent' : '✗ Contradiction'}</b>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="qm-buttons">
      <button className="qm-primary" onClick={() => { setChecked(true); if (allConsistent) onSolve(lvl.id) }}>Verify Assignment</button>
    </div>
    {checked && (
      <div className={`qm-feedback${allConsistent ? ' good' : ''}`} role="status">
        <strong>{allConsistent ? 'Solved! ' : 'Not consistent yet. '}</strong>
        <Markdown inline>{allConsistent ? lvl.explain : 'Look for a row marked ✗ Contradiction: a Knight cannot make a false statement, and a Knave cannot make a true one.'}</Markdown>
      </div>
    )}
  </div>
}

// ─── 2. L-Tromino Board Tiler & Stamp Forge ────────────────────────────────
// 4x4 grid has 16 cells; 1 missing cell leaves 15 cells = 5 L-trominoes.
const TROMINO_SOLUTIONS = {
  '0,0': [
    [[0, 1], [1, 0], [1, 1]], // Center-straddling / top-left tromino
    [[0, 2], [0, 3], [1, 3]],
    [[2, 0], [3, 0], [3, 1]],
    [[2, 3], [3, 2], [3, 3]],
    [[1, 2], [2, 1], [2, 2]], // Center L-tromino straddling 3 quadrants!
  ],
  '1,2': [
    [[0, 2], [0, 3], [1, 3]],
    [[0, 0], [0, 1], [1, 0]],
    [[2, 0], [3, 0], [3, 1]],
    [[2, 3], [3, 2], [3, 3]],
    [[1, 1], [2, 1], [2, 2]], // Center L-tromino covering the 3 other quadrants!
  ],
}

const TILE_COLORS = ['#1f6f68', '#c26a12', '#5b4bb5', '#2f6db5', '#c9a227']

function TilingStudio({ solved, onSolve }) {
  const [missingKey, setMissingKey] = useState('0,0')
  const [stepCount, setStepCount] = useState(1) // How many of the 5 inductive trominoes are placed
  const [stampA, setStampA] = useState(4)
  const [stampB, setStampB] = useState(7)
  const [countA, setCountA] = useState(2)
  const [countB, setCountB] = useState(1)

  const tiles = TROMINO_SOLUTIONS[missingKey].slice(0, stepCount)
  const [mr, mc] = missingKey.split(',').map(Number)

  const cellOwner = (r, c) => {
    if (r === mr && c === mc) return -1
    return tiles.findIndex(t => t.some(([tr, tc]) => tr === r && tc === c))
  }

  const targetPostage = 23
  const currentPostage = countA * stampA + countB * stampB
  const frob = frobeniusNumber(stampA, stampB)

  return <div className="dm-studio">
    <h3 className="dm-studio-sub">Part A: Inductive 2² × 2² L-Tromino Tiler</h3>
    <p>Watch how the inductive proof tiles a 4 × 4 board with 1 missing square: placing <b>one center-straddling L-tromino</b> gives every 2 × 2 quadrant exactly 1 missing square!</p>
    <div className="qm-buttons">
      <button className={missingKey === '0,0' ? 'qm-primary' : ''} onClick={() => setMissingKey('0,0')}>Missing corner (0, 0)</button>
      <button className={missingKey === '1,2' ? 'qm-primary' : ''} onClick={() => setMissingKey('1,2')}>Missing interior (1, 2)</button>
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} className={stepCount === s ? 'qm-primary' : ''} onClick={() => { setStepCount(s); if (s === 5) onSolve('tiling-board') }}>
          Place {s}/5 Trominoes
        </button>
      ))}
    </div>
    <div className="dm-tromino-grid" role="img" aria-label="4x4 L-tromino board">
      {Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 4 }, (__, c) => {
          const owner = cellOwner(r, c)
          const bg = owner === -1 ? '#222' : owner >= 0 ? TILE_COLORS[owner] : '#f3f1ea'
          const fg = owner === -1 || owner >= 0 ? '#fff' : '#555'
          return <div key={`${r}-${c}`} className="dm-tromino-cell" style={{ background: bg, color: fg }}>
            {owner === -1 ? '✕' : owner >= 0 ? `T${owner + 1}` : `(${r},${c})`}
          </div>
        }),
      )}
    </div>

    <h3 className="dm-studio-sub">Part B: Frobenius Postage Stamp Challenge (4¢ and 7¢)</h3>
    <p>For a = 4¢ and b = 7¢, the largest impossible amount is ab − a − b = 17¢, so every amount ≥ 18¢ is reachable. Form exactly <b>{targetPostage}¢</b>:</p>
    <div className="qm-buttons">
      <button onClick={() => setCountA(c => Math.max(0, c - 1))}>− 4¢ stamp</button>
      <span><b>{countA}</b> × 4¢</span>
      <button onClick={() => setCountA(c => c + 1)}>+ 4¢ stamp</button>
      <button onClick={() => setCountB(c => Math.max(0, c - 1))}>− 7¢ stamp</button>
      <span><b>{countB}</b> × 7¢</span>
      <button onClick={() => setCountB(c => c + 1)}>+ 7¢ stamp</button>
      <button className="qm-primary" onClick={() => { if (currentPostage === targetPostage) onSolve('tiling-stamp') }}>
        Check ({currentPostage}¢ / {targetPostage}¢)
      </button>
    </div>
    {currentPostage === targetPostage && (
      <div className="qm-feedback good" role="status">
        <strong>✓ Exact match!</strong> 4 × {countA} + 7 × {countB} = {targetPostage}¢ (above Frobenius threshold {frob + 1}¢). {solved.includes('tiling-stamp') && 'Challenge recorded!'}
      </div>
    )}
  </div>
}

// ─── 3. Relation Matrix & Poset Architect ──────────────────────────────────
const RELATION_CHALLENGES = [
  {
    id: 'rel-1',
    title: 'Challenge 1: Equivalence Relation with 2 Classes',
    goal: 'Build an equivalence relation (reflexive, symmetric, transitive) on {1, 2, 3} that is NOT the universal relation (at least one 0 off the diagonal).',
    check: (M, p) => p.equivalence && M.some(row => row.some(v => !v)),
    hint: 'Keep the diagonal all 1s, pair {1, 2} together ((1,2)=1 and (2,1)=1), and leave 3 isolated in its own class!',
  },
  {
    id: 'rel-2',
    title: 'Challenge 2: Non-Trivial Partial Order (Poset)',
    goal: 'Build a partial order (reflexive, antisymmetric, transitive) on {1, 2, 3} with at least 2 off-diagonal 1s.',
    check: (M, p) => p.partialOrder && M.flat().filter(Boolean).length >= 5,
    hint: 'Try the upper-triangular matrix for 1 ≤ 2 ≤ 3: diagonal 1s plus (1,2)=1, (2,3)=1, and transitive shortcut (1,3)=1.',
  },
  {
    id: 'rel-3',
    title: 'Challenge 3: Symmetric & Transitive, Yet NOT Reflexive!',
    goal: 'Find the famous counterexample: a relation on {1, 2, 3} that is symmetric and transitive, but NOT reflexive!',
    check: (_, p) => p.symmetric && p.transitive && !p.reflexive,
    hint: 'Leave vertex 3 completely isolated (row 3 and column 3 all 0s) so (3,3) = 0!',
  },
]

function RelationsStudio({ solved, onSolve }) {
  const [cIdx, setCIdx] = useState(0)
  const [M, setM] = useState([
    [1, 1, 0],
    [0, 1, 0],
    [0, 0, 1],
  ])
  const [msg, setMsg] = useState(null)
  const ch = RELATION_CHALLENGES[cIdx]
  const props = relationProps(M)
  const toggle = (r, c) => {
    setM(m => m.map((row, ri) => row.map((v, ci) => (ri === r && ci === c ? (v ? 0 : 1) : v))))
    setMsg(null)
  }

  const verify = () => {
    const ok = ch.check(M, props)
    if (ok) {
      onSolve(ch.id)
      setMsg({ ok: true, text: '✓ Target relation properties satisfied!' })
    } else {
      setMsg({ ok: false, text: `Not yet. Hint: ${ch.hint}` })
    }
  }

  return <div className="dm-studio">
    <div className="qm-buttons">
      {RELATION_CHALLENGES.map((c, i) => (
        <button key={c.id} className={cIdx === i ? 'qm-primary' : ''} onClick={() => { setCIdx(i); setMsg(null) }}>
          {solved.includes(c.id) ? '✓ ' : ''}{c.title}
        </button>
      ))}
    </div>
    <p><b>Goal:</b> {ch.goal}</p>
    <table className="qm-mathcode dm-matrix-table">
      <thead><tr><th>R</th><th>1</th><th>2</th><th>3</th></tr></thead>
      <tbody>
        {M.map((row, r) => (
          <tr key={r}>
            <td><b>{r + 1}</b></td>
            {row.map((val, c) => (
              <td key={c}>
                <button type="button" className={`dm-cell-btn${val ? ' on' : ''}`} onClick={() => toggle(r, c)}>{val}</button>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <div className="dm-prop-pills">
      <span className={`dm-badge ${props.reflexive ? 'ok' : 'no'}`}>Reflexive: {props.reflexive ? 'Yes' : 'No'}</span>
      <span className={`dm-badge ${props.symmetric ? 'ok' : 'no'}`}>Symmetric: {props.symmetric ? 'Yes' : 'No'}</span>
      <span className={`dm-badge ${props.antisymmetric ? 'ok' : 'no'}`}>Antisymmetric: {props.antisymmetric ? 'Yes' : 'No'}</span>
      <span className={`dm-badge ${props.transitive ? 'ok' : 'no'}`}>Transitive: {props.transitive ? 'Yes' : 'No'}</span>
    </div>
    <div className="qm-buttons">
      <button className="qm-primary" onClick={verify}>Check Relation</button>
    </div>
    {msg && <div className={`qm-feedback${msg.ok ? ' good' : ''}`} role="status"><strong>{msg.text}</strong></div>}
  </div>
}

// ─── 4. Lattice Paths & Counting Classifier ────────────────────────────────
const COUNTING_PROBLEMS = [
  {
    id: 'cnt-1',
    prompt: 'A committee of $3$ people (all equal rank) is chosen from $8$ candidates. How many committees are possible?',
    model: 'Unordered without repetition: C(n, k)',
    answer: choose(8, 3), // 56
    explain: 'Order does not matter on an equal-rank committee and no person can be picked twice: $\\binom{8}{3} = 56$.',
  },
  {
    id: 'cnt-2',
    prompt: 'A club of $8$ members elects a President, a Vice-President, and a Treasurer (distinct roles). How many slates are possible?',
    model: 'Ordered without repetition: P(n, k)',
    answer: perm(8, 3), // 336
    explain: 'The $3$ offices are distinct and no member can hold two offices: $P(8, 3) = 8 \\times 7 \\times 6 = 336$.',
  },
  {
    id: 'cnt-3',
    prompt: 'A bakery sells $4$ kinds of donuts. You buy a box of $6$ donuts (repetitions allowed, only counts per flavor matter). How many boxes are possible?',
    model: 'Unordered with repetition (Stars & Bars): C(n+k-1, k-1)',
    answer: starsAndBars(6, 4), // C(9, 3) = 84
    explain: 'Distributing $n = 6$ identical stars (selections) into $k = 4$ flavor bins gives $\\binom{6 + 4 - 1}{4 - 1} = \\binom{9}{3} = 84$.',
  },
  {
    id: 'cnt-4',
    prompt: '$4$ people check their coats; the attendant returns them completely at random. In how many ways does NOBODY receive their own coat?',
    model: 'Derangements: D_n',
    answer: derangements(4), // 9
    explain: 'Permutations of $4$ items with zero fixed points: $D_4 = 4!(1 - 1 + 1/2 - 1/6 + 1/24) = 9$.',
  },
]

function CountingStudio({ solved, onSolve }) {
  const [blocked, setBlocked] = useState([[2, 1]])
  const [pIdx, setPIdx] = useState(0)
  const [val, setVal] = useState('')
  const [feedback, setFeedback] = useState(null)

  const W = 4, H = 3
  const dp = latticePaths(W, H, blocked)
  const toggleBlock = (x, y) => {
    if ((x === 0 && y === 0) || (x === W && y === H)) return
    setBlocked(b => (b.some(([bx, by]) => bx === x && by === y) ? b.filter(([bx, by]) => !(bx === x && by === y)) : [...b, [x, y]]))
  }

  const prob = COUNTING_PROBLEMS[pIdx]
  const checkProb = e => {
    e.preventDefault()
    const { value: n, error } = parseAnswer(val)
    if (error) { setFeedback({ ok: false, text: error }); return }
    if (Math.abs(n - prob.answer) < 1e-6) {
      onSolve(prob.id)
      setFeedback({ ok: true, text: `Right (${prob.answer})! ${prob.explain}` })
    } else {
      setFeedback({ ok: false, text: `Not ${n}. Model hint: use ${prob.model}.` })
    }
  }

  return <div className="dm-studio">
    <h3 className="dm-studio-sub">Part A: Interactive Lattice-Path Obstacle Grid (0, 0) → (4, 3)</h3>
    <p>Click any interior intersection (x, y) to block or unblock it. Every node displays the exact number of monotone E/N paths reaching it:</p>
    <table className="qm-mathcode dm-matrix-table">
      <tbody>
        {Array.from({ length: H + 1 }, (_, ry) => {
          const y = H - ry
          return <tr key={y}>
            <td><b>y = {y}</b></td>
            {Array.from({ length: W + 1 }, (__, x) => {
              const isBlk = blocked.some(([bx, by]) => bx === x && by === y)
              return <td key={x}>
                <button type="button" className={`dm-cell-btn${isBlk ? ' blocked' : ' on'}`} onClick={() => toggleBlock(x, y)}>
                  {isBlk ? '⛔ 0' : dp[y][x]}
                </button>
              </td>
            })}
          </tr>
        })}
      </tbody>
    </table>
    <p className="dm-fig-lead">Total monotone paths from (0, 0) to (4, 3) avoiding obstacles: <b>{dp[H][W]}</b> (Unblocked C(7, 3) = 35).</p>

    <h3 className="dm-studio-sub">Part B: Counting Model Classifier</h3>
    <div className="qm-buttons">
      {COUNTING_PROBLEMS.map((p, i) => (
        <button key={p.id} className={pIdx === i ? 'qm-primary' : ''} onClick={() => { setPIdx(i); setVal(''); setFeedback(null) }}>
          {solved.includes(p.id) ? '✓ ' : ''}Problem {i + 1}
        </button>
      ))}
    </div>
    <div className="qm-md"><Markdown>{prob.prompt}</Markdown></div>
    <form className="qm-buttons" onSubmit={checkProb}>
      <input aria-label="Counting answer" value={val} onChange={e => setVal(e.target.value)} placeholder="Exact integer count" />
      <button className="qm-primary">Verify Count</button>
    </form>
    {feedback && <div className={`qm-feedback${feedback.ok ? ' good' : ''}`} role="status"><Markdown inline>{feedback.text}</Markdown></div>}
  </div>
}

// ─── 5. Modular Lockbreaker & RSA Cipher Cracker ───────────────────────────
const MOD_LEVELS = [
  {
    id: 'mod-1',
    title: 'Vault 1: Modular Inverse Lock',
    prompt: 'Unlock the dial in $\\mathbb{Z}_{26}$: find the unique integer $x \\in \\{0, \\dots, 25\\}$ such that $7x \\equiv 1 \\pmod{26}$.',
    answer: modInverse(7, 26), // 15 (7 * 15 = 105 = 4 * 26 + 1)
    explain: '$7 \\times 15 = 105 = 4 \\times 26 + 1 \\equiv 1 \\pmod{26}$, so $7^{-1} \\bmod 26 = 15$.',
  },
  {
    id: 'mod-2',
    title: 'Vault 2: Chinese Remainder Synchronization',
    prompt: 'Two beacons flash on cycles of $4$ and $9$ seconds. Find the smallest $x \\in \\{0, \\dots, 35\\}$ satisfying $x \\equiv 3 \\pmod 4$ and $x \\equiv 4 \\pmod 9$.',
    answer: crtSolve([3, 4], [4, 9]), // 31
    explain: 'Multiples of $9$ plus $4$ are $4, 13, 22, 31$. Checking mod $4$: $31 = 4(7) + 3 \\equiv 3 \\pmod 4$.',
  },
  {
    id: 'mod-3',
    title: 'Vault 3: Crack Small-Prime RSA',
    prompt: 'You intercept public key $(e = 3, N = 33)$ and ciphertext $C = 14$. Factor $N = 3 \\times 11$, find $d = 3^{-1} \\bmod 20 = 7$, and recover the plaintext $M = C^d \\bmod 33$.',
    answer: modPow(14, 7, 33), // 5 (since 5^3 = 125 = 3*33 + 26? Wait: 14^7 mod 33 = 20)
    explain: 'Here $\\varphi(33) = 2 \\times 10 = 20$ and $d = 7$ ($3 \\times 7 = 21 \\equiv 1 \\pmod{20}$). Then $M = 14^7 \\bmod 33 = 20$ (check: $20^3 = 8000 = 242 \\times 33 + 14 \\equiv 14$).',
  },
]

function ModularStudio({ solved, onSolve }) {
  const [idx, setIdx] = useState(0)
  const [val, setVal] = useState('')
  const [msg, setMsg] = useState(null)
  const lvl = MOD_LEVELS[idx]

  const check = e => {
    e.preventDefault()
    const { value: n, error } = parseAnswer(val)
    if (error) { setMsg({ ok: false, text: error }); return }
    if (Math.abs(n - lvl.answer) < 1e-6) {
      onSolve(lvl.id)
      setMsg({ ok: true, text: `🔓 Vault unlocked (${lvl.answer})! ${lvl.explain}` })
    } else {
      setMsg({ ok: false, text: `Not ${n}. Try testing your candidate directly in the congruence!` })
    }
  }

  return <div className="dm-studio">
    <div className="qm-buttons">
      {MOD_LEVELS.map((l, i) => (
        <button key={l.id} className={idx === i ? 'qm-primary' : ''} onClick={() => { setIdx(i); setVal(''); setMsg(null) }}>
          {solved.includes(l.id) ? '✓ ' : ''}{l.title}
        </button>
      ))}
    </div>
    <div className="qm-md"><Markdown>{lvl.prompt}</Markdown></div>
    <form className="qm-buttons" onSubmit={check}>
      <input aria-label="Vault key" value={val} onChange={e => setVal(e.target.value)} placeholder="Enter integer key" />
      <button className="qm-primary">Test Key</button>
    </form>
    {msg && <div className={`qm-feedback${msg.ok ? ' good' : ''}`} role="status"><Markdown inline>{msg.text}</Markdown></div>}
  </div>
}

// ─── 6. Graph Coloring & Spanning Tree Arena ───────────────────────────────
const COLOR_PALETTE = ['#1f6f68', '#c26a12', '#5b4bb5', '#c0533a']
const COLOR_NAMES = ['Teal (1)', 'Orange (2)', 'Violet (3)', 'Red (4)']

const GRAPH_LEVELS = [
  {
    id: 'gr-c5',
    title: 'Level 1: 5-Cycle C₅ (Chromatic χ = 3)',
    maxColors: 3,
    vertices: ['v1', 'v2', 'v3', 'v4', 'v5'],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]],
  },
  {
    id: 'gr-w4',
    title: 'Level 2: Wheel Graph W₄ (Hub + 4-Cycle, χ = 3)',
    maxColors: 3,
    vertices: ['Hub', 'R1', 'R2', 'R3', 'R4'],
    edges: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 3], [3, 4], [4, 1]],
  },
]

function GraphsStudio({ solved, onSolve }) {
  const [lvlIdx, setLvlIdx] = useState(0)
  const lvl = GRAPH_LEVELS[lvlIdx]
  const [colors, setColors] = useState([0, 1, 0, 1, 0])
  const [msg, setMsg] = useState(null)

  const conflicts = lvl.edges.filter(([u, v]) => colors[u] === colors[v])
  const distinctUsed = new Set(colors.slice(0, lvl.vertices.length)).size
  const validColoring = conflicts.length === 0 && distinctUsed <= lvl.maxColors

  const cycleColor = i => {
    setColors(cs => cs.map((c, k) => (k === i ? (c + 1) % lvl.maxColors : c)))
    setMsg(null)
  }

  return <div className="dm-studio">
    <div className="qm-buttons">
      {GRAPH_LEVELS.map((l, i) => (
        <button key={l.id} className={lvlIdx === i ? 'qm-primary' : ''} onClick={() => { setLvlIdx(i); setMsg(null) }}>
          {solved.includes(l.id) ? '✓ ' : ''}{l.title}
        </button>
      ))}
    </div>
    <p>Click vertices to cycle their color in {`{1, …, ${lvl.maxColors}}`} until <b>zero edges</b> have matching endpoint colors:</p>
    <div className="dm-islander-row">
      {lvl.vertices.map((vName, i) => (
        <button
          key={vName}
          type="button"
          className="dm-vertex-btn"
          style={{ borderColor: COLOR_PALETTE[colors[i]], background: `${COLOR_PALETTE[colors[i]]}18` }}
          onClick={() => cycleColor(i)}
        >
          <strong>{vName}</strong>
          <span style={{ color: COLOR_PALETTE[colors[i]] }}>{COLOR_NAMES[colors[i]]}</span>
        </button>
      ))}
    </div>
    <p>
      Edge conflicts: <b>{conflicts.length}</b>{' '}
      {conflicts.length > 0 && `(${conflicts.map(([u, v]) => `${lvl.vertices[u]}—${lvl.vertices[v]}`).join(', ')})`}
    </p>
    <div className="qm-buttons">
      <button className="qm-primary" onClick={() => {
        if (validColoring) {
          onSolve(lvl.id)
          setMsg({ ok: true, text: `✓ Proper ${distinctUsed}-coloring verified with 0 edge conflicts!` })
        } else {
          setMsg({ ok: false, text: `Still ${conflicts.length} conflicting edge(s) where adjacent vertices share a color.` })
        }
      }}>Verify Proper Coloring</button>
    </div>
    {msg && <div className={`qm-feedback${msg.ok ? ' good' : ''}`} role="status"><strong>{msg.text}</strong></div>}
  </div>
}

// ─── 7. DFA State Machine Architect ────────────────────────────────────────
const DFA_CHALLENGES = [
  {
    id: 'dfa-odd1',
    title: 'DFA 1: Odd Number of 1s',
    desc: 'Wire the transition table on states {q0 (start), q1} and choose which states are accepting so the DFA accepts a binary string w iff w contains an ODD number of 1s.',
    states: ['q0', 'q1'],
    tests: [
      { w: '', expected: false },
      { w: '1', expected: true },
      { w: '0', expected: false },
      { w: '101', expected: false },
      { w: '1011', expected: true },
      { w: '0010', expected: true },
    ],
  },
  {
    id: 'dfa-ends0',
    title: 'DFA 2: Strings Ending in 0',
    desc: 'Wire {q0 (start), q1} so the DFA accepts w ∈ {0, 1}* iff the last character of w is 0 (note: empty string ε is rejected).',
    states: ['q0', 'q1'],
    tests: [
      { w: '', expected: false },
      { w: '0', expected: true },
      { w: '1', expected: false },
      { w: '10', expected: true },
      { w: '101', expected: false },
      { w: '1100', expected: true },
    ],
  },
]

function AutomataStudio({ solved, onSolve }) {
  const [cIdx, setCIdx] = useState(0)
  const [trans, setTrans] = useState({
    q0: { 0: 'q0', 1: 'q1' },
    q1: { 0: 'q1', 1: 'q0' },
  })
  const [accept, setAccept] = useState(['q1'])
  const ch = DFA_CHALLENGES[cIdx]

  const flipTarget = (q, bit) => {
    setTrans(t => ({
      ...t,
      [q]: { ...t[q], [bit]: t[q][bit] === 'q0' ? 'q1' : 'q0' },
    }))
  }
  const toggleAccept = q => {
    setAccept(a => (a.includes(q) ? a.filter(s => s !== q) : [...a, q]))
  }

  const results = ch.tests.map(tc => {
    const out = runDfa(trans, 'q0', accept, tc.w)
    return { ...tc, actual: out.accepted, pass: out.accepted === tc.expected, trace: out.trace }
  })
  const allPass = results.every(r => r.pass)

  return <div className="dm-studio">
    <div className="qm-buttons">
      {DFA_CHALLENGES.map((c, i) => (
        <button key={c.id} className={cIdx === i ? 'qm-primary' : ''} onClick={() => setCIdx(i)}>
          {solved.includes(c.id) ? '✓ ' : ''}{c.title}
        </button>
      ))}
    </div>
    <p>{ch.desc}</p>
    <table className="qm-mathcode dm-matrix-table">
      <thead><tr><th>State</th><th>On input 0</th><th>On input 1</th><th>Accepting (∈ F)?</th></tr></thead>
      <tbody>
        {ch.states.map(q => (
          <tr key={q}>
            <td><b>{q}{q === 'q0' ? ' (start)' : ''}</b></td>
            <td><button type="button" className="dm-cell-btn on" onClick={() => flipTarget(q, 0)}>→ {trans[q][0]}</button></td>
            <td><button type="button" className="dm-cell-btn on" onClick={() => flipTarget(q, 1)}>→ {trans[q][1]}</button></td>
            <td><button type="button" className={`dm-cell-btn${accept.includes(q) ? ' on' : ''}`} onClick={() => toggleAccept(q)}>
              {accept.includes(q) ? '✓ Accept' : 'Reject'}
            </button></td>
          </tr>
        ))}
      </tbody>
    </table>
    <table className="qm-mathcode dm-worked-table">
      <thead><tr><th>Test string w</th><th>State trace</th><th>Expected</th><th>DFA Output</th><th>Status</th></tr></thead>
      <tbody>
        {results.map((r, i) => (
          <tr key={i}>
            <td className="mono">{r.w === '' ? 'ε (empty)' : `"${r.w}"`}</td>
            <td className="mono">{r.trace.join(' → ')}</td>
            <td>{r.expected ? 'Accept' : 'Reject'}</td>
            <td>{r.actual ? 'Accept' : 'Reject'}</td>
            <td style={{ color: r.pass ? '#1f6f68' : '#c0533a' }}><b>{r.pass ? '✓ Pass' : '✗ Fail'}</b></td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="qm-buttons">
      <button className="qm-primary" onClick={() => { if (allPass) onSolve(ch.id) }}>
        {allPass ? '✓ All 6 test strings passed! Record solution' : 'Adjust transitions until all 6 tests pass'}
      </button>
    </div>
  </div>
}

// ─── 8. Infinite Practice & Mastery Drill Generator ────────────────────────
function buildDrillQuestion(topic, seed) {
  const pick = (arr, offset = 0) => arr[(seed + offset) % arr.length]
  const topics = ['logic', 'proofs', 'sets', 'combinatorics', 'numtheory', 'recurrences', 'graphs', 'probability']
  const cat = topic === 'all' ? pick(topics) : topic

  if (cat === 'logic') {
    const nVars = pick([2, 3, 4])
    const totalRows = 2 ** nVars
    const kTrue = (seed % (totalRows - 1)) + 1
    return {
      topic: 'Part 1 · Logic',
      prompt: `A compound proposition in $${nVars}$ variables has a truth table where $${kTrue}$ rows evaluate to $\\text{T}$. How many rows evaluate to $\\text{T}$ in its negation $\\neg P$?`,
      answer: totalRows - kTrue,
      hint: `A truth table in ${nVars} variables has 2^${nVars} = ${totalRows} rows total, and ¬P flips every row.`,
      explain: `There are $2^{${nVars}} = ${totalRows}$ total rows, so $\\neg P$ is true on $${totalRows} - ${kTrue} = ${totalRows - kTrue}$ rows.`,
    }
  }
  if (cat === 'proofs') {
    const n = pick([6, 8, 10, 12, 15])
    const ans = (n * (n + 1)) / 2
    return {
      topic: 'Part 2 · Induction & Sums',
      prompt: `Compute the Gauss sum $\\sum_{i=1}^{${n}} i = 1 + 2 + \\dots + ${n}$.`,
      answer: ans,
      hint: 'Use the inductive closed form n(n + 1) / 2.',
      explain: `$\\sum_{i=1}^{${n}} i = \\frac{${n} \\times ${n + 1}}{2} = ${ans}$.`,
    }
  }
  if (cat === 'sets') {
    const n = pick([3, 4, 5, 6, 7])
    const ans = 2 ** n - 1
    return {
      topic: 'Part 3 · Sets & Relations',
      prompt: `How many **non-empty** subsets does a set $A$ with $|A| = ${n}$ elements have?`,
      answer: ans,
      hint: `The power set P(A) has 2^${n} subsets in total, and only ∅ is empty.`,
      explain: `$|\\mathcal{P}(A)| - 1 = 2^{${n}} - 1 = ${2 ** n} - 1 = ${ans}$.`,
    }
  }
  if (cat === 'combinatorics') {
    const n = pick([6, 7, 8, 9])
    const k = pick([2, 3], 1)
    const ans = choose(n, k)
    return {
      topic: 'Part 4 · Combinatorics',
      prompt: `How many unordered $${k}$-element subsets can be chosen from a set of $${n}$ distinct items, $\\binom{${n}}{${k}}$?`,
      answer: ans,
      hint: `Compute ${n}! / (${k}! (${n - k})!).`,
      explain: `$\\binom{${n}}{${k}} = ${ans}$.`,
    }
  }
  if (cat === 'numtheory') {
    const pairs = [[24, 36], [42, 56], [45, 75], [35, 49], [17, 51], [27, 63]]
    const [a, b] = pick(pairs)
    const ans = gcd(a, b)
    return {
      topic: 'Part 5 · Number Theory',
      prompt: `Compute $\\gcd(${a}, ${b})$ using the Euclidean Algorithm.`,
      answer: ans,
      hint: `Repeatedly replace (a, b) with (b, a mod b) until the remainder is 0.`,
      explain: `By the Euclidean Algorithm, $\\gcd(${a}, ${b}) = ${ans}$.`,
    }
  }
  if (cat === 'recurrences') {
    const k = pick([3, 4, 5, 6])
    const isHanoi = seed % 2 === 0
    const ans = isHanoi ? hanoiMoves(k) : catalan(k)
    return isHanoi
      ? {
          topic: 'Part 6 · Recurrences',
          prompt: `What is the minimum number of moves $H_{${k}} = 2^{${k}} - 1$ required to solve the Tower of Hanoi puzzle with $${k}$ disks?`,
          answer: ans,
          hint: `Compute 2^${k} − 1.`,
          explain: `$H_{${k}} = 2^{${k}} - 1 = ${ans}$.`,
        }
      : {
          topic: 'Part 6 · Generating Functions',
          prompt: `Compute the Catalan number $C_{${k}} = \\frac{1}{${k} + 1}\\binom{${2 * k}}{${k}}$.`,
          answer: ans,
          hint: `First compute C(${2 * k}, ${k}) = ${choose(2 * k, k)}, then divide by ${k + 1}.`,
          explain: `$C_{${k}} = \\frac{1}{${k + 1}}\\binom{${2 * k}}{${k}} = \\frac{${choose(2 * k, k)}}{${k + 1}} = ${ans}$.`,
        }
  }
  if (cat === 'graphs') {
    const n = pick([4, 5, 6, 7, 8])
    const isComplete = seed % 2 === 0
    const ans = isComplete ? completeEdges(n) : cayleyTrees(Math.min(n, 5))
    const vCount = isComplete ? n : Math.min(n, 5)
    return isComplete
      ? {
          topic: 'Part 7 · Graph Theory',
          prompt: `How many edges does the complete graph $K_{${vCount}}$ on $${vCount}$ vertices have?`,
          answer: ans,
          hint: `Every pair of distinct vertices is connected: C(${vCount}, 2) = ${vCount}(${vCount}-1)/2.`,
          explain: `$|E(K_{${vCount}})| = \\binom{${vCount}}{2} = \\frac{${vCount} \\times ${vCount - 1}}{2} = ${ans}$.`,
        }
      : {
          topic: 'Part 7 · Trees',
          prompt: `By Cayley’s Formula $n^{n-2}$, how many labeled trees exist on $n = ${vCount}$ labeled vertices?`,
          answer: ans,
          hint: `Compute ${vCount}^(${vCount} − 2).`,
          explain: `By Cayley’s Formula, $n^{n-2} = ${vCount}^{${vCount - 2}} = ${ans}$.`,
        }
  }
  // probability
  const n = pick([4, 5, 6, 8, 10])
  return {
    topic: 'Part 8 · Discrete Probability',
    prompt: `In a uniformly random permutation of $${n}$ distinct items, what is the expected number of fixed points $E[X]$?`,
    answer: 1,
    hint: `By Linearity of Expectation, E[X] = ∑_{i=1}^n P(π(i) = i) = n × (1/n).`,
    explain: `For every $n \\ge 1$, $E[X] = \\sum_{i=1}^{${n}} \\frac{1}{${n}} = 1$.`,
  }
}

function PracticeDrillStudio({ onSolve }) {
  const [topic, setTopic] = useState('all')
  const [seed, setSeed] = useState(1)
  const [streak, setStreak] = useState(0)
  const [val, setVal] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [status, setStatus] = useState(null)

  const q = buildDrillQuestion(topic, seed)

  const check = e => {
    e.preventDefault()
    const { value: n, error } = parseAnswer(val)
    if (error) { setStatus({ ok: false, text: error }); return }
    if (Math.abs(n - q.answer) <= 1e-5) {
      const nextStreak = streak + 1
      setStreak(nextStreak)
      setStatus({ ok: true, text: `✓ Correct (${q.answer})! ${q.explain}` })
      onSolve(`drill-${seed}`)
    } else {
      setStreak(0)
      setStatus({ ok: false, text: `Not ${n}. Try clicking “Show Hint” below.` })
    }
  }

  const nextQuestion = () => {
    setSeed(s => s + 1)
    setVal('')
    setShowHint(false)
    setStatus(null)
  }

  return <div className="dm-studio">
    <div className="qm-fig-controls">
      <label>Topic filter{' '}
        <select value={topic} onChange={e => { setTopic(e.target.value); nextQuestion() }}>
          <option value="all">All 8 Parts (Mixed Mastery)</option>
          <option value="logic">Part 1: Logic & Truth Tables</option>
          <option value="proofs">Part 2: Proofs & Induction</option>
          <option value="sets">Part 3: Sets, Functions & Relations</option>
          <option value="combinatorics">Part 4: Combinatorics</option>
          <option value="numtheory">Part 5: Number Theory & Crypto</option>
          <option value="recurrences">Part 6: Recurrences & Generating Fns</option>
          <option value="graphs">Part 7: Graph Theory & Trees</option>
          <option value="probability">Part 8: Probability & Automata</option>
        </select>
      </label>
      <span className="dm-proof-badge">🔥 Streak: {streak}</span>
    </div>
    <div className="qm-check">
      <span className="qm-eyebrow">{q.topic} · Question #{seed}</span>
      <div className="qm-md"><Markdown>{q.prompt}</Markdown></div>
      <form className="qm-buttons" onSubmit={check}>
        <input aria-label="Drill answer" value={val} onChange={e => setVal(e.target.value)} placeholder="Your numerical answer" />
        <button className="qm-primary">Check Answer</button>
        <button type="button" className="qm-quiet" onClick={() => setShowHint(h => !h)}>{showHint ? 'Hide Hint' : 'Show Hint'}</button>
        <button type="button" onClick={nextQuestion}>Next Problem →</button>
      </form>
      {showHint && <p className="qm-hint">{q.hint}</p>}
      {status && <div className={`qm-feedback${status.ok ? ' good' : ''}`} role="status"><Markdown inline>{status.text}</Markdown></div>}
    </div>
  </div>
}

export default function PuzzlesTab({ activePuzzle = 'knights', onSelectPuzzle, solvedPuzzles = [], onSolvePuzzle }) {
  const cur = PUZZLES.find(p => p.id === activePuzzle) ?? PUZZLES[0]
  return <article className="qm-lesson dm-puzzles-tab">
    <header>
      <p className="qm-eyebrow">Puzzles, Proofs & Mastery Challenges</p>
      <h1>Playable Discrete Math Workbench</h1>
      <p>Choose an interactive mathematical studio below or launch the Infinite Practice Generator to test your intuition across all 8 parts.</p>
    </header>
    <div className="dm-puzzle-nav" role="tablist" aria-label="Puzzle studios">
      {PUZZLES.map(p => (
        <button
          key={p.id}
          role="tab"
          aria-selected={cur.id === p.id}
          className={`dm-puzzle-card${cur.id === p.id ? ' active' : ''}`}
          onClick={() => onSelectPuzzle?.(p.id)}
        >
          <span className="dm-puzzle-icon">{p.icon}</span>
          <div>
            <strong>{p.title}</strong>
            <small>{p.topic}</small>
          </div>
        </button>
      ))}
    </div>
    <section className="dm-puzzle-stage" aria-label={cur.title}>
      <h2 className="qm-h">{cur.icon} {cur.title}</h2>
      {cur.id === 'knights' && <KnightsStudio solved={solvedPuzzles} onSolve={onSolvePuzzle} />}
      {cur.id === 'tiling' && <TilingStudio solved={solvedPuzzles} onSolve={onSolvePuzzle} />}
      {cur.id === 'relations' && <RelationsStudio solved={solvedPuzzles} onSolve={onSolvePuzzle} />}
      {cur.id === 'counting' && <CountingStudio solved={solvedPuzzles} onSolve={onSolvePuzzle} />}
      {cur.id === 'modular' && <ModularStudio solved={solvedPuzzles} onSolve={onSolvePuzzle} />}
      {cur.id === 'graphs' && <GraphsStudio solved={solvedPuzzles} onSolve={onSolvePuzzle} />}
      {cur.id === 'automata' && <AutomataStudio solved={solvedPuzzles} onSolve={onSolvePuzzle} />}
      {cur.id === 'practice' && <PracticeDrillStudio onSolve={onSolvePuzzle} />}
    </section>
  </article>
}
