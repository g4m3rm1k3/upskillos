# NLP Studio: plan

Status (2026-10-13): Parts 1–5 are built (`src/labs/nlp-studio/`), with the desktop Real Python tab. Parts 6–7 are planned below.

## The bar: better than QMaze and CartPole

QMaze and CartPole are good introductions. What they lack is the learner's own code and the maths worked through. NLP Studio adds both, in every lesson:

- **Write it yourself.** Each lesson ends with a function you type. It runs as real Python in the page (Pyodide, in a worker you can stop), and the lab checks it on several inputs. The results table shows each call, what yours returned and what was expected. "Show me" reveals the lab's own version afterwards. The tests run the lab's reference answer through the same checks in real Python, and make sure the starter code fails, so no exercise passes before you write it. (`WriteIt.jsx`, `checks.js`)
- **Derive it yourself.** The maths is typed one step at a time, using ML Lab's Derivation block, with the reason shown for each step. Every numeric step is checked against the engine. The formula steps you type are accepted when they evaluate the same as the right formula at many points.
- **Step through the loop.** Each hand-written loop can be played one character at a time beside its Python, with the line that ran lit up, the variables shown, and a plain-English reason. Step back works too. (`ScanPlayer`)
- **Kept from QMaze:** predictions computed by the engine, code notes tied to real lines, and JavaScript–Python parity tests (`engine/parity.json`, made by `tools/make_parity.py`).

## Part 1 as built

| Lesson | You write | You derive or predict | Figure |
|---|---|---|---|
| 1.1 Text is a list of characters | `count` | UTF-8 for “é” by hand; bytes of "naïve 🙂" | CharBytes |
| 1.2 Splitting into words by hand | `split_words` (without `.split`) | word count as a sum of indicators | ScanPlayer |
| 1.3 Punctuation: a tokenizer by hand | `tokenize` | tokens of "don't stop!" | ScanPlayer |
| 1.4 The same tokenizer as a regex | `tokenize_regex` | what `\w+` alone finds | TokenCompare |
| 1.5 Counting words, and Zipf's law | `rank_table` | why Zipf is a line on log axes | WordRanks (fitted slope) |
| 1.6 Splitting sentences | `split_sentences` | sentences in a tricky text | SentenceSplit |

## Part 2 as built

| Lesson | You write | You derive or predict | Figure |
|---|---|---|---|
| 2.1 A grammar | `leaves` | sentences of one shape: $v d^2 m^2$ | DeriveSentence |
| 2.2 Recursive descent | `parse_sequence` (mutual recursion) | answers for one NP | ParseExplorer |
| 2.3 Ambiguity | `catalan` | the Catalan recurrence, and how fast it grows | ParseExplorer, Bracketings |
| 2.4 The chart parser (CKY) | `combine` | cells $n(n+1)/2$ and splits $\binom{n+1}{3}$; 5 and 14 trees | ChartPlayer |
| 2.5 Dependency trees | `is_tree` | $n^{n-1}$ valid out of $n^n$ head lists | DependencyArcs |
| 2.6 Bot 1 (ELIZA-style) | `reflect` | rules tried before a match | ChatBot |

Things measured while building it, that the lessons now rest on:
- **The two parsers disagree.** Recursive descent can't have the left-recursive rule NP → NP PP, so it finds 3 readings for "i saw the man in the park with the telescope". The chart parser's grammar has that rule and finds 5.
- **The chart's counts are Catalan numbers.** With every attachment allowed, 1, 2 and 3 prepositional phrases give 2, 5 and 14 trees.
- **The ELIZA bot reproduces the original's classic mistake.** "worried about you" becomes "worried about I", because word-by-word reflection can't tell subject "you" from object "you". This is the bridge back to parsing, and on to Part 3.

## Part 3 as built

| Lesson | You write | You derive or predict | Figure |
|---|---|---|---|
| 3.1 Bag of words | `vectorize` | dot product, norm, cosine; cosine ignores length | BagOfWords |
| 3.2 N-grams | `next_word_prob` (add-k) | smoothing still sums to 1; why logs | BigramExplorer |
| 3.3 TF-IDF | `cosine` | idf at its extremes: 0 and log N | LessonSearch (this lab's own lessons) |
| 3.4 Naive Bayes | `log_score` | Bayes' rule; the spam filter's own numbers | SpamTrainer (every term of the score) |
| 3.5 Testing honestly | `precision_recall_f1` | F1 as a harmonic mean | LearningCurve, confusion matrix |
| 3.6 Bot 2 (intents) | `probabilities` (log-sum-exp) | why subtracting the maximum changes nothing | IntentBot: edit, chat, save, download, upload |

Data written for the lab: `python/data.py`, with the same data in `engine/data.js`, checked identical by a test. It holds 40 labelled messages (the last 10 are a fixed test set, never trained on) and the bike-shop help desk's six intents.

Things measured while building it, that the lessons now rest on:
- **Smoothing has to fit the amount of data.** With k = 1, Bot 2 answered "hello" with only 40% confidence and refused it. With k = 0.1 it gets 86%. Lesson 3.6 says so, and has a slider for it.
- **A test set must stay fixed.** Changing the test set along with the training set made accuracy go down as training grew.
- **Bot 2's honest failures are kept.** "my chain broke" goes to order, and "do you sell pizza" to opening hours. Adding one example fixes the first; the second needs word meanings, which leads to Part 4. A test checks the retraining claim.
- **Saving the bot.** It's saved as `intent-bot.json` (`format: "upskillos-intent-bot"`, version 1). Uploads are validated, and a broken file is refused with a reason. Lessons 5–6 extend this to network weights in safetensors.

## Part 4 as built

| Lesson | You write | You derive or predict | Figure |
|---|---|---|---|
| 4.1 Co-occurrence | `cooccurrence` | pairs per sentence: $2wL - w(w+1)$ | CooccurrenceExplorer |
| 4.2 PMI | `ppmi` | PMI from counts: $\log \frac{cT}{r_a c_b}$ | (same figure, PPMI side) |
| 4.3 A map of words | `nearest` | why power iteration converges: $(\lambda_2/\lambda_1)^k$ | WordMap (PPMI, by power iteration) |
| 4.4 word2vec | `pair_gradient` | the SGNS gradient, $g = y - \sigma(u \cdot v)$ | PairUpdate, Word2vecTrainer (watch it learn) |
| 4.5 Analogies and limits | `analogy` | why $b - a + c$ | AnalogyBox |
| 4.6 Bot 2 with meanings | `sentence_vector` | similarity of "my tyre is flat" | MeaningBot (counts vs meaning) |

The text is a bike-shop corpus written for the lab: 63 sentences, 116 words (`python/corpus.py`, mirrored in `engine/corpus.js`). Both languages use the same small random-number generator (an LCG), so word2vec trains identically in the page and in Python. The parity test compares all 116 vectors after 40 passes, to within 1e-9.

Things measured while building it, that the lessons now rest on:
- **Training is fast.** 40 passes take about 0.7 s in plain Python and 3.4 s in the page, including redrawing the map after every pass.
- **The neighbours are good.** chain → snapped, wheel, brake, tyre; monday → saturday, sunday; order → parcel, delivery. Raw counts put "the" first; PPMI is better, but noisy.
- **Averaging every word failed.** It answered "do you sell pizza" with "thanks", because of "you". Removing stop words fixed it: pizza became an honest "not sure", and "my tyre is flat" became repair at 0.94.
- **Weak spots are kept and explained.** "my chain snapped" is right, but only just (0.682 against thanks' 0.680). "my wheel is bent" is wrong, because "bent" appears once in the text. Analogies mostly fail on this little text: chain : chains :: tyre gives goodbye, while morning : open :: evening gives closed. Tests check each of these claims.

## Part 5 as built

| Lesson | You write | You derive or predict | Figure |
|---|---|---|---|
| 5.1 Language models and perplexity | `perplexity` | uniform guessing scores exactly $V$ | PerplexityDemo (held-out bigram) |
| 5.2 Sampling and temperature | `sample` | temperature at its extremes | TemperatureSampler |
| 5.3 BPE | `merge_pair` | tokens for a word after 120 merges | BpeBuilder |
| 5.4 A neural LM and autograd | `cross_entropy_grad` | softmax-cross-entropy gradient $p - y$ | SoftmaxGrad, GptTrainer with attention off |
| 5.5 Attention | `attention` | why divide by $\sqrt d$ | AttentionCalc |
| 5.6 A tiny GPT | `read_header` | Adam's bias correction | GptTrainer (train and held-out curves, attention map, download and upload of .safetensors) |

`python/tinygpt.py` is a small reverse-mode autograd on 2-D lists, plus a one-block, single-head transformer trained with Adam. `engine/tinygpt.js` is the same, operation for operation. The parity tests compare the weights after 15 Adam steps, with and without attention, and check that a `.safetensors` file written by the page is read by the Python, number for number. Adam keeps a running product for $\beta^t$ rather than calling `pow`, so the two languages agree exactly.

Things measured while building it, that the lessons now rest on:
- **Word bigrams barely beat guessing on new text.** Trained on 50 sentences, the best held-out perplexity is about 102, against 116 for uniform guessing.
- **Attention is what lets it learn.** Over 8,000 steps (32 dimensions, context 24, an MLP of 128), the loss without attention stopped at 2.01; with attention it reached 0.81.
- **The tiny GPT overfits.** Trained on 50 sentences and scored on the other 13, its held-out loss is best around step 500 (2.57), then rises to 4.82 by step 8,000, while the training loss keeps falling. The readable text is recited. The trainer always holds out the last 20% of the text and draws both curves, so the learner sees this happen.
- **Training speed.** 6,000 steps take about 40 s in the browser, and about 18 ms per step in plain Python.

**Next, Part 6:** chat format and special tokens, training on dialogues, and stopping at the end of a turn. Overfitting means it needs much more text than the bike shop's.

**Real Python tab (desktop).** It uses A-Arcade Python's stepper and environment, with six programs (`programs.js`). The middle panel is drawn from the paused program's own variables: the text tape, the recursion stack, the live CKY chart, dependency heads, and the rules tried. `stepper.desktop.test.js` drives the real stepper the way the tab does, and checks the results against the engine.

A lab that goes from raw characters to a chatbot you trained yourself. You feed it text and watch it learn, and you can save the network, download it, upload it again, and open the same file in PyTorch.

It follows the format of QMaze Lab and CartPole Lab, but builds the parts this subject needs.

## What it shares with QMaze and CartPole

- **Lessons with checked predictions.** Each lesson asks you to predict a number. The lab's own engine works the answer out, and `lessons.test.js` checks that the lesson text and the engine agree.
- **A JavaScript engine with matching Python.** The JavaScript runs in the browser. Parity tests prove the Python version gives the same numbers.
- **Real Python on the desktop.** You can step through it line by line, as in A-Arcade Python, and watch the tables and weights fill in.
- **A playground** where you bring your own input. Here, that means your own text.

## What it builds for itself

The sentence is the map. QMaze draws every table on the maze. NLP Studio draws everything on the text:

- Tokens are highlighted where they came from.
- Counts sit under their words.
- Parse trees grow over the sentence.
- A chart parser's table fills in cell by cell.
- Attention is drawn as lines between words.
- The next-token probabilities are shown as bars under the cursor.

**Watch it learn.** While a model trains, four things update together:

- the loss curve
- a sample of generated text every N steps, so you see gibberish turn into letters, then words, then phrases
- the probabilities for the next token after a prompt you choose
- a map of the embeddings

Training runs in a Web Worker, the way Kart Lab trains its drivers. The page stays responsive, and Stop keeps the last checkpoint.

## "A real chatbot": what each level can honestly do

The lab builds four chatbots, one after another. Each is real at its level, and the lessons say plainly what each one can and can't do.

| Bot | Built in | What it really does |
|---|---|---|
| 1. Rule bot (ELIZA-style) | Part 2 | Pattern matching and reflection ("I feel X" → "Why do you feel X?"). No learning. It shows why rules alone don't scale. |
| 2. Intent bot | Part 3 | Classifies a message into an intent you defined (Naive Bayes, then a small network) and answers from your own list of answers. Useful for a narrow job, such as a help desk for one app. |
| 3. Your own GPT | Parts 5–6 | A small transformer trained from scratch on text you supply, then on dialogues in a `User:` / `Bot:` format. It writes in the style of its training text but knows nothing beyond it. The lesson says so directly; this is the part for watching it learn. |
| 4. A pretrained model | Part 7 | A small pretrained language model run in the browser with transformers.js (already in `package.json`, not yet used), and on the desktop fine-tuned with PyTorch and LoRA on your dialogues. This is the one that actually converses. |

Bot 3 can't be made smart by more lessons, because the limit is compute and data, not code. Part 7 shows exactly where the gap is: same tokenizer idea, same attention, same sampling, a billion times more training.

## Saving, downloading and uploading

- **One file format: safetensors** (a JSON header plus raw float32 weights) with the config and the tokenizer's vocabulary in its metadata. The browser writes it, and Python opens it with `safetensors.torch.load_file`. A model trained in the browser can therefore be loaded into the matching PyTorch code, and the reverse also works. A parity test checks both directions.
- **In-browser library: IndexedDB, not localStorage.**
  - localStorage holds about 5 MB of text, per browser.
  - A 1-million-weight model is 4 MB as float32, and storing it as text adds a third.
  - IndexedDB stores binary data and has room for hundreds of MB.
  - localStorage keeps only small things: the list of saved models and the last settings.
  - Every read and write is wrapped in try/catch, because a private window can refuse storage.
- **Download / Upload** buttons save and open the same `.safetensors` file. Uploading checks the header before loading: shapes, config, vocabulary.
- **Desktop:** models are saved to a folder you choose, and the same file opens in the Python tab.

## Outline

ML Lab has short chapters on some of this: 11 Naive Bayes, 25 Sequences, 26 Attention, 34 Retrieval and 55 Language models. NLP Studio is the deep version, built up from characters. Each part links to the matching ML Lab chapter instead of repeating it.

1. **Text as data.**
   - Characters, Unicode and bytes.
   - Splitting text with your own scanning loop, then with a regex.
   - Sentence splitting and its traps, such as "Mr. Smith paid $3.50."
   - *Predict:* how many tokens?
2. **Parsing by hand.**
   - A tokenizer written as a state machine.
   - A small grammar, and a hand-written parser that draws its tree.
   - Ambiguity, as in "I saw the man with the telescope."
   - A chart parser (CKY), where you watch the table fill in.
   - Dependency parsing, which is what real tools use.
   - **Bot 1.**
3. **Counting.**
   - Vocabulary, bag of words, n-grams and smoothing.
   - TF-IDF.
   - Naive Bayes on examples you write.
   - **Bot 2.**
4. **Meaning as vectors.**
   - A table of which words appear near which.
   - Cosine similarity.
   - word2vec (skip-gram) trained by hand on a small text, with the embedding map moving as it learns.
5. **Predicting the next token.**
   - An n-gram language model.
   - A neural language model.
   - BPE tokenization by hand.
   - Attention computed number by number.
   - One transformer block.
   - A small GPT trained in the browser on your text.
6. **From a language model to a chatbot.**
   - The dialogue format and special tokens.
   - Training on conversations.
   - Sampling: temperature and top-k.
   - Stopping at the end of the bot's turn.
   - Save, download and upload.
   - **Bot 3.**
7. **Real NLP.**
   - On the desktop: spaCy for tokenizing and parsing, compared with yours.
   - Hugging Face tokenizers compared with your BPE.
   - A pretrained model in the browser.
   - LoRA fine-tuning on the desktop.
   - **Bot 4.**

## Numbers to measure before promising them

Don't write any of these into a lesson until they are measured on a real machine:

- **Training speed:** how big a model (about 0.2 to 1 million weights is the starting guess) trains in a few minutes in a worker, on about 1 MB of text, before samples show real words.
- **Model size:** which pretrained model is small enough to download once and run in the browser, and how large that download is.
- **Fine-tuning speed:** how long LoRA fine-tuning takes on a CPU, and with a GPU.

## Constraints

- **Don't freeze the PC.** Train on one worker thread, and use `torch.set_num_threads(1)` in desktop Python by default.
- **Training text.** The built-in texts are public domain. Your own text never leaves your computer.
- **Pretrained weights** are downloaded only when you ask, and cached. The lesson shows how big they are first.
- **Generated text** is labelled as generated. Lessons explain why a model can say false things confidently.

## Build order

1. Parts 1–3 and Bots 1 and 2: plain JavaScript and Python, nothing heavy. Check that the format feels right.
2. The tensor engine (start from Neural Net Lab's engine), the worker trainer, and the safetensors save, download and upload, with parity tests.
3. Parts 4–6 and Bot 3.
4. Part 7 and Bot 4.
