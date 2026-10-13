# Lesson 2.3's prediction: the most swaps one push can make in a heap of 1000 numbers.
# The 1000th number lands at position 999; each swap moves it to its parent, until position 0.
from frontier.heap import parent

i, swaps = 999, 0
while i > 0:
    i = parent(i)
    swaps += 1
print(swaps)
