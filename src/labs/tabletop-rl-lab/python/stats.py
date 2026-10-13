"""How sure can you be? The average of many noisy games, how much it would wobble, and comparing two players fairly."""
import math
from game import play_games
from players import Chaser, Planner


def mean(xs):
    return sum(xs) / len(xs)


def std(xs):
    """The sample standard deviation: how far a single game typically lands from the average."""
    m = mean(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


def standard_error(xs):
    """How far the average itself would typically wobble if you played the same number of games again."""
    return std(xs) / math.sqrt(len(xs))


def compare(player_a, player_b, games=200, seed=0):
    """Both players on the same seeds: the average difference a − b, and its standard error."""
    a = play_games(player_a, games, seed)
    b = play_games(player_b, games, seed)
    differences = [x - y for x, y in zip(a, b)]
    return mean(differences), standard_error(differences), standard_error(a)


def planner_vs_chaser(games=100, seed=0):
    """How much better the Planner does than the Chaser, with how sure we can be of it."""
    difference, se, se_planner = compare(Planner(), Chaser(), games, seed)
    print("Planner - Chaser:", round(difference, 2), "+/-", round(2 * se, 2), "(95% of the time within 2 standard errors)")
    return difference, se
