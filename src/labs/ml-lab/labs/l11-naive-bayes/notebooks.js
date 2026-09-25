// Lab 11 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// The Python messages are generated from the engine's CORPUS, so the notebooks, figures and
// playground read the same 60 messages. Split rule, stated in the cells: every 4th message is held
// out for validation (15 messages), the other 45 are for training.
import { CORPUS } from './engine.js'

const messages = CORPUS.map(([label, text]) => `    (${label}, ${JSON.stringify(text)}),`).join('\n')
const DATA = `import re
import numpy as np

# The lab's 60 operations messages: label 1 = incident (needs a human now), 0 = routine.
messages = [
${messages}
]
def tokenize(text):
    return re.findall(r"[a-z0-9]+", text.lower())     # lowercase, then runs of letters and digits

train = [m for i, m in enumerate(messages) if i % 4 != 3]   # 45 messages to learn from
valid = [m for i, m in enumerate(messages) if i % 4 == 3]   # 15 held out
print(len(train), "training messages,", len(valid), "validation messages")`

const FIT = `from collections import Counter

def fit(train, alpha=1.0):
    vocab = sorted({w for _, text in train for w in tokenize(text)})      # training text only
    counts = {c: Counter() for c in (0, 1)}
    docs = Counter()
    for label, text in train:
        docs[label] += 1
        counts[label].update(tokenize(text))
    totals = {c: sum(counts[c].values()) for c in (0, 1)}
    V = len(vocab)
    log_prior = {c: np.log(docs[c] / len(train)) for c in (0, 1)}
    def log_lik(c, w):                                   # smoothed log P(w | c)
        return np.log((counts[c][w] + alpha) / (totals[c] + alpha * V))
    return dict(vocab=set(vocab), counts=counts, totals=totals, V=V, log_prior=log_prior, log_lik=log_lik)

def log_odds(model, text):
    """Prior log-odds plus one log-likelihood ratio per known token; unknown tokens are ignored."""
    terms = [(w, model["log_lik"](1, w) - model["log_lik"](0, w)) for w in tokenize(text) if w in model["vocab"]]
    prior = model["log_prior"][1] - model["log_prior"][0]
    return prior, terms, prior + sum(t for _, t in terms)

sigmoid = lambda z: 1 / (1 + np.exp(-z))
model = fit(train)
print("vocabulary size V =", model["V"], "  tokens per class:", model["totals"])`

export const extras = {
  'l11-bow': {
    formulaTex: '$$x_j = \\#\\{\\text{occurrences of vocabulary word } j\\}$$ $$x \\in \\mathbb{N}^V$$',
    mathCode: {
      rows: [
        ['tokens', 're.findall(r"[a-z0-9]+", text.lower())', 'Lowercase, then every run of letters and digits.'],
        ['vocabulary, size $V$', 'vocab = sorted({w for _, t in train for w in tokenize(t)})', 'Distinct training tokens only, each given a column index.'],
        ['$x_j$', 'x[index[w]] += 1', 'Count one more occurrence of vocabulary word j; unseen words have no column.'],
        ['sparse $x$', '{j: x_j for j with x_j > 0}', 'Only the non-zero positions need storing.'],
      ],
    },
    notebook: {
      title: 'Lab 11.1 · Words to counts',
      intro: 'Tokenize the lab’s messages, build a vocabulary from training text only, turn a message into a count vector, and check the result against scikit-learn’s CountVectorizer.',
      cells: [{
        title: 'The messages and the tokenizer',
        prose: 'The same 60 messages as the playground. **Predict** the tokens of “Disk FULL on agent-7!”.',
        code: `${DATA}
print(tokenize("Disk FULL on agent-7!"))
print(train[0], "→", tokenize(train[0][1]))`,
      }, {
        title: 'Vocabulary and a count vector',
        prose: 'The vocabulary comes from training messages only. **Predict** what happens to the word “kubernetes” in a new message if it never appeared in training.',
        code: `vocab = sorted({w for _, text in train for w in tokenize(text)})
index = {w: j for j, w in enumerate(vocab)}          # word → column
V = len(vocab)
def vectorize(text):
    x = np.zeros(V, dtype=int)
    for w in tokenize(text):
        if w in index:                                # unseen words have no column: ignored
            x[index[w]] += 1
    return x

msg = "timeout on database timeout kubernetes"
x = vectorize(msg)
print("V =", V, "  non-zero entries:", {vocab[j]: int(x[j]) for j in np.flatnonzero(x)})
print(f"share of entries that are zero: {1 - np.count_nonzero(x) / V:.3f}")`,
        tryThis: 'Build the vocabulary from all 60 messages instead. How many words does it gain, and why is that a (mild) leak?',
      }, {
        title: 'The library version',
        prose: 'CountVectorizer does the same with `token_pattern`. Its default pattern keeps only tokens of two or more characters, so “7” would vanish: always check what a library’s defaults do.',
        code: `from sklearn.feature_extraction.text import CountVectorizer
cv = CountVectorizer(token_pattern=r"[a-z0-9]+").fit([t for _, t in train])
print("same vocabulary:", list(cv.get_feature_names_out()) == vocab)
print("same counts:", (cv.transform([msg]).toarray()[0] == x).all())
default = CountVectorizer().fit([t for _, t in train])
print("words lost with the default pattern:", sorted(set(vocab) - set(default.get_feature_names_out())))`,
      }],
    },
  },
  'l11-bayes': {
    formulaTex: '$$P(c \\mid w_1, \\dots, w_m) = \\frac{P(c)\\,P(w_1, \\dots, w_m \\mid c)}{P(w_1, \\dots, w_m)}$$ $$P(w_1, \\dots, w_m \\mid c) = \\prod_{i=1}^m P(w_i \\mid c)$$ $$P(c) = \\frac{N_c}{N}$$',
    mathCode: {
      rows: [
        ['$P(c) = N_c / N$', 'docs[c] / len(train)', 'The prior: the share of training messages in class c.'],
        ['$P(w \\mid c)$', 'counts[c][w] / totals[c]', 'Unsmoothed: the word’s share of all tokens in class c.'],
        ['$\\prod_i P(w_i \\mid c)$', 'for w in tokenize(text): score[c] *= p(w, c)', 'The independence assumption turns the likelihood into a product, one factor per token.'],
        ['$\\propto$', 'score[c] / (score[0] + score[1])', 'Dividing by the sum over classes replaces the unknown denominator.'],
      ],
    },
    notebook: {
      title: 'Lab 11.2 · Bayes’ rule with a naive assumption',
      intro: 'Count the priors and word probabilities, then score a message as prior × product of word probabilities, and normalize.',
      cells: [{
        title: 'Priors and word tables',
        prose: '**Predict** the prior P(incident) from the training split.',
        code: `${DATA}
from collections import Counter
docs = Counter(label for label, _ in train)
counts = {c: Counter(w for label, t in train if label == c for w in tokenize(t)) for c in (0, 1)}
totals = {c: sum(counts[c].values()) for c in (0, 1)}
print("P(incident) =", docs[1], "/", len(train), "=", round(docs[1] / len(train), 3))
for w in ["error", "timeout", "deployed", "database"]:
    print(f"{w:9s} P(w | incident) = {counts[1][w]}/{totals[1]} = {counts[1][w] / totals[1]:.4f}   P(w | routine) = {counts[0][w]}/{totals[0]} = {counts[0][w] / totals[0]:.4f}")`,
      }, {
        title: 'Prior × product, then normalize',
        prose: 'The naive assumption in one loop: multiply one factor per token. **Predict** which class wins for “database error”: both words occur in both classes, but not equally often.',
        code: `def naive_scores(text):
    score = {c: docs[c] / len(train) for c in (0, 1)}          # start from the prior
    for w in tokenize(text):
        for c in (0, 1):
            score[c] *= counts[c][w] / totals[c]               # P(w | c), unsmoothed
    return score

s = naive_scores("database error")
print("unnormalized:", {c: f"{v:.3e}" for c, v in s.items()})
print("P(incident | words) =", round(s[1] / (s[0] + s[1]), 4))`,
        tryThis: 'Score “database timeout error” instead. Why is the answer exactly 1.0, and which single count causes it? (The next lesson fixes this.)',
      }],
    },
  },
  'l11-smoothing': {
    formulaTex: '$$\\hat P(w \\mid c) = \\frac{n_{w,c}}{n_c}$$ $$\\hat P_\\alpha(w \\mid c) = \\frac{n_{w,c} + \\alpha}{n_c + \\alpha V}$$ $$\\sum_{w} \\hat P_\\alpha(w \\mid c) = \\frac{n_c + \\alpha V}{n_c + \\alpha V} = 1$$',
    mathCode: {
      rows: [
        ['$n_{w,c}$', 'counts[c][w]', 'How often word w occurs in class-c training messages.'],
        ['$n_c$', 'totals[c]', 'All tokens in class c.'],
        ['$\\frac{n_{w,c} + \\alpha}{n_c + \\alpha V}$', '(counts[c][w] + alpha) / (totals[c] + alpha * V)', 'Laplace smoothing: α added to every count, αV to the total.'],
        ['$\\sum_w \\hat P_\\alpha(w \\mid c) = 1$', 'sum(p_smooth(w, c) for w in vocab)', 'The αV keeps the probabilities summing to 1.'],
      ],
    },
    notebook: {
      title: 'Lab 11.3 · Smoothing',
      intro: 'See one zero count wipe out a whole message, fix it with Laplace smoothing, check that probabilities still sum to 1, and watch α trade trust in counts for uniformity.',
      cells: [{
        title: 'One zero count overrules everything',
        prose: '“completed” never appears in incident training messages. **Predict** which class wins for “database error completed” without smoothing — two incident-leaning words against one routine word.',
        code: `${DATA}
${FIT}
from collections import Counter
counts, totals, V = model["counts"], model["totals"], model["V"]
print("count of 'completed' in incidents:", counts[1]["completed"], "  in routine:", counts[0]["completed"])
msg = "database error completed"
prior = {c: np.exp(model["log_prior"][c]) for c in (0, 1)}                 # P(c)
raw = {c: prior[c] * np.prod([counts[c][w] / totals[c] for w in tokenize(msg)]) for c in (0, 1)}
print("unsmoothed prior × likelihood:", {c: f"{v:.3e}" for c, v in raw.items()})
print("P(incident) =", raw[1] / (raw[0] + raw[1]), " — one zero count decided it")`,
      }, {
        title: 'Laplace smoothing',
        prose: 'Add α to every count and αV to the total. **Predict** the smoothed P(completed | incident) with α = 1.',
        code: `def p_smooth(w, c, alpha=1.0):
    return (counts[c][w] + alpha) / (totals[c] + alpha * V)

print(f"P(completed | incident) = (0 + 1)/({totals[1]} + {V}) = {p_smooth('completed', 1):.5f}")
print("sums to 1 over the vocabulary:", round(sum(p_smooth(w, 1) for w in model["vocab"]), 12))
prior, terms, z = log_odds(model, msg)
print("with smoothing: P(incident) =", round(sigmoid(z), 4), "  terms:", [(w, round(t, 2)) for w, t in terms])`,
      }, {
        title: 'How α moves the estimates',
        prose: 'A frequent word and a word seen once, as α grows. **Predict** where both head as α becomes large.',
        code: `for alpha in [0.01, 0.1, 1, 10, 100]:
    print(f"alpha {alpha:6}: P(error | incident) {p_smooth('error', 1, alpha):.4f}   P(crashed | incident) {p_smooth('crashed', 1, alpha):.4f}   uniform 1/V = {1 / V:.4f}")
for alpha in [0.1, 1, 10]:
    m = fit(train, alpha)
    acc = np.mean([(sigmoid(log_odds(m, t)[2]) >= 0.5) == label for label, t in valid])
    print(f"alpha {alpha}: validation accuracy {acc:.3f}")`,
        tryThis: 'With only 15 validation messages, how many would one more correct prediction change the accuracy by? Is the difference between α values meaningful here?',
      }],
    },
  },
  'l11-logs': {
    formulaTex: '$$\\log P(c) + \\sum_i \\log P(w_i \\mid c)$$ $$\\log\\frac{P(1 \\mid w)}{P(0 \\mid w)} = \\log\\frac{P(1)}{P(0)} + \\sum_i \\log\\frac{P(w_i \\mid 1)}{P(w_i \\mid 0)}$$ $$P(1 \\mid w) = \\sigma(\\text{log-odds})$$ $$p_c = \\frac{e^{s_c - m}}{\\sum_k e^{s_k - m}}, \\quad m = \\max_k s_k$$',
    mathCode: {
      rows: [
        ['$\\log\\frac{P(1)}{P(0)}$', 'log_prior[1] - log_prior[0]', 'The prior term: where the log-odds start before any word.'],
        ['$\\log\\frac{P(w_i \\mid 1)}{P(w_i \\mid 0)}$', 'log_lik(1, w) - log_lik(0, w)', 'One log-likelihood ratio per token: positive pushes toward incident.'],
        ['$\\sigma(z)$', '1 / (1 + np.exp(-z))', 'Log-odds back to a probability.'],
        ['$m = \\max_k s_k$', 'm = scores.max()', 'Subtracting the largest score before exponentiating prevents overflow.'],
        ['$\\frac{e^{s_c - m}}{\\sum_k e^{s_k - m}}$', 'np.exp(scores - m) / np.exp(scores - m).sum()', 'The log-sum-exp trick: the same probabilities, computed safely.'],
      ],
    },
    notebook: {
      title: 'Lab 11.4 · Computing in logs',
      intro: 'Watch a product of small probabilities underflow to zero, compute the same comparison as a sum of logs, explain one message word by word, and use log-sum-exp for many classes.',
      cells: [{
        title: 'Underflow',
        prose: '300 probabilities of 0.001. **Predict** what Python prints for the product.',
        code: `import numpy as np
p = np.full(300, 0.001)
print("product:", np.prod(p))
print("sum of logs:", np.log(p).sum(), " — about 10 **", round(np.log10(p).sum()))`,
      }, {
        title: 'One message, word by word',
        prose: 'The trained model’s log-odds for “database timeout error”: a prior term and one term per word. **Predict** the sign of each term.',
        code: `${DATA}
${FIT}
prior, terms, z = log_odds(model, "database timeout error")
print(f"prior term {prior:+.3f}")
for w, t in terms:
    print(f"  {w:9s} {t:+.3f}")
print(f"log-odds {z:+.3f}  →  P(incident) = σ(log-odds) = {sigmoid(z):.4f}")`,
        tryThis: 'Add the word “deployed” to the message. Predict the sign of its term before you run.',
      }, {
        title: 'Log-sum-exp for many classes',
        prose: 'Three classes with log scores around −1000. **Predict** what the naive formula gives. (NumPy will also warn that it divided 0 by 0.)',
        code: `scores = np.array([-1000.0, -1001.0, -1003.0])
naive = np.exp(scores) / np.exp(scores).sum()
m = scores.max()
safe = np.exp(scores - m) / np.exp(scores - m).sum()
print("naive:", naive)
print("stable:", np.round(safe, 4))`,
      }],
    },
  },
  'l11-limits': {
    formulaTex: '$$\\text{repeating } w \\ k \\text{ times adds } k\\,\\log\\frac{P(w \\mid 1)}{P(w \\mid 0)}$$',
    mathCode: {
      rows: [
        ['$k\\,\\log\\frac{P(w \\mid 1)}{P(w \\mid 0)}$', 'k * (log_lik(1, w) - log_lik(0, w))', 'Every copy of a word adds its full weight again.'],
        ['overconfidence', 'np.mean(np.maximum(p, 1 - p))', 'The average confidence of the predictions: how close to 0 or 1 they sit.'],
      ],
    },
    notebook: {
      title: 'Lab 11.5 · Where the assumption breaks',
      intro: 'Repeat one word and watch the log-odds climb linearly, then compare Naive Bayes confidence with logistic regression trained on the same counts.',
      cells: [{
        title: 'Repeated words count again and again',
        prose: '**Predict** the probability for “error” repeated five times.',
        code: `${DATA}
${FIT}
for k in [1, 2, 3, 5, 10]:
    prior, terms, z = log_odds(model, " ".join(["error"] * k))
    print(f"'error' × {k:2d}: log-odds {z:+.2f}   P(incident) {sigmoid(z):.4f}")`,
      }, {
        title: 'Same counts, two models',
        prose: 'Naive Bayes adds each word’s evidence separately; logistic regression fits the weights jointly, so correlated words share credit. **Predict** which model is more confident on average.',
        code: `from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
cv = CountVectorizer(token_pattern=r"[a-z0-9]+").fit([t for _, t in train])
Xtr, ytr = cv.transform([t for _, t in train]), np.array([l for l, _ in train])
Xva, yva = cv.transform([t for _, t in valid]), np.array([l for l, _ in valid])
for name, m in [("Naive Bayes", MultinomialNB(alpha=1.0)), ("logistic regression", LogisticRegression(C=1.0, max_iter=1000))]:
    p = m.fit(Xtr, ytr).predict_proba(Xva)[:, 1]
    print(f"{name:20s} accuracy {np.mean((p >= 0.5) == yva):.3f}   mean confidence {np.mean(np.maximum(p, 1 - p)):.3f}")`,
      }],
    },
  },
  'l11-evaluate': {
    formulaTex: '$$\\text{fit(train)} \\to \\text{transform(valid)} \\to \\text{score}$$',
    mathCode: {
      rows: [
        ['pipeline', 'make_pipeline(CountVectorizer(...), MultinomialNB())', 'The vocabulary and counts are refit inside every training fold.'],
        ['baseline', 'max(y.mean(), 1 - y.mean())', 'The accuracy of always predicting the majority class.'],
        ['per-word evidence', 'log_odds(model, text)[1]', 'The terms that drove a wrong prediction, for reading errors.'],
      ],
    },
    notebook: {
      title: 'Lab 11.6 · Evaluating honestly',
      intro: 'Check the hand-built model against scikit-learn, evaluate it with a pipeline that refits the vocabulary in every fold, and read the errors word by word.',
      cells: [{
        title: 'Our model against MultinomialNB',
        prose: 'The same smoothing, the same vocabulary. **Predict** how many validation messages the two disagree on.',
        code: `${DATA}
${FIT}
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
cv = CountVectorizer(token_pattern=r"[a-z0-9]+").fit([t for _, t in train])
lib = MultinomialNB(alpha=1.0).fit(cv.transform([t for _, t in train]), [l for l, _ in train])
ours = np.array([sigmoid(log_odds(model, t)[2]) for _, t in valid])
theirs = lib.predict_proba(cv.transform([t for _, t in valid]))[:, 1]
print("largest probability difference:", float(np.abs(ours - theirs).max()))`,
      }, {
        title: 'Cross-validation with the vocabulary inside the pipeline',
        prose: 'Five folds over all 60 messages; the pipeline refits the vocabulary on each training fold.',
        code: `from sklearn.pipeline import make_pipeline
from sklearn.model_selection import cross_val_score, StratifiedKFold
texts, labels = [t for _, t in messages], np.array([l for l, _ in messages])
pipe = make_pipeline(CountVectorizer(token_pattern=r"[a-z0-9]+"), MultinomialNB(alpha=1.0))
scores = cross_val_score(pipe, texts, labels, cv=StratifiedKFold(5, shuffle=True, random_state=0))
print("accuracy per fold:", np.round(scores, 3), "  mean", round(scores.mean(), 3))
print("majority-class baseline:", max(labels.mean(), 1 - labels.mean()))`,
      }, {
        title: 'Read the errors',
        prose: 'Every validation message the model gets wrong, with the words that drove it.',
        code: `wrong = 0
for label, text in valid:
    prior, terms, z = log_odds(model, text)
    if (sigmoid(z) >= 0.5) != label:
        wrong += 1
        top = sorted(terms, key=lambda t: -abs(t[1]))[:3]
        print(f"true {label}, P(incident) {sigmoid(z):.3f}: '{text}'  strongest words: {[(w, round(t, 2)) for w, t in top]}")
print(wrong, "of", len(valid), "validation messages misclassified")`,
        tryThis: 'For one error, write the new word or label fix that would correct it, and say whether that fix would generalize or just memorize this message.',
      }],
    },
  },
}
