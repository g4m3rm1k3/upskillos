"""The whole game: a scorecard of 13 boxes, the upper bonus, extra Yahtzees and the Joker rule."""
import random
from dice import counts_of, roll
from scoring import score


def new_card():
    """An empty scorecard: no box filled, nothing in the upper section, no extra Yahtzees yet."""
    return {"boxes": [None] * 13, "upper": 0, "extra": 0}


def is_joker(card, hand):
    """True for a second (or later) Yahtzee: five of a kind once the Yahtzee box is already filled."""
    return max(counts_of(hand)) == 5 and card["boxes"][11] is not None


def legal_boxes(card, hand):
    """The boxes this hand may go in. An extra Yahtzee must use its upper box if it is open, then any lower box."""
    open_boxes = [box for box in range(13) if card["boxes"][box] is None]
    if not is_joker(card, hand):
        return open_boxes
    upper = hand[0] - 1
    if card["boxes"][upper] is None:
        return [upper]
    lower = [box for box in open_boxes if box >= 6]
    if lower:
        return lower
    return open_boxes


def points(card, hand, box):
    """What writing `hand` in `box` adds to the total: the box's score, the upper bonus, and an extra-Yahtzee bonus."""
    gained = score(hand, box)
    if is_joker(card, hand) and box in (8, 9, 10):
        gained = [25, 30, 40][box - 8]
    if box < 6 and card["upper"] < 63 <= card["upper"] + gained:
        gained += 35
    if is_joker(card, hand) and card["boxes"][11] == 50:
        gained += 100
    return gained


def write(card, hand, box):
    """The scorecard after writing `hand` in `box` (a new card; the old one is unchanged)."""
    boxes = list(card["boxes"])
    boxes[box] = score(hand, box)
    if is_joker(card, hand) and box in (8, 9, 10):
        boxes[box] = [25, 30, 40][box - 8]
    upper = card["upper"] + (boxes[box] if box < 6 else 0)
    extra = card["extra"] + (1 if is_joker(card, hand) and card["boxes"][11] == 50 else 0)
    return {"boxes": boxes, "upper": upper, "extra": extra}


def total(card):
    """The final score: every box, plus 35 if the upper section reached 63, plus 100 per extra Yahtzee."""
    boxes = sum(p for p in card["boxes"] if p is not None)
    bonus = 35 if card["upper"] >= 63 else 0
    return boxes + bonus + 100 * card["extra"]


def play_turn(player, card, dice):
    """One turn with this turn's 15 dice rolled in advance: the first 5 for the first roll, then 5 for each reroll."""
    player.start_turn(card)
    hand = tuple(sorted(dice[0:5]))
    for rolls_left in (2, 1):
        kept = player.keep(card, hand, rolls_left)
        start = 15 - 5 * rolls_left
        fresh = dice[start:start + 5 - len(kept)]
        hand = tuple(sorted(list(kept) + fresh))
    return hand


def play_game(player, rng):
    """One game of 13 turns. player.keep(card, hand, rolls_left) chooses dice to keep; player.box(card, hand) a box."""
    card = new_card()
    for turn in range(13):
        hand = play_turn(player, card, roll(15, rng))
        box = player.box(card, hand)
        card = write(card, hand, box)
    return total(card)


def play_games(player, games, seed=0):
    """The scores of `games` games, game g played with dice from random.Random(seed + g)."""
    scores = []
    for g in range(games):
        scores.append(play_game(player, random.Random(seed + g)))
    return scores
