// Part 1: a base model. What a language model computes, the lab's model line by line, pretraining
// on a notebook of sums, and why the result can't yet be asked a question. Every number a
// prediction asks for is computed by the engine (lessons.test.js checks), which reproduces the
// Python exactly (engine/parity.test.js).
import { Rng, exp, LN2, PARAMS, nextLogits, greedy, total } from '../engine/gpt.js'
import { VOCAB, INDEX, encode, decode, complete, QUESTIONS, NEWLINE } from '../engine/arith.js'
import { baseModel } from '../engine/models.js'

const probOf = (text, token) => {
  const row = nextLogits(baseModel()[0], encode(text)), top = Math.max(...row)
  const e = row.map(x => exp(x - top)), z = total(e)
  return e[INDEX[token]] / z
}
const answers = () => QUESTIONS.map(([a, b]) => complete(baseModel()[0], a, b))

export const PART1 = {
  id: 'part1', title: 'Part 1 · A base model', lessons: [
    {
      id: 'next-token', number: '1.1', title: 'What a language model computes',
      goal: 'Say exactly what a language model outputs (a probability for every possible next token), turn text into token ids and back, and read the next-token probabilities of a real trained model.',
      builds: [],
      blocks: [
        { h: 'What this lab is about' },
        { md: `ChatGPT, Claude and every other assistant start as a **base model**: a network trained on a huge amount of text to do one thing, predict the next piece of text. A base model completes text; it doesn't answer questions or follow instructions. Everything that turns it into an assistant happens **after** that pretraining, and it is what this lab teaches:

1. **A base model** (this part): what pretraining produces, and what it can't do.
2. **Generating fast**: the KV cache, the trick that makes long answers affordable.
3. **Supervised fine-tuning**: teaching it the format of a conversation.
4. **Evaluating honestly**: measuring whether it really improved.
5. **Learning from preferences**: a reward model, RLHF and DPO.
6. **Rewards you can check**: GRPO, the method behind reasoning models.
7. **A real model**: the same ideas measured on a 135-million-weight model in your browser.

Real models are far too big to train here, so the lab uses a tiny GPT on a tiny world: **adding two single digits**. There are exactly 100 questions (0+0 to 9+9), every answer can be checked, and so every claim about the model can be measured on all of them. The model is NLP Studio's tiny GPT (its Part 5), and this part recaps what you need from it.` },
        { h: 'Tokens: text as numbers' },
        { md: `A model can't read characters; it reads whole numbers. A **tokenizer** cuts text into pieces called **tokens** and gives each a number, its **id**. Real models use tens of thousands of tokens (pieces of words); this lab's world needs only 17: the newline, \`+\`, \`=\`, the ten digits, \`?\`, and three **special tokens** that the next parts use to mark who is speaking. The list of all of them is the **vocabulary**.` },
        {
          code: {
            file: 'arith.py', from: 3, to: 21, notes: [
              ['from gpt import Rng, greedy', ['Two tools from the model file, explained in lessons 1.2 and 1.5.']],
              ['VOCAB = [', ['The vocabulary: a list of 17 strings. A token\'s **id** is its position in this list: `VOCAB[0]` is the newline `"\\n"`, `VOCAB[3]` is `"0"`, `VOCAB[14]` is `"<user>"`. The three tokens in angle brackets are single tokens, not 6 characters: real vocabularies reserve such tokens for chat formatting, and so does this one.']],
              ['INDEX = {t: k for k, t in enumerate(VOCAB)}', ['The other direction, a dictionary from token to id: `INDEX["8"]` is 11. A **dictionary comprehension**: for each position `k` and token `t`, the entry `t: k`.']],
              ['NEWLINE = INDEX["\\n"]', ['The newline\'s id, 0, kept under a name because generation stops at it (lesson 1.5).']],
              ['QUESTIONS = [(a, b) for a in range(10) for b in range(10)]', ['All 100 questions as pairs: `(0, 0), (0, 1), …, (9, 9)`. Two `for`s in one list comprehension: the first is the outer loop, so question number `k` is `(k // 10, k % 10)`.']],
              ['def encode(text):', ['Text to ids.']],
              ['return [INDEX[c] for c in text]', ['One id per character: `encode("3+5=")` is `[6, 1, 8, 2]`.']],
              ['def decode(ids):', ['Ids back to text.']],
              ['return "".join(VOCAB[t] for t in ids)', ['Look each id up in the vocabulary and join the strings: `decode([6, 1, 8, 2])` is `"3+5="`.']],
            ],
          },
        },
        { figure: 'VocabFig', caption: 'Type with the vocabulary\'s keys and watch the ids. Every text the model ever sees is a list of these 17 numbers.' },
        {
          predict: {
            prompt: 'What is `encode("8")`\'s only id, `INDEX["8"]`?',
            answer: 11, compute: () => INDEX['8'],
            explain: 'The digits start at position 3 (`"0"` is `VOCAB[3]`), so digit $d$ has id $d + 3$, and `"8"` is 11.',
            misconceptions: [{ answer: 8, feedback: 'That is the digit itself. Ids are positions in `VOCAB`, and three tokens (`"\\n"`, `"+"`, `"="`) come before the digits.' }],
          },
        },
        { h: 'What the model outputs' },
        { md: `Give the model a list of ids. For **every position** it outputs one score per vocabulary token, a **logit**; **softmax** turns the 17 scores into 17 probabilities that add up to 1:

$$p_j = \\frac{e^{z_j}}{\\sum_{k} e^{z_k}}$$

The probabilities at the last position are the model's prediction of the **next token**. That is all a language model computes, at any size: a probability for every possible next token, given the tokens so far. Writing text is choosing a token, appending it, and asking again.

Below is the base model this part builds (lesson 1.4 trains it), predicting what follows the text you type.` },
        { figure: 'NextTokenFig', props: { start: '3+5=' }, caption: 'The base model\'s six most likely next tokens. Try `3+5` (without `=`), `2+2=`, `9+9=`, and a new line.' },
        {
          predict: {
            prompt: 'After `3+5=`, what probability does the base model give the token `8`? (Read it off the figure; 3 decimals.)',
            answer: 0.174, tolerance: 0.0006, compute: () => probOf('3+5=', '8'),
            explain: 'About 0.17. The model gives `1` far more: about 0.59. It has learned that answers often start with 1 (every sum from 10 to 18 does), but not which sums those are. Lesson 1.5 looks at what it gets right and wrong.',
          },
        },
        {
          choice: {
            prompt: 'After `3+5` (no `=` yet), the model gives `=` a probability of almost exactly 1. Why is this one easy?',
            options: [
              { text: 'In the training text, `=` always follows `digit+digit`', why: 'Yes. Every line of the notebook is `a+b=c`, so after a digit, a `+` and a digit, the next token is always `=`. The model only has to learn the pattern, not do any arithmetic.' },
              { text: 'The model has learned to add', why: 'Adding is needed for what comes **after** `=`. Predicting `=` itself needs no arithmetic at all.' },
              { text: 'Softmax always gives one token probability 1', why: 'Softmax gives a token a probability near 1 only when its score is far above all the others. Here that is because the training text never shows anything else.' },
            ],
            answer: 0,
          },
        },
        { note: 'A language model outputs, at every position, a probability for every token in its vocabulary. The prediction for the **next** token is the last position\'s. Text goes in as token ids: here 17 tokens, so ids 0 to 16.' },
      ],
    },

    {
      id: 'same-numbers', number: '1.2', title: 'Numbers that agree everywhere',
      goal: 'Generate repeatable random numbers with a seed, and explain why this lab computes its own `exp`, `log` and sums so that Python and the page agree to the last bit.',
      builds: ['next-token'],
      blocks: [
        { md: `Everything in this lab runs twice: in Python (\`python/\`, which you can step through on the desktop) and in the page (the figures). The promise is that both print **exactly** the same numbers, so a figure can show a training run and the Python program gives the same loss at every step. A test checks that over the whole 1,500-step pretraining run of lesson 1.4.

Keeping that promise took three small pieces of code. They are worth seeing, because the problem they solve, the same program giving different numbers on different machines, is a real one in machine learning.` },
        { h: 'Repeatable random numbers' },
        {
          code: {
            file: 'gpt.py', from: 7, to: 22, notes: [
              ['import math', ['Python\'s maths module: `math.floor` and `math.sqrt` are used below.']],
              ['class Rng:', ['A **random number generator**: a rule that turns one number into the next, so that the sequence looks random. The model\'s starting weights and every choice of training text come from it.']],
              ['def __init__(self, seed):', ['Made with a **seed**, the number the sequence starts from. Same seed, same sequence: that is what makes a training run repeatable.']],
              ['self.state = seed % 2**32', ['The current state, kept below $2^{32}$ = 4,294,967,296.']],
              ['def random(self):', ['The next number, between 0 (included) and 1 (not included).']],
              ['self.state = (self.state * 1664525 + 1013904223) % 2**32', ['A **linear congruential generator**: multiply, add, keep the remainder. Whole-number arithmetic, exact in both Python and JavaScript, so both produce the same sequence.']],
              ['return self.state / 2**32', ['The state as a fraction of $2^{32}$: a float in [0, 1).']],
              ['def below(self, n):', ['A random whole number from 0 to `n - 1`.']],
              ['return int(self.random() * n)', ['Stretch [0, 1) to [0, n) and cut off the fraction. With seed 1 the first call of `below(10)` gives 2.']],
            ],
          },
        },
        {
          predict: {
            prompt: '`Rng(1).random()`: the state becomes `(1 × 1664525 + 1013904223) % 2**32 = 1015568748`. What number does `random()` return? (4 decimals.)',
            answer: 0.2365, tolerance: 0.0001, compute: () => new Rng(1).random(),
            explain: '$1015568748 / 4294967296 \\approx 0.2365$. Below $2^{32}$ already, so the `% 2**32` changes nothing on this first call.',
          },
        },
        { h: 'Adding up, one number at a time' },
        {
          code: {
            file: 'gpt.py', fn: 'total', notes: [
              ['def total(xs):', ['Adds a list of numbers.']],
              ['s = 0.0', ['The running sum.']],
              ['for x in xs:', ['Each number in turn, left to right…']],
              ['s += x', ['…added on. Every addition of two floats is **rounded** to the nearest number a float can hold.']],
              ['return s', ['The sum.']],
            ],
          },
        },
        { md: `Why not Python's own \`sum()\`? Since Python 3.12, \`sum()\` of floats keeps track of the rounding errors as it goes and corrects for them: more accurate, but JavaScript's plain adding doesn't do it, so the two can differ in the last bit. Adding the plain way in both gives the same bits.` },
        { h: 'Our own exp and log' },
        { md: `The model needs $e^x$ (in softmax) and $\\ln x$ (in the loss). Every language has them built in, but they are not required to agree to the last bit: Python's \`math.exp\` and the browser's \`Math.exp\` sometimes differ by one step in the last binary digit. Here is the browser's next to ours:` },
        { figure: 'BitsFig', caption: 'The browser\'s `Math.exp` against this lab\'s `exp`, as 17-digit numbers, and how many representable floats apart they are.' },
        { md: `One step in the last digit is about $10^{-16}$ of the number. It would not matter, except that **training is chaotic**: a tiny difference in one step changes the next step's weights slightly, which changes the next one's a little more. When this lab used the built-in functions, Python and the page agreed for the first few steps of pretraining and then drifted; after 1,500 steps the loss differed by 0.24 and the model gave different answers.

The fix uses only $+$, $-$, $\\times$ and $\\div$, which every computer rounds the same way (the IEEE 754 standard requires it), so Python and JavaScript produce the same bits.

**exp.** Split $x$ into a multiple of $\\ln 2$ and a small remainder, $x = k \\ln 2 + r$ with $|r| \\le 0.35$. Then $e^x = 2^k e^r$. Multiplying by 2 is exact, and $e^r$ for a small $r$ is the start of its series, $1 + r + \\frac{r^2}{2!} + \\frac{r^3}{3!} + \\dots$, which is accurate to the last digit after 17 terms.` },
        {
          code: {
            file: 'gpt.py', from: 34, to: 55, notes: [
              ['LN2 = 0.6931471805599453', ['$\\ln 2$, written out: the same 17 digits in both languages give the same float.']],
              ['def exp(x):', ['$e^x$ from the four basic operations.']],
              ['k = math.floor(x / LN2 + 0.5)', ['$k$: $x / \\ln 2$ rounded to the nearest whole number. (`math.floor(… + 0.5)` rounds the same way as JavaScript\'s `Math.floor(… + 0.5)`; Python\'s `round` would round halves to even.)'], { calc: () => ['x = −1.3: −1.3 / 0.6931 + 0.5 = −1.3755, floor', -2] }],
              ['r = x - k * LN2', ['The remainder, small: for $x = -1.3$, $r = -1.3 + 2 \\times 0.6931 = 0.0863$.']],
              ['term, series = 1.0, 1.0', ['The series starts at its first term, 1.']],
              ['for n in range(1, 18):', ['Terms 1 to 17.']],
              ['term = term * r / n', ['Each term from the one before: $\\frac{r^n}{n!} = \\frac{r^{n-1}}{(n-1)!} \\cdot \\frac{r}{n}$.']],
              ['series += term', ['Added on: `series` is now $1 + r + \\dots + \\frac{r^n}{n!}$.']],
              ['while k > 0:', ['Multiply by $2^k$: if $k$ is positive…']],
              ['series *= 2.0', ['…double, exactly…']],
              ['k -= 1', ['…$k$ times.']],
              ['while k < 0:', ['If $k$ is negative…']],
              ['series /= 2.0', ['…halve, exactly (also exact, until the number gets so small that it underflows to 0)…']],
              ['k += 1', ['…$|k|$ times.']],
              ['return series', ['$e^x$.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'For $x = -1.3$, what whole number $k$ does `exp` use? ($-1.3 / \\ln 2 \\approx -1.876$.)',
            answer: -2, compute: () => Math.floor(-1.3 / LN2 + 0.5),
            explain: '$-1.876 + 0.5 = -1.376$, and `floor` goes down to $-2$. So $e^{-1.3} = 2^{-2} e^{0.0863} = 0.25 \\times 1.0901 = 0.2725$.',
            misconceptions: [{ answer: -1, feedback: '`floor` rounds **down**, towards minus infinity: the floor of $-1.376$ is $-2$, not $-1$.' }],
          },
        },
        { md: `**log.** Halve or double $x$ until it is in $[1, 2)$, counting the steps $e$: then $\\ln x = e \\ln 2 + \\ln m$ for the $m$ left over. For $m$ in $[1, 2)$, $s = \\frac{m-1}{m+1}$ is at most $\\frac13$, and $\\ln m = 2(s + \\frac{s^3}{3} + \\frac{s^5}{5} + \\dots)$ converges fast.` },
        {
          code: {
            file: 'gpt.py', fn: 'log', notes: [
              ['def log(x):', ['The natural logarithm, from the four basic operations.']],
              ['e = 0', ['How many times $x$ was halved (positive) or doubled (negative).']],
              ['while x >= 2.0:', ['Too big for $[1, 2)$…']],
              ['x /= 2.0', ['…halve it…']],
              ['e += 1', ['…and count.']],
              ['while x < 1.0:', ['Too small: probabilities like 0.01 come here…']],
              ['x *= 2.0', ['…double it…']],
              ['e -= 1', ['…and count down.']],
              ['s = (x - 1.0) / (x + 1.0)', ['$s = \\frac{m - 1}{m + 1}$, between 0 and $\\frac13$.']],
              ['term, series = s, 0.0', ['The first term is $s$ itself.']],
              ['for n in range(30):', ['30 terms: far more than enough when $s \\le \\frac13$.']],
              ['series += term / (2 * n + 1)', ['Add $\\frac{s^{2n+1}}{2n+1}$.']],
              ['term = term * s * s', ['The next odd power of $s$.']],
              ['return e * LN2 + 2.0 * series', ['$\\ln x = e \\ln 2 + 2 \\times$ the series.']],
            ],
          },
        },
        {
          choice: {
            prompt: 'A training run in Python and the same run in the page used the built-in `exp`. Their losses agreed exactly for 3 steps and then differed by about $4 \\times 10^{-16}$. What happened after 1,500 steps?',
            options: [
              { text: 'The difference grew: the loss differed by 0.24 and some answers changed', why: 'Yes. Each step\'s weights depend on the step before, so a difference in the last bit is fed back and grows. Training runs are chaotic in this sense; it is also why a GPU run is rarely repeatable to the last bit.' },
              { text: 'It stayed about $10^{-16}$', why: 'It would if each step were independent. But every step starts from the weights the last step left, so differences compound.' },
              { text: 'It disappeared as training converged', why: 'Training doesn\'t pull different runs back together: measured here, the two ended up as different models.' },
            ],
            answer: 0,
          },
        },
        { note: 'Same seed, same random numbers. And `+ − × ÷` are rounded identically everywhere, so this lab builds `exp`, `log` and sums from them alone: Python and the page then agree to the last bit over a whole training run, which they otherwise don\'t, because training magnifies tiny differences.' },
      ],
    },

    {
      id: 'forward-pass', number: '1.3', title: 'The model, one forward pass',
      goal: 'Follow token ids through the tiny GPT (embeddings, attention, the MLP, the logits) with the shape of every table, and count its weights.',
      builds: ['same-numbers'],
      blocks: [
        { md: `This is NLP Studio's tiny GPT (its lessons 5.4 to 5.6 build it slowly). Here it is again, as a recap: every value is a **Tensor**, a table of numbers that remembers how it was made, so that a gradient can flow back through it.` },
        {
          code: {
            file: 'gpt.py', from: 76, to: 104, notes: [
              ['class Tensor:', ['A 2-D table of numbers plus what is needed to differentiate through it.']],
              ['def __init__(self, data, parents=(), backward=None):', ['`data` is a list of rows; `parents` are the Tensors it was computed from; `backward` will push its gradient back to them.']],
              ['self.data = data', ['The numbers.']],
              ['self.grad = [[0.0] * len(data[0]) for _ in data]', ['One gradient per number, starting at 0: how much the final loss changes when that number changes.']],
              ['self.parents = parents', ['Where it came from.']],
              ['self.backward_step = backward', ['How to pass its gradient back to its parents (each operation below sets it).']],
              ['def backward(self):', ['Called on the loss: fill in every `.grad` it depends on.']],
              ['order, seen = [], set()', ['Every Tensor in the computation, parents before children: a **topological order**.']],
              ['def visit(t):', ['Depth-first: visit a Tensor\'s parents before adding it.']],
              ['if id(t) not in seen:', ['Each Tensor once, even if it is used twice.']],
              ['seen.add(id(t))', ['Mark it.']],
              ['for p in t.parents:', ['Its parents…']],
              ['visit(p)', ['…first.']],
              ['order.append(t)', ['Then the Tensor itself.']],
              ['visit(self)', ['Start from the loss.']],
              ['self.grad = [[1.0]]', ['The loss\'s gradient with respect to itself is 1.']],
              ['for t in reversed(order):', ['From the loss back to the inputs…']],
              ['if t.backward_step:', ['(weights have no step: nothing made them)…']],
              ['t.backward_step()', ['…each operation passes its gradient to its parents. That is backpropagation.']],
              ['def zeros(rows, cols):', ['A table of zeros.']],
              ['return [[0.0] * cols for _ in range(rows)]', ['A new list per row: `[[0.0] * cols] * rows` would make every row the same list.']],
            ],
          },
        },
        { h: 'The operations' },
        { md: `Each operation computes its output and attaches a \`backward\` that adds its share of the gradient to its inputs. The rule in every one is the chain rule: an input's gradient is the output's gradient times how much the output changes with that input.` },
        {
          code: {
            file: 'gpt.py', fn: 'matmul', notes: [
              ['def matmul(a, b):', ['Matrix multiplication.']],
              ['n, k, m = len(a.data), len(b.data), len(b.data[0])', ['`a` is n × k, `b` is k × m.']],
              ['out = Tensor([[total(', ['Entry `[i][j]` is row `i` of `a` dotted with column `j` of `b`, added with `total` (lesson 1.2).']],
              ['def backward():', ['The gradients:']],
              ['for i in range(n):', ['Every row of `a`…']],
              ['for r in range(k):', ['…every inner index…']],
              ['for j in range(m):', ['…every column of `b`.']],
              ['g = out.grad[i][j]', ['How the loss changes with `out[i][j]`.']],
              ['a.grad[i][r] += g * b.data[r][j]', ['`out[i][j]` grows by `b[r][j]` per unit of `a[i][r]`.']],
              ['b.grad[r][j] += g * a.data[i][r]', ['And by `a[i][r]` per unit of `b[r][j]`.']],
              ['out.backward_step = backward', ['Attach it.']],
              ['return out', ['The product.']],
            ],
          },
        },
        {
          code: {
            file: 'gpt.py', fn: 'add', notes: [
              ['def add(a, b):', ['Entry by entry, for residual connections and position embeddings.']],
              ['out = Tensor([[x + y', ['Each pair added.']],
              ['def backward():', ['The gradient of a sum…']],
              ['for i, row in enumerate(out.grad):', ['…for every entry…']],
              ['for j, g in enumerate(row):', ['…']],
              ['a.grad[i][j] += g', ['…passes unchanged to both inputs.']],
              ['b.grad[i][j] += g', ['…and to the second input.']],
              ['out.backward_step = backward', ['Attach the gradient rule to the result, so `Tensor.backward` can call it after the loss is computed.']],
              ['return out', ['The result. It carries its `backward`, so later operations can use it and the gradient can still flow back through it.']],
            ],
          },
        },
        {
          code: {
            file: 'gpt.py', fn: 'relu', notes: [
              ['def relu(a):', ['$\\max(0, x)$ on every entry: the MLP\'s bend.']],
              ['out = Tensor([[max(0.0, x)', ['Negative numbers become 0.']],
              ['def backward():', ['How this operation passes its output\'s gradient back to its input.']],
              ['for i, row in enumerate(out.grad):', ['Every row `i` of the output\'s gradient…']],
              ['for j, g in enumerate(row):', ['…and every entry `j` in it, with its gradient `g`:']],
              ['if a.data[i][j] > 0:', ['Where the input was positive…']],
              ['a.grad[i][j] += g', ['…the gradient passes; where it was cut to 0, nothing does.']],
              ['out.backward_step = backward', ['Attach the gradient rule to the result, so `Tensor.backward` can call it after the loss is computed.']],
              ['return out', ['The result. It carries its `backward`, so later operations can use it and the gradient can still flow back through it.']],
            ],
          },
        },
        {
          code: {
            file: 'gpt.py', fn: 'transpose', notes: [
              ['def transpose(a):', ['Rows become columns: attention needs $K^\\top$.']],
              ['out = Tensor([list(col) for col in zip(*a.data)], (a,))', ['`zip(*rows)` hands back the columns, one tuple each.']],
              ['def backward():', ['How this operation passes its output\'s gradient back to its input.']],
              ['for i, row in enumerate(out.grad):', ['Every row `i` of the output\'s gradient…']],
              ['for j, g in enumerate(row):', ['…and every entry `j` in it, with its gradient `g`:']],
              ['a.grad[j][i] += g', ['Each gradient goes back to the swapped place.']],
              ['out.backward_step = backward', ['Attach the gradient rule to the result, so `Tensor.backward` can call it after the loss is computed.']],
              ['return out', ['The result. It carries its `backward`, so later operations can use it and the gradient can still flow back through it.']],
            ],
          },
        },
        {
          code: {
            file: 'gpt.py', fn: 'scale', notes: [
              ['def scale(a, s):', ['Multiply every entry by one number, `s`.']],
              ['out = Tensor([[x * s', ['Each entry times `s`.']],
              ['def backward():', ['How this operation passes its output\'s gradient back to its input.']],
              ['for i, row in enumerate(out.grad):', ['Every row `i` of the output\'s gradient…']],
              ['for j, g in enumerate(row):', ['…and every entry `j` in it, with its gradient `g`:']],
              ['a.grad[i][j] += g * s', ['The gradient is scaled the same way.']],
              ['out.backward_step = backward', ['Attach the gradient rule to the result, so `Tensor.backward` can call it after the loss is computed.']],
              ['return out', ['The result. It carries its `backward`, so later operations can use it and the gradient can still flow back through it.']],
            ],
          },
        },
        {
          code: {
            file: 'gpt.py', fn: 'causal_softmax', notes: [
              ['def causal_softmax(a):', ['Softmax along each row of the attention scores, but only over the positions up to and including that row: a token can\'t look at tokens after it. **Causal** means exactly that.']],
              ['rows = []', ['The output rows, built one position at a time.']],
              ['for i, row in enumerate(a.data):', ['Row `i` is position `i`.']],
              ['top = max(row[:i + 1])', ['The largest visible score, subtracted so that $e^x$ can\'t overflow (it changes nothing: the factor cancels).']],
              ['exps = [exp(x - top) for x in row[:i + 1]]', ['$e^{x - \\text{top}}$, with lesson 1.2\'s `exp`.']],
              ['z = total(exps)', ['Their sum.']],
              ['rows.append([e / z for e in exps] + [0.0] * (len(row) - i - 1))', ['The probabilities, then exact zeros for the future.']],
              ['out = Tensor(rows, (a,))', ['The attention weights, as a Tensor whose parent is the scores.']],
              ['def backward():', ['The softmax gradient, row by row:']],
              ['for i, (p, g) in enumerate(zip(out.data, out.grad)):', ['Each row: its probabilities `p` and their gradients `g`.']],
              ['inner = total(p[j] * g[j] for j in range(i + 1))', ['$\\sum_j p_j g_j$']],
              ['for j in range(i + 1):', ['Only the visible positions.']],
              ['a.grad[i][j] += p[j] * (g[j] - inner)', ['$\\partial L / \\partial a_j = p_j (g_j - \\sum_k p_k g_k)$: what softmax\'s outputs share, it takes back from each.']],
              ['out.backward_step = backward', ['Attach the gradient rule to the result, so `Tensor.backward` can call it after the loss is computed.']],
              ['return out', ['The result. It carries its `backward`, so later operations can use it and the gradient can still flow back through it.']],
            ],
          },
        },
        {
          code: {
            file: 'gpt.py', fn: 'embed', notes: [
              ['def embed(table, ids):', ['Look up one row of a table per id.']],
              ['out = Tensor([list(table.data[t]) for t in ids], (table,))', ['Row `t` for each token id `t`: the token\'s **embedding**, its learned vector of 16 numbers.']],
              ['def backward():', ['How this operation passes its output\'s gradient back to its input.']],
              ['for i, t in enumerate(ids):', ['Each position `i` and the id `t` it looked up:']],
              ['for j, g in enumerate(out.grad[i]):', ['…each of the 16 numbers in that row:']],
              ['table.grad[t][j] += g', ['Gradients go back into the rows that were looked up. A token used twice gets both contributions.']],
              ['out.backward_step = backward', ['Attach the gradient rule to the result, so `Tensor.backward` can call it after the loss is computed.']],
              ['return out', ['The result. It carries its `backward`, so later operations can use it and the gradient can still flow back through it.']],
            ],
          },
        },
        { h: 'The model' },
        {
          code: {
            file: 'gpt.py', from: 238, to: 264, notes: [
              ['PARAMS = [', ['The model\'s nine weight tables, by name: token and position embeddings, the attention\'s query, key, value and output matrices, the MLP\'s two layers, and the output layer.']],
              ['def init_model(vocab_size, dim=16, context=16, hidden=64, seed=1):', ['A new model: vocabulary of 17, vectors of 16, at most 16 positions, an MLP of 64.']],
              ['rng = Rng(seed)', ['Starting weights from lesson 1.2\'s generator.']],
              ['shapes = {', ['Every table\'s rows × columns. `tok` has a row per token; `pos` a row per position; `out` turns a 16-vector into 17 scores.']],
              ['model = {}', ['The model is just a dictionary of tables.']],
              ['for name in PARAMS:', ['Each of the nine tables:']],
              ['rows, cols = shapes[name]', ['This table\'s size.']],
              ['size = 1 / math.sqrt(rows if name not in ("tok", "pos") else dim)', ['Starting weights between $\\pm 1/\\sqrt{\\text{inputs}}$, so signals keep about the same size from layer to layer.']],
              ['model[name] = [[(rng.random() * 2 - 1) * size', ['A uniform random number in $[-1, 1)$, times that size.']],
              ['return model', ['The finished dictionary of tables.']],
              ['def forward(model, ids):', ['One pass: ids in, logits out.']],
              ['w = {name: Tensor(model[name]) for name in PARAMS}', ['Each weight table as a Tensor, so its gradient is collected.']],
              ['dim = len(model["wq"])', ['16.']],
              ['x = add(embed(w["tok"], ids), embed(w["pos"], list(range(len(ids)))))', ['Each position: its token\'s embedding plus its position\'s embedding. Without the second, "3+5" and "5+3" would look alike to attention.']],
              ['q, k, v = matmul(x, w["wq"]), matmul(x, w["wk"]), matmul(x, w["wv"])', ['A query, key and value per position: what it looks for, what it offers, what it passes on.']],
              ['weights = causal_softmax(scale(matmul(q, transpose(k)), 1 / math.sqrt(dim)))', ['$\\text{softmax}(QK^\\top / \\sqrt{16})$, causal: how much each position attends to each earlier one.']],
              ['x = add(x, matmul(matmul(weights, v), w["wo"]))', ['The attended values, mixed by `wo`, **added** to `x`: a residual connection.']],
              ['x = add(x, matmul(relu(matmul(x, w["w1"])), w["w2"]))', ['The MLP, each position on its own: up to 64, ReLU, back to 16, added on.']],
              ['return matmul(x, w["out"]), w, weights', ['The logits (17 scores per position), the weight Tensors and the attention weights.']],
            ],
          },
        },
        { figure: 'ForwardFig', props: { text: '3+5=' }, caption: 'One forward pass of the base model on `3+5=`: the shape at every step, the last position\'s attention, and its 17 logits.' },
        {
          predict: {
            prompt: 'How many weights does the model have? (Add up the nine tables: `tok` 17 × 16, `pos` 16 × 16, four 16 × 16 attention matrices, `w1` 16 × 64, `w2` 64 × 16, `out` 16 × 17.)',
            answer: 3872, compute: () => { const m = baseModel()[0]; return PARAMS.reduce((s, n) => s + m[n].length * m[n][0].length, 0) },
            explain: '$272 + 256 + 4 \\times 256 + 1024 + 1024 + 272 = 3{,}872$. SmolLM2 in Part 7 has about 135 million, 35,000 times more; the largest models have hundreds of billions.',
          },
        },
        { note: 'Ids → embeddings (token plus position) → attention (each position mixes in earlier ones) → MLP → 17 logits per position. Every operation records how to pass gradients back, so `loss.backward()` can fill in all 3,872 gradients.' },
      ],
    },

    {
      id: 'pretraining', number: '1.4', title: 'Pretraining on a notebook of sums',
      goal: 'Pretrain the base model by predicting every next token of the training text, read its loss, and explain why the starting loss is about $\\ln 17$.',
      builds: ['forward-pass'],
      blocks: [
        { md: `**Pretraining** is the first and by far the largest stage of making a language model: show it a vast amount of text and train it to predict every next token. For a real model the text is much of the public internet; for ours it is a notebook of 400 sums.` },
        {
          code: {
            file: 'arith.py', fn: 'notebook', notes: [
              ['def notebook(lines=400, seed=0):', ['The pretraining text.']],
              ['rng = Rng(seed)', ['Its own generator, seed 0: the same notebook every time.']],
              ['out = []', ['The lines.']],
              ['for _ in range(lines):', ['400 times:']],
              ['a, b = QUESTIONS[rng.below(len(QUESTIONS))]', ['a random question of the 100…']],
              ['out.append(f"{a}+{b}={a + b}\\n")', ['…written with its answer: `"2+3=5\\n"`.']],
              ['return "".join(out)', ['One text: it starts `2+3=5`, `2+7=9`, `8+1=9`, `6+6=12`.']],
            ],
          },
        },
        { md: `Training uses everything from lessons 1.2 and 1.3. The loss is the **cross-entropy**: at every position, minus the log of the probability the model gave the token that really came next, averaged. Adam then moves every weight a little against its gradient.` },
        {
          code: {
            file: 'gpt.py', fn: 'cross_entropy', notes: [
              ['def cross_entropy(logits, targets, weights=None):', ['The loss for a whole window: `targets[i]` is the token that really follows position `i`.']],
              ['if weights is None:', ['No weights given…']],
              ['weights = [1] * len(targets)', ['…then every position counts once. (Part 3 counts only some positions.)']],
              ['n = sum(weights)', ['How many positions count. (Whole numbers, so Python\'s `sum` is exact here.)']],
              ['probs = []', ['Each position\'s probabilities, kept for the gradient.']],
              ['loss = 0.0', ['The total, before averaging.']],
              ['for row, t, w in zip(logits.data, targets, weights):', ['Position by position.']],
              ['top = max(row)', ['Subtracted for safety, as in softmax.']],
              ['exps = [exp(x - top) for x in row]', ['$e^{x - \\text{top}}$ for all 17 scores.']],
              ['z = total(exps)', ['Their sum: the softmax denominator.']],
              ['p = [e / z for e in exps]', ['Softmax: the 17 probabilities.']],
              ['probs.append(p)', ['Kept: the gradient needs them.']],
              ['loss -= w * log(p[t])', ['Minus the log of the probability of the real next token: 0 if the model was sure and right, large if it gave that token little chance.']],
              ['out = Tensor([[loss / n]], (logits,))', ['The average: one number.']],
              ['def backward():', ['Its gradient with respect to each logit:']],
              ['g = out.grad[0][0] / n', ['The loss\'s own gradient (1), shared over the `n` positions that count.']],
              ['for i, (p, t, w) in enumerate(zip(probs, targets, weights)):', ['Each position, with its probabilities, its real next token and its weight:']],
              ['for j, pj in enumerate(p):', ['…and every token `j` with its probability `pj`:']],
              ['logits.grad[i][j] += g * w * (pj - (1.0 if j == t else 0.0))', ['$p_j - [j = t]$: push the right token\'s score up by $1 - p_t$ and every other score down by its probability. (NLP Studio lesson 5.4 derives it.)']],
              ['out.backward_step = backward', ['Attach the gradient rule to the result, so `Tensor.backward` can call it after the loss is computed.']],
              ['return out', ['The result. It carries its `backward`, so later operations can use it and the gradient can still flow back through it.']],
            ],
          },
        },
        {
          code: {
            file: 'gpt.py', from: 267, to: 297, notes: [
              ['def new_adam_state(model):', ['What Adam remembers between steps.']],
              ['return {"t": 0, "b1t": 1.0, "b2t": 1.0,', ['The step count, and $\\beta_1^t$, $\\beta_2^t$ for the bias correction…']],
              ['def adam_step(model, grads, state, lr=0.01, b1=0.9, b2=0.99, eps=1e-8):', ['**Adam** (Neural Net Lab 5.2): a step size for every weight.']],
              ['state["t"] += 1', ['One more step.']],
              ['state["b1t"] *= b1', ['$\\beta_1^t$']],
              ['state["b2t"] *= b2', ['$\\beta_2^t$']],
              ['for name in grads:', ['Every table…']],
              ['m, v, wt, g = state["m"][name], state["v"][name], model[name], grads[name]', ['…its two running averages, its weights and its gradient.']],
              ['for i in range(len(wt)):', ['Every weight:']],
              ['for j in range(len(wt[0])):', ['…and every column of the table.']],
              ['m[i][j] = b1 * m[i][j] + (1 - b1) * g[i][j]', ['$m \\leftarrow \\beta_1 m + (1 - \\beta_1) g$: the average gradient.']],
              ['v[i][j] = b2 * v[i][j] + (1 - b2) * g[i][j] * g[i][j]', ['$v \\leftarrow \\beta_2 v + (1 - \\beta_2) g^2$: the average squared gradient.']],
              ['m_hat = m[i][j] / (1 - state["b1t"])', ['Bias correction: both averages start at 0, so early on they are too small.']],
              ['v_hat = v[i][j] / (1 - state["b2t"])', ['The same correction for the squared average.']],
              ['wt[i][j] -= lr * m_hat / (math.sqrt(v_hat) + eps)', ['The step: about `lr` in size, in the direction the gradient has been pointing.']],
              ['def train_step(model, state, ids, targets, weights=None, lr=0.01):', ['One training step, used by every part of the lab.']],
              ['logits, w, _ = forward(model, ids)', ['Forward.']],
              ['loss = cross_entropy(logits, targets, weights)', ['The loss.']],
              ['loss.backward()', ['Every gradient.']],
              ['adam_step(model, {n: w[n].grad for n in PARAMS}, state, lr)', ['One Adam step on all nine tables.']],
              ['return loss.data[0][0]', ['The loss as a plain number, for the learning curve.']],
            ],
          },
        },
        {
          code: {
            file: 'pretrain.py', from: 2, to: 30, notes: [
              ['from gpt import Rng, init_model, new_adam_state, train_step', ['The generator, a new model, Adam\'s memory and one training step, from lessons 1.2 to 1.4.']],
              ['from arith import VOCAB, encode, notebook, exact_match', ['The vocabulary, the encoder, the notebook and the test.']],
              ['def pretrain(steps=1500, dim=16, context=16, hidden=64, lr=0.01, seed=1, lines=400):', ['1,500 steps by default: about 12 seconds in Python, under a second in the page.']],
              ['ids = encode(notebook(lines, seed=0))', ['The whole notebook as ids: 2,579 tokens.']],
              ['model = init_model(len(VOCAB), dim, context, hidden, seed)', ['A new, random model.']],
              ['state = new_adam_state(model)', ['Adam\'s memory, all zeros.']],
              ['rng = Rng(seed + 1)', ['A second generator, for choosing windows.']],
              ['losses = []', ['The loss of every step: the learning curve.']],
              ['for _ in range(steps):', ['Each step:']],
              ['start = rng.below(len(ids) - context - 1)', ['a random place in the notebook…']],
              ['window = ids[start:start + context + 1]', ['…17 tokens from there…']],
              ['losses.append(train_step(model, state, window[:-1], window[1:], lr=lr))', ['…the first 16 as input, and the same shifted by one as targets: every position predicts the next token. **Every** token counts, including the random digits of the question.']],
              ['return model, losses', ['The trained model and its learning curve.']],
              ['def pretrain_and_test(steps=1500):', ['Pretrain and report: what running the file prints.']],
              ['model, losses = pretrain(steps)', ['Pretrain with every default except the number of steps.']],
              ['print("loss, last 100 steps:"', ['Prints 1.177.']],
              ['print("exact match:"', ['Prints 12 / 100 (lesson 1.5 explains the test).']],
              ['return model', ['The finished dictionary of tables.']],
              ['if __name__ == "__main__":', ['Run as a program (`python3 pretrain.py`)…']],
              ['pretrain_and_test()', ['…it does just that.']],
            ],
          },
        },
        { figure: 'PretrainFig', props: { steps: 1500 }, caption: 'The same pretraining run as `python3 pretrain.py`, in the page. The loss falls fast at first and then flattens.' },
        {
          predict: {
            prompt: 'At step 1 the model is random, so it spreads its probability roughly evenly over the 17 tokens. What is the loss at step 1? (Read the figure; 3 decimals.)',
            answer: 2.827, tolerance: 0.0006, compute: () => baseModel()[1][0],
            explain: 'Evenly spread means $p \\approx \\frac{1}{17}$ for every token, and $-\\ln \\frac{1}{17} = \\ln 17 = 2.833$. The real first loss, 2.827, is just below: random weights are not exactly even.',
            misconceptions: [{ answer: 2.833, tolerance: 0.0006, feedback: 'That is $\\ln 17$, the loss of perfectly even guessing. The real random model is slightly better by chance: read the figure.' }],
          },
        },
        {
          choice: {
            prompt: 'After training the loss flattens at about 1.18, far above 0. Which tokens can **no** model predict well, however long it trains?',
            options: [
              { text: 'The two digits of each question', why: 'Yes. The notebook draws them at random, so the best possible guess for a question\'s first digit is $\\frac{1}{10}$ for each, a loss of $\\ln 10 = 2.3$ on those positions forever. Only the `+`, `=`, newline and the answer can be learned.' },
              { text: 'The answers', why: 'The answers are determined by the question: a perfect model would predict them with probability 1.' },
              { text: 'The `=` signs', why: '`=` always follows `digit+digit`; lesson 1.1\'s figure shows the model already gives it probability almost 1.' },
            ],
            answer: 0,
          },
        },
        { note: 'Pretraining: predict every next token of the text, average the cross-entropy, step with Adam. The loss starts near $\\ln 17$ (even guessing over 17 tokens) and can never reach 0 here, because the question\'s digits are random.' },
      ],
    },

    {
      id: 'base-model', number: '1.5', title: 'What a base model can and can\'t do',
      goal: 'Generate with greedy decoding, test the base model on all 100 questions, explain its mistakes, and show that it can\'t be asked a question it wasn\'t trained on.',
      builds: ['pretraining'],
      blocks: [
        { md: `To answer, the model writes one token at a time: predict, take a token, append it, predict again. The simplest choice is the most likely token every time, **greedy decoding**. (Part 2 covers sampling and makes this fast.)` },
        {
          code: {
            file: 'gpt.py', from: 300, to: 326, notes: [
              ['def next_logits(model, ids):', ['The scores for the next token.']],
              ['context = len(model["pos"])', ['16: the model has position embeddings for 16 positions only.']],
              ['logits, _, _ = forward(model, ids[-context:])', ['So it sees only the last 16 tokens: its **context window**. Real models have windows of thousands to millions of tokens; the idea is the same.']],
              ['return logits.data[-1]', ['The last position\'s 17 scores.']],
              ['def argmax(row):', ['The id with the highest score.']],
              ['best = 0', ['Start with the first position.']],
              ['for j in range(1, len(row)):', ['Compare every other position with the best so far.']],
              ['if row[j] > row[best]:', ['Strictly greater: on a tie the first one stays.']],
              ['best = j', ['A new best.']],
              ['return best', ['The winning position.']],
              ['def greedy(model, ids, stop, limit):', ['Generate after `ids`.']],
              ['out = []', ['The new tokens.']],
              ['for _ in range(limit):', ['At most `limit` of them.']],
              ['t = argmax(next_logits(model, ids + out))', ['The most likely next token, given everything so far. Note that this runs the whole model again over the whole text for every new token: Part 2 fixes that.']],
              ['if t == stop:', ['The stop token (here the newline)…']],
              ['break', ['…ends it.']],
              ['out.append(t)', ['Append the chosen token and go round again.']],
              ['return out', ['The result. It carries its `backward`, so later operations can use it and the gradient can still flow back through it.']],
            ],
          },
        },
        {
          code: {
            file: 'arith.py', from: 35, to: 42, notes: [
              ['def complete(model, a, b):', ['Ask the base model the only way it knows: write the start of a notebook line.']],
              ['return decode(greedy(model, encode(f"{a}+{b}="), NEWLINE, 3))', ['Generate after `"a+b="` until a newline, at most 3 tokens, and turn the ids back into text.']],
              ['def exact_match(model):', ['The test: all 100 questions.']],
              ['return sum(complete(model, a, b) == str(a + b) for a, b in QUESTIONS)', ['Count the answers that are exactly right. (`True` counts as 1.) Part 4 asks how much to trust a number like this.']],
            ],
          },
        },
        { figure: 'AnswerGrid', caption: 'The base model\'s answer to every question: row $a$, column $b$. Hover a cell to see the question.' },
        {
          predict: {
            prompt: 'How many of the 100 questions does the base model answer exactly right?',
            answer: 12, compute: () => answers().filter((x, k) => x === String(QUESTIONS[k][0] + QUESTIONS[k][1])).length,
            explain: '12. Count the green cells.',
          },
        },
        {
          predict: {
            prompt: 'How many times does the base model write `10`?',
            answer: 77, tolerance: 0, compute: () => answers().filter(x => x === '10').length,
            explain: '77 times; the only other answers it ever gives are `4` (17 times) and `8` (6 times). Eight of its 12 right answers are sums that really are 10. It has learned the **form** of an answer, not addition, and **greedy decoding** explains the "10". Every sum from 10 to 18 starts with `1`: 45 of the 100 questions, far more than any other first digit, so `1` is the safest first token. After a `1`, the most common second digit is `0` (9 questions make 10, 8 make 11, and so on down to 1 that makes 18). Taking the most likely token at each step gives `1`, then `0`.',
            misconceptions: [{ answer: 9, feedback: 'That counts the questions whose answer really is 10. The model writes `10` far more often than that: count the cells showing 10.' }],
          },
        },
        { h: 'Asking it a question' },
        { md: `An assistant is asked questions, in some format that marks whose turn it is. This lab's format (Part 3) will be \`<user>3+5?<bot>\`, then the answer and \`<end>\`. The base model has never seen \`<user>\`, \`<bot>\` or \`?\` in training; their embeddings are still the random numbers they started with.` },
        { figure: 'AskFig', caption: 'The same question two ways, greedy decoding, the same base model.' },
        {
          choice: {
            prompt: 'Asked `<user>3+5?<bot>`, the base model writes `=1`, a newline, `4+8`. What is it doing?',
            options: [
              { text: 'Continuing what it takes to be a notebook: the only kind of text it has ever seen', why: 'Yes. A base model completes text in the style of its training data. `<bot>` is meaningless to it, so it falls back on what usually comes next in a notebook: an answer, a new line, a new sum. It is not answering; it is continuing.' },
              { text: 'Answering 1, then asking its own question', why: 'It has no notion of answering or asking. There were no questions in its training text, only lines of sums.' },
              { text: 'Making an arithmetic mistake', why: 'The problem is not the arithmetic; it is that the input is not in any format the model has learned. Part 3 teaches it the format.' },
            ],
            answer: 0,
          },
        },
        { note: 'A base model completes text in the style of its training data. Ours has learned the format of a notebook line and the most common answer ("10"), not addition: 12 of 100 right. It can\'t be asked a question in a format it never saw. Turning it into something that answers is the rest of this lab.' },
      ],
    },
  ],
}
