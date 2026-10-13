"""Part 6 of NLP Studio: from a language model to a chatbot. Conversations written as tokens with
special tokens, dialogues generated from templates, a loss on the bot's words only, and replies
that stop at the end of the bot's turn. Uses the tiny GPT of tinygpt.py, on word tokens.
"""
import math

import tinygpt as tg
from text_basics import tokenize
from vectors import Rng

USER, BOT, END, UNKNOWN = "«", "»", "¶", "<unk>"   # special tokens: never typed in a message

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
HOURS = {"saturday": "nine to five", "sunday": "ten to four"}   # every other day: nine to six
PARTS = ["chain", "tyre", "brake", "wheel", "pedal", "saddle"]
PROBLEMS = ["broken", "flat", "bent", "loose", "stuck", "squeaky"]
THINGS = ["pizza", "shoes", "books", "phones", "coffee", "tickets"]

TEMPLATES = [
    ("hours", ["when are you open on {day}", "are you open on {day}", "what are your hours on {day}", "is the shop open on {day}"],
     "on {day} we are open {hours}."),
    ("repair", ["my {part} is {problem}", "the {part} on my bike is {problem}", "can you fix a {problem} {part}"],
     "bring the bike in and we will fix the {part}."),
    ("order", ["where is order {number}", "has order {number} shipped", "track order {number}"],
     "order {number} ships tomorrow."),
    ("other", ["do you sell {thing}", "can i buy {thing} here"],
     "sorry, i can only help with bikes."),
    ("greeting", ["hello", "hi", "good morning", "hey there"], "hello! how can i help?"),
    ("thanks", ["thanks", "thank you", "cheers"], "you're welcome."),
    ("goodbye", ["bye", "goodbye", "see you"], "goodbye, happy riding."),
]

# Pairs that never appear in training: the honest test of whether the bot generalises.
HELD_OUT = {("wheel", "bent"), ("pedal", "loose"), ("chain", "squeaky"), ("tyre", "stuck")}


def fill(template, slots):
    """Put each slot's value into its {name} in the template."""
    out = template
    for name, value in slots.items():
        out = out.replace("{" + name + "}", value)
    return out


def is_number(token):
    """True for a run of the digits 0-9 only."""
    return token != "" and all(c in "0123456789" for c in token)


def chat_tokens(text):
    """Word tokens for chat: Part 1's tokenizer, lower case, and every number split into single
    digits, so the bot can write any number with only ten digit tokens."""
    out = []
    for t in tokenize(text.lower()):
        if is_number(t):
            out.extend(t)
        else:
            out.append(t)
    return out


def detokenize(tokens):
    """Tokens back to text: a space between words, none before punctuation, none around an
    apostrophe, and none between two digits."""
    text = ""
    for i, t in enumerate(tokens):
        prev = tokens[i - 1] if i else ""
        joined = i == 0 or t in (".", ",", "!", "?", "'") or prev == "'" or (is_number(t) and is_number(prev))
        text += t if joined else " " + t
    return text


def format_dialogue(turns):
    """A conversation as one list of tokens: « before each user turn, » before each bot turn,
    ¶ at the end of every turn."""
    out = []
    for role, words in turns:
        out += [USER if role == "user" else BOT] + chat_tokens(words) + [END]
    return out


def make_dialogues(seed=1, orders=60):
    """Every combination of the templates (orders with random numbers), split into training and
    held-out: (train, held_out), each a list of (user message, bot reply)."""
    rng = Rng(seed)
    train, held = [], []
    for kind, questions, answer in TEMPLATES:
        if kind == "hours":
            combos = [{"day": d, "hours": HOURS.get(d, "nine to six")} for d in DAYS]
        elif kind == "repair":
            combos = [{"part": p, "problem": q} for p in PARTS for q in PROBLEMS]
        elif kind == "order":
            combos = [{"number": str(100 + rng.below(900))} for _ in range(orders)]
        elif kind == "other":
            combos = [{"thing": t} for t in THINGS]
        else:
            combos = [{}]
        for slots in combos:
            for question in questions:
                pair = (fill(question, slots), fill(answer, slots))
                if kind == "repair" and (slots["part"], slots["problem"]) in HELD_OUT:
                    held.append(pair)
                elif kind == "order" and len(held) < 40 and rng.random() < 0.15:
                    held.append(pair)
                else:
                    train.append(pair)
    return train, held


def to_tokens(pairs, rng):
    """Shuffle the pairs into one long list of tokens, and mark which tokens are the bot's:
    roles[i] is 1 when token i belongs to a bot turn (its words or its ¶)."""
    order = list(range(len(pairs)))
    for i in range(len(order) - 1, 0, -1):          # Fisher-Yates shuffle with our own generator
        j = rng.below(i + 1)
        order[i], order[j] = order[j], order[i]
    tokens, roles = [], []
    for k in order:
        user, bot = pairs[k]
        piece = format_dialogue([("user", user), ("bot", bot)])
        bot_starts = len(chat_tokens(user)) + 3      # «, the user's words, ¶, »
        tokens += piece
        roles += [0] * bot_starts + [1] * (len(piece) - bot_starts)
    return tokens, roles


def loss_mask(roles, start, context):
    """Which predictions in a window count: the target (the next token) must be the bot's."""
    return [roles[start + 1 + i] for i in range(context)]


def make_vocab(pairs):
    """Every token of the conversations, sorted, plus <unk> for words the bot has never seen."""
    tokens = set(chat_tokens(" ".join(u + " " + b for u, b in pairs)))
    return sorted(tokens | {USER, BOT, END, UNKNOWN})


def train_chat(pairs, steps, dim=32, context=32, hidden=128, lr=0.005, seed=1):
    """Train the tiny GPT on conversations, scoring only the bot's tokens."""
    rng = Rng(seed + 2)
    tokens, roles = to_tokens(pairs, rng)
    vocab = make_vocab(pairs)
    index = {t: k for k, t in enumerate(vocab)}
    model = tg.init_model(len(vocab), dim, context, hidden, seed)
    state = {"t": 0, "b1t": 1.0, "b2t": 1.0,
             "m": {n: tg.zeros(len(model[n]), len(model[n][0])) for n in tg.PARAMS},
             "v": {n: tg.zeros(len(model[n]), len(model[n][0])) for n in tg.PARAMS}}
    losses = []
    for _ in range(steps):
        start = rng.below(len(tokens) - context - 1)
        ids = [index[t] for t in tokens[start:start + context]]
        targets = [index[t] for t in tokens[start + 1:start + context + 1]]
        mask = loss_mask(roles, start, context)
        if sum(mask) == 0:
            continue
        logits, weights, _ = tg.forward(model, ids)
        loss = tg.cross_entropy(logits, targets, mask)
        loss.backward()
        tg.adam_step(model, {n: weights[n].grad for n in tg.PARAMS}, state, lr)
        losses.append(loss.data[0][0])
    return vocab, model, losses


def top_k(probs, k):
    """Keep only the k most likely tokens (ties: lower index first), and share out their probability again."""
    keep = sorted(range(len(probs)), key=lambda i: (-probs[i], i))[:k]
    total = sum(probs[i] for i in keep)
    return [probs[i] / total if i in keep else 0.0 for i in range(len(probs))]


def reply(vocab, model, history, message, temperature=0.0, k=0, rng=None, max_tokens=30):
    """The bot's answer, as tokens: the conversation so far, « the message ¶ », then one token at a
    time until the bot writes ¶. Temperature 0 means always the most likely token."""
    index = {t: i for i, t in enumerate(vocab)}
    context = len(model["pos"])
    prompt = history + [USER] + chat_tokens(message) + [END, BOT]
    ids = [index.get(t, index[UNKNOWN]) for t in prompt]
    out = []
    for _ in range(max_tokens):
        logits, _, _ = tg.forward(model, ids[-context:])
        last = logits.data[-1]
        if temperature == 0:
            choice = max(range(len(last)), key=lambda i: (last[i], -i))
        else:
            scaled = [x / temperature for x in last]
            top = max(scaled)
            exps = [math.exp(x - top) for x in scaled]
            total = sum(exps)
            probs = [e / total for e in exps]
            if k:
                probs = top_k(probs, k)
            r, acc, choice = rng.random(), 0.0, len(probs) - 1
            for j, p in enumerate(probs):
                acc += p
                if r < acc:
                    choice = j
                    break
        if vocab[choice] == END:
            break
        out.append(vocab[choice])
        ids.append(choice)
    return out


def exact_match(vocab, model, pairs):
    """The fraction of messages whose greedy reply is exactly the expected reply."""
    right = sum(1 for user, bot in pairs if reply(vocab, model, [], user) == chat_tokens(bot))
    return right / len(pairs) if pairs else 0.0
