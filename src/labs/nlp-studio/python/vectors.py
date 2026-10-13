"""Part 4 of NLP Studio: words as vectors. Co-occurrence counts, PPMI, a 2-D map by power
iteration, word2vec (skip-gram with negative sampling) trained by hand, analogies, and Bot 2
answering by meaning. Plain Python: no NumPy, so every line can be stepped through.
"""
import math

from counting import cosine, dot, words


class Rng:
    """A tiny random-number generator (the 32-bit LCG from Numerical Recipes), written out so
    the page's JavaScript produces exactly the same numbers."""

    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (self.state * 1664525 + 1013904223) % 2**32
        return self.state / 2**32

    def below(self, n):
        return int(self.random() * n)


def vocabulary(sentences):
    """Every word of the sentences (lists of words), sorted."""
    return sorted({w for s in sentences for w in s})


def cooccurrence(sentences, window=2):
    """counts[a][b]: how often word b appears within `window` words of word a."""
    vocab = vocabulary(sentences)
    index = {w: k for k, w in enumerate(vocab)}
    counts = [[0] * len(vocab) for _ in vocab]
    for s in sentences:
        for i, w in enumerate(s):
            for j in range(max(0, i - window), min(len(s), i + window + 1)):
                if j != i:
                    counts[index[w]][index[s[j]]] += 1
    return vocab, counts


def ppmi(counts):
    """Positive pointwise mutual information: how much more often two words meet than chance predicts."""
    total = sum(sum(row) for row in counts)
    rows = [sum(row) for row in counts]
    cols = [sum(col) for col in zip(*counts)]
    out = []
    for a, row in enumerate(counts):
        out_row = []
        for b, c in enumerate(row):
            if c == 0:
                out_row.append(0.0)
            else:
                out_row.append(max(0.0, math.log(c * total / (rows[a] * cols[b]))))
        out.append(out_row)
    return out


def nearest(vocab, vectors, word, n=5):
    """The n words whose vectors point most nearly the same way as `word`'s: [(cosine, word)]."""
    k = vocab.index(word)
    scores = [(cosine(vectors[k], v), w) for w, v in zip(vocab, vectors) if w != word]
    return sorted(scores, key=lambda pair: (-pair[0], pair[1]))[:n]


def top_directions(vectors, k=2, steps=100):
    """The k directions in which the vectors spread out most (principal components), found by
    power iteration on their covariance matrix. Returns the mean and the directions."""
    n, dim = len(vectors), len(vectors[0])
    mean = [sum(v[d] for v in vectors) / n for d in range(dim)]
    centred = [[v[d] - mean[d] for d in range(dim)] for v in vectors]
    cov = [[sum(c[a] * c[b] for c in centred) / n for b in range(dim)] for a in range(dim)]
    directions = []
    for _ in range(k):
        x = [1.0] * dim
        for _ in range(steps):
            y = [dot(row, x) for row in cov]
            for d in directions:
                along = dot(y, d)
                y = [p - along * q for p, q in zip(y, d)]
            size = math.sqrt(dot(y, y))
            if size == 0:
                break
            x = [p / size for p in y]
        directions.append(x)
    return mean, directions


def project(vectors, mean, directions):
    """Each vector's position along each direction: its coordinates on the map."""
    return [[dot([a - m for a, m in zip(v, mean)], d) for d in directions] for v in vectors]


def sigmoid(x):
    """Squash any number into (0, 1): a probability."""
    return 1 / (1 + math.exp(-x))


def pair_gradient(u, v, label):
    """For one (centre, context) pair, the nudges that make sigmoid(u . v) closer to the label
    (1 for a real neighbour, 0 for a random one): (change for u, change for v)."""
    g = label - sigmoid(dot(u, v))
    return [g * b for b in v], [g * a for a in u]


def train_word2vec(sentences, dim=16, window=2, negatives=3, epochs=40, lr=0.05, seed=1):
    """Skip-gram with negative sampling: learn a vector for every word by predicting its neighbours.
    Returns the vocabulary, the word vectors, and the loss after each pass over the text."""
    vocab = vocabulary(sentences)
    index = {w: k for k, w in enumerate(vocab)}
    rng = Rng(seed)
    w_in = [[(rng.random() - 0.5) / dim for _ in range(dim)] for _ in vocab]
    w_out = [[0.0] * dim for _ in vocab]
    losses = []
    for _ in range(epochs):
        loss = 0.0
        for s in sentences:
            for i, word in enumerate(s):
                c = index[word]
                for j in range(max(0, i - window), min(len(s), i + window + 1)):
                    if j == i:
                        continue
                    pairs = [(index[s[j]], 1)] + [(rng.below(len(vocab)), 0) for _ in range(negatives)]
                    for o, label in pairs:
                        p = sigmoid(dot(w_in[c], w_out[o]))
                        loss -= math.log(max(1e-12, p if label else 1 - p))
                        change_in, change_out = pair_gradient(w_in[c], w_out[o], label)
                        w_in[c] = [a + lr * g for a, g in zip(w_in[c], change_in)]
                        w_out[o] = [b + lr * g for b, g in zip(w_out[o], change_out)]
        losses.append(loss)
    return vocab, w_in, losses


def analogy(vocab, vectors, a, b, c):
    """a is to b as c is to what? The word (not a, b or c) closest to b - a + c: (cosine, word)."""
    index = {w: k for k, w in enumerate(vocab)}
    target = [y - x + z for x, y, z in zip(vectors[index[a]], vectors[index[b]], vectors[index[c]])]
    scores = [(cosine(target, v), w) for w, v in zip(vocab, vectors) if w not in (a, b, c)]
    return sorted(scores, key=lambda pair: (-pair[0], pair[1]))[0]


# The most common words carry almost no meaning of their own ("the", "my", "do", "you"). Averaged
# in, they drown out the words that do: "do you sell pizza" would look like "thank you".
STOP_WORDS = {
    "the", "a", "an", "is", "are", "my", "your", "i", "you", "we", "do", "to", "on", "in", "at",
    "and", "of", "for", "it", "can", "how", "what", "where", "has", "have", "be", "so", "there",
    "that", "this", "with", "then", "please", "much", "lot", "all", "any", "me", "when", "after", "up",
}


def content_words(text):
    """The words of a text, without stop words."""
    return [w for w in words(text) if w not in STOP_WORDS]


def sentence_vector(tokens, index, vectors):
    """The average of the known words' vectors, or None if no word is known."""
    known = [vectors[index[w]] for w in tokens if w in index]
    if not known:
        return None
    return [sum(column) / len(known) for column in zip(*known)]


def semantic_reply(intents, vocab, vectors, message, threshold=0.5):
    """Bot 2 by meaning: the intent whose closest example (by cosine) is most similar to the
    message. A message with no known content word gets "not sure"."""
    index = {w: k for k, w in enumerate(vocab)}
    q = sentence_vector(content_words(message), index, vectors)
    scores = {}
    for name, intent in sorted(intents.items()):
        examples = [sentence_vector(content_words(e), index, vectors) for e in intent["examples"]]
        examples = [e for e in examples if e is not None]
        scores[name] = max((cosine(q, e) for e in examples), default=0.0) if q is not None else 0.0
    best = max(sorted(scores), key=lambda name: scores[name])
    if scores[best] < threshold:
        return {"intent": None, "similarity": scores[best], "scores": scores, "reply": "Sorry, I'm not sure what you mean. Could you put it another way?"}
    return {"intent": best, "similarity": scores[best], "scores": scores, "reply": intents[best]["reply"]}


def train_bike_vectors(sentences, epochs=40):
    """word2vec on the bike-shop sentences (strings): what the lessons and Bot 2 use."""
    return train_word2vec([words(s) for s in sentences], epochs=epochs)
