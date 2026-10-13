# Lesson 2.6's prediction: what the textbook softmax does with a score of 1000.
from frontier.floats import softmax_naive

try:
    softmax_naive([1000.0, 1.0])
    print("it returned")
except OverflowError:
    print("an OverflowError")
