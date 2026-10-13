# Lesson 2.1's prediction: how many comparisons does unique_by_list make on 1000 different words?
# Word counts every == that `in` makes on it.
from frontier.growth import unique_by_list

comparisons = 0


class Word(str):
    def __eq__(self, other):
        global comparisons
        comparisons += 1
        return str.__eq__(self, other)

    __hash__ = str.__hash__


unique_by_list([Word(f"word{i}") for i in range(1000)])
print(comparisons)
