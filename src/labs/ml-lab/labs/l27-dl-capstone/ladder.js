import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 27 practice ladder: testing where deployment differs, cost arithmetic, recall, and paired ablation summaries.

export const convMacsOf = (k, cin, cout, h, w) => k * k * cin * cout * h * w
export const recallOf = cm => cm.map((row, i) => row[i] / row.reduce((a, b) => a + b, 0))
export function ablationOf(full, ablated) { const g = full.map((v, i) => v - ablated[i]); return [g.reduce((a, b) => a + b, 0) / g.length, Math.min(...g), Math.max(...g)] }

const MAC_CASES = [[3, 1, 4, 10, 10], [3, 3, 8, 8, 8], [5, 16, 32, 14, 14], [1, 64, 64, 7, 7]].map(([k, c_in, c_out, h, w]) => ({ k, c_in, c_out, h, w, expected: convMacsOf(k, c_in, c_out, h, w) }))
export const CM_CASES = [
  [[45, 5], [10, 40]],
  [[8, 1, 1], [0, 9, 1], [2, 2, 6]],
  [[3, 0], [0, 7]],
  [[24, 5, 1], [0, 30, 0], [3, 0, 27]],
].map(cm => ({ cm, expected: recallOf(cm) }))
export const ABL_CASES = [
  [[0.84, 0.85, 0.83], [0.80, 0.83, 0.82]],
  [[0.9, 0.9], [0.95, 0.85]],
  [[0.7, 0.72, 0.71, 0.73], [0.7, 0.7, 0.7, 0.7]],
  [[0.5], [0.6]],
].map(([full, ablated]) => ({ full, ablated, expected: ablationOf(full, ablated) }))

const near = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9)
export function diagnoseMacs(c, got) {
  if (got.value === c.k * c.k * c.c_in * c.c_out) return 'That is the number of weights. Each weight is used once at every output position: multiply by h × w.'
  if (got.value === c.k * c.k * c.h * c.w * c.c_out && c.c_in > 1) return 'Each output channel sums over all input channels: include c_in.'
  return null
}
export function diagnoseRecall(c, got) {
  const prec = c.cm.map((_, j) => c.cm[j][j] / c.cm.reduce((s, row) => s + row[j], 0))
  if (near(got.value, prec) && !near(prec, c.expected)) return 'That divides by the column totals: that is precision. Recall divides the diagonal by each row’s total (the true class).'
  return null
}
export function diagnoseAblation(c, got) {
  const unpaired = (c.full.reduce((a, b) => a + b, 0) / c.full.length) - (c.ablated.reduce((a, b) => a + b, 0) / c.ablated.length)
  if (Array.isArray(got.value) && got.value.length === 3 && Math.abs(got.value[0] - unpaired) < 1e-9 && !near(got.value, c.expected)) return 'The mean is right, but the range must come from the paired differences, seed by seed: full[s] − ablated[s].'
  if (near(got.value, c.expected.map(v => -v).slice(0, 1).concat([-c.expected[2], -c.expected[1]]))) return 'The sign is reversed: report full − ablated, so a positive number means the component helped.'
  return null
}
export function evaluateShift(vars) {
  const miss = needVars(vars, ['test_shift', 'accuracy'])
  if (miss) return { passed: false, message: miss }
  const dx = Number(vars.test_shift.value), a = Number(vars.accuracy.value)
  if (dx < 1) return { passed: false, message: `On test images as they are, the baseline scores ${r3(a)}. The question is about digits written further right. Set \`test_shift = 2\` and run again.` }
  return { passed: true, message: `Moved ${dx} pixels: ${r3(a)} — below the 0.1 of random guessing. A test set that matches the training data would never have shown this.` }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['macs', 'probe', 'recall']
export function generate(template, seed) {
  const g = rng(seed * 433 + TEMPLATES.indexOf(template) * 1031 + 83)
  if (template === 'macs') {
    const k = g.pick([1, 3, 5]), cin = g.pick([1, 3, 8, 16]), cout = g.pick([4, 8, 16, 32]), h = g.pick([7, 8, 10, 14, 28]), answer = convMacsOf(k, cin, cout, h, h)
    return { template, seed, k, cin, cout, h, answer, misconceptions: [{ answer: k * k * cin * cout, feedback: 'That is the weight count. Multiply by the h × w output positions.' }].filter(m => m.answer !== answer) }
  }
  if (template === 'probe') {
    const f = g.pick([16, 64, 128, 256, 512, 768, 2048]), k = g.pick([2, 3, 5, 10, 100]), answer = f * k + k
    return { template, seed, f, k, answer, misconceptions: [{ answer: f * k, feedback: 'Add one bias per class.' }] }
  }
  const n = g.int(20, 60), c = g.int(Math.ceil(n / 2), n - 1), answer = c / n
  return { template, seed, n, c, answer, misconceptions: [{ answer: (n - c) / n, feedback: 'That is the share read wrongly (1 − recall).' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
}
export function view(p) {
  if (p.template === 'macs') return { intro: `A ${p.k} × ${p.k} convolution from ${p.cin} to ${p.cout} channels, producing ${p.h} × ${p.h} outputs per channel.`, questions: [{ id: 'm', type: 'number', label: 'How many multiply-adds does it need per image?', answer: p.answer, misconceptions: p.misconceptions }] }
  if (p.template === 'probe') return { intro: `A frozen backbone outputs ${p.f} features; a linear probe classifies ${p.k} classes.`, questions: [{ id: 'n', type: 'number', label: 'How many trainable parameters does the probe have?', answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro: `A class appears ${p.n} times in the test set and is predicted correctly ${p.c} times.`, questions: [{ id: 'r', type: 'number', label: 'What is its recall? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'macs') return `${p.k}² × ${p.cin} × ${p.cout} × ${p.h} × ${p.h} = **${p.answer}**.`
  if (p.template === 'probe') return `${p.f} × ${p.k} + ${p.k} = **${p.answer}**.`
  return `${p.c}/${p.n} = **${r3(p.answer)}**.`
}

export const invest = {
  title: 'An honest investigation',
  version: 1,
  templates: TEMPLATES,
  templateNames: { macs: 'Multiply-adds of a convolution', probe: 'Parameters of a linear probe', recall: 'Recall' },
  generate, view, workedSolution,
  intro: 'Seven steps: an investigation’s arithmetic by hand, testing where deployment differs, and writing the cost, recall and paired-ablation code a report needs. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'The arithmetic of a report',
      prompt: 'Full-pipeline accuracies over three seeds: 0.84, 0.85, 0.83; with one component removed (same seeds): 0.80, 0.83, 0.82. Then: a 3 × 3 convolution from 1 to 8 channels with 8 × 8 outputs; a probe from 256 features to 10 classes; a digit read correctly 18 times out of 20.',
      fields: [
        { label: 'Mean paired loss from removing the component (four decimals)', answer: (0.04 + 0.02 + 0.01) / 3, tolerance: 0.00006 },
        { label: 'Smallest paired loss', answer: 0.01, tolerance: 1e-9 },
        { label: 'Multiply-adds of the convolution per image', answer: 4608 },
        { label: 'Parameters of the probe', answer: 2570 },
        { label: 'Recall of the digit', answer: 0.9, tolerance: 1e-9 },
      ],
      explain: 'Paired losses 0.04, 0.02, 0.01: mean 0.0233, all positive, smallest 0.01. Convolution: 3 × 3 × 1 × 8 × 8 × 8 = 4,608. Probe: 256 × 10 + 10 = 2,570. Recall 18/20 = 0.9.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Test where deployment differs',
      prompt: 'The real-digit pixel baseline. Run it on the test images as they are, then **set `test_shift = 2`** — digits written 2 pixels further right — and run again. Predict first.',
      starter: `import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
digits = load_digits()
images, labels = digits.images / 16.0, digits.target
def shift(imgs, dx):
    out = np.zeros_like(imgs)
    out[:, :, dx:] = imgs[:, :, :imgs.shape[2] - dx] if dx else imgs
    return out

test_shift = 0
X_tr, X_te, y_tr, y_te = train_test_split(images, labels, test_size=0.3, random_state=0, stratify=labels)
model = LogisticRegression(max_iter=3000).fit(X_tr.reshape(len(X_tr), -1), y_tr)
accuracy = model.score(shift(X_te, test_shift).reshape(len(X_te), -1), y_te)
print(f"test images moved {test_shift} px: accuracy {accuracy:.3f}")`,
      probe: ['test_shift', 'accuracy'],
      evaluate: evaluateShift,
      done: 'Decide what the test set must represent before training; here, the conditions the reader will meet in use.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in a convolution’s cost',
      prompt: 'Replace `___` with the multiply-adds per image of a convolution layer.',
      starter: `def conv_macs(k, c_in, c_out, h, w):
    """k × k kernels from c_in to c_out channels, producing h × w outputs per channel."""
    return ___`,
      hint: 'Each output number needs k·k·c_in multiply-adds, and there are c_out·h·w output numbers.',
      solution: 'return k * k * c_in * c_out * h * w',
      check: { fn: 'conv_macs', args: ['k', 'c_in', 'c_out', 'h', 'w'], ints: ['k', 'c_in', 'c_out', 'h', 'w'], cases: MAC_CASES, describe: c => `k = ${c.k}, ${c.c_in} → ${c.c_out} channels, ${c.h} × ${c.w}`, diagnose: diagnoseMacs },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For the confusion matrix [[45, 5], [10, 40]] (rows: true class) this returns **[0.818, 0.889]**. The recalls are 0.9 and 0.8. Fix it.',
      starter: `import numpy as np

def recall_per_class(cm):
    """cm[i, j]: examples of true class i predicted as class j. Return the recall of each class."""
    return cm.diagonal() / cm.sum(axis=0)`,
      hint: 'Recall asks: of the examples that truly are class i, how many were found? Those are row i.',
      solution: 'return cm.diagonal() / cm.sum(axis=1)',
      check: { fn: 'recall_per_class', args: ['cm'], cases: CM_CASES, describe: c => `${c.cm.length} classes`, diagnose: diagnoseRecall },
      explainChoice: {
        prompt: 'What did the buggy function actually compute?',
        options: [
          { text: 'Precision: of the examples predicted as class i, the share that truly are i. A report would call a class well found when it is merely rarely predicted wrongly.', correct: true },
          { text: 'Accuracy.', feedback: 'Accuracy is one number: the diagonal sum over the total.' },
          { text: 'The error rate.', feedback: 'That would be one minus a recall or a precision.' },
          { text: 'Nothing meaningful.', feedback: 'It is a real metric — just not the one the report claims.' },
        ],
        rightFeedback: 'Label every metric in a report with its definition; recall and precision are easy to swap.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Summarize an ablation',
      prompt: 'Write `ablation_summary` from its contract.',
      starter: `import numpy as np

def ablation_summary(full, ablated):
    """full[s], ablated[s]: accuracy with and without a component, using the same seed s.
    Return np.array([mean, smallest, largest]) of the paired differences full - ablated.

    Example: ablation_summary(np.array([0.84, 0.85, 0.83]), np.array([0.80, 0.83, 0.82]))  ->  array([0.02333, 0.01, 0.04])
    """
    pass   # replace with your code`,
      hint: 'd = full − ablated; return its mean, min and max.',
      solution: 'd = full - ablated\nreturn np.array([d.mean(), d.min(), d.max()])',
      check: { fn: 'ablation_summary', args: ['full', 'ablated'], cases: ABL_CASES, describe: c => `${c.full.length} seeds`, diagnose: diagnoseAblation },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New layers, probes and confusion counts. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
