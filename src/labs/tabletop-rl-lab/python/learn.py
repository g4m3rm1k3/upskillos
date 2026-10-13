"""Learning one turn from experience: Q-learning and SARSA, which never see the dice's odds, only what happens."""
import random
from dice import roll
from exact import KEEPS, evaluate
from scoring import score
from turn import reroll


def values(Q, hand, rolls_left):
    """The row of Q for this state: a value for every keep, starting at 0.0 the first time the state is seen."""
    key = (hand, rolls_left)
    if key not in Q:
        Q[key] = {}
        for kept in KEEPS[hand]:
            Q[key][kept] = 0.0
    return Q[key]


def choose(Q, hand, rolls_left, epsilon, rng):
    """ε-greedy: with chance ε any keep at random, otherwise the keep with the biggest value (ties at random)."""
    row = values(Q, hand, rolls_left)
    if rng.random() < epsilon:
        return rng.choice(list(row))
    best = max(row.values())
    tied = [kept for kept in row if row[kept] == best]
    return rng.choice(tied)


def greedy(Q, hand, rolls_left):
    """The learned policy, with no exploring: the biggest value, the first listed if there is a tie."""
    row = values(Q, hand, rolls_left)
    return max(row, key=row.get)


def train(box, episodes=20000, alpha=0.1, epsilon=0.1, method="q", gamma=1.0, seed=0, every=0):
    """Play `episodes` turns aiming for `box`, updating Q after every keep. alpha=None steps by 1/n: plain averages."""
    rng = random.Random(seed)
    Q = {}
    N = {}
    curve = []
    for episode in range(episodes):
        hand = tuple(sorted(roll(5, rng)))
        rolls_left = 2
        kept = choose(Q, hand, rolls_left, epsilon, rng)
        while True:
            next_hand = reroll(kept, rng)
            if rolls_left == 1:
                reward = score(next_hand, box)
                future = 0.0
            else:
                reward = 0
                next_kept = choose(Q, next_hand, rolls_left - 1, epsilon, rng)
                next_row = values(Q, next_hand, rolls_left - 1)
                if method == "sarsa":
                    future = next_row[next_kept]
                else:
                    future = max(next_row.values())
            target = reward + gamma * future
            row = values(Q, hand, rolls_left)
            key = (hand, rolls_left, kept)
            N[key] = N.get(key, 0) + 1
            step = alpha if alpha is not None else 1 / N[key]
            row[kept] = row[kept] + step * (target - row[kept])
            if rolls_left == 1:
                break
            hand, kept, rolls_left = next_hand, next_kept, rolls_left - 1
        if every and (episode + 1) % every == 0:
            curve.append(evaluate(lambda h, r: greedy(Q, h, r), box))
    return Q, curve


def after_value(W, rolls_left, kept):
    """The learned value of having kept `kept` with `rolls_left` rolls to go: 0.0 until it has been tried."""
    return W.get((rolls_left, kept), 0.0)


def choose_after(W, hand, rolls_left, epsilon, rng):
    """ε-greedy over keeps, judged by what is kept: the same kept dice have the same value whatever hand they came from."""
    options = KEEPS[hand]
    if rng.random() < epsilon:
        return rng.choice(options)
    best = max(after_value(W, rolls_left, kept) for kept in options)
    tied = [kept for kept in options if after_value(W, rolls_left, kept) == best]
    return rng.choice(tied)


def greedy_after(W, hand, rolls_left):
    """The afterstate learner's policy, with no exploring: the first keep with the biggest value."""
    return max(KEEPS[hand], key=lambda kept: after_value(W, rolls_left, kept))


def train_after(box, episodes=20000, alpha=None, epsilon=0.1, seed=0, every=0):
    """Learn W[(rolls_left, kept)], the value of the dice kept, from played turns. alpha=None steps by 1/n."""
    rng = random.Random(seed)
    W = {}
    N = {}
    curve = []
    for episode in range(episodes):
        hand = tuple(sorted(roll(5, rng)))
        for rolls_left in (2, 1):
            kept = choose_after(W, hand, rolls_left, epsilon, rng)
            hand = reroll(kept, rng)
            if rolls_left == 1:
                target = score(hand, box)
            else:
                target = max(after_value(W, 1, k) for k in KEEPS[hand])
            key = (rolls_left, kept)
            N[key] = N.get(key, 0) + 1
            step = alpha if alpha is not None else 1 / N[key]
            W[key] = after_value(W, rolls_left, kept) + step * (target - after_value(W, rolls_left, kept))
        if every and (episode + 1) % every == 0:
            curve.append(evaluate(lambda h, r: greedy_after(W, h, r), box))
    return W, curve
