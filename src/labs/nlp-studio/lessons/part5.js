// Part 5: predicting the next token. Perplexity, sampling and temperature, BPE, a neural language
// model with automatic differentiation, attention, and a tiny GPT trained in the page and saved as
// .safetensors. Numbers come from engine/lm.js and engine/tinygpt.js, which parity5.test.js holds to
// the Python; lessons.test.js checks them all. Training results quoted in the text were measured
// when the lesson was written and are re-checked, on a smaller run, by the choice blocks' verify.
import * as L from '../engine/lm.js'
import * as G from '../engine/tinygpt.js'
import * as C from '../engine/counting.js'
import { count } from '../engine/text.js'
import { SENTENCES } from '../engine/corpus.js'
import { SOURCES } from '../source.js'
import { heldOut, SPLIT } from '../engine/heldout.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const lineOf = (file, text) => SOURCES[file].split('\n').findIndex(l => l.startsWith(text)) + 1
const TENSOR = { file: 'tinygpt.py', from: lineOf('tinygpt.py', 'class Tensor'), to: lineOf('tinygpt.py', 'def zeros') - 3 }
const BEST = heldOut(0.3), V = BEST.V
const MERGES = L.trainBpe(count(C.words(SENTENCES.join(' '))), 120)
const TINY = G.toSafetensors(['a', 'b'], G.initModel(2, 2, 2, 2, 1))
// The figure's model: 32 numbers per character, 24 characters of context, an MLP 4x wider.
const FIGURE_MODEL = G.initModel(G.vocabOf(SENTENCES.join('. ') + '.').length, 32, 24, 128)
const WEIGHTS = G.PARAMS.reduce((s, n) => s + FIGURE_MODEL[n].length * FIGURE_MODEL[n][0].length, 0)
const TRAIN_CHARS = G.splitText(SENTENCES.join('. ') + '.')[0].length
const approx = n => (Math.round(n / 100) * 100).toLocaleString('en-GB')
const bikeText = SENTENCES.join('. ') + '.'
// A quick re-check of the lesson's training claims (smaller and shorter than the figure's run).
const quick = useAttention => { const t = G.makeTrainer(bikeText, { dim: 16, hidden: 64, context: 16, lr: 0.01, useAttention }); t.step(1500); return t.losses.slice(-200).reduce((s, x) => s + x, 0) / 200 }

export const PART5 = {
  id: 'part5', title: 'Part 5 · Predicting the next token', lessons: [
    {
      id: 'language-model', number: '5.1', title: 'What a language model is, and how to score one',
      goal: 'Say exactly what a language model computes, measure one with perplexity on text it hasn’t seen, and see why counting words runs out of data.',
      builds: ['ngrams', 'meaning-bot'],
      blocks: [
        { h: 'One question, asked again and again' },
        { md: `A **language model** answers one question: *given the text so far, how likely is each possible next token?* That is all. The chatbots you have used are language models: they write a reply by asking that question, picking a token, adding it to the text, and asking again.

You built one in lesson 3.2: the bigram model, which looks only at the previous word. This part builds better ones, ending with a tiny GPT. But first: how do you tell a good language model from a bad one?` },
        { h: 'Perplexity' },
        { md: `Give the model text it has **never seen**, and at every position ask how much probability it gave to the token that really came next. A good model gives the real next token high probability. Average the negative logs (the **loss**, as in lesson 3.4), and undo the log:

$$\\text{perplexity} = \\exp\\Big(-\\frac{1}{N}\\sum_{i=1}^{N} \\log P(\\text{token}_i \\mid \\text{what came before})\\Big)$$

It has a plain meaning: a perplexity of 20 means the model is, on average, as unsure as if it were choosing among **20 equally likely** tokens. Lower is better; 1 would be perfect.` },
        {
          derive: {
            title: 'Perplexity of a model that knows nothing',
            intro: 'A model that gives every one of $V$ tokens the same probability, $1/V$, at every step.',
            steps: [
              { prompt: 'What is $\\log P$ for each token? A formula in $V$.', answer: '-log(V)', vars: { V: [2, 1000] }, why: '$\\log(1/V) = -\\log V$.' },
              { prompt: 'The average of $-\\log P$ over $N$ tokens is then? (In $V$.)', answer: 'log(V)', vars: { V: [2, 1000] }, why: 'Every term is the same, $\\log V$, so the average is too.' },
              { prompt: 'So the perplexity, $e^{\\text{that}}$, is?', answer: 'V', vars: { V: [2, 1000] }, why: '$e^{\\log V} = V$. Guessing uniformly among $V$ words scores exactly $V$: the meaning of the number, checked.' },
              { prompt: 'A character model has an average loss of 0.81 (natural log). What is its perplexity, to 2 decimal places?', number: Math.exp(0.81), compute: () => L.perplexity([-0.81]), tolerance: 0.006, why: '$e^{0.81} \\approx 2.25$: like choosing among about 2 characters each time.' },
            ],
          },
        },
        {
          code: {
            file: 'lm.py', fn: 'perplexity', notes: [
              ['return math.exp(-sum(log_probs) / len(log_probs))', ['The average negative log-probability, then `exp`: the formula above, in one line.']],
            ],
          },
        },
        { figure: 'PerplexityDemo', caption: `The bigram model of lesson 3.2, trained on the first ${SPLIT} bike-shop sentences and scored on the other ${SENTENCES.length - SPLIT}. Move the smoothing: with k = 0 a single unseen pair makes the perplexity infinite.` },
        { md: `The result is humbling. Guessing uniformly among the ${V} words scores ${V}. The bigram model, at its best smoothing, scores about **${BEST.perplexity.toFixed(0)}**: hardly better. With ${SPLIT} sentences, most word pairs in new text have never been seen, so the model falls back on the smoothing, which is just guessing.

Counting whole words needs enormous amounts of text: there are too many words, and far too many pairs of words. Two ideas fix this, and the rest of this part builds both. Smaller units (characters and **subword tokens**, lesson 5.3) are seen far more often. And a **neural network** (lesson 5.4) can generalise from what it has seen instead of only counting it.` },
        {
          write: {
            file: 'lm.py', fn: 'perplexity', prelude: 'import math',
            prompt: 'Write `perplexity(log_probs)`: from a list of log-probabilities (natural logs), the exponential of their average, negated.',
            starter: 'def perplexity(log_probs):\n    # exp of minus the average\n    pass\n',
            cases: cases(L.perplexity, [[[-0.5, -1, -2]], [Array(4).fill(Math.log(1 / 10))], [[-0.01]], [[0, 0, 0]]]),
            hint: '`return math.exp(-sum(log_probs) / len(log_probs))`',
          },
        },
      ],
    },

    {
      id: 'sampling', number: '5.2', title: 'Sampling and temperature',
      goal: 'Pick the next token at random in proportion to its probability, and use temperature to trade sense for variety.',
      builds: ['language-model'],
      blocks: [
        { h: 'Why not always take the most likely token?' },
        { md: `Lesson 3.2 always took the most likely next word, and it looped: “claim your free entry is waiting can you have …”. Always taking the top token (**greedy** decoding) is predictable and repetitive. Real chatbots **sample**: they pick the next token at random, with each token's chance equal to its probability.

Sampling needs one random number $r$ between 0 and 1. Lay the probabilities end to end along the line from 0 to 1; whichever piece $r$ lands in is the pick. A token with probability 0.5 owns half the line, so it is picked half the time.` },
        {
          code: {
            file: 'lm.py', fn: 'sample', notes: [
              ['total += p', ['The running total: where this token’s piece of the line ends.']],
              ['if r < total:', ['`r` landed in this token’s piece.']],
              ['return len(probs) - 1', ['If rounding left the total just under 1 and `r` is above it, take the last token rather than nothing.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'Probabilities `[0.2, 0.5, 0.3]` and the random number `r = 0.69`. Which index does `sample` return?',
            compute: () => L.sample([0.2, 0.5, 0.3], 0.69), answer: L.sample([0.2, 0.5, 0.3], 0.69),
            explain: 'The pieces are 0–0.2 (index 0), 0.2–0.7 (index 1) and 0.7–1 (index 2). 0.69 is in the middle piece: **1**.',
            misconceptions: [{ answer: 2, feedback: 'The running totals are 0.2, 0.7, 1.0. Is 0.69 below 0.7?' }],
          },
        },
        { h: 'Temperature' },
        { md: `Before the softmax, divide every score by a number $T$, the **temperature**:

$$P(i) = \\frac{e^{s_i/T}}{\\sum_j e^{s_j/T}}$$

$T = 1$ leaves the probabilities as they are. A small $T$ stretches the gaps between scores, so the top token takes almost everything: safe, repetitive text. A large $T$ shrinks the gaps, so every token gets a similar share: varied text that soon stops making sense. “Temperature” in a chatbot's settings is exactly this number.` },
        {
          derive: {
            title: 'Temperature at its extremes',
            intro: 'Scores $[2, 1, 0.1]$.',
            steps: [
              { prompt: 'At $T = 0.1$ (the scores become $[20, 10, 1]$), what probability does the top token get? (To 4 decimal places.)', number: L.softmax([2, 1, 0.1], 0.1)[0], compute: () => L.softmax([2, 1, 0.1], 0.1)[0], tolerance: 0.00006, why: '$e^{20} / (e^{20} + e^{10} + e^{1}) \\approx 0.99995$: greedy, in effect.' },
              { prompt: 'At $T = 10$, what does the top token get? (To 3 decimal places.)', number: L.softmax([2, 1, 0.1], 10)[0], compute: () => L.softmax([2, 1, 0.1], 10)[0], tolerance: 0.0006, why: `About ${L.softmax([2, 1, 0.1], 10)[0].toFixed(3)}, close to $1/3$: nearly uniform.` },
              { prompt: 'As $T$ grows without limit, every token’s probability tends to what, with $n$ tokens?', answer: '1/n', vars: { n: [2, 50] }, why: 'Every $s_i / T \\to 0$, every $e^0 = 1$: each token gets $1/n$.' },
            ],
          },
        },
        {
          code: {
            file: 'lm.py', fn: 'softmax', notes: [
              ['scaled = [x / temperature for x in logits]', ['Divide by the temperature first.']],
              ['exps = [math.exp(x - top) for x in scaled]', ['Then the safe softmax of lesson 3.6: subtract the biggest before exponentiating.']],
            ],
          },
        },
        {
          code: {
            file: 'lm.py', fn: 'generate_bigram', notes: [
              ['probs = softmax([math.log(after[w]) for w in options], temperature)', ['The scores are the log counts, so at $T = 1$ the probabilities are exactly the counts’ shares (softmax of $\\log c$ is $c / \\sum c$).']],
              ['out.append(options[sample(probs, rng.random())])', ['Sample, append, and ask again with the new last word.']],
            ],
          },
        },
        { figure: 'TemperatureSampler', caption: 'Next-word probabilities after a word, at the temperature you choose, and text sampled from them. Try T = 0.2, then 1, then 4.' },
        {
          write: {
            file: 'lm.py', fn: 'sample',
            prompt: 'Write `sample(probs, r)`: walk along the probabilities keeping a running total, and return the first index where `r` is below it (or the last index).',
            starter: 'def sample(probs, r):\n    total = 0.0\n    # add each probability; return its index once r < total\n    return len(probs) - 1\n',
            cases: cases(L.sample, [[[0.2, 0.5, 0.3], 0], [[0.2, 0.5, 0.3], 0.19], [[0.2, 0.5, 0.3], 0.2], [[0.2, 0.5, 0.3], 0.69], [[0.2, 0.5, 0.3], 0.7], [[1], 0.5]]),
            hint: '`for i, p in enumerate(probs): total += p` then `if r < total: return i`.',
          },
        },
      ],
    },

    {
      id: 'bpe', number: '5.3', title: 'BPE: tokens between characters and words',
      goal: 'Build a subword vocabulary merge by merge, encode any word with it, and see why modern language models never meet an unknown word.',
      builds: ['sampling', 'text-is-characters'],
      blocks: [
        { h: 'Words are too many, characters too few' },
        { md: `Whole words make a huge vocabulary, and any word not in it is unknown. Characters make a tiny vocabulary with no unknowns, but every word becomes a long sequence and the model has to learn spelling. **Byte-pair encoding** (BPE) finds a middle way, learned from the text itself:

1. Start with single characters (plus an end-of-word marker, written \`_\` here).
2. Count every pair of neighbouring symbols across the text.
3. Merge the most frequent pair into one new symbol, everywhere.
4. Repeat, as many times as you want tokens.

Frequent words end up as one token; rare words as a few pieces; never-seen words still break into known pieces, down to single characters if needed. GPT models use exactly this, on the UTF-8 bytes of lesson 1.1 instead of characters.` },
        {
          code: {
            file: 'lm.py', fn: 'pair_counts', notes: [
              ['for a, b in zip(symbols, symbols[1:]):', ['`zip` of a sequence with itself shifted by one gives every neighbouring pair.']],
              ['pairs[(a, b)] = pairs.get((a, b), 0) + n', ['Weighted by how often the word occurs: “the” counts as many times as it appears.']],
            ],
          },
        },
        {
          code: {
            file: 'lm.py', fn: 'merge_pair', notes: [
              ['if i + 1 < len(symbols) and symbols[i] == pair[0] and symbols[i + 1] == pair[1]:', ['The pair starts here: join the two symbols, and skip both.']],
              ['i += 2', ['Jump past the merged pair, so an overlap like a a a merges only once from the left.']],
            ],
          },
        },
        {
          code: {
            file: 'lm.py', fn: 'train_bpe', notes: [
              ['words = {tuple(w) + ("_",): n for w, n in word_counts.items()}', ['Each word as a tuple of single characters plus the end marker, with its count.']],
              ['best = min(pairs, key=lambda p: (-pairs[p], p))', ['The most frequent pair; ties broken alphabetically so the result is always the same.']],
              ['words = {merge_pair(s, best): n for s, n in words.items()}', ['Apply the merge to every word.']],
            ],
          },
        },
        {
          code: {
            file: 'lm.py', fn: 'bpe_encode', notes: [
              ['for pair in merges:', ['Encoding a new word replays the merges **in the order they were learned**. That order matters: later merges build on earlier ones.']],
            ],
          },
        },
        { python: { program: 'bpe', label: 'Watch the merges in real Python' } },
        { figure: 'BpeBuilder', caption: 'Learn up to 120 merges from the bike-shop text and encode any word. Watch the first merges: the end marker and “th”, because “the” is everywhere.' },
        {
          predict: {
            prompt: 'After 120 merges learned from the bike-shop text, how many tokens is “mechanic”?',
            compute: () => L.bpeEncode('mechanic', MERGES).length, answer: L.bpeEncode('mechanic', MERGES).length,
            explain: `**${L.bpeEncode('mechanic', MERGES).length}**: ${L.bpeEncode('mechanic', MERGES).join(' · ')}. It is frequent enough in the text to have become one token. After only 10 merges it is ${L.bpeEncode('mechanic', MERGES.slice(0, 10)).length} tokens. And “zebra”, never in the text: ${L.bpeEncode('zebra', MERGES).join(' · ')}.`,
          },
        },
        {
          write: {
            file: 'lm.py', fn: 'merge_pair',
            prompt: 'Write `merge_pair(symbols, pair)`: return the symbols as a tuple, with every `pair[0]` immediately followed by `pair[1]` joined into one symbol, scanning left to right.',
            starter: 'def merge_pair(symbols, pair):\n    out = []\n    i = 0\n    # while i < len(symbols): merge and jump 2, or copy and jump 1\n    return tuple(out)\n',
            cases: cases(L.mergePair, [[['t', 'h', 'e', '_'], ['t', 'h']], [['a', 'a', 'a'], ['a', 'a']], [['c', 'h', 'a', 'i', 'n', '_'], ['a', 'i']], [['x'], ['x', 'y']]]),
            hint: '`if i + 1 < len(symbols) and symbols[i] == pair[0] and symbols[i + 1] == pair[1]: out.append(symbols[i] + symbols[i + 1]); i += 2`, else copy and `i += 1`.',
          },
        },
      ],
    },

    {
      id: 'neural-lm', number: '5.4', title: 'A neural language model, and gradients for free',
      goal: 'Turn tokens into probabilities with a small network, derive the softmax-cross-entropy gradient, and see how automatic differentiation computes every other gradient.',
      builds: ['bpe', 'word2vec'],
      blocks: [
        { h: 'From counts to a network' },
        { md: `A neural language model replaces the table of counts with a function that has **weights**:

1. Each token becomes a vector: its **embedding** (a row of a weight matrix, like word2vec's vectors in lesson 4.4).
2. A few layers of arithmetic mix and transform it.
3. The last layer gives one **score** (a **logit**) per token in the vocabulary.
4. Softmax turns the scores into probabilities.

Training is lesson 4.4's recipe: measure the loss ($-\\log$ of the probability given to the right next token), find how each weight changes the loss (its **gradient**), and nudge every weight downhill. The model in this lesson works on characters and sees only the current one, so it is a **neural bigram model**: a check that the machinery works before lesson 5.5 lets it look further back.` },
        {
          derive: {
            title: 'The gradient of softmax and cross-entropy together',
            intro: 'Logits $z_j$, probabilities $p_j = e^{z_j}/\\sum_k e^{z_k}$, right answer $t$, loss $L = -\\log p_t = -z_t + \\log \\sum_k e^{z_k}$.',
            steps: [
              { prompt: 'Differentiate $\\log \\sum_k e^{z_k}$ with respect to one logit $z_j$. Write it with $e^{z_j}$ (type `exp(z)`) and the sum $S = \\sum_k e^{z_k}$.', answer: 'exp(z)/S', vars: { z: [-2, 2], S: [1, 20] }, why: 'The chain rule: $\\frac{1}{S} \\cdot e^{z_j}$, which is exactly $p_j$.' },
              { prompt: 'And $-z_t$ differentiates to $-1$ for $j = t$, $0$ otherwise. So for the right token, $\\frac{\\partial L}{\\partial z_t}$ is? (In terms of $p$, its probability.)', answer: 'p - 1', vars: { p: [0, 1] }, why: '$p_t - 1$: negative, so gradient descent raises the right token’s score.' },
              { prompt: 'For a wrong token $j$?', answer: 'p', vars: { p: [0, 1] }, why: '$p_j$: positive, so its score goes down, by as much probability as it wrongly took.' },
              { prompt: 'For logits $[1, 2, 0.5]$ with the right answer at index 1, what is the gradient of index 0? (3 decimal places.)', number: L.crossEntropyGrad([1, 2, 0.5], 1)[0], compute: () => L.crossEntropyGrad([1, 2, 0.5], 1)[0], tolerance: 0.0006, why: 'It is just $p_0$.' },
            ],
            result: 'Gradient = $p - y$, where $y$ is 1 at the right token and 0 elsewhere. The same formula as word2vec’s in lesson 4.4, and as every classifier’s output layer.',
          },
        },
        {
          code: {
            file: 'lm.py', fn: 'cross_entropy_grad', notes: [
              ['return [p - (1.0 if i == target else 0.0) for i, p in enumerate(probs)]', ['$p - y$, entry by entry.']],
            ],
          },
        },
        {
          code: {
            file: 'tinygpt.py', fn: 'cross_entropy', notes: [
              ['loss -= w * math.log(p[t])', ['The loss at each position: $-\\log$ of the probability given to the right next character, times a weight `w`. Here every weight is 1; Part 6 uses 0 to leave positions out.']],
              ['out = Tensor([[loss / n]], (logits,))', ['The average over positions, as a 1 × 1 Tensor: the starting point of `backward()`.']],
              ['logits.grad[i][j] += g * w * (pj - (1.0 if j == t else 0.0))', ['The backward step is the $p - y$ just derived, scaled by $1/n$ for the average (and by the weight).']],
            ],
          },
        },
        { figure: 'SoftmaxGrad', caption: 'Move the scores and pick the right answer. The gradients always add up to 0: what one token gains, the others lose.' },
        { h: 'Automatic differentiation' },
        { md: `That gradient covers the last step. A real network has many steps (matrix products, additions, activations), and the **chain rule** says the gradient of the whole is the product of the gradients of the steps, applied backwards from the loss. Working that out by hand for every network would be endless. Every deep-learning library does it automatically, and the idea fits in a few dozen lines:

- Every operation returns a result that **remembers its inputs**, and a small function saying how to pass a gradient from its output back to them.
- \`backward()\` on the loss visits every result in **reverse order** (from the loss back to the weights), calling those functions. Each adds its share into its inputs' \`.grad\`.

This is **reverse-mode automatic differentiation**, the “autograd” of PyTorch, written out in plain Python.` },
        {
          code: {
            ...TENSOR, caption: 'class Tensor', notes: [
              ['self.parents = parents', ['The results this one was computed from.']],
              ['self.backward_step = backward', ['The operation’s own small function: how to pass this result’s gradient back to its parents.']],
              ['def visit(t):', ['A **depth-first search**: put every result after everything it was computed from (a **topological order**).']],
              ['self.grad = [[1.0]]', ['The loss’s gradient with respect to itself is 1: where the chain rule starts.']],
              ['for t in reversed(order):', ['From the loss back to the weights: each result’s gradient is complete before it is passed on.']],
            ],
          },
        },
        {
          code: {
            file: 'tinygpt.py', fn: 'matmul', notes: [
              ['out = Tensor([[sum(a.data[i][r] * b.data[r][j]', ['The forward step: an ordinary matrix product.']],
              ['a.grad[i][r] += g * b.data[r][j]', [
                'The backward step. Each `out[i][j]` was a sum of `a[i][r] * b[r][j]`, so a change in `a[i][r]` changes it by `b[r][j]` times as much: the chain rule for one product.',
                '`b.grad[r][j] += g * a.data[i][r]`, by the same reasoning for `b`.',
                '`+=`, never `=`: a value used in several places collects gradient from all of them.',
              ]],
            ],
          },
        },
        { figure: 'GptTrainer', props: { useAttention: false, defaultSteps: 3000 }, caption: 'The network with attention switched off: each character sees only itself. Train it and watch the loss. Where does it stop falling?' },
        {
          predict: {
            prompt: 'Trained with attention off, the loss stops falling at about 2.0. What perplexity per character is that? (2 decimal places; use 2.01.)',
            compute: () => L.perplexity([-2.01]), answer: Math.exp(2.01), tolerance: 0.006,
            explain: '$e^{2.01} \\approx 7.46$: like choosing among about 7 characters every time. Seeing one character is not enough to know the next. The network learned what a bigram can learn, and stopped.',
          },
        },
        {
          write: {
            file: 'lm.py', fn: 'cross_entropy_grad', given: ['softmax'], prelude: 'import math',
            prompt: 'Write `cross_entropy_grad(logits, target)`: the softmax probabilities, minus 1 at the target index.',
            starter: 'def cross_entropy_grad(logits, target):\n    probs = softmax(logits)\n    # p - y\n    pass\n',
            cases: cases(L.crossEntropyGrad, [[[1, 2, 0.5], 1], [[0, 0], 0], [[5, -5, 0], 2], [[0.3], 0]]),
            hint: '`[p - (1.0 if i == target else 0.0) for i, p in enumerate(probs)]`',
          },
        },
      ],
    },

    {
      id: 'attention', number: '5.5', title: 'Attention, number by number',
      goal: 'Compute causal self-attention by hand, derive why the scores are divided by √d, and measure what attention adds to a language model.',
      builds: ['neural-lm'],
      blocks: [
        { h: 'Letting each position look back' },
        { md: `To predict the next character well, a position needs to know what came **before** it, not just itself. **Attention** lets every position gather information from earlier positions, choosing which ones matter.

Each position makes three vectors from its own vector, each with a weight matrix of its own:

- a **query** $q$: what am I looking for?
- a **key** $k$: what do I contain?
- a **value** $v$: what will I hand over if chosen?

Position $i$ compares its query with the key of every position $j \\le i$ (dot products, lesson 3.1), turns those scores into weights with softmax, and outputs the weighted mix of their values:

$$\\text{out}_i = \\sum_{j \\le i} \\text{softmax}_j\\Big(\\frac{q_i \\cdot k_j}{\\sqrt d}\\Big)\\, v_j$$

The $j \\le i$ is the **causal mask**: a position may not look at the future, because predicting the next character from text that includes it would be cheating.` },
        { python: { program: 'attention', label: 'Step through attention in real Python' } },
        { figure: 'AttentionCalc', caption: 'Three positions, two dimensions, every number shown. Change the queries and keys and watch the weights move.' },
        {
          predict: {
            prompt: 'In the figure as it starts, what is the first number of position 0’s output?',
            compute: () => L.attention([[1, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, -1]], [[1, 2], [3, 4], [5, 6]])[0][0], answer: 1,
            explain: 'Position 0 can only look at itself, so its single weight is 1 and its output is exactly $v_0 = [1, 2]$. **1**.',
          },
        },
        {
          derive: {
            title: 'Why divide by √d',
            intro: 'Suppose the entries of $q$ and $k$ are independent, with mean 0 and variance 1.',
            steps: [
              { prompt: 'One term $q_c k_c$ has mean 0. Its variance is $E[q_c^2]\\,E[k_c^2]$. What is it?', number: 1, compute: () => 1 * 1, why: '$1 \\times 1 = 1$.' },
              { prompt: 'The dot product adds $d$ such independent terms. Variances of independent terms add: what is the variance of $q \\cdot k$? (In $d$.)', answer: 'd', vars: { d: [1, 512] }, why: 'With 64 dimensions, a typical score is about $\\pm 8$; with 512, about $\\pm 23$.' },
              { prompt: 'Its standard deviation is the square root of that. Divide the score by it: what is the variance of $\\frac{q \\cdot k}{\\sqrt d}$?', number: 1, compute: () => 1, why: 'Dividing by $\\sqrt d$ divides the variance by $d$: back to 1.' },
            ],
            result: 'Without the division, bigger models get bigger scores, and softmax of big scores puts almost all the weight on one position, with gradients near 0 everywhere else (lesson 5.2: a low temperature). Scaling by $1/\\sqrt d$ keeps the scores the same size whatever $d$ is.',
          },
        },
        {
          code: {
            file: 'lm.py', fn: 'attention', notes: [
              ['scores = [sum(a * b for a, b in zip(q[i], k[j])) / math.sqrt(d) for j in range(i + 1)]', ['$q_i \\cdot k_j / \\sqrt d$, for $j$ from 0 to $i$ only: the mask is simply not computing the future.']],
              ['weights = softmax(scores)', ['Weights that add up to 1.']],
              ['out.append([sum(weights[j] * v[j][c] for j in range(i + 1))', ['The weighted mix of the values, one entry at a time.']],
            ],
          },
        },
        {
          code: {
            file: 'tinygpt.py', fn: 'causal_softmax', notes: [
              ['top = max(row[:i + 1])', ['The tensor version used inside the GPT: softmax over the visible part of row $i$…']],
              ['rows.append([e / total for e in exps] + [0.0] * (len(row) - i - 1))', ['…with exact zeros for the future.']],
              ['a.grad[i][j] += p[j] * (g[j] - inner)', ['The softmax’s backward step: $\\frac{\\partial L}{\\partial s_j} = p_j\\,(g_j - \\sum_k p_k g_k)$.']],
            ],
          },
        },
        { h: 'What attention buys' },
        { md: `Measured when this lesson was written: the same network, 8,000 steps each. With attention off, the loss stopped at **2.01**, and its text was “where is my the in ay and thel. is ops on ther the”. With attention on, it reached **0.81**: “where is my parcel. where is my order ships in one…”. Train both yourself: lesson 5.4’s figure has attention off, lesson 5.6’s on.

(Lesson 5.6 then asks an uncomfortable question about that 0.81.)` },
        {
          choice: {
            prompt: 'Why does the network without attention stop improving at a loss of about 2?',
            options: [
              { text: 'It needs a higher learning rate.', why: 'It has converged: the loss is flat, not slowly falling. A bigger step size can’t add information it doesn’t have.' },
              { text: 'Each position sees only its own character, so it can do no better than a bigram model, however long it trains.', why: 'Right: the information isn’t there. Attention brings in the earlier characters.' },
              { text: 'The embeddings are too short.', why: 'Longer vectors can’t help when the input is a single character: there is only so much one character tells you about the next.' },
            ],
            answer: 1,
            verify: () => quick(true) < quick(false) - 0.1,
          },
        },
        {
          write: {
            file: 'lm.py', fn: 'attention', given: ['softmax'], prelude: 'import math',
            prompt: 'Write `attention(q, k, v)`: for each position $i$, the softmax of $q_i \\cdot k_j / \\sqrt d$ over $j \\le i$, then the weighted sum of the $v_j$.',
            starter: 'def attention(q, k, v):\n    d = len(q[0])\n    out = []\n    # for each i: scores over j <= i, softmax, weighted sum of values\n    return out\n',
            cases: cases(L.attention, [[[[1, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, -1]], [[1, 2], [3, 4], [5, 6]]], [[[2]], [[3]], [[7]]], [[[1, 1], [1, 1]], [[1, 1], [0, 0]], [[1, 0], [0, 1]]]]),
            hint: '`scores = [sum(a * b for a, b in zip(q[i], k[j])) / math.sqrt(d) for j in range(i + 1)]`, `weights = softmax(scores)`, then mix the values.',
          },
        },
      ],
    },

    {
      id: 'tiny-gpt', number: '5.6', title: 'A tiny GPT, trained on your text',
      goal: 'Assemble a transformer block, train it in the page while measuring it honestly on text it hasn’t seen, and save, download and reload the trained model.',
      builds: ['attention'],
      blocks: [
        { h: 'The whole model' },
        { md: `A GPT (“generative pre-trained transformer”) is these pieces stacked:

1. **Token embedding** + **position embedding**. Attention on its own can’t tell order (it mixes values, and a mix doesn’t remember positions), so each position adds a learned vector for *where* it is.
2. **Attention**, added back onto its input: a **residual connection**, so a layer only has to learn a *change* to what it was given.
3. An **MLP**: a small two-layer network applied at each position, also with a residual connection.
4. A last matrix from each position’s vector to one score per character.

Real GPTs repeat steps 2–3 dozens of times with many attention “heads” in parallel, normalise between layers, and have billions of weights. This one has one block, one head, and ${WEIGHTS.toLocaleString('en-GB')} weights. Same idea, same code shape.` },
        {
          code: {
            file: 'tinygpt.py', fn: 'forward', notes: [
              ['x = add(embed(w["tok"], ids), embed(w["pos"], list(range(len(ids)))))', ['Steps 1: what each character is, plus where it is.']],
              ['q, k, v = through(x, w, "wq", lora), through(x, w, "wk", lora), through(x, w, "wv", lora)', ['Queries, keys and values, each from its own weight matrix. `through(x, w, name, lora)` is just `matmul(x, w[name])` here; lesson 7.5 adds LoRA to it.']],
              ['weights = causal_softmax(scale(matmul(q, transpose(k)), 1 / math.sqrt(dim)))', ['All the scores at once, as a matrix: $QK^\\top / \\sqrt d$, masked and softmaxed row by row.']],
              ['x = add(x, through(matmul(weights, v), w, "wo", lora))', ['The weighted values, mapped back by one more matrix, and **added** to x: the residual connection.']],
              ['x = add(x, through(relu(through(x, w, "w1", lora)), w, "w2", lora))', ['The MLP: widen to 4× the size, ReLU, narrow back, and add.']],
              ['return matmul(x, w["out"]), w, weights', ['A score per character at every position: the logits.']],
            ],
          },
        },
        {
          code: {
            file: 'tinygpt.py', fn: 'embed', notes: [
              ['out = Tensor([list(table.data[t]) for t in ids], (table,))', ['Looking up a row is the same as multiplying a one-hot vector by the table, done the cheap way.']],
              ['table.grad[t][j] += g', ['Only the rows that were used get a gradient: a character that wasn’t in this window isn’t changed by it.']],
            ],
          },
        },
        {
          code: {
            file: 'tinygpt.py', fn: 'adam_step', notes: [
              ['m[i][j] = b1 * m[i][j] + (1 - b1) * g[i][j]', ['A running average of the gradient: **momentum**, which smooths out noisy steps.']],
              ['v[i][j] = b2 * v[i][j] + (1 - b2) * g[i][j] * g[i][j]', ['A running average of the gradient squared: how big this weight’s gradients usually are.']],
              ['m_hat = m[i][j] / (1 - state["b1t"])', ['**Bias correction** (see below). `state["b1t"]` is $\\beta_1^t$, kept as a running product.']],
              ['wt[i][j] -= lr * m_hat / (math.sqrt(v_hat) + eps)', ['Step against the averaged gradient, divided by its typical size: every weight gets a step size of its own. That is **Adam**, the optimiser almost every language model is trained with.']],
            ],
          },
        },
        {
          derive: {
            title: 'Why Adam corrects its averages at the start',
            intro: 'The running average starts at $m_0 = 0$ and updates $m_t = \\beta_1 m_{t-1} + (1 - \\beta_1) g_t$, with $\\beta_1 = 0.9$.',
            steps: [
              { prompt: 'After the first step, with gradient $g$: what is $m_1$? (In $g$.)', answer: '0.1*g', vars: { g: [-5, 5] }, why: '$0.9 \\cdot 0 + 0.1 g$: only a tenth of the gradient, because the average started at 0.' },
              { prompt: 'Divide by $1 - \\beta_1^1$. What is the corrected $\\hat m_1$?', answer: 'g', vars: { g: [-5, 5] }, why: '$0.1g / (1 - 0.9) = g$: the correction undoes the bias towards 0.' },
              { prompt: 'By step 50, what is $1 - 0.9^{50}$? (4 decimal places.)', number: 1 - 0.9 ** 50, compute: () => 1 - 0.9 ** 50, tolerance: 0.00006, why: 'Nearly 1: the correction fades away once the average has filled up.' },
            ],
          },
        },
        {
          code: {
            file: 'tinygpt.py', fn: 'train', notes: [
              ['start = rng.below(len(text) - context - 1)', ['A random stretch of text each step.']],
              ['targets = [index[c] for c in text[start + 1:start + context + 1]]', ['The same stretch shifted by one: at every position the target is the next character. One window gives 24 predictions at once.']],
              ['loss.backward()', ['Automatic differentiation fills in every weight’s gradient…']],
              ['adam_step(model, {n: weights[n].grad for n in PARAMS}, state, lr)', ['…and Adam moves every weight.']],
            ],
          },
        },
        { python: { program: 'gpt_step', label: 'Step through one training step in real Python' } },
        { figure: 'GptTrainer', props: { useAttention: true, defaultSteps: 6000 }, caption: 'Train the tiny GPT. It trains on the first 80% of the text and is scored, every 250 steps, on the last 20%, which it never sees. Watch both curves. Then download it, or upload a model you saved.' },
        {
          code: {
            file: 'tinygpt.py', fn: 'average_loss', notes: [
              ['for start in range(0, len(chars) - context, context):', ['Windows one after another, not random: every character of the held-out text is predicted once.']],
              ['total += cross_entropy(forward(model, ids, use_attention)[0], targets).data[0][0]', ['The same loss as in training, with no `backward()` and no update: measuring only.']],
            ],
          },
        },
        {
          code: {
            file: 'tinygpt.py', fn: 'generate', notes: [
              ['logits, _, _ = forward(model, ids[-context:])', ['Only the last `context` characters fit; older ones fall out of view.']],
              ['scaled = [x / temperature for x in last]', ['The last position’s scores, with temperature (lesson 5.2)…']],
              ['if r < acc:', ['…and sampled exactly as `sample` does.']],
            ],
          },
        },
        { h: 'Is it learning, or memorising?' },
        { md: `Measured when this lesson was written, training on the first 50 bike-shop sentences and scoring on the last 13:

| Steps | Loss on its training text | Loss on text it never saw |
|---|---|---|
| 500 | 2.04 | **2.57** (its best) |
| 2,000 | 1.33 | 3.09 |
| 4,000 | 0.89 | 3.77 |
| 8,000 | 0.71 | 4.82 |

Training loss keeps falling, but on unseen text the model is best after about 500 steps and gets **worse** from then on. Those readable sentences are its training text, recited. This is **overfitting**, the same trap as lesson 3.5: ${WEIGHTS.toLocaleString('en-GB')} weights and only about ${approx(TRAIN_CHARS)} characters to learn from, so memorising is easier than generalising.

What helps, in order of how much: **more text** (paste something long into the figure: a few chapters of a book), **stopping early** (keep the model from the lowest point of the red curve), and a **smaller model**. Real language models train on so much text that they rarely see the same passage twice, which is how they generalise.` },
        { h: 'Saving the model' },
        { md: `A trained model is just its weights: ${G.PARAMS.length} matrices of numbers. The **Download** button saves them as a **.safetensors** file, the format Hugging Face and PyTorch use for real models:

- 8 bytes: the length of a JSON header, as a little-endian number;
- the JSON header: each weight's name, type (\`F32\`, 32-bit floats), shape, and where its bytes are, plus metadata (here the vocabulary);
- then the numbers themselves, 4 bytes each.

No code inside, so loading a file can't run anything (unlike Python's older “pickle” files). The same file loads back into the page with **Upload**, and into Python with the functions below; the lab's tests check that a file written by the page is read by the Python number for number.` },
        {
          code: {
            file: 'tinygpt.py', fn: 'read_header', notes: [
              ['n = int.from_bytes(bytes(data[:8]), "little")', ['The first 8 bytes as one whole number, least significant byte first.']],
              ['header = json.loads(bytes(data[8:8 + n]).decode("utf-8"))', ['The next n bytes are the JSON header.']],
            ],
          },
        },
        {
          code: {
            file: 'tinygpt.py', fn: 'load_safetensors', notes: [
              ['numbers = struct.unpack(f"<{rows * cols}f", data[start + begin:start + end])', ['`struct` reads raw bytes as numbers: `<` little-endian, `f` a 4-byte float, `rows * cols` of them.']],
              ['model[name] = [list(numbers[i * cols:(i + 1) * cols]) for i in range(rows)]', ['Cut the flat list back into rows.']],
            ],
          },
        },
        {
          write: {
            file: 'tinygpt.py', fn: 'read_header', prelude: 'import json',
            prompt: 'Write `read_header(data)` for a .safetensors file given as a list of byte values: return `(header, start)`, where the header is the parsed JSON and `start` is where the numbers begin.',
            starter: 'def read_header(data):\n    # the first 8 bytes: the header length n, little-endian\n    # the next n bytes: JSON\n    pass\n',
            cases: cases(G.readHeader, [[[...TINY]], [[...G.toSafetensors(['x', 'y', 'z'], G.initModel(3, 2, 2, 2, 4))]]]),
            hint: '`n = int.from_bytes(bytes(data[:8]), "little")`, then `json.loads(bytes(data[8:8 + n]).decode("utf-8"))`, and return it with `8 + n`.',
          },
        },
        {
          choice: {
            prompt: 'Your tiny GPT writes perfect bike-shop sentences, but its loss on the held-out text has been rising for 5,000 steps. What is the best next step?',
            options: [
              { text: 'Train longer: the training loss is still falling.', why: 'The training loss falls because it is memorising. The held-out loss is the honest one, and it is getting worse.' },
              { text: 'Give it much more text, and keep the weights from the step where the held-out loss was lowest.', why: 'Yes: more data makes generalising easier than memorising, and early stopping keeps the best model you already had.' },
              { text: 'Raise the temperature, so its text is less like the training text.', why: 'Temperature changes how it samples, not what it learned. It would just make the recitation noisier.' },
            ],
            answer: 1,
          },
        },
      ],
    },
  ],
}
