"""A priority queue built by hand: the smallest item is always at the front."""


def parent(i: int) -> int:
    return (i - 1) // 2


def left(i: int) -> int:
    return 2 * i + 1


def right(i: int) -> int:
    return 2 * i + 2


def push(heap: list[int], item: int) -> None:
    """Add item, then move it up until its parent is no bigger."""
    heap.append(item)
    i = len(heap) - 1
    while i > 0 and heap[i] < heap[parent(i)]:
        heap[i], heap[parent(i)] = heap[parent(i)], heap[i]
        i = parent(i)


def sift_down(heap: list[int], i: int) -> None:
    """Move heap[i] down until neither child is smaller."""
    while True:
        child = left(i)
        if child >= len(heap):
            return
        if right(i) < len(heap) and heap[right(i)] < heap[child]:
            child = right(i)
        if heap[i] <= heap[child]:
            return
        heap[i], heap[child] = heap[child], heap[i]
        i = child


def pop_smallest(heap: list[int]) -> int:
    """Remove and return the smallest item."""
    smallest = heap[0]
    last = heap.pop()
    if heap:
        heap[0] = last
        sift_down(heap, 0)
    return smallest


def top_k(numbers: list[int], k: int) -> list[int]:
    """The k largest numbers, largest first, keeping only k at a time."""
    heap: list[int] = []
    for number in numbers:
        push(heap, number)
        if len(heap) > k:
            pop_smallest(heap)
    smallest_first = [pop_smallest(heap) for _ in range(len(heap))]
    return smallest_first[::-1]
