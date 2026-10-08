# The percentage of the 40,000-row table used after 2,000 episodes (3 seeds).
from tables import try_size

_, seen, _ = try_size((10, 10, 20, 20), 2000)
print(round(seen * 100))
