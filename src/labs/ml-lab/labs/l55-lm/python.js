export default {
  filename: 'language_model.py', packages: ['numpy'],
  title: 'Tokenize, score, sample, adapt and align — the core LM computations.',
  intro: 'Implement byte-pair encoding, add-k n-gram scoring and perplexity, temperature and top-k/top-p sampling filters, a LoRA layer, and the DPO loss. The checks use small examples with known answers.',
  steps: [
    '`bpe_learn(words, merges)` → list of merged pairs, where `words` maps a word (string) to its count; each merge joins the most frequent adjacent pair (ties: lexicographically smallest pair).',
    '`ngram_prob(counts, ctx_counts, ctx, c, k, V)` → add-k probability; `perplexity(probs)` → 2^(mean of −log₂ p).',
    '`temperature(p, T)`, `top_k(p, k)` and `top_p(p, q)` → renormalized probability vectors.',
    '`lora_forward(x, W, A, B, alpha, r)` → x @ (W + (alpha / r)·B @ A).T for weight W of shape (out, in).',
    '`dpo_loss(pw, pl, rw, rl, beta)` → −log σ(β[(pw − rw) − (pl − rl)]) from policy and reference log-probabilities.',
  ],
  hints: [
    ['BPE bookkeeping', 'Represent each word as a tuple of symbols; count pairs weighted by the word count; rebuild every word after each merge.'],
    ['top-p', 'Sort probabilities descending, keep items until the cumulative sum reaches q (including the one that crosses it), zero the rest, renormalize.'],
  ],
  starter: `import numpy as np

def bpe_learn(words, merges):
    raise NotImplementedError

def ngram_prob(counts, ctx_counts, ctx, c, k, V):
    raise NotImplementedError

def perplexity(probs):
    raise NotImplementedError

def temperature(p, T):
    raise NotImplementedError

def top_k(p, k):
    raise NotImplementedError

def top_p(p, q):
    raise NotImplementedError

def lora_forward(x, W, A, B, alpha, r):
    raise NotImplementedError

def dpo_loss(pw, pl, rw, rl, beta):
    raise NotImplementedError
`,
  solution: `import numpy as np
from collections import Counter

def bpe_learn(words, merges):
    vocab = {tuple(w): c for w, c in words.items()}
    rules = []
    for _ in range(merges):
        pairs = Counter()
        for sym, c in vocab.items():
            for a, b in zip(sym, sym[1:]):
                pairs[(a, b)] += c
        if not pairs:
            break
        best = min(pairs, key=lambda p: (-pairs[p], p))
        rules.append(best)
        new = {}
        for sym, c in vocab.items():
            out, i = [], 0
            while i < len(sym):
                if i + 1 < len(sym) and (sym[i], sym[i + 1]) == best:
                    out.append(sym[i] + sym[i + 1]); i += 2
                else:
                    out.append(sym[i]); i += 1
            new[tuple(out)] = new.get(tuple(out), 0) + c
        vocab = new
    return rules

def ngram_prob(counts, ctx_counts, ctx, c, k, V):
    return (counts.get((ctx, c), 0) + k) / (ctx_counts.get(ctx, 0) + k * V)

def perplexity(probs):
    return float(2 ** np.mean(-np.log2(probs)))

def temperature(p, T):
    q = np.asarray(p, dtype=float) ** (1 / T)
    return q / q.sum()

def top_k(p, k):
    p = np.asarray(p, dtype=float)
    keep = np.argsort(-p, kind="stable")[:k]
    q = np.zeros_like(p); q[keep] = p[keep]
    return q / q.sum()

def top_p(p, q):
    p = np.asarray(p, dtype=float)
    order = np.argsort(-p, kind="stable")
    cum = np.cumsum(p[order])
    n = int(np.searchsorted(cum, q - 1e-12) + 1)
    out = np.zeros_like(p); out[order[:n]] = p[order[:n]]
    return out / out.sum()

def lora_forward(x, W, A, B, alpha, r):
    return x @ (W + (alpha / r) * B @ A).T

def dpo_loss(pw, pl, rw, rl, beta):
    z = beta * ((pw - rw) - (pl - rl))
    return float(np.logaddexp(0, -z))
`,
  solutionNote: 'Every piece is small; together they are the vocabulary of modern language-model engineering.',
  checkSummary: 'BPE reproduces the classic low/lower/newest/widest merges; add-k probabilities and perplexity on hand values; temperature, top-k and top-p on a small distribution; a LoRA layer equals a dense layer with the merged weight and starts as the identity update when B = 0; and the DPO loss falls as the preference margin grows and equals log 2 at a zero margin.',
  checks: `
import numpy as np
rules = bpe_learn({"low": 5, "lower": 2, "newest": 6, "widest": 3}, 4)
assert rules[:3] == [("e", "s"), ("es", "t"), ("l", "o")], rules
print("PASS: BPE merges", rules)
counts, ctx = {("th", "e"): 18, ("th", "a"): 2}, {"th": 20}
assert abs(ngram_prob(counts, ctx, "th", "e", 0.1, 28) - 18.1 / 22.8) < 1e-12 and abs(ngram_prob(counts, ctx, "th", "z", 0.1, 28) - 0.1 / 22.8) < 1e-12
assert abs(perplexity([0.5, 0.25, 0.125]) - 4) < 1e-12
print("PASS: n-gram probabilities and perplexity")
p = np.array([0.5, 0.3, 0.15, 0.05])
assert np.allclose(temperature(p, 1), p) and temperature(p, 0.5)[0] > 0.5 and temperature(p, 3)[0] < 0.5
assert np.allclose(top_k(p, 2), [0.625, 0.375, 0, 0])
assert np.allclose(top_p(p, 0.8), [0.625, 0.375, 0, 0]) and np.allclose(top_p(p, 0.9), [0.5 / 0.95, 0.3 / 0.95, 0.15 / 0.95, 0])
print("PASS: temperature, top-k and top-p")
rng = np.random.default_rng(55)
W = rng.normal(size=(6, 10)); A = rng.normal(size=(2, 10)); B = rng.normal(size=(6, 2)); x = rng.normal(size=(3, 10))
assert np.allclose(lora_forward(x, W, A, B, 4, 2), x @ (W + 2 * B @ A).T)
assert np.allclose(lora_forward(x, W, A, np.zeros_like(B), 4, 2), x @ W.T), "B = 0 at initialization leaves the model unchanged"
print("PASS: LoRA layer")
assert abs(dpo_loss(0, 0, 0, 0, 1) - np.log(2)) < 1e-12
assert dpo_loss(0.4, -0.2, 0, 0, 1) < dpo_loss(0.1, 0, 0, 0, 1) < dpo_loss(0, 0.3, 0, 0, 1)
assert abs(dpo_loss(0.4, -0.2, 0, 0, 1) - np.logaddexp(0, -0.6)) < 1e-12
print("PASS: DPO loss")
`,
}
