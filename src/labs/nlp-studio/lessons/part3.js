// Part 3: learning from examples by counting. Bags of words and cosine similarity, n-grams and
// smoothing, TF-IDF search, Naive Bayes, measuring a classifier, and Bot 2 (intents learned from
// example phrases, saved, downloaded and uploaded). Numbers come from engine/counting.js, which
// parity3.test.js holds to the Python; lessons.test.js checks them all.
import * as C from '../engine/counting.js'
import { MESSAGES, INTENTS } from '../engine/data.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const DOCS = ['the cat sat on the mat', 'the dog sat on the log', 'a cat and a dog', 'cats chase mice', 'the mat is red'].map(C.words)
const PAIR = C.buildVocab(DOCS.slice(0, 2))
const vec = d => C.vectorize(d, PAIR)
const CORPUS = C.words(MESSAGES.map(([t]) => t).join(' '))
const BIGRAMS = C.bigramModel(CORPUS)
const NB = C.trainNB(MESSAGES.slice(0, 30).map(([t, l]) => [C.words(t), l]))
const TEST = MESSAGES.slice(-C.TEST_SIZE), POOL = MESSAGES.slice(0, -C.TEST_SIZE)
const BOT = C.trainIntents(INTENTS)
const smallModel = C.trainNB([[['free', 'prize'], 'spam'], [['free', 'lunch'], 'ham'], [['lunch', 'tomorrow'], 'ham']], 1)

export const PART3 = {
  id: 'part3', title: 'Part 3 · Learning from examples', lessons: [
    {
      id: 'bag-of-words', number: '3.1', title: 'Bag of words: text as a list of numbers',
      goal: 'Turn any text into a vector of word counts, and measure how alike two texts are with the dot product and the cosine.',
      builds: ['counting-words'],
      blocks: [
        { h: 'From rules to examples' },
        { md: `Parts 1 and 2 ended the same way: hand-written rules (an abbreviation list, a reflection table) break on the next example. From here on the lab does it the other way round. Instead of writing rules, **count things in examples**, and let the counts decide.

To count, a program needs text as numbers. The simplest way: pick a **vocabulary**, a fixed list of words, and turn each text into a list of numbers, one per vocabulary word: how many times that word appears. That list is called a **bag of words**, because it keeps which words are in the text and how often, and throws away their order, like tipping them into a bag.

"The dog bit the man" and "the man bit the dog" become the same bag. That loss is real (Part 2 was all about order), and later parts win it back. But for questions like "is this message about a refund?", which words appear is most of the answer.` },
        {
          code: {
            file: 'counting.py', fn: 'words', notes: [
              ['for t in tokenize(text) if char_kind(t[0]) == "word"', ['Part 1’s tokenizer, keeping only word tokens, all in lower case: the same steps as `word_counts` in lesson 1.5. Every counter in Part 3 starts here.']],
            ],
          },
        },
        {
          code: {
            file: 'counting.py', fn: 'build_vocab', notes: [
              ['vocab = sorted({w for doc in docs for w in doc})', ['A **set comprehension** collects every word of every document once; `sorted` puts them in a fixed order, so every vector has the same columns in the same order.']],
              ['return {w: k for k, w in enumerate(vocab)}', ['A dictionary from each word to its column number: the 3rd word in the vocabulary is column 2 (counting from 0).']],
            ],
          },
        },
        {
          code: {
            file: 'counting.py', fn: 'vectorize', notes: [
              ['vector = [0] * len(vocab)', ['One zero per vocabulary word. `[0] * 5` is `[0, 0, 0, 0, 0]`.']],
              ['if w in vocab:', ['A word outside the vocabulary has no column, so it is skipped. A classifier trained on some words can only ever see those words.']],
              ['vector[vocab[w]] += 1', ['Find the word’s column, add 1.']],
            ],
          },
        },
        { figure: 'BagOfWords', caption: 'Each row is a document as a vector: one column per vocabulary word. Darker cells are bigger counts. Edit the documents and watch the columns change.' },
        {
          write: {
            file: 'counting.py', fn: 'vectorize',
            prompt: 'Write `vectorize(tokens, vocab)`: given a list of words and a dictionary from word to column, return the list of counts.',
            starter: 'def vectorize(tokens, vocab):\n    vector = [0] * len(vocab)\n    # add 1 to the column of each known word\n    return vector\n',
            cases: cases(C.vectorize, [[DOCS[0], PAIR], [DOCS[1], PAIR], [['zebra', 'cat'], PAIR], [[], PAIR]]),
            hint: '`for w in tokens:` then `if w in vocab: vector[vocab[w]] += 1`.',
          },
        },

        { h: 'How alike are two texts? The dot product' },
        { md: `Two documents share words if both have a non-zero count in the same column. The **dot product** turns that into one number: multiply the two vectors column by column, and add up.

$$u \\cdot v = \\sum_{i} u_i \\, v_i$$

A column where either count is 0 adds nothing; a word both use adds the product of how often each uses it. So the dot product is big when the texts use the same words, often.

It has a flaw: a long document has big counts everywhere, so it has a big dot product with everything. The fix is to divide by the vectors' **lengths** (their **norms**), $\\|u\\| = \\sqrt{u \\cdot u}$, which measures only the *direction* of each vector, not its size. The result is the **cosine similarity**: the cosine of the angle between the two vectors.

$$\\cos(u, v) = \\frac{u \\cdot v}{\\|u\\| \\, \\|v\\|}$$

It is 1 when two texts use words in exactly the same proportions, 0 when they share no words at all. (Counts are never negative, so for bags of words it never goes below 0.)` },
        {
          mathCode: [
            ['u \\cdot v = \\sum_i u_i v_i', 'sum(a * b for a, b in zip(u, v))', '`zip` pairs up the columns; multiply each pair, add them all'],
            ['\\|u\\| = \\sqrt{u \\cdot u}', 'math.sqrt(dot(u, u))', 'the length: Pythagoras in as many dimensions as there are words'],
            ['\\cos(u, v)', 'dot(u, v) / (norm(u) * norm(v))', 'the angle, ignoring how long each text is'],
          ],
        },
        {
          predict: {
            prompt: 'Over their shared vocabulary, what is the dot product of "the cat sat on the mat" and "the dog sat on the log"?',
            compute: () => C.dot(vec(DOCS[0]), vec(DOCS[1])), answer: 6,
            explain: '"the" is 2 in both: 2 × 2 = 4. "sat" and "on" are 1 in both: 1 + 1. "cat", "mat", "dog", "log" each appear in only one, so they multiply by 0. Total **6**.',
            misconceptions: [{ answer: 3, feedback: 'That counts the shared *words* (the, sat, on). The dot product multiplies the counts: "the" appears twice in each.' }],
          },
        },
        {
          derive: {
            title: 'The cosine of those two sentences',
            intro: 'Each sentence has the counts: the 2, and one each of four other words (cat, sat, on, mat; or dog, sat, on, log).',
            steps: [
              { prompt: 'What is $u \\cdot u$ for "the cat sat on the mat"?', number: C.dot(vec(DOCS[0]), vec(DOCS[0])), compute: () => C.dot(vec(DOCS[0]), vec(DOCS[0])), why: '$2^2 + 1 + 1 + 1 + 1 = 8$.' },
              { prompt: 'So what is its length $\\|u\\|$? (The other sentence has the same length.)', number: Math.sqrt(8), compute: () => C.norm(vec(DOCS[0])), tolerance: 0.001, why: '$\\sqrt 8 \\approx 2.828$.' },
              { prompt: 'The cosine $\\dfrac{u \\cdot v}{\\|u\\|\\,\\|v\\|}$ is?', number: 0.75, compute: () => C.cosine(vec(DOCS[0]), vec(DOCS[1])), tolerance: 0.001, why: '$6 / (\\sqrt8 \\cdot \\sqrt8) = 6/8 = 0.75$.' },
              { prompt: 'Now write the second sentence twice, "the dog sat on the log the dog sat on the log": every count doubles. Write $\\cos(u, 2v)$ in terms of $c = \\cos(u, v)$.', answer: 'c', vars: { c: [0, 1] }, why: '$\\frac{u \\cdot 2v}{\\|u\\|\\,\\|2v\\|} = \\frac{2\\,u\\cdot v}{2\\,\\|u\\|\\,\\|v\\|}$: the 2s cancel. The cosine only sees direction, so length doesn’t matter.' },
            ],
            result: 'The cosine compares what texts are about, not how long they are. It is the similarity measure behind search (lesson 3.3) and, with better vectors, behind Part 4’s word meanings.',
          },
        },
      ],
    },

    {
      id: 'ngrams', number: '3.2', title: 'N-grams: counting what comes next',
      goal: 'Estimate the probability of the next word by counting pairs, fix zero counts with smoothing, and score a whole sentence with logs.',
      builds: ['bag-of-words'],
      blocks: [
        { h: 'Counting pairs' },
        { md: `A bag of words forgets order. The cheapest way to keep a little of it is to count **pairs** of neighbouring words, called **bigrams**: in "claim your free prize" they are (claim, your), (your, free), (free, prize). More generally, runs of $n$ words are **n-grams**.

Count enough bigrams and you can answer a question that is at the heart of every language model, including the chatbot at the end of this lab: **given this word, what comes next?**` },
        {
          code: {
            file: 'counting.py', fn: 'ngrams', notes: [
              ['tokens[i:i + n]', [
                'A slice of `n` tokens starting at `i`, turned into a tuple so it can be a dictionary key.',
                '`range(len(tokens) - n + 1)`: a text of 5 words has 4 bigrams and 3 trigrams; the last start position is `len - n`.',
              ]],
            ],
          },
        },
        {
          code: {
            file: 'counting.py', fn: 'bigram_model', notes: [
              ['after = follows.setdefault(w1, {})', ['`setdefault` returns the dictionary stored under `w1`, creating an empty one first if there isn’t one yet. One line instead of an `if`.']],
              ['after[w2] = after.get(w2, 0) + 1', ['Count one more time that `w2` followed `w1`: the `count` pattern from lesson 1.1, one level deeper.']],
            ],
          },
        },
        { md: `From the counts, a probability. Of all the times "claim" was followed by something, what fraction was it followed by "your"?

$$P(\\text{your} \\mid \\text{claim}) = \\frac{\\text{count}(\\text{claim your})}{\\text{count}(\\text{claim} \\ \\cdot)}$$

Read $P(a \\mid b)$ as "the probability of $a$, given $b$": a **conditional probability**. The dot in count(claim ·) means "claim followed by anything".` },
        {
          predict: {
            prompt: 'In the 40 messages of lesson 3.4, "claim" is followed by "your" 6 times, "what" once and "the" once. What is $P(\\text{your} \\mid \\text{claim})$?',
            compute: () => C.nextWordProb(BIGRAMS, 'claim', 'your'), answer: 0.75, tolerance: 0.001,
            explain: '$6 / (6 + 1 + 1) = 6/8 = 0.75$. Try it in the figure below: type “claim” after “After the word”.',
          },
        },
        { python: { program: 'bigrams', label: 'Watch the pairs being counted in real Python' } },
        { figure: 'BigramExplorer', caption: 'The next-word probabilities after any word, counted from the text above. “Always taking the most likely next word” shows the problem with that strategy: it soon repeats itself.' },

        { h: 'The problem with zero' },
        { md: `Score the sentence "the zebra won" with these counts: "zebra" never appears, so $P(\\text{zebra} \\mid \\text{the}) = 0$, and the whole sentence gets probability 0. One unseen word makes a perfectly reasonable sentence "impossible". With any finite amount of text, most possible pairs are never seen.

**Smoothing** fixes it by pretending every possible pair was seen a little: add $k$ to every count (add-1 smoothing when $k = 1$). If $V$ is the number of different words, the bottom of the fraction grows by $k$ for each of them:

$$P(w_2 \\mid w_1) = \\frac{\\text{count}(w_1\\,w_2) + k}{\\text{count}(w_1 \\ \\cdot) + k\\,V}$$

Move the smoothing slider in the figure: unseen words get a little probability, and seen words give a little of theirs up to pay for it.` },
        {
          code: {
            file: 'counting.py', fn: 'next_word_prob', notes: [
              ['total = sum(after.values())', ['How many times `w1` was followed by anything.']],
              ['if total + k * vocab_size == 0:', ['A word never seen, with no smoothing: there is nothing to divide by, so the probability is 0 rather than a crash.']],
              ['(after.get(w2, 0) + k) / (total + k * vocab_size)', ['The formula above, exactly. With `k = 0` it is plain counting.']],
            ],
          },
        },
        {
          derive: {
            title: 'Smoothing still gives a probability distribution',
            intro: 'Probabilities of all possible next words must add up to 1. Check that smoothing keeps that true. Let $N$ = count($w_1$ ·), and let $c_w$ be the count of each next word $w$ (so the $c_w$ add up to $N$).',
            steps: [
              { prompt: 'Adding $c_w + k$ over all $V$ words gives what, in terms of $N$, $k$ and $V$?', answer: 'N + k*V', vars: { N: [0, 100], k: [0, 2], V: [1, 500] }, why: 'The $c_w$ add up to $N$, and $k$ is added $V$ times.' },
              { prompt: 'So the smoothed probabilities add up to $\\dfrac{N + kV}{N + kV}$. Which is?', number: 1, compute: () => { const V = new Set(CORPUS).size; return Object.keys(Object.fromEntries(CORPUS.map(w => [w, 1]))).reduce((s, w) => s + C.nextWordProb(BIGRAMS, 'claim', w, 0.5, V), 0) }, tolerance: 1e-9, why: 'They add up to 1, whatever $k$ is. (The lab checked by adding the smoothed probability of every word after “claim” with $k = 0.5$.)' },
              { prompt: '"claim" is followed by something $N = 8$ times, and there are $V$ = ' + new Set(CORPUS).size + ' different words. With $k = 1$, what probability does an **unseen** next word get?', number: 1 / (8 + new Set(CORPUS).size), compute: () => C.nextWordProb(BIGRAMS, 'claim', 'zebra', 1, new Set(CORPUS).size), tolerance: 1e-4, why: `$1 / (8 + ${new Set(CORPUS).size})$. And "your" drops from 0.75 to $7 / ${8 + new Set(CORPUS).size}$: with little data, add-1 smoothing takes a lot from what was actually seen. Lesson 3.6 runs into exactly this.` },
            ],
          },
        },

        { h: 'A whole sentence: why logs' },
        { md: `The probability of a whole sentence is the product of each word's probability given the one before (the **chain rule** of probability, with the simplifying assumption that only the previous word matters):

$$P(w_1 \\dots w_n) \\approx \\prod_{i=2}^{n} P(w_i \\mid w_{i-1})$$

Multiply many numbers smaller than 1 and the result gets tiny fast. A computer's floating-point numbers can't go below about $10^{-308}$, so a long text's probability rounds to exactly 0 (**underflow**). Logs fix it: $\\log(ab) = \\log a + \\log b$, so a product of probabilities becomes a **sum** of log-probabilities, which stays a sensible negative number however long the text is. The sentence with the higher (less negative) log-probability is the more likely one.` },
        {
          code: {
            file: 'counting.py', fn: 'sentence_log_prob', notes: [
              ['if p == 0:', ['log 0 is minus infinity: a pair never seen, without smoothing, makes the sentence impossible.']],
              ['total += math.log(p)', ['Adding logs instead of multiplying probabilities.']],
            ],
          },
        },
        {
          write: {
            file: 'counting.py', fn: 'next_word_prob',
            prompt: 'Write `next_word_prob(model, w1, w2, k=0, vocab_size=0)` with add-k smoothing. `model` is `{w1: {w2: count}}`.',
            starter: 'def next_word_prob(model, w1, w2, k=0, vocab_size=0):\n    after = model.get(w1, {})\n    # total: how often w1 was followed by anything\n    # (count of w2 after w1, plus k) / (total + k * vocab_size), or 0.0 if that bottom is 0\n    pass\n',
            cases: cases(C.nextWordProb, [[BIGRAMS, 'claim', 'your', 0, 0], [BIGRAMS, 'claim', 'your', 1, 200], [BIGRAMS, 'claim', 'zebra', 0, 200], [BIGRAMS, 'claim', 'zebra', 0.5, 200], [BIGRAMS, 'zebra', 'the', 0, 0]]),
            hint: '`total = sum(after.values())`, then guard `if total + k * vocab_size == 0: return 0.0`.',
          },
        },
        {
          code: {
            file: 'counting.py', fn: 'greedy_continue', notes: [
              ['min(after, key=lambda w: (-after[w], w))', ['The most frequent next word (the smallest negative count), ties alphabetical. Always taking the top word is called **greedy** decoding: it loops (“claim your free entry is waiting can you have …”). Part 5 samples instead.']],
            ],
          },
        },
      ],
    },

    {
      id: 'tf-idf', number: '3.3', title: 'TF-IDF: which words matter',
      goal: 'Weight words by how rare they are across documents, and build a search engine that ranks documents by cosine similarity to a query.',
      builds: ['bag-of-words'],
      blocks: [
        { h: 'Not all words are equal' },
        { md: `Search for "the cat" and every document containing "the" matches, which is nearly all of them. Common words carry little information about what a document is about. A good weight for a word should be high when it is rare across the documents and low when it is everywhere.

The **document frequency** $\\text{df}(w)$ is how many of the $N$ documents contain $w$ at least once. The **inverse document frequency** turns it upside down and takes the log:

$$\\text{idf}(w) = \\log \\frac{N}{\\text{df}(w)}$$

A word's **TF-IDF** weight in a document is its count there (its **term frequency**, tf) times its idf: frequent in *this* document, rare in *others*.` },
        {
          code: {
            file: 'counting.py', fn: 'document_frequency', notes: [
              ['for w in set(doc):', ['`set(doc)`: each word once per document. Document frequency counts documents, not occurrences.']],
            ],
          },
        },
        {
          code: {
            file: 'counting.py', fn: 'idf', notes: [
              ['math.log(n / d)', ['$\\log(N / \\text{df})$. Natural log; any base works, it only scales every weight by the same amount.']],
            ],
          },
        },
        {
          derive: {
            title: 'What the idf does at the extremes',
            intro: `Five documents: “${DOCS.map(d => d.join(' ')).join('”, “')}”.`,
            steps: [
              { prompt: '"sat" is in 2 of the 5. What is its idf? (Natural log.)', number: C.idf(DOCS).sat, compute: () => C.idf(DOCS).sat, tolerance: 0.001, why: '$\\log(5/2) \\approx 0.916$.' },
              { prompt: 'A word in **every** document: what is its idf?', number: 0, compute: () => C.idf([['a'], ['a', 'b']]).a, why: '$\\log(N/N) = \\log 1 = 0$. A word in every document is weighted 0: it can’t tell documents apart.' },
              { prompt: 'A word in just **one** of $N$ documents: its idf as a formula in $N$?', answer: 'log(N)', vars: { N: [1, 1000] }, why: '$\\log(N/1)$: the biggest weight any word can have. Rare words are the best clues.' },
            ],
          },
        },
        {
          code: {
            file: 'counting.py', fn: 'tfidf_vector', notes: [
              ['columns = sorted(vocab, key=vocab.get)', ['The vocabulary words in column order: sorting the words by their column number.']],
              ['c * idf_values.get(w, 0.0)', ['Count times idf, column by column.']],
            ],
          },
        },
        {
          code: {
            file: 'counting.py', fn: 'cosine', notes: [
              ['if norm(u) == 0 or norm(v) == 0:', ['A text with no known words has length 0; dividing by it would crash, so it scores 0 against everything.']],
              ['return dot(u, v) / (norm(u) * norm(v))', ['The cosine from lesson 3.1, now on TF-IDF vectors.']],
            ],
          },
        },
        {
          code: {
            file: 'counting.py', fn: 'search', notes: [
              ['q = tfidf_vector(query, vocab, weights)', ['The query is treated as a tiny document of its own.']],
              ['sorted(scored, key=lambda pair: (-pair[0], pair[1]))', ['Highest cosine first; ties keep the documents’ order.']],
            ],
          },
        },
        { figure: 'LessonSearch', caption: 'A search engine over this lab’s own lessons, one document each. Try “parse a sentence”, “bytes”, “smoothing”. Words in nearly every lesson get weights near 0.' },
        {
          write: {
            file: 'counting.py', fn: 'cosine', given: ['dot', 'norm'], prelude: 'import math',
            prompt: 'Write `cosine(u, v)`. `dot` and `norm` are written for you. Return 0.0 if either vector has length 0.',
            starter: 'def cosine(u, v):\n    # guard against a zero-length vector, then dot over the product of the lengths\n    pass\n',
            cases: cases(C.cosine, [[[2, 1, 0], [1, 1, 1]], [[1, 0], [0, 1]], [[3, 4], [6, 8]], [[0, 0], [1, 1]], [[1, 2, 3], [1, 2, 3]]]),
            hint: '`if norm(u) == 0 or norm(v) == 0: return 0.0`, then `return dot(u, v) / (norm(u) * norm(v))`.',
          },
        },
        { note: 'TF-IDF with cosine similarity was the standard way search engines ranked pages for decades, and it is still the first step of many systems that feed documents to a chatbot (“retrieval”: ML Lab’s chapter 34 goes further, to BM25).', kind: 'key' },
      ],
    },

    {
      id: 'naive-bayes', number: '3.4', title: 'Naive Bayes: a classifier that learns from examples',
      goal: 'Derive Bayes’ rule, train a spam filter by counting, read every term of its score, and see why it works in log space.',
      builds: ['ngrams'],
      blocks: [
        { h: 'Learning from labelled examples' },
        { md: `Here are 40 short messages, each labelled **spam** or **ham** (not spam). A **classifier** learns from labelled examples to label new ones it has never seen. This is the first thing in the lab that **learns**: nobody writes a rule saying "free" is suspicious; the counts discover it.

The question is: given the words of a message, which label is more probable? Written as probabilities, compare $P(\\text{spam} \\mid \\text{words})$ with $P(\\text{ham} \\mid \\text{words})$. Counting can't give those directly, but it can give the reverse, $P(\\text{words} \\mid \\text{spam})$: how often spam uses these words. **Bayes' rule** turns one into the other.` },
        {
          derive: {
            title: 'Bayes’ rule, from one fact about probability',
            intro: 'The probability that two things are both true can be written two ways: $P(A \\text{ and } B) = P(A \\mid B)\\,P(B) = P(B \\mid A)\\,P(A)$.',
            steps: [
              { prompt: 'Divide both sides of $P(A \\mid B)\\,P(B) = P(B \\mid A)\\,P(A)$ by $P(B)$. With $x = P(B \\mid A)$, $a = P(A)$, $b = P(B)$, what is $P(A \\mid B)$?', answer: 'x*a/b', vars: { x: [0.01, 1], a: [0.01, 1], b: [0.05, 1] }, why: 'That is **Bayes’ rule**: $P(A \\mid B) = \\dfrac{P(B \\mid A)\\,P(A)}{P(B)}$.' },
              { prompt: `In the first 30 messages, ${NB.docs.spam} are spam. What is the **prior** $P(\\text{spam})$, the chance of spam before reading a word?`, number: NB.docs.spam / 30, compute: () => NB.docs.spam / 30, tolerance: 1e-6, why: 'The fraction of training messages with that label.' },
              { prompt: `"free" appears ${NB.words.spam.free} times among the ${NB.totals.spam} words of the spam messages. With add-1 smoothing over a vocabulary of $V = ${NB.vocab.length}$, what is $P(\\text{free} \\mid \\text{spam})$?`, number: (NB.words.spam.free + 1) / (NB.totals.spam + NB.vocab.length), compute: () => Math.exp(C.logScoreParts(NB, ['free'], 'spam').terms[0].log), tolerance: 1e-4, why: `$(${NB.words.spam.free} + 1) / (${NB.totals.spam} + ${NB.vocab.length})$: the smoothing of lesson 3.2.` },
              { prompt: `"free" never appears in ham (${NB.totals.ham} words). What is $P(\\text{free} \\mid \\text{ham})$?`, number: 1 / (NB.totals.ham + NB.vocab.length), compute: () => Math.exp(C.logScoreParts(NB, ['free'], 'ham').terms[0].log), tolerance: 1e-5, why: `$(0 + 1)/(${NB.totals.ham} + ${NB.vocab.length})$: small but not zero, thanks to smoothing. Spam is about ${Math.round(((NB.words.spam.free + 1) / (NB.totals.spam + NB.vocab.length)) / (1 / (NB.totals.ham + NB.vocab.length)))} times as likely to say "free".` },
            ],
            result: 'For a label $c$ and words $w_1 \\dots w_n$: $P(c \\mid \\text{words}) \\propto P(c) \\prod_i P(w_i \\mid c)$. The **naive** part is the product: it assumes each word is independent of the others given the label, which is false (“free” and “prize” go together) but works surprisingly well. $P(\\text{words})$ is the same for every label, so to compare labels it can be dropped: that is what $\\propto$ (“proportional to”) means.',
          },
        },
        {
          code: {
            file: 'bayes.py', fn: 'train_nb', notes: [
              ['model = {"k": k, "docs": {}, "words": {}, "totals": {}, "vocab": set()}', ['Training is only counting. `docs`: messages per label (for the prior). `words`: each label’s word counts. `totals`: words per label. `vocab`: every word seen. `k`: the smoothing.']],
              ['counts = model["words"].setdefault(label, {})', ['This label’s word counts, created empty the first time the label is seen.']],
              ['model["vocab"] = sorted(model["vocab"])', ['A sorted list at the end, so the model can be saved as JSON (lesson 3.6 does).']],
            ],
          },
        },
        {
          code: {
            file: 'bayes.py', fn: 'log_score', notes: [
              ['score = math.log(model["docs"][label] / n_docs)', ['Start from log of the prior, $\\log P(c)$.']],
              ['if w not in model["vocab"]:', ['A word never seen in training says nothing about either label, so it is skipped.']],
              ['score += math.log((counts.get(w, 0) + k) / (total + k * vocab_size))', ['Add $\\log P(w \\mid c)$ for each word: logs, as in lesson 3.2, so a long message doesn’t underflow to 0.']],
            ],
          },
        },
        { figure: 'SpamTrainer', caption: 'Every term of each label’s score. Change the message, the amount of training data or the smoothing, or add training examples of your own, and watch the numbers that decide the guess.' },
        {
          predict: {
            prompt: 'Trained on the first 30 messages, how sure is it that “win a free prize now” is spam? Give the probability, to 4 decimal places.',
            compute: () => C.classify(NB, C.words('win a free prize now'))[1].spam, answer: C.classify(NB, C.words('win a free prize now'))[1].spam, tolerance: 0.0005,
            explain: `**${C.classify(NB, C.words('win a free prize now'))[1].spam.toFixed(4)}**. "win", "free", "prize" and "now" are each much more common in spam; their log terms add up, and the gap in log scores (about ${(C.classify(NB, C.words('win a free prize now'))[2].spam - C.classify(NB, C.words('win a free prize now'))[2].ham).toFixed(1)}) becomes a probability very close to 1. Lesson 3.6 shows how log scores become probabilities.`,
          },
        },
        {
          write: {
            file: 'bayes.py', fn: 'log_score', prelude: 'import math',
            prompt: 'Write `log_score(model, tokens, label)`: the log prior plus, for each known word, the log of its smoothed probability. `model` has the keys `k`, `docs`, `words`, `totals` and `vocab`.',
            starter: 'def log_score(model, tokens, label):\n    n_docs = sum(model["docs"].values())\n    score = math.log(model["docs"][label] / n_docs)\n    # for each word in the vocabulary: add log((count in this label + k) / (this label\'s total + k * V))\n    return score\n',
            cases: cases(C.logScore, [[smallModel, ['free', 'prize'], 'spam'], [smallModel, ['free', 'prize'], 'ham'], [smallModel, ['lunch', 'zebra'], 'ham'], [smallModel, [], 'spam']]),
            hint: 'Read `k = model["k"]`, `V = len(model["vocab"])`, `counts = model["words"].get(label, {})`, `total = model["totals"].get(label, 0)`; skip words not in `model["vocab"]`.',
          },
        },
      ],
    },

    {
      id: 'evaluation', number: '3.5', title: 'Is it any good? Testing a classifier honestly',
      goal: 'Keep a test set the model never sees, read a confusion matrix, and compute precision, recall and F1, including why F1 uses the harmonic mean.',
      builds: ['naive-bayes'],
      blocks: [
        { h: 'Never test on the training data' },
        { md: `A model can memorise its training examples, so its score on them says little about new messages. The honest way: hold some labelled examples back as a **test set**, never train on them, and measure only on them. Here the last ${C.TEST_SIZE} messages are the test set, and the model trains on some of the other ${POOL.length}.

With only ${C.TEST_SIZE} test messages, each one is worth 10% of the accuracy, so the numbers jump around. Real evaluations use hundreds or thousands; the ideas are the same.` },
        { python: { program: 'naive_bayes', label: 'Train and test it in real Python' } },
        { figure: 'LearningCurve', caption: 'Accuracy on the same 10 test messages as the training set grows (the red dot is the slider). Below: the confusion matrix and every test message with the guess.' },
        { h: 'Four outcomes' },
        { md: `Pick one label as **positive** (here, spam: the thing the filter is looking for). Every test message ends up in one of four boxes, the **confusion matrix**:

| | guessed spam | guessed ham |
|---|---|---|
| **really spam** | true positive (TP) | false negative (FN): spam that got through |
| **really ham** | false positive (FP): a real message sent to the spam folder | true negative (TN) |

Accuracy, $(\\text{TP} + \\text{TN}) / \\text{all}$, hides which mistakes were made, and they cost different amounts: losing a real message (FP) is usually worse than seeing one spam (FN). Two measures separate them:

- **Precision** $= \\dfrac{\\text{TP}}{\\text{TP} + \\text{FP}}$: of the messages it flagged, how many were really spam?
- **Recall** $= \\dfrac{\\text{TP}}{\\text{TP} + \\text{FN}}$: of the real spam, how much did it catch?` },
        {
          code: {
            file: 'bayes.py', fn: 'confusion', notes: [
              ['if g == positive:', ['Guessed positive: right (TP) or wrong (FP) depending on the truth.']],
              ['c["fn" if t == positive else "tn"] += 1', ['Guessed negative: a missed positive (FN) or a correct negative (TN). `x if test else y` picks one of two values in one line.']],
            ],
          },
        },
        {
          code: {
            file: 'bayes.py', fn: 'precision_recall_f1', notes: [
              ['precision = c["tp"] / flagged if flagged else 0.0', ['If nothing was flagged at all, precision is undefined; this code calls it 0 rather than dividing by zero.']],
              ['f1 = 2 * precision * recall / (precision + recall)', ['The **F1 score**, one number that is only high when both are high: see the derivation below.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'Trained on only the first **2** messages, the filter flags 8 of the 10 test messages as spam, and 5 of those really are. What is its precision?',
            compute: () => C.evaluate(POOL.slice(0, 2), TEST, 'spam').precision, answer: 0.625, tolerance: 0.001,
            explain: `TP = 5, FP = 3: precision $= 5/8 = 0.625$. Its recall is ${C.evaluate(POOL.slice(0, 2), TEST, 'spam').recall}: it caught every spam, by flagging nearly everything. High recall with low precision is the signature of a filter that is too eager. Move the slider to 2 in the figure to see which real messages it flagged.`,
          },
        },
        {
          derive: {
            title: 'Why F1 is the harmonic mean',
            intro: 'One number for both precision $p$ and recall $r$. The ordinary average $(p + r)/2$ would let a filter that flags everything ($r = 1$, tiny $p$) score above 0.5. The **harmonic mean** is the reciprocal of the average of the reciprocals.',
            steps: [
              { prompt: 'Write $\\dfrac{1}{\\frac{1}{2}\\left(\\frac1p + \\frac1r\\right)}$ as a single fraction in $p$ and $r$.', answer: '2*p*r/(p+r)', vars: { p: [0.05, 1], r: [0.05, 1] }, why: '$\\frac12(\\frac1p + \\frac1r) = \\frac{p + r}{2pr}$; its reciprocal is $\\frac{2pr}{p + r}$.' },
              { prompt: 'A filter that flags everything: recall 1, precision 0.1. What is its F1?', number: 2 * 0.1 * 1 / 1.1, compute: () => C.precisionRecallF1({ tp: 1, fp: 9, fn: 0, tn: 0 }).f1, tolerance: 0.001, why: '$2 \\cdot 0.1 \\cdot 1 / 1.1 \\approx 0.18$, where the plain average would say 0.55. The harmonic mean is pulled down to the worse of the two.' },
              { prompt: `And the 2-message filter above (precision 0.625, recall 1)?`, number: C.evaluate(POOL.slice(0, 2), TEST, 'spam').f1, compute: () => C.evaluate(POOL.slice(0, 2), TEST, 'spam').f1, tolerance: 0.001, why: '$2 \\cdot 0.625 / 1.625 \\approx 0.769$.' },
            ],
          },
        },
        {
          write: {
            file: 'bayes.py', fn: 'precision_recall_f1',
            prompt: 'Write `precision_recall_f1(c)`, where `c` is `{"tp", "fp", "fn", "tn"}`. Return `{"precision", "recall", "f1"}`, using 0.0 wherever a bottom would be 0.',
            starter: 'def precision_recall_f1(c):\n    # precision = tp / (tp + fp), recall = tp / (tp + fn), f1 = 2pr / (p + r)\n    pass\n',
            cases: cases(C.precisionRecallF1, [[{ tp: 5, fp: 3, fn: 0, tn: 2 }], [{ tp: 1, fp: 9, fn: 0, tn: 0 }], [{ tp: 0, fp: 0, fn: 4, tn: 6 }], [{ tp: 4, fp: 1, fn: 1, tn: 4 }]]),
            hint: 'Compute `flagged = c["tp"] + c["fp"]` and `actual = c["tp"] + c["fn"]` first, and guard each division.',
          },
        },
      ],
    },

    {
      id: 'intent-bot', number: '3.6', title: 'Bot 2: a chatbot that learns intents',
      goal: 'Build a help-desk bot that learns from example phrases, turn its log scores into confidences safely, make it admit when it isn’t sure, and save, download and upload it.',
      builds: ['evaluation', 'eliza'],
      blocks: [
        { h: 'From rules to intents' },
        { md: `Bot 1 matched patterns you wrote. Bot 2 learns. You give it **intents**, the things people come to it for ("opening hours", "repair", "where is my order"), each with a few **example phrases** and one reply. It trains a Naive Bayes classifier on the examples, with the intent as the label, and answers a new message with the reply of the most probable intent.

This is how the first generation of real assistant and help-desk bots worked, and many still do: no rule says "open" means opening hours; the counts from the examples do. Add an example, and the bot changes its mind.` },
        {
          code: {
            file: 'bayes.py', fn: 'train_intents', notes: [
              ['def train_intents(intents, k=0.1):', [`Smoothing **k = 0.1**, not 1: with only ${Object.values(INTENTS).flatMap(i => i.examples).length} short examples, adding 1 to every one of the ${BOT.vocab.length} vocabulary words would swamp the real counts. With k = 1 this bot answers “hello” with only ${Math.round(C.intentReply(C.trainIntents(INTENTS, 1), INTENTS, 'hello').confidence * 100)}% confidence; with 0.1, ${Math.round(C.intentReply(BOT, INTENTS, 'hello').confidence * 100)}%. Try the slider.`]],
              ['for name, intent in intents.items() for example in intent["examples"]', ['Every example phrase of every intent, as `(words, intent name)`: training data for lesson 3.4’s classifier.']],
            ],
          },
        },
        { h: 'From log scores to confidences' },
        { md: `The classifier gives each intent a log score. To say "I'm 86% sure", the scores must become probabilities that add up to 1. Undo the log with $e^{s}$, then divide by the total:

$$P(c) = \\frac{e^{s_c}}{\\sum_j e^{s_j}}$$

This is called the **softmax**, and it comes back in every neural network from Part 4 on. But log scores are large negative numbers, and $e^{-1000}$ is too small for a computer: it rounds to exactly 0, and then the bottom is 0 too. The trick is to subtract the largest score first.` },
        {
          derive: {
            title: 'Subtracting the biggest score changes nothing, except avoiding 0 / 0',
            intro: 'Let $m$ be the largest score. Show that subtracting it from every score gives the same probabilities.',
            steps: [
              { prompt: '$e^{s - m}$ can be split into a product. Write it with $e^{s}$ and $e^{m}$ (type `exp( )`).', answer: 'exp(s)/exp(m)', vars: { s: [-5, 5], m: [-5, 5] }, why: '$e^{s - m} = e^s / e^m$.' },
              { prompt: 'So every term on the top and the bottom of the softmax is divided by the same $e^m$. With $a = e^{s_c}$ and $b = \\sum_j e^{s_j}$, simplify $\\dfrac{a/e^m}{b/e^m}$.', answer: 'a/b', vars: { a: [0.1, 10], b: [10, 50], m: [-3, 3] }, why: 'The $e^m$ cancels. Same probabilities.' },
              { prompt: 'Two scores, −1000 and −1001. After subtracting the biggest they are 0 and −1. What is the probability of the first?', number: 1 / (1 + Math.exp(-1)), compute: () => C.probabilities({ a: -1000, b: -1001 }).a, tolerance: 1e-6, why: '$e^0 / (e^0 + e^{-1}) = 1/(1 + e^{-1}) \\approx 0.731$. Without the subtraction: $e^{-1000} / (e^{-1000} + e^{-1001}) = 0/0$, an error.' },
            ],
            result: 'Subtracting the maximum before exponentiating is the **log-sum-exp trick**. Every serious machine-learning library does exactly this inside its softmax.',
          },
        },
        {
          code: {
            file: 'bayes.py', fn: 'probabilities', notes: [
              ['top = max(scores.values())', ['The biggest score, $m$.']],
              ['exps = {label: math.exp(s - top) for label, s in scores.items()}', ['$e^{s - m}$ for each label: the best becomes $e^0 = 1$, the others less, and none underflow to 0 unless they are hopeless anyway.']],
              ['return {label: e / total for label, e in exps.items()}', ['Divide by the total so they add up to 1.']],
            ],
          },
        },
        {
          write: {
            file: 'bayes.py', fn: 'probabilities', prelude: 'import math',
            prompt: 'Write `probabilities(scores)`: from `{label: log score}`, return `{label: probability}`, with the log-sum-exp trick so that scores like −1000 work.',
            starter: 'def probabilities(scores):\n    # subtract the biggest score, exponentiate, divide by the total\n    pass\n',
            cases: cases(C.probabilities, [[{ spam: -2, ham: -3 }], [{ a: -1000, b: -1001 }], [{ only: -5 }], [{ x: -1, y: -1, z: -1 }]]),
            hint: '`top = max(scores.values())`, then a dictionary of `math.exp(s - top)`, then divide each by their sum.',
          },
        },
        { h: 'Knowing when it doesn’t know' },
        {
          code: {
            file: 'bayes.py', fn: 'intent_reply', notes: [
              ['if probs[label] < threshold:', ['If even the best intent is below the threshold, the bot says it isn’t sure instead of guessing. A wrong confident answer is worse than an honest “I don’t know”.']],
            ],
          },
        },
        {
          code: {
            file: 'bayes.py', fn: 'chat', notes: [
              ['model = train_intents(intents, k)', ['Training takes milliseconds: there are only a few dozen examples to count. The figure retrains on every edit.']],
            ],
          },
        },
        { python: { program: 'bot2', label: 'Step through Bot 2’s answer in real Python' } },
        { figure: 'IntentBot', caption: 'The bike-shop help desk. Edit its intents, examples and replies on the left; chat on the right, with the probability of every intent under each reply. Save it in this browser, or download it as a file and upload it later.' },
        {
          predict: {
            prompt: 'How confident is the bike-shop bot that “hello” is a greeting? (A probability, to 2 decimal places.)',
            compute: () => C.intentReply(BOT, INTENTS, 'hello').confidence, answer: C.intentReply(BOT, INTENTS, 'hello').confidence, tolerance: 0.006,
            explain: `**${C.intentReply(BOT, INTENTS, 'hello').confidence.toFixed(2)}**. "hello" appears twice in the greeting examples and nowhere else. With k = 1 it would be only ${C.intentReply(C.trainIntents(INTENTS, 1), INTENTS, 'hello').confidence.toFixed(2)}, below the 0.5 threshold, and the bot would say it isn’t sure.`,
          },
        },
        { h: 'Where Bot 2 still fails' },
        { md: `Try the suggested messages. Two failures are worth understanding exactly:

- **“my chain broke”** is answered as an **order** question (${C.intentReply(BOT, INTENTS, 'my chain broke').confidence.toFixed(2)} sure). "chain" and "broke" never appear in any example, so they are skipped; only "my" counts, and "my" appears in more order examples ("where is my order", "my parcel…") than repair ones. Fix it the way this kind of bot is fixed: add "my chain broke" (or "my chain is broken") to the repair examples, and ask again.
- **“do you sell pizza”** gets the **opening hours** (${C.intentReply(BOT, INTENTS, 'do you sell pizza').confidence.toFixed(2)} sure, just over the threshold). Only "do" and "you" are known words. The bot can't know that pizza has nothing to do with a bike shop: it has no idea what any word *means*. Raise the confidence slider and it admits it isn't sure, at the price of refusing some good questions too: precision against recall again.

The second failure is the one that matters. To this bot "chain" and "tyre" are as unrelated as "chain" and "pizza": each word is just a column. Part 4 gives words **meanings**, as vectors where related words sit close together, learned, like everything from here on, from text.` },
        {
          choice: {
            prompt: 'You add “my chain broke” to the repair examples, and now “my chain broke” is answered correctly. What happens to “my chain snapped”?',
            options: [
              { text: 'It is answered as repair, because the bot now knows that broken and snapped chains are the same problem.', why: 'The bot knows no meanings. "snapped" is a word it has never seen, so it is skipped.' },
              { text: 'It is very likely answered as repair: "chain" is now a known word that appears only in repair, and "snapped" is skipped as unknown.', why: 'Exactly: the new example taught it the word "chain", not the idea. A message with no known repair words would still go wrong.' },
              { text: 'Nothing changes, because one example is too few to change a Naive Bayes model.', why: 'One example changes the counts, and with gentle smoothing a word seen only under one intent pulls hard towards it. Try it in the figure.' },
            ],
            answer: 1,
            // The claim, checked by lessons.test.js: retrained with the new example, both are answered as repair.
            verify: () => { const more = structuredClone(INTENTS); more.repair.examples.push('my chain broke'); const m = C.trainIntents(more); return ['my chain broke', 'my chain snapped'].every(q => C.intentReply(m, more, q).intent === 'repair') && C.intentReply(BOT, INTENTS, 'my chain broke').intent === 'order' },
          },
        },
      ],
    },
  ],
}
