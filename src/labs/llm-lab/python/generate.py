"""Part 2: generating text. Choosing each token (greedy, temperature, top-k), generating with
the KV cache, a check that the cache changes no number, and what each way of generating costs."""
import time
from gpt import Rng, exp, total, argmax, init_model, next_logits, greedy, new_cache, forward_cached
from arith import VOCAB, NEWLINE, QUESTIONS, encode, decode
from pretrain import pretrain


def sample(logits, temperature, top_k, rng):
    """Choose one token from the scores. Temperature 0 means greedy. Otherwise divide every score
    by the temperature, keep the top_k highest (all of them if top_k is None), turn those into
    probabilities with softmax and draw one."""
    if temperature == 0:
        return argmax(logits)
    order = sorted(range(len(logits)), key=lambda j: -logits[j])[:top_k]
    scaled = [logits[j] / temperature for j in order]
    exps = [exp(s - scaled[0]) for s in scaled]
    r = rng.random() * total(exps)
    for j, e in zip(order, exps):
        r -= e
        if r < 0:
            return j
    return order[-1]


def spread(seed):
    """Scramble a seed. Neighbouring seeds start an Rng in almost the same place (Rng(0)'s first
    number is 0.2361 and Rng(1)'s is 0.2365), so samples made with seeds 0, 1, 2, ... would all
    draw their first token from nearly the same spot. Multiplying by a large odd number and
    folding the high bits down, twice, sends neighbouring seeds far apart."""
    h = seed * 2654435761 % 2**32
    h ^= h >> 16
    h = h * 2246822507 % 2**32
    h ^= h >> 13
    return h


def generate(model, ids, stop, limit, temperature=0, top_k=None, seed=0):
    """Write up to `limit` tokens after `ids`, using the KV cache: every token costs one position's
    work. Stops at the token `stop`, or when all of the model's positions are used. Returns the
    new tokens (without `stop`)."""
    rng = Rng(spread(seed))
    cache = new_cache()
    for t in ids[:-1]:
        forward_cached(model, cache, t)
    t, out = ids[-1], []
    for _ in range(limit):
        if len(cache["k"]) == len(model["pos"]):
            break
        t = sample(forward_cached(model, cache, t), temperature, top_k, rng)
        if t == stop:
            break
        out.append(t)
    return out


def cache_matches(model, ids):
    """Feed `ids` one token at a time through the cache, and compare each position's scores with
    a full forward pass over everything up to it. True only if every number is identical."""
    cache = new_cache()
    for n, t in enumerate(ids):
        if forward_cached(model, cache, t) != next_logits(model, ids[:n + 1]):
            return False
    return True


def forward_cost(n, dim=16, hidden=64, vocab=17):
    """Multiplications in one full forward pass over n positions. A matrix product of an (a x b)
    and a (b x c) table does a * b * c of them."""
    qkv = 3 * n * dim * dim
    attention = n * n * dim + n * n * dim
    mix = n * dim * dim
    mlp = n * dim * hidden + n * hidden * dim
    out = n * dim * vocab
    return qkv + attention + mix + mlp + out


def cached_cost(p, dim=16, hidden=64, vocab=17):
    """Multiplications in one forward_cached call for the token at position p: one position's
    work, plus its query against the p + 1 keys and its weights over the p + 1 values."""
    return 4 * dim * dim + 2 * (p + 1) * dim + 2 * dim * hidden + dim * vocab


def generation_cost(prompt, new, dim=16, hidden=64, vocab=17):
    """Multiplications to write `new` tokens after a prompt of `prompt` tokens: without the cache
    (a full forward pass over everything so far, for every new token) and with it."""
    without = sum(forward_cost(n, dim, hidden, vocab) for n in range(prompt, prompt + new))
    with_cache = sum(cached_cost(p, dim, hidden, vocab) for p in range(prompt + new - 1))
    return without, with_cache


def time_both(length=64, seed=1):
    """Time writing `length - 1` tokens after one, greedily, without the cache and with it, on a
    random model with room for `length` positions. (Speed doesn't depend on what the weights
    are, so an untrained model measures it.) Prints and returns both times in seconds."""
    model = init_model(len(VOCAB), context=length, seed=seed)
    start = time.perf_counter()
    slow = greedy(model, [0], -1, length - 1)
    middle = time.perf_counter()
    fast = generate(model, [0], -1, length - 1)
    end = time.perf_counter()
    print("same tokens:", slow == fast)
    print("without the cache:", round(middle - start, 3), "s")
    print("with the cache:   ", round(end - middle, 3), "s")
    print("speed-up:", round((middle - start) / (end - middle), 1), "times")
    return middle - start, end - middle


def show_samples(steps=300, temperature=1.0, top_k=None):
    """Pretrain briefly, then answer 3+5 ten times with these settings (seeds 0 to 9)."""
    model, _ = pretrain(steps)
    for seed in range(10):
        print(decode(generate(model, encode("3+5="), NEWLINE, 3, temperature, top_k, seed)))


def check_cache(steps=300):
    """Pretrain briefly, then check the cache two ways: identical scores at every position of a
    notebook line and the next question, and the same greedy answer to all 100 questions."""
    model, _ = pretrain(steps)
    print("identical scores:", cache_matches(model, encode("3+5=8\n1+1=")))
    prompts = [encode(f"{a}+{b}=") for a, b in QUESTIONS]
    print("same 100 answers:", all(generate(model, q, NEWLINE, 3) == greedy(model, q, NEWLINE, 3) for q in prompts))
