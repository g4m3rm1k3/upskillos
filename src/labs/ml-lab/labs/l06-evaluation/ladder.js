import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 06 practice ladder: honest splits — fold arithmetic, selection inside the folds, test masks by
// group, training-only scaling statistics, and measuring group overlap. Expected values computed by hand
// and with NumPy; tests recompute them with the helpers below.

const mean = v => v.reduce((a, b) => a + b, 0) / v.length
const sd0 = v => { const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length) }
export const scaleOf = (train, test) => test.map(x => (x - mean(train)) / sd0(train))
export const overlapOf = (trainG, testG) => testG.filter(g => trainG.includes(g)).length / testG.length
export const maskOf = (groups, testGroups) => groups.map(g => (testGroups.includes(g) ? 1 : 0))

const MASK_CASES = [
  { groups: [1, 1, 2, 3, 3, 3, 4], test: [3] }, { groups: [5, 2, 5, 9], test: [2, 9] },
  { groups: [7, 7, 7], test: [1] }, { groups: [0, 1, 2, 3, 4, 5], test: [0, 5] },
].map(c => ({ ...c, expected: maskOf(c.groups, c.test) }))
const SCALE_CASES = [
  { train: [1, 2, 3, 4], test: [5, 6] }, { train: [10, 20], test: [15, 30, 5] },
  { train: [0, 0, 2, 2], test: [1] }, { train: [3, 5, 7], test: [7, 3] },
].map(c => ({ ...c, expected: scaleOf(c.train, c.test) }))
const OVERLAP_CASES = [
  { trainG: [1, 2, 3], testG: [3, 4, 4, 5], expected: 0.25 },
  { trainG: [1, 1, 2], testG: [1, 2], expected: 1 },
  { trainG: [8, 9], testG: [1, 2, 3], expected: 0 },
  { trainG: [2, 4, 6, 8], testG: [2, 2, 3, 4, 5], expected: 0.6 },
]
export function diagnoseMask(c, got) {
  const v = got.value
  if ((got.shape ?? []).join() !== String(c.groups.length)) return 'Return one entry per row: 1 (True) if the row goes to the test set.'
  const byIndex = c.groups.map((_, i) => (c.test.includes(i) ? 1 : 0))
  if (v.every((x, i) => x === byIndex[i]) && !v.every((x, i) => x === c.expected[i])) return 'That selects rows by their position, not by their group. Compare each row’s group id with the test groups.'
  if (v.every((x, i) => x === 1 - c.expected[i])) return 'That is the training mask: 1 should mean the row is in the test set.'
  return null
}
export function diagnoseScale(c, got) {
  const all = [...c.train, ...c.test], leaky = c.test.map(x => (x - mean(all)) / sd0(all)), v = got.value
  if (v?.length === c.test.length && v.every((x, i) => Math.abs(x - leaky[i]) < 1e-6) && !leaky.every((x, i) => Math.abs(x - c.expected[i]) < 1e-6)) return 'The mean and standard deviation included the test rows. Scaling statistics are learned from training rows only.'
  const ownStats = c.test.map(x => (x - mean(c.test)) / (sd0(c.test) || 1))
  if (v?.length === c.test.length && c.test.length > 1 && v.every((x, i) => Math.abs(x - ownStats[i]) < 1e-6)) return 'The test rows were scaled with their own statistics. Use the training mean and standard deviation.'
  return null
}
export function diagnoseOverlap(c, got) {
  const v = got.value
  if (Math.abs(v - c.expected * c.testG.length) < 1e-9 && c.expected !== 0) return 'That is a count; return the share of test rows.'
  const byGroup = new Set(c.testG.filter(g => c.trainG.includes(g))).size / new Set(c.testG).size
  if (Math.abs(v - byGroup) < 1e-9 && Math.abs(byGroup - c.expected) > 1e-9) return 'That counts distinct groups. The contract counts test rows: a group with three rows counts three times.'
  return null
}
export function evaluateSelection(vars) {
  const miss = needVars(vars, ['accuracy'])
  if (miss) return { passed: false, message: miss }
  const a = Number(vars.accuracy.value)
  if (a > 0.6) return { passed: false, message: `Cross-validated accuracy ${r3(a)} on labels that are pure coin flips: the 10 features were chosen using every row’s label, including each fold’s validation rows. Put the selection inside the pipeline — \`make_pipeline(SelectKBest(f_classif, k=10), LogisticRegression())\` on all of \`X\` — and run again.` }
  return { passed: true, message: `Accuracy ${r3(a)}: about chance, which is the truth for random labels. Each fold now chooses its features from its own training rows, so the validation rows never shaped the selection.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
export const TEMPLATES = ['folds', 'overlap', 'which']
const SCENARIOS = [
  { text: 'A model will score builds from **new repositories** it has never seen.', answer: 'group', why: 'New repositories: keep each repository’s builds together, so the test repositories are unseen.' },
  { text: 'A model will forecast **next week’s** CPU usage from past weeks.', answer: 'time', why: 'The future: train on earlier weeks, test on later ones.' },
  { text: 'Every build is from a different, independent project, measured once, and the model will score more such builds.', answer: 'random', why: 'Independent rows with no grouping or order: a random split is honest.' },
  { text: 'A model will flag fraud for **customers already in the system**, using their past transactions, on future days.', answer: 'time', why: 'Future days: train on earlier transactions and test on later ones.' },
  { text: 'A model will diagnose images from **patients not in the training data**, and each patient has several images.', answer: 'group', why: 'New patients: keep each patient’s images together.' },
]
const SPLITS = { random: 'Random split of rows', group: 'Grouped split (whole groups held out)', time: 'Chronological split (train on the past, test on the future)' }
export function generate(template, seed) {
  const g = rng(seed * 1709 + TEMPLATES.indexOf(template) * 20011 + 3)
  if (template === 'folds') {
    const k = g.pick([4, 5, 10]), n = k * g.pick([12, 20, 30, 50]), ask = g.pick(['val', 'train', 'leak'])
    const answer = ask === 'train' ? n - n / k : n / k
    const mis = [{ answer: ask === 'train' ? n / k : n - n / k, feedback: ask === 'train' ? 'That is the validation fold. Training uses the other k − 1 folds.' : 'That is the training part; the validation fold is one of k.' }, { answer: k, feedback: 'That is the number of folds, not rows.' }]
    return { template, seed, k, n, ask, answer, misconceptions: mis.filter(m => Math.abs(m.answer - answer) > 1e-9) }
  }
  if (template === 'overlap') {
    for (let attempt = 0; attempt < 200; attempt++) {
      const trainG = [...new Set(Array.from({ length: 4 }, () => g.int(1, 9)))], testG = Array.from({ length: g.pick([4, 5, 8]) }, () => g.int(1, 9))
      const answer = overlapOf(trainG, testG), distinct = new Set(testG.filter(x => trainG.includes(x))).size / new Set(testG).size
      if (answer === 0 || answer === 1) continue
      return { template, seed, trainG, testG, answer, misconceptions: Math.abs(distinct - answer) > 1e-9 ? [{ answer: distinct, feedback: 'That counts distinct machines. Count test rows: each row from a seen machine leaks.' }] : [] }
    }
  }
  const sc = g.pick(SCENARIOS)
  return { template, seed, scenario: sc, answer: sc.answer, options: g.shuffle(Object.keys(SPLITS)) }
}
export function view(p) {
  if (p.template === 'folds') {
    const q = { val: 'How many rows does each fold **validate** on?', train: 'How many rows does each fold **train** on?', leak: 'A scaler fitted on all rows before splitting: how many of each fold’s validation rows influenced its statistics?' }[p.ask]
    return { intro: `${p.n} rows, ${p.k}-fold cross-validation.`, questions: [{ id: 'n', type: 'number', label: q, answer: p.answer, misconceptions: p.misconceptions }] }
  }
  if (p.template === 'overlap') return { intro: `The training rows come from machines ${p.trainG.join(', ')}. The test rows come from machines **${p.testG.join(', ')}** (one entry per row).`, questions: [{ id: 'o', type: 'number', label: 'What share of the **test rows** come from a machine that also appears in training? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  return { intro: p.scenario.text, questions: [{ id: 's', type: 'choice', legend: 'Which split measures what deployment will face?', options: p.options.map(k => ({ value: k, label: SPLITS[k] })), answer: p.answer, wrong: 'Not that one. Ask what the model will see in deployment that it never saw in training — new groups, the future, or just new independent rows — and hold that out.' }] }
}
export function workedSolution(p) {
  if (p.template === 'folds') return `Each fold holds n/k = ${p.n}/${p.k} = ${p.n / p.k} rows; training uses the other ${p.n - p.n / p.k}. A scaler fitted before splitting saw all ${p.n / p.k} validation rows of every fold. Answer: **${p.answer}**.`
  if (p.template === 'overlap') return `Test rows from a machine seen in training: ${p.testG.filter(g => p.trainG.includes(g)).length} of ${p.testG.length} = **${r3(p.answer)}**.`
  return `**${SPLITS[p.answer]}.** ${p.scenario.why}`
}

export const split = {
  title: 'Evaluate the way you will deploy',
  version: 1,
  templates: TEMPLATES,
  templateNames: { folds: 'Fold arithmetic', overlap: 'Measure overlap', which: 'Choose the split' },
  generate, view, workedSolution,
  intro: 'Seven steps: count what each fold sees, remove a selection leak, build group masks and training-only scaling, and choose splits for new situations. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Count what each fold sees',
      prompt: '100 rows, 5-fold cross-validation.',
      fields: [
        { label: 'Rows each fold validates on', answer: 20 },
        { label: 'Rows each fold trains on', answer: 80 },
        { label: 'Scaler fitted on all 100 rows first: validation rows that influenced it, per fold', answer: 20 },
        { label: 'Scaler fitted inside each fold: validation rows that influence it', answer: 0 },
      ],
      explain: 'Each row is validated once, so 100/5 = 20 per fold and 80 for training. A statistic computed before splitting used all 20 validation rows of every fold; fitted inside the fold, it uses none.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Move the selection inside the folds',
      prompt: 'Labels are coin flips and features are random, so honest accuracy is about 0.5. This selects the 10 “best” features on all rows, then cross-validates. Run it. Then **replace the selection and scoring with a pipeline** that selects inside each fold (the check tells you exactly what to write), and run again.',
      starter: `import numpy as np
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import cross_val_score, KFold

rng = np.random.default_rng(0)
X = rng.normal(size=(60, 500))              # 500 random features
y = rng.integers(0, 2, 60)                  # coin-flip labels
folds = KFold(5, shuffle=True, random_state=0)

top = SelectKBest(f_classif, k=10).fit(X, y).get_support()      # chosen using ALL rows' labels
accuracy = cross_val_score(LogisticRegression(), X[:, top], y, cv=folds).mean()
print(f"cross-validated accuracy: {accuracy:.3f}")`,
      probe: ['accuracy'],
      evaluate: evaluateSelection,
      done: 'Anything learned from data — selection, scaling, fill values — belongs inside the pipeline that is refitted on every training fold.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in a group mask',
      prompt: 'Replace `___` so the mask is 1 for rows whose group is one of the test groups.',
      starter: `import numpy as np

def test_mask(groups, test_groups):
    """groups: the group id of each row. Returns True (1) for rows whose group is in test_groups."""
    return ___`,
      hint: 'NumPy has a function that asks, for every element, “is it in this list?”.',
      solution: 'return np.isin(groups, test_groups)',
      check: { fn: 'test_mask', args: ['groups', 'test'], cases: MASK_CASES, describe: c => `groups = [${c.groups.join(', ')}], test groups = [${c.test.join(', ')}]`, diagnose: diagnoseMask },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For training [1, 2, 3, 4] and test [5, 6] this returns about **[0.88, 1.46]** instead of **[2.24, 3.13]**. Find the leak.',
      starter: `import numpy as np

def scale_test(train, test):
    """Standardize the test values with statistics learned from the training values."""
    both = np.concatenate([train, test])
    return (test - both.mean()) / both.std()`,
      hint: 'Which rows should the mean and standard deviation come from?',
      solution: 'return (test - train.mean()) / train.std()',
      check: { fn: 'scale_test', args: ['train', 'test'], cases: SCALE_CASES, describe: c => `train = [${c.train.join(', ')}], test = [${c.test.join(', ')}]`, diagnose: diagnoseScale },
      explainChoice: {
        prompt: 'Why does it matter, when the numbers are only slightly different?',
        options: [
          { text: 'The test rows shaped the scaling, so evaluation used information that deployment will not have: every new row would need the future data mixed in first.', correct: true },
          { text: 'Standard deviations cannot be combined.', feedback: 'They can be computed on any rows; the question is which rows are allowed.' },
          { text: 'Scaling is never needed.', feedback: 'Scaling matters for distance-based and gradient-based models; it just has to be learned from training rows.' },
          { text: 'The test set is too small.', feedback: 'Size is not the issue: using the test rows at all is.' },
        ],
        rightFeedback: 'Learned statistics are part of the model, so they are fitted on training rows only.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Measure group overlap',
      prompt: 'Write `overlap` from its contract: the leak rate of a split.',
      starter: `import numpy as np

def overlap(train_groups, test_groups):
    """The share of TEST ROWS whose group also appears among the training rows' groups.

    Example: overlap(np.array([1., 2., 3.]), np.array([3., 4., 4., 5.]))  ->  0.25
    """
    pass   # replace with your code`,
      hint: 'A mask over the test rows: is each test row’s group in the training groups? Then its mean.',
      solution: 'return np.mean(np.isin(test_groups, train_groups))',
      check: { fn: 'overlap', args: ['trainG', 'testG'], cases: OVERLAP_CASES, describe: c => `train groups [${c.trainG.join(', ')}], test rows [${c.testG.join(', ')}]`, diagnose: diagnoseOverlap },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New datasets and deployments. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
