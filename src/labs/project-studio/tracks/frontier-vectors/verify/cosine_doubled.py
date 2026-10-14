# Lesson 4.1's second prediction: the cosine of a sentence with itself written out twice, to 3 places.
import math

cat = [1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 2.0]
twice = [2 * x for x in cat]
dot = sum(x * y for x, y in zip(cat, twice))
print(f"{dot / (math.sqrt(sum(x * x for x in cat)) * math.sqrt(sum(x * x for x in twice))):.3f}")
