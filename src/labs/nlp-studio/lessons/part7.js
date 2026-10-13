// Part 7: real pre-trained models, next to what you built. GPT-2's byte-level BPE, MiniLM sentence
// embeddings, SmolLM2-135M-Instruct chatting in the page, grounding it with retrieved facts and
// routing, and fine-tuning Bot 3 with LoRA. The small functions come from engine/pretrained.js and
// engine/chat.js (parity7.test.js holds them to the Python). The models' outputs quoted in the text
// were measured when the lesson was written (in Node.js with the same files; the page can phrase an
// answer slightly differently, because its arithmetic runs on a different engine).
import * as P from '../engine/pretrained.js'
import * as Ch from '../engine/chat.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const TABLE = P.bytesToUnicode()
const printable = Object.entries(TABLE).filter(([b, c]) => c.codePointAt(0) === Number(b)).length

export const PART7 = {
  id: 'part7', title: 'Part 7 · Real pre-trained models', lessons: [
    {
      id: 'real-tokenizer', number: '7.1', title: 'A real tokenizer: GPT-2’s byte-level BPE',
      goal: 'Run GPT-2’s tokenizer next to your own BPE, and explain every odd symbol in its tokens from the UTF-8 bytes of lesson 1.1.',
      builds: ['bpe', 'three-bots'],
      blocks: [
        { h: 'From your models to real ones' },
        { md: `Everything so far you built from nothing, on tiny data. Real language models are the same ideas trained on billions of words. This part downloads three real models from **Hugging Face** (the main public library of models) and runs them in this page with **transformers.js**:

| Model | What it is | Download |
|---|---|---|
| GPT-2’s tokenizer | the BPE that GPT-2 (2019) reads text with | ${P.MODELS.tokenizer.size} |
| MiniLM | a small model that turns a sentence into 384 numbers | ${P.MODELS.embedder.size} |
| SmolLM2-135M-Instruct | a small chat model: 135 million weights | ${P.MODELS.chat.size} |

Nothing downloads until you press a button. After the first time, your browser keeps the files.` },
        { h: 'Bytes, not characters' },
        { md: `Your BPE in lesson 5.3 started from characters. GPT-2's starts from **bytes**: the UTF-8 bytes of lesson 1.1. With 256 possible bytes as the starting symbols, *every* text can be encoded, in any language, with emoji, with no unknown token ever.

One practical problem: many bytes aren't printable (a space, a newline, the bytes inside “é”), and the merges and the vocabulary file are stored as text. So GPT-2 maps each of the 256 bytes to a printable character. Bytes that already are printable keep their own; the others are given characters from 256 upwards. That is why GPT-2's tokens are full of **Ġ** (a space) and pairs like **Ã©** (the two bytes of “é”).` },
        {
          code: {
            file: 'pretrained.py', fn: 'bytes_to_unicode', notes: [
              ['bs = list(range(ord("!"), ord("~") + 1))', [`The bytes that are printable already: ! to ~, ¡ to ¬, and ® to ÿ: ${printable} of them. They stand for themselves.`]],
              ['if b not in bs:', ['Every other byte value…']],
              ['cs.append(256 + n)', ['…gets the next character from 256 upwards, in order. The 33rd such byte is the space (32), so it gets $256 + 32 = 288$: **Ġ**.']],
            ],
          },
        },
        {
          derive: {
            title: 'Where Ġ comes from',
            intro: 'Byte values 0 to 32 (control codes and the space) are all unprintable, and come first in order.',
            steps: [
              { prompt: 'How many byte values are *not* printable, out of 256?', number: 256 - printable, compute: () => 256 - Object.entries(P.bytesToUnicode()).filter(([b, c]) => c.codePointAt(0) === Number(b)).length, why: `$256 - ${printable} = ${256 - printable}$ get a stand-in character.` },
              { prompt: 'The space is byte 32, and bytes 0 to 31 come before it. It is the how-many-th unprintable byte, counting from 0?', number: 32, compute: () => 32, why: 'Bytes 0–31 are numbers 0–31 in the list of stand-ins, so the space is number 32.' },
              { prompt: 'So which code point does the space get?', number: 288, compute: () => P.bytesToUnicode()[32].codePointAt(0), why: '$256 + 32 = 288$: the character Ġ. Every GPT-2 token that starts with Ġ is a word that had a space before it.' },
            ],
          },
        },
        { python: { program: 'byte_symbols', label: 'Watch the byte table being built in real Python' } },
        { figure: 'GptTokenizer', caption: 'Download GPT-2’s tokenizer (1.4 MB) and compare its tokens with your BPE from lesson 5.3 on any text. The small numbers are token ids: what the model really receives.' },
        { md: `Measured when this lesson was written:

| Text | GPT-2 tokens |
|---|---|
| my chain snapped on the hill | my · Ġchain · Ġsnapped · Ġon · Ġthe · Ġhill (6) |
| antidisestablishmentarianism | ant · idis · establishment · arian · ism (5) |
| café 🙂 | c · af · Ã© · ĠðŁĻĤ (4) |

Common words are one token, with their leading space built in. A rare long word breaks into familiar pieces. “é” is its two UTF-8 bytes, and the emoji its four, merged into one token because emoji are common on the web. GPT-2's vocabulary has 50,257 tokens: the 256 bytes, 50,000 learned merges, and one special end-of-text token.` },
        {
          write: {
            file: 'pretrained.py', fn: 'byte_symbols', given: ['bytes_to_unicode'],
            prompt: 'Write `byte_symbols(text)`: the text’s UTF-8 bytes, each replaced by its character from `bytes_to_unicode()`, joined into one string.',
            starter: 'def byte_symbols(text):\n    table = bytes_to_unicode()\n    # text.encode("utf-8") gives the bytes; look each up\n    pass\n',
            cases: cases(P.byteSymbols, [['my chain'], ['café'], ['Hello, world!'], ['🙂']]),
            hint: '`"".join(table[b] for b in text.encode("utf-8"))`',
          },
        },
      ],
    },

    {
      id: 'sentence-embeddings', number: '7.2', title: 'Meaning from billions of words',
      goal: 'Turn sentences into vectors with a pre-trained model, compare their meanings, and rebuild Bot 2 on them.',
      builds: ['real-tokenizer', 'meaning-bot'],
      blocks: [
        { h: 'Part 4, with real data' },
        { md: `In Part 4 you trained word vectors on 63 sentences and averaged them into sentence vectors. **MiniLM** does the same job, but its network was trained on more than a billion pairs of related sentences, and instead of averaging fixed word vectors it reads the whole sentence through six transformer layers (Part 5's block, repeated), so every word's vector depends on the words around it. The last step is the one you know: **average the token vectors** (mean pooling) and normalize, so a dot product is a cosine.` },
        {
          code: {
            file: 'pretrained.py', fn: 'mean_pool', notes: [
              ['total = sum(mask)', ['The mask is 1 for real tokens and 0 for **padding**: when sentences of different lengths are processed together, the short ones are filled up with padding tokens, which mustn’t count.']],
              ['return [sum(v[d] * m for v, m in zip(token_vectors, mask)) / total', ['The average, dimension by dimension, over the real tokens only: lesson 4.6’s sentence vector, made from much better token vectors.']],
            ],
          },
        },
        {
          code: {
            file: 'pretrained.py', fn: 'normalize', notes: [
              ['return [x / size for x in v] if size else v', ['Length 1: for two such vectors the dot product *is* the cosine (lesson 3.1), so comparing is one multiplication per number.']],
            ],
          },
        },
        { figure: 'EmbeddingExplorer', caption: 'Download MiniLM (23 MB). Edit the sentences and watch their similarities; then ask Bot 2 rebuilt on MiniLM, next to Part 4’s version.' },
        { md: `Measured when this lesson was written:

- “my chain snapped” and “my bicycle chain broke”: **0.83**. Almost no words in common, the same meaning.
- “are you open on sunday” and “what time do you close”: **0.52**. No words in common, a related question.
- “do you sell pizza” is close to nothing here (0.27 at most).

Bot 2 rebuilt on MiniLM (each message answered with the intent of its most similar example phrase, as in lesson 4.6) sends “my chain snapped” (0.40), “my bicycle chain broke” (0.50) and “my wheel is bent” (0.49) to **repair**, and “is the shop open on saturday” to **hours** (0.73). “do you sell pizza” scores only 0.31 against every example and “what is the meaning of life” 0.21: with the similarity needed set to 0.35, both get an honest “not sure”. This is how many real help desks work today: a pre-trained embedding model, your own examples, nearest neighbour.` },
        {
          derive: {
            title: 'Mean pooling by hand',
            intro: 'Three token vectors $[1, 2]$, $[3, 4]$ and a padding token $[100, 100]$, with mask $[1, 1, 0]$.',
            steps: [
              { prompt: 'The first number of the pooled vector?', number: 2, compute: () => P.meanPool([[1, 2], [3, 4], [100, 100]], [1, 1, 0])[0], why: '$(1 + 3)/2 = 2$: the padding token is ignored.' },
              { prompt: 'Normalizing $[2, 3]$ divides by its length. What is that length, to 3 decimal places?', number: Math.sqrt(13), compute: () => Math.sqrt(2 * 2 + 3 * 3), tolerance: 0.0006, why: '$\\sqrt{4 + 9} = \\sqrt{13} \\approx 3.606$.' },
              { prompt: 'Without the mask, the padding would be averaged in. What would the first number be then?', number: (1 + 3 + 100) / 3, compute: () => P.meanPool([[1, 2], [3, 4], [100, 100]], [1, 1, 1])[0], tolerance: 0.001, why: '$104 / 3 \\approx 34.7$: one padding token would swamp the meaning.' },
            ],
          },
        },
        {
          write: {
            file: 'pretrained.py', fn: 'mean_pool',
            prompt: 'Write `mean_pool(token_vectors, mask)`: the average of the vectors whose mask is 1, one number per dimension.',
            starter: 'def mean_pool(token_vectors, mask):\n    total = sum(mask)\n    # for each dimension d: the masked sum divided by total\n    pass\n',
            cases: cases(P.meanPool, [[[[1, 2], [3, 4], [100, 100]], [1, 1, 0]], [[[1, 1, 1]], [1]], [[[2, 0], [0, 2], [4, 4]], [1, 1, 1]]]),
            hint: '`[sum(v[d] * m for v, m in zip(token_vectors, mask)) / total for d in range(len(token_vectors[0]))]`',
          },
        },
      ],
    },

    {
      id: 'pretrained-chat', number: '7.3', title: 'A pre-trained chat model in your browser',
      goal: 'Run a real 135-million-weight chat model in the page, read the chat template it was trained on, and find out what it knows and where it fails.',
      builds: ['sentence-embeddings', 'chat-format'],
      blocks: [
        { h: 'Bot 3, grown up' },
        { md: `**SmolLM2-135M-Instruct** is a transformer like Bot 3, with 30 blocks instead of one, 9 attention heads instead of one, and 135 million weights instead of 20,000. It was **pre-trained** on about two trillion tokens of web text, code and maths, then **fine-tuned** on conversations, with the loss on the assistant's turns (lesson 6.3).

Its conversation format is called **ChatML**. It is lesson 6.1's idea with longer special tokens: \`<|im_start|>\` plays the part of « and », and \`<|im_end|>\` the part of ¶.` },
        {
          code: {
            file: 'pretrained.py', fn: 'chat_template', notes: [
              ['"<|im_start|>" + m["role"] + "\\n" + m["content"] + "<|im_end|>\\n"', ['Each message: a start token, the role (system, user or assistant), the text, an end token.']],
              ['text += "<|im_start|>assistant\\n"', ['The **generation prompt**: an open assistant turn, exactly like Bot 3’s », so the model’s next tokens are its reply. It stops when it writes `<|im_end|>`.']],
            ],
          },
        },
        {
          derive: {
            title: 'Why the download is 137 MB',
            intro: 'The model has about 135 million weights.',
            steps: [
              { prompt: 'Stored as 32-bit floats (4 bytes each), how many megabytes is that? (Take 135 million weights.)', number: 540, compute: () => 135e6 * 4 / 1e6, why: '$135 \\times 4 = 540$ MB, which is the size of the full-precision file on Hugging Face.' },
              { prompt: 'Quantized to 8 bits (1 byte each), as this lab downloads it?', number: 135, compute: () => 135e6 * 1 / 1e6, why: 'About 135 MB; the file is 137 MB with its embeddings and extras. **Quantization** rounds every weight to one of 256 levels: four times smaller, slightly less exact.' },
              { prompt: 'A model with $N$ million weights at $b$ bits each: how many megabytes? (A formula in $N$ and $b$.)', answer: 'N*b/8', vars: { N: [1, 1000], b: [2, 32] }, why: '$N \\cdot b / 8$: bits to bytes. A 7-billion-weight model at 4 bits is still 3.5 GB, which is why models that run on a laptop are small or heavily quantized.' },
            ],
          },
        },
        { figure: 'SmolChat', caption: 'Download SmolLM2 (137 MB) and talk to it. Change the system message; open “What the model actually reads” to see the ChatML it is given.' },
        { h: 'What it knows, and what it does with instructions' },
        { md: `Measured when this lesson was written (greedy decoding):

| You ask | SmolLM2-135M answers |
|---|---|
| What is the capital of France? | “The capital of France is Paris. …” |
| Are you open on Sunday? (no system message) | “I'm a helpful AI named SmolLM, … I'm available on Sundays from 10 am” |
| Are you open on Sunday? (the shop's hours in the system message) | “Yes, I am open on Sunday.” |
| How much is a service? (it says 40 pounds) | “A basic service costs $40.” |
| Do you sell pizza? (it says only bikes) | “I sell pizza.” |

Pre-training gave it **knowledge**: Paris, which Bot 3 could never know. But a model this small follows **instructions** poorly: it half-uses the facts (“$40” instead of 40 pounds) and contradicts them (“I sell pizza”). The next size up, SmolLM2-360M (365 MB), measured better on the service price and still claimed to sell pizza in one of two prompt styles. Following instructions reliably comes with size; Bot 3's “confident nonsense” (lesson 6.6) doesn't go away by itself.` },
        {
          write: {
            file: 'pretrained.py', fn: 'chat_template',
            prompt: 'Write `chat_template(messages, add_generation_prompt=True)`: each message as `<|im_start|>role`, a newline, the content, `<|im_end|>` and a newline; then, if asked, `<|im_start|>assistant` and a newline.',
            starter: 'def chat_template(messages, add_generation_prompt=True):\n    text = ""\n    # one block per message, then the open assistant turn\n    return text\n',
            cases: cases(P.chatTemplate, [[[{ role: 'system', content: 'S' }, { role: 'user', content: 'hi' }]], [[{ role: 'user', content: 'x' }], false], [[]]]),
            hint: '`"".join("<|im_start|>" + m["role"] + "\\n" + m["content"] + "<|im_end|>\\n" for m in messages)`',
          },
        },
      ],
    },

    {
      id: 'grounding', number: '7.4', title: 'Grounding: find the facts first',
      goal: 'Retrieve the facts relevant to a question with sentence embeddings, refuse questions outside the shop before generating, and measure what that fixes and what it doesn’t.',
      builds: ['pretrained-chat', 'tf-idf'],
      blocks: [
        { h: 'Retrieval-augmented generation' },
        { md: `A language model's knowledge is whatever was in its training text, frozen at training time. It doesn't know this shop's hours, and putting every fact into every prompt doesn't scale (and, as 7.3 showed, small models get confused). The standard answer is **retrieval-augmented generation** (RAG):

1. **Retrieve**: embed the question and every fact (lesson 7.2), and take the few facts most similar to the question (lesson 3.3's search, with better vectors).
2. **Route**: if even the best fact is a poor match, the question is outside what you can answer. Say so, *without* asking the model, which would otherwise make something up.
3. **Generate**: give the model only the relevant facts, with an instruction to use only them.` },
        {
          code: {
            file: 'pretrained.py', assign: 'FACTS', notes: [
              ['"Monday to Friday the shop is open from nine to six."', ['The shop’s knowledge base: short sentences, each one fact. Real systems have thousands of these, cut from documents.']],
            ],
          },
        },
        {
          code: {
            file: 'pretrained.py', fn: 'top_facts', notes: [
              ['scores = [(sum(a * b for a, b in zip(question_vector, f)), i) for i, f in enumerate(fact_vectors)]', ['Normalized vectors, so each dot product is a cosine.']],
              ['return sorted(scores, key=lambda pair: (-pair[0], pair[1]))[:k]', ['The k best, as (score, which fact).']],
            ],
          },
        },
        {
          code: {
            file: 'pretrained.py', fn: 'grounded_messages', notes: [
              ['rules = "You are the help desk of a bike shop.', ['The instruction: only these facts, and permission to say it doesn’t know.']],
              ['"\\n".join("- " + f for f in facts)', ['Only the retrieved facts, as a list: a short, focused prompt.']],
            ],
          },
        },
        { figure: 'GroundedBot', caption: 'The whole pipeline, stage by stage: the retrieved facts and their scores, the routing decision, the grounded answer, and the same model with no help for comparison. It needs both MiniLM and SmolLM2.' },
        { md: `Measured when this lesson was written, routing below 0.3:

| Question | Best fact (score) | Answer |
|---|---|---|
| do you sell pizza? | “We sell bikes, …. We do not sell food.” (0.52) | “No, I do not sell pizza.” |
| is the shop open on saturday? | “On Saturday the shop is open from nine to five.” (0.85) | “yes, the shop is open on saturday.” |
| what is the meaning of life? | (0.12; 0.19 in the page) | routed away: no model answer at all |
| my chain snapped | “We repair chains, brakes, …” (0.44) | “I'm sorry …, as a bike shop, I don't have the capability to assist with repairing your bike.” |

Grounding fixed the pizza answer that 7.3 got wrong, and routing stopped the model from rambling about the meaning of life. But retrieval found exactly the right fact for “my chain snapped”, and the 135-million-weight model still contradicted it. The retrieval half of the system is reliable; the generating half is only as reliable as the model. Which is why many real assistants still answer common questions the Bot 2 way (an intent and a reply written by a person) and use a generative model only where they must.` },
        {
          write: {
            file: 'pretrained.py', fn: 'top_facts',
            prompt: 'Write `top_facts(question_vector, fact_vectors, k=2)`: score every fact by its dot product with the question, and return the k best as `(score, index)` pairs, best first, ties to the earlier fact.',
            starter: 'def top_facts(question_vector, fact_vectors, k=2):\n    # (score, index) for each fact, sorted, first k\n    pass\n',
            cases: cases(P.topFacts, [[[0.6, 0.8, 0], [[0.6, 0.8, 0], [1, 0, 0], [0, 0.6, 0.8], [0, 1, 0]], 3], [[1, 0], [[0, 1], [1, 0]], 1], [[1, 0], [[0.5, 0], [0.5, 0]], 2]]),
            hint: '`sorted(scores, key=lambda pair: (-pair[0], pair[1]))[:k]`',
          },
        },
      ],
    },

    {
      id: 'lora', number: '7.5', title: 'Fine-tuning and LoRA',
      goal: 'Derive why LoRA trains so few numbers, fine-tune Bot 3 on new information with LoRA and in full, and measure catastrophic forgetting and how replay prevents it.',
      builds: ['grounding', 'bot3'],
      blocks: [
        { h: 'Teaching a trained model something new' },
        { md: `The shop changes its Sunday hours. Retrain Bot 3 from scratch? For a model with billions of weights that costs a fortune. **Fine-tuning** continues training an existing model on new examples. Two ways:

- **Full fine-tuning** changes every weight.
- **LoRA** (low-rank adaptation, Hu et al., 2021) freezes every original weight $W$ and learns a small change on the side: two thin matrices $A$ ($d_{\\text{in}} \\times r$) and $B$ ($r \\times d_{\\text{out}}$), with a small **rank** $r$. The layer computes $xW + (xA)B$. $B$ starts at zero, so at first nothing changes.` },
        {
          derive: {
            title: 'How many numbers LoRA trains',
            intro: 'A weight matrix of size $d \\times d$, and LoRA with rank $r$.',
            steps: [
              { prompt: 'How many numbers does full fine-tuning change in that matrix?', answer: 'd^2', vars: { d: [2, 4096] }, why: 'Every entry.' },
              { prompt: 'How many does LoRA train? ($A$ is $d \\times r$, $B$ is $r \\times d$.)', answer: '2*d*r', vars: { d: [2, 4096], r: [1, 64] }, why: '$dr + rd = 2dr$.' },
              { prompt: 'For Bot 3’s $32 \\times 32$ attention matrices with $r = 2$: LoRA trains how many, per matrix?', number: 128, compute: () => Ch.loraSize(Ch.initLora({ wq: Array.from({ length: 32 }, () => Array(32).fill(0)) }, ['wq'], 2)), why: '$2 \\cdot 32 \\cdot 2 = 128$, instead of 1,024.' },
              { prompt: 'For a 4096 × 4096 matrix (a large model’s) with $r = 8$, what fraction of its numbers does LoRA train? (4 decimal places.)', number: (2 * 4096 * 8) / (4096 * 4096), compute: () => (2 * 4096 * 8) / (4096 * 4096), tolerance: 0.00006, why: '$65{,}536 / 16{,}777{,}216 \\approx 0.0039$: under half a percent. The change $AB$ can only have rank $r$, and it turns out that is usually enough.' },
            ],
          },
        },
        {
          code: {
            file: 'tinygpt.py', fn: 'through', notes: [
              ['out = matmul(x, w[name])', ['The frozen weight, as always.']],
              ['out = add(out, scale(matmul(matmul(x, w[name + ".a"]), w[name + ".b"]), lora["scale"]))', ['Plus the low-rank path: $x$ through the thin $A$, then $B$. $AB$ (a full $d \\times d$ matrix) is never built while training.']],
            ],
          },
        },
        {
          code: {
            file: 'chat.py', fn: 'init_lora', notes: [
              ['a[name] = [[(rng.random() * 2 - 1) / math.sqrt(rows)', ['$A$: small random numbers…']],
              ['b[name] = [[0.0] * cols for _ in range(rank)]', ['…and $B$ all zeros, so $AB = 0$: before any training, the model is exactly the one you started from.']],
            ],
          },
        },
        {
          code: {
            file: 'chat.py', fn: 'finetune_chat', notes: [
              ['params[name + ".a"] = lora["a"][name]', ['With LoRA, only the A and B matrices go to the optimiser…']],
              ['params = {name: model[name] for name in tg.PARAMS}', ['…without it, every weight of the model.']],
              ['logits, weights, _ = tg.forward(model, ids, True, lora)', ['The same forward pass, with the adapters added in.']],
            ],
          },
        },
        {
          code: {
            file: 'chat.py', fn: 'merge_lora', notes: [
              ['merged[name][i][j] += lora["scale"] * sum(a[i][r] * b[r][j] for r in range(len(b)))', ['After training, $W + AB$ can be folded into one plain matrix: the fine-tuned model runs exactly as fast as the original. Or keep the adapter separate (a small file) and swap adapters on one shared model.']],
            ],
          },
        },
        { python: { program: 'lora_matmul', label: 'Step through LoRA in real Python' } },
        { figure: 'LoraLab', caption: 'Fine-tune your Bot 3 (from lesson 6.4) on the new Sunday hours. Try it without replay first, then with; then compare LoRA with full fine-tuning.' },
        { h: 'What the measurement says' },
        { md: `Measured when this lesson was written, on the default Bot 3 (exactly right; “everything else” is a quarter of the other training conversations):

| Fine-tuning | Steps | New Sunday | Other 6 days | Everything else | Numbers trained |
|---|---|---|---|---|---|
| Bot 3 before | – | 0% | 100% | 75% | – |
| Full, new Sunday only | 100 | 100% | **17%** | 47% | 20,032 |
| LoRA r2 on the MLP, new Sunday only | 100 | 100% | **17%** | 57% | 640 |
| Full, **with replay** | 300 | 100% | 96% | 68% | 20,032 |
| LoRA r2 on all six, **with replay** | 300 | 100% | 92% | **75%** | 1,152 |
| Full, with replay | 800 | 100% | 100% | 63% | 20,032 |
| LoRA r2 on all six, with replay | 800 | 100% | 92% | **81%** | 1,152 |

Three lessons, in order of importance:

1. **Training only on the new thing breaks the old ones.** Taught only about Sunday, the bot answers “nine to five” for every day. This is **catastrophic forgetting**, and LoRA does *not* prevent it.
2. **Replay prevents it**: mix the old conversations in with the new. The other days come back to 92–100%.
3. **With replay, LoRA keeps the rest better than full fine-tuning** (75–81% against 63–68%) while training 6% of the numbers: the original weights can’t drift, only the small change can.` },
        {
          write: {
            file: 'pretrained.py', fn: 'lora_matmul',
            prompt: 'Write `lora_matmul(x, w, a, b, scale=1.0)`: $xW + \\text{scale} \\cdot (xA)B$, for matrices as lists of rows, without ever computing $AB$.',
            starter: 'def lora_matmul(x, w, a, b, scale=1.0):\n    # xw = x times w; xa = x times a; xab = xa times b; then add entry by entry\n    pass\n',
            cases: cases(P.loraMatmul, [[[[1, 2]], [[1, 0], [0, 1]], [[1], [1]], [[0.5, -0.5]], 2], [[[1, 0], [0, 1]], [[2, 0], [0, 2]], [[1], [0]], [[0, 0]], 1], [[[1, 1]], [[1], [1]], [[1, 0], [0, 1]], [[1], [2]], 0.5]]),
            hint: 'Write a small matrix product with three nested sums, use it three times, then `[[p + scale * q for p, q in zip(r1, r2)] for r1, r2 in zip(xw, xab)]`.',
          },
        },
        {
          choice: {
            prompt: 'You fine-tune a model on a new fact using only examples of that fact, and it gets the new fact right but older answers wrong. What is the most direct fix?',
            options: [
              { text: 'Switch to LoRA: it can’t forget, because the original weights are frozen.', why: 'Measured: LoRA on new data alone forgot just as badly (other days 17%). The frozen weights don’t help if the added change overrides them.' },
              { text: 'Replay: train on the new examples mixed with the old ones.', why: 'Yes: the model is reminded of the old answers while it learns the new one. In the measurement, the other days came back from 17% to 92–100%.' },
              { text: 'Train for fewer steps.', why: 'At 100 steps the damage was already done. Fewer steps would just learn the new fact less.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'whole-path', number: '7.6', title: 'The whole path',
      goal: 'Connect every part of the lab into one picture of how a chatbot works, from bytes to a fine-tuned model, and know what to learn next.',
      builds: ['lora'],
      blocks: [
        { h: 'From bytes to a chatbot' },
        { md: `Every step of a real chat model is now something you have built, measured, or both:

| A real assistant does… | You did it in… |
|---|---|
| Reads text as UTF-8 bytes | 1.1 (and GPT-2’s byte symbols, 7.1) |
| Splits it into tokens with BPE | 5.3, 7.1 |
| Turns tokens into vectors (embeddings) | 4.4, 5.6, 7.2 |
| Mixes information between positions with attention | 5.5 |
| Stacks transformer blocks with residual connections | 5.6 (one block; SmolLM2 has 30) |
| Predicts a probability for every next token, with softmax | 3.6, 5.4 |
| Learns by gradient descent on the cross-entropy loss, with backpropagation | 4.4, 5.4 |
| Is measured on text it never saw, and watched for overfitting | 3.5, 5.6 |
| Is fine-tuned on conversations, with the loss on its own turns | 6.3, 6.4 |
| Is fine-tuned again, cheaply, with LoRA | 7.5 |
| Writes a reply by sampling, with temperature and top-k, until an end token | 5.2, 6.5 |
| Is grounded in retrieved facts, and routed when it can’t answer | 3.3, 7.4 |

And the honest limits, all measured: small models memorise (5.6), copy poorly (6.4), answer confidently outside what they know (6.6), and follow instructions unreliably (7.3). Scale fixes some of this; grounding, routing and testing on held-out data are how you live with the rest.` },
        { h: 'Where to go next' },
        { md: `- **PyTorch**: everything in this lab's \`tinygpt.py\` is a few lines in PyTorch, which computes the same gradients automatically and runs on a GPU. Neural Net Lab teaches it; this lab's autograd is what it does inside.
- **Bigger models, same code**: Andrej Karpathy's *nanoGPT* is a full GPT-2 training script you can now read line by line.
- **Your own data**: every figure that trains takes your text. A help-desk bot for your own app is lesson 7.2's embeddings plus lesson 7.4's routing, with your questions and answers.` },
        {
          choice: {
            prompt: 'A user asks your shop’s assistant a question its facts don’t cover. Which design gives the most trustworthy behaviour?',
            options: [
              { text: 'A bigger language model, with all the facts in every prompt.', why: 'Better, but still a model writing what is likely: with nothing relevant to go on it will often answer anyway.' },
              { text: 'Retrieve the relevant facts, route away questions whose best match is weak, and only then generate from the retrieved facts.', why: 'Yes: the routing decision is made by a measurable similarity score, before the model gets a chance to make something up.' },
              { text: 'A higher temperature, so it doesn’t repeat itself.', why: 'Temperature changes variety, not truthfulness. It makes confident nonsense more varied.' },
            ],
            answer: 1,
          },
        },
      ],
    },
  ],
}
