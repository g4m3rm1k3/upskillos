"""Counting which word follows which: the pairs of neighbouring words in a text."""

PairCounts = dict[tuple[str, str], int]


def count_pairs(words: list[str], counts: PairCounts | None = None) -> PairCounts:
    """How often each pair of neighbouring words occurs, added to counts if it's given."""
    if counts is None:
        counts = {}
    for i in range(len(words) - 1):
        pair = (words[i], words[i + 1])
        counts[pair] = counts.get(pair, 0) + 1
    return counts
