"""Ways to play a whole game: chase the biggest group, or plan every turn exactly with some value for the card left."""
from dice import HANDS, counts_of
from exact import solve_from
from game import legal_boxes, play_games, points, write


class Chaser:
    """Keeps its biggest group of equal dice, and writes the hand wherever it scores the most right now."""

    def start_turn(self, card):
        pass

    def keep(self, card, hand, rolls_left):
        counts = counts_of(hand)
        face = counts.index(max(counts))
        return (face,) * counts[face]

    def box(self, card, hand):
        best = None
        for b in legal_boxes(card, hand):
            if best is None or points(card, hand, b) > points(card, hand, best):
                best = b
        return best


class Planner:
    """Plans each turn exactly. A final hand is worth the best, over the boxes it may go in, of points now + value(card left)."""

    def __init__(self, value=None):
        self.value = value

    def worth(self, card, hand, box):
        gained = points(card, hand, box)
        if self.value is None:
            return gained
        key = (box, gained)
        if key not in self.after:
            self.after[key] = self.value(write(card, hand, box))
        return gained + self.after[key]

    def start_turn(self, card):
        self.after = {}
        V0 = {}
        for hand in HANDS:
            V0[hand] = max(self.worth(card, hand, b) for b in legal_boxes(card, hand))
        self.V, self.Q = solve_from(V0)

    def keep(self, card, hand, rolls_left):
        row = self.Q[rolls_left][hand]
        return max(row, key=row.get)

    def box(self, card, hand):
        boxes = legal_boxes(card, hand)
        return max(boxes, key=lambda b: self.worth(card, hand, b))


def match(games=5, seed=0):
    """The Chaser and the Planner on the same dice, game by game: a list of (chaser score, planner score)."""
    chaser = play_games(Chaser(), games, seed)
    planner = play_games(Planner(), games, seed)
    return list(zip(chaser, planner))
