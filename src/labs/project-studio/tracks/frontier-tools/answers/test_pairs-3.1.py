# Tests for frontier.pairs (lesson 3.1): every bug found gets a test, so it can't come back.
from frontier.pairs import count_pairs


def test_calls_start_from_nothing():
    count_pairs(["the", "cat", "sat"])
    assert count_pairs(["the", "cat", "sat"])[("the", "cat")] == 1


def test_last_pair_is_counted():
    assert count_pairs(["the", "cat", "sat"]) == {("the", "cat"): 1, ("cat", "sat"): 1}
