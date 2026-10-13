"""Five dice as data: rolling them, counting the faces, and every hand there is."""
import random

FACES = [1, 2, 3, 4, 5, 6]


def roll(n, rng):
    """n dice, each a whole number from 1 to 6, all six equally likely."""
    dice = []
    for _ in range(n):
        dice.append(rng.randint(1, 6))
    return dice


def counts_of(hand):
    """How many dice show each face: counts[f] for f = 1 … 6 (counts[0] is never used)."""
    counts = [0] * 7
    for die in hand:
        counts[die] += 1
    return counts


def all_hands():
    """Every hand of five dice, each written smallest face first: 252 of them."""
    hands = []
    for a in range(1, 7):
        for b in range(a, 7):
            for c in range(b, 7):
                for d in range(c, 7):
                    for e in range(d, 7):
                        hands.append((a, b, c, d, e))
    return hands


HANDS = all_hands()


def show_rolls(rolls=5, seed=0):
    """Roll five dice a few times, and print each roll, its sorted hand and its counts."""
    rng = random.Random(seed)
    for _ in range(rolls):
        dice = roll(5, rng)
        hand = tuple(sorted(dice))
        print(dice, "sorted:", hand, "counts:", counts_of(hand)[1:])
    print(len(HANDS), "different hands")
