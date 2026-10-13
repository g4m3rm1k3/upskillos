// The programs the Real Python tab can run: an entry function in python/, its JSON arguments,
// the values to watch, and a "jump" that runs to the next interesting line.
// view: how the middle panel draws the paused program ('tape', 'stack', 'chart', 'heads', 'chat').
import { SOURCES } from './source.js'
import { MESSAGES, INTENTS } from './engine/data.js'
import { words } from './engine/counting.js'
import { SENTENCES } from './engine/corpus.js'
import { trainBikeVectors } from './engine/vectors.js'
import { makeDialogues, trainChat } from './engine/chat.js'

// A small chat model for stepping a reply: trained in the page in a moment, so its answers are rough.
let smallChat = null
const smallChatModel = () => (smallChat ??= trainChat(makeDialogues()[0], 600, { dim: 16, context: 32, hidden: 32, lr: 0.01 }))

let bikeVectors = null
const trained = () => (bikeVectors ??= trainBikeVectors(SENTENCES))

export const lineOf = (file, text) => SOURCES[file].split('\n').findIndex(l => l.includes(text)) + 1

export const PROGRAMS = {
  tokenize: {
    label: 'Tokenizer (1.3)', file: 'text_basics.py', module: 'text_basics', function: 'tokenize', view: 'tape',
    about: 'The hand-written tokenizer from lesson 1.3, one character at a time: watch `ch`, `current` and `tokens`.',
    input: { name: 'text', label: 'Text', value: "Mr. Smith paid $3.50, didn't he?" },
    kwargs: v => ({ text: v }),
    watch: { tokens: ['tokens'], current: ['current'], ch: ['ch'] },
    jump: { label: 'Next token', targets: () => [['text_basics.py', lineOf('text_basics.py', 'tokens.append(current)')], ['text_basics.py', lineOf('text_basics.py', 'tokens.append(ch)')]] },
  },
  sentences: {
    label: 'Sentence splitter (1.6)', file: 'text_basics.py', module: 'text_basics', function: 'split_sentences', view: 'tape',
    about: 'The sentence splitter with both rules, from lesson 1.6. It only stops to think at . ! and ?.',
    input: { name: 'text', label: 'Text', value: 'Mr. Smith paid $3.50. Was it worth it? Yes!' },
    kwargs: v => ({ text: v }),
    watch: { sentences: ['sentences'], i: ['i'] },
    jump: { label: 'Next sentence', targets: () => [['text_basics.py', lineOf('text_basics.py', 'sentences.append(sentence)')]] },
  },
  parse: {
    label: 'Recursive descent (2.2)', file: 'parsing.py', module: 'parsing', function: 'parse', view: 'stack',
    about: 'The recursive-descent parser from lesson 2.2. The middle panel shows the stack of calls: which symbol each one is looking for, and where.',
    input: { name: 'sentence', label: 'Sentence', value: 'i saw the man with the telescope' },
    kwargs: v => ({ sentence: v }),
    watch: { words: ['words'] },
    jump: { label: 'Next word matched', targets: () => [['parsing.py', lineOf('parsing.py', 'return [((symbol, words[i]), i + 1)]')]] },
  },
  cky: {
    label: 'Chart parser (2.4)', file: 'parsing.py', module: 'parsing', function: 'cky', view: 'chart',
    about: 'The CKY chart parser from lesson 2.4: the chart in the middle is drawn from the running program’s own `table`.',
    input: { name: 'words', label: 'Sentence', value: 'i saw the man with the telescope' },
    kwargs: v => ({ words: v.toLowerCase().split(/\s+/).filter(Boolean) }),
    watch: { table: ['table'], words: ['words'], i: ['i'], j: ['j'], k: ['k'] },
    jump: { label: 'Next cell', targets: () => [['parsing.py', lineOf('parsing.py', 'table[(i, j)] = cell')]] },
  },
  dependencies: {
    label: 'Phrase tree to dependencies (2.5)', file: 'parsing.py', module: 'parsing', function: 'dependencies', view: 'heads',
    about: 'Turns the first parse of the sentence into a dependency tree, from lesson 2.5. Watch `heads` fill in as the walk returns from each phrase.',
    input: { name: 'sentence', label: 'Sentence', value: 'i saw the man with the telescope' },
    kwargs: (v, parse) => ({ tree: parse(v)[0] ?? ['S', []] }),
    watch: { heads: ['heads'] },
    jump: { label: 'Next phrase done', targets: () => [['parsing.py', lineOf('parsing.py', 'return main')]] },
  },
  eliza: {
    label: 'Bot 1 replies (2.6)', file: 'eliza.py', module: 'eliza', function: 'respond', view: 'chat',
    about: 'Bot 1 from lesson 2.6 answering one message: the rules tried in order, the match, the reflection.',
    input: { name: 'message', label: 'Message', value: "I'm worried about you" },
    kwargs: v => ({ message: v, turn: 0 }),
    watch: { text: ['text'], pattern: ['pattern'] },
    jump: { label: 'Next rule', targets: () => [['eliza.py', lineOf('eliza.py', 'match = re.fullmatch(pattern, text)')]] },
  },
  bigrams: {
    label: 'Bigram counts (3.2)', file: 'counting.py', module: 'counting', function: 'bigram_model', view: 'watch',
    about: 'Counts which word follows which, from lesson 3.2. Watch `follows` grow pair by pair.',
    input: { name: 'text', label: 'Text', value: 'claim your free prize now claim your free gift' },
    kwargs: v => ({ tokens: words(v) }),
    watch: { follows: ['follows'], after: ['after'] },
    jump: { label: 'Next pair', targets: () => [['counting.py', lineOf('counting.py', 'after[w2] = after.get(w2, 0) + 1')]] },
  },
  naive_bayes: {
    label: 'Naive Bayes, trained and tested (3.5)', file: 'bayes.py', module: 'bayes', function: 'evaluate', view: 'watch',
    about: 'Trains the spam filter on the first N messages and tests it on the last 10, from lessons 3.4 and 3.5. The input is N.',
    input: { name: 'n', label: 'Training messages', value: '6' },
    kwargs: v => ({ train: MESSAGES.slice(0, Math.max(1, Math.min(30, Number(v) || 6))), test: MESSAGES.slice(-10), positive: 'spam' }),
    watch: { score: ['score'], label: ['label'], scores: ['scores'], guesses: ['guesses'] },
    jump: { label: 'Next word scored', targets: () => [['bayes.py', lineOf('bayes.py', 'score += math.log((counts.get(w, 0) + k)')]] },
  },
  bot2: {
    label: 'Bot 2 answers (3.6)', file: 'bayes.py', module: 'bayes', function: 'chat', view: 'watch',
    about: 'Bot 2 trains on the bike shop’s intents and answers one message, from lesson 3.6.',
    input: { name: 'message', label: 'Message', value: 'my chain broke' },
    kwargs: v => ({ intents: INTENTS, message: v }),
    watch: { scores: ['scores'], exps: ['exps'], probs: ['probs'] },
    jump: { label: 'Next intent scored', targets: () => [['bayes.py', lineOf('bayes.py', '    return score')]] },
  },
  cooccurrence: {
    label: 'Co-occurrence counts (4.1)', file: 'vectors.py', module: 'vectors', function: 'cooccurrence', view: 'watch',
    about: 'Counts which words appear near which, from lesson 4.1, on the first few bike-shop sentences. The input is how many sentences.',
    input: { name: 'n', label: 'Sentences', value: '3' },
    kwargs: v => ({ sentences: SENTENCES.slice(0, Math.max(1, Math.min(10, Number(v) || 3))).map(words), window: 2 }),
    watch: { word: ['w'], neighbour: ['s[j]'], row: ['counts[index[w]]'] },
    jump: { label: 'Next pair counted', targets: () => [['vectors.py', lineOf('vectors.py', 'counts[index[w]][index[s[j]]] += 1')]] },
  },
  word2vec: {
    label: 'word2vec, one pass (4.4)', file: 'vectors.py', module: 'vectors', function: 'train_word2vec', view: 'watch',
    about: 'One pass of word2vec training, from lesson 4.4, on the first few bike-shop sentences. “Next update” stops after each pair’s update: watch p, the label and the loss.',
    input: { name: 'n', label: 'Sentences', value: '3' },
    kwargs: v => ({ sentences: SENTENCES.slice(0, Math.max(1, Math.min(20, Number(v) || 3))).map(words), dim: 4, epochs: 1 }),
    watch: { centre: ['vocab[c]'], other: ['vocab[o]'], label: ['label'], p: ['p'], loss: ['loss'], u: ['w_in[c]'] },
    jump: { label: 'Next update', targets: () => [['vectors.py', lineOf('vectors.py', 'w_in[c] = [a + lr * g')]] },
  },
  meaning_bot: {
    label: 'Bot 2 by meaning (4.6)', file: 'vectors.py', module: 'vectors', function: 'semantic_reply', view: 'watch',
    about: 'Bot 2 answering one message by meaning, from lesson 4.6, with the word vectors trained in the page (40 passes).',
    input: { name: 'message', label: 'Message', value: 'my tyre is flat' },
    kwargs: v => { const [vocab, vectors] = trained(); return { intents: INTENTS, vocab, vectors, message: v } },
    watch: { message_words: ['content_words(message)'], scores: ['scores'] },
    jump: { label: 'Next intent scored', targets: () => [['vectors.py', lineOf('vectors.py', 'scores[name] = max(')]] },
  },
  bpe: {
    label: 'BPE merges (5.3)', file: 'lm.py', module: 'lm', function: 'train_bpe', view: 'watch',
    about: 'Byte-pair encoding from lesson 5.3, on the words of a short text. “Next merge” stops after each merge: watch the pair counts and the merged words.',
    input: { name: 'text', label: 'Text', value: 'the chain the chains the change' },
    kwargs: v => ({ word_counts: Object.fromEntries(Object.entries(words(v).reduce((m, w) => ({ ...m, [w]: (m[w] ?? 0) + 1 }), {}))), merges: 6 }),
    watch: { best: ['best'], learned: ['learned'], words: ['words'] },
    jump: { label: 'Next merge', targets: () => [['lm.py', lineOf('lm.py', 'learned.append(best)')]] },
  },
  attention: {
    label: 'Attention (5.5)', file: 'lm.py', module: 'lm', function: 'attention', view: 'watch',
    about: 'Causal attention from lesson 5.5 on three positions: the scores, weights and output of each one. The input is ignored; the vectors are the figure’s.',
    input: { name: 'note', label: 'Vectors', value: 'the figure’s three' },
    kwargs: () => ({ q: [[1, 0], [0, 1], [1, 1]], k: [[1, 0], [0, 1], [1, -1]], v: [[1, 2], [3, 4], [5, 6]] }),
    watch: { i: ['i'], scores: ['scores'], weights: ['weights'], out: ['out'] },
    jump: { label: 'Next position', targets: () => [['lm.py', lineOf('lm.py', 'out.append([sum(weights[j] * v[j][c]')]] },
  },
  gpt_step: {
    label: 'One training step of the tiny GPT (5.6)', file: 'tinygpt.py', module: 'tinygpt', function: 'train', view: 'watch',
    about: 'One step of training the tiny GPT from lesson 5.6, on a small model (8 numbers per character, 8 characters of context) so it fits on the screen. Step into forward() and backward() to see every operation and its gradient.',
    input: { name: 'text', label: 'Text', value: 'the shop is open on sunday. the chain broke.' },
    kwargs: v => ({ text: v, steps: 1, dim: 8, context: 8, hidden: 16 }),
    watch: { ids: ['ids'], targets: ['targets'], loss: ['loss.data'], losses: ['losses'] },
    jump: { label: 'To backward()', targets: () => [['tinygpt.py', lineOf('tinygpt.py', '        loss.backward()')]] },
  },
  chat_format: {
    label: 'A conversation as tokens (6.1)', file: 'chat.py', module: 'chat', function: 'format_dialogue', view: 'watch',
    about: 'Lesson 6.1: a user message and its answer written as one list of tokens with « » ¶.',
    input: { name: 'message', label: 'Message', value: 'where is order 512' },
    kwargs: v => ({ turns: [['user', v], ['bot', 'order 512 ships tomorrow.']] }),
    watch: { out: ['out'], role: ['role'], words: ['words'] },
    jump: { label: 'Next turn', targets: () => [['chat.py', lineOf('chat.py', '        out += [USER if role == "user" else BOT]')]] },
  },
  chat_step: {
    label: 'One masked training step (6.3)', file: 'chat.py', module: 'chat', function: 'train_chat', view: 'watch',
    about: 'Lesson 6.3–6.4: one step of training on conversations, on a small model. Stop at the mask, then step into the masked cross_entropy.',
    input: { name: 'n', label: 'Conversations', value: '30' },
    kwargs: v => ({ pairs: makeDialogues()[0].slice(0, Math.max(5, Math.min(100, Number(v) || 30))), steps: 1, dim: 8, context: 16, hidden: 16 }),
    watch: { window: ['tokens[start:start + context]'], mask: ['mask'], loss: ['loss.data'] },
    jump: { label: 'To the masked loss', targets: () => [['chat.py', lineOf('chat.py', '        loss = tg.cross_entropy(logits, targets, mask)')]] },
  },
  chat_reply: {
    label: 'A reply, token by token (6.5)', file: 'chat.py', module: 'chat', function: 'reply', view: 'watch',
    about: 'Lesson 6.5: a small Bot 3 (trained in the page for a moment, so its answers are rough) replying one token at a time until it writes ¶.',
    input: { name: 'message', label: 'Message', value: 'is the shop open on sunday' },
    kwargs: v => { const [vocab, model] = smallChatModel(); return { vocab, model, history: [], message: v } },
    watch: { out: ['out'], chose: ['vocab[choice]'] },
    jump: { label: 'Next token', targets: () => [['chat.py', lineOf('chat.py', '        if vocab[choice] == END:')]] },
  },
}
