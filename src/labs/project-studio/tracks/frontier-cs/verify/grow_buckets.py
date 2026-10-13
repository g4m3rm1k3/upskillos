# Lesson 2.2's prediction: how many buckets after adding 5 different words to WordSet(buckets=4)?
from frontier.hashing import WordSet

words = WordSet(buckets=4)
for word in ["the", "cat", "sat", "on", "mat"]:
    words.add(word)
print(len(words.buckets))
