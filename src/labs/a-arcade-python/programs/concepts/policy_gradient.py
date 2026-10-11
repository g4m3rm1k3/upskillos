# Scores → probabilities → a choice, and a policy gradient: the actor's idea in A2C, on the
# two slot machines. The policy keeps a score per machine; softmax turns scores into
# probabilities. After each pull, the chosen machine's probability goes up if the reward beat
# the running average (the baseline: a tiny critic), and down if it didn't.
import math
import random

CHANCES = [0.3, 0.6]


def softmax(scores):
    exps = [math.exp(s) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]


def train(pulls=80, rate=0.2, seed=0):
    rng = random.Random(seed)
    scores = [0.0, 0.0]
    baseline = 0.0
    for t in range(pulls):
        probs = softmax(scores)
        arm = 0 if rng.random() < probs[0] else 1
        reward = 1.0 if rng.random() < CHANCES[arm] else 0.0
        advantage = reward - baseline
        baseline = baseline + 0.1 * (reward - baseline)
        for a in range(2):
            slope = (1.0 if a == arm else 0.0) - probs[a]
            scores[a] = scores[a] + rate * advantage * slope
    return softmax(scores)
