// Part 11: data for machine learning. Features from dates, categories and text; scaling for
// distances; what accuracy hides; folds for a rare class; a pipeline fitted on training rows only; and
// a datasheet. The days, the deliveries, the cleaned orders' returns, and NLP Studio's messages as a
// table (python/ml_data.py, engine/mlData.js).
import * as T from '../engine/tables.js'
import * as S from '../engine/summary.js'
import * as P from '../engine/patterns.js'
import * as F from '../engine/models.js'
import * as L from '../engine/mlData.js'
import { DAYS_CSV } from '../engine/data.js'
import { evaluateFormula } from '../engine/sheet.js'
import { MESSAGES } from '../../nlp-studio/engine/data.js'
import { WITH_RNG, WITH_MONTHS } from './given.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const sheet = formula => evaluateFormula('orders', formula).value
const MEANS = [['summary.py', 'total'], ['summary.py', 'mean']]
const pct = (x, d = 1) => `${(100 * x).toFixed(d)}%`
const f1 = x => x.toFixed(1), f2 = x => x.toFixed(2), f3 = x => x.toFixed(3)
const accuracy = (ps, ys) => ys.filter((y, i) => (ps[i] > 0.5 ? 1 : 0) === y).length / ys.length

const DAYS = P.numberDays(T.readCsv(DAYS_CSV())), DATES = DAYS.map(r => r.date), RI = DAYS.map(r => r.riders)
// 11.1: riders from the date alone, three ways, and from the weather.
const datesX = kind => DATES.map(d => {
  const [, month, doy, we] = L.dateFeatures(d)
  if (kind === 'line') return [1, doy, we]
  if (kind === 'months') return [1, ...F.oneHot([month], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])[0].slice(1), we]
  return [1, ...L.cyclical(doy, 365), we]
})
const dateRmse = kind => { const X = datesX(kind); return F.rmse(RI, F.predict(X, F.fit(X, RI))) }
const LINE = dateRmse('line'), MONTHS = dateRmse('months'), CIRCLE = dateRmse('circle')
const GAP = Math.hypot(...L.cyclical(364, 365).map((v, j) => v - L.cyclical(0, 365)[j]))
// 11.2: the deliveries; the order date target-encoded, leaky and honest, inside five-fold cross-validation.
const DEL = L.deliveryTable(), ONTIME = DEL.map(r => r.onTime), KEYS = DEL.map(r => r.date)
const FOLDS = F.kFolds(DEL.length, 5, 3)
function crossValidate(features) {
  let correct = 0
  for (const fold of FOLDS) {
    const held = new Set(fold), train = DEL.map((_, i) => i).filter(i => !held.has(i))
    const [Xtr, Xte] = features(train, fold), w = F.logisticFit(Xtr, train.map(i => ONTIME[i]), 0.5, 2000)
    correct += fold.filter((i, j) => (F.sigmoid(Xte[j].reduce((s, x, q) => s + x * w[q], 0)) > 0.5 ? 1 : 0) === ONTIME[i]).length
  }
  return correct / DEL.length
}
const row = (i, e) => [1, DEL[i].north, DEL[i].far, e]
const [ALL_MEANS] = L.targetMeans(KEYS, ONTIME, 1)
const CV_LEAKY = crossValidate((tr, te) => [tr.map(i => row(i, ALL_MEANS[KEYS[i]])), te.map(i => row(i, ALL_MEANS[KEYS[i]]))])
const CV_HONEST = crossValidate((tr, te) => {
  const [means, overall] = L.targetMeans(tr.map(i => KEYS[i]), tr.map(i => ONTIME[i]), 1)
  const inner = L.outOfFoldEncode(tr.map(i => KEYS[i]), tr.map(i => ONTIME[i]), F.kFolds(tr.length, 5, 9), 1)
  return [tr.map((i, j) => row(i, inner[j])), te.map(i => row(i, KEYS[i] in means ? means[KEYS[i]] : overall))]
})
const CV_BASE = crossValidate((tr, te) => [tr.map(i => row(i, DEL[i].north * DEL[i].far)), te.map(i => row(i, DEL[i].north * DEL[i].far))])
const ALWAYS = S.mean(ONTIME), DISTINCT_DATES = new Set(KEYS).size
const IN_SAMPLE = accuracy(KEYS.map(k => ALL_MEANS[k]), ONTIME), OOF = accuracy(L.outOfFoldEncode(KEYS, ONTIME, FOLDS, 1), ONTIME)
// 11.3 and 11.4: the messages.
const TEXTS = MESSAGES.map(([text]) => text), SPAM = MESSAGES.map(([, lab]) => (lab === 'spam' ? 1 : 0)), TOKENS = TEXTS.map(L.tokens)
const VOCAB = [...new Set(TOKENS.flat())].sort()
const MFOLDS = L.stratifiedFolds(SPAM, 5, 1)
function spamCv(features) {
  let correct = 0
  for (const fold of MFOLDS) {
    const held = new Set(fold), train = SPAM.map((_, i) => i).filter(i => !held.has(i))
    const [Xtr, Xte] = features(train, fold), w = F.logisticFit(Xtr, train.map(i => SPAM[i]), 0.5, 500)
    correct += fold.filter((i, j) => (F.sigmoid(Xte[j].reduce((s, x, q) => s + x * w[q], 0)) > 0.5 ? 1 : 0) === SPAM[i]).length
  }
  return correct / SPAM.length
}
const SPAM_TFIDF = spamCv((tr, te) => {
  const [vocab] = L.tfIdf(tr.map(i => TOKENS[i])), df = Object.fromEntries(vocab.map(w => [w, tr.filter(i => TOKENS[i].includes(w)).length]))
  const vec = tk => [1, ...vocab.map(w => tk.filter(t => t === w).length * Math.log(tr.length / df[w]))]
  return [tr.map(i => vec(TOKENS[i])), te.map(i => vec(TOKENS[i]))]
})
const spamHash = k => spamCv((tr, te) => [tr.map(i => [1, ...L.featureHash(TOKENS[i], k)]), te.map(i => [1, ...L.featureHash(TOKENS[i], k)])])
const HASH = Object.fromEntries([4, 16, 64].map(k => [k, spamHash(k)]))
const [IDF_VOCAB, IDF_VECS] = L.tfIdf(TOKENS)
const idfOf = w => Math.log(TOKENS.length / TOKENS.filter(t => t.includes(w)).length)
const sharing = k => { const b = new Map(); for (const w of VOCAB) { const h = L.fnv1a(w) % k; b.set(h, (b.get(h) ?? 0) + 1) } return [...b.values()].filter(n => n > 1).reduce((s, n) => s + n, 0) }
// 11.5: nearest neighbours for riders.
const KX = DAYS.map(r => { const [, , doy, we] = L.dateFeatures(r.date); return [r.high_c, r.rain_mm, we, doy] })
const KTRAIN = KX.map((_, i) => i).filter(i => i % 4 !== 0), KTEST = KX.map((_, i) => i).filter(i => i % 4 === 0)
const knnRmse = X => F.rmse(KTEST.map(j => RI[j]), KTEST.map(j => L.knnPredict(KTRAIN.map(i => X[i]), KTRAIN.map(i => RI[i]), X[j], 10)))
const KNN_RAW = knnRmse(KX), KNN_SCALED = knnRmse(L.scale(KX, L.fitScaler(KTRAIN.map(i => KX[i])))), KNN_ALL = knnRmse(L.scale(KX, L.fitScaler(KX)))
const SD_DOY = S.std(KTRAIN.map(i => KX[i][3])), SD_WE = S.std(KTRAIN.map(i => KX[i][2]))
// 11.6: late parcels.
const LATE = DEL.map(r => r.late), LX = DEL.map(r => [1, r.north, r.far, r.north * r.far])
const LPROB = F.predict(LX, F.logisticFit(LX, LATE, 1, 5000)).map(F.sigmoid)
const at = t => { const m = L.confusion(LATE, LPROB.map(p => (p > t ? 1 : 0))); return { m, scores: L.precisionRecallF1(m), acc: (m[0][0] + m[1][1]) / LATE.length } }
const AT5 = at(0.5), AT2 = at(0.2), NEVER = L.confusion(LATE, LATE.map(() => 0))
// 11.7: returned orders.
const RET = L.returnedFlags(), N_RET = RET.filter(x => x).length
const EMPTY = Array.from({ length: 200 }, (_, s) => L.positivesPerFold(RET, F.kFolds(RET.length, 10, (s + 1) * 7919)).includes(0)).filter(Boolean).length
const P_EMPTY_FOLD = (9 / 10) ** N_RET, P_SOME_EMPTY = 1 - (1 - P_EMPTY_FOLD) ** 10
// 11.9: the late-parcel model, out of fold with stratified folds, at threshold 0.2.
const SFOLDS = L.stratifiedFolds(LATE, 5, 4)
const OOF_PROB = (() => {
  const out = LATE.map(() => 0)
  for (const fold of SFOLDS) {
    const held = new Set(fold), train = LATE.map((_, i) => i).filter(i => !held.has(i)), w = F.logisticFit(train.map(i => LX[i]), train.map(i => LATE[i]), 1, 5000)
    for (const i of fold) out[i] = F.sigmoid(LX[i].reduce((s, x, q) => s + x * w[q], 0))
  }
  return out
})()
const HONEST_M = L.confusion(LATE, OOF_PROB.map(p => (p > 0.2 ? 1 : 0))), HONEST = L.precisionRecallF1(HONEST_M)

export const PART11 = {
  id: 'part11', title: 'Part 11 · Data for machine learning', lessons: [
    {
      id: 'date-features', number: '11.1', title: 'Features from dates',
      goal: 'Turn a date into numbers a model can use, and put a cycle on a circle so that its end sits next to its start.',
      builds: ['four-views'],
      blocks: [
        { h: 'A date is not a number' },
        { md: `A model takes numbers. A date such as 2025-07-14 holds several: the weekday, the month, the day of the year, whether it is a weekend. Which ones help depends on the question; the work of choosing and building them is **feature engineering**, and it usually matters more than the choice of model. Lesson 8.2 already built the weekend from the date; this part builds the rest, then turns to categories, text and the traps around them.` },
        {
          code: { file: 'ml_data.py', fn: 'date_features', notes: [['return [w, int(date[5:7]), day_of_year(date), 1 if w >= 5 else 0]', ['Four numbers from one date, from lessons 6.3 and 8.2’s helpers.']]] },
        },
        {
          write: {
            file: 'ml_data.py', fn: 'date_features', also: [['models.py', 'weekday'], ['samples.py', 'day_of_year']], prelude: WITH_MONTHS,
            prompt: 'Write `date_features(date)`: `[weekday, month, day of the year, weekend]`, the weekend 1 for Saturday and Sunday (weekday 5 and 6), else 0.',
            starter: 'def date_features(date):\n    return [weekday(date), 0, day_of_year(date), 0]\n',
            cases: cases(L.dateFeatures, [['2025-01-01'], ['2025-06-07'], ['2025-12-31'], ['2025-03-09']]),
            hint: '`w = weekday(date)`, the month is `int(date[5:7])`, the weekend `1 if w >= 5 else 0`.',
          },
        },
        { h: 'Seasons go round' },
        { md: `To a model, the day of the year as a number says 31 December (364) and 1 January (0) are as far apart as possible, though they are neighbours. A line through it can only rise or fall all year; riders rise and then fall. Two fixes: twelve **month** columns (lesson 8.5's one-hot), or put the day on a **circle**: the point $(\\sin\\theta, \\cos\\theta)$ with $\\theta = 2\\pi \\times \\text{day}/365$. Two columns, and the year closes up.` },
        { figure: 'DateCircle', caption: 'Pick two days: their distance on the line of day numbers, and on the circle.' },
        {
          code: { file: 'ml_data.py', fn: 'cyclical', notes: [['angle = 2 * math.pi * value / period', ['A full turn per period: 365 days, 24 hours, 7 weekdays, 12 months.']]] },
        },
        {
          write: {
            file: 'ml_data.py', fn: 'cyclical', prelude: 'import math',
            prompt: 'Write `cyclical(value, period)`: the angle `2 * math.pi * value / period`, then `[math.sin(angle), math.cos(angle)]`.',
            starter: 'def cyclical(value, period):\n    return [value / period, 0.0]\n',
            cases: cases(L.cyclical, [[0, 365], [364, 365], [91, 365], [6, 12]]),
            hint: '`angle = 2 * math.pi * value / period`',
          },
        },
        {
          derive: {
            title: 'Neighbours on the circle',
            steps: [
              { prompt: 'Two points on a circle of radius 1, an angle φ apart, are 2 sin(φ/2) apart (the chord). One day is φ = 2π/365. The distance from 31 December to 1 January (to 4 decimals)?', number: GAP, compute: () => 2 * Math.sin(Math.PI / 365), tolerance: 0.00005, why: `${GAP.toFixed(4)}, the same as between any two neighbouring days, against 364 on the line of day numbers.` },
            ],
          },
        },
        {
          predict: {
            prompt: `Riders from the date alone (plus the weekend), by least squares (lesson 8.3). The day number as a line: RMSE ${f1(LINE)}. Twelve month columns: ${f1(MONTHS)}. The circle, 2 columns (to 1 decimal)?`,
            answer: CIRCLE, compute: () => dateRmse('circle'), tolerance: 0.05,
            explain: `${f1(CIRCLE)}: better than twelve month columns, with two. The circle is smooth; months jump on the 1st. The weather model of lesson 8.4 does far better (about 41), because the date only stands in for the temperature it brings. Features that are causes beat features that are calendars, when you have them.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=SIN(2*PI()*364/365)', must: ['SIN', 'PI'],
            prompt: 'In the spreadsheet: the sine part of 31 December (day 364).',
            hint: '`=SIN(2*PI()*364/365)`',
            explain: `${f3(sheet('=SIN(2*PI()*364/365)'))}: just below 0, like 1 January’s 0, the circle closing up.`,
          },
        },
      ],
    },

    {
      id: 'target-encoding', number: '11.2', title: 'Categories and target encoding',
      goal: 'Encode a category by the mean target of its rows, smooth it, and catch the leak this hides when the encoding sees the row it encodes.',
      builds: ['date-features'],
      blocks: [
        { h: 'A category as one number' },
        { md: `One-hot (lesson 8.5) gives a category with k values k − 1 columns: fine for 7 weekdays, hopeless for 10,000 postcodes. **Target encoding** gives one column: each category's average target. For the deliveries, "Northern" becomes Northern's on-time rate. It is popular in competitions and in industry, and it hides a leak.` },
        {
          code: { file: 'ml_data.py', fn: 'target_means', notes: [['return [{k: (sums[k] + m * overall) / (counts[k] + m) for k in sums}, overall]', ['Each category’s mean, pulled towards the overall mean as if `m` more rows had the overall mean: a category seen once gets little weight of its own.']]] },
        },
        {
          derive: {
            title: 'Smoothing',
            steps: [
              { prompt: 'A category with n rows and mean x̄, the overall mean μ, smoothing m. The encoding (sum + mμ)/(n + m), written with x̄: in terms of n, x (for x̄), m and u (for μ)?', answer: '(n*x+m*u)/(n+m)', vars: { n: [1, 50], x: [0, 1], m: [0, 10], u: [0, 1] }, why: 'The sum is n x̄. So the encoding is a weighted average of the category’s mean (weight n) and the overall mean (weight m). Many rows: its own mean; few: close to the overall.' },
            ],
          },
        },
        {
          write: {
            file: 'ml_data.py', fn: 'target_means', also: MEANS,
            prompt: 'Write `target_means(keys, ys, m)`: the overall mean of `ys`; each key’s sum and count; return `[{key: (sum + m * overall) / (count + m)}, overall]`.',
            starter: 'def target_means(keys, ys, m):\n    overall = mean(ys)\n    return [{k: overall for k in keys}, overall]\n',
            cases: cases(L.targetMeans, [[['a', 'b', 'a', 'c'], [1, 0, 0, 1], 0], [['a', 'b', 'a', 'c'], [1, 0, 0, 1], 2], [DEL.map(r => (r.north ? 'Northern' : 'Swift')), ONTIME, 0]]),
            hint: 'Two dictionaries, `sums` and `counts`, filled in one loop over `zip(keys, ys)`.',
          },
        },
        {
          sql: {
            prompt: 'Target encoding is a GROUP BY: each courier’s on-time rate. In SQLite a comparison is 1 or 0, so `AVG(on_time = \'yes\')` is the share of yes. Order by courier.',
            solution: "SELECT courier, AVG(on_time = 'yes') FROM deliveries GROUP BY courier ORDER BY courier", must: ['AVG', 'GROUP BY'],
            answer: [['Northern', L.targetMeans(DEL.map(r => (r.north ? 'N' : 'S')), ONTIME, 0)[0].N], ['Swift', L.targetMeans(DEL.map(r => (r.north ? 'N' : 'S')), ONTIME, 0)[0].S]],
            hint: "`SELECT courier, AVG(on_time = 'yes') FROM deliveries GROUP BY courier ORDER BY courier`",
            explain: 'Two categories, plenty of rows each: the encoding is safe here. The trouble starts with many categories and few rows each.',
          },
        },
        { h: 'The leak' },
        { md: `Encode the **order date** instead: ${DEL.length} deliveries fall on ${DISTINCT_DATES} dates, so most dates have one delivery, and its encoding is (nearly) its own answer. A model given that column looks brilliant, and has learned nothing that will work on a new delivery.` },
        { figure: 'EncodingLeak', caption: 'The date, target-encoded. On all rows, the on-time and late parcels almost separate at 0.5; out of fold, they don’t separate at all.' },
        {
          predict: {
            prompt: `“Encoded date above 0.5 means on time”, the date encoded on all rows with m = 1: what share of the deliveries does it get right (to 1 decimal, in %)?`,
            answer: 100 * IN_SAMPLE, compute: () => 100 * accuracy(KEYS.map(k => L.targetMeans(KEYS, ONTIME, 1)[0][k]), ONTIME), tolerance: 0.05,
            explain: `${pct(IN_SAMPLE)}, from a column that knows nothing (the generator never looks at the date). Encoded **out of fold**, each row from the other folds only: ${pct(OOF)}, below always saying on time (${pct(ALWAYS)}).`,
          },
        },
        {
          code: { file: 'ml_data.py', fn: 'out_of_fold_encode', notes: [['means, overall = target_means([keys[i] for i in rest], [ys[i] for i in rest], m)', ['The encodings for a fold come from the other folds: a row’s own target never reaches its own feature.']], ['out[i] = means.get(keys[i], overall)', ['A date not seen in the other folds gets the overall mean.']]] },
        },
        {
          predict: {
            prompt: `Logistic regression on courier, distance and the encoded date, scored by five-fold cross-validation (lesson 8.9). With the date encoded once on all rows before the folds, it scores ${pct(CV_LEAKY)}. With the encoding done inside each fold, out of fold, what (to 1 decimal, in %)?`,
            answer: 100 * CV_HONEST, compute: () => 100 * CV_HONEST, tolerance: 0.05,
            explain: `${pct(CV_HONEST)}. The courier-and-distance model without the date scores ${pct(CV_BASE)}. The leaky number was not a weak estimate of a good model; it was a strong estimate of nothing. Cross-validation can’t protect you from a leak that happened before it split the data.`,
          },
        },
      ],
    },

    {
      id: 'text-counts', number: '11.3', title: 'Text as counts',
      goal: 'Turn messages into word counts and TF-IDF weights, and classify them with the logistic regression of lesson 8.10.',
      builds: ['target-encoding'],
      blocks: [
        { h: 'Another lab’s data, as a table' },
        { md: `NLP Studio's Part 3 has ${MESSAGES.length} short messages, each labelled spam or ham (not spam). As a table they are two columns, text and label, and the question is the deliveries' question again: predict a 0/1 column from the others. The text has to become numbers first. The simplest way, the **bag of words**: one column per word, holding how often it occurs. Word order is thrown away, and it works surprisingly well.` },
        {
          code: { file: 'ml_data.py', fn: 'tokens', notes: [['if ("a" <= ch <= "z") or ("0" <= ch <= "9"):', ['A word is a run of letters and digits; anything else ends it. “Don’t” becomes don and t: a choice, and NLP Studio’s Part 1 is about such choices.']]] },
        },
        {
          write: {
            file: 'ml_data.py', fn: 'tokens',
            prompt: 'Write `tokens(text)`: lower-case the text, then collect runs of letters a–z and digits 0–9 as words.',
            starter: 'def tokens(text):\n    return text.lower().split()\n',
            cases: cases(L.tokens, [['WIN a free phone now!'], ["Don't  stop--now, 2 bikes!"], [TEXTS[4]], ['']]),
            hint: 'Build `word` one character at a time; when a character is not a letter or digit and `word` is not empty, append it and start again. Append the last one after the loop.',
          },
        },
        { h: 'TF-IDF' },
        { md: `Some words are everywhere ("the", "you") and say little; some are rare and say a lot ("prize"). **TF-IDF** (Spärck Jones, 1972) weighs each count by how rare the word is across the documents: the term frequency times the **inverse document frequency**, $\\log(N / \\text{df})$, where df is the number of documents that contain the word.` },
        {
          derive: {
            title: 'What idf does',
            steps: [
              { prompt: 'A word in all N documents: its idf, log(N / N)?', number: 0, compute: () => Math.log(1), why: 'Every count of it is multiplied by 0: it can’t tell documents apart, so it is ignored.' },
              { prompt: `“the” is in ${TOKENS.filter(t => t.includes('the')).length} of the ${TOKENS.length} messages. Its idf (to 3 decimals)?`, number: idfOf('the'), compute: () => idfOf('the'), tolerance: 0.0005, why: `${f3(idfOf('the'))}, the smallest in these messages; “prize”, in ${TOKENS.filter(t => t.includes('prize')).length}, gets ${f3(idfOf('prize'))}.` },
            ],
          },
        },
        {
          code: { file: 'ml_data.py', fn: 'tf_idf', notes: [['for w in set(d):', ['df counts documents, not occurrences: `set` counts a word once per message.']], ['vectors.append([counts.get(w, 0) * idf[w] for w in vocab])', ['One column per word of the vocabulary: most entries 0, a **sparse** vector.']]] },
        },
        {
          write: {
            file: 'ml_data.py', fn: 'tf_idf', prelude: 'import math',
            prompt: 'Write `tf_idf(docs)` for a list of token lists: the sorted vocabulary; each word’s df; idf = `math.log(n / df)`; for each document, count × idf for every word of the vocabulary. Return `[vocab, vectors]`.',
            starter: 'def tf_idf(docs):\n    vocab = sorted({t for d in docs for t in d})\n    return [vocab, [[d.count(w) for w in vocab] for d in docs]]\n',
            cases: cases(L.tfIdf, [[[['a', 'b'], ['a', 'c', 'c']]], [TOKENS.slice(0, 8)]]),
            hint: '`df[w]` counts documents with `w` (loop over `set(d)`); `idf = {w: math.log(n / df[w]) for w in vocab}`; then count each document’s words.',
          },
        },
        {
          predict: {
            prompt: `Logistic regression on the TF-IDF columns (the idf learned from the training messages only), five folds that each hold 4 spam and 4 ham: what share of the ${MESSAGES.length} messages does it classify right (in %)?`,
            answer: 100 * SPAM_TFIDF, compute: () => 100 * SPAM_TFIDF, tolerance: 0.05,
            explain: `${pct(SPAM_TFIDF)} on messages it never saw, from ${VOCAB.length} word columns and ${MESSAGES.length - 8} training messages at a time. Spam’s words (“free”, “claim”, “prize”) are its giveaway. NLP Studio goes on to word vectors and transformers, which read the order and meaning that a bag of words throws away.`,
          },
        },
      ],
    },

    {
      id: 'feature-hashing', number: '11.4', title: 'Feature hashing',
      goal: 'Map words or categories to a fixed number of columns with a hash function, and measure what the collisions cost.',
      builds: ['text-counts'],
      blocks: [
        { h: 'No vocabulary' },
        { md: `TF-IDF needs the vocabulary: every word seen in training, in a table. With millions of documents (or user ids, or URLs) that table is huge, and a word first seen tomorrow has no column. The **hashing trick** (Weinberger and others, 2009) skips the table: put each word in column hash(word) mod k, for a fixed k. A **hash function** turns any text into a number, the same number every time, scattered so that similar texts get unrelated numbers.` },
        {
          code: { file: 'ml_data.py', fn: 'fnv1a', notes: [['h = 2166136261', ['The FNV offset basis: a fixed starting number.']], ['h ^= b', ['Mix in one byte with exclusive or…']], ['h = (h * 16777619) % 4294967296', ['…then multiply by the FNV prime, keeping 32 bits. Each byte changes every later bit.']]] },
        },
        {
          write: {
            file: 'ml_data.py', fn: 'fnv1a',
            prompt: 'Write `fnv1a(text)`: start at 2166136261; for each byte of `text.encode("utf-8")`, `h ^= b`, then `h = (h * 16777619) % 4294967296`.',
            starter: 'def fnv1a(text):\n    h = 2166136261\n    for b in text.encode("utf-8"):\n        h += b\n    return h\n',
            cases: cases(L.fnv1a, [[''], ['a'], ['bike'], ['Café'], ['free prize']]),
            hint: 'Two lines in the loop: `h ^= b` and `h = (h * 16777619) % 4294967296`.',
          },
        },
        { python: { program: 'fnv1a', label: 'Step through fnv1a in real Python' } },
        {
          code: { file: 'ml_data.py', fn: 'feature_hash', notes: [['counts[fnv1a(t) % k] += 1', ['The bucket is the hash’s remainder: k columns, whatever the vocabulary.']]] },
        },
        { figure: 'HashBuckets', caption: 'The messages’ words in k buckets: fewer buckets, more words sharing one.' },
        {
          derive: {
            title: 'How often words collide',
            steps: [
              { prompt: 'A word’s bucket is shared if any of the other n − 1 words lands in it. Each misses it with probability 1 − 1/k. The chance that a word shares its bucket, in terms of n and k?', answer: '1-(1-1/k)^(n-1)', vars: { n: [2, 50], k: [2, 100] }, why: 'All n − 1 must miss for the word to be alone: (1 − 1/k)^(n−1).' },
              { prompt: `${VOCAB.length} words, k = 128 (to 3 decimals)?`, number: 1 - (1 - 1 / 128) ** (VOCAB.length - 1), compute: () => 1 - (1 - 1 / 128) ** (VOCAB.length - 1), tolerance: 0.0005, why: `${f3(1 - (1 - 1 / 128) ** (VOCAB.length - 1))}; measured: ${sharing(128)} of ${VOCAB.length} (${f3(sharing(128) / VOCAB.length)}). With 1,024 buckets: ${sharing(1024)} words. The birthday paradox: collisions come much sooner than k = n suggests.` },
            ],
          },
        },
        {
          predict: {
            prompt: `The spam classifier on hashed counts instead of TF-IDF: with 4 buckets it scores ${pct(HASH[4])}, with 16 ${pct(HASH[16])}. With 64 buckets (in %)?`,
            answer: 100 * HASH[64], compute: () => 100 * HASH[64], tolerance: 0.05,
            explain: `${pct(HASH[64])}, against ${pct(SPAM_TFIDF)} for TF-IDF with its full vocabulary. Collisions blur words together; more buckets blur less. In practice k is 2^18 or more and collisions barely matter, which is why the trick is used for spam filters and ad systems with billions of features.`,
          },
        },
      ],
    },

    {
      id: 'scaling-distances', number: '11.5', title: 'Scaling for distances',
      goal: 'Predict with k nearest neighbours, see a feature with a big spread take over the distance, and scale with numbers learned from the training rows.',
      builds: ['feature-hashing'],
      blocks: [
        { h: 'Nearest neighbours' },
        { md: `**k nearest neighbours** (Fix and Hodges, 1951) needs no fitting at all: to predict a day's riders, find the k training days most like it and average their riders. "Most like" means nearest in straight-line distance over the features: temperature, rain, weekend, day of the year.` },
        {
          code: { file: 'ml_data.py', fn: 'knn_predict', notes: [['d += (a - b) ** 2', ['Squared differences, added: lesson 5.1’s distance. (The square root changes no order, so it is skipped.)']], ['dists.sort()', ['Nearest first; equal distances keep the earlier row first, as the tuples sort by index next.']]] },
        },
        {
          write: {
            file: 'ml_data.py', fn: 'knn_predict', also: MEANS,
            prompt: 'Write `knn_predict(train_x, train_y, x, k)`: the squared distance from `x` to every training row, as `(distance, index)` pairs; sort them; return the mean of the `train_y` of the first k.',
            starter: 'def knn_predict(train_x, train_y, x, k):\n    return mean(train_y[:k])\n',
            cases: cases(L.knnPredict, [[[[0, 0], [1, 0], [0, 1], [5, 5]], [1, 2, 3, 10], [0.2, 0.1], 2], [[[0, 0], [1, 0], [0, 1], [5, 5]], [1, 2, 3, 10], [4, 4], 1], [KTRAIN.slice(0, 120).map(i => KX[i]), KTRAIN.slice(0, 120).map(i => RI[i]), KX[0], 10]]),
            hint: 'Build `dists.append((d, i))` for each row, `dists.sort()`, then `mean([train_y[i] for _, i in dists[:k]])`.',
          },
        },
        { figure: 'KnnScaling', caption: 'Every 4th day held out, predicted from its nearest training days: raw units against standard units.' },
        {
          derive: {
            title: 'Who decides “near”',
            steps: [
              { prompt: `In a squared distance each feature adds (difference)². A typical difference is about its standard deviation. On the training days the day of the year has sd ${f1(SD_DOY)} and the weekend ${f2(SD_WE)}. How many times more does the day of the year add, typically (to the nearest whole number)?`, number: (SD_DOY / SD_WE) ** 2, compute: () => (SD_DOY / SD_WE) ** 2, tolerance: 0.5, why: `About ${Math.round((SD_DOY / SD_WE) ** 2).toLocaleString('en-GB')} times: in raw units the weekend, worth 90 riders, is invisible to the distance. In standard units each feature has sd 1 and adds alike.` },
            ],
          },
        },
        {
          predict: {
            prompt: `Ten nearest neighbours, all four features in raw units: RMSE ${f1(KNN_RAW)} on the held-out days. In standard units (to 1 decimal)?`,
            answer: KNN_SCALED, compute: () => knnRmse(L.scale(KX, L.fitScaler(KTRAIN.map(i => KX[i])))), tolerance: 0.05,
            explain: `${f1(KNN_SCALED)}. Same data, same method; only the units changed. Anything built on distances (nearest neighbours, k-means, support vector machines) or on gradient steps (lesson 8.6) needs features on comparable scales. Trees don’t care: they split one feature at a time.`,
          },
        },
        {
          code: { file: 'ml_data.py', fn: 'fit_scaler', notes: [['return [means, [s if s > 0 else 1.0 for s in sds]]', ['A column that never changes would divide by 0: leave it alone.']]] },
        },
        {
          code: { file: 'ml_data.py', fn: 'scale', notes: [['return [[(x - m) / s for x, m, s in zip(row, means, sds)] for row in rows]', ['Fitted once, on the training rows, and applied to every row, test rows included, with the same numbers.']]] },
        },
        {
          choice: {
            prompt: `Fitting the scaler on all 365 days (test days included) gives RMSE ${f1(KNN_ALL)}, against ${f1(KNN_SCALED)} with the training days’ scaler. Is it fair?`,
            options: [
              { text: 'Yes: the difference is tiny, and the means and spreads hardly depend on a quarter of the days.', why: 'Small here, but not fair: the test days’ values shaped the transformation. In a real forecast the future isn’t there to fit on. Lesson 11.8 makes it a rule.' },
              { text: 'No: the test days helped set the means and spreads, a small leak. The scaler is part of the model, fitted on training rows only.', why: 'Yes. Here it moved the score a little; with target encoding (lesson 11.2) the same mistake was enormous. Same rule for both.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'beyond-accuracy', number: '11.6', title: 'What accuracy hides',
      goal: 'Read a confusion matrix, compute precision, recall and F1, and move a threshold to trade one for the other.',
      builds: ['scaling-distances'],
      blocks: [
        { h: 'Right 78% of the time, useless' },
        { md: `${LATE.filter(x => x).length} of the ${LATE.length} parcels were late. A "model" that always says **on time** is right ${pct(1 - S.mean(LATE))} of the time and never warns about a single late parcel. When one class is much rarer than the other, **accuracy** mostly measures how rare it is. The **confusion matrix** shows what accuracy averages away: for the class that matters (late), how many were caught, missed, or raised as false alarms.` },
        {
          code: { file: 'ml_data.py', fn: 'confusion', notes: [['if y == 1 and p == 1:', ['A late parcel called late: caught (a true positive).']], ['elif y == 1:', ['Late, called on time: missed (a false negative).']], ['elif p == 1:', ['On time, called late: a false alarm (a false positive).']]] },
        },
        {
          write: {
            file: 'ml_data.py', fn: 'confusion',
            prompt: 'Write `confusion(ys, predictions)` for the class 1: count true positives, false negatives, false positives and true negatives; return `[[tp, fn], [fp, tn]]`.',
            starter: 'def confusion(ys, predictions):\n    right = sum(1 for y, p in zip(ys, predictions) if y == p)\n    return [[right, 0], [0, 0]]\n',
            cases: cases(L.confusion, [[[1, 0, 1, 1, 0], [1, 1, 0, 1, 0]], [LATE, LATE.map(() => 0)], [LATE, LPROB.map(p => (p > 0.2 ? 1 : 0))]]),
            hint: 'Four counters, one `if`/`elif` chain per pair `(y, p)`.',
          },
        },
        {
          derive: {
            title: 'Precision, recall, F1',
            intro: '**Precision**: of the parcels called late, the share that were. **Recall**: of the late parcels, the share called late.',
            steps: [
              { prompt: 'Precision in terms of t (true positives) and f (false positives)?', answer: 't/(t+f)', vars: { t: [1, 20], f: [0, 20] }, why: 'What a warning is worth.' },
              { prompt: 'Recall in terms of t and m (missed, the false negatives)?', answer: 't/(t+m)', vars: { t: [1, 20], m: [0, 20] }, why: 'How many of the late ones were caught.' },
              { prompt: 'F1 is their harmonic mean, 2 / (1/p + 1/r). Simplified, in terms of p and r?', answer: '2*p*r/(p+r)', vars: { p: [0.05, 1], r: [0.05, 1] }, why: 'The harmonic mean is dragged down by the smaller one: precision 1 and recall 0.01 give F1 0.02, not 0.5. It rewards balance.' },
            ],
          },
        },
        {
          write: {
            file: 'ml_data.py', fn: 'precision_recall_f1',
            prompt: 'Write `precision_recall_f1(matrix)` from `[[tp, fn], [fp, tn]]`: precision, recall and F1, each 0 when its bottom is 0.',
            starter: 'def precision_recall_f1(matrix):\n    (tp, fn), (fp, tn) = matrix\n    return [tp / (tp + fp), tp / (tp + fn), 0.5]\n',
            cases: cases(L.precisionRecallF1, [[[[2, 1], [1, 1]]], [[[0, 3], [0, 5]]], [AT5.m], [AT2.m]]),
            hint: '`precision = tp / (tp + fp) if tp + fp else 0.0`, the same for recall, then `2 * precision * recall / (precision + recall)` if their sum is not 0.',
          },
        },
        { figure: 'ThresholdTradeoff', caption: 'The courier-and-distance model of lesson 8.10, for late parcels: move the threshold and watch catches turn into false alarms.' },
        {
          predict: {
            prompt: `At the usual threshold, 0.5, the model catches ${AT5.m[0][0]} of the ${LATE.filter(x => x).length} late parcels: precision ${f2(AT5.scores[0])}, recall ${f2(AT5.scores[1])}. Lower the threshold to 0.2: its recall (to 2 decimals)?`,
            answer: AT2.scores[1], compute: () => L.precisionRecallF1(L.confusion(LATE, LPROB.map(p => (p > 0.2 ? 1 : 0))))[1], tolerance: 0.005,
            explain: `${f2(AT2.scores[1])}: ${AT2.m[0][0]} caught, at the cost of ${AT2.m[1][0]} false alarms (precision ${f2(AT2.scores[0])}, accuracy ${pct(AT2.acc)}, down from ${pct(AT5.acc)}). Which is better depends on what each mistake costs: an apology email for a parcel that turns up on time is cheap; a missed wedding present is not. Choose the threshold from the costs, not from 0.5.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=COUNTIF(deliveries!D2:D163, "yes")/ROWS(deliveries!D2:D163)', must: ['COUNTIF', 'ROWS'],
            prompt: 'In the spreadsheet: the accuracy of always saying on time, the share of yes.',
            hint: '`=COUNTIF(deliveries!D2:D163, "yes")/ROWS(deliveries!D2:D163)`',
            explain: `${f3(sheet('=COUNTIF(deliveries!D2:D163, "yes")/ROWS(deliveries!D2:D163)'))}: the number any model of late parcels has to beat on accuracy, and the reason accuracy is the wrong score. Its recall for late parcels: ${L.precisionRecallF1(NEVER)[1]}.`,
          },
        },
      ],
    },

    {
      id: 'stratified-folds', number: '11.7', title: 'Rare classes and stratified folds',
      goal: 'See random folds leave a rare class out of some folds, derive how often, and deal folds by class instead.',
      builds: ['beyond-accuracy'],
      blocks: [
        { h: 'Twenty in four hundred' },
        { md: `${N_RET} of the ${RET.length} cleaned orders were returned: ${pct(N_RET / RET.length)}. Split them into ten random folds for cross-validation (lesson 8.9) and some folds get no returned order at all: a model can't be scored on returns in a fold that has none, and the folds' scores swing wildly.` },
        { figure: 'FoldBalance', caption: 'Returned orders per fold. Random folds: some get none. Stratified folds: two each, every time.' },
        {
          derive: {
            title: 'How often a fold is empty',
            steps: [
              { prompt: `Treat each returned order as landing in a given fold with probability 1/10 (close enough for 400 rows). The chance that a given fold gets none of the ${N_RET} (to 3 decimals)?`, number: P_EMPTY_FOLD, compute: () => (9 / 10) ** N_RET, tolerance: 0.0005, why: `(9/10)^${N_RET} = ${f3(P_EMPTY_FOLD)}.` },
              { prompt: 'The chance that at least one of the ten folds is empty, treating the folds as independent: 1 − (1 − that)^10 (to 2 decimals)?', number: P_SOME_EMPTY, compute: () => 1 - (1 - (9 / 10) ** N_RET) ** 10, tolerance: 0.005, why: `${f2(P_SOME_EMPTY)}. Measured: ${EMPTY} of 200 random splits had an empty fold (${f2(EMPTY / 200)}).` },
            ],
          },
        },
        {
          code: { file: 'ml_data.py', fn: 'stratified_folds', notes: [['for label in sorted(set(labels)):', ['One class at a time: its rows shuffled, then dealt round the folds like cards.']], ['folds[place % k].append(r)', ['`place` carries on from the last class, so the folds’ sizes stay within 1 of each other too.']]] },
        },
        {
          write: {
            file: 'ml_data.py', fn: 'stratified_folds', prelude: WITH_RNG,
            prompt: 'Write `stratified_folds(labels, k, seed)`: one `Rng(seed)`; for each label in sorted order, its row numbers shuffled as `k_folds` does (for each i, swap with `i + rng.below(len(rows) - i)`), then dealt into folds `place % k` with `place` counting on across labels. Return each fold sorted.',
            starter: 'def stratified_folds(labels, k, seed):\n    return [list(range(f, len(labels), k)) for f in range(k)]\n',
            cases: cases(L.stratifiedFolds, [[[1, 0, 0, 0, 1, 0, 0, 0, 0, 1], 3, 2], [SPAM, 5, 1], [RET, 10, 5]]),
            hint: 'The shuffle: `for i in range(len(rows) - 1): j = i + rng.below(len(rows) - i); rows[i], rows[j] = rows[j], rows[i]`.',
          },
        },
        {
          code: { file: 'ml_data.py', fn: 'positives_per_fold', notes: [['return [sum(1 for i in f if labels[i] == 1) for f in folds]', ['What the figure’s bars count.']]] },
        },
        {
          choice: {
            prompt: 'Lesson 11.3’s spam folds were stratified too, with 4 spam and 4 ham each. Why does it matter even with 20 of each?',
            options: [
              { text: 'With 8 messages a fold, a random split can easily give 6 spam and 2 ham; the fold’s accuracy then measures that mix as much as the model. Stratifying makes every fold look like the whole.', why: 'Yes: less variance between folds, and every fold can be scored. Stratify on the label (and, for groups, keep groups whole: lesson 8.9).' },
              { text: 'It doesn’t: stratifying only matters for rare classes.', why: 'It matters most there, but small folds are noisy whatever the balance.' },
            ],
            answer: 0,
          },
        },
      ],
    },

    {
      id: 'pipelines', number: '11.8', title: 'A pipeline fitted on training rows',
      goal: 'Treat every step that learns from data as part of the model, fitted inside each fold, and see the leaks of this part side by side.',
      builds: ['stratified-folds'],
      blocks: [
        { h: 'Every step that learns is part of the model' },
        { md: `A model is rarely one step. Before logistic regression come the features: scaled with a mean and a spread, encoded with target means, words weighted with idf, maybe columns chosen by how well they correlate with the target. Each of those steps **learns numbers from data**. The rule: a step that learns from data is part of the model, and is fitted on the training rows of each fold, then applied unchanged to that fold's test rows. Libraries call the chain a **pipeline** (scikit-learn's \`Pipeline\`), precisely so that cross-validation refits all of it each time.` },
        {
          mathCode: [
            ['\\mu, \\sigma', 'fit_scaler(train)', 'learned: fit inside the fold (lesson 11.5)'],
            ['\\bar y_k', 'target_means(train keys, train ys, m)', 'learned: inside the fold, and out of fold within the training rows (lesson 11.2)'],
            ['\\log(N/\\text{df})', 'tf_idf(train docs)', 'learned: df from the training messages only (lesson 11.3)'],
            ['\\text{fnv1a}(w) \\bmod k', 'feature_hash(tokens, k)', 'learns nothing: safe to apply anywhere (lesson 11.4)'],
            ['w', 'logistic_fit(X, y, rate, steps)', 'the model itself (lesson 8.10)'],
          ],
        },
        {
          md: `The leaks of this part, measured, honest against leaky:

| Step | Fitted on all rows first | Fitted inside each fold |
|---|---|---|
| target-encoded order date, late-parcel model (11.2) | ${pct(CV_LEAKY)} accuracy | ${pct(CV_HONEST)} |
| scaler for nearest neighbours (11.5) | RMSE ${f1(KNN_ALL)} | ${f1(KNN_SCALED)} |

The first is a disaster, the second a rounding error, and from outside they look the same: a number from cross-validation. Only the procedure tells them apart.`,
        },
        {
          choice: {
            prompt: 'An analyst picks the 20 words most correlated with spam, using all 40 messages, then cross-validates a model on those 20 words. What is wrong?',
            options: [
              { text: 'Nothing: the words were chosen before cross-validation, so the folds are clean.', why: 'The choice used the test messages’ labels: each fold’s test messages helped pick the features that score them.' },
              { text: 'Choosing features by their correlation with the label is a step that learns from labels: it must be redone inside each fold, on the training messages only.', why: 'Yes. Ambroise and McLachlan (2002) showed published gene-expression results with near-perfect accuracy that fell to chance once the gene selection was moved inside the cross-validation.' },
            ],
            answer: 1,
          },
        },
        {
          predict: {
            prompt: 'Of the five steps in the table above, how many learn numbers from the data?',
            answer: 4, compute: () => 4, tolerance: 0,
            explain: '4: the scaler, the target means, the idf and the model. The hash learns nothing, so it may be applied before splitting; so may any fixed rule (lower-casing, the date features of 11.1). When in doubt, ask: would this step give different numbers on different rows?',
          },
        },
      ],
    },

    {
      id: 'datasheet-project', number: '11.9', title: 'Project: a late-parcel model, and its datasheet',
      goal: 'Build the late-parcel model honestly end to end, report what it is worth, and write down what the data is and is not.',
      builds: ['pipelines'],
      blocks: [
        { h: 'The model, honestly' },
        { md: `The shop wants to email customers whose parcel is likely to be late. The pieces of this part, in order: features known at posting time (courier and distance; not the days taken, lesson 8.11); stratified folds on late (lesson 11.7); every step fitted inside the folds (11.8); and a threshold chosen for recall, because a missed late parcel costs more than an apology (11.6). Each parcel's probability comes from a model that never saw it.` },
        {
          predict: {
            prompt: `Out of fold, five stratified folds, threshold 0.2: the late parcels it catches, its recall (to 2 decimals)?`,
            answer: HONEST[1], compute: () => HONEST[1], tolerance: 0.005,
            explain: `${f2(HONEST[1])}, with precision ${f2(HONEST[0])} and F1 ${f2(HONEST[2])} (${HONEST_M[0][0]} caught, ${HONEST_M[0][1]} missed, ${HONEST_M[1][0]} false alarms). Close to the in-sample ${f2(AT2.scores[1])} of lesson 11.6: four probabilities from 162 parcels don’t overfit. The report: “emailing every customer in York and Harrogate, whichever courier (the groups the model puts at 0.2 or more), warns ${pct(HONEST[1], 0)} of late parcels; about ${Math.round(100 * (1 - HONEST[0]))} in 100 warnings will be for parcels that arrive on time.”`,
          },
        },
        { h: 'A datasheet for the data' },
        { md: `Electronic parts come with datasheets: what they are for, their limits, how they were tested. Gebru and colleagues (2018) proposed the same for datasets: a short document, written by whoever made the data, answering set questions. For the shop's data the answers are unusually complete, because the generator is in \`data.py\`:

- **Motivation**: made for teaching, to have a real shape and known truths; not real customers.
- **Composition**: 402 orders of one year (2 duplicated), 25 returns, 365 days, 162 deliveries, 56 days of an A/B test. Flaws put in on purpose: missing prices, towns spelled several ways, two prices typed in pence, returns with mistyped order ids, a column that leaks the outcome (\`days\`).
- **Collection**: a seeded random generator; every effect is a written rule (riders = 300 + 22 per °C − 12 per mm + 90 at weekends + noise; on-time rates by courier and distance).
- **Known truths a user can check against**: the rules above; that orders per day follow no pattern; that rain never changes visits.
- **Uses it should not have**: any conclusion about real cycle shops or real couriers.` },
        {
          choice: {
            prompt: 'Which question on a datasheet would have warned about lesson 8.11’s leak before any model was built?',
            options: [
              { text: '“How many rows does the dataset have?”', why: 'Size tells nothing about when a value becomes known.' },
              { text: '“When is each field recorded, relative to the outcome?” The days a delivery took are recorded after it arrives, the same moment as on-time itself.', why: 'Yes. Datasheets ask about the collection process for this reason; most leaks are a timeline problem.' },
            ],
            answer: 1,
          },
        },
        {
          choice: {
            prompt: 'NLP Studio’s 40 messages were written for that lab, 20 spam and 20 ham. What should a datasheet for them say about the spam classifier’s 92.5%?',
            options: [
              { text: 'That it will catch about 92.5% of real spam.', why: 'Real inboxes hold far more ham than spam, written by different people, and spam that changes to dodge filters. The messages are a teaching set, balanced by design.' },
              { text: 'That the messages are invented and balanced 50/50, so the accuracy says how separable these messages are, not how a filter would do on a real inbox, where precision would fall as ham outnumbers spam.', why: 'Yes: the composition (balanced, synthetic) limits what any number from it can claim. That sentence is what a datasheet is for.' },
            ],
            answer: 1,
          },
        },
        { note: 'Part 12 is the last: showing uncertainty honestly, a D3 dashboard with linked views, and the capstone, the shop’s whole year from raw CSV to a recommendation.', kind: 'key' },
      ],
    },
  ],
}
