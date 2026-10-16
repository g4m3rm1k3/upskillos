"""The lab's world: single-digit addition. Its vocabulary, the notebook of sums a base model is
pretrained on, and the exact-match test over all 100 questions."""
from gpt import Rng, greedy

# Every token the model knows. The three special tokens are reserved from the start, like the
# spare tokens of a real model's vocabulary; pretraining never uses them (Part 3 does).
VOCAB = ["\n", "+", "=", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "?", "<user>", "<bot>", "<end>"]
INDEX = {t: k for k, t in enumerate(VOCAB)}
NEWLINE = INDEX["\n"]

QUESTIONS = [(a, b) for a in range(10) for b in range(10)]


def encode(text):
    """Characters to token ids. (The special tokens are added as ids, not spelled out.)"""
    return [INDEX[c] for c in text]


def decode(ids):
    """Token ids back to text."""
    return "".join(VOCAB[t] for t in ids)


def notebook(lines=400, seed=0):
    """The pretraining text: `lines` sums written one per line, such as "3+5=8", with the two
    numbers drawn at random."""
    rng = Rng(seed)
    out = []
    for _ in range(lines):
        a, b = QUESTIONS[rng.below(len(QUESTIONS))]
        out.append(f"{a}+{b}={a + b}\n")
    return "".join(out)


def complete(model, a, b):
    """What a base model writes after "a+b=": greedy, up to the end of the line."""
    return decode(greedy(model, encode(f"{a}+{b}="), NEWLINE, 3))


def exact_match(model):
    """How many of the 100 questions the base model completes with exactly the right answer."""
    return sum(complete(model, a, b) == str(a + b) for a, b in QUESTIONS)
