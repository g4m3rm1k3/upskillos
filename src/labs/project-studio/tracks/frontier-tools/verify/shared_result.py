# Lesson 3.3's third prediction: a cached function returns the very same object each time.
from functools import cache

f = cache(lambda: [])
f().append(1)
print(f())
