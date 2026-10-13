# Lesson 2.3's prediction: the list after pushing 5, 3, 8, 1 into an empty heap.
from frontier.heap import push

heap: list[int] = []
for item in [5, 3, 8, 1]:
    push(heap, item)
print(heap)
