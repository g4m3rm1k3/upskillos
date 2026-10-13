# Lesson 3.3's second prediction: how many times count_games() calls winner, with @cache on count_games.
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
