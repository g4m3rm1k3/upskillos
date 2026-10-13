"""Chances by experiment: play many turns with dice and count, then see how far off the count is."""
import random
from dice import counts_of, roll


def chase_turn(rng):
    """One turn chasing a Yahtzee: keep the biggest group (the lowest face if there is a tie), reroll the rest, twice."""
    hand = roll(5, rng)
    for _ in range(2):
        counts = counts_of(hand)
        face = counts.index(max(counts))
        kept = [face] * counts[face]
        hand = kept + roll(5 - len(kept), rng)
    return max(counts_of(hand)) == 5


def estimate(turns, seed=0):
    """The fraction of `turns` chasing turns that end in a Yahtzee."""
    rng = random.Random(seed)
    yahtzees = 0
    for _ in range(turns):
        if chase_turn(rng):
            yahtzees += 1
    return yahtzees / turns


def spread(turns, seeds=20):
    """The same estimate from `seeds` different seeds: how much do they disagree?"""
    results = []
    for seed in range(seeds):
        results.append(estimate(turns, seed))
    return results
