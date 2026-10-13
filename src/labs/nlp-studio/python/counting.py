"""Part 3 of NLP Studio: counting. Bags of words, n-grams and smoothing, TF-IDF and cosine
similarity. Plain Python: math and the tokenizer from Part 1.
"""
import math

from text_basics import char_kind, tokenize


def words(text):
    """Lower-cased word tokens: what every counter in Part 3 counts."""
    return [t.lower() for t in tokenize(text) if char_kind(t[0]) == "word"]


def build_vocab(docs):
    """Every word in the documents (lists of words), sorted, each with its column number."""
    vocab = sorted({w for doc in docs for w in doc})
    return {w: k for k, w in enumerate(vocab)}


def vectorize(tokens, vocab):
    """A bag of words: how many times each vocabulary word appears, in column order."""
    vector = [0] * len(vocab)
    for w in tokens:
        if w in vocab:
            vector[vocab[w]] += 1
    return vector


def dot(u, v):
    """The dot product: multiply matching entries and add them up."""
    return sum(a * b for a, b in zip(u, v))


def norm(u):
    """A vector's length: the square root of its dot product with itself."""
    return math.sqrt(dot(u, u))


def cosine(u, v):
    """The cosine of the angle between two vectors: 1 for the same direction, 0 for nothing in common."""
    if norm(u) == 0 or norm(v) == 0:
        return 0.0
    return dot(u, v) / (norm(u) * norm(v))


def ngrams(tokens, n):
    """Every run of n tokens in a row, as tuples."""
    return [tuple(tokens[i:i + n]) for i in range(len(tokens) - n + 1)]


def bigram_model(tokens):
    """For each word, how often each next word follows it: {w1: {w2: count}}."""
    follows = {}
    for w1, w2 in ngrams(tokens, 2):
        after = follows.setdefault(w1, {})
        after[w2] = after.get(w2, 0) + 1
    return follows


def next_word_prob(model, w1, w2, k=0, vocab_size=0):
    """P(w2 | w1) = (count(w1 w2) + k) / (count(w1 followed by anything) + k * V). k = 0: plain counting."""
    after = model.get(w1, {})
    total = sum(after.values())
    if total + k * vocab_size == 0:
        return 0.0
    return (after.get(w2, 0) + k) / (total + k * vocab_size)


def sentence_log_prob(model, tokens, k=0, vocab_size=0):
    """log P(sentence): the sum of log P(next | previous) over its bigrams."""
    total = 0.0
    for w1, w2 in ngrams(tokens, 2):
        p = next_word_prob(model, w1, w2, k, vocab_size)
        if p == 0:
            return float("-inf")
        total += math.log(p)
    return total


def greedy_continue(model, word, length):
    """Keep choosing the most frequent next word (ties: alphabetical first)."""
    out = [word]
    for _ in range(length):
        after = model.get(out[-1])
        if not after:
            break
        out.append(min(after, key=lambda w: (-after[w], w)))
    return out


def document_frequency(docs):
    """In how many documents each word appears (at least once)."""
    df = {}
    for doc in docs:
        for w in sorted(set(doc)):
            df[w] = df.get(w, 0) + 1
    return df


def idf(docs):
    """Inverse document frequency: log(N / df). Rare words score high, words in every document 0."""
    n = len(docs)
    return {w: math.log(n / d) for w, d in document_frequency(docs).items()}


def tfidf_vector(tokens, vocab, idf_values):
    """Each word's count times its idf, in column order."""
    counts = vectorize(tokens, vocab)
    columns = sorted(vocab, key=vocab.get)
    return [c * idf_values.get(w, 0.0) for c, w in zip(counts, columns)]


def search(query, docs):
    """Rank documents by the cosine between their TF-IDF vectors and the query's: [(score, index)], best first."""
    vocab = build_vocab(docs)
    weights = idf(docs)
    q = tfidf_vector(query, vocab, weights)
    scored = [(cosine(q, tfidf_vector(doc, vocab, weights)), i) for i, doc in enumerate(docs)]
    return sorted(scored, key=lambda pair: (-pair[0], pair[1]))
