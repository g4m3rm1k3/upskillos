import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 32 practice ladder: gate arithmetic, a missing sanity gate, version bumps, slice gates and canary rollback.

export const rollbackDayOf = (control, canary, tol, persist) => {
  let run = 0
  for (let d = 0; d < control.length; d++) { run = canary[d] > (1 + tol) * control[d] ? run + 1 : 0; if (run === persist) return d }
  return -1
}
export const slicesPassOf = (prod, cand, tol) => (cand.every((c, i) => c <= (1 + tol) * prod[i]) ? 1 : 0)

const BUMP_CASES = [[1, 4, 0], [1, 4, 3], [0, 9, 2], [3, 0, 0]].map(([major, minor, patch]) => ({ major, minor, patch, expected: [major, minor + 1, 0] }))
const SLICE_CASES = [
  { prod: [20.0, 8.7, 16.1, 11.5], cand: [9.5, 9.8, 6.9, 13.9], tol: 0.1 },
  { prod: [20.0, 8.7, 16.1, 11.5], cand: [6.1, 5.8, 4.2, 8.8], tol: 0.1 },
  { prod: [10, 10], cand: [10.9, 10.9], tol: 0.1 },
  { prod: [10, 10, 10], cand: [5, 5, 11.5], tol: 0.1 },
].map(c => ({ ...c, expected: slicesPassOf(c.prod, c.cand, c.tol) }))
export const ROLLBACK_CASES = [
  { control: [12.1, 11.5, 12.9], canary: [37.9, 52.9, 60], tol: 0.1, persist: 2 },
  { control: [12.1, 11.5, 12.9, 14.6, 12.0], canary: [3.2, 8.8, 14.1, 7.1, 8.9], tol: 0.05, persist: 2 },
  { control: [10, 10, 10, 10, 10], canary: [12, 9, 12, 12, 12], tol: 0.1, persist: 3 },
  { control: [10, 10, 10], canary: [12, 12, 12], tol: 0.1, persist: 1 },
  { control: [10, 10], canary: [11, 11], tol: 0.1, persist: 1 },
].map(c => ({ ...c, expected: rollbackDayOf(c.control, c.canary, c.tol, c.persist) }))

export function diagnoseBump(c, got) {
  if (Array.isArray(got.value) && got.value[0] === c.major && got.value[1] === c.minor + 1 && got.value[2] === c.patch && c.patch !== 0) return 'A minor bump resets the patch number to 0: 1.4.3 → 1.5.0.'
  if (Array.isArray(got.value) && got.value[0] === c.major + 1) return 'A new model under the same contract is a minor change, not a major one.'
  return null
}
export function diagnoseSlices(c, got) {
  const m = a => a.reduce((s, v) => s + v, 0) / a.length
  const meanPass = m(c.cand) <= (1 + c.tol) * m(c.prod) ? 1 : 0
  if (got.value === meanPass && meanPass !== c.expected) return 'This compares the averages over slices, so big gains in some slices hide a regression in another. Check every slice on its own.'
  return null
}
export function diagnoseRollback(c, got) {
  let run = 0, first = -1
  for (let d = 0; d < c.control.length; d++) { if (c.canary[d] > (1 + c.tol) * c.control[d]) { run++; if (run === 1 && first < 0) first = d } }
  if (got.value === first && c.persist > 1 && first !== c.expected) return 'This rolls back on the first bad day. The rule needs `persist` consecutive bad days.'
  const noReset = (() => { let k = 0; for (let d = 0; d < c.control.length; d++) { if (c.canary[d] > (1 + c.tol) * c.control[d]) k++; if (k === c.persist) return d } return -1 })()
  if (got.value === noReset && noReset !== c.expected) return 'The count of bad days must restart after a good day: persistence means consecutive days.'
  return null
}
export function evaluateSanity(vars) {
  const miss = needVars(vars, ['cand_mae', 'n_gates', 'promote'])
  if (miss) return { passed: false, message: miss }
  const m = Number(vars.cand_mae.value), n = Number(vars.n_gates.value), p = Number(vars.promote.value)
  if (n < 4) return { passed: false, message: `The candidate scores ${r3(m)} s — far below the ≈ 4 s any model can reach when the noise has a standard deviation of 5 s — and all ${n} gates pass. Add a sanity gate to the dict: \`"sanity": cand_mae >= 0.6 * noise_floor,\` and run again.` }
  if (p) return { passed: false, message: 'There are now 4 gates but the candidate is still promoted. The sanity gate should fail when the candidate is better than the noise allows: `cand_mae >= 0.6 * noise_floor`.' }
  return { passed: true, message: `Blocked: ${r3(m)} s is better than the noise allows, so the candidate must have seen the answer — here, a feature computed from the logged duration. At serving time that feature does not exist.` }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['improve', 'version', 'exposure']
const SCHEDULE = [1, 5, 5, 25, 25, 50, 100]
export function generate(template, seed) {
  const g = rng(seed * 227 + TEMPLATES.indexOf(template) * 4127 + 61)
  if (template === 'improve') {
    const prod = g.pick([10, 12, 14.3, 16, 20]), cut = g.pick([0.04, 0.08, 0.15, 0.25, 0.33]), cand = Math.round(prod * (1 - cut) * 100) / 100, answer = 100 * (1 - cand / prod)
    return { template, seed, prod, cand, answer, misconceptions: [{ answer: 100 * (prod / cand - 1), feedback: 'Divide by the production error: the fall relative to where you started.' }].filter(m => Math.abs(m.answer - answer) > 0.6) }
  }
  if (template === 'version') {
    const major = g.pick([0, 1, 2, 3]), minor = g.pick([0, 2, 4, 7]), patch = g.pick([0, 1, 3]), change = g.pick(['contract', 'model', 'packaging'])
    const next = change === 'contract' ? `${major + 1}.0.0` : change === 'model' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`
    const part = change === 'contract' ? 'major' : change === 'model' ? 'minor' : 'patch', answer = Number(next.split('.')[['major', 'minor', 'patch'].indexOf(part)])
    return { template, seed, version: `${major}.${minor}.${patch}`, change, next, part, answer }
  }
  const day = g.pick([1, 2, 3, 4, 5, 6]), answer = Math.max(...SCHEDULE.slice(0, day))
  return { template, seed, day, answer, misconceptions: [{ answer: SCHEDULE[day], feedback: 'The rollback fires at the end of that day, so the next day’s larger share never happens.' }].filter(m => m.answer !== answer) }
}
const CHANGE = { contract: 'changes the output unit (a contract change)', model: 'is a retrained model under the same contract', packaging: 'fixes packaging without changing any prediction' }
export function view(p) {
  if (p.template === 'improve') return { intro: `On the recent holdout, production has MAE ${p.prod} s and the candidate ${p.cand} s.`, questions: [{ id: 'i', type: 'number', label: 'By what percentage is the candidate’s error lower? (One decimal.)', answer: p.answer, tolerance: 0.06, misconceptions: p.misconceptions }] }
  if (p.template === 'version') return { intro: `The current release is ${p.version}. The next release ${CHANGE[p.change]}.`, questions: [{ id: 'v', type: 'number', label: `What is the new ${p.part} number?`, answer: p.answer }] }
  return { intro: `A canary schedule sends ${SCHEDULE.join('%, ')}% of traffic to the candidate on days 1–7. The rollback rule fires at the end of day ${p.day}.`, questions: [{ id: 'e', type: 'number', label: 'What is the largest share of traffic, in percent, that ever used the candidate?', answer: p.answer, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'improve') return `1 − ${p.cand}/${p.prod} = **${Math.round(p.answer * 10) / 10}%**.`
  if (p.template === 'version') return `${p.version} → **${p.next}**: a ${p.part} bump${p.part === 'major' ? ' resets minor and patch' : p.part === 'minor' ? ' resets the patch' : ''}.`
  return `Days 1–${p.day} used ${SCHEDULE.slice(0, p.day).join('%, ')}%: at most **${p.answer}%**.`
}

export const release = {
  title: 'Releasing: gates, versions and canaries',
  version: 1,
  templates: TEMPLATES,
  templateNames: { improve: 'Improvement over production', version: 'Semantic version bump', exposure: 'Canary exposure' },
  generate, view, workedSolution,
  intro: 'Seven steps: release arithmetic by hand, a missing sanity gate added, and writing a version bump, a slice gate and a canary rollback rule. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Release arithmetic by hand',
      prompt: 'Production MAE 12.0 s, candidate 10.8 s. On the cache-miss slice, production 8.0 s and candidate 9.0 s. Gates: at least 5% better overall, no slice more than 10% worse. Separately, a canary on 1%, 5%, 5%, 25% of traffic rolls back at the end of day 3.',
      fields: [
        { label: 'Overall improvement (a fraction)', answer: 0.1, tolerance: 1e-9 },
        { label: 'Cache-miss regression (a fraction)', answer: 0.125, tolerance: 1e-9 },
        { label: 'Promote? (1 = yes, 0 = no)', answer: 0 },
        { label: 'Largest share of traffic that saw the canary (percent)', answer: 5 },
      ],
      explain: '1 − 10.8/12 = 0.10 passes the 5% gate; 9.0/8.0 − 1 = 0.125 breaks the 10% slice gate, so the candidate is not promoted. Days 1–3 used 1%, 5% and 5%: at most 5%.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Add the sanity gate',
      prompt: 'A candidate with a feature computed from the logged duration passes all three gates. **Add a sanity gate** to the `gates` dict — `"sanity": cand_mae >= 0.6 * noise_floor,` — and run again.',
      starter: `import numpy as np
rng = np.random.default_rng(32)
n = 1200
size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); cache = rng.integers(0, 2, n)
y = 20 + np.where(cache == 1, 0.05, 1.0) * 0.9 * size + 5 * rng.normal(size=n)       # durations, noise sd 5 s
leak = np.round(y / 10) * 10                                                          # computed from the logged duration
train, hold = slice(0, 800), slice(800, n)

def fit_mae(columns):
    X = np.column_stack([np.ones(n)] + columns)
    w = np.linalg.lstsq(X[train], y[train], rcond=None)[0]
    return float(np.mean(np.abs(X[hold] @ w - y[hold])))

prod_mae = fit_mae([size])
cand_mae = fit_mae([size, size * cache, leak])
noise_floor = 5.0
gates = {
    "improvement": cand_mae <= 0.95 * prod_mae,
    "contract": True,
    "latency": True,
}
n_gates = len(gates)
promote = int(all(gates.values()))
print(f"production {prod_mae:.2f} s, candidate {cand_mae:.2f} s; {n_gates} gates; promote = {promote}")`,
      probe: ['cand_mae', 'n_gates', 'promote'],
      evaluate: evaluateSanity,
      done: 'Results better than the process noise allows almost always mean leakage (Lab 06). A gate turns that suspicion into an automatic block.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in a minor bump',
      prompt: 'Replace `___` with the next version, as a list [major, minor, patch], for a new model under the same contract.',
      starter: `def bump_minor(major, minor, patch):
    """A new model, same contract: a minor release."""
    return ___`,
      hint: 'The minor number goes up by one; the patch number starts again.',
      solution: 'return [major, minor + 1, 0]',
      check: { fn: 'bump_minor', args: ['major', 'minor', 'patch'], ints: ['major', 'minor', 'patch'], cases: BUMP_CASES, describe: c => `${c.major}.${c.minor}.${c.patch}`, diagnose: diagnoseBump },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For production slices [20.0, 8.7, 16.1, 11.5] and candidate slices [9.5, 9.8, 6.9, 13.9] this returns **1** (pass), yet two slices are more than 10% worse. Fix it.',
      starter: `import numpy as np

def slices_pass(prod_slices, cand_slices, tol):
    """1 if no slice's candidate error exceeds (1 + tol) times production's, else 0."""
    return int(np.mean(cand_slices) <= (1 + tol) * np.mean(prod_slices))`,
      hint: 'The gate is about every slice, not the average slice.',
      solution: 'return int(np.all(cand_slices <= (1 + tol) * prod_slices))',
      check: { fn: 'slices_pass', args: ['prod_slices', 'cand_slices', 'tol'], cases: SLICE_CASES.map(c => ({ ...c, prod_slices: c.prod, cand_slices: c.cand })), describe: c => `production [${c.prod.join(', ')}], candidate [${c.cand.join(', ')}]`, diagnose: diagnoseSlices },
      explainChoice: {
        prompt: 'Why check each slice rather than the average over slices?',
        options: [
          { text: 'The people in a slice experience that slice’s error. Large gains elsewhere do not help them, and an average lets those gains hide their regression.', correct: true },
          { text: 'Because the average over slices is always wrong.', feedback: 'It is a valid number; it just answers a different question.' },
          { text: 'To make promotion easier.', feedback: 'The per-slice gate is stricter than the average.' },
          { text: 'Because slices have equal sizes.', feedback: 'They usually do not — which is one more reason an unweighted average misleads.' },
        ],
        rightFeedback: 'The same idea as subgroup evaluation in Lab 31.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'The canary rollback rule',
      prompt: 'Write `rollback_day` from its contract.',
      starter: `def rollback_day(control, canary, tol, persist):
    """control[d] and canary[d] are the MAEs on day d (0-based). A day is bad if canary > (1 + tol) * control.
    Return the day on which the persist-th consecutive bad day occurs, or -1 if that never happens.

    Example: control [12.1, 11.5, 12.9], canary [37.9, 52.9, 60], tol 0.1, persist 2  ->  1
    """
    pass   # replace with your code`,
      hint: 'Keep a count of consecutive bad days; reset it to 0 on a good day.',
      solution: 'run = 0\nfor d in range(len(control)):\n    run = run + 1 if canary[d] > (1 + tol) * control[d] else 0\n    if run == persist:\n        return d\nreturn -1',
      check: { fn: 'rollback_day', args: ['control', 'canary', 'tol', 'persist'], ints: ['persist'], cases: ROLLBACK_CASES, describe: c => `${c.control.length} days, tolerance ${c.tol}, persistence ${c.persist}`, diagnose: diagnoseRollback },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New candidates, releases and rollouts. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
