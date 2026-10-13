# Lesson 3.1's prediction: a third call, when every call shares the default dictionary.
def count_pairs(words, counts={}):
    for i in range(len(words) - 2):
        pair = (words[i], words[i + 1])
        counts[pair] = counts.get(pair, 0) + 1
    return counts


words = ["the", "cat", "sat"]
count_pairs(words)
count_pairs(words)
print(count_pairs(words))
