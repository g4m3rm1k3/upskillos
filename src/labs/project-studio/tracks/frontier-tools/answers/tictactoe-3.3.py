"""Noughts and crosses: a board, its moves, and every game from a position."""
from functools import cache

EMPTY = "........."
LINES = [(0, 1, 2), (3, 4, 5), (6, 7, 8), (0, 3, 6), (1, 4, 7), (2, 5, 8), (0, 4, 8), (2, 4, 6)]


def winner(board: str) -> str | None:
    """"X" or "O" if they have three in a line, otherwise None."""
    for a, b, c in LINES:
        if board[a] != "." and board[a] == board[b] == board[c]:
            return board[a]
    return None


def moves(board: str) -> list[int]:
    return [i for i, square in enumerate(board) if square == "."]


def play(board: str, i: int, player: str) -> str:
    return board[:i] + player + board[i + 1:]


def other(player: str) -> str:
    return "O" if player == "X" else "X"


@cache
def count_games(board: str = EMPTY, player: str = "X") -> int:
    """How many different games can still happen from here, with player to move."""
    if winner(board) or "." not in board:
        return 1
    return sum(count_games(play(board, i, player), other(player)) for i in moves(board))


@cache
def shared_outcomes(board: str, player: str) -> dict[str, int]:
    """outcomes, worked out once per board. Its dictionaries are shared, so never change them."""
    won = winner(board)
    if won:
        return {won: 1}
    if "." not in board:
        return {"draw": 1}
    total: dict[str, int] = {}
    for i in moves(board):
        for result, games in shared_outcomes(play(board, i, player), other(player)).items():
            total[result] = total.get(result, 0) + games
    return total


def outcomes(board: str = EMPTY, player: str = "X") -> dict[str, int]:
    """How many of the games from here X wins, O wins, and are drawn: a dictionary of your own."""
    return dict(shared_outcomes(board, player))
