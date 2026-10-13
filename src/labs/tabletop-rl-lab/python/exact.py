"""The best way to play one turn, worked out exactly by planning backwards from the end of the turn."""
from dice import HANDS
from probability import hand_probability, outcomes
from scoring import score
from turn import keeps

KEEPS = {}
for hand in HANDS:
    KEEPS[hand] = keeps(hand)
OUTCOMES = {}


def expected(kept, V):
    """The average of V over the hands that keeping `kept` can lead to: the sum of chance × value."""
    if kept not in OUTCOMES:
        OUTCOMES[kept] = outcomes(kept)
    total = 0.0
    for hand, chance in OUTCOMES[kept]:
        total += chance * V[hand]
    return total


def backup(V):
    """One step back in time: from the values with r rolls left, every keep's value and the best value with r + 1."""
    E = {}
    Q = {}
    new_V = {}
    for hand in HANDS:
        row = {}
        for kept in KEEPS[hand]:
            if kept not in E:
                E[kept] = expected(kept, V)
            row[kept] = E[kept]
        Q[hand] = row
        new_V[hand] = max(row.values())
    return new_V, Q


def solve_from(V0):
    """Given what every final hand is worth, the values V[r] and keep values Q[r] with r = 0, 1, 2 rolls left."""
    V1, Q1 = backup(V0)
    V2, Q2 = backup(V1)
    return [V0, V1, V2], [None, Q1, Q2]


def solve(box):
    """The exact solution of one turn aiming for one box: a final hand is worth what it scores there."""
    V0 = {}
    for hand in HANDS:
        V0[hand] = score(hand, box)
    return solve_from(V0)


def start_value(V2):
    """The expected points before the first roll: V2 averaged over every first roll."""
    total = 0.0
    for hand in HANDS:
        total += hand_probability(hand) * V2[hand]
    return total


def best_keep(Q, rolls_left, hand):
    """The keep the exact solution chooses: the biggest value, the first one listed if there is a tie."""
    row = Q[rolls_left][hand]
    return max(row, key=row.get)


def evaluate(choose, box):
    """The exact expected points of any way of choosing keeps, choose(hand, rolls_left): no dice are thrown."""
    V = {}
    for hand in HANDS:
        V[hand] = score(hand, box)
    for rolls_left in (1, 2):
        new_V = {}
        for hand in HANDS:
            new_V[hand] = expected(choose(hand, rolls_left), V)
        V = new_V
    return start_value(V)


def best_for_every_box():
    """The expected points of one turn played perfectly for each box in turn."""
    from scoring import BOXES
    for box in range(13):
        V, Q = solve(box)
        print(BOXES[box], round(start_value(V[2]), 4))
