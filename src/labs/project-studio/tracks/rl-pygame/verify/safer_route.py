# Lesson 4.3: with slip 0.2, which route earns the higher discounted return, beyond the noise?
from compare_policies import table

rows = {name: (mean, error) for slip, name, mean, error in table(slips=(0.2,))}
(top, top_e), (bottom, bottom_e) = rows["top route"], rows["bottom route"]
assert abs(top - bottom) > 2 * (top_e ** 2 + bottom_e ** 2) ** 0.5, "difference within the noise"
print("the bottom route" if bottom > top else "the top route")
