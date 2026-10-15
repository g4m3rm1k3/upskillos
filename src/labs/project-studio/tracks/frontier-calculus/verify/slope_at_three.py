# Lesson 5.3's second prediction: how fast (u + 1)² changes per change in u, at u = 3 (plus 1's input).
def rest(u):
    return (u + 1) ** 2


h = 1e-5
print(round((rest(3.0 + h) - rest(3.0 - h)) / (2 * h), 6))
