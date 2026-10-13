# Lesson 2.2's prediction: do "listen" and "silent" have the same letter_sum?
from frontier.hashing import letter_sum

print("the same number" if letter_sum("listen") == letter_sum("silent") else "different numbers")
