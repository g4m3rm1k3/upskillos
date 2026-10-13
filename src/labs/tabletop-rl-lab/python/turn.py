"""One turn as a decision problem: the hand, how many rolls are left, and which dice to keep."""
from dice import roll


def keeps(hand):
    """Every different set of dice you could keep from a sorted hand, from none of them to all five."""
    found = []
    for mask in range(32):
        kept = []
        for i in range(5):
            if mask & (1 << i):
                kept.append(hand[i])
        kept = tuple(kept)
        if kept not in found:
            found.append(kept)
    return found


def reroll(kept, rng):
    """Keep the dice in `kept`, roll the others, and give the new hand, sorted."""
    return tuple(sorted(list(kept) + roll(5 - len(kept), rng)))
