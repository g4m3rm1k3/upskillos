"""The 13 boxes of a Yahtzee scorecard, and what a hand scores in each one."""
from dice import counts_of

BOXES = ["Ones", "Twos", "Threes", "Fours", "Fives", "Sixes",
         "Three of a kind", "Four of a kind", "Full house",
         "Small straight", "Large straight", "Yahtzee", "Chance"]


def has_run(counts, length):
    """True if `length` faces in a row all appear: 1-2-3-4, 2-3-4-5 or 3-4-5-6 for length 4."""
    for start in range(1, 8 - length):
        run = True
        for face in range(start, start + length):
            if counts[face] == 0:
                run = False
        if run:
            return True
    return False


def score(hand, box):
    """The points `hand` scores in box number `box` (0 = Ones … 12 = Chance), by the ordinary rules."""
    counts = counts_of(hand)
    total = sum(hand)
    if box < 6:
        face = box + 1
        return face * counts[face]
    if box == 6:
        return total if max(counts) >= 3 else 0
    if box == 7:
        return total if max(counts) >= 4 else 0
    if box == 8:
        return 25 if 3 in counts and 2 in counts else 0
    if box == 9:
        return 30 if has_run(counts, 4) else 0
    if box == 10:
        return 40 if has_run(counts, 5) else 0
    if box == 11:
        return 50 if max(counts) == 5 else 0
    return total


def show_scores(hand=(2, 2, 3, 3, 3)):
    """Print what one hand would score in every box."""
    for box in range(13):
        print(BOXES[box], score(hand, box))
