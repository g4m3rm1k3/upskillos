import React, { useMemo, useState } from 'react'
import MazeView from '../MazeView.jsx'
import Stepper from '../Stepper.jsx'
import { traceNudge } from '../traces-part4.js'
import { PIECES } from '../python/pieces.js'
import { SEVEN, parseMap, buildTable, sweepValues, sealIslands, openCells, unkey, stepsToGoal, makeRng } from '../world.js'
import { oneHot, predict, nudge, tableFeatures, coordFeatures } from '../world-part4.js'
import { norm } from '../runtime/checks.js'

const r4 = x => Number(x.toFixed(4))
const BIG = sealIslands(SEVEN)
const BIG_MAZE = parseMap(BIG)
const V = sweepValues(buildTable(BIG_MAZE, 0), 0.9)[0]
const SQUARES = openCells(BIG_MAZE).filter(s => s !== BIG_MAZE.goal)
const STEPS = stepsToGoal(BIG_MAZE)
export const FEATURES = {
  table: { label: 'a table (one-hot)', f: tableFeatures(BIG), about: 'one weight per square: 30 numbers per move' },
  coords: { label: 'row and column', f: coordFeatures(BIG), about: '(row, column, 1): 3 numbers for the whole map' },
  steps: { label: 'moves to the cheese', f: s => [STEPS[s] / 14, 1], about: '(moves to the cheese, 1): 2 numbers, but it needs to know the maze' },
}
// Fit the planner's worths with nudges, from all squares or only the left half (columns 0–3).
export function fit(name, half, passes = 400) {
  const { f } = FEATURES[name]
  const seen = half ? SQUARES.filter(s => unkey(s)[1] <= 3) : SQUARES
  let w = Array(f(SQUARES[0]).length).fill(0)
  for (let p = 0; p < passes; p++) for (const s of seen) w = nudge(w, f(s), V[s], 0.1)
  const err = ss => (ss.length ? Math.sqrt(ss.reduce((a, s) => a + (predict(w, f(s)) - V[s]) ** 2, 0) / ss.length) : 0)
  return { w, seen, seenErr: err(seen), unseenErr: err(SQUARES.filter(s => !seen.includes(s))), pred: Object.fromEntries(SQUARES.map(s => [s, predict(w, f(s))])) }
}

// ---------------------------------------------------------------- pictures
function WeightsPicture({ frame }) {
  const { w, f, parts, changed } = frame.pic
  return (
    <table className="mlf-table"><thead><tr><th>i</th><th>weight w[i]</th><th>feature f[i]</th><th>w[i] × f[i]</th></tr></thead>
      <tbody>{w.map((wi, i) => <tr key={i} className={changed && f[i] !== 0 ? 'changed' : ''}><td>{i}</td><td>{r4(wi)}</td><td>{f[i]}</td><td>{r4(parts[i])}</td></tr>)}</tbody></table>
  )
}

export function FormulaFit() {
  const [name, setName] = useState('coords')
  const [half, setHalf] = useState(true)
  const r = useMemo(() => fit(name, half), [name, half])
  return (
    <div className="mlf-explorer">
      <div className="mlf-controls">
        <div><span className="mlf-eyebrow">features</span><div className="mlf-chips">{Object.entries(FEATURES).map(([k, v]) => <button key={k} type="button" className={`mlf-chip${k === name ? ' on' : ''}`} aria-pressed={k === name} onClick={() => setName(k)}>{v.label}</button>)}</div></div>
        <label className="mlf-toggle"><input type="checkbox" checked={half} onChange={e => setHalf(e.target.checked)} /> learn only from the left half (columns 0–3)</label>
      </div>
      <p className="mlf-muted">{FEATURES[name].about}. Fitted with nudges (alpha 0.1, 400 passes) to the planner's worths (g = 0.9).</p>
      <div className="mlf-two">
        <div><p className="mlf-eyebrow">the formula's prediction</p><MazeView maze={BIG_MAZE} size={40} heat={r.pred} heatRange={[-0.6, 1]} labels={Object.fromEntries(Object.entries(r.pred).map(([s, v]) => [s, v.toFixed(2)]))} marks={half ? Object.fromEntries(SQUARES.filter(s => !r.seen.includes(s)).map(s => [s, 'dim'])) : {}} /></div>
        <div><p className="mlf-eyebrow">the true worths</p><MazeView maze={BIG_MAZE} size={40} heat={V} heatRange={[-0.6, 1]} labels={Object.fromEntries(Object.entries(V).map(([s, v]) => [s, v.toFixed(2)]))} /></div>
      </div>
      <p className="mlf-total">typical error where it learned: <strong>{r4(r.seenErr)}</strong>{half && <> · on squares it never saw: <strong>{r4(r.unseenErr)}</strong></>}</p>
    </div>
  )
}

// ---------------------------------------------------------------- Try it first
const T = fit('table', true), C = fit('coords', true), S = fit('steps', true)
export const TRY_FORMULAS = {
  lead: 'Your learner keeps one guess per square and move: a **table**. It learns nothing about a square until it visits it, even if that square is right next to ones it knows well. Part 4 replaces the table with a **formula**: a few numbers (weights) that give a guess for *every* square, visited or not.',
  steps: [
    { predict: {
      id: 'formulas-try-predict',
      teach: '**A linear formula.** Describe each square by a few numbers, its **features** `f`. The formula has one weight per feature and predicts **w[0]·f[0] + w[1]·f[1] + ...**: each weight times its feature, added up.',
      prompt: 'Weights w = [0.5, −0.2, 0.1] and a square\'s features f = [1, 2, 4]. What does the formula predict?',
      answer: r4(0.5 * 1 - 0.2 * 2 + 0.1 * 4), tolerance: 1e-6,
      misconceptions: [{ answer: 0.4, tolerance: 1e-6, feedback: '0.4 adds up the weights alone. Each weight is multiplied by its feature first.' }],
      explain: '0.5 × 1 + (−0.2) × 2 + 0.1 × 4 = 0.5 − 0.4 + 0.4 = 0.5. A big feature makes its weight count for more.',
    } },
    { choice: {
      id: 'formulas-try-onehot',
      teach: '**One-hot features.** List the squares in order. A square\'s features are all 0, except a 1 in its own position: square number 2 of 5 is [0, 0, 1, 0, 0].',
      prompt: 'With one-hot features, what does the formula predict for square number 2?',
      options: [
        { text: 'The sum of all the weights', why: 'Every feature except one is 0, so every other weight is multiplied by 0.' },
        { text: 'Exactly w[2]: its own weight, untouched by the others', why: 'So a one-hot formula **is** a table, with one entry (weight) per square. Tables are the special case of formulas where nothing is shared.' },
        { text: '1', why: 'The feature is 1; the prediction is the weight times 1.' },
      ],
      answer: 1,
    } },
    { predict: {
      id: 'formulas-try-nudge',
      teach: '**Nudging a formula toward a target.** error = target − prediction. Then every weight moves by **alpha × error × its feature**. With one-hot features, only the one weight whose feature is 1 moves, and it moves by alpha × error: exactly lesson 9\'s update_mean.',
      prompt: 'One-hot features [0, 1, 0]; weights [0.2, 0.5, −0.1]; target 0.9; alpha 0.5. What does w[1] become?',
      answer: r4(0.5 + 0.5 * (0.9 - 0.5)), tolerance: 1e-6,
      misconceptions: [{ answer: 0.9, tolerance: 1e-6, feedback: 'With alpha = 0.5 it moves only half way to the target.' }],
      explain: 'prediction = 0.5 (only w[1] counts); error = 0.9 − 0.5 = 0.4; w[1] = 0.5 + 0.5 × 0.4 × 1 = 0.7. The other two weights have feature 0, so they don\'t move.',
    } },
    { md: 'Now real features on the 7 × 7 maze. The formulas below learned the worths from **only the left half** of the maze (the dimmed squares were never seen).' },
    { figure: FormulaFit },
    { choice: {
      id: 'formulas-try-generalise',
      teach: `Measured: learning from the left half only, the **table** is exact where it learned but misses by ${r4(T.unseenErr)} on the squares it never saw: it guesses 0 there, its starting value. **Row and column** (3 weights) are rougher where they learned (${r4(C.seenErr)}), but miss by only ${r4(C.unseenErr)} on unseen squares.`,
      prompt: 'Why can the formula guess squares it has never seen, and the table can\'t?',
      options: [
        { text: 'The formula is more accurate everywhere.', why: `It isn't: where they both learned, the table is exact and the formula is off by ${r4(C.seenErr)}.` },
        { text: 'Its weights are shared by every square. Learning from one square moves weights that every other square uses too, so what it learns **generalises**. A table entry belongs to one square only.', why: 'Sharing is the whole point of a formula. The price is that a few shared weights can\'t fit everything exactly, especially in a twisty maze.' },
        { text: 'It cheats by reading the map.', why: 'It only sees each square\'s features: its row and column. Nothing about walls.' },
      ],
      answer: 1,
    } },
  ],
}

// ---------------------------------------------------------------- Watch it run
function WatchNudge() {
  const [which, setWhich] = useState('coords')
  const cases = {
    onehot: { w: [0.2, 0.5, -0.1, 0.3], f: [0, 1, 0, 0], target: 0.9 },
    coords: { w: [0.4, 0.3, -0.2], f: [0.5, 0.75, 1], target: 0.6 },
  }
  const c = cases[which]
  const { frames } = useMemo(() => traceNudge(c.w, c.f, c.target, 0.5), [which]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="mlf-watch">
      <h3>predict and nudge: one correction of a formula</h3>
      <div className="mlf-chips">{[['onehot', 'one-hot features (a table)'], ['coords', 'row and column features']].map(([k, l]) => <button key={k} type="button" className={`mlf-chip${k === which ? ' on' : ''}`} aria-pressed={k === which} onClick={() => setWhich(k)}>{l}</button>)}</div>
      <Stepper code={`${PIECES.predict.code}\n\n${PIECES.nudge.code}`} frames={frames} Picture={WeightsPicture} title="Step through predict and nudge" />
    </div>
  )
}

function WatchFit() {
  return (
    <div className="mlf-watch">
      <h3>Which features?</h3>
      <p>Try each set of features, with and without the half-maze. Compare the error on squares it learned from with the error on squares it never saw.</p>
      <FormulaFit />
      <p className="mlf-muted">{`Measured, learning from the left half: table ${r4(T.seenErr)} / ${r4(T.unseenErr)}, row and column ${r4(C.seenErr)} / ${r4(C.unseenErr)}, moves to the cheese ${r4(S.seenErr)} / ${r4(S.unseenErr)} (seen / never seen). One good feature beats many weights.`}</p>
    </div>
  )
}

export const WATCH_FORMULAS = [WatchNudge, WatchFit]

// ---------------------------------------------------------------- Understand
export const UNDERSTAND_FORMULAS = [
  { h: 'A formula in place of a table' },
  { md: `Describe a square $s$ by a feature vector $\\phi(s) = (\\phi_1, \\dots, \\phi_k)$, and keep a weight vector $w$. The guess is the **dot product**

$$\\hat V(s) = w \\cdot \\phi(s) = \\sum_i w_i \\phi_i(s)$$

A table is the special case $\\phi(s)$ = one-hot: $k$ equals the number of squares, and each weight belongs to one square. With fewer features than squares, weights are **shared**, so learning about one square changes the guesses for others. That sharing is **generalisation**, for better or worse.` },
  { code: { piece: 'predict', notes: [
    ['return sum(wi * fi for wi, fi in zip(w, features))', '`zip` walks the two lists side by side; the generator multiplies each pair; `sum` adds them. The dot product, in one line.'],
  ] } },
  { code: { piece: 'nudge', notes: [
    ['error = target - predict(w, features)', 'The surprise, exactly as in lessons 9 and 10.'],
    ['return [wi + alpha * error * fi for wi, fi in zip(w, features)]', 'Each weight moves in proportion to its feature: weights that contributed more to the mistake are corrected more. A **new** list is returned; `w` itself is unchanged.'],
  ] } },
  { mathCode: [
    ['\\phi(s)', 'features(s)', 'the numbers describing a square'],
    ['w \\cdot \\phi(s)', 'predict(w, features)', 'the guess for that square'],
    ['\\delta = y - w\\cdot\\phi', 'error', 'how wrong the guess is'],
    ['w_i \\leftarrow w_i + \\alpha\\,\\delta\\,\\phi_i', 'nudge(w, features, target, alpha)', 'the correction (the delta rule)'],
  ] },
  { predict: {
    id: 'formulas-u-nudge',
    teach: 'nudge: error = target − predict(w, f); then w[i] + alpha × error × f[i] for every i.',
    prompt: 'w = [0.4, 0.3, −0.2], features [0.5, 0.75, 1], target 0.6, alpha 0.5. What does w[0] become?',
    answer: r4(0.4 + 0.5 * (0.6 - (0.4 * 0.5 + 0.3 * 0.75 - 0.2)) * 0.5), tolerance: 1e-4,
    explain: `prediction = 0.2 + 0.225 − 0.2 = 0.225; error = 0.6 − 0.225 = 0.375; w[0] = 0.4 + 0.5 × 0.375 × 0.5 = ${r4(0.4 + 0.5 * 0.375 * 0.5)}.`,
  } },
  { choice: {
    id: 'formulas-u-why-feature',
    teach: 'The update moves weight i by alpha × error × feature i.',
    prompt: 'Why multiply by the feature?',
    options: [
      { text: 'To make the numbers smaller', why: 'Features can be bigger than 1. The reason is blame.' },
      { text: 'A weight whose feature is 0 had no effect on this prediction, so it shouldn\'t be changed by this mistake; a weight with a large feature had a large effect, so it gets a large correction.', why: 'It is also exactly the slope of the squared error with respect to that weight. Lesson 13 shows why that makes it the steepest way downhill.' },
      { text: 'It doesn\'t matter', why: 'Without it, one-hot nudges would change every square\'s weight for one square\'s mistake. Bug hunt below.' },
    ],
    answer: 1,
  } },
  { note: 'This is **linear function approximation**, and the update is the **delta rule** (or LMS). Choosing features by hand is **feature engineering**: it works when you know which features matter ("moves to the cheese" fits almost perfectly, but you need the map to compute it). A neural network (lesson 14) learns its own features from the raw input, which is why deep RL can learn from pixels.', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const pCase = (w, f) => ({ call: `predict(${JSON.stringify(w)}, ${JSON.stringify(f)})`, expected: norm(predict(w, f)) })
const nCase = (w, f, t, a, why) => ({ call: `nudge(${JSON.stringify(w)}, ${JSON.stringify(f)}, ${t}, ${a})`, expected: norm(nudge(w, f, t, a)), why })
const rng = makeRng(61)
const RW = Array.from({ length: 5 }, () => r4(rng.random() * 2 - 1)), RF = Array.from({ length: 5 }, () => r4(rng.random() * 3))

export const CHALLENGES_FORMULAS = [
  {
    id: 'formulas-onehot', piece: 'one_hot', title: 'Write one_hot', kind: 'write', uses: ['parse_map'],
    prompt: '`one_hot(state, states)` returns a list as long as `states`: 1.0 where `states[i] == state`, 0.0 everywhere else.',
    starter: `def one_hot(state, states):
    return []
`,
    solution: PIECES.one_hot.code,
    runCalls: ['one_hot("b", ["a", "b", "c"])', 'one_hot((1, 0), [(0, 0), (0, 1), (1, 0)])'],
    cases: [
      { call: 'one_hot("b", ["a", "b", "c"])', expected: [0, 1, 0] },
      { call: 'one_hot((1, 0), [(0, 0), (0, 1), (1, 0)])', expected: [0, 0, 1] },
      { call: 'one_hot("z", ["a", "b"])', expected: [0, 0], why: 'not in the list' },
      { call: 'len(one_hot((2, 2), [c for c, ch in parse_map(SEVEN)["cells"].items() if ch != "#"]))', expected: openCells(parseMap(SEVEN)).length, why: 'one per open square' },
    ],
    hints: ['Go through `states` in order; each entry is 1.0 or 0.0.', 'A list comprehension: `[1.0 if s == state else 0.0 for s in states]`.'],
  },
  {
    id: 'formulas-predict', piece: 'predict', title: 'Write predict', kind: 'write', uses: [],
    prompt: '`predict(w, features)` returns the dot product: each weight times the feature in the same position, added up.',
    starter: `def predict(w, features):
    total = 0.0
    return total
`,
    solution: PIECES.predict.code,
    runCalls: ['predict([0.5, -0.2, 0.1], [1, 2, 3])', 'list(zip([0.5, -0.2], [1, 2]))'],
    cases: [pCase([0.5, -0.2, 0.1], [1, 2, 3]), pCase([0.2, 0.5, -0.1, 0.3], [0, 1, 0, 0]), pCase(RW, RF), pCase([1], [0])],
    hints: ['`zip(w, features)` gives `(wi, fi)` pairs.', '`sum(wi * fi for wi, fi in zip(w, features))`.'],
  },
  {
    id: 'formulas-nudge', piece: 'nudge', title: 'Write nudge', kind: 'write', uses: ['predict'],
    prompt: '`nudge(w, features, target, alpha)` returns a **new** list of weights: error = target − predict(w, features), and each weight becomes `wi + alpha * error * fi`.',
    starter: `def nudge(w, features, target, alpha):
    error = target - predict(w, features)
    return list(w)
`,
    solution: PIECES.nudge.code,
    runCalls: ['nudge([0.2, 0.5, -0.1], [0, 1, 0], 0.9, 0.5)', 'nudge([0.4, 0.3, -0.2], [0.5, 0.75, 1], 0.6, 0.5)'],
    cases: [nCase([0.2, 0.5, -0.1], [0, 1, 0], 0.9, 0.5, 'one-hot: a table'), nCase([0.4, 0.3, -0.2], [0.5, 0.75, 1], 0.6, 0.5), nCase(RW, RF, -0.3, 0.05, 'random'), nCase([0, 0], [1, 1], 1, 1)],
    hints: ['A list comprehension over `zip(w, features)`.', '`[wi + alpha * error * fi for wi, fi in zip(w, features)]`.'],
  },
  {
    id: 'formulas-fix-blame', piece: null, title: 'Bug hunt: the table that changed every square', kind: 'fix', uses: ['predict'],
    prompt: 'With one-hot features this `nudge` should change one weight, the one for the square that was wrong. It changes all of them. Run the preset.',
    starter: PIECES.nudge.code.replace('wi + alpha * error * fi', 'wi + alpha * error') + '\n',
    solution: PIECES.nudge.code,
    compare: 'Without `* fi`, every weight takes the same correction, whether its feature took part or not. With one-hot features that means one square\'s mistake changes every square\'s guess, the opposite of a table. Multiplying by the feature gives the blame to the weights that caused the prediction.',
    runCalls: ['nudge([0.2, 0.5, -0.1], [0, 1, 0], 0.9, 0.5)'],
    cases: [nCase([0.2, 0.5, -0.1], [0, 1, 0], 0.9, 0.5), nCase([0.4, 0.3, -0.2], [0.5, 0.75, 1], 0.6, 0.5), nCase(RW, RF, -0.3, 0.05)],
    hints: ['Which weights should move when the features are [0, 1, 0]?', 'Each weight\'s correction must be multiplied by its own feature.'],
  },
]

export const KEEP_FORMULAS = {
  pieces: ['one_hot', 'predict', 'nudge'],
  card: `**one_hot(state, states)** → features that make a formula into a table.

**predict(w, features)** → $w \\cdot \\phi$: each weight times its feature, added up.

**nudge(w, features, target, alpha)** → new weights, each moved by alpha × error × its feature.`,
  remember: [
    'A table is a formula with one-hot features: nothing is shared.',
    'Shared weights generalise: learning about one square changes the guesses for others.',
    'The price: a few weights can\'t fit a twisty map exactly. A good feature (moves to the cheese) beats many weights.',
    'The nudge gives each weight blame in proportion to its feature.',
  ],
  ml: [['features', 'feature vector, $\\phi(s)$', 'numbers describing a state'], ['the formula', 'linear function approximation', 'a weighted sum of features'], ['the nudge', 'delta rule / LMS', 'which lesson 13 shows is gradient descent'], ['guessing unseen squares', 'generalisation', 'the reason to use a formula']],
  next: 'Lesson 13: why is the nudge "alpha × error × feature"? Because it walks downhill on the error. Slopes and gradient descent.',
}

