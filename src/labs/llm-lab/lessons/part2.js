// Part 2: generating fast. Choosing each token (temperature, top-k), what generating costs when
// every token reruns the whole model, the KV cache built by hand and checked number for number
// against the full forward pass, and the speed-up counted and timed. Every number a prediction
// asks for is computed by the engine (lessons.test.js checks), which reproduces the Python
// exactly (engine/parity.test.js).
import { Rng, nextLogits, newCache, forwardCached } from '../engine/gpt.js'
import { INDEX, encode } from '../engine/arith.js'
import { forwardCost, cachedCost, generationCost } from '../engine/generate.js'
import { baseModel } from '../engine/models.js'
import { sampling } from '../figures/part2.jsx'

const after35 = (temperature, topK, token) => sampling(nextLogits(baseModel()[0], encode('3+5=')), temperature, topK)[INDEX[token]]

export const PART2 = {
  id: 'part2', title: 'Part 2 · Generating fast', lessons: [
    {
      id: 'sampling', number: '2.1', title: 'Choosing the next token',
      goal: 'Choose each next token greedily, with a temperature or from the top $k$; predict how temperature reshapes the probabilities; and explain why sampling needs well-spread seeds.',
      builds: ['base-model'],
      blocks: [
        { md: `Lesson 1.5 generated text with a loop: compute the next-token probabilities, choose a token, append it, repeat. This part is about that loop. This lesson covers the **choice**; the next three cover its **cost**.

**Greedy decoding** always takes the most likely token. It is deterministic: the same prompt always gives the same text, and the base model always answers \`10\` (lesson 1.5). The alternative is to **sample**, which means drawing the next token at random, each with its probability. Then \`8\` comes out about as often as the model thinks it should, and the same prompt gives different texts on different runs. Every chat assistant samples by default, and two settings control it.` },
        { h: 'Temperature' },
        { md: `Divide every logit $z_j$ by a number $T$, the **temperature**, before the softmax:

$$p_j(T) = \\frac{e^{z_j / T}}{\\sum_k e^{z_k / T}}$$

At $T = 1$ these are the model's own probabilities. A $T$ below 1 stretches the gaps between scores, so the top token takes more of the probability: the text gets **safer and more repetitive**. A $T$ above 1 shrinks the gaps, so unlikely tokens get more: **more varied, more mistakes**. As $T \\to 0$ all the probability goes to the top token, which is greedy decoding; that is why a temperature of 0 means greedy.` },
        {
          symbols: [
            ['z_j', 'zed j', 'the logit (score) of token $j$, from the model\'s last position', 'logits[j]'],
            ['T', 'tee', 'the temperature, a positive number; 0 is treated as greedy', 'temperature'],
            ['p_j(T)', 'p j at T', 'the probability of drawing token $j$ at temperature $T$', ''],
            ['\\sum_k', 'sum over k', 'add up over every token $k$ that is kept', 'total(exps)'],
          ],
        },
        { h: 'Top-k' },
        { md: `Even at $T = 1$, a sampler sometimes draws a token the model gives 1% or less, and one bad token can wreck a whole answer. **Top-$k$ sampling** keeps only the $k$ highest-scoring tokens and renormalizes: their probabilities are rescaled to add up to 1, and every other token gets 0. With $k = 1$ it is greedy again.` },
        {
          code: {
            file: 'generate.py', from: 1, to: 23, notes: [
              ['import time', ['The clock, for lesson 2.4\'s timings.']],
              ['from gpt import', ['The model file\'s pieces: the generator, `exp`, `total` and `argmax` (Part 1), and the two forward passes, with and without the cache (lesson 2.3).']],
              ['from arith import', ['The vocabulary, the newline, the 100 questions and the encoder (lesson 1.1).']],
              ['from pretrain import pretrain', ['Pretraining (lesson 1.4), for the two short demo programs at the end of the file.']],
              ['def sample(logits, temperature, top_k, rng):', ['Choose one token from the last position\'s 17 scores.']],
              ['if temperature == 0:', ['Temperature 0…']],
              ['return argmax(logits)', ['…is greedy: the highest score, no randomness.']],
              ['order = sorted(range(len(logits)), key=lambda j: -logits[j])[:top_k]', ['The token ids from highest score to lowest: `sorted` orders the ids `0..16` by `-logits[j]`, so the biggest score comes first. (A `lambda` is a one-line function without a name.) `[:top_k]` keeps the first `top_k`; slicing with `None` keeps them all.']],
              ['scaled = [logits[j] / temperature for j in order]', ['$z_j / T$ for each kept token.']],
              ['exps = [exp(s - scaled[0]) for s in scaled]', ['$e^{z_j/T}$, less the largest (`scaled[0]`, first because of the sort) so nothing overflows; the common factor cancels in the softmax.']],
              ['r = rng.random() * total(exps)', ['A random point along the total: rather than dividing every `exps` by the sum, stretch the random number by it.']],
              ['for j, e in zip(order, exps):', ['Walk along the kept tokens, each taking up a length `e`…']],
              ['r -= e', ['…subtracting each length…']],
              ['if r < 0:', ['…until the point falls inside one:']],
              ['return j', ['that token is drawn. A token with twice the length is hit twice as often: its probability.']],
              ['return order[-1]', ['Only if rounding left `r` a hair above 0 after the last token: take the last.']],
            ],
          },
        },
        { figure: 'SampleFig', props: { start: '3+5=' }, caption: 'After `3+5=`, the probabilities `sample` draws from at each setting, and 1,000 sampled answers. The right answer is marked ✓.' },
        {
          predict: {
            prompt: 'At $T = 1$ the base model gives `1` a probability of 0.593 after `3+5=`. At $T = 0.5$ what does it become? (Use the figure; 3 decimals.)',
            answer: 0.877, tolerance: 0.0006, compute: () => after35(0.5, null, '1'),
            explain: 'About 0.877. Dividing by 0.5 doubles every score, and $e^{2z} = (e^z)^2$, so each probability is squared and then renormalized. Squaring helps the biggest one most: `1` goes from 0.593 to 0.877, and `8` falls from 0.174 to 0.076.',
            misconceptions: [{ answer: 0.296, tolerance: 0.001, feedback: 'That halves the probability. Temperature divides the **scores** (logits) before the softmax, and halving the temperature makes the top token **more** likely, not less.' }],
          },
        },
        {
          predict: {
            prompt: 'At $T = 1$ with top-$k$ = 2, only `1` (0.593) and `8` (0.174) are kept. What probability does `8` get now? (3 decimals.)',
            answer: 0.227, tolerance: 0.0006, compute: () => after35(1, 2, '8'),
            explain: '$0.174 / (0.593 + 0.174) = 0.227$. Renormalizing divides each kept probability by their sum, so the two keep their 0.593 : 0.174 ratio.',
          },
        },
        {
          choice: {
            prompt: 'Sampled 1,000 times at $T = 1$, the base model answers `3+5=` with `8` about 16% of the time, close to the 0.174 it gives the first token `8`. Greedy decoding never writes `8`. What does that show?',
            options: [
              { text: 'The model has some knowledge of the right answer that greedy decoding throws away', why: 'Yes. Greedy decoding reports only the single most likely path. The probabilities underneath carry more: here, a real (if minority) belief in `8`. Part 4 uses this with pass@k (is the right answer among $k$ samples?), and Part 6 trains on it: sample several answers, reward the right ones.' },
              { text: 'Sampling makes the model better at arithmetic', why: 'Sampling changes nothing in the model; it only reads its probabilities differently. On average it gets fewer questions right here than greedy (the next figure).' },
              { text: 'The model is broken, because the same question gets different answers', why: 'Different answers on different runs is exactly what sampling is for. Set the temperature to 0 to get the same answer every time.' },
            ],
            answer: 0,
          },
        },
        { h: 'Does sampling score better?' },
        { md: `Run the 100-question test of lesson 1.5 with sampling: each question gets its own seed (run $s$ uses seed $1000s + 10a + b$), and the whole test is repeated 20 times, because one sampled test is one roll of the dice.` },
        { figure: 'ScoreFig', caption: 'Exact match on all 100 questions, 20 sampled runs at each temperature. Greedy scores the same every run.' },
        { md: `Greedy decoding scores 12 every time. The sampled runs average a little less, and a single run can land anywhere from a few right to well above 12. Two lessons for later: **a single sampled score is noisy** (Part 4 measures how noisy), and on a task with one right answer, the lowest temperature usually does best. Sampling earns its place where variety is wanted, or where several tries are allowed.` },
        { h: 'Seeds that are far apart' },
        { md: `To make each sample repeatable, \`generate\` (lesson 2.3) builds an \`Rng\` from a seed. Building it straight from the seed had a flaw that showed up while this lesson was written: with seeds 0 to 999, the base model at $T = 2$ answered \`8\` 472 times out of 1,000, when the model gives the first token \`8\` a probability of only about 0.18.

The cause is in lesson 1.2's generator. Its first number is $(\\text{seed} \\times 1664525 + 1013904223) \\bmod 2^{32}$, divided by $2^{32}$. Seed 1 lands only $1664525 / 2^{32}$ above seed 0, and seed 2 that much again. So 1,000 neighbouring seeds draw their first token from one narrow stretch of $[0, 1)$, not from all of it. The fix scrambles the seed first.` },
        {
          code: {
            file: 'generate.py', fn: 'spread', notes: [
              ['def spread(seed):', ['Turn a seed into a different, well-scattered seed. Same seed in, same seed out, so runs stay repeatable.']],
              ['h = seed * 2654435761 % 2**32', ['Multiply by a large odd number and keep 32 bits. (2654435761 is about $2^{32}$ divided by the golden ratio, a classic choice.) Multiplying alone isn\'t enough: neighbouring seeds still land a fixed step apart.']],
              ['h ^= h >> 16', ['`>>` shifts the bits right (drops the low 16), and `^=` is **exclusive or** with the result: the high bits are folded into the low ones. Now a change in any bit of the seed reaches the bits below it.']],
              ['h = h * 2246822507 % 2**32', ['Multiply again by another large odd number: carries spread every bit upward.']],
              ['h ^= h >> 13', ['Fold once more. This multiply-and-fold pattern is the end of the MurmurHash3 hash function.']],
              ['return h', ['The scrambled seed: `spread(0)` is 0, `spread(1)` is 1,678,549,374, `spread(2)` is 4,256,427,940.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'How far apart are the first numbers of `Rng(0)` and `Rng(1)`? (That is $1664525 / 2^{32}$; 6 decimals.)',
            answer: 0.000388, tolerance: 0.0000006, compute: () => new Rng(1).random() - new Rng(0).random(),
            explain: '$1664525 / 4294967296 = 0.000388$. So seeds 0 to 99 put every first number between 0.236 and 0.275: all 100 samples would draw their first token from the same 4% of the range.',
          },
        },
        {
          code: {
            file: 'generate.py', fn: 'show_samples', notes: [
              ['def show_samples(steps=300, temperature=1.0, top_k=None):', ['A demo for the Python tab: a quickly pretrained model answering 3+5 ten times.']],
              ['model, _ = pretrain(steps)', ['Pretrain for 300 steps (lesson 1.4), so it runs in a few seconds. `_` is the name for a value that isn\'t used: here the losses.']],
              ['for seed in range(10):', ['Ten samples, seeds 0 to 9…']],
              ['print(decode(generate(model, encode("3+5="), NEWLINE, 3, temperature, top_k, seed)))', ['…each one answer, generated with these settings and printed as text.']],
            ],
          },
        },
        { python: { program: 'samples', label: 'Sample in real Python' } },
        { note: 'Generation repeats one choice: greedy takes the top token; sampling draws one with its probability. Temperature $T$ divides the logits first ($T < 1$ sharper, $T > 1$ flatter, $T \\to 0$ greedy); top-$k$ keeps the $k$ best and renormalizes. A sampled score is one draw: repeat it. And scramble neighbouring seeds, or the "random" draws aren\'t.' },
      ],
    },

    {
      id: 'generation-cost', number: '2.2', title: 'What generating costs',
      goal: 'Count the multiplications in one forward pass from the shapes of its tables, show that writing each new token by rerunning the whole model repeats work already done, and explain why that repeated work gives exactly the same numbers.',
      builds: ['sampling'],
      blocks: [
        { md: `Here is lesson 1.5's \`greedy\` loop again:

\`\`\`python
for _ in range(limit):
    t = argmax(next_logits(model, ids + out))
\`\`\`

Every new token calls \`next_logits\`, which runs \`forward\` over **the whole text so far**, and then keeps only the **last** row of the result. To write the 5th token it computes 4 positions and keeps 1; for the 100th, 99 positions to keep 1. This lesson counts what that costs, and shows that the rows thrown away are exactly the rows computed the time before.` },
        { h: 'The earlier rows never change' },
        { figure: 'ReuseFig', props: { text: '3+5=', next: '8' }, caption: 'Two full forward passes of the base model, over `3+5=` and over `3+5=8`. The rows they share are identical.' },
        { md: `This follows from the **causal** mask of lesson 1.3. Position $i$ attends only to positions $0$ to $i$, and everything else in the block works on each position separately: the embeddings, $W_Q$, $W_K$, $W_V$, the MLP and the output layer. So everything computed at position $i$ depends only on tokens $0$ to $i$. Appending a token can't change anything at an earlier position.

They aren't just close: they are **identical**, to all 17 digits. The new pass does the same arithmetic in the same order for those rows. The only extra terms are the attention weights of the future, exactly 0, times a value, and adding 0 changes no bit.` },
        {
          choice: {
            prompt: 'Which part of the model would break this, if it were changed?',
            options: [
              { text: 'Letting attention look ahead (no causal mask)', why: 'Yes. Without the mask, position $i$ attends to later tokens too, so appending a token changes every earlier row, and nothing could be reused. Models that read text both ways (like BERT) work like that, and they aren\'t used to generate text one token at a time.' },
              { text: 'A bigger MLP', why: 'The MLP works on each position on its own, at any size. Earlier positions\' MLP outputs still don\'t depend on later tokens.' },
              { text: 'More layers', why: 'With more layers, each layer is still causal, so each position\'s values at every layer depend only on tokens up to it. Real models have dozens of layers and reuse earlier rows the same way.' },
            ],
            answer: 0,
          },
        },
        { h: 'Counting the work' },
        { md: `Nearly all of a forward pass's work is in matrix products. Multiplying an $a \\times b$ table by a $b \\times c$ table computes $a \\cdot c$ entries, each a sum of $b$ products: **$a \\cdot b \\cdot c$ multiplications**. Read off the shapes of lesson 1.3 (with $n$ positions, $d = 16$, hidden $h = 64$, vocabulary $V = 17$) and add up the products in \`forward\`:` },
        {
          code: {
            file: 'generate.py', fn: 'forward_cost', notes: [
              ['def forward_cost(n, dim=16, hidden=64, vocab=17):', ['Multiplications in `forward` over `n` positions, matrix products only. (The scaling by $1/\\sqrt{d}$ and the softmax add a few more; they are small next to these.)']],
              ['qkv = 3 * n * dim * dim', ['$Q = XW_Q$, $K = XW_K$, $V = XW_V$: three products of $(n \\times d)(d \\times d)$.']],
              ['attention = n * n * dim + n * n * dim', ['$QK^\\top$ is $(n \\times d)(d \\times n)$: $n^2 d$. Then the weights times $V$, $(n \\times n)(n \\times d)$: $n^2 d$ again. The only terms with $n^2$: every position against every position.']],
              ['mix = n * dim * dim', ['The attended values times $W_O$: $(n \\times d)(d \\times d)$.']],
              ['mlp = n * dim * hidden + n * hidden * dim', ['The MLP: up, $(n \\times d)(d \\times h)$, then down, $(n \\times h)(h \\times d)$.']],
              ['out = n * dim * vocab', ['The logits: $(n \\times d)(d \\times V)$.']],
              ['return qkv + attention + mix + mlp + out', ['$4nd^2 + 2n^2 d + 2ndh + ndV$.']],
            ],
          },
        },
        {
          mathCode: [
            ['4nd^2', 'qkv + mix', 'the four $d \\times d$ attention matrices, at every position: $4 \\times 256 = 1{,}024$ per position'],
            ['2n^2 d', 'attention', 'scores and weighted values: every position with every earlier one'],
            ['2ndh', 'mlp', 'the MLP: $2 \\times 16 \\times 64 = 2{,}048$ per position, the largest part here'],
            ['ndV', 'out', 'the output layer: $16 \\times 17 = 272$ per position'],
          ],
        },
        {
          predict: {
            prompt: 'How many multiplications does one forward pass over `3+5=` ($n = 4$) take?',
            answer: 13888, compute: () => forwardCost(4),
            explain: '$4 \\cdot 4 \\cdot 256 + 2 \\cdot 16 \\cdot 16 + 2 \\cdot 4 \\cdot 16 \\cdot 64 + 4 \\cdot 16 \\cdot 17 = 4{,}096 + 512 + 8{,}192 + 1{,}088 = 13{,}888$.',
            misconceptions: [{ answer: 3472, feedback: 'That is one position\'s share, $13{,}888 / 4$. The pass computes all 4 positions.' }],
          },
        },
        { md: `Now generating. To write \`new\` tokens after a prompt of \`prompt\` tokens, greedy runs \`forward\` once per new token, over $\\text{prompt}$ positions, then $\\text{prompt} + 1$, and so on:` },
        {
          code: {
            file: 'generate.py', fn: 'generation_cost', notes: [
              ['def generation_cost(prompt, new, dim=16, hidden=64, vocab=17):', ['The cost of writing `new` tokens, both ways. (The second way is lesson 2.3\'s; lesson 2.4 reads that half.)']],
              ['without = sum(forward_cost(n, dim, hidden, vocab) for n in range(prompt, prompt + new))', ['A full pass over $n$ positions for every $n$ from `prompt` to `prompt + new - 1`. Whole numbers, so Python\'s `sum` is exact (lesson 1.2\'s `total` is for floats).']],
              ['with_cache = sum(cached_cost(p, dim, hidden, vocab) for p in range(prompt + new - 1))', ['With the cache: one position\'s work for every position from 0 to `prompt + new - 2` (lesson 2.4).']],
              ['return without, with_cache', ['Both counts, as a pair.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'Writing 3 tokens after `3+5=` takes passes over 4, 5 and 6 positions. How many multiplications in all? (`forward_cost(5)` is 17,520 and `forward_cost(6)` is 21,216.)',
            answer: 52624, compute: () => generationCost(4, 3)[0],
            explain: '$13{,}888 + 17{,}520 + 21{,}216 = 52{,}624$. The pass over 6 positions recomputes 5 rows that the pass before had already computed.',
          },
        },
        { figure: 'CostFig', props: { cached: false }, caption: 'Multiplications for each new token when every token reruns the whole model. Drag to make the text longer.' },
        { md: `Each new token costs more than the last, because its pass is one position longer. Adding up a cost that grows in step with $n$, over $n$ tokens, gives a total that grows like $n^2$, and the $n^2 d$ attention terms make it grow faster still. Doubling the length of the text more than quadruples the work. Almost all of it repeats rows that were already computed.` },
        { note: 'A matrix product $(a \\times b)(b \\times c)$ costs $abc$ multiplications; one forward pass costs $4nd^2 + 2n^2d + 2ndh + ndV$. Rerunning it for every new token keeps one row of each pass and throws away the rest, rows that are identical to the last pass\'s because attention is causal. The total grows faster than $n^2$.' },
      ],
    },

    {
      id: 'kv-cache', number: '2.3', title: 'The KV cache, by hand',
      goal: 'Work out which numbers a new position needs from earlier ones (only their keys and values), write a forward pass for one position that keeps them in a cache, and test that it gives exactly the same logits as the full pass.',
      builds: ['generation-cost'],
      blocks: [
        { md: `Lesson 2.2 showed that the earlier rows never change. So what does a new position $p$ actually need from them? Go through the forward pass for row $p$ alone:

- **Embedding**: $x_p = \\text{tok}[t] + \\text{pos}[p]$. Its own token and position only.
- **Query, key, value**: $q_p = x_p W_Q$, $k_p = x_p W_K$, $v_p = x_p W_V$. Its own $x_p$ only.
- **Attention**: scores $s_j = q_p \\cdot k_j / \\sqrt{d}$ for every $j \\le p$, then softmax weights $a_j$, then $\\sum_j a_j v_j$. This needs **every earlier position's key and value**.
- **$W_O$, the residual, the MLP, the output layer**: its own row only.

So the earlier positions matter only through their keys $k_j$ and values $v_j$. Keep those two vectors for every position as it is computed, and each new token needs just one row of work. That store is the **KV cache**, and every language model that generates text uses one.` },
        {
          symbols: [
            ['x_p', 'x sub p', 'position $p$\'s vector: token plus position embedding, 16 numbers', 'x'],
            ['q_p,\\ k_p,\\ v_p', 'q, k, v sub p', 'position $p$\'s query, key and value, 16 numbers each', 'q, k, v'],
            ['s_j', 's sub j', 'how well the new query matches position $j$\'s key, scaled by $1/\\sqrt{d}$', 'scores[j]'],
            ['a_j', 'a sub j', 'the attention weight on position $j$: softmax of the scores', 'weights[j]'],
            ['\\sum_{j \\le p} a_j v_j', 'sum of a j times v j', 'the mix of earlier values that position $p$ takes in', 'mixed'],
          ],
        },
        {
          code: {
            file: 'gpt.py', fn: 'new_cache', notes: [
              ['def new_cache():', ['An empty cache, one per piece of text being generated.']],
              ['return {"k": [], "v": []}', ['Two lists that grow by one row per position: `cache["k"][j]` is position $j$\'s key $k_j$, and `cache["v"][j]` its value $v_j$.']],
            ],
          },
        },
        {
          code: {
            file: 'gpt.py', fn: 'vecmat', notes: [
              ['def vecmat(x, w):', ['One row times a matrix: what `matmul` does for a single row, on plain lists. Generating needs no gradients, so no Tensors.']],
              ['return [total(x[r] * w[r][j] for r in range(len(w))) for j in range(len(w[0]))]', ['Entry `j` is $\\sum_r x_r w_{rj}$, added with `total` in the order `r = 0, 1, 2, …`, exactly as `matmul` adds row `i`. Same operations, same order, same bits.']],
            ],
          },
        },
        {
          code: {
            file: 'gpt.py', fn: 'forward_cached', notes: [
              ['def forward_cached(model, cache, t):', ['One new token `t`, at the next free position: return its logits and add its key and value to the cache.']],
              ['dim = len(model["wq"])', ['$d = 16$.']],
              ['p = len(cache["k"])', ['Its position: one per key already cached. The first token goes at 0.']],
              ['x = [a + b for a, b in zip(model["tok"][t], model["pos"][p])]', ['$x_p = \\text{tok}[t] + \\text{pos}[p]$, entry by entry.']],
              ['q, k, v = vecmat(x, model["wq"]), vecmat(x, model["wk"]), vecmat(x, model["wv"])', ['This position\'s query, key and value: $3d^2 = 768$ multiplications.']],
              ['cache["k"].append(k)', ['Its key joins the cache, for this and every later position…']],
              ['cache["v"].append(v)', ['…and so does its value. The query is **not** kept: no later position needs it.']],
              ['scores = [total(q[r] * key[r] for r in range(dim)) * (1 / math.sqrt(dim)) for key in cache["k"]]', ['$s_j = q_p \\cdot k_j / \\sqrt{d}$ against every cached key, its own included: $(p + 1)d$ multiplications. The same dot product, in the same order, as row $p$ of `matmul(q, transpose(k))`, then `scale`.']],
              ['top = max(scores)', ['The largest score, subtracted for safety as in `causal_softmax`.']],
              ['exps = [exp(s - top) for s in scores]', ['$e^{s_j - \\text{top}}$ for the $p + 1$ visible positions: there is no future to mask, because the cache holds only the past.']],
              ['z = total(exps)', ['Their sum.']],
              ['weights = [e / z for e in exps]', ['The attention weights $a_j$, adding up to 1.']],
              ['mixed = [total(weights[j] * cache["v"][j][c] for j in range(p + 1)) for c in range(dim)]', ['$\\sum_j a_j v_j$: for each of the 16 entries `c`, the cached values\' entry `c`, weighted. Another $(p + 1)d$ multiplications.']],
              ['x = [a + b for a, b in zip(x, vecmat(mixed, model["wo"]))]', ['Through $W_O$ and **added** to $x$: the residual connection.']],
              ['x = [a + b for a, b in zip(x, vecmat([max(0.0, h) for h in vecmat(x, model["w1"])], model["w2"]))]', ['The MLP on this one row: up to 64 with `w1`, ReLU (`max(0.0, h)`), down with `w2`, added on.']],
              ['return vecmat(x, model["out"])', ['The 17 logits for the token after `t`.']],
            ],
          },
        },
        {
          choice: {
            prompt: 'The cache keeps every position\'s key and value, but not its query. Why is the query never needed again?',
            options: [
              { text: 'A query is only used by its own position, to look back; later positions look back with their own queries', why: 'Yes. In $s_j = q_p \\cdot k_j$ the query is always the **new** position\'s. Earlier positions are only looked **at**, through their keys (to score them) and values (to mix them in).' },
              { text: 'Queries are recomputed cheaply each time', why: 'They aren\'t recomputed at all: an earlier position\'s query is used once, when that position was new, and never again.' },
              { text: 'The query equals the key', why: 'They come from different matrices, $W_Q$ and $W_K$, and are different vectors.' },
            ],
            answer: 0,
          },
        },
        { h: 'The test: identical, not close' },
        { md: `A cache is an optimization, and it must change **no** result. The test feeds a text through the cache one token at a time and compares every position's logits with a full forward pass over the text up to that position. It compares with \`!=\`, exact equality, not "within $10^{-6}$". The cached pass does the same arithmetic in the same order, so anything less than exact would mean a bug. A tolerance could hide a small one, such as a wrong position embedding on a single row.` },
        {
          code: {
            file: 'generate.py', fn: 'cache_matches', notes: [
              ['def cache_matches(model, ids):', ['The test: is the cache exact?']],
              ['cache = new_cache()', ['An empty cache.']],
              ['for n, t in enumerate(ids):', ['Each token in turn, with its position `n`:']],
              ['if forward_cached(model, cache, t) != next_logits(model, ids[:n + 1]):', ['the cached logits against the last row of a full pass over the first `n + 1` tokens. Two lists are `!=` if any entry differs, even in the last bit.']],
              ['return False', ['One difference fails the test.']],
              ['return True', ['Every position, every one of the 17 logits, identical.']],
            ],
          },
        },
        { figure: 'CacheFig', props: { text: '3+5=8\n1+1=' }, caption: 'The base model fed a notebook line and the next question through the cache. Each position\'s 17 logits are compared with a full forward pass.' },
        {
          predict: {
            prompt: 'After 16 tokens (the model\'s whole context), how many numbers does the cache hold? (Keys and values, 16 numbers each.)',
            answer: 512, compute: () => { const c = newCache(); for (const t of encode('3+5=8\n1+1=2\n4+4=')) forwardCached(baseModel()[0], c, t); return c.k.flat().length + c.v.flat().length },
            explain: '$2 \\times 16 \\text{ positions} \\times 16 = 512$. A real model keeps a key and a value for every position **in every layer** (and every attention head), so for long texts the cache can take more memory than the weights themselves. That memory, not arithmetic, is often what limits how long a context a model can serve.',
          },
        },
        { h: 'Generating with the cache' },
        {
          code: {
            file: 'generate.py', fn: 'generate', notes: [
              ['def generate(model, ids, stop, limit, temperature=0, top_k=None, seed=0):', ['`greedy` from lesson 1.5, rebuilt on the cache, and with lesson 2.1\'s sampling. Temperature 0 (the default) is greedy.']],
              ['rng = Rng(spread(seed))', ['The random numbers for sampling, from a scrambled seed (lesson 2.1).']],
              ['cache = new_cache()', ['A fresh cache for this text.']],
              ['for t in ids[:-1]:', ['Every prompt token but the last…']],
              ['forward_cached(model, cache, t)', ['…goes through once, just to fill the cache: its logits are not needed, because those tokens are given. (Real systems do this **prefill** for the whole prompt in one batched pass.)']],
              ['t, out = ids[-1], []', ['The last prompt token is the first to be fed in for real; no new tokens yet.']],
              ['for _ in range(limit):', ['At most `limit` new tokens:']],
              ['if len(cache["k"]) == len(model["pos"]):', ['If all 16 positions are used, the token `t` has no position embedding…']],
              ['break', ['…so stop. (`greedy` slides its window instead; with a cache that would change every position, and so every key.)']],
              ['t = sample(forward_cached(model, cache, t), temperature, top_k, rng)', ['Feed in the last token: one position\'s work, giving the next token\'s logits; choose from them. The token just chosen is the next one fed in.']],
              ['if t == stop:', ['The stop token…']],
              ['out.append(t)', ['Otherwise keep it.']],
              ['return out', ['The new tokens, without the stop token.']],
            ],
          },
        },
        { md: `With temperature 0, \`generate\` writes exactly what \`greedy\` does: a test runs all 100 questions both ways, and the answers are identical. The answers come out the same; the next lesson measures the cost.` },
        {
          code: {
            file: 'generate.py', fn: 'check_cache', notes: [
              ['def check_cache(steps=300):', ['A demo for the Python tab: both tests on a quickly pretrained model.']],
              ['model, _ = pretrain(steps)', ['Pretrain for 300 steps; the losses aren\'t needed.']],
              ['print("identical scores:", cache_matches(model, encode("3+5=8\\n1+1=")))', ['The exact test over a notebook line and the next question. Prints `True`.']],
              ['prompts = [encode(f"{a}+{b}=") for a, b in QUESTIONS]', ['All 100 questions as token ids.']],
              ['print("same 100 answers:", all(', ['`all(…)` is `True` if every comparison is: `generate` (with the cache) against `greedy` (without), on every question. Prints `True`.']],
            ],
          },
        },
        { python: { program: 'cache', label: 'Check the cache in real Python' } },
        { note: 'A new position needs from earlier ones only their **keys and values**; everything else is its own row. The KV cache keeps them, so each new token costs one row of work. The cached pass does the same arithmetic in the same order as the full pass, so its logits are identical, and the test demands exactly that.' },
      ],
    },

    {
      id: 'kv-speed', number: '2.4', title: 'The speed-up, counted and measured',
      goal: 'Count the multiplications per token with the cache, predict the speed-up for a given length, measure it in Python and in the browser, and explain why measured times don\'t match the counts exactly.',
      builds: ['kv-cache'],
      blocks: [
        { md: `With the cache, the token at position $p$ costs one row of every matrix product, plus attention over the $p + 1$ cached keys and values:` },
        {
          code: {
            file: 'generate.py', fn: 'cached_cost', notes: [
              ['def cached_cost(p, dim=16, hidden=64, vocab=17):', ['Multiplications in one `forward_cached` call at position `p`.']],
              ['return 4 * dim * dim + 2 * (p + 1) * dim + 2 * dim * hidden + dim * vocab', ['$4d^2$ ($q$, $k$, $v$, $W_O$) $+ \\; 2(p+1)d$ (scores and mixed values) $+ \\; 2dh$ (MLP) $+ \\; dV$ (logits). Only the attention part grows with $p$, and only in step with it.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'How many multiplications does the very first token (position 0) cost with the cache? ($4 \\cdot 256 + 2 \\cdot 1 \\cdot 16 + 2 \\cdot 16 \\cdot 64 + 16 \\cdot 17$.)',
            answer: 3376, compute: () => cachedCost(0),
            explain: '$1{,}024 + 32 + 2{,}048 + 272 = 3{,}376$. Each later position adds just 32 more (one more key to score, one more value to mix).',
          },
        },
        { figure: 'CostFig', props: { cached: true }, caption: 'Multiplications for each new token, without the cache (a whole forward pass) and with it (one row). Drag to make the text longer.' },
        { md: `Without the cache, the cost per token grows with the length; with it, the cost stays nearly flat. Over a whole text the gap widens. Writing $L - 1$ tokens after one costs $\\sum_{n=1}^{L-1} \\text{forward\\_cost}(n)$ without the cache and $\\sum_{p=0}^{L-2} \\text{cached\\_cost}(p)$ with it, and the ratio grows about in step with $L$, roughly $L/2$.` },
        {
          predict: {
            prompt: 'For a 64-token text (63 tokens after one), how many times fewer multiplications does the cache need? (Use `generation_cost(1, 63)`, or the figure with the slider at 64; 1 decimal.)',
            answer: 34.4, tolerance: 0.06, compute: () => { const [a, b] = generationCost(1, 63); return a / b },
            explain: '$9{,}472{,}512 / 275{,}184 = 34.4$. At 16 tokens the ratio is 8.2, at 32 it is 16.7, at 128 it is 72: about $L/2$, because the full passes cover $1 + 2 + \\dots + (L-1) \\approx L^2/2$ rows where the cache computes $L - 1$.',
            misconceptions: [{ answer: 64, tolerance: 0.5, feedback: 'The full passes don\'t each cover all 64 rows: they grow from 1 row to 63, about 32 on average. So the cache saves about half of $L$, not $L$.' }],
          },
        },
        { h: 'Measured' },
        {
          code: {
            file: 'generate.py', fn: 'time_both', notes: [
              ['def time_both(length=64, seed=1):', ['Time the two ways of writing the same text.']],
              ['model = init_model(len(VOCAB), context=length, seed=seed)', ['A random model with `length` positions. Our model has 16, too few to measure, and the time doesn\'t depend on what the weights are, so an untrained model will do.']],
              ['start = time.perf_counter()', ['`perf_counter` is a clock in seconds, for measuring short intervals.']],
              ['slow = greedy(model, [0], -1, length - 1)', ['Without the cache: `length - 1` tokens after token 0. The stop token is `-1`, which is never written, so it never stops early.']],
              ['middle = time.perf_counter()', ['Time after the first way…']],
              ['fast = generate(model, [0], -1, length - 1)', ['With the cache, temperature 0: the same tokens.']],
              ['end = time.perf_counter()', ['…and after the second.']],
              ['print("same tokens:", slow == fast)', ['Check first that the two agree: a faster wrong answer is worth nothing.']],
              ['print("without the cache:"', ['The first time, rounded to milliseconds.']],
              ['print("with the cache:', ['The second.']],
              ['print("speed-up:"', ['How many times faster.']],
              ['return middle - start, end - middle', ['Both times, in seconds.']],
            ],
          },
        },
        { figure: 'SpeedFig', caption: 'Both ways of writing the same text, timed: Python\'s recorded on an Apple M4 (medians of three runs), and this browser\'s when you press Measure.' },
        { md: `In Python the measured speed-ups follow the counts closely: 10.1 times against a count of 8.2 at 16 tokens, 77.7 against 72 at 128. In a browser they usually come out much **larger** than the counts. Counting multiplications is a model of the cost, not the cost itself.` },
        {
          choice: {
            prompt: 'Why can the measured speed-up be larger than the ratio of multiplications?',
            options: [
              { text: 'The full pass does work the count leaves out: it builds Tensors and a gradient table for every result, and allocates far more memory', why: 'Yes. `forward` is the training pass: every operation makes a Tensor with a `grad` table of zeros and records its parents, though generating never calls `backward`. `forward_cached` uses plain lists and allocates a few rows. The count includes only multiplications, so it misses that overhead, and JavaScript engines make some kinds of work much cheaper than others.' },
              { text: 'The cache skips some multiplications the count includes', why: 'The count for the cached pass is exact: lesson 2.3\'s code does exactly those products.' },
              { text: 'The timer is wrong', why: 'Timers vary run to run, which is why the Python numbers are medians of three, but not by a factor of three. The difference is real work.' },
            ],
            answer: 0,
          },
        },
        { md: `**In real models.** The same trade happens at scale: a little memory for a lot of arithmetic. Every serving system keeps a KV cache, and its two phases have names. **Prefill** runs the whole prompt in one batched pass, filling the cache. **Decode** then writes one token at a time, each needing only its own row. The cache's size is two vectors per position per layer, which is why long contexts are limited by memory. Part 7 measures the cache on a real 135-million-weight model.` },
        { python: { program: 'speed', label: 'Time both ways in real Python' } },
        { note: 'With the cache, a token at position $p$ costs $4d^2 + 2(p+1)d + 2dh + dV$, nearly flat in $p$; without it, a whole forward pass. Over a text of $L$ tokens that saves a factor of about $L/2$ in multiplications: 34 at 64 tokens. Measured times follow the counts in Python and beat them in the browser, because the full pass also builds training machinery that generating never uses.' },
      ],
    },
  ],
}
