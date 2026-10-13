"""Learning what a scorecard is worth: a linear value of the card left, trained by TD(0) over whole games."""
import random
from dice import roll
from game import new_card, play_turn, points, write
from players import Planner


BANDS = [(-99, -10), (-10, -4), (-4, 0), (0, 4), (4, 10), (10, 99)]


def features(card, bonus=False):
    """What the value looks at: 1.0 for each open box (13 numbers); with bonus=True, 6 more saying how the upper bonus is going."""
    boxes = card["boxes"]
    x = []
    for box in range(13):
        x.append(1.0 if boxes[box] is None else 0.0)
    if bonus:
        open_upper = [box for box in range(6) if boxes[box] is None]
        need = max(0, 63 - card["upper"])
        par = sum(3 * (box + 1) for box in open_upper)
        chasing = card["upper"] < 63 and len(open_upper) > 0
        for low, high in BANDS:
            x.append(1.0 if chasing and low <= par - need < high else 0.0)
    return x


def value(weights, card, bonus=False):
    """The card's value: each feature times its weight, added up. A full card has every feature 0, so value 0."""
    total = 0.0
    for w, x in zip(weights, features(card, bonus)):
        total += w * x
    return total


def train(games=1000, alpha=0.01, bonus=False, seed=0):
    """Play `games` games with the Planner, and after every turn move the weights toward reward + value(card after)."""
    weights = [0.0] * len(features(new_card(), bonus))
    planner = Planner(lambda card: value(weights, card, bonus))
    rng = random.Random(seed)
    history = []
    for game in range(games):
        card = new_card()
        for turn in range(13):
            hand = play_turn(planner, card, roll(15, rng))
            box = planner.box(card, hand)
            reward = points(card, hand, box)
            next_card = write(card, hand, box)
            error = reward + value(weights, next_card, bonus) - value(weights, card, bonus)
            x = features(card, bonus)
            for i in range(len(weights)):
                weights[i] += alpha * error * x[i]
            card = next_card
        history.append(list(weights))
    return weights, history
