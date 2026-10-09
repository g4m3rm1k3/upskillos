"""Counting words and letters in text."""
from collections.abc import Iterable

PUNCTUATION = ".,;:!?\"()'"


def count_lines(text: str) -> int:
    """How many lines have something on them."""
    return sum(1 for line in text.split("\n") if line.strip())


def split_words(text: str) -> list[str]:
    """The words in text: lower case, without punctuation at either end."""
    words = []
    for word in text.split():
        word = word.strip(PUNCTUATION).lower()
        if word:
            words.append(word)
    return words


def letters(text: str) -> list[str]:
    """Every letter in text, lower case, in order."""
    return [c for c in text.lower() if c.isalpha()]


def tally(items: Iterable[str]) -> dict[str, int]:
    """How many times each item appears, in order of first appearance."""
    counts: dict[str, int] = {}
    for item in items:
        counts[item] = counts.get(item, 0) + 1
    return counts


def top(counts: dict[str, int], n: int) -> list[tuple[str, int]]:
    """The n most common items, as (item, count) pairs, most common first."""
    return sorted(counts.items(), key=lambda pair: pair[1], reverse=True)[:n]
