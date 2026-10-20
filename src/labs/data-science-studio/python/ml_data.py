"""Part 11 of Data Science Studio: data for machine learning. Features from dates (with the
seasons as a circle), from categories (target encoding, and the leak it hides), from text (feature
hashing, TF-IDF); scaling for distances; what accuracy hides (precision, recall, F1); folds that keep
a rare class in every fold; and a pipeline fitted on the training rows only. Plain Python.
"""
import math

from data import Rng
from models import weekday
from samples import day_of_year
from summary import mean, std


def date_features(date):
    """The numbers a model can use from a date of 2025: the weekday (Monday 0), the month (1 to
    12), the day of the year (0 to 364) and whether it is a weekend (1 or 0)."""
    w = weekday(date)
    return [w, int(date[5:7]), day_of_year(date), 1 if w >= 5 else 0]


def cyclical(value, period):
    """A value that goes round in a cycle (a day of the year, an hour, a month) as a point on a
    circle: [sin, cos] of the angle value / period of a full turn. The end of the cycle lands next
    to its start."""
    angle = 2 * math.pi * value / period
    return [math.sin(angle), math.cos(angle)]


def target_means(keys, ys, m):
    """Target encoding: each category replaced by the mean of the target for its rows, pulled
    towards the overall mean as if m more rows had the overall mean. Returns the dictionary of
    encodings and the overall mean, for categories never seen."""
    overall = mean(ys)
    sums, counts = {}, {}
    for k, y in zip(keys, ys):
        sums[k] = sums.get(k, 0) + y
        counts[k] = counts.get(k, 0) + 1
    return [{k: (sums[k] + m * overall) / (counts[k] + m) for k in sums}, overall]


def out_of_fold_encode(keys, ys, folds, m):
    """Target encoding without the leak: each row encoded with the means of the other folds only,
    so its own target never reaches its own feature."""
    out = [0.0] * len(keys)
    for fold in folds:
        held = set(fold)
        rest = [i for i in range(len(keys)) if i not in held]
        means, overall = target_means([keys[i] for i in rest], [ys[i] for i in rest], m)
        for i in fold:
            out[i] = means.get(keys[i], overall)
    return out


def fnv1a(text):
    """The FNV-1a hash of a text, 32 bits (Fowler, Noll and Vo): for each byte of its UTF-8, xor it
    in, then multiply by the FNV prime, keeping 32 bits. The same text always gives the same
    number, in any language."""
    h = 2166136261
    for b in text.encode("utf-8"):
        h ^= b
        h = (h * 16777619) % 4294967296
    return h


def feature_hash(tokens, k):
    """The hashing trick: a list of k counts, each token adding 1 to bucket fnv1a(token) % k. No
    vocabulary is stored; different tokens can share a bucket."""
    counts = [0] * k
    for t in tokens:
        counts[fnv1a(t) % k] += 1
    return counts


def tokens(text):
    """The words of a text: runs of letters and digits, lower-cased."""
    out, word = [], ""
    for ch in text.lower():
        if ("a" <= ch <= "z") or ("0" <= ch <= "9"):
            word += ch
        elif word:
            out.append(word)
            word = ""
    if word:
        out.append(word)
    return out


def tf_idf(docs):
    """TF-IDF vectors for a list of token lists: the vocabulary sorted, and for each document each
    word's count times log(N / df), where df is the number of documents holding the word. A word
    in every document weighs 0; a rare one weighs most. Returns [vocabulary, vectors]."""
    vocab = sorted({t for d in docs for t in d})
    n = len(docs)
    df = {w: 0 for w in vocab}
    for d in docs:
        for w in set(d):
            df[w] += 1
    idf = {w: math.log(n / df[w]) for w in vocab}
    vectors = []
    for d in docs:
        counts = {}
        for t in d:
            counts[t] = counts.get(t, 0) + 1
        vectors.append([counts.get(w, 0) * idf[w] for w in vocab])
    return [vocab, vectors]


def fit_scaler(rows):
    """The mean and standard deviation of each column of the training rows: [means, sds]. A
    column that never changes gets 1, so it is left as it is."""
    columns = list(zip(*rows))
    means = [mean(list(c)) for c in columns]
    sds = [std(list(c)) for c in columns]
    return [means, [s if s > 0 else 1.0 for s in sds]]


def scale(rows, scaler):
    """Rows in standard units, using a scaler fitted elsewhere (on the training rows)."""
    means, sds = scaler
    return [[(x - m) / s for x, m, s in zip(row, means, sds)] for row in rows]


def knn_predict(train_x, train_y, x, k):
    """k nearest neighbours: the average target of the k training rows closest to x (straight-line
    distance), ties going to the earlier row."""
    dists = []
    for i, row in enumerate(train_x):
        d = 0.0
        for a, b in zip(row, x):
            d += (a - b) ** 2
        dists.append((d, i))
    dists.sort()
    return mean([train_y[i] for _, i in dists[:k]])


def confusion(ys, predictions):
    """The confusion matrix for the class 1: [[true positives, false negatives], [false positives,
    true negatives]]."""
    tp = fn = fp = tn = 0
    for y, p in zip(ys, predictions):
        if y == 1 and p == 1:
            tp += 1
        elif y == 1:
            fn += 1
        elif p == 1:
            fp += 1
        else:
            tn += 1
    return [[tp, fn], [fp, tn]]


def precision_recall_f1(matrix):
    """From a confusion matrix: precision (of the rows called 1, the share that are), recall (of
    the rows that are 1, the share called 1) and F1, their harmonic mean. 0 where nothing is
    called 1 or nothing is 1."""
    (tp, fn), (fp, tn) = matrix
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return [precision, recall, f1]


def stratified_folds(labels, k, seed):
    """k folds that each hold about the same share of every class: the rows of each class are
    shuffled with one generator and dealt into the folds in turn, carrying on from where the last
    class stopped."""
    rng = Rng(seed)
    folds = [[] for _ in range(k)]
    place = 0
    for label in sorted(set(labels)):
        rows = [i for i, y in enumerate(labels) if y == label]
        for i in range(len(rows) - 1):
            j = i + rng.below(len(rows) - i)
            rows[i], rows[j] = rows[j], rows[i]
        for r in rows:
            folds[place % k].append(r)
            place += 1
    return [sorted(f) for f in folds]


def positives_per_fold(labels, folds):
    """How many rows of class 1 each fold holds."""
    return [sum(1 for i in f if labels[i] == 1) for f in folds]

