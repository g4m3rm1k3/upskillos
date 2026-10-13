# Lesson 3.3's first prediction: how many times count_games() calls winner, before any cache.
from frontier import tictactoe

calls = 0
real = tictactoe.winner


def counting(board):
    global calls
    calls += 1
    return real(board)


tictactoe.winner = counting
tictactoe.count_games()
print(calls)
