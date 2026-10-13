"""Chances by counting: how likely each hand is, and where keeping some dice and rerolling can lead."""
from dice import FACES, HANDS, counts_of

FACTORIAL = [1, 1, 2, 6, 24, 120]


def ways(hand):
    """How many of the 6 ** n ordered rolls of n dice give this hand: n! / (c1! × c2! × … × c6!)."""
    counts = counts_of(hand)
    result = FACTORIAL[len(hand)]
    for face in FACES:
        result = result // FACTORIAL[counts[face]]
    return result


def hand_probability(hand):
    """The chance that rolling len(hand) dice gives exactly this hand."""
    return ways(hand) / 6 ** len(hand)


def multisets(n, low=1):
    """Every sorted tuple of n faces, each face at least `low`: the hands of n dice."""
    if n == 0:
        return [()]
    result = []
    for face in range(low, 7):
        for rest in multisets(n - 1, face):
            result.append((face,) + rest)
    return result


def outcomes(kept):
    """Keep the dice in `kept` and roll the others: every hand that can come out, with its chance."""
    n = 5 - len(kept)
    result = []
    for rolled in multisets(n):
        hand = tuple(sorted(kept + rolled))
        result.append((hand, hand_probability(rolled)))
    return result


def chase_matrix():
    """P[k][j]: keep your biggest group of k equal dice, reroll the rest; the chance the biggest group is then j."""
    P = []
    for k in range(6):
        P.append([0.0] * 6)
    for k in range(1, 6):
        kept = (1,) * k
        for hand, chance in outcomes(kept):
            j = max(counts_of(hand))
            P[k][j] += chance
    return P


def chase_yahtzee():
    """The chance of a Yahtzee in one turn by always keeping the biggest group: a Markov chain, worked out exactly."""
    dist = [0.0] * 6
    for hand in HANDS:
        dist[max(counts_of(hand))] += hand_probability(hand)
    P = chase_matrix()
    for _ in range(2):
        new = [0.0] * 6
        for k in range(1, 6):
            for j in range(1, 6):
                new[j] += dist[k] * P[k][j]
        dist = new
    return dist
