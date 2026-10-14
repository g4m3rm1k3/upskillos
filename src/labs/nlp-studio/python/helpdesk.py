"""Part 8 of NLP Studio: a help desk for your own app. Questions and answers written as plain text,
matched by meaning with sentence embeddings (MiniLM, lesson 7.2), refused when no question is close
enough, and tested on questions it never saw, so the threshold is chosen from measurements.
The embedding model runs in the page; everything here is plain Python.
"""


def parse_faq(text):
    """Q: and A: lines into entries {"questions": [...], "answer": "..."}. Several Q: lines can share
    one answer (different ways to ask the same thing). A line that starts with neither continues
    the answer above it. Blank lines are ignored, and so is an A: with no question before it."""
    entries, questions = [], []
    for raw in text.splitlines():
        line = raw.strip()
        if line.lower().startswith("q:"):
            if line[2:].strip():
                questions.append(line[2:].strip())
        elif line.lower().startswith("a:"):
            if questions:
                entries.append({"questions": questions, "answer": line[2:].strip()})
                questions = []
        elif line and entries and not questions:
            entries[-1]["answer"] += " " + line
    return entries


def examples(entries):
    """Every question of every entry, with the number of its entry: the sentences that get embedded."""
    return [(q, k) for k, e in enumerate(entries) for q in e["questions"]]


def best_entry(question_vector, example_vectors, example_entries):
    """The entry of the example question most similar to the question, and that similarity.
    The vectors are normalized, so the dot product is the cosine. Ties go to the earlier example."""
    best, score = -1, -2.0
    for v, k in zip(example_vectors, example_entries):
        s = sum(a * b for a, b in zip(question_vector, v))
        if s > score:
            best, score = k, s
    return best, score


def route(best, score, threshold):
    """Answer with the entry only if the match is close enough; otherwise -1, which means "I do not know"."""
    return best if score >= threshold else -1


def parse_tests(text):
    """Test questions, one per line: "question => 3" (the right answer is entry 3, counting from 1)
    or "question => none": the app has no answer for it. Returns (question, entry from 0, or -1)."""
    tests = []
    for line in text.splitlines():
        if "=>" not in line:
            continue
        question, _, label = line.rpartition("=>")
        label = label.strip().lower()
        if question.strip() and (label == "none" or label.isdigit()):
            tests.append((question.strip(), -1 if label == "none" else int(label) - 1))
    return tests


def outcomes(results, threshold):
    """Test results [score, best entry, right entry (-1 if none)] at one threshold, counted four ways:
    right: answered correctly. Wrong: answered, but not with the right entry, which includes any answer
    to a question with no right entry. Refused: no answer, and there was none to give. Missed: no
    answer, though one existed."""
    counts = {"right": 0, "wrong": 0, "refused": 0, "missed": 0}
    for score, best, right in results:
        answered = route(best, score, threshold)
        if answered == -1:
            counts["refused" if right == -1 else "missed"] += 1
        else:
            counts["right" if answered == right else "wrong"] += 1
    return counts


def choose_threshold(results, thresholds, wrong_cost=3):
    """The threshold with the lowest cost on the test questions, as (threshold, cost): a wrong answer
    costs wrong_cost, a missed one costs 1. Ties go to the earlier threshold in the list."""
    best = None
    for t in thresholds:
        c = outcomes(results, t)
        cost = wrong_cost * c["wrong"] + c["missed"]
        if best is None or cost < best[1]:
            best = (t, cost)
    return best
