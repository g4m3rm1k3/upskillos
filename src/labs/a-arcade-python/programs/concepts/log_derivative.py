# Where the policy gradient comes from: the log-derivative trick, checked with numbers.
# A policy picks action 0 or 1 with softmax probabilities made from two scores. Action 0 pays 1,
# action 1 pays 3. J, the expected payoff, depends on the scores. How should the scores change
# to raise J? The trick: dJ/dscore = E[payoff × d log p(action)/dscore], an average that can be
# estimated just by playing, without knowing the payoffs in advance. Here both are worked out.
import math
import random

PAYOFF = [1.0, 3.0]


def softmax(scores):
    exps = [math.exp(s) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]


def expected_payoff(scores):
    probs = softmax(scores)
    return probs[0] * PAYOFF[0] + probs[1] * PAYOFF[1]


def exact_gradient(scores, h=1e-6):
    grads = []
    for i in range(2):
        bumped = list(scores)
        bumped[i] = bumped[i] + h
        grads.append((expected_payoff(bumped) - expected_payoff(scores)) / h)
    return grads


def sampled_gradient(scores, samples, seed=0):
    rng = random.Random(seed)
    probs = softmax(scores)
    estimate = [0.0, 0.0]
    for n in range(samples):
        action = 0 if rng.random() < probs[0] else 1
        payoff = PAYOFF[action]
        for i in range(2):
            grad_log_p = (1.0 if i == action else 0.0) - probs[i]
            estimate[i] = estimate[i] + payoff * grad_log_p / samples
    return estimate


def main():
    scores = [0.5, 0.0]
    exact = exact_gradient(scores)
    rough = sampled_gradient(scores, 10)
    better = sampled_gradient(scores, 400)
    return exact, rough, better
