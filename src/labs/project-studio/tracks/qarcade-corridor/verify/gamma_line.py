# The smallest gamma (in steps of 0.005) for which a trained agent goes for the treasure.
from discount import which_end

gamma = 0.25
while which_end(gamma) != "treasure":
    gamma = round(gamma + 0.005, 3)
print(gamma)
