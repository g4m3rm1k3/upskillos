"""Timing code: how long a function takes."""
import time
from collections.abc import Callable


def best_of(fn: Callable[[], object], repeats: int = 5) -> float:
    """The fastest of several timed calls of fn(), in seconds."""
    times = []
    for _ in range(repeats):
        start = time.perf_counter()
        fn()
        times.append(time.perf_counter() - start)
    return min(times)


def ratios(times: list[float]) -> list[float]:
    """How many times longer each run took than the one before it."""
    return [times[i + 1] / times[i] for i in range(len(times) - 1)]
