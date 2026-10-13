"""A set of words built by hand: what makes dictionaries and sets fast."""
from collections.abc import Callable


def letter_sum(word: str) -> int:
    """The word's letter codes added up."""
    return sum(ord(c) for c in word)


def poly_hash(word: str) -> int:
    """A hash where each letter's position matters, so anagrams differ."""
    h = 0
    for c in word:
        h = h * 31 + ord(c)
    return h


class WordSet:
    """A set of words, each kept in the bucket its hash picks."""

    def __init__(self, buckets: int = 8, hash_fn: Callable[[str], int] = poly_hash) -> None:
        self.hash_fn = hash_fn
        self.buckets: list[list[str]] = [[] for _ in range(buckets)]
        self.size = 0

    def bucket(self, word: str) -> list[str]:
        """The one bucket where word belongs."""
        return self.buckets[self.hash_fn(word) % len(self.buckets)]

    def add(self, word: str) -> None:
        bucket = self.bucket(word)
        if word not in bucket:
            bucket.append(word)
            self.size += 1
            if self.size > len(self.buckets):
                self.grow()

    def grow(self) -> None:
        """Twice as many buckets, and every word moved to its new bucket."""
        words = [word for bucket in self.buckets for word in bucket]
        self.buckets = [[] for _ in range(2 * len(self.buckets))]
        for word in words:
            self.bucket(word).append(word)

    def __contains__(self, word: str) -> bool:
        return word in self.bucket(word)

    def __len__(self) -> int:
        return self.size
