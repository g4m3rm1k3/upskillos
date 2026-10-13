"""Part 5 of NLP Studio: language models. Perplexity, sampling with temperature, and BPE
tokenization. Plain Python.
"""
import math


def perplexity(log_probs):
    """exp of the average negative log-probability: "as unsure as choosing among this many options"."""
    return math.exp(-sum(log_probs) / len(log_probs))


def softmax(logits, temperature=1.0):
    """Scores to probabilities, after dividing by the temperature (subtract the biggest first)."""
    scaled = [x / temperature for x in logits]
    top = max(scaled)
    exps = [math.exp(x - top) for x in scaled]
    total = sum(exps)
    return [e / total for e in exps]


def sample(probs, r):
    """Pick an index with these probabilities, using one random number r in [0, 1):
    walk along the probabilities until their running total passes r."""
    total = 0.0
    for i, p in enumerate(probs):
        total += p
        if r < total:
            return i
    return len(probs) - 1


def cross_entropy_grad(logits, target):
    """The gradient of -log(softmax(logits)[target]) with respect to each logit: p - 1 for the
    right token, p for every other. The whole of backpropagation through softmax and the loss."""
    probs = softmax(logits)
    return [p - (1.0 if i == target else 0.0) for i, p in enumerate(probs)]


def attention(q, k, v):
    """Causal scaled dot-product attention on lists of vectors: each position i mixes the values
    of positions 0..i, weighted by softmax(q_i . k_j / sqrt(d))."""
    d = len(q[0])
    out = []
    for i in range(len(q)):
        scores = [sum(a * b for a, b in zip(q[i], k[j])) / math.sqrt(d) for j in range(i + 1)]
        weights = softmax(scores)
        out.append([sum(weights[j] * v[j][c] for j in range(i + 1)) for c in range(len(v[0]))])
    return out


def generate_bigram(model, word, length, temperature, rng):
    """Words from a bigram model ({w1: {w2: count}}), sampling each next word.
    The counts are the scores: log(count) / temperature, then softmax."""
    out = [word]
    for _ in range(length):
        after = model.get(out[-1])
        if not after:
            break
        options = sorted(after)
        probs = softmax([math.log(after[w]) for w in options], temperature)
        out.append(options[sample(probs, rng.random())])
    return out


def pair_counts(words):
    """How often each pair of neighbouring symbols appears, over a {word as a tuple of symbols: count} table."""
    pairs = {}
    for symbols, n in words.items():
        for a, b in zip(symbols, symbols[1:]):
            pairs[(a, b)] = pairs.get((a, b), 0) + n
    return pairs


def merge_pair(symbols, pair):
    """Replace every a, b next to each other in a tuple of symbols by the one symbol ab."""
    out = []
    i = 0
    while i < len(symbols):
        if i + 1 < len(symbols) and symbols[i] == pair[0] and symbols[i + 1] == pair[1]:
            out.append(symbols[i] + symbols[i + 1])
            i += 2
        else:
            out.append(symbols[i])
            i += 1
    return tuple(out)


def train_bpe(word_counts, merges):
    """Byte-pair encoding: start from single characters and repeatedly merge the most frequent
    neighbouring pair (ties: alphabetical first). Returns the merges in the order learned."""
    words = {tuple(w) + ("_",): n for w, n in word_counts.items()}
    learned = []
    for _ in range(merges):
        pairs = pair_counts(words)
        if not pairs:
            break
        best = min(pairs, key=lambda p: (-pairs[p], p))
        learned.append(best)
        words = {merge_pair(s, best): n for s, n in words.items()}
    return learned


def bpe_encode(word, merges):
    """A word as BPE tokens: its characters plus an end marker, then the merges, in the order learned."""
    symbols = tuple(word) + ("_",)
    for pair in merges:
        symbols = merge_pair(symbols, pair)
    return list(symbols)
