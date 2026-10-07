# Embeddings

The character model in the RNN lesson fed each character in as a **one-hot** vector: as long as the vocabulary, all zeros except a single 1. For a vocabulary of 50,000 words, every word becomes a vector of 50,000 numbers, and every pair of different words is exactly the same distance apart. "Cat" is as far from "kitten" as from "volcano". Nothing the network learns about one word helps with any other.

An **embedding** replaces each word, or any other category (a product, a user, a postcode), with a short dense vector of, say, 50 or 300 numbers, **learned** so that things used in similar ways end up close together. Embeddings are how neural networks read categorical data, and the first layer of every language model. This lesson builds them two ways from a small text: by counting which words appear together and compressing the counts with the SVD, and by training **skip-gram with negative sampling**, the method behind word2vec. Then it looks at how an embedding layer fits inside a network and is trained by backpropagation.

## An embedding is a lookup table

An embedding layer is just a matrix E with one row per item and d columns. The embedding of item `i` is row `i`. Multiplying a one-hot vector by E gives exactly that row, so an embedding layer **is** a dense layer applied to one-hot inputs, computed the fast way, by looking up the row instead of multiplying by thousands of zeros:

```python type
import numpy as np

vocab = ["cat", "dog", "bread", "apple"]
rng = np.random.default_rng(0)
E = rng.normal(0, 1, (len(vocab), 3))

one_hot_dog = np.zeros(len(vocab))
one_hot_dog[1] = 1
print("one-hot @ E:", (one_hot_dog @ E).round(3))
print("row lookup: ", E[1].round(3))

sentence = [1, 2, 1, 3]
print("a sentence of word ids becomes a", E[sentence].shape, "array of vectors")
```

```output
one-hot @ E: [ 0.105 -0.536  0.362]
row lookup:  [ 0.105 -0.536  0.362]
a sentence of word ids becomes a (4, 3) array of vectors
```

`E[sentence]` looks up one row per word id, turning a sequence of ids into a sequence of vectors that any network can read. The question is how to get **good** vectors.

## Similarity: the cosine

To compare embeddings, the standard measure is the **cosine similarity**: the cosine of the angle between two vectors, a · b / (‖a‖ ‖b‖). It is 1 when they point the same way, 0 when they are at right angles, and −1 when they point in opposite directions. It ignores length, which in learned embeddings often just reflects how frequent a word is.

## A small corpus

Learning embeddings needs text. The idea behind every method is the **distributional hypothesis**: words that appear in similar contexts have similar meanings. "Cat" and "dog" both appear before "runs", "sleeps" and "in the garden"; "bread" and "rice" both appear after "eats" and "cooks". Here is a made-up corpus of short sentences built from a few templates, with a few odd sentences mixed in:

```python type
import numpy as np

rng = np.random.default_rng(0)
animals = ["cat", "dog", "fox", "horse", "cow"]
foods = ["bread", "apple", "cheese", "soup", "rice"]
people = ["chef", "baker", "farmer", "child"]
places = ["kitchen", "garden", "barn", "field"]
sentences = []
for _ in range(1500):
    kind = rng.integers(5)
    if kind == 0:
        sentences.append(f"the {rng.choice(animals)} runs in the {rng.choice(['garden', 'field', 'barn'])}")
    elif kind == 1:
        sentences.append(f"the {rng.choice(people)} eats the {rng.choice(foods)}")
    elif kind == 2:
        sentences.append(f"the {rng.choice(people)} cooks {rng.choice(foods)} in the kitchen")
    elif kind == 3:
        sentences.append(f"the {rng.choice(animals)} sleeps in the {rng.choice(places)}")
    else:
        sentences.append(str(rng.choice(["the child runs in the garden", "the dog eats the bread",
                                         "the farmer sleeps in the barn", "the horse eats the apple"])))
words = " ".join(sentences).split()
vocab = sorted(set(words))
print(f"{len(sentences)} sentences, {len(words)} words, vocabulary of {len(vocab)}")
print(sentences[:4])
```

```output
1500 sentences, 8880 words, vocabulary of 24
['the farmer sleeps in the barn', 'the baker cooks apple in the kitchen', 'the cat runs in the garden', 'the cow runs in the field']
```

## Method 1: count, then compress

Count, for every pair of words, how often they appear within two positions of each other: a **co-occurrence matrix**, V × V. Raw counts are dominated by common words like "the", so convert them to **PPMI** (positive pointwise mutual information): how much more often two words appear together than they would if they were independent, on a log scale, with negative values set to zero:

\[
\text{PMI}(a, b) = \ln \frac{P(a, b)}{P(a)\,P(b)}, \qquad \text{PPMI} = \max(\text{PMI}, 0)
\]

Each row of the PPMI matrix already describes a word by its contexts. To get short, dense vectors, compress it with the SVD, much as PCA did (but without centring the columns first): keep the first `d` singular directions. Before running, predict: which words will be the nearest neighbours of "cat"?

```python type
import numpy as np

rng = np.random.default_rng(0)
animals = ["cat", "dog", "fox", "horse", "cow"]
foods = ["bread", "apple", "cheese", "soup", "rice"]
people = ["chef", "baker", "farmer", "child"]
places = ["kitchen", "garden", "barn", "field"]
sentences = []
for _ in range(1500):
    kind = rng.integers(5)
    if kind == 0:
        sentences.append(f"the {rng.choice(animals)} runs in the {rng.choice(['garden', 'field', 'barn'])}")
    elif kind == 1:
        sentences.append(f"the {rng.choice(people)} eats the {rng.choice(foods)}")
    elif kind == 2:
        sentences.append(f"the {rng.choice(people)} cooks {rng.choice(foods)} in the kitchen")
    elif kind == 3:
        sentences.append(f"the {rng.choice(animals)} sleeps in the {rng.choice(places)}")
    else:
        sentences.append(str(rng.choice(["the child runs in the garden", "the dog eats the bread",
                                         "the farmer sleeps in the barn", "the horse eats the apple"])))
vocab = sorted(set(" ".join(sentences).split()))
index = {w: i for i, w in enumerate(vocab)}
V = len(vocab)

counts = np.zeros((V, V))
for sentence in sentences:
    ids = [index[w] for w in sentence.split()]
    for i, a in enumerate(ids):
        for j in range(max(0, i - 2), min(len(ids), i + 3)):
            if j != i:
                counts[a, ids[j]] += 1

total = counts.sum()
p_word = counts.sum(axis=1) / total
with np.errstate(divide="ignore"):
    pmi = np.log((counts / total) / np.outer(p_word, p_word))
ppmi = np.maximum(pmi, 0)
U, S, Vt = np.linalg.svd(ppmi)
embeddings = U[:, :6] * S[:6]

def neighbours(E, word, k=3):
    v = E[index[word]]
    sims = E @ v / (np.linalg.norm(E, axis=1) * np.linalg.norm(v))
    sims[index[word]] = -np.inf
    best = np.argsort(-sims)[:k]
    return [(vocab[i], round(float(sims[i]), 2)) for i in best]

for word in ["cat", "dog", "bread", "chef", "garden"]:
    print(f"{word:<7} nearest: {neighbours(embeddings, word)}")
```

```output
cat     nearest: [('fox', 1.0), ('cow', 1.0), ('horse', 0.91)]
dog     nearest: [('horse', 0.98), ('cow', 0.8), ('fox', 0.8)]
bread   nearest: [('apple', 0.96), ('rice', 0.87), ('cheese', 0.83)]
chef    nearest: [('baker', 0.99), ('child', 0.89), ('farmer', 0.87)]
garden  nearest: [('barn', 1.0), ('kitchen', 1.0), ('field', 1.0)]
```

`np.errstate(divide="ignore")` silences the warning for log(0) on pairs that never co-occur (their PMI becomes −∞, and the `maximum` turns it into 0). `U[:, :6] * S[:6]` keeps the six strongest directions, scaled by their singular values: a 6-number vector for each of the 24 words. Neighbours are ranked by cosine similarity, with the word itself excluded.

Without being told anything about categories, the vectors group the words: cat's nearest neighbours are fox, cow and horse; bread's are apple, rice and cheese; chef's are baker, then child and farmer; garden's are the other places. Notice "dog": its neighbours are still animals, but less closely (0.98, 0.80, 0.80, against 1.00 for cat's nearest), and it is not among cat's top three. Its contexts differ from the other animals' in small ways (it appears in "the dog eats the bread", for instance, though "the horse eats the apple" appears just as often), and with a corpus this small, such quirks are enough to move a word's vector noticeably; treat individual neighbours in a small corpus with caution. Embeddings reflect how words are **used**, not what they mean, which is both their power and, on real text, their danger: they absorb whatever associations, including biased ones, the text contains.

## Method 2: skip-gram with negative sampling

The second method learns embeddings by **prediction**. For each word in the text (the **centre** word), each nearby word (a **context** word) is a positive example: the model should give the pair a high score. For each positive pair, a few random words drawn from the vocabulary are **negative** examples: the model should give those pairs a low score. The score of a pair is the dot product of the centre word's embedding (from a matrix W) and the context word's vector (from a second matrix C), passed through a sigmoid: this is just logistic regression on pairs, with the embeddings as the weights.

\[
L = -\ln \sigma(w_{\text{centre}} \cdot c_{\text{context}}) - \sum_{\text{negatives}} \ln \sigma(-w_{\text{centre}} \cdot c_{\text{neg}})
\]

Words that share contexts get pushed towards the same context vectors, and so end up near each other. This is **word2vec** (2013), which made embeddings famous; trained on billions of words, its vectors even support analogies such as king − man + woman ≈ queen.

```python type
import numpy as np

rng = np.random.default_rng(0)
animals = ["cat", "dog", "fox", "horse", "cow"]
foods = ["bread", "apple", "cheese", "soup", "rice"]
people = ["chef", "baker", "farmer", "child"]
places = ["kitchen", "garden", "barn", "field"]
sentences = []
for _ in range(1500):
    kind = rng.integers(5)
    if kind == 0:
        sentences.append(f"the {rng.choice(animals)} runs in the {rng.choice(['garden', 'field', 'barn'])}")
    elif kind == 1:
        sentences.append(f"the {rng.choice(people)} eats the {rng.choice(foods)}")
    elif kind == 2:
        sentences.append(f"the {rng.choice(people)} cooks {rng.choice(foods)} in the kitchen")
    elif kind == 3:
        sentences.append(f"the {rng.choice(animals)} sleeps in the {rng.choice(places)}")
    else:
        sentences.append(str(rng.choice(["the child runs in the garden", "the dog eats the bread",
                                         "the farmer sleeps in the barn", "the horse eats the apple"])))
words = " ".join(sentences).split()
vocab = sorted(set(words))
index = {w: i for i, w in enumerate(vocab)}
V, d = len(vocab), 8

pairs = []
for sentence in sentences:
    ids = [index[w] for w in sentence.split()]
    for i, a in enumerate(ids):
        for j in range(max(0, i - 2), min(len(ids), i + 3)):
            if j != i:
                pairs.append((a, ids[j]))
pairs = np.array(pairs)
frequency = np.bincount([index[w] for w in words], minlength=V) ** 0.75
noise = frequency / frequency.sum()

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

W = rng.normal(0, 0.1, (V, d))
C = rng.normal(0, 0.1, (V, d))
for epoch in range(10):
    order = rng.permutation(len(pairs))
    for start in range(0, len(pairs), 256):
        batch = pairs[order[start:start + 256]]
        centre, context = batch[:, 0], batch[:, 1]
        negatives = rng.choice(V, (len(batch), 5), p=noise)
        w = W[centre]
        positive = sigmoid(np.sum(w * C[context], axis=1))
        negative = sigmoid(np.einsum("nd,nkd->nk", w, C[negatives]))
        d_pos = (positive - 1)[:, None]
        d_neg = negative[:, :, None]
        step = 5.0 / len(batch)
        np.add.at(W, centre, -step * (d_pos * C[context] + np.sum(d_neg * C[negatives], axis=1)))
        np.add.at(C, context, -step * d_pos * w)
        np.add.at(C, negatives.ravel(), -step * (d_neg * w[:, None, :]).reshape(-1, d))

def neighbours(E, word, k=3):
    v = E[index[word]]
    sims = E @ v / (np.linalg.norm(E, axis=1) * np.linalg.norm(v))
    sims[index[word]] = -np.inf
    best = np.argsort(-sims)[:k]
    return [(vocab[i], round(float(sims[i]), 2)) for i in best]

print(f"{len(pairs)} (centre, context) pairs")
for word in ["cat", "bread", "chef", "garden"]:
    print(f"{word:<7} nearest: {neighbours(W, word)}")
```

```output
26520 (centre, context) pairs
cat     nearest: [('fox', 0.99), ('cow', 0.99), ('horse', 0.88)]
bread   nearest: [('apple', 0.99), ('rice', 0.96), ('cheese', 0.94)]
chef    nearest: [('baker', 0.98), ('child', 0.74), ('farmer', 0.74)]
garden  nearest: [('field', 1.0), ('kitchen', 0.99), ('barn', 0.97)]
```

The gradients follow from the logistic regression lesson: for each positive pair, the gradient of −ln σ(s) with respect to the score s is σ(s) − 1 (`d_pos`); for each negative pair, the gradient of −ln σ(−s) is σ(s) (`d_neg`). Each is multiplied by the other vector of the pair. Negatives are drawn in proportion to word frequency to the power 0.75, the word2vec recipe, which samples rare words a little more often than their raw frequency would.

The updates use `np.add.at`, for a reason that matters for any embedding layer. A batch contains the same word many times ("the" especially), and each occurrence contributes its own gradient to the same row. `W[centre] -= ...` would apply only one of them per row, silently dropping the rest; `np.add.at` adds every contribution. The step is also divided by the batch size: frequent words collect hundreds of contributions per batch, and summing them at full strength makes training blow up.

After 10 passes, which take a couple of seconds, the skip-gram vectors give the same groupings as the counting method: animals with animals, foods with foods, places with places. That is no coincidence: it was later shown that skip-gram with negative sampling is implicitly factorising a shifted PMI matrix, so the two methods are close relatives.

## Embeddings inside networks

In practice, embeddings are rarely trained separately. An **embedding layer** is the first layer of a network: it turns ids into vectors, and the vectors are trained by backpropagation along with everything else, to whatever serves the task. The backward pass is the `np.add.at` pattern: the gradient for each looked-up vector is added into its row of E, and rows of items not in the batch get nothing.

This works for any categorical data, not just words. A model predicting purchases can embed each product and each customer; a tabular model can embed postcodes instead of one-hot encoding thousands of them, learning which postcodes behave alike. And the first layer of every large language model is a token embedding with tens of thousands of rows, trained along with the rest of the model. The next lesson begins building the rest: attention.

::: challenge Cosine neighbours [easy]
Write `cosine_similarity(a, b)` for two vectors, and `nearest(E, vocab, word, k)` returning a list of the `k` words (excluding `word` itself) whose rows of `E` have the highest cosine similarity to `word`'s row, most similar first. `vocab` is a list of words in row order.

```python starter
import numpy as np

def cosine_similarity(a, b):
    return 0.0

def nearest(E, vocab, word, k):
    return []

E = np.array([[1.0, 0.0], [0.9, 0.1], [0.0, 1.0], [-1.0, 0.0]])
vocab = ["cat", "kitten", "volcano", "anti-cat"]
print(nearest(E, vocab, "cat", 2))
```

```python solution
import numpy as np

def cosine_similarity(a, b):
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))

def nearest(E, vocab, word, k):
    i = vocab.index(word)
    sims = E @ E[i] / (np.linalg.norm(E, axis=1) * np.linalg.norm(E[i]))
    sims[i] = -np.inf
    return [vocab[j] for j in np.argsort(-sims)[:k]]

E = np.array([[1.0, 0.0], [0.9, 0.1], [0.0, 1.0], [-1.0, 0.0]])
vocab = ["cat", "kitten", "volcano", "anti-cat"]
print(nearest(E, vocab, "cat", 2))
```

```python test
import numpy as _np
assert "cosine_similarity" in dir() and "nearest" in dir(), "Keep both function names."
assert _np.isclose(cosine_similarity(_np.array([1.0, 0.0]), _np.array([0.0, 2.0])), 0.0), "Perpendicular vectors have cosine similarity 0."
assert _np.isclose(cosine_similarity(_np.array([1.0, 1.0]), _np.array([3.0, 3.0])), 1.0), "Vectors pointing the same way have similarity 1, whatever their lengths."
assert _np.isclose(cosine_similarity(_np.array([1.0, 2.0]), _np.array([-2.0, -4.0])), -1.0), "Opposite vectors have similarity −1."
_E = _np.array([[1.0, 0.0], [0.9, 0.1], [0.0, 1.0], [-1.0, 0.0], [10.0, 3.0]])
_v = ["cat", "kitten", "volcano", "anti-cat", "big-cat"]
assert nearest(_E, _v, "cat", 2) == ["kitten", "big-cat"], f"For cat the nearest two should be kitten then big-cat (direction matters, not length), but got {nearest(_E, _v, 'cat', 2)}. Use cosine similarity, not the dot product or the distance."
assert "cat" not in nearest(_E, _v, "cat", 4), "Leave the word itself out of its own neighbours."
assert nearest(_E, _v, "volcano", 1) == ["big-cat"], "nearest should work for any word: for volcano, big-cat (cosine 0.29) beats kitten (0.11)."
"SUCCESS: Similarity by direction, the standard way to compare embeddings."
```

Hint: For `nearest`, compute every row's cosine with the word's row in one expression (`E @ E[i]` divided by the product of norms), set the word's own entry to `-np.inf`, and take the first `k` of `np.argsort(-sims)`.
:::

::: challenge Training an embedding layer [medium]
Write `embedding_sgd_step(E, ids, d_vectors, lr)` that returns a **new** embedding matrix after one gradient descent step: the batch looked up the rows `E[ids]`, backpropagation delivered `d_vectors` (one gradient per looked-up row, shape `(len(ids), d)`), and every row must move by −lr times the **sum** of the gradients for all its occurrences in the batch; rows that do not appear stay as they are. Leave `E` itself unchanged.

Then write `lost_gradient(E_shape, ids, d_vectors)` returning how much gradient (the sum of all entries) a careless implementation would lose: one that builds the gradient matrix with `grad[ids] += d_vectors` instead of accumulating every occurrence.

```python starter
import numpy as np

def embedding_sgd_step(E, ids, d_vectors, lr):
    return E

def lost_gradient(E_shape, ids, d_vectors):
    return 0.0
```

```python solution
import numpy as np

def embedding_sgd_step(E, ids, d_vectors, lr):
    grad = np.zeros_like(E)
    np.add.at(grad, ids, d_vectors)
    return E - lr * grad

def lost_gradient(E_shape, ids, d_vectors):
    correct = np.zeros(E_shape)
    np.add.at(correct, ids, d_vectors)
    careless = np.zeros(E_shape)
    careless[ids] += d_vectors
    return float(correct.sum() - careless.sum())
```

```python test
import numpy as _np
assert "embedding_sgd_step" in dir() and "lost_gradient" in dir(), "Keep both function names."
_r = _np.random.default_rng(11)
_E = _r.normal(size=(9, 4))
_ids = _r.integers(0, 9, 60)
_d = _r.normal(size=(60, 4))
_before = _E.copy()
_new = embedding_sgd_step(_E, _ids, _d, 0.1)
_ref = _E.copy()
for _i, _g in zip(_ids, _d):
    _ref[_i] -= 0.1 * _g
assert _np.array_equal(_E, _before), "embedding_sgd_step changed E itself: return a new matrix."
assert _np.allclose(_new, _ref), "The updated matrix is wrong. Each row should move by −lr times the sum of the gradients for every occurrence of its id; repeated ids must not be dropped."
_unused = sorted(set(range(9)) - set(_ids.tolist()))
assert all(_np.array_equal(_new[u], _E[u]) for u in _unused), "Rows that do not appear in the batch should not change."
_ids2 = _np.array([2, 2, 2, 0, 5, 5])
_d2 = _r.normal(size=(6, 3))
_c = _np.zeros((7, 3)); _np.add.at(_c, _ids2, _d2)
_k = _np.zeros((7, 3)); _k[_ids2] += _d2
assert _np.isclose(lost_gradient((7, 3), _ids2, _d2), _c.sum() - _k.sum()), "lost_gradient should compare the full sum of gradients with what grad[ids] += d_vectors keeps."
assert _np.isclose(lost_gradient((7, 3), _np.array([0, 1, 2]), _d2[:3]), 0.0), "With no repeated ids, nothing is lost."
"SUCCESS: Every occurrence of a word contributes to its row. The careless version keeps only one per batch, so frequent words, the ones repeated most, would barely learn."
```

Hint: Accumulate the gradient matrix with `np.add.at`, which adds every row of `d_vectors` into its id's row, repeats included. For `lost_gradient`, build the gradient both ways and compare their sums.
:::

::: challenge PPMI by hand [medium]
Write `ppmi(counts)` that turns a co-occurrence count matrix into a PPMI matrix: with P(a, b) = counts / total and P(a) = row sums / total (the matrix is symmetric, so row and column sums are equal), PMI = ln(P(a, b) / (P(a) P(b))), and PPMI = max(PMI, 0), with pairs that never co-occur (count 0) giving 0. Real vocabularies contain words that never co-occur with anything in a given window (a whole row of zeros); those must give a row of zeros too. Make sure no warning is printed and no `nan` or `inf` remains.

Then apply it to the starter's tiny count matrix and store the result in `table`.

```python starter
import numpy as np

def ppmi(counts):
    return counts

counts = np.array([[0.0, 4.0, 1.0],
                   [4.0, 0.0, 0.0],
                   [1.0, 0.0, 2.0]])
table = ppmi(counts)
print(table.round(3))
```

```python solution
import numpy as np

def ppmi(counts):
    total = counts.sum()
    p = counts.sum(axis=1) / total
    expected = np.outer(p, p)
    result = np.zeros_like(counts, dtype=float)
    seen = counts > 0
    result[seen] = np.maximum(np.log((counts[seen] / total) / expected[seen]), 0)
    return result

counts = np.array([[0.0, 4.0, 1.0],
                   [4.0, 0.0, 0.0],
                   [1.0, 0.0, 2.0]])
table = ppmi(counts)
print(table.round(3))
```

```python test
import numpy as _np
import warnings as _w
assert "ppmi" in dir(), "Keep the function's name as ppmi."
_c = _np.array([[0.0, 4.0, 1.0], [4.0, 0.0, 0.0], [1.0, 0.0, 2.0]])
with _w.catch_warnings():
    _w.simplefilter("error")
    _t = ppmi(_c)
assert _np.isfinite(_t).all(), "No nan or inf should remain: give zero-count pairs a PPMI of 0."
_z = _np.array([[0.0, 3.0, 0.0], [3.0, 1.0, 0.0], [0.0, 0.0, 0.0]])
with _w.catch_warnings():
    _w.simplefilter("error")
    _tz = ppmi(_z)
assert _np.isfinite(_tz).all() and (_tz[2] == 0).all() and (_tz[:, 2] == 0).all(), "A word that never co-occurs (an all-zero row and column) should get PPMI 0 everywhere, not nan."
_total = 12.0
_p = _c.sum(axis=1) / _total
assert _np.isclose(_t[0, 1], max(_np.log((4 / 12) / (_p[0] * _p[1])), 0)), "PPMI(0, 1) is wrong: ln(P(a, b) / (P(a) P(b))), with P from counts divided by the grand total."
assert _t[1, 2] == 0 and _t[0, 0] == 0, "Pairs with count 0 should get 0."
assert (_t >= 0).all(), "PPMI is never negative: replace negative PMI with 0."
_r = _np.random.default_rng(1)
_m = _r.integers(0, 5, (6, 6)).astype(float)
_m = _m + _m.T
with _np.errstate(divide="ignore"):
    _ref = _np.maximum(_np.log((_m / _m.sum()) / _np.outer(_m.sum(1) / _m.sum(), _m.sum(1) / _m.sum())), 0)
_ref[_m == 0] = 0
assert _np.allclose(ppmi(_m), _ref), "Wrong on a random symmetric count matrix."
assert _np.allclose(table, _t), "table should be ppmi(counts) for the starter's matrix."
"SUCCESS: Counts turned into 'how much more often than chance', the raw material that the SVD compresses into embeddings."
```

Hint: Compute PMI only where `counts > 0` (boolean indexing), and leave the other entries at 0; that avoids taking the log of zero altogether.
:::

## What you learned

- One-hot vectors make every pair of items equally distant; an embedding maps each item to a short learned vector. An embedding layer is a lookup table, equivalent to a dense layer on one-hot inputs.
- Compare embeddings with cosine similarity: direction, not length.
- Words used in similar contexts get similar vectors (the distributional hypothesis). Counting co-occurrences, converting to PPMI and compressing with the SVD grouped the corpus's animals, foods, people and places.
- Skip-gram with negative sampling (word2vec) trains embeddings by logistic regression on (centre, context) pairs against random negative words; it is closely related to factorising PMI.
- In a network, the embedding layer's gradient for repeated ids must be summed (`np.add.at`); a plain `+=` on fancy-indexed rows silently drops repeats.
- Embeddings work for any categories (products, users, postcodes) and are the first layer of every language model; they also absorb the associations in their training data.

Embeddings give each word a vector, but a word's meaning depends on its context: "bank" by a river is not "bank" on a high street. The next lesson builds **attention**, which lets each word's vector be updated by looking at the other words around it.
