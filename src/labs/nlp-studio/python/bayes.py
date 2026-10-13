"""Part 3 of NLP Studio: learning from labelled examples. A Naive Bayes classifier, how to
measure it, and Bot 2, a chatbot that learns intents from example phrases.
"""
import math

from counting import words


def train_nb(examples, k=1.0):
    """examples: (words, label) pairs. Count what the classifier needs: documents per label,
    each word's count per label, total words per label, and the vocabulary. k is the smoothing."""
    model = {"k": k, "docs": {}, "words": {}, "totals": {}, "vocab": set()}
    for tokens, label in examples:
        model["docs"][label] = model["docs"].get(label, 0) + 1
        counts = model["words"].setdefault(label, {})
        for w in tokens:
            counts[w] = counts.get(w, 0) + 1
            model["totals"][label] = model["totals"].get(label, 0) + 1
            model["vocab"].add(w)
    model["vocab"] = sorted(model["vocab"])
    return model


def log_score(model, tokens, label):
    """log P(label) + the sum of log P(word | label), with add-k smoothing. Unknown words are skipped."""
    n_docs = sum(model["docs"].values())
    score = math.log(model["docs"][label] / n_docs)
    k = model["k"]
    vocab_size = len(model["vocab"])
    counts = model["words"].get(label, {})
    total = model["totals"].get(label, 0)
    for w in tokens:
        if w not in model["vocab"]:
            continue
        score += math.log((counts.get(w, 0) + k) / (total + k * vocab_size))
    return score


def probabilities(scores):
    """Log scores to probabilities that add up to 1: subtract the biggest, exponentiate, divide by the sum."""
    top = max(scores.values())
    exps = {label: math.exp(s - top) for label, s in scores.items()}
    total = sum(exps.values())
    return {label: e / total for label, e in exps.items()}


def classify(model, tokens):
    """The most likely label (ties: alphabetical first), and every label's probability."""
    labels = sorted(model["docs"])
    scores = {label: log_score(model, tokens, label) for label in labels}
    best = max(labels, key=lambda label: scores[label])
    return best, probabilities(scores)


def accuracy(truth, guesses):
    """The fraction of guesses that are right."""
    right = sum(1 for t, g in zip(truth, guesses) if t == g)
    return right / len(truth) if truth else 0.0


def confusion(truth, guesses, positive):
    """Count the four outcomes for one label, the "positive" one."""
    c = {"tp": 0, "fp": 0, "fn": 0, "tn": 0}
    for t, g in zip(truth, guesses):
        if g == positive:
            c["tp" if t == positive else "fp"] += 1
        else:
            c["fn" if t == positive else "tn"] += 1
    return c


def precision_recall_f1(c):
    """Precision: of what it flagged, how much was right. Recall: of what it should flag, how much it found."""
    flagged = c["tp"] + c["fp"]
    actual = c["tp"] + c["fn"]
    precision = c["tp"] / flagged if flagged else 0.0
    recall = c["tp"] / actual if actual else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {"precision": precision, "recall": recall, "f1": f1}


def evaluate(train, test, positive):
    """Train on one set of (text, label) examples, and measure on another the model has never seen."""
    model = train_nb([(words(text), label) for text, label in train])
    truth = [label for _, label in test]
    guesses = [classify(model, words(text))[0] for text, _ in test]
    c = confusion(truth, guesses, positive)
    return {"accuracy": accuracy(truth, guesses), "confusion": c, **precision_recall_f1(c)}


def train_intents(intents, k=0.1):
    """Bot 2's model: every example phrase of every intent, labelled with its intent. Little data, so
    gentle smoothing: with k = 1 the made-up counts would outweigh the real ones."""
    return train_nb([(words(example), name) for name, intent in intents.items() for example in intent["examples"]], k)


def intent_reply(model, intents, message, threshold=0.5):
    """Bot 2's reply: the most likely intent's answer, or an honest "not sure" below the threshold."""
    label, probs = classify(model, words(message))
    if probs[label] < threshold:
        return {"intent": None, "confidence": probs[label], "reply": "Sorry, I'm not sure what you mean. Could you put it another way?"}
    return {"intent": label, "confidence": probs[label], "reply": intents[label]["reply"]}


def chat(intents, message, k=0.1, threshold=0.5):
    """Train Bot 2 on the intents and answer one message: what the Real Python tab steps through."""
    model = train_intents(intents, k)
    return intent_reply(model, intents, message, threshold)
