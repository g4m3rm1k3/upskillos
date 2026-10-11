# Explore or exploit: two slot machines. Machine 0 pays with chance 0.3, machine 1 with 0.6,
# but the agent doesn't know that. It keeps an average of what each has paid, and with
# probability epsilon tries one at random instead of the one that looks best.
import random

CHANCES = [0.3, 0.6]


def pull(arm, rng):
    if rng.random() < CHANCES[arm]:
        return 1.0
    return 0.0


def run(pulls=100, epsilon=0.2, seed=2):
    rng = random.Random(seed)
    estimates = [0.0, 0.0]
    counts = [0, 0]
    for t in range(pulls):
        if rng.random() < epsilon:
            arm = rng.randrange(2)
        else:
            arm = 0 if estimates[0] >= estimates[1] else 1
        reward = pull(arm, rng)
        counts[arm] = counts[arm] + 1
        estimates[arm] = estimates[arm] + (reward - estimates[arm]) / counts[arm]
    return estimates, counts
