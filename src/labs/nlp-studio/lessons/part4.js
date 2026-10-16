// Part 4: meaning as vectors. Co-occurrence and PPMI, a 2-D map by power iteration, word2vec
// trained by hand, analogies, and Bot 2 answering by meaning. Numbers come from engine/vectors.js,
// which parity4.test.js holds to the Python after full training; lessons.test.js checks them all.
import * as V from '../engine/vectors.js'
import * as C from '../engine/counting.js'
import { SENTENCES } from '../engine/corpus.js'
import { INTENTS } from '../engine/data.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const BIKE = SENTENCES.map(C.words)
const [CO_VOCAB, CO_COUNTS] = V.cooccurrence(BIKE)
const PPMI = V.ppmi(CO_COUNTS)
const [VOCAB, VECTORS, LOSSES] = V.trainBikeVectors(SENTENCES)
const near = (w, n = 4) => V.nearest(VOCAB, VECTORS, w, n).map(([, x]) => x)
const nearP = (w, n = 4) => V.nearest(CO_VOCAB, PPMI, w, n).map(([, x]) => x)
const cnt = (a, b) => CO_COUNTS[CO_VOCAB.indexOf(a)][CO_VOCAB.indexOf(b)]
const COSINE = [['counting.py', 'dot'], ['counting.py', 'norm'], ['counting.py', 'cosine']]
const pairsPerPass = BIKE.reduce((s, sent) => s + sent.reduce((t, _, i) => t + Math.min(sent.length, i + 3) - Math.max(0, i - 2) - 1, 0), 0)
const reply = q => V.semanticReply(INTENTS, VOCAB, VECTORS, q)
const ANALOGY = (a, b, c) => V.analogy(VOCAB, VECTORS, a, b, c)
const T = CO_COUNTS.flat().reduce((s, x) => s + x, 0)
const rowTotal = w => CO_COUNTS[CO_VOCAB.indexOf(w)].reduce((s, x) => s + x, 0)
// The meaning bot without stop-word removal (every word averaged), to show why lesson 4.6 removes them.
const allWordsReply = q => { const idx = Object.fromEntries(VOCAB.map((w, k) => [w, k])), vec = V.sentenceVector(C.words(q), idx, VECTORS); let best = null; for (const [name, it] of Object.entries(INTENTS).sort()) { for (const e of it.examples) { const ev = V.sentenceVector(C.words(e), idx, VECTORS); if (vec && ev) { const s = C.cosine(vec, ev); if (!best || s > best[0]) best = [s, name] } } } return best }

export const PART4 = {
  id: 'part4', title: 'Part 4 · Meaning as vectors', lessons: [
    {
      id: 'cooccurrence', number: '4.1', title: 'You shall know a word by the company it keeps',
      goal: 'Count which words appear near which, read a word’s row of counts as a vector, and see what that vector does and doesn’t capture.',
      builds: ['intent-bot'],
      blocks: [
        { h: 'Where Part 3 left off' },
        { md: `Bot 2 failed on “do you sell pizza” and “my chain broke” for the same reason: to a bag of words, every word is just its own column. “chain” and “tyre” are as different as “chain” and “pizza”. Nothing in the counts says that some words mean similar things.

The way out is an idea from the linguist J. R. Firth (1957): **“You shall know a word by the company it keeps.”** Words that mean similar things are used in similar places. “Chain”, “tyre” and “brake” all appear near “fix”, “broke”, “the mechanic”; “monday” and “sunday” near “open”, “close”, “on”. So: describe each word by the words around it, and similar words get similar descriptions.

The text for this part is ${SENTENCES.length} sentences from a bike shop’s day, written for this lab, about repairs, opening hours, orders and small talk. That is tiny (real word vectors learn from billions of words), which keeps every number small enough to follow, and makes it honest about what so little text can and can’t teach.` },
        {
          code: {
            file: 'vectors.py', fn: 'cooccurrence', notes: [
              ['vocab = vocabulary(sentences)', ['Every word, sorted, as in lesson 3.1.']],
              ['counts = [[0] * len(vocab) for _ in vocab]', ['A square table of zeros: one row and one column per word. `counts[a][b]` will be how often word `b` appears near word `a`.']],
              ['for j in range(max(0, i - window), min(len(s), i + window + 1)):', ['The **window**: positions up to `window` words before and after `i`. `max` and `min` stop it running off either end of the sentence.']],
              ['if j != i:', ['A word isn’t its own neighbour.']],
              ['counts[index[w]][index[s[j]]] += 1', ['One more time `s[j]` was seen near `w`. Every pair is counted from both sides, so the table is **symmetric**: `counts[a][b] == counts[b][a]`.']],
            ],
          },
        },
        { python: { program: 'cooccurrence', label: 'Watch the counting in real Python' } },
        { figure: 'CooccurrenceExplorer', caption: 'A word’s company: its row of the table, biggest counts first. Change the window and watch the counts change. The right-hand list is lesson 4.2’s fix.' },
        {
          predict: {
            prompt: 'With a window of 2, how many times does “the” appear within 2 words of “chain” in the bike-shop text?',
            compute: () => cnt('chain', 'the'), answer: cnt('chain', 'the'),
            explain: `**${cnt('chain', 'the')}**: more than any other word. That is the problem with raw counts, and lesson 4.2’s subject: “the” is near everything, so it says nothing about chains in particular.`,
          },
        },
        {
          derive: {
            title: 'How many pairs one sentence gives',
            intro: 'A sentence of $L$ words, with a window of $w$ each side (and $L > w$).',
            steps: [
              { prompt: 'For a 6-word sentence with window 2, count the neighbours of each position: 2, 3, 4, 4, 3, 2. How many (word, neighbour) pairs in all?', number: 18, compute: () => V.cooccurrence([['a', 'b', 'c', 'd', 'e', 'f']], 2)[1].flat().reduce((s, x) => s + x, 0), why: 'Words near the ends have fewer neighbours: $2+3+4+4+3+2 = 18$.' },
              { prompt: 'Without the ends, every word would have $2w$ neighbours: $2wL$. Each end loses $1 + 2 + \\dots + w$. Write the total as a formula in $L$ and $w$.', answer: '2*w*L - w*(w+1)', vars: { L: [5, 40], w: [1, 4] }, why: 'Each end loses $\\frac{w(w+1)}{2}$, two ends lose $w(w+1)$: total $2wL - w(w+1)$. For $L = 6, w = 2$: $24 - 6 = 18$ ✓.', hint: '$1 + 2 + \\dots + w = \\frac{w(w+1)}{2}$, and there are two ends.' },
            ],
          },
        },
        {
          write: {
            file: 'vectors.py', fn: 'cooccurrence', given: ['vocabulary'],
            prompt: 'Write `cooccurrence(sentences, window=2)`: return `(vocab, counts)`, with `counts[a][b]` the number of times word `b` is within `window` words of word `a`.',
            starter: 'def cooccurrence(sentences, window=2):\n    vocab = vocabulary(sentences)\n    index = {w: k for k, w in enumerate(vocab)}\n    counts = [[0] * len(vocab) for _ in vocab]\n    # for each word, look at the words up to `window` positions either side\n    return vocab, counts\n',
            cases: cases(V.cooccurrence, [[[['a', 'b', 'c']], 1], [[['the', 'cat', 'sat'], ['the', 'dog', 'sat']], 1], [[['x', 'y', 'x', 'z']], 2]]),
            hint: '`for s in sentences:` / `for i, w in enumerate(s):` / `for j in range(max(0, i - window), min(len(s), i + window + 1)):` / `if j != i: counts[index[w]][index[s[j]]] += 1`.',
          },
        },
      ],
    },

    {
      id: 'pmi', number: '4.2', title: 'PMI: surprising company',
      goal: 'Derive pointwise mutual information, compute PPMI from a table of counts, and see why it finds better neighbours than raw counts.',
      builds: ['cooccurrence'],
      blocks: [
        { h: 'Frequent is not the same as informative' },
        { md: `“the” is near “chain” more than any other word, and near almost every other noun too. What tells you about chains is company that is **more frequent than chance**: if “snapped” appears near “chain” much more often than you would expect from how common each word is, that is informative.

**Pointwise mutual information** measures exactly that: how many times more often two words meet than they would if they were independent, as a log.

$$\\text{PMI}(a, b) = \\log \\frac{P(a, b)}{P(a)\\,P(b)}$$

If $a$ and $b$ were independent, $P(a, b)$ would be exactly $P(a)P(b)$ and the PMI would be $\\log 1 = 0$. More often than chance: positive. Less often: negative. Negative values are unreliable with little data (two rare words that never met might just be unlucky), so the usual version keeps only the positive part: **PPMI** $= \\max(0, \\text{PMI})$.` },
        {
          derive: {
            title: 'PMI from a table of counts',
            intro: 'Let $c$ be the count of the pair, $r_a$ the total of row $a$, $c_b$ the total of column $b$, and $T$ the total of the whole table.',
            steps: [
              { prompt: '$P(a, b) = c/T$, $P(a) = r_a/T$, $P(b) = c_b/T$. Simplify $\\dfrac{P(a,b)}{P(a)P(b)}$ to a formula in $c$, $T$, $r_a$ (type `r`) and $c_b$ (type `k`).', answer: 'c*T/(r*k)', vars: { c: [1, 10], T: [100, 1000], r: [10, 50], k: [10, 50] }, why: '$\\frac{c/T}{(r_a/T)(c_b/T)} = \\frac{c\\,T}{r_a c_b}$: one $T$ cancels.' },
              { prompt: 'Two words whose pair count is exactly what chance predicts ($c = r_a c_b / T$). What is their PMI?', number: 0, compute: () => Math.log(1), why: '$\\log 1 = 0$: independent words have nothing to say about each other.' },
              { prompt: `In the bike-shop table, “chain” and “snapped” meet $c = ${cnt('chain', 'snapped')}$ times; the row of “chain” adds up to ${rowTotal('chain')}, the column of “snapped” to ${rowTotal('snapped')}, and the whole table to $T = ${T}$. What is their PPMI, $\\max(0, \\log\\frac{cT}{r_a c_b})$? (2 decimal places.)`, number: PPMI[CO_VOCAB.indexOf('chain')][CO_VOCAB.indexOf('snapped')], compute: () => PPMI[CO_VOCAB.indexOf('chain')][CO_VOCAB.indexOf('snapped')], tolerance: 0.006, why: 'Positive: they meet more often than their frequencies predict. And “the”, which met “chain” more often, scores ' + PPMI[CO_VOCAB.indexOf('chain')][CO_VOCAB.indexOf('the')].toFixed(3) + ': its high count is no surprise.' },
            ],
          },
        },
        {
          code: {
            file: 'vectors.py', fn: 'ppmi', notes: [
              ['total = sum(sum(row) for row in counts)', ['$T$: every count in the table.']],
              ['rows = [sum(row) for row in counts]', ['$r_a$ for every row.']],
              ['cols = [sum(col) for col in zip(*counts)]', ['$c_b$ for every column. `zip(*counts)` turns rows into columns: the `*` passes each row as a separate argument to `zip`.']],
              ['if c == 0:', ['A pair never seen: $\\log 0$ would be $-\\infty$; PPMI calls it 0.']],
              ['out_row.append(max(0.0, math.log(c * total / (rows[a] * cols[b]))))', ['$\\max(0, \\log \\frac{cT}{r_a c_b})$, exactly the formula derived above.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'A word that appears near **every** word with exactly the frequency chance predicts. What is its PPMI with any of them?',
            compute: () => V.ppmi([[1, 1], [1, 1]])[0][1], answer: 0,
            explain: '**0**: in a table where every count is what the row and column totals predict, $cT/(r_a c_b) = 1$ everywhere. Such a word is pure noise, and PPMI erases it.',
          },
        },
        { md: `Compare the two lists in lesson 4.1’s figure for a few words. The PPMI neighbours of “chain” are ${nearP('chain').join(', ')}, and of “monday” ${nearP('monday').join(', ')}. Better than raw counts, but still odd: with only ${SENTENCES.length} sentences, a single sentence (“a service checks the chain…”) can decide a word's best neighbour. And every vector still has ${CO_VOCAB.length} numbers, mostly zeros. The next lessons squeeze them into a few numbers that carry the pattern.` },
        {
          write: {
            file: 'vectors.py', fn: 'ppmi', prelude: 'import math',
            prompt: 'Write `ppmi(counts)`: from a square table of counts, the table of PPMI values (0.0 wherever the count is 0).',
            starter: 'def ppmi(counts):\n    total = sum(sum(row) for row in counts)\n    rows = [sum(row) for row in counts]\n    cols = [sum(col) for col in zip(*counts)]\n    # for each cell: 0.0 if the count is 0, else max(0, log(c * total / (row total * column total)))\n    pass\n',
            cases: cases(V.ppmi, [[[[0, 2], [2, 0]]], [[[0, 1, 1], [1, 0, 0], [1, 0, 0]]], [[[1, 1], [1, 1]]], [[[4, 1, 0], [1, 0, 2], [0, 2, 0]]]]),
            hint: 'Build each row with a loop over `enumerate(row)`; `math.log(c * total / (rows[a] * cols[b]))`.',
          },
        },
      ],
    },

    {
      id: 'word-map', number: '4.3', title: 'A map of words: power iteration',
      goal: 'Find the directions in which word vectors spread out most by repeated multiplication, and use them to draw every word on a 2-D map.',
      builds: ['pmi'],
      blocks: [
        { h: 'Too many dimensions to see' },
        { md: `Each PPMI vector has ${CO_VOCAB.length} numbers: a point in ${CO_VOCAB.length}-dimensional space. To look at the words you need two numbers each. The best two are the **directions in which the points spread out most**: project every point onto them, and as much of the pattern as possible survives. Those directions are called the **principal components**, and finding them is **PCA**.

First, measure how the points spread: the **covariance matrix**. For directions $a$ and $b$ it is the average of (how far each point is from the mean along $a$) × (along $b$). Its entry is big when the points vary a lot, together, in those directions. The direction of greatest spread is its **top eigenvector**: a direction $e$ that the matrix only stretches, never turns: $M e = \\lambda e$, with the biggest stretch $\\lambda$.` },
        {
          derive: {
            title: 'Why multiplying again and again finds the top direction',
            intro: 'Write any starting vector as a mix of two eigenvectors: $x = a_1 e_1 + a_2 e_2$, where $M$ stretches $e_1$ by $\\lambda_1$ and $e_2$ by a smaller $\\lambda_2$.',
            steps: [
              { prompt: '$M e_1 = \\lambda_1 e_1$. Applying $M$ $k$ times multiplies $e_1$ by what? A formula in $\\lambda_1$ (type `l1`) and $k$.', answer: 'l1^k', vars: { l1: [0.5, 3], k: [1, 6] }, why: 'Each multiplication stretches $e_1$ by $\\lambda_1$ again: $M^k x = a_1\\lambda_1^k e_1 + a_2 \\lambda_2^k e_2$.' },
              { prompt: 'So after $k$ steps, the $e_2$ part compared with the $e_1$ part has shrunk by the factor $(\\lambda_2/\\lambda_1)^k$. With $\\lambda_2 / \\lambda_1 = 0.5$, what is that factor after 10 steps?', number: 0.5 ** 10, compute: () => 0.5 ** 10, tolerance: 1e-5, why: '$0.5^{10} \\approx 0.001$: the $e_2$ part has all but vanished, and what is left points along $e_1$.' },
              { prompt: 'The vector also grows like $\\lambda_1^k$ and would overflow, so each step divides it by its length. Does that change its direction? (1 for yes, 0 for no.)', number: 0, compute: () => 0, why: 'Dividing by a positive number only changes length. That is the whole algorithm: multiply, divide by the length, repeat: **power iteration**.' },
            ],
            result: 'For the second direction, do the same while subtracting, at every step, the part of the vector that points along the first direction (it is already explained). What remains converges to the next-biggest eigenvector.',
          },
        },
        {
          code: {
            file: 'vectors.py', fn: 'top_directions', notes: [
              ['mean = [', ['The average point. Spread is measured from the middle of the cloud, not from 0.']],
              ['cov = [[', ['The covariance matrix: entry $(a, b)$ is the average of $c_a c_b$ over the centred points $c$.']],
              ['x = [1.0] * dim', ['Any starting direction works, unless it happens to have no $e_1$ part at all; all ones is a fixed, reproducible start.']],
              ['y = [dot(row, x) for row in cov]', ['$y = Mx$: each entry of the result is a row of the matrix dotted with $x$.']],
              ['along = dot(y, d)', ['How much of $y$ points along a direction already found…']],
              ['y = [p - along * q for p, q in zip(y, d)]', ['…removed, so the search finds a new direction (this is Gram–Schmidt, one step at a time).']],
              ['x = [p / size for p in y]', ['Divide by the length so the numbers stay sensible: only the direction matters.']],
            ],
          },
        },
        {
          code: {
            file: 'vectors.py', fn: 'project', notes: [
              ['return [[dot(', ['A word’s map coordinates: its vector minus the mean, dotted with each direction. A dot product with a unit-length direction is the distance along it.']],
            ],
          },
        },
        { figure: 'WordMap', props: { source: 'ppmi' }, caption: `Every word’s PPMI vector (${CO_VOCAB.length} numbers) drawn as 2. The colours mark the topics so you can judge the map; the program never saw them. Click a word for its nearest neighbours in all ${CO_VOCAB.length} dimensions.` },
        {
          predict: {
            prompt: 'With $\\lambda_2/\\lambda_1 = 0.9$ (two directions of nearly equal spread), how many steps until $(0.9)^k$ is below 0.001? (The smallest whole number $k$.)',
            compute: () => Math.ceil(Math.log(0.001) / Math.log(0.9)), answer: Math.ceil(Math.log(0.001) / Math.log(0.9)),
            explain: `$k > \\log(0.001)/\\log(0.9) \\approx ${(Math.log(0.001) / Math.log(0.9)).toFixed(1)}$, so **${Math.ceil(Math.log(0.001) / Math.log(0.9))}** steps. When the top two directions spread almost equally, power iteration is slow; this lab uses 100 steps.`,
          },
        },
        {
          write: {
            file: 'vectors.py', fn: 'nearest', also: COSINE, prelude: 'import math',
            prompt: 'Write `nearest(vocab, vectors, word, n=5)`: the `n` other words with the highest cosine to `word`, as `(cosine, word)` pairs, best first, ties alphabetical. `cosine` is written for you.',
            starter: 'def nearest(vocab, vectors, word, n=5):\n    k = vocab.index(word)\n    # score every other word, sort best first (ties alphabetical), keep n\n    pass\n',
            cases: cases(V.nearest, [[['a', 'b', 'c', 'd'], [[1, 0], [0.9, 0.1], [0, 1], [-1, 0]], 'a', 2], [['x', 'y', 'z'], [[1, 1], [2, 2], [1, -1]], 'x', 2], [CO_VOCAB.slice(0, 5), PPMI.slice(0, 5).map(r => r.slice(0, 5)), CO_VOCAB[0], 3]]),
            hint: '`scores = [(cosine(vectors[k], v), w) for w, v in zip(vocab, vectors) if w != word]`, then `sorted(scores, key=lambda pair: (-pair[0], pair[1]))[:n]`.',
          },
        },
      ],
    },

    {
      id: 'word2vec', number: '4.4', title: 'word2vec: learning vectors by predicting neighbours',
      goal: 'Derive the gradient of skip-gram with negative sampling, follow one update number by number, and train word vectors by hand while the map moves.',
      builds: ['word-map', 'intent-bot'],
      blocks: [
        { added: true, kind: 'recall', note: 'Each word has a number, its place in the vocabulary (lesson 3.1), and a word\'s **vector** is the row of a table found by that number (lesson 4.1). Two vectors\' **dot product** multiplies them entry by entry and adds: large when they point the same way (lesson 3.1). Here the rows are not counted but learned, by gradient descent.' },
        { h: 'Learn the vectors instead of counting them' },
        { python: { program: 'word2vec', label: 'Step through one pass of training in real Python' } },
        { md: `PPMI vectors are long, sparse and noisy. In 2013 Tomas Mikolov and colleagues at Google showed a better way, **word2vec**: give every word a short vector of, say, 16 numbers, start them at random, and **train** them on one task: predict which words appear near which.

The version here is **skip-gram with negative sampling**. For every word in the text (the **centre**) and every word in its window (the **context**):

1. Real pair: make the model say “yes, these are neighbours”.
2. Pick a few words at random (**negative samples**) and make it say “no” for those.

The model is as small as possible. Each word has a centre vector $u$ and a context vector $v$, and the model’s probability that two words are neighbours is $\\sigma(u \\cdot v)$, where $\\sigma(s) = \\frac{1}{1 + e^{-s}}$, the **sigmoid**, squashes any number into a probability between 0 and 1. A big dot product (vectors pointing the same way) means “yes”.

To say yes more often for real neighbours, words that share contexts must point the same way. That is the whole trick: the vectors are a side effect of the prediction task, and they end up encoding meaning.` },
        {
          code: {
            file: 'vectors.py', fn: 'sigmoid', notes: [
              ['return 1 / (1 + math.exp(-x))', ['Big positive $x$: $e^{-x} \\approx 0$, so $\\sigma \\approx 1$. Big negative: $e^{-x}$ huge, $\\sigma \\approx 0$. At 0: exactly 0.5.']],
            ],
          },
        },
        {
          derive: {
            title: 'The gradient of one pair',
            intro: 'Write $s = u \\cdot v$ and $p = \\sigma(s)$. Training lowers the **loss** $L$: for a real pair $L = -\\log p$ (small when $p$ is near 1), for a random pair $L = -\\log(1 - p)$. Use the sigmoid’s derivative, $\\frac{dp}{ds} = p(1 - p)$.',
            steps: [
              { prompt: 'Real pair: $\\frac{dL}{ds} = -\\frac{1}{p}\\cdot\\frac{dp}{ds}$. Simplify it to a formula in $p$.', answer: 'p - 1', vars: { p: [0.01, 0.99] }, why: '$-\\frac{1}{p} \\cdot p(1-p) = -(1 - p) = p - 1$.' },
              { prompt: 'Random pair: $L = -\\log(1-p)$, so $\\frac{dL}{ds} = \\frac{1}{1-p}\\cdot\\frac{dp}{ds}$. Simplify.', answer: 'p', vars: { p: [0.01, 0.99] }, why: '$\\frac{1}{1-p} \\cdot p(1-p) = p$.' },
              { prompt: 'With label $y$ = 1 for real and 0 for random, both cases are $\\frac{dL}{ds} = p - y$. Since $s = u \\cdot v$, $\\frac{ds}{du} = v$. Gradient descent moves $u$ by $-\\eta \\frac{dL}{du}$. Write that change with $g = y - p$: a formula in $\\eta$ (type `eta`), $g$ and $v$.', answer: 'eta*g*v', vars: { eta: [0.01, 1], g: [-1, 1], v: [-2, 2] }, why: '$-\\eta (p - y) v = \\eta\\,g\\,v$: move $u$ towards $v$ when $g > 0$ (a real pair the model doubted), away when $g < 0$. And $v$ moves by $\\eta\\,g\\,u$, by symmetry.' },
              { prompt: 'For $u = [0.5, -1, 2]$ and $v = [1, 0.25, -0.5]$, a real pair: $u \\cdot v = -0.75$. What is $g = 1 - \\sigma(-0.75)$, to 3 decimals?', number: 1 - V.sigmoid(-0.75), compute: () => V.pairGradient([0.5, -1, 2], [1, 0.25, -0.5], 1)[0][0], tolerance: 0.0006, why: '$\\sigma(-0.75) \\approx 0.321$, so $g \\approx 0.679$: the model thought these were probably *not* neighbours, so the push is strong. (The first entry of the change for $u$ is $g \\cdot v_1 = g$.)' },
            ],
            result: 'One pair, one update: $u \\leftarrow u + \\eta\\,g\\,v$, $v \\leftarrow v + \\eta\\,g\\,u$, with $g = y - \\sigma(u\\cdot v)$. This is the same gradient as logistic regression, and the same shape as every neural network’s update in Part 5.',
          },
        },
        {
          code: {
            file: 'vectors.py', fn: 'pair_gradient', notes: [
              ['g = label - sigmoid(dot(u, v))', ['$g = y - \\sigma(u \\cdot v)$: how wrong the model was, and in which direction.']],
              ['return [g * b for b in v], [g * a for a in u]', ['The changes: $g\\,v$ for $u$ and $g\\,u$ for $v$ (the trainer multiplies them by the learning rate).']],
            ],
          },
        },
        { figure: 'PairUpdate', caption: 'One update with every number shown. Change the vectors, the label and the learning rate: the probability should move towards the label. With a learning rate that is too big, it overshoots.' },
        {
          code: {
            file: 'vectors.py', fn: 'train_word2vec', notes: [
              ['rng = Rng(seed)', ['A random-number generator with a fixed seed (written out in the file so that this page’s JavaScript makes exactly the same numbers): the same seed, the same training, every time.']],
              ['w_in = [[(rng.random() - 0.5) / dim', ['Centre vectors start as small random numbers, so different words start pointing different ways.']],
              ['w_out = [[0.0] * dim', ['Context vectors start at zero: every probability starts at $\\sigma(0) = 0.5$, “no idea”.']],
              ['pairs = [(index[s[j]], 1)] + [(rng.below(len(vocab)), 0)', ['The real context word with label 1, and `negatives` random words with label 0. (Real word2vec picks common words more often, with probability proportional to count$^{0.75}$; this lab picks uniformly to keep the code short.)']],
              ['loss -= math.log(max(1e-12', ['Add up the loss, to watch it fall. `max(1e-12, …)` avoids $\\log 0$.']],
              ['change_in, change_out = pair_gradient(', ['The gradient derived above…']],
              ['w_in[c] = [a + lr * g', ['…applied: $u \\leftarrow u + \\eta\\,g\\,v$.']],
              ['w_out[o] = [b + lr * g', ['$v \\leftarrow v + \\eta\\,g\\,u$.']],
              ['losses.append(loss)', ['One loss per pass over the text: the learning curve.']],
            ],
          },
        },
        {
          predict: {
            prompt: `With a window of 2, how many (centre, context) pairs does one pass over the ${SENTENCES.length} sentences visit? (Each one then makes 1 real and 3 random updates.)`,
            compute: () => pairsPerPass, answer: pairsPerPass,
            explain: `**${pairsPerPass}** pairs, so ${pairsPerPass * 4} updates per pass, and ${pairsPerPass * 4 * 40} in 40 passes. Each is a few multiplications on 16 numbers: about a second of plain Python, a fraction of a second here.`,
          },
        },
        { figure: 'Word2vecTrainer', caption: 'Watch it learn. Each pass over the text, every word’s vector moves, and the map is redrawn from the new vectors. The loss falls; the colours (which the program never sees) gather into groups. Try a different seed: the map comes out rotated or mirrored, but the groups are the same.' },
        { md: `After 40 passes the loss has fallen from ${LOSSES[0].toFixed(0)} to ${LOSSES.at(-1).toFixed(0)}, and the neighbours are much better than PPMI’s: “chain” → ${near('chain').join(', ')}; “monday” → ${near('monday').join(', ')}; “order” → ${near('order').join(', ')}. Nobody told it that chains and tyres are both bike parts. It found that out from where they appear.` },
        {
          write: {
            file: 'vectors.py', fn: 'pair_gradient', given: ['sigmoid'], also: [['counting.py', 'dot']], prelude: 'import math',
            prompt: 'Write `pair_gradient(u, v, label)`: return the change for `u` and the change for `v`, `(g·v, g·u)` with `g = label − sigmoid(u · v)`. `sigmoid` and `dot` are written for you.',
            starter: 'def pair_gradient(u, v, label):\n    # g = label - sigmoid(dot(u, v)); then the two lists\n    pass\n',
            cases: cases(V.pairGradient, [[[0.5, -1, 2], [1, 0.25, -0.5], 1], [[0.5, -1, 2], [1, 0.25, -0.5], 0], [[0, 0], [0, 0], 1], [[3, 3], [3, 3], 1]]),
            hint: '`g = label - sigmoid(dot(u, v))`, then `return [g * b for b in v], [g * a for a in u]`.',
          },
        },
      ],
    },

    {
      id: 'analogies', number: '4.5', title: 'Neighbours, analogies, and what vectors get wrong',
      goal: 'Do arithmetic on word vectors, find out which analogies this small text supports, and name the limits of word vectors.',
      builds: ['word2vec'],
      blocks: [
        { h: 'Directions that mean something' },
        { md: `word2vec became famous for one result: with vectors trained on billions of words, $\\text{king} - \\text{man} + \\text{woman}$ comes out closest to $\\text{queen}$. Differences between vectors can carry relations: if “queen” is to “king” what “woman” is to “man”, the arrow from man to woman is roughly the arrow from king to queen.` },
        {
          derive: {
            title: 'Why the formula is b − a + c',
            intro: '“$a$ is to $b$ as $c$ is to $d$.” Suppose the relation is one arrow $r$: $b = a + r$ and $d = c + r$.',
            steps: [
              { prompt: 'From $b = a + r$, what is $r$ in terms of $a$ and $b$?', answer: 'b - a', vars: { a: [-3, 3], b: [-3, 3] }, why: 'The arrow from $a$ to $b$.' },
              { prompt: 'So $d = c + r$ is what, in terms of $a$, $b$ and $c$?', answer: 'b - a + c', vars: { a: [-3, 3], b: [-3, 3], c: [-3, 3] }, why: 'Compute $b - a + c$, then look for the word whose vector is closest to it (by cosine), leaving out $a$, $b$ and $c$ themselves.' },
            ],
          },
        },
        {
          code: {
            file: 'vectors.py', fn: 'analogy', notes: [
              ['target = [y - x + z', ['$b - a + c$, entry by entry.']],
              ['if w not in (a, b, c)', ['The input words are left out: $b - a + c$ is usually closest to $b$ or $c$ themselves.']],
            ],
          },
        },
        { figure: 'AnalogyBox', caption: 'Try the presets, then your own. The vectors are the ones trained in lesson 4.4.' },
        { md: `On this text, some analogies come out and most don't. “morning : open :: evening : ?” gives **${ANALOGY('morning', 'open', 'evening')[1]}**, which is right (the shop opens in the morning and closes in the evening). “order : parcel :: repair : ?” gives **${ANALOGY('order', 'parcel', 'repair')[1]}**, a reasonable partner. But “chain : chains :: tyre : ?” gives **${ANALOGY('chain', 'chains', 'tyre')[1]}**: “chains” and “tyres” each appear once, in the same sentence, so there is no consistent singular-to-plural arrow to learn.

Analogies need a relation seen many times, in many pairs of words. The famous results came from text about a hundred million times longer than this one. The method is the same; the data is what makes it work.` },
        {
          choice: {
            prompt: 'Why does “chain : chains :: tyre : ?” fail on this text, when “morning : open :: evening : ?” works?',
            options: [
              { text: 'word2vec can’t represent plurals.', why: 'Trained on enough text it does: the plural arrow is one of the classic analogy results.' },
              { text: 'The plural relation appears in only one sentence here, so no consistent arrow from singular to plural is learned; morning/open and evening/close appear in several matching sentences.', why: 'Right. A relation becomes a direction only if many pairs of words share it, many times over.' },
              { text: 'The analogy function has a bug for plural words.', why: 'It treats every word the same. The vectors are the issue, not the arithmetic.' },
            ],
            answer: 1,
            verify: () => ANALOGY('chain', 'chains', 'tyre')[1] !== 'tyres' && ANALOGY('morning', 'open', 'evening')[1] === 'closed',
          },
        },
        {
          write: {
            file: 'vectors.py', fn: 'analogy', also: COSINE, prelude: 'import math',
            prompt: 'Write `analogy(vocab, vectors, a, b, c)`: the `(cosine, word)` of the word closest to `b − a + c`, leaving out `a`, `b` and `c` (ties alphabetical).',
            starter: 'def analogy(vocab, vectors, a, b, c):\n    index = {w: k for k, w in enumerate(vocab)}\n    # target = b - a + c, entry by entry; then the best other word by cosine\n    pass\n',
            cases: cases(V.analogy, [[['man', 'woman', 'king', 'queen', 'apple'], [[1, 0, 0], [1, 1, 0], [1, 0, 1], [1, 1, 1], [0, 0, -1]], 'man', 'woman', 'king'], [['a', 'b', 'c', 'd', 'e'], [[0, 1], [1, 1], [0, 2], [1, 2], [-1, 0]], 'a', 'b', 'c']]),
            hint: '`target = [y - x + z for x, y, z in zip(vectors[index[a]], vectors[index[b]], vectors[index[c]])]`, then score every other word and take the best.',
          },
        },
        { h: 'What word vectors get wrong' },
        { md: `Three limits, all of which the next part has to fix:

- **One vector per word.** “bank” (river) and “bank” (money) get the same vector, a blur of both. The vector can't depend on the sentence the word is in.
- **Order is still gone.** Averaging the vectors of a sentence (lesson 4.6) throws word order away again: “the dog bit the man” and “the man bit the dog” average to the same thing.
- **They learn whatever the text says.** Vectors trained on real text pick up its associations, including unfair ones: in widely used English vectors trained on news text, the occupations closest to “she” included homemaker, nurse and receptionist, and those closest to “he” included captain, architect and philosopher (Bolukbasi et al., 2016). The vectors are a mirror of the training text, and a model built on them inherits what is in it.` },
      ],
    },

    {
      id: 'meaning-bot', number: '4.6', title: 'Bot 2 with meanings',
      goal: 'Turn a sentence into a vector by averaging, remove stop words, and give Bot 2 a sense of which words are related, measuring what improves and what doesn’t.',
      builds: ['analogies'],
      blocks: [
        { h: 'A sentence as a vector' },
        { md: `The simplest way to get a vector for a whole message: average the vectors of its words. Then compare the message with each intent’s example phrases by cosine, and answer with the intent of the closest example. Now “my tyre is flat” can match the repair examples without sharing their exact words, because “tyre” and “flat” sit near “brakes”, “fixing” and “repair” in the vector space.

Tried exactly like that, averaging every word, it fails badly: it answers “do you sell pizza” with **${allWordsReply('do you sell pizza')[1]}** (cosine ${allWordsReply('do you sell pizza')[0].toFixed(2)}). The only known words are “do” and “you”, and “you” also appears in “thank you”. Little words like these, called **stop words**, carry almost no meaning and are in nearly every sentence, so in an average they drown out the words that matter. The standard fix is to drop them first.` },
        {
          code: {
            file: 'vectors.py', assign: 'STOP_WORDS', notes: [
              ['"the", "a", "an"', ['A fixed list: a hand-written rule again, but a tiny one. (TF-IDF from lesson 3.3 does the same job softly: these words have an idf near 0.)']],
            ],
          },
        },
        {
          code: {
            file: 'vectors.py', fn: 'content_words', notes: [
              ['return [w for w in words(text) if w not in STOP_WORDS]', ['The words that carry the meaning: “do you sell pizza” → sell, pizza.']],
            ],
          },
        },
        {
          code: {
            file: 'vectors.py', fn: 'sentence_vector', notes: [
              ['known = [vectors[index[w]] for w in tokens if w in index]', ['Only words that have a vector. A word never seen in training has none.']],
              ['if not known:', ['No known word at all: there is nothing to go on, and the bot should say so.']],
              ['return [sum(column) / len(known) for column in zip(*known)]', ['The average, entry by entry: `zip(*known)` gives the first entries of every vector, then the second entries, and so on.']],
            ],
          },
        },
        {
          code: {
            file: 'vectors.py', fn: 'semantic_reply', notes: [
              ['q = sentence_vector(content_words(message)', ['The message as one vector.']],
              ['examples = [sentence_vector(', ['Every example phrase of the intent as a vector.']],
              ['scores[name] = max(', ['An intent scores the cosine of its **closest** example: a message only needs to resemble one way of asking.']],
              ['if scores[best] < threshold:', ['Not close enough to anything: “not sure”, as in lesson 3.6.']],
            ],
          },
        },
        { python: { program: 'meaning_bot', label: 'Step through the answer in real Python' } },
        { figure: 'MeaningBot', caption: 'The same message answered two ways: Part 3’s word counts on the left, nearest example by meaning on the right. Unknown words are marked.' },
        {
          predict: {
            prompt: 'How similar (cosine) is “my tyre is flat” to the closest repair example? To 2 decimal places.',
            compute: () => reply('my tyre is flat').similarity, answer: reply('my tyre is flat').similarity, tolerance: 0.006,
            explain: `**${reply('my tyre is flat').similarity.toFixed(2)}**. Its content words, tyre and flat, sit near the words of the repair examples (“can you repair a flat tyre” shares both).`,
          },
        },
        { h: 'What got better, and what didn’t' },
        { md: `Measured on the messages Bot 2 struggled with:

| Message | Part 3 (counts) | Part 4 (meaning) |
|---|---|---|
| my chain snapped | ${C.intentReply(C.trainIntents(INTENTS), INTENTS, 'my chain snapped').intent ?? 'not sure'} | ${reply('my chain snapped').intent ?? 'not sure'} (${reply('my chain snapped').similarity.toFixed(2)}) |
| my tyre is flat | ${C.intentReply(C.trainIntents(INTENTS), INTENTS, 'my tyre is flat').intent ?? 'not sure'} | ${reply('my tyre is flat').intent ?? 'not sure'} (${reply('my tyre is flat').similarity.toFixed(2)}) |
| do you sell pizza | ${C.intentReply(C.trainIntents(INTENTS), INTENTS, 'do you sell pizza').intent ?? 'not sure'} | ${reply('do you sell pizza').intent ?? 'not sure'} |
| the delivery is late | ${C.intentReply(C.trainIntents(INTENTS), INTENTS, 'the delivery is late').intent ?? 'not sure'} | ${reply('the delivery is late').intent ?? 'not sure'} (${reply('the delivery is late').similarity.toFixed(2)}) |
| my wheel is bent | ${C.intentReply(C.trainIntents(INTENTS), INTENTS, 'my wheel is bent').intent ?? 'not sure'} | ${reply('my wheel is bent').intent ?? 'not sure'} (${reply('my wheel is bent').similarity.toFixed(2)}) |

“pizza” is now honestly “not sure”: neither of its content words is known. “my chain snapped” is right, but only just: look at the bars in the figure, where “thanks” is almost as close. And “my wheel is bent” is still wrong: “bent” appears once in the whole text, so its vector has learned almost nothing.

The pattern of this whole part: **meaning comes from data**. More text would fix the wheel and widen the chain’s margin. And averaging still ignores order and context, which leads to Part 5: models that read words **in order**, and predict the next one.` },
        {
          write: {
            file: 'vectors.py', fn: 'sentence_vector',
            prompt: 'Write `sentence_vector(tokens, index, vectors)`: the average of the vectors of the tokens that are in `index` (a dictionary from word to row of `vectors`), or `None` if none are.',
            starter: 'def sentence_vector(tokens, index, vectors):\n    known = [vectors[index[w]] for w in tokens if w in index]\n    # None if nothing is known; else the average, entry by entry\n    pass\n',
            cases: cases(V.sentenceVector, [[['a', 'b'], { a: 0, b: 1 }, [[1, 2], [3, 4]]], [['a', 'zzz'], { a: 0 }, [[2, -2]]], [['zzz'], { a: 0 }, [[1, 1]]], [['a', 'a', 'b'], { a: 0, b: 1 }, [[0, 3], [3, 0]]]]),
            hint: '`if not known: return None`, then `[sum(column) / len(known) for column in zip(*known)]`.',
          },
        },
        {
          choice: {
            prompt: 'Which change would most likely fix “my wheel is bent”?',
            options: [
              { text: 'Add more stop words, so that only “bent” is left.', why: '“wheel” is the useful word here. Dropping it makes things worse.' },
              { text: 'More sentences in the training text where “bent” appears with repair words, so its vector learns where it belongs.', why: 'Yes. A word’s vector is only as good as the evidence for it: one sentence isn’t enough.' },
              { text: 'Lower the threshold, so the bot answers more often.', why: 'The bot already answers, with the wrong intent. A lower threshold doesn’t change which intent is closest.' },
            ],
            answer: 1,
            verify: () => reply('my wheel is bent').intent !== 'repair' && BIKE.filter(s => s.includes('bent')).length === 1 && allWordsReply('do you sell pizza')[1] === 'thanks' && reply('do you sell pizza').intent === null && BIKE.filter(s => s.includes('chains') || s.includes('tyres')).length === 1,
          },
        },
      ],
    },
  ],
}
