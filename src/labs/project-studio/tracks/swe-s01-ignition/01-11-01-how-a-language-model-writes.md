---
title: "How a Language Model Writes: Tokens, Prediction and Fluent Mistakes"
runtime: python
---

Ask an AI assistant for a function and it writes one, fluently, often correctly, sometimes calling a library function that doesn't exist, with the same confidence either way. Module 1.7 met this as a sourcing problem: an assistant's answer is a lead, not a primary source. This module explains *why*, from the mechanics. A language model does one thing, over and over: given the text so far, it produces the chances of each possible next piece of text, picks one, adds it, and repeats. Everything else follows from that loop: what it can see, what it knows, why its output varies, and why it can be fluently wrong. Real models are enormous, but the loop is small enough to build. This lesson builds a toy one in Kit, trained on a single text every Python has, and uses it to see each part of the loop for real.

**By the end you can:**

- Explain what a token is, how a tokenizer is learned (byte-pair encoding), and what it does to text and code.
- Describe next-token prediction and sampling, and what temperature changes.
- Explain the context window, and what attention does, at a high level.
- Tell training from inference, say what a knowledge cutoff is, and explain why a model produces fluent text that is false.

**You need:** 01-01-01 (bytes and UTF-8), 01-01-02 (determinism), 01-09-03 (seeds). Commands run inside `kit`. The files go in a new folder, `kit/lm`.

## A text every Python has

A model needs text to learn from. Python ships one: `import this` prints "The Zen of Python", nineteen lines of design advice that have been the same in every Python 3. Try it:

```
.venv/bin/python -c "import this"
```

(On Windows, `.venv/Scripts/python`.) It prints the Zen, starting `The Zen of Python, by Tim Peters` and `Beautiful is better than ugly.` The text is short (856 characters), so everything the toy model does can be checked by eye. That's why it's here. Real models learn from a large fraction of the text that has ever been published.

## Tokens

A model doesn't read letters or words. It reads **tokens**: pieces of text from a fixed vocabulary, each replaced by a number. The vocabulary is learned from text. The common method is **byte-pair encoding** (BPE), brought to language models by Sennrich, Haddow and Birch's paper "Neural Machine Translation of Rare Words with Subword Units" (2015, revised 2016), whose abstract describes "a segmentation based on the byte pair encoding compression algorithm". Start with every byte as a token (01-01-01), find the pair of neighbouring tokens that occurs most often, merge it into one new token, and repeat. Create `lm/tokens.py`:

```python file=kit/lm/tokens.py
import codecs
import contextlib
import io
import itertools
import sys

# The Zen of Python: the text "import this" prints, the same in every Python 3.
# Importing the module prints it, so catch that output; the module keeps the
# text in ROT13, a simple letter code, which codecs decodes.
with contextlib.redirect_stdout(io.StringIO()):
    import this
ZEN = codecs.decode(this.s, "rot13")


# Byte-pair encoding: start with every byte as a token, then repeatedly find
# the pair of neighbouring tokens that occurs most often, and make it one
# new token. Returns the merges learned, most frequent first.
def train(text, merges):
    tokens = [bytes([b]) for b in text.encode("utf-8")]
    learned = []
    for _ in range(merges):
        counts = {}
        for pair in itertools.pairwise(tokens):
            counts[pair] = counts.get(pair, 0) + 1
        # The most frequent pair; on a tie, the one that sorts first, so
        # that every run learns the same merges.
        best = min(counts, key=lambda pair: (-counts[pair], pair))
        learned.append(best)
        tokens = merge(tokens, best)
    return learned


# Replace every occurrence of the pair in tokens with the two joined.
def merge(tokens, pair):
    result = []
    i = 0
    while i < len(tokens):
        if i + 1 < len(tokens) and (tokens[i], tokens[i + 1]) == pair:
            result.append(tokens[i] + tokens[i + 1])
            i += 2
        else:
            result.append(tokens[i])
            i += 1
    return result


# Split text into tokens with the learned merges, applied in the order learned.
def encode(text, learned):
    tokens = [bytes([b]) for b in text.encode("utf-8")]
    for pair in learned:
        tokens = merge(tokens, pair)
    return tokens


if __name__ == "__main__":
    learned = train(ZEN, 60)
    print("first merges:", [(a + b).decode() for a, b in learned[:8]])
    for text in sys.argv[1:]:
        tokens = encode(text, learned)
        print(len(tokens), "tokens:", [t.decode("utf-8", "replace") for t in tokens])
```

`ZEN` is the training text. Importing `this` prints the Zen (that's how `import this` works), so the import happens with standard output redirected into nowhere. `train` learns merges, `merge` applies one, and `encode` splits new text with what was learned. Save it, and tokenize a few things:

```
.venv/bin/python lm/tokens.py "Explicit is better than implicit." strawberry "def main():"
```

```
first merges: [' t', 's ', ' i', '.\n', ' th', 'er', 'e ', 'le']
11 tokens: ['E', 'xp', 'lic', 'it', ' is better tha', 'n', ' i', 'mp', 'lic', 'it', '.']
9 tokens: ['s', 't', 'r', 'a', 'w', 'b', 'er', 'r', 'y']
10 tokens: ['d', 'e', 'f', ' ', 'm', 'a', 'in', '(', ')', ':']
```

Read what 60 merges learned. `' is better tha'` is one token, because the Zen says "is better than" eight times. `strawberry` isn't in the Zen, so it stays almost letter by letter. Python code is mostly unfamiliar text here, so it splits into small pieces. A real tokenizer is learned the same way from vastly more text, including a great deal of code, with tens of thousands of merges or more. So common words and common code are a token or two, and rare words, names, and unusual spellings break into several.

That has consequences you'll meet. A model sees `strawberry` as a few tokens, not as letters, which is why questions like "how many r's?" can trip it: it never saw the letters one by one. Limits and prices are counted in tokens, not characters or words. And text unlike its training data (rare languages, unusual identifiers, long numbers) takes more tokens to say the same thing.

```check
run "cd kit; .venv/Scripts/python lm/tokens.py strawberry" stdout="9 tokens: ['s', 't', 'r', 'a', 'w', 'b', 'er', 'r', 'y']" -- lm/tokens.py should learn 60 merges from the Zen and split strawberry into 9 tokens.
run "cd kit; .venv/Scripts/python lm/tokens.py \"Explicit is better than implicit.\"" stdout="' is better tha'" -- A phrase the Zen repeats becomes one token.
```

## Predicting the next word

Now the loop itself. To keep the output readable, this toy predicts whole words, not tokens; the idea is the same. **Training** is learning, from text, what tends to come next. Here it's just counting which word follows which. **Inference** is using what was learned to produce new text, without learning any more. Create `lm/predict.py`:

```python file=kit/lm/predict.py
import itertools
import random
import sys

from tokens import ZEN

# The words of the Zen, in order: the training text.
WORDS = ZEN.split()


# Training: count, for each word, which words follow it, and how often.
def train(words):
    follows = {}
    for word, after in itertools.pairwise(words):
        counts = follows.setdefault(word, {})
        counts[after] = counts.get(after, 0) + 1
    return follows


# The chances of each next word after word, at a temperature: 1 keeps the
# counts' proportions; below 1 sharpens them toward the most common word;
# above 1 flattens them toward all being equal.
def chances(follows, word, temperature):
    counts = follows[word]
    weights = {after: count ** (1 / temperature) for after, count in counts.items()}
    total = sum(weights.values())
    return {after: weight / total for after, weight in weights.items()}


# Inference: start from a word and keep choosing a next word. Temperature 0
# means always the most likely word (ties: the first alphabetically).
def generate(follows, start, length, temperature, rng):
    words = [start]
    while len(words) < length and words[-1] in follows:
        if temperature == 0:
            counts = follows[words[-1]]
            words.append(min(counts, key=lambda after: (-counts[after], after)))
        else:
            options = chances(follows, words[-1], temperature)
            words.append(rng.choices(list(options), weights=list(options.values()))[0])
    return " ".join(words)


if __name__ == "__main__":
    follows = train(WORDS)
    temperature = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    rng = random.Random(seed)
    print(generate(follows, "Beautiful", 14, temperature, rng))
```

Save it, and look at what training learned about one word:

```
.venv/bin/python -c "import sys; sys.path.insert(0, 'lm'); from predict import train, WORDS; print(train(WORDS)['is'])"
```

```
{'better': 7, 'often': 1, 'hard': 1, 'easy': 1}
```

After "is", the Zen has "better" seven times, and "often", "hard" and "easy" once each. Those counts are the whole model. A real model's are billions of numbers (its **parameters**) in a neural network that computes the chances from the entire text so far, not just the last word. They're set by training on enormous amounts of text, then fixed. The loop that uses them is this one.

Run it at temperature 0, which always picks the most likely next word:

```
.venv/bin/python lm/predict.py 0
```

```
Beautiful is better than *right* now. If the implementation is better than *right* now.
```

Run it twice: the same text, every time. Picking the most likely word is deterministic (01-01-02), and it loops. After "is" the answer is always "better", so the same path comes round again. Repetition at low temperature is a real failure of real models too.

```check
run "cd kit; .venv/Scripts/python lm/predict.py 0" stdout="Beautiful is better than *right* now. If the implementation is better than *right* now." -- At temperature 0, the model always picks the most likely word.
```

## Sampling and temperature

Instead of always taking the most likely word, a model can **sample**: choose at random, in proportion to the chances. The **temperature** reshapes the chances first. `chances` raises each count to the power 1 / temperature and scales the results to add up to 1:

```
.venv/bin/python -c "import sys; sys.path.insert(0, 'lm'); from predict import chances, train, WORDS; f = train(WORDS); [print(t, {k: round(v, 2) for k, v in chances(f, 'is', t).items()}) for t in (0.5, 1, 2)]"
```

```
0.5 {'better': 0.94, 'often': 0.02, 'hard': 0.02, 'easy': 0.02}
1 {'better': 0.7, 'often': 0.1, 'hard': 0.1, 'easy': 0.1}
2 {'better': 0.47, 'often': 0.18, 'hard': 0.18, 'easy': 0.18}
```

At 1, the chances are the counts' proportions (7 of 10). Lower sharpens them toward the favourite, and higher flattens them toward all equal: more variety, and more unlikely choices. Sampling uses a random number generator, and with a fixed **seed** (01-09-03) the same choices come out every run:

```
.venv/bin/python lm/predict.py 1 1
.venv/bin/python lm/predict.py 1 2
```

```
Beautiful is hard to guess. There should be a bad idea. Namespaces are one
Beautiful is easy to break the implementation is better than nested. Sparse is better
```

Run either line again and you get the same text. Change the seed and you get a different text. The assistants you use sample, usually at a temperature above 0, and usually without a fixed seed you can set. That's why the same question can get different answers on two tries. It's **non-determinism by design**, and the reason one answer is a sample, not a measurement.

```predict
question: At temperature 2, what happens to the chance of the word that came first at temperature 0?
choice: It goes up
choice: It goes down, and the rare words become likelier
choice: It stays the same
answer: It goes down, and the rare words become likelier
explain: A temperature above 1 flattens the chances: 'better' falls from 0.7 to 0.47 and each rare word rises from 0.1 to 0.18. High temperature trades reliability for variety; that's why code is usually generated at low temperature.
```

```check
run "cd kit; .venv/Scripts/python lm/predict.py 1 1" stdout="Beautiful is hard to guess. There should be a bad idea. Namespaces are one" -- With seed 1, sampling at temperature 1 gives the same text every run.
run "cd kit; .venv/Scripts/python -c \"import subprocess, sys; run = lambda seed: subprocess.run([sys.executable, 'lm/predict.py', '1', seed], capture_output=True, text=True).stdout; print(run('1') == run('1'), run('1') == run('2'))\"" stdout="True False" -- The same seed gives the same text; a different seed, a different one.
```

## What the model can see

The toy model sees exactly one word, the last one. Everything before it is invisible, which is why its sentences drift: each word fits the one before, and the whole doesn't fit together. A real model sees much more: its **context window**, a limit on how many tokens it can take in at once, counting both what you give it and what it writes. Today's windows hold many thousands of tokens, enough for long documents and many source files. But a window is still a limit. Text that doesn't fit isn't seen at all, and a conversation that grows past it loses its beginning.

Inside the window, a real model doesn't weigh everything equally. **Attention**, the mechanism at the heart of the Transformer (Vaswani and others, "Attention Is All You Need", 2017), lets each position draw on every earlier position, with learned weights that say how relevant each one is to predicting what comes next. That's how a model connects a variable's use to its definition fifty lines up. It's also why what's *in* the context matters so much. The model's next tokens are a continuation of exactly that text. An example right next to where it's writing (an existing function in the same file, a test beside the code) pulls the continuation toward its style and its mistakes, often more than a rule stated somewhere else in a document. If you want code written a certain way, the strongest signal you can give is nearby code that already does it.

## Training, inference, and what a model knows

The toy model was trained once, when `train` counted. Using it never changes the counts. A real model is the same: trained once, at great cost, then used many times (inference) with its parameters fixed. Two things follow.

- **A knowledge cutoff.** Everything a model knows comes from its training data, which was collected up to some date. Libraries released, functions renamed, and events that happened after it are unknown to it, unless they're put into its context (01-11-03, retrieval). It may not know where its knowledge ends, and will happily describe an old version of an API as current (01-07-01's version matching applies to models too).
- **No learning from you.** Correcting a model in a conversation changes its *context*, not its parameters. Start a new conversation and the correction is gone (01-11-02).

Ask the toy model about a word that isn't in its training text:

```
.venv/bin/python -c "import sys; sys.path.insert(0, 'lm'); from predict import train, WORDS; print(train(WORDS).get('Rust'))"
```

It prints `None`: nothing was ever learned about "Rust". A real model rarely stops so honestly. Given something unfamiliar, it continues with whatever is likeliest, which brings us to the last part.

## Fluent and false

Look again at seed 1's output: "Beautiful is hard to guess. There should be a bad idea." It reads like the Zen. Every pair of neighbouring words in it does occur in the Zen. Check whether the sentence itself does:

```
.venv/bin/python -c "import sys; sys.path.insert(0, 'lm'); from predict import WORDS; print('Beautiful is hard to guess' in ' '.join(WORDS))"
```

It prints `False`. The Zen never says beauty is hard to guess, or that there should be a bad idea. The model wasn't trying to say anything true. It was choosing likely next words, and every choice was locally plausible. That's a **hallucination**, a word that suggests something rare and strange. It's neither: it's the model working exactly as designed, on a question where the likeliest continuation and the true one differ.

For a real model, the same thing happens wherever the training text is thin or misleading: an obscure library, a function that *ought* to exist because similar libraries have it, a version detail, a citation. The output is shaped like a right answer, because the model has seen thousands of right answers shaped like that. Nothing in the loop checks it against the world. That check is your job, and modules 1.7 to 1.10 are how: the primary source, the test that could fail, the experiment.

**What else, and why not.**

| A model as … | What it's good for | Where it fails |
|---|---|---|
| A search engine | Finding the shape of an answer fast | It has no index of truth; it continues text |
| A database of facts | Common, often-repeated knowledge | Rare or recent facts, versions, numbers, citations |
| A pair programmer | Drafting code in the style of the code around it | Inventing APIs; copying the nearby example's mistakes |
| A deterministic tool | (Only at temperature 0, with everything else fixed) | Usually sampled: two runs, two answers |

## Your turn: how much does it copy?

With more context, a model's next word depends on more of the text before it. Does that make it more original, or less? Write `lm/copying.py` to measure it. Train two versions of the toy model, one that predicts from the last **one** word and one from the last **two**. Generate 200 texts of 8 words from each (seeds 0 to 199, temperature 1, starting from the Zen's first word or two). Print, for each, the percentage of texts that appear word for word in the Zen, as:

```
1 word(s) of context: N % copied from the Zen
2 word(s) of context: N % copied from the Zen
```

Then explain the result in a sentence or two: what does it say about a model trained on little text?

```hints
nudge: A model with two words of context has to count what follows each pair of words. Use a tuple of the last two words as the dictionary key.
concept: Generalise train to take a context length: for each position i, the key is tuple(words[i:i + context]) and the value counts words[i + context]. Generate from the first context words of the Zen. A text "appears word for word" if it's a substring of " ".join(WORDS).
shape: train(words, context) -> follows; generate(follows, context, length, rng) keeps choosing rng.choices(list(counts), weights=list(counts.values()))[0] while tuple(words[-context:]) is a key; copied(context) generates 200 texts with random.Random(seed) for seed in range(200) and returns the fraction found in the text.
answer: lm/copying.py:
~~~python
import itertools
import random

from predict import WORDS

TEXT = " ".join(WORDS)


# Count what follows each run of `context` words in the training text.
def train(words, context):
    follows = {}
    for i in range(len(words) - context):
        key = tuple(words[i : i + context])
        counts = follows.setdefault(key, {})
        counts[words[i + context]] = counts.get(words[i + context], 0) + 1
    return follows


# Generate up to `length` words from the first `context` words of the text,
# choosing each next word in proportion to how often it followed.
def generate(follows, context, length, rng):
    words = list(WORDS[:context])
    while len(words) < length and tuple(words[-context:]) in follows:
        counts = follows[tuple(words[-context:])]
        words.append(rng.choices(list(counts), weights=list(counts.values()))[0])
    return " ".join(words)


# How often a model's 8-word texts appear word for word in the training text.
def copied(context):
    follows = train(WORDS, context)
    texts = [generate(follows, context, 8, random.Random(seed)) for seed in range(200)]
    return sum(text in TEXT for text in texts) / len(texts)


if __name__ == "__main__":
    for context in (1, 2):
        print(context, "word(s) of context:", round(100 * copied(context)), "% copied from the Zen")
    print("pairs of words in the Zen:", len(set(itertools.pairwise(WORDS))))
~~~
It prints 32% for one word of context and 100% for two, then "pairs of words in the Zen: 126". With two words of context, every pair of words in so short a text is followed by only one word, so the model can only recite the Zen. With one word it can wander, and two-thirds of its texts are new (and, like "Beautiful is hard to guess", mostly false). A model that's large next to its training text memorises it. Real models are trained on so much text that they mostly generalise, and they still sometimes reproduce passages, especially ones that appear many times.
```

```check
run "cd kit; .venv/Scripts/python lm/copying.py" stdout="1 word(s) of context: 32 % copied from the Zen" -- With one word of context, about a third of the texts are copied.
run "cd kit; .venv/Scripts/python lm/copying.py" stdout="2 word(s) of context: 100 % copied from the Zen" -- With two words of context, the model only recites the Zen.
run "cd kit; .venv/Scripts/ruff check lm" stdout="All checks passed!" -- The lm files should pass Ruff.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); r = git('status', '--porcelain'); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout, git('cat-file', '-e', 'HEAD:lm/copying.py').returncode == 0)\"" stdout="clean True" -- Commit the lm folder.
```

**What these checks establish, and what they don't.** They check that your tokenizer, predictor and copying measurement give the outputs worked out here: the merges, the token splits, the deterministic and seeded texts, the copying rates. They can't check that the toy's lessons carry over to real models, and some don't. A real model computes its chances with a neural network over the whole context, not from counts after one word. Its tokenizer has vastly more merges, and it was trained on far more text. What carries over is the loop, which is the same: chances for the next token, a sample, repeat. So are the consequences this lesson drew from it: tokens rather than letters, sampling and seeds, a limited window, knowledge fixed at training, and fluency that is not truth. Treat any specific number you read about a real model (its window, its cutoff, its price) as a claim to check against the provider's own documentation, at the version you use.

## What you can do now

- A model reads **tokens**, pieces of text from a vocabulary learned by **byte-pair encoding**: common text is few tokens, rare text many.
- It writes by **next-token prediction**: chances for each next token, one chosen, appended, repeated. **Temperature** sharpens or flattens the chances; **sampling** makes output vary unless the seed is fixed.
- It sees only its **context window**, and within it, **attention** weighs what's relevant. Nearby examples steer the continuation strongly.
- **Training** fixes what it knows; **inference** uses it. Knowledge ends at a **cutoff**, and corrections live only in the context.
- **Hallucination** is fluent continuation where the likely and the true differ. Nothing in the loop checks truth, so you do.

```predict
question: An assistant suggests calling requests.get_json(url), which looks right but doesn't exist in the requests library. Using this lesson, explain how a model produces a call like that, and how you'd catch it.
explain: The model continues with likely tokens: get_ and json both appear constantly near requests, and many libraries have a function shaped like get_json, so the name is a plausible continuation even though requests spells it requests.get(url).json(). Nothing in the loop checks the library. Catch it the way modules 1.7 to 1.9 taught: look the function up in the library's reference for your installed version (01-07-01), or run it: a test or a one-line experiment raises AttributeError at once.
```

**Next:** 01-11-02 is about where models fail when you instruct them: why instructions are followed imperfectly, what happens over long contexts, the difference between system and user prompts, prompt injection, and why a model remembers nothing between conversations unless it's given its memory.
