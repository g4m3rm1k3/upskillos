// Part 6: from a language model to a chatbot. Conversations as tokens with special tokens, dialogue
// data from templates, the loss mask, Bot 3 trained in the page (saved, downloaded, uploaded),
// decoding with stop tokens, temperature and top-k, and an honest comparison of the three bots.
// Numbers come from engine/chat.js, which parity6.test.js holds to the Python. Training results
// quoted in the text were measured when the lesson was written (the engine is deterministic, so the
// figure reproduces them exactly with the default settings).
import * as Ch from '../engine/chat.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const [TRAIN, HELD] = Ch.makeDialogues()
const EXAMPLE = Ch.formatDialogue([['user', 'where is order 512'], ['bot', 'order 512 ships tomorrow.']])
const COUNTS = Object.fromEntries(Ch.TEMPLATES.map(([kind, questions]) => [kind, questions.length]))
const [, ROLES] = Ch.toTokens(TRAIN.slice(0, 1), { below: () => 0 })

export const PART6 = {
  id: 'part6', title: 'Part 6 · From a language model to a chatbot', lessons: [
    {
      id: 'chat-format', number: '6.1', title: 'A conversation is just text',
      goal: 'Write a conversation as one sequence of tokens with special tokens for who is speaking, and see why a language model can then hold a conversation.',
      builds: ['tiny-gpt'],
      blocks: [
        { h: 'The trick behind every chatbot' },
        { md: `A language model only continues text. A chatbot answers. The step between them is surprisingly small: **write the conversation as text**, in a fixed format the model learns, and ask the model to continue it right after the place where the bot's reply should begin.

The format needs a way to say who is speaking and where a turn ends. Real chat models use **special tokens** for this, tokens that never appear in ordinary text, like \`<|user|>\` and \`<|end|>\`. Bot 3 uses three single symbols:

| Token | Meaning |
|---|---|
| \`«\` | a user turn starts |
| \`»\` | a bot turn starts |
| \`¶\` | the turn ends |

So “where is order 512” and its answer become **${EXAMPLE.length} tokens**: \`${EXAMPLE.join(' ')}\`.` },
        { h: 'Word tokens, this time' },
        { md: `Part 5's GPT read characters. Bot 3 reads **words**: a small bot in a small world has a small vocabulary (${Ch.makeVocab(TRAIN).length} tokens in all), and a whole conversation is about 20 word tokens instead of 60 characters. That matters: to answer “my **wheel** is bent” the bot has to copy “wheel” from the question into its answer, and copying one token is far easier than copying five characters in the right order. The first version of this part used characters and copied the wrong word most of the time.

Two details make word tokens work:

- **Numbers become single digits.** “512” is \`5 1 2\`: ten digit tokens can write any number, including ones never seen.
- **Unknown words become \`<unk>\`.** A word not in the vocabulary (“rusty”, “pizzeria”) is read as one shared token meaning “something I don't know”. (BPE, lesson 5.3, is how large models avoid this: they can always fall back to smaller pieces.)` },
        {
          code: {
            file: 'chat.py', fn: 'chat_tokens', notes: [
              ['for t in tokenize(text.lower()):', ['Part 1’s tokenizer: words, and punctuation as tokens of their own.']],
              ['out.extend(t)', ['A number: `extend` with a string adds each character, so "512" becomes "5", "1", "2".']],
            ],
          },
        },
        {
          code: {
            file: 'chat.py', fn: 'format_dialogue', notes: [
              ['out += [USER if role == "user" else BOT] + chat_tokens(words) + [END]', ['Marker, words, end of turn: for every turn, in order. A conversation of any length is one flat list.']],
            ],
          },
        },
        { python: { program: 'chat_format', label: 'Watch it in real Python' } },
        { figure: 'DialogueFormat', caption: 'Edit the conversation: the tokens below are exactly what Bot 3 reads. Dark tokens are the special tokens.' },
        { md: `To answer a new message, Bot 3 is given the conversation so far, then \`«\`, the message, \`¶\`, \`»\`, and asked to continue. It writes one token at a time, each time feeding everything back in, until it writes \`¶\`: its turn is over. That last part, **stopping**, is lesson 6.5.` },
        {
          predict: {
            prompt: 'How many tokens is the formatted conversation `« hello ¶ » hello ! how can i help ? ¶`, written from the user’s “hello” and the bot’s “hello! how can i help?”?',
            compute: () => Ch.formatDialogue([['user', 'hello'], ['bot', 'hello! how can i help?']]).length, answer: Ch.formatDialogue([['user', 'hello'], ['bot', 'hello! how can i help?']]).length,
            explain: '« hello ¶ is 3; » hello ! how can i help ? ¶ is 9 (the ! and ? are tokens of their own). **12**.',
          },
        },
        {
          write: {
            file: 'chat.py', fn: 'format_dialogue', given: ['is_number', 'chat_tokens'], prelude: 'USER, BOT, END, UNKNOWN = "«", "»", "¶", "<unk>"', also: [['text_basics.py', 'char_kind'], ['text_basics.py', 'tokenize']],
            prompt: 'Write `format_dialogue(turns)`: for each `(role, words)`, add `«` (user) or `»` (bot), the words’ tokens, and `¶`. `chat_tokens` is written for you.',
            starter: 'def format_dialogue(turns):\n    out = []\n    # marker, chat_tokens(words), END for each turn\n    return out\n',
            cases: cases(Ch.formatDialogue, [[[['user', 'hello'], ['bot', 'hello! how can i help?']]], [[['user', 'where is order 512'], ['bot', 'order 512 ships tomorrow.']]], [[]]]),
            hint: '`out += [USER if role == "user" else BOT] + chat_tokens(words) + [END]` inside `for role, words in turns:`.',
          },
        },
      ],
    },

    {
      id: 'dialogue-data', number: '6.2', title: 'Where the conversations come from',
      goal: 'Generate training conversations from templates and slots, count how many there are, and set aside combinations the bot will never see, to test it honestly.',
      builds: ['chat-format'],
      blocks: [
        { h: 'Part 5’s lesson: more data' },
        { md: `Part 5's GPT memorised 63 sentences instead of learning from them. A chatbot needs many conversations. Real assistants are trained on hundreds of thousands of conversations written by people. Bot 3 gets its conversations from **templates**: a few ways of asking for each thing, with **slots** to fill (a day, a bike part, a problem, an order number), and the answer, with the same slots.

Every combination of slot values makes a different conversation. That multiplies a few lines of templates into hundreds of conversations, and it gives an honest test: some **combinations are kept out of training entirely**. If the bot answers “my wheel is bent” correctly having seen “my wheel is broken” and “my brake is bent” but never that pair, it has learned the pattern, not the sentence.` },
        {
          code: {
            file: 'chat.py', assign: 'TEMPLATES', notes: [
              ['("hours", ["when are you open on {day}"', ['Each entry: a kind, the ways a user asks, and the bot’s answer. `{day}` and `{hours}` are slots.']],
            ],
          },
        },
        {
          code: {
            file: 'chat.py', fn: 'fill', notes: [
              ['out = out.replace("{" + name + "}", value)', ['`replace` swaps every occurrence: the same `{part}` in the question and in the answer get the same value.']],
            ],
          },
        },
        {
          code: {
            file: 'chat.py', fn: 'make_dialogues', notes: [
              ['combos = [{"part": p, "problem": q} for p in PARTS for q in PROBLEMS]', ['Every part with every problem: a list comprehension with two `for`s gives all the pairs.']],
              ['combos = [{"number": str(100 + rng.below(900))} for _ in range(orders)]', ['Order numbers can’t all be listed, so 60 random three-digit numbers.']],
              ['if kind == "repair" and (slots["part"], slots["problem"]) in HELD_OUT:', ['Four part–problem pairs never go into training, in any of their three phrasings…']],
              ['elif kind == "order" and len(held) < 40 and rng.random() < 0.15:', ['…and some orders are held out too, so their **numbers** are never seen.']],
            ],
          },
        },
        { figure: 'TemplateExplorer', caption: 'Each kind of conversation: its templates, some of the conversations they make, and the held-out ones.' },
        {
          derive: {
            title: 'How many conversations?',
            intro: `Questions per kind: hours ${COUNTS.hours}, repair ${COUNTS.repair}, order ${COUNTS.order}, other ${COUNTS.other}, and ${COUNTS.greeting + COUNTS.thanks + COUNTS.goodbye} greetings, thanks and goodbyes with no slots.`,
            steps: [
              { prompt: `Hours: ${COUNTS.hours} questions × ${Ch.DAYS.length} days =`, number: COUNTS.hours * Ch.DAYS.length, compute: () => TRAIN.concat(HELD).filter(([, b]) => b.startsWith('on ')).length, why: 'The multiplication principle of lesson 2.1: every question with every day.' },
              { prompt: `Repair: ${COUNTS.repair} questions × ${Ch.PARTS.length} parts × ${Ch.PROBLEMS.length} problems =`, number: COUNTS.repair * Ch.PARTS.length * Ch.PROBLEMS.length, compute: () => TRAIN.concat(HELD).filter(([, b]) => b.startsWith('bring')).length, why: `Of these, ${Ch.HELD_OUT.length} pairs × ${COUNTS.repair} phrasings = ${Ch.HELD_OUT.length * COUNTS.repair} are held out.` },
              { prompt: `In all, with ${COUNTS.order} × 60 = 180 order questions and ${COUNTS.other} × ${Ch.THINGS.length} “other” ones: how many conversations?`, number: TRAIN.length + HELD.length, compute: () => TRAIN.length + HELD.length, why: `${COUNTS.hours * 7} + ${COUNTS.repair * 36} + 180 + ${COUNTS.other * 6} + ${COUNTS.greeting + COUNTS.thanks + COUNTS.goodbye} = ${TRAIN.length + HELD.length}: ${TRAIN.length} for training and ${HELD.length} held out.` },
            ],
          },
        },
        { note: `Templates are honest about what they teach: the bot learns these patterns and nothing else. Ask it about the weather and it will answer with something from a bike shop. Real assistants learn from enormous, varied text first (Part 7), then from conversations; Bot 3 shows the second step on its own.`, kind: 'warn' },
        {
          write: {
            file: 'chat.py', fn: 'fill',
            prompt: 'Write `fill(template, slots)`: replace every `{name}` in the template with `slots[name]`.',
            starter: 'def fill(template, slots):\n    out = template\n    # for each name and value: replace "{name}" with value\n    return out\n',
            cases: cases(Ch.fill, [['my {part} is {problem}', { part: 'chain', problem: 'broken' }], ['bring it in and we will fix the {part}.', { part: 'wheel' }], ['hello', {}], ['{a} and {a}', { a: 'x' }]]),
            hint: '`for name, value in slots.items(): out = out.replace("{" + name + "}", value)`',
          },
        },
      ],
    },

    {
      id: 'loss-mask', number: '6.3', title: 'Train on the bot’s words only',
      goal: 'Mark which tokens are the bot’s, average the loss over those only, and explain why the model should read the user but never be graded on writing like one.',
      builds: ['dialogue-data'],
      blocks: [
        { h: 'Read everything, learn to write one side' },
        { md: `Trained the Part 5 way, the model would learn to predict *every* token, including the user's. It would spend half its effort learning to imitate users, and could happily continue a conversation by writing the next *user* message.

The fix: still feed it the whole conversation (the user's words are what the answer depends on), but count the loss **only where the next token is the bot's**. A weight of 1 on the bot's tokens, 0 on everything else, and a **weighted average**:

$$L = \\frac{\\sum_i w_i \\, (-\\log p_i)}{\\sum_i w_i}$$

The same idea, called **loss masking**, is used to fine-tune real chat models on conversations.` },
        { python: { program: 'chat_step', label: 'Step through a masked training step in real Python' } },
        { figure: 'DialogueFormat', props: { showMask: true }, caption: 'The same conversation, with the tokens that count in the loss underlined in green: each bot turn’s words and its ¶. The » itself doesn’t count: the user decides when the bot speaks, not the bot.' },
        {
          code: {
            file: 'chat.py', fn: 'to_tokens', notes: [
              ['order[i], order[j] = order[j], order[i]', ['A **Fisher–Yates shuffle**, with the lab’s own random numbers so the page and Python shuffle identically: conversations in random order, so a training window mixes kinds.']],
              ['bot_starts = len(chat_tokens(user)) + 3', ['«, the user’s words, ¶ and »: the bot’s part starts after them.']],
              ['roles += [0] * bot_starts + [1] * (len(piece) - bot_starts)', ['A 0 or 1 for every token: whose it is.']],
            ],
          },
        },
        {
          code: {
            file: 'chat.py', fn: 'loss_mask', notes: [
              ['return [roles[start + 1 + i] for i in range(context)]', ['Position $i$ predicts token $i + 1$, so its weight is that **next** token’s role.']],
            ],
          },
        },
        {
          code: {
            file: 'tinygpt.py', fn: 'cross_entropy', notes: [
              ['n = sum(weights)', ['Divide by the total weight, not the number of positions: the average is over the bot’s tokens only.']],
              ['loss -= w * math.log(p[t])', ['A weight of 0 removes the position from the loss…']],
              ['logits.grad[i][j] += g * w * (pj - (1.0 if j == t else 0.0))', ['…and from the gradient: nothing at that position is pushed in any direction.']],
            ],
          },
        },
        {
          derive: {
            title: 'A masked average',
            intro: 'A window of 4 positions with losses $[2.0, 0.5, 1.0, 0.1]$ and weights $[0, 1, 1, 0]$.',
            steps: [
              { prompt: 'What is the masked loss $\\frac{\\sum w_i \\ell_i}{\\sum w_i}$?', number: 0.75, compute: () => (0 * 2 + 0.5 + 1 + 0 * 0.1) / 2, why: '$(0.5 + 1.0) / 2 = 0.75$: only the middle two count.' },
              { prompt: 'And the unmasked average of all four?', number: 0.9, compute: () => (2 + 0.5 + 1 + 0.1) / 4, why: '$3.6 / 4 = 0.9$. The 2.0 might be the user’s first word, unpredictable and not the bot’s job.' },
              { prompt: 'With weights all 1, write the masked formula’s value in terms of the losses’ sum $S$ and the number of positions $n$.', answer: 'S/n', vars: { S: [0, 20], n: [1, 50] }, why: 'All weights 1: it is the ordinary average, which is why Part 5’s code needed no change, only a default.' },
            ],
          },
        },
        {
          write: {
            file: 'chat.py', fn: 'loss_mask',
            prompt: 'Write `loss_mask(roles, start, context)`: the list of `context` weights for a window starting at `start`, where position $i$’s weight is the role of the token at `start + 1 + i`.',
            starter: 'def loss_mask(roles, start, context):\n    # one weight per position: the role of the NEXT token\n    pass\n',
            cases: cases(Ch.lossMask, [[[0, 0, 0, 1, 1, 1, 0, 0, 1, 1], 0, 5], [[0, 0, 0, 1, 1, 1, 0, 0, 1, 1], 3, 6], [ROLES, 0, ROLES.length - 1]]),
            hint: '`[roles[start + 1 + i] for i in range(context)]`',
          },
        },
      ],
    },

    {
      id: 'bot3', number: '6.4', title: 'Bot 3: train your own chatbot',
      goal: 'Train a transformer chatbot in the page, measure it on conversations it has never seen, and save, download and reload it.',
      builds: ['loss-mask'],
      blocks: [
        { h: 'Putting it together' },
        { md: `Bot 3 is the tiny GPT of lesson 5.6, unchanged, trained on the templated conversations with the bot-only loss. With word tokens it needs a context of 32 tokens (one or two conversations); everything else is the same code.` },
        {
          code: {
            file: 'chat.py', fn: 'train_chat', notes: [
              ['tokens, roles = to_tokens(pairs, rng)', ['All the conversations as one shuffled list of tokens, with their roles.']],
              ['vocab = make_vocab(pairs)', ['Every token in the conversations, plus the special tokens and `<unk>`.']],
              ['mask = loss_mask(roles, start, context)', ['A random window and its mask…']],
              ['if sum(mask) == 0:', ['…skipped if it has no bot tokens at all (there would be nothing to learn and nothing to divide by).']],
              ['loss = tg.cross_entropy(logits, targets, mask)', ['The masked loss of lesson 6.3, then the usual backward step and Adam.']],
            ],
          },
        },
        { figure: 'ChatTrainer', caption: 'Train Bot 3 (about a minute or two), then talk to it. When training ends it answers every held-out conversation and reports how many replies are exactly right. Download it to keep it; upload it later, in this lesson or after reloading the page.' },
        { h: 'What the measurement says' },
        { md: `Measured when this lesson was written, with the default settings (10,000 steps; the engine is deterministic, so the figure gives the same numbers):

| | Exactly right |
|---|---|
| Training messages | 71% |
| **Held-out repairs** (part and problem never seen together) | **83%** (100% after 15,000 steps) |
| Held-out orders (numbers never seen) | about 30% |

The held-out repairs are the important line. “my wheel is bent”, “can you fix a loose pedal”: the bot never saw these pairs, and answers them right. It learned the pattern *a part and a problem → fix that part*, and it **copies** the part from the question with attention.

The orders show its limit. “where is order 553” came back as “order 325”: the right digits, wrong order. Copying a three-token sequence in order needs attention to track positions precisely, and one attention head in one block mostly can't. Real transformers copy reliably thanks to many layers and many heads working together (researchers call the circuit an **induction head**).

One more thing to try in the chat: the conversation so far is part of every prompt, so **earlier turns change later answers**. Ask “my wheel is bent” as the first message, then again after asking about opening hours. When this lesson was written the first got “…fix the wheel.” and the second “…fix the chain.”: the extra context pushed it the wrong way. The measurements above ask each question in a fresh conversation.` },
        {
          choice: {
            prompt: 'Bot 3 answers “my wheel is bent” correctly, though that pair was held out of training. What does that show?',
            options: [
              { text: 'It memorised the answer.', why: 'It can’t have: that conversation was never in its training data, in any of its three phrasings.' },
              { text: 'It learned a pattern (part + problem → fix that part) and applied it to a combination it hadn’t seen: it generalised.', why: 'Yes. That is the whole point of holding combinations out: the only way to get them right is to have learned the pattern.' },
              { text: 'The held-out test is broken.', why: 'The lab’s tests check that no held-out pair appears anywhere in the training conversations.' },
            ],
            answer: 1,
            verify: () => Ch.HELD_OUT.every(([p, q]) => !TRAIN.some(([u]) => u.includes(p) && u.includes(q))),
          },
        },
      ],
    },

    {
      id: 'decoding', number: '6.5', title: 'Answering: stop tokens, temperature and top-k',
      goal: 'Generate a reply token by token, stop at the end-of-turn token, and choose between greedy decoding, temperature and top-k.',
      builds: ['bot3', 'sampling'],
      blocks: [
        { h: 'Knowing when to stop' },
        { md: `Bot 3 learned to write \`¶\` at the end of every reply, because every bot turn in its training ends that way. So replying is: generate tokens until the model writes \`¶\` (or a safety limit), and show what came before it. Real chat models do exactly this with their own end-of-turn token. Without it, a language model just keeps writing, often inventing the user's next message.` },
        {
          code: {
            file: 'chat.py', fn: 'reply', notes: [
              ['prompt = history + [USER] + chat_tokens(message) + [END, BOT]', ['The conversation so far, the new message as a user turn, and » to say: the bot speaks now.']],
              ['ids = [index.get(t, index[UNKNOWN]) for t in prompt]', ['A word not in the vocabulary becomes `<unk>`.']],
              ['logits, _, _ = tg.forward(model, ids[-context:])', ['Only the last 32 tokens fit: older turns of a long conversation fall out of view.']],
              ['choice = max(range(len(last)), key=lambda i: (last[i], -i))', ['Temperature 0: **greedy**, always the most likely token (ties: the lower index).']],
              ['probs = top_k(probs, k)', ['With top-k, only the k most likely tokens can be sampled.']],
              ['if vocab[choice] == END:', ['The bot ended its turn: stop.']],
            ],
          },
        },
        { h: 'Top-k' },
        { md: `Temperature (lesson 5.2) flattens or sharpens the whole distribution. Its weakness: even at a moderate temperature, the hundreds of unlikely tokens together get a real chance, and one bad pick derails the rest of the reply. **Top-k sampling** removes the tail first: keep the $k$ most likely tokens, share their probability out again so it adds up to 1, and sample from those only.` },
        {
          code: {
            file: 'chat.py', fn: 'top_k', notes: [
              ['keep = sorted(range(len(probs)), key=lambda i: (-probs[i], i))[:k]', ['The indices of the k largest probabilities.']],
              ['return [probs[i] / total if i in keep else 0.0 for i in range(len(probs))]', ['Divide by their total so they add up to 1; every other token gets exactly 0.']],
            ],
          },
        },
        {
          derive: {
            title: 'Top-k by hand',
            intro: 'Probabilities $[0.1, 0.4, 0.2, 0.3]$.',
            steps: [
              { prompt: 'With $k = 2$, the two kept are 0.4 and 0.3. What do they add up to?', number: 0.7, compute: () => 0.4 + 0.3, why: 'The kept probability mass.', tolerance: 1e-9 },
              { prompt: 'So the new probability of the top token is?', number: Ch.topK([0.1, 0.4, 0.2, 0.3], 2)[1], compute: () => Ch.topK([0.1, 0.4, 0.2, 0.3], 2)[1], tolerance: 1e-4, why: '$0.4 / 0.7 \\approx 0.571$.' },
              { prompt: 'In general, a kept token with probability $p$, when the kept ones add up to $s$, gets?', answer: 'p/s', vars: { p: [0.01, 0.5], s: [0.5, 1] }, why: 'Every kept token is scaled by the same $1/s$: their ratios stay the same.' },
            ],
          },
        },
        { python: { program: 'chat_reply', label: 'Step through a reply in real Python' } },
        { figure: 'DecodeTrace', caption: 'Bot 3 answering one message, token by token: what it chose, with what probability, and its top 3. Raise the temperature and sample again; then turn on top-k.' },
        {
          write: {
            file: 'chat.py', fn: 'top_k',
            prompt: 'Write `top_k(probs, k)`: keep the k largest probabilities (ties: lower index first), divide them by their total, and set every other to 0.0.',
            starter: 'def top_k(probs, k):\n    # which k to keep, their total, then the new list\n    pass\n',
            cases: cases(Ch.topK, [[[0.1, 0.4, 0.2, 0.3], 1], [[0.1, 0.4, 0.2, 0.3], 2], [[0.1, 0.4, 0.2, 0.3], 4], [[0.25, 0.25, 0.5], 2]]),
            hint: '`keep = sorted(range(len(probs)), key=lambda i: (-probs[i], i))[:k]`, then `total = sum(probs[i] for i in keep)`.',
          },
        },
      ],
    },

    {
      id: 'three-bots', number: '6.6', title: 'Three bots, compared honestly',
      goal: 'Name what each of the three bots can and can’t do, test Bot 3 on things outside its world, and say what a real assistant adds.',
      builds: ['decoding', 'meaning-bot'],
      blocks: [
        { h: 'Try to break it' },
        { md: `Talk to Bot 3 below and push it outside the bike shop: “what is the meaning of life”, “are you open on christmas”, “my chain is rusty”. Watch for two kinds of answer:

- **Graceful**: “my chain is rusty” → it reads “rusty” as \`<unk>\`, and still fixes the chain, because “my chain is …” is enough.
- **Confident nonsense**: ask something it has no pattern for, and it answers with a pattern it does have, in perfect grammar. It never says it doesn't know, because nothing in its training ever said that. Large language models do this too, with far more convincing language: it is called **hallucination**, and the cause is the same. A language model writes what is *likely*, not what is *true*.

Measured with the default Bot 3 when this lesson was written:

| You type | Bot 3 answers |
|---|---|
| my chain is rusty | bring the bike in and we will fix the chain. |
| are you open on christmas | on friday we are open nine to six. |
| what is the meaning of life | order 595 ships tomorrow. |
| what is the weather today | order 5959 ships tomorrow. |
| do you sell bikes | sorry, i can only help with bikes. |
| can i buy a pizza here | bring the bike in and we will fix the wheel. |

The last two are the most revealing. A bike shop that won't sell bikes: every “do you sell …” in its training got that answer, so the pattern wins over the meaning. And one extra word, “**a** pizza”, was enough to push the message out of the “other” pattern into a repair. Bot 3 matches the shapes of sentences; it doesn't know what a bike, a pizza or a sale is.` },
        { figure: 'ThreeBots', caption: 'Bot 3, as trained or uploaded in lesson 6.4.' },
        { h: 'The three bots' },
        { md: `| | Bot 1 (lesson 2.6) | Bot 2 (lessons 3.6, 4.6) | Bot 3 (this part) |
|---|---|---|---|
| How it works | Patterns and reflection rules | Classifies the message into an intent; canned reply | A transformer writes the reply token by token |
| Learned from | Nothing: rules written by hand | Example phrases per intent | Hundreds of conversations |
| Its replies | Your words, turned around | Fixed, one per intent | Generated: can copy details (the day, the part) |
| Knows it doesn’t know? | No | **Yes**: a confidence threshold | No: it always writes something likely |
| Fix a mistake | Write another rule | Add an example phrase | More (and better) conversations, retrain |

Notice that Bot 2 is the most *reliable* and Bot 3 the most *capable*. That trade is real: many production assistants route a message to a classifier like Bot 2 when they can, and let a generative model answer when they can't, or use the generative model with retrieved facts in front of it (lesson 3.3's search, at scale).` },
        { h: 'What a real assistant adds' },
        { md: `Bot 3 and a real chat model share every idea in this lab: tokens, embeddings, attention, a loss on the next token, a chat format, a loss mask, sampling, a stop token. What differs is scale and order:

1. **Pre-training** on an enormous amount of ordinary text, until the model has learned language and a great deal about the world. Bot 3 skipped this: it only ever saw bike-shop conversations.
2. **Fine-tuning** on conversations, with the loss on the assistant’s turns, exactly like lesson 6.3.
3. Often a further step that learns from people’s preferences between answers.

Part 7 takes the real thing: a small **pre-trained** model, run in the browser, compared with what you built.` },
        {
          code: {
            file: 'chat.py', fn: 'detokenize', notes: [
              ['joined = i == 0 or t in (".", ",", "!", "?", "\'") or prev == "\'" or (is_number(t) and is_number(prev))', ['Tokens back to text: no space before punctuation, none around an apostrophe (“you ’ re” → “you’re”), none between digits (“5 1 2” → “512”).']],
            ],
          },
        },
        {
          choice: {
            prompt: 'Bot 3 answers “are you open on christmas” with “on friday we are open nine to six.” What is going on?',
            options: [
              { text: 'It has a bug in its date handling.', why: 'It has no date handling at all. It produced the most likely continuation it knows.' },
              { text: '“christmas” is an unknown word; the rest looks like an hours question, so it writes the most likely hours answer it knows, without any way of saying it doesn’t know.', why: 'Yes: fluent, confident and wrong. The same mechanism behind hallucinations in large models.' },
              { text: 'It is right: the shop is open on Christmas.', why: 'Nothing in its training says anything about Christmas. It isn’t reporting a fact.' },
            ],
            answer: 1,
          },
        },
        {
          write: {
            file: 'chat.py', fn: 'detokenize', given: ['is_number'],
            prompt: 'Write `detokenize(tokens)`: join with spaces, except no space before `. , ! ? \'`, none after `\'`, and none between two number tokens, and never before the first token.',
            starter: 'def detokenize(tokens):\n    text = ""\n    for i, t in enumerate(tokens):\n        prev = tokens[i - 1] if i else ""\n        # decide whether t joins on without a space\n    return text\n',
            cases: cases(Ch.detokenize, [[Ch.chatTokens("you're welcome.")], [Ch.chatTokens('order 512 ships tomorrow.')], [Ch.chatTokens('hello! how can i help?')], [[]]]),
            hint: '`joined = i == 0 or t in (".", ",", "!", "?", "\'") or prev == "\'" or (is_number(t) and is_number(prev))`, then add `t` or `" " + t`.',
          },
        },
      ],
    },
  ],
}
