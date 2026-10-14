# Lesson 4.3's second prediction: which of the five texts is most like "a cat on a mat" by cosine.
import math

texts = [
    "the cat sat on the mat",
    "the dog sat on the log",
    "a cat chased a dog",
    "the stock market fell today",
    "markets rose as stocks recovered",
]
question = "a cat on a mat".split()
vocab = sorted({word for text in texts for word in text.split()})


def counts(words):
    return [float(words.count(word)) for word in vocab]


def cos(a, b):
    return sum(x * y for x, y in zip(a, b)) / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))


q = counts(question)
print(max(texts, key=lambda text: cos(counts(text.split()), q)))
