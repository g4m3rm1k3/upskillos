// Part 8: beyond the page. The tiny GPT in PyTorch, checked against your hand-written gradients and
// trained with PyTorch's Adam; moving a model between the page and Python with .safetensors; and a
// help desk for your own app, built and then tested so its threshold is chosen from measurements.
// Small functions come from engine/helpdesk.js and engine/tinygpt.js (parity8.test.js holds them to
// the Python). PyTorch's numbers were measured in the desktop app's Python when the lesson was written;
// the help desk's, with MiniLM in Node.js (the page can differ in the last decimal places).
import * as G from '../engine/tinygpt.js'
import * as H from '../engine/helpdesk.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const causalMask = n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => j > i))
const weightCount = model => G.PARAMS.reduce((s, name) => s + model[name].length * model[name][0].length, 0)
const zeroModel = (vocab, dim, context, hidden) => {
  const m = (r, c) => Array.from({ length: r }, () => Array(c).fill(0))
  return { tok: m(vocab, dim), pos: m(context, dim), wq: m(dim, dim), wk: m(dim, dim), wv: m(dim, dim), wo: m(dim, dim), w1: m(dim, hidden), w2: m(hidden, dim), out: m(dim, vocab) }
}
const BIG = G.initModel(30, 16, 16, 64, 1)
const adamFirstStep = (g, lr = 0.01, b1 = 0.9, b2 = 0.99, eps = 1e-8) => {
  const m = (1 - b1) * g, v = (1 - b2) * g * g
  return lr * (m / (1 - b1)) / (Math.sqrt(v / (1 - b2)) + eps)
}

// The shipped help desk's test results with MiniLM, as [score, closest entry, right entry] (from 0;
// -1: none), measured when the lesson was written. The derivations below count them with the engine.
const MEASURED = [[0.422, 0, 0], [0.617, 0, 0], [0.643, 0, 1], [0.275, 0, 1], [0.508, 2, 2], [0.61, 2, 2], [0.58, 3, 3], [0.412, 4, 4], [0.637, 5, 5], [0.828, 6, 6], [0.117, 5, -1], [0.162, 4, -1], [0.206, 1, -1], [0.258, 2, -1], [0.384, 3, -1]]
const cost = (t, wrongCost = 3) => { const c = H.outcomes(MEASURED, t); return wrongCost * c.wrong + c.missed }

const FAQ_SAMPLE = 'Q: Where does my code run?\nQ: Is it real Python?\nA: In the page.\nIt is Pyodide.\n\nQ: Is it free?\nA: Yes.'

export const PART8 = {
  id: 'part8', title: 'Part 8 · Beyond the page: PyTorch and your own help desk', lessons: [
    {
      id: 'pytorch-gpt', number: '8.1', title: 'Your GPT, in PyTorch',
      goal: 'Rewrite the tiny GPT in PyTorch, match every line to the version you wrote by hand, and prove the two compute the same gradients.',
      builds: ['tiny-gpt', 'whole-path'],
      blocks: [
        { h: 'Why PyTorch, now that you can do without it' },
        { md: `Everything in Part 5 you wrote by hand: a \`Tensor\` that remembers how it was made, a \`backward\` for every operation, and Adam. That's exactly what **PyTorch** does, with three differences:
- its operations run as compiled loops in C++ instead of Python, many times faster
- it has hundreds of operations, each with its backward step already written
- the same code can run on a GPU

Real models are trained with PyTorch (or similar libraries), and reading their code is far easier once you have written the inside yourself.

This lesson runs on the **desktop app**, whose Python has PyTorch installed. PyTorch can't run inside a web page. Every *write it yourself* below still runs in the page, because none of them needs PyTorch.` },
        { h: 'The same model, line for line' },
        {
          mathCode: [
            ['XW', '`x @ self.wq`', 'tinygpt: `matmul(x, w["wq"])`. `@` is Python\'s matrix-product operator; PyTorch defines what it does for tensors'],
            ['E_{\\text{ids}}', '`self.tok[ids]`', 'tinygpt: `embed(w["tok"], ids)`. Indexing a tensor with a list of rows picks those rows'],
            ['K^\\top', '`k.T`', 'tinygpt: `transpose(k)`'],
            ['\\operatorname{softmax}(\\cdot)_{\\text{causal}}', '`torch.softmax(scores.masked_fill(mask, -inf), dim=-1)`', 'tinygpt: `causal_softmax`. The future is set to $-\\infty$, so its $e^{-\\infty} = 0$'],
            ['\\max(0, x)', '`torch.relu(…)`', 'tinygpt: `relu`'],
            ['-\\frac1n\\sum \\log p_{t}', '`torch.nn.functional.cross_entropy(logits, targets)`', 'tinygpt: `cross_entropy`: softmax, then the average −log of the right answer’s probability'],
            ['\\partial L / \\partial W', '`loss.backward()`, then `W.grad`', 'The same names as yours. Your `Tensor.backward` visits the steps last to first; so does PyTorch’s'],
          ],
        },
        {
          code: {
            file: 'torch_gpt.py', fn: '__init__', notes: [
              ['super().__init__()', ['`TinyGPT` is a `torch.nn.Module`, PyTorch’s building block for models. This line runs the Module’s own setup first.']],
              ['setattr(self, name, torch.nn.Parameter(torch.tensor(weights[name], dtype=torch.float64)))', [
                'Each of your nine weight matrices becomes a **Parameter**: a tensor that PyTorch will compute a gradient for, and that `net.parameters()` hands to the optimiser.',
                '`float64`: the same 64-bit numbers as a Python `float`, so the comparison below is exact to about 16 digits. Real training uses 32 bits, or 16, for speed.',
              ]],
            ],
          },
        },
        {
          code: {
            file: 'torch_gpt.py', fn: 'forward', notes: [
              ['x = self.tok[ids] + self.pos[:n]', ['The token and position vectors, added: lesson 5.6’s first line.']],
              ['q, k, v = x @ self.wq, x @ self.wk, x @ self.wv', ['Queries, keys and values (lesson 5.5).']],
              ['scores = q @ k.T / math.sqrt(self.wq.shape[0])', ['Every query against every key, scaled by $1/\\sqrt d$.']],
              ['weights = torch.softmax(scores.masked_fill(torch.tensor(causal_mask(n)), float("-inf")), dim=-1)', ['Where the mask is True (a later position), the score becomes $-\\infty$; softmax along each row (`dim=-1`, the last dimension) then gives it weight exactly 0.']],
              ['x = x + (weights @ v) @ self.wo', ['Attention’s output, through $W_O$, added back: a residual connection.']],
              ['x = x + torch.relu(x @ self.w1) @ self.w2', ['The MLP, also residual.']],
              ['return x @ self.out', ['Logits for every next character. No backward code anywhere: PyTorch recorded each operation as it ran, as your `Tensor(…, parents)` did.']],
            ],
          },
        },
        {
          code: {
            file: 'torch_gpt.py', fn: 'causal_mask', notes: [
              ['return [[j > i for j in range(n)] for i in range(n)]', ['Row $i$ is position $i$ looking at every position $j$; it may only look at $j \\le i$. The ones to hide are $j > i$: the part above the diagonal.']],
            ],
          },
        },
        {
          derive: {
            title: 'Why −∞ hides the future',
            intro: 'Position 1 (counting from 0) has scores $[1, 1, 3]$ for positions 0, 1 and 2. Position 2 is in the future.',
            steps: [
              { prompt: 'After the mask, the score for position 2 is $-\\infty$. What is $e^{-\\infty}$?', number: 0, compute: () => Math.exp(-Infinity), why: 'As $x \\to -\\infty$, $e^x \\to 0$. Exactly 0 in floating point too.' },
              { prompt: 'So what weight does softmax give position 0? (2 decimal places)', number: 0.5, compute: () => Math.exp(1) / (Math.exp(1) + Math.exp(1) + Math.exp(-Infinity)), tolerance: 0.005, why: '$e^1 / (e^1 + e^1 + 0) = 1/2$. The future score of 3, the largest, has no effect at all.' },
              { prompt: 'Without the mask, what weight would position 2 get? (2 decimal places)', number: Math.exp(3) / (2 * Math.exp(1) + Math.exp(3)), compute: () => Math.exp(3) / (2 * Math.exp(1) + Math.exp(3)), tolerance: 0.005, why: '$e^3 / (2e + e^3) \\approx 0.79$: during training the model would mostly look at the character it is supposed to predict, and learn nothing useful.' },
            ],
          },
        },
        {
          write: {
            file: 'torch_gpt.py', fn: 'causal_mask',
            prompt: 'Write `causal_mask(n)`: an $n \\times n$ list of lists, `True` where position `i` (the row) would look at a later position `j` (the column), `False` everywhere else.',
            starter: 'def causal_mask(n):\n    # one row for each position i, one entry for each position j\n    pass\n',
            cases: cases(causalMask, [[1], [2], [3], [0]]),
            hint: '`[[j > i for j in range(n)] for i in range(n)]`',
          },
        },
        {
          derive: {
            title: 'How many numbers the model has',
            intro: 'Lesson 5.6’s model: a vocabulary of $V$ characters, $d$ numbers per position, a context of $C$ positions and $h$ hidden units in the MLP.',
            steps: [
              { prompt: '`tok` ($V \\times d$) and `out` ($d \\times V$): with $V = 30$ and $d = 16$, how many numbers together?', number: 960, compute: () => BIG.tok.length * BIG.tok[0].length + BIG.out.length * BIG.out[0].length, why: '$2 \\cdot 30 \\cdot 16 = 960$.' },
              { prompt: 'The four attention matrices, each $d \\times d$?', number: 1024, compute: () => ['wq', 'wk', 'wv', 'wo'].reduce((s, n) => s + BIG[n].length * BIG[n][0].length, 0), why: '$4 \\cdot 16^2 = 1024$.' },
              { prompt: 'With `pos` ($C \\times d$, $C = 16$) and the MLP’s `w1` and `w2` ($h = 64$), how many numbers in all?', number: weightCount(BIG), compute: () => weightCount(BIG), why: `$960 + 1024 + 256 + 2 \\cdot 16 \\cdot 64 = ${weightCount(BIG).toLocaleString('en-GB')}$. In PyTorch: \`sum(p.numel() for p in net.parameters())\`.` },
              { prompt: 'As a formula in $V$, $d$, $C$ and $h$?', answer: '2*V*d + C*d + 4*d^2 + 2*d*h', vars: { V: [2, 100], d: [2, 64], C: [2, 64], h: [2, 256] }, why: 'Embeddings and output $2Vd$, positions $Cd$, attention $4d^2$, MLP $2dh$. Real GPTs stack this block many times; GPT-2 small has 12 blocks and 124 million numbers.' },
            ],
          },
        },
        { h: 'The proof: the same gradients' },
        {
          code: {
            file: 'torch_gpt.py', fn: 'compare_gradients', notes: [
              ['logits, ours, _ = tg.forward(weights, ids)', ['Your tiny GPT, from lesson 5.6…']],
              ['loss.backward()', ['…and your backward pass.']],
              ['net = TinyGPT(weights)', ['The same weights, in PyTorch…']],
              ['torch_loss.backward()', ['…and PyTorch’s backward pass, which nobody in this lab wrote.']],
              ['out[name] = (mine - getattr(net, name).grad).abs().max().item()', ['For each weight matrix: the largest difference between your gradient and PyTorch’s, over all its entries.']],
            ],
          },
        },
        { python: { program: 'torch_gradients', label: 'Compare the gradients in real Python and PyTorch' } },
        { md: `Measured when this lesson was written (a vocabulary of 10, $d = 8$, 6 positions):

| | Yours | PyTorch |
|---|---|---|
| Loss | 2.3717205657814113 | 2.3717205657814113 |
| Largest gradient difference, any weight | – | $2.8 \\times 10^{-17}$ |

The losses agree in every digit. The gradients differ by at most $3 \\times 10^{-17}$, the size of rounding in the 16th digit: the two add up the same numbers in a different order. **Your backpropagation is exactly what PyTorch does.** This check is called **gradient checking**, and it is how you would test a backward step you write for a new operation.` },
        {
          choice: {
            prompt: 'The comparison was made in 64-bit floats. In 32-bit floats (what real training uses), the differences came out around $10^{-8}$. What does that tell you?',
            options: [
              { text: 'One of the two gradient computations has a bug.', why: 'A bug gives differences the size of the gradients themselves (up to 0.1 here), not a few units in the 8th digit.' },
              { text: 'Nothing is wrong: 32-bit floats keep about 7 digits, so they round around $10^{-8}$ of each value.', why: 'Yes. This is why the check uses 64 bits: with 16 digits, rounding (about $10^{-17}$) and a real bug are far apart.' },
              { text: 'PyTorch is more accurate than plain Python.', why: 'Both use the same IEEE floating-point numbers. With the same precision they agree to the last digit or two.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'pytorch-training', number: '8.2', title: 'Training in PyTorch, and moving models between page and desktop',
      goal: 'Train the tiny GPT with PyTorch’s Adam, measure how much faster it is and why, and move a model from the page to Python and back as a .safetensors file you write yourself.',
      builds: ['pytorch-gpt'],
      blocks: [
        { h: 'The training loop' },
        {
          code: {
            file: 'torch_gpt.py', fn: 'train_net', notes: [
              ['optimiser = torch.optim.Adam(net.parameters(), lr=lr, betas=(0.9, 0.99), eps=1e-8)', ['PyTorch’s Adam with your settings from lesson 5.6: $\\beta_1 = 0.9$, $\\beta_2 = 0.99$.']],
              ['start = rng.below(len(chars) - context - 1)', ['The same random windows as `tinygpt.train`, from the same `Rng`: so the two runs can be compared step by step.']],
              ['optimiser.zero_grad()', ['Set every `.grad` back to zero. PyTorch **adds** each backward pass into `.grad` (your `+=` in every backward step does the same), and the Parameters live on from step to step. Without this line, each step would use the sum of all the gradients so far.']],
              ['loss.backward()', ['Fill in `.grad` for every Parameter.']],
              ['optimiser.step()', ['Move every Parameter: your `adam_step`, in one line.']],
            ],
          },
        },
        {
          code: {
            file: 'torch_gpt.py', fn: 'train_torch', notes: [
              ['net = TinyGPT(tg.init_model(len(vocab), dim, context, hidden, seed))', ['The same starting weights as `tinygpt.train`.']],
            ],
          },
        },
        { python: { program: 'torch_train', label: 'Step through PyTorch training in real Python' } },
        {
          derive: {
            title: 'Adam’s first step (why both runs move together)',
            intro: 'At step 1, Adam’s averages start from 0: $m = (1 - \\beta_1) g$ and $v = (1 - \\beta_2) g^2$. Then it divides by $1 - \\beta_1^1$ and $1 - \\beta_2^1$.',
            steps: [
              { prompt: 'With gradient $g = 0.3$, what is $\\hat m = m / (1 - \\beta_1)$?', number: 0.3, compute: () => (1 - 0.9) * 0.3 / (1 - 0.9), tolerance: 1e-12, why: 'The correction exactly undoes the $(1 - \\beta_1)$: $\\hat m = g$.' },
              { prompt: 'So the first step is $\\text{lr} \\cdot \\hat m / (\\sqrt{\\hat v} + \\epsilon) = \\text{lr} \\cdot g / (|g| + \\epsilon)$. With lr = 0.01, how far does a weight with $g = 0.3$ move?', number: 0.01, compute: () => adamFirstStep(0.3), tolerance: 1e-6, why: '$0.01 \\cdot 0.3 / 0.3 = 0.01$.' },
              { prompt: 'And a weight with a gradient 150 times smaller, $g = 0.002$?', number: 0.01, compute: () => adamFirstStep(0.002), tolerance: 1e-6, why: 'Also 0.01: Adam’s first step is the learning rate times the gradient’s sign, whatever its size. PyTorch computes this as $\\frac{\\text{lr}}{1 - \\beta_1^t} \\cdot \\frac{m}{\\sqrt{v}/\\sqrt{1-\\beta_2^t} + \\epsilon}$: the same quantity rearranged, so the two runs differ only by rounding.' },
            ],
          },
        },
        { md: `Measured when this lesson was written, on the desktop with one thread:

| | Your \`tinygpt.train\` | PyTorch |
|---|---|---|
| 40 steps ($d = 8$): largest difference in the losses | – | $8.9 \\times 10^{-16}$ |
| One step, lesson 5.6’s size ($d = 16$, $h = 64$, 16 positions) | 10 ms | 0.9 ms (**12×** faster) |
| One step, 4 times wider ($d = 64$, $h = 256$, 32 positions) | 393 ms | 6.4 ms (**61×** faster) |

The two trainings are the same computation: after 40 steps their losses still agree to 15 digits. The difference is speed. Your \`matmul\` runs its three nested loops in Python, which looks up every variable and checks every number's type on every multiplication. PyTorch runs the same loops in compiled code on whole blocks of numbers at once. The wider model has 16 times more work per matrix product ($64^2$ against $16^2$), and the more work there is, the more PyTorch gains, because its fixed cost per operation is shared out over more numbers. On a GPU, thousands of those multiplications run at the same time.` },
        { h: 'Your model, from the page to Python and back' },
        { md: `Lesson 5.6’s **Download .safetensors** saves the model trained in the page, and \`load_safetensors\` reads it in Python. To go back, Python must write the *same* format: an 8-byte length, a JSON header, then the numbers. The header says, for each weight, its type, its shape, and which bytes are its numbers.` },
        {
          code: {
            file: 'tinygpt.py', fn: 'safetensors_header', notes: [
              ['"vocab": json.dumps(vocab, ensure_ascii=False, separators=(",", ":"))', ['The characters go in the metadata, written exactly as the page’s `JSON.stringify` writes them: no spaces, and “é” as itself, not `\\u00e9`.']],
              ['header[name] = {"dtype": "F32", "shape": [rows, cols], "data_offsets": [offset, offset + rows * cols * 4]}', ['F32: 32-bit floats, 4 bytes each. `data_offsets` is where this weight’s bytes start and stop, counted from the end of the header.']],
              ['offset += rows * cols * 4', ['The next weight starts where this one stopped.']],
            ],
          },
        },
        {
          code: {
            file: 'tinygpt.py', fn: 'save_safetensors', notes: [
              ['while (8 + len(text.encode("utf-8"))) % 8:', ['Spaces are added to the header until the numbers start at a multiple of 8 bytes: the page does the same, and fast loaders rely on it.']],
              ['handle.write(len(head).to_bytes(8, "little") + head + struct.pack(f"<{len(numbers)}f", *numbers))', ['The length (8 bytes, little-endian), the header, then every number as a little-endian float32 (`<f`), in the header’s order.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'Lesson 5.6’s model with 30 characters ($d = 16$, $C = 16$, $h = 64$) has 4,288 numbers. How many bytes of numbers follow the header?',
            answer: 4 * weightCount(BIG), compute: () => G.safetensorsHeader(Array.from({ length: 30 }, (_, i) => String.fromCharCode(97 + i)), BIG).out.data_offsets[1],
            explain: '$4288 \\times 4 = 17{,}152$ bytes: 4 bytes per float32. The header adds 840 more (835 bytes of JSON, padded to a multiple of 8).',
            misconceptions: [{ answer: weightCount(BIG) * 8, feedback: 'That would be 8 bytes each, float64. The file stores float32: 4 bytes per number.' }],
          },
        },
        {
          write: {
            file: 'tinygpt.py', fn: 'safetensors_header', prelude: 'import json', constants: ['PARAMS'],
            prompt: 'Finish `safetensors_header(vocab, model)`: after the metadata, add one entry for each name in `PARAMS`, in order: `{"dtype": "F32", "shape": [rows, cols], "data_offsets": [start, end]}`, where each weight’s bytes start where the previous one’s ended.',
            starter: 'def safetensors_header(vocab, model):\n    header = {"__metadata__": {"format": "upskillos-tiny-gpt", "version": "1",\n                               "vocab": json.dumps(vocab, ensure_ascii=False, separators=(",", ":"))}}\n    offset = 0\n    # one entry per name in PARAMS: dtype, shape, data_offsets (4 bytes per number)\n    return header\n',
            cases: cases(G.safetensorsHeader, [[['a', 'b'], zeroModel(2, 2, 2, 3)], [['é', '\n', 'x'], zeroModel(3, 1, 4, 2)], [['a'], zeroModel(1, 2, 1, 1)]]),
            hint: 'For each name: `rows, cols = len(model[name]), len(model[name][0])`, the entry with `[offset, offset + rows * cols * 4]`, then `offset += rows * cols * 4`.',
          },
        },
        {
          code: {
            file: 'torch_gpt.py', fn: 'continue_training', notes: [
              ['vocab, weights = tg.load_safetensors(path)', ['The page’s file, read as in lesson 5.6.']],
              ['tg.save_safetensors(out_path, vocab, net.to_lists())', ['Written back, for the page’s **Upload** button.']],
            ],
          },
        },
        {
          code: {
            file: 'torch_gpt.py', fn: 'to_lists', notes: [
              ['return {name: getattr(self, name).detach().tolist() for name in tg.PARAMS}', ['`detach()` takes the numbers without their gradient history; `tolist()` turns them into plain lists, the format `tinygpt.py` uses.']],
            ],
          },
        },
        { note: `Train in the page (lesson 5.6), press **Download .safetensors**, and save the file into the lab’s \`src/labs/nlp-studio/python\` folder. Then, in PowerShell in that folder, with the Python the desktop app installed:

\`\`\`
& "$env:APPDATA\\UpSkillOS\\aarcade-python\\venv\\Scripts\\python.exe" -c "import torch_gpt as T; print(T.continue_training('tiny-gpt.safetensors', open('../../../../README.md', encoding='utf-8').read(), 2000, 'tiny-gpt-more.safetensors')[-1])"
\`\`\`

It trains for 2,000 more steps on the repository’s README (any text works: characters the model doesn’t know are skipped) and prints the last loss. Upload \`tiny-gpt-more.safetensors\` in lesson 5.6 and generate from it. Checked when this lesson was written: a page-format model trained for 100 more steps in PyTorch (loss 2.69 to 1.82) loaded back into the page’s reader.`, kind: 'try' },
        {
          choice: {
            prompt: 'Someone deletes `optimiser.zero_grad()` from the training loop. What happens?',
            options: [
              { text: 'Nothing: `loss.backward()` replaces the old gradients.', why: '`backward()` *adds* into `.grad`, like the `+=` in your backward steps. The Parameters are the same objects every step, so old gradients stay.' },
              { text: 'Each step uses the sum of every gradient so far, so the steps point where the model was going long ago, and training goes wrong.', why: 'Yes. In your `tinygpt.train`, `forward` built fresh Tensors with zero gradients every step, so you never needed it. In PyTorch the Parameters persist, so you clear them yourself.' },
              { text: 'PyTorch raises an error.', why: 'It doesn’t: adding up gradients over several backward passes is sometimes wanted (to imitate a bigger batch), so PyTorch allows it silently.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'help-desk', number: '8.3', title: 'A help desk for your own app',
      goal: 'Turn a plain-text FAQ into a help desk that answers by meaning, using a pre-trained embedding model, and says “I don’t know” when nothing in it is close.',
      builds: ['grounding', 'pytorch-training'],
      blocks: [
        { h: 'The reliable kind of chatbot' },
        { md: `Lesson 7.4 ended with an honest finding: retrieval was reliable, and the small generating model was not. For a help desk inside your own app, you can keep the reliable half and drop the other: **every answer is written by a person**, and the model's only job is to find which answer a question is asking for. It can be wrong about *which* answer, but it can never invent one.

The data is a FAQ in plain text. Several questions can share one answer, because people ask the same thing in different words:

\`\`\`
Q: How do I save the model I trained?
Q: Can I download my tiny GPT?
A: Press Download .safetensors under the trainer.
\`\`\`` },
        {
          code: {
            file: 'helpdesk.py', fn: 'parse_faq', notes: [
              ['if line.lower().startswith("q:"):', ['A question: kept until its answer arrives. `lower()` lets “q:” work too.']],
              ['entries.append({"questions": questions, "answer": line[2:].strip()})', ['An answer closes an entry, with all the questions collected since the last one.']],
              ['elif line and entries and not questions:', ['Any other line continues the last answer, so answers can run over several lines.']],
            ],
          },
        },
        {
          write: {
            file: 'helpdesk.py', fn: 'parse_faq',
            prompt: 'Write `parse_faq(text)`. Lines starting `Q:` (or `q:`) collect questions; an `A:` line ends an entry `{"questions": [...], "answer": "..."}` (ignore an `A:` with no questions before it); any other non-blank line adds a space and itself to the last answer. Strip spaces from every line and from what follows `Q:` and `A:`, and skip an empty `Q:`.',
            starter: 'def parse_faq(text):\n    entries, questions = [], []\n    for raw in text.splitlines():\n        line = raw.strip()\n        # Q: line, A: line, or a line that continues the answer\n    return entries\n',
            cases: cases(H.parseFaq, [[FAQ_SAMPLE], ['A: stray answer\nq:  lower case?  \na: fine\nQ:\nQ: no answer'], ['']]),
            hint: 'Three branches: `startswith("q:")` appends `line[2:].strip()` to `questions` if it isn’t empty; `startswith("a:")` appends an entry if there are questions, then empties the list; otherwise `if line and entries and not questions:` adds `" " + line` to `entries[-1]["answer"]`.',
          },
        },
        {
          code: {
            file: 'helpdesk.py', fn: 'examples', notes: [
              ['return [(q, k) for k, e in enumerate(entries) for q in e["questions"]]', ['Every example question with its entry’s number. These are what MiniLM turns into vectors, once, when the FAQ changes.']],
            ],
          },
        },
        {
          code: {
            file: 'helpdesk.py', fn: 'best_entry', notes: [
              ['s = sum(a * b for a, b in zip(question_vector, v))', ['The cosine (lesson 7.2: normalized vectors).']],
              ['if s > score:', ['`>` and not `>=`: on a tie the earlier example keeps its place.']],
            ],
          },
        },
        {
          code: {
            file: 'helpdesk.py', fn: 'route', notes: [
              ['return best if score >= threshold else -1', ['The decision that makes it trustworthy: below the threshold, “I don’t know” (−1), and a person takes over.']],
            ],
          },
        },
        {
          write: {
            file: 'helpdesk.py', fn: 'best_entry',
            prompt: 'Write `best_entry(question_vector, example_vectors, example_entries)`: the dot product of the question with each example vector; return `(entry, score)` for the highest, where `entry` is that example’s entry from `example_entries`. Ties go to the earlier example; with no examples, return `(-1, -2.0)`.',
            starter: 'def best_entry(question_vector, example_vectors, example_entries):\n    best, score = -1, -2.0\n    # score each example; keep the best\n    return best, score\n',
            cases: cases(H.bestEntry, [[[0.6, 0.8, 0], [[1, 0, 0], [0.6, 0.8, 0], [0.6, 0.8, 0]], [2, 0, 1]], [[1, 0], [[0, 1], [0.8, 0.6]], [0, 1]], [[1, 0], [], []]]),
            hint: '`for v, k in zip(example_vectors, example_entries):`, compute `s`, and `if s > score: best, score = k, s`.',
          },
        },
        { figure: 'HelpDesk', caption: 'This lab’s own help desk: questions about NLP Studio, every answer true of the lab. Load MiniLM (23 MB), ask it things, move the threshold. Then replace the FAQ with one for your own app.' },
        { md: `Measured when this lesson was written, with the shipped FAQ:

| You ask | Closest example (score) | Answer at 0.4 |
|---|---|---|
| how do I save my model | “How do I save the model I trained?” (0.88) | entry 3 |
| is my code uploaded anywhere | “Where does my code run?” (0.61) | entry 1 |
| what is the meaning of life | (0.15) | I don’t know |

None of the words in “is my code uploaded anywhere” except “my code” appear in the matching question, and it still finds the right answer: that is what the pre-trained embedding adds over Part 3’s word counts. Lesson 8.4 measures how often this works, and what the threshold should be.` },
        {
          choice: {
            prompt: 'Why does this help desk never give a false fact, while lesson 7.4’s grounded SmolLM2 sometimes did?',
            options: [
              { text: 'MiniLM is a better model than SmolLM2.', why: 'They do different jobs. MiniLM only scores similarity; it couldn’t write an answer at all.' },
              { text: 'Every answer is one a person wrote; the model only chooses which one, or none.', why: 'Yes. The worst it can do is choose the wrong entry, a mistake you can measure (lesson 8.4) and fix with better examples. A generating model can write a sentence nobody wrote.' },
              { text: 'The threshold stops every mistake.', why: 'The threshold stops answers to questions far from every example. A question close to the *wrong* example still gets the wrong answer, as 8.4 measures.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'help-desk-tests', number: '8.4', title: 'Testing the help desk, and choosing its threshold',
      goal: 'Test the help desk on questions it never saw, count its four kinds of outcome, and choose the threshold that costs least, given that a wrong answer is worse than “I don’t know”.',
      builds: ['help-desk', 'evaluation'],
      blocks: [
        { h: 'Four outcomes, not two' },
        { md: `A help desk can be wrong in two ways, and they are not equally bad:
- **wrong**: it answers, with the wrong entry. This includes answering a question it should have refused. The user is misled.
- **missed**: it says “I don’t know”, though an answer existed. The user asks a person.

And right in two ways: **right** (the right entry) and **refused** (“I don’t know”, rightly). The threshold trades the two errors against each other. Raise it, and fewer wrong answers get through, but more good ones are refused.

To measure this you need **test questions the FAQ never saw** (lesson 3.5’s held-out data again), each labelled with the entry that should answer it, or *none*.` },
        {
          code: {
            file: 'helpdesk.py', fn: 'parse_tests', notes: [
              ['question, _, label = line.rpartition("=>")', ['Split at the *last* `=>`, so a question can contain one.']],
              ['tests.append((question.strip(), -1 if label == "none" else int(label) - 1))', ['People count entries from 1; the code counts from 0. “none” is −1, the same as `route`’s “I don’t know”.']],
            ],
          },
        },
        {
          write: {
            file: 'helpdesk.py', fn: 'outcomes', given: ['route'],
            prompt: 'Write `outcomes(results, threshold)`. Each result is `[score, best, right]`. Use `route(best, score, threshold)`: if it gives −1, count `"refused"` when `right` is −1 and `"missed"` otherwise; if it answers, count `"right"` when the answer equals `right`, else `"wrong"`. Return the dictionary of all four counts.',
            starter: 'def outcomes(results, threshold):\n    counts = {"right": 0, "wrong": 0, "refused": 0, "missed": 0}\n    # route each result, then count it in one of the four\n    return counts\n',
            cases: cases(H.outcomes, [[MEASURED, 0.4], [MEASURED, 0.3], [[[0.9, 0, 0], [0.2, 1, -1], [0.5, 2, 1]], 0.6], [[], 0.5]]),
            hint: '`answered = route(best, score, threshold)`, then `counts["refused" if right == -1 else "missed"] += 1` or `counts["right" if answered == right else "wrong"] += 1`.',
          },
        },
        { h: 'Choosing the threshold by cost' },
        { md: `Which threshold is best depends on what the mistakes cost *you*. Say a wrong answer is 3 times as bad as a missed one (the user acted on it, then had to ask a person anyway). The cost of a threshold on the test questions is then

$$\\text{cost}(t) = 3 \\cdot \\text{wrong}(t) + \\text{missed}(t)$$

and you choose the $t$ with the lowest cost. This is a **decision rule**: the model gives scores; the costs of the mistakes decide where the line goes.` },
        {
          derive: {
            title: 'The cost of three thresholds, from the measured test',
            intro: 'The shipped help desk’s 15 test questions, scored by MiniLM when this lesson was written. A wrong answer costs 3, a missed one 1.',
            steps: [
              { prompt: `At $t = 0.3$ there are ${H.outcomes(MEASURED, 0.3).wrong} wrong answers and ${H.outcomes(MEASURED, 0.3).missed} missed. The cost?`, number: cost(0.3), compute: () => cost(0.3), why: `$3 \\cdot ${H.outcomes(MEASURED, 0.3).wrong} + ${H.outcomes(MEASURED, 0.3).missed} = ${cost(0.3)}$. The second wrong answer is “who wrote this lab” (0.38), answered with the entry about downloads.` },
              { prompt: `At $t = 0.4$: ${H.outcomes(MEASURED, 0.4).wrong} wrong, ${H.outcomes(MEASURED, 0.4).missed} missed. The cost?`, number: cost(0.4), compute: () => cost(0.4), why: `$3 \\cdot ${H.outcomes(MEASURED, 0.4).wrong} + ${H.outcomes(MEASURED, 0.4).missed} = ${cost(0.4)}$: the out-of-scope question is now refused.` },
              { prompt: `At $t = 0.5$: ${H.outcomes(MEASURED, 0.5).wrong} wrong, ${H.outcomes(MEASURED, 0.5).missed} missed. The cost?`, number: cost(0.5), compute: () => cost(0.5), why: `$${cost(0.5)}$: two good answers (0.42 and 0.41) are now refused as well, and the wrong answer at 0.64 still gets through.` },
              { prompt: 'Over every threshold from 0 to 0.9 in steps of 0.05, which costs least?', number: H.chooseThreshold(MEASURED, H.THRESHOLDS)[0], compute: () => H.chooseThreshold(MEASURED, H.THRESHOLDS)[0], tolerance: 1e-9, why: `${H.chooseThreshold(MEASURED, H.THRESHOLDS)[0]}, with cost ${H.chooseThreshold(MEASURED, H.THRESHOLDS)[1]}. The gap is narrow: the highest out-of-scope score is 0.38 and the lowest right one 0.41.` },
            ],
          },
        },
        {
          write: {
            file: 'helpdesk.py', fn: 'choose_threshold', given: ['route', 'outcomes'],
            prompt: 'Write `choose_threshold(results, thresholds, wrong_cost=3)`: for each threshold, the cost `wrong_cost * wrong + missed` (from `outcomes`); return `(threshold, cost)` for the lowest cost, the earlier threshold on a tie.',
            starter: 'def choose_threshold(results, thresholds, wrong_cost=3):\n    best = None\n    # for each threshold: its cost; keep the cheapest\n    return best\n',
            cases: cases(H.chooseThreshold, [[MEASURED, H.THRESHOLDS], [MEASURED, H.THRESHOLDS, 1], [MEASURED, H.THRESHOLDS, 10], [[[0.9, 0, 0]], [0.5, 0.95]]]),
            hint: '`c = outcomes(results, t)`, `cost = wrong_cost * c["wrong"] + c["missed"]`, and `if best is None or cost < best[1]: best = (t, cost)`.',
          },
        },
        { figure: 'HelpDeskTest', caption: 'Run the test questions against the help desk from lesson 8.3. Move the threshold and the cost of a wrong answer, and watch the four counts and the cost curve. Then edit the FAQ in 8.3 and test again.' },
        { h: 'What the test found' },
        { md: `Measured when this lesson was written, at the cheapest threshold, 0.4: **8 right, 5 rightly refused, 1 wrong, 1 missed**, out of 15.

| Test question | Should be | Got (score) | Why |
|---|---|---|---|
| how can I run the code step by step | entry 2 (stepping) | entry 1 (0.64) | “run” and “code” match “Where does my code run?” better than anything matches “step by step” |
| where can I watch the variables change | entry 2 | missed (0.28) | no example question mentions variables or watching |

Neither error can be fixed by the threshold: one scores higher than most right answers, the other lower than an out-of-scope question. They are fixed with **data**. Adding one example question to entry 2, “Can I watch my program run line by line?”, measured **9 right, 0 missed**. The step-by-step question still went to entry 1 (0.66): an example that matches its exact wording would be needed.

**But be careful how you read that 9.** Once you change the FAQ *because of* the test questions, they are no longer unseen: you have fitted the help desk to them, as a model overfits its training data (lesson 5.6). The honest score needs fresh questions. Ten new ones, written after the change, measured 7 right and 3 rightly refused, with no mistakes, at a threshold of 0.3. Keep a set of test questions you never look at while editing, and use it only at the end.` },
        { h: 'Using it in your own app' },
        { md: `**Download helpdesk.json** (above, after a test run) saves the entries, the threshold, and each example question with its vector. The help desk in your own JavaScript app is then a few lines with transformers.js:

\`\`\`js
import { pipeline } from '@huggingface/transformers'
import desk from './helpdesk.json'

const embed = await pipeline('feature-extraction', desk.model, { dtype: 'q8' })

export async function answer(question) {
  const [q] = (await embed([question], { pooling: 'mean', normalize: true })).tolist()
  let best = -1, score = -2
  for (const ex of desk.examples) {
    const s = ex.vector.reduce((t, a, d) => t + a * q[d], 0)
    if (s > score) { best = ex.entry; score = s }
  }
  return score >= desk.threshold ? desk.entries[best].answer : null   // null: hand over to a person
}
\`\`\`

Use the same model and the same settings (\`q8\`, mean pooling, normalized) as the vectors were made with: a different model's vectors live in a different space, and their cosines mean nothing. In Python the same model is \`sentence-transformers/all-MiniLM-L6-v2\` (with the \`sentence-transformers\` package), and \`best_entry\` and \`route\` are the functions you wrote.` },
        {
          choice: {
            prompt: 'Your help desk gives 2 wrong answers on 50 test questions. You add example questions until all 50 pass, then report “100% on the test”. What is wrong with that?',
            options: [
              { text: 'Nothing: the help desk now answers every test question correctly.', why: 'On *those* questions. They guided your changes, so they now measure how well you fitted them, not how the help desk does on questions users will really ask.' },
              { text: 'The test questions have been used to make the changes, so they no longer measure unseen questions; a fresh test set is needed for an honest score.', why: 'Yes: the same reason a model is scored on held-out text (lessons 3.5 and 5.6). Measured here: after one fix, the old test said 9 of 10 answerable questions right; only fresh questions can say whether that holds.' },
              { text: 'You should have raised the threshold instead.', why: 'The threshold can’t fix a question that scores high against the wrong entry; better examples can. The problem is only in how the result is reported.' },
            ],
            answer: 1,
          },
        },
      ],
    },
  ],
}
