---
title: 2.4 — A Function That Calls Itself
runtime: python
support: tests/conftest.py
---

Last lesson's heap was a tree squeezed into a list, where every position knew its children by arithmetic. Most trees aren't that tidy. A folder holds files and other folders, which hold more of both. A sentence splits into phrases, which split into words. A game position leads to several next positions, each of which leads to several more. Each of these is a **tree**: things that each hold any number of smaller things of the same kind.

In this lesson you build a tree out of **nodes**, then walk it with **recursion**: a function that calls itself on each smaller piece. Then you use the same idea on a real tree, every possible game of noughts and crosses, and count them all. That count is the reason Chapter 57's search doesn't try to look at every game, and samples instead.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_tree.py**:

```python file=tests/test_tree.py provided
# Tests for frontier.tree (lesson 2.4): a tree of nodes, walked by recursion.


def small_tree():
    """A has children B and C; B has children D and E."""
    from frontier.tree import Node
    return Node("A", [Node("B", [Node("D"), Node("E")]), Node("C")])


def test_nodes_start_with_their_own_empty_list():
    from frontier.tree import Node
    a, b = Node("a"), Node("b")
    a.children.append(Node("c"))
    assert b.children == []


def test_count_includes_every_node():
    from frontier.tree import Node, count
    assert count(Node("alone")) == 1
    assert count(small_tree()) == 5


def test_depth_is_the_number_of_levels():
    from frontier.tree import Node, depth
    assert depth(Node("alone")) == 1
    assert depth(small_tree()) == 3


def test_labels_put_each_node_before_its_children():
    from frontier.tree import labels
    assert labels(small_tree()) == ["A", "B", "D", "E", "C"]
```

In order:

- **`small_tree`** isn't a test: it builds the tree the tests share. `A` is at the top, the **root**. Its children are `B` and `C`, and `B`'s children are `D` and `E`. A node with no children, like `C`, `D` or `E`, is a **leaf**.
- **Each node has its own list of children.** Adding a child to one node mustn't add it to another. This is the `[[]] * 8` trap from lesson 2.2 again, in a new place.
- **`count`** is the number of nodes: 5 in `small_tree`. **`depth`** is the number of levels: `A`, then `B`, then `D`, so 3.
- **`labels`** lists every label, each node before the nodes below it.

```check
file tests/test_tree.py -- Click "Create provided tests/test_tree.py" above.
```

## A node with children

A node is a `label` and a list of `children`, so it's a natural dataclass, like `TextStats` in lesson 1.4. One field needs care. `children` should start as an empty list, but `children: list[Node] = []` would make **one** list, when the class is defined, and share it with every node. The dataclass decorator refuses it: it raises a `ValueError` about a mutable default.

The fix is `field(default_factory=list)`: `field` from `dataclasses` describes a field, and `default_factory` names a function to call for each new node. Calling `list()` makes a fresh empty list every time. The type is written `list["Node"]`, in quotes, because the name `Node` doesn't exist yet while its own class is being defined. Create `src/frontier/tree.py`:

```python file=src/frontier/tree.py
"""A tree of nodes, and functions that walk it by calling themselves."""
from dataclasses import dataclass, field


@dataclass
class Node:
    label: str
    children: list["Node"] = field(default_factory=list)
```

`Node("C")` is a leaf with its own empty list. `Node("B", [Node("D"), Node("E")])` passes the list of children in. A whole tree is just its root: everything else hangs below it, reached through `children`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tree.py -k nodes" label="each node has its own list of children" -- children: list["Node"] = field(default_factory=list), with field imported from dataclasses.
run ".venv/Scripts/python -m mypy --strict src/frontier/tree.py" stdout="Success" label="mypy --strict passes" -- Check the two field types: label: str, children: list["Node"].
```

## Counting by calling itself

How many nodes does a tree have? Put it in terms of smaller trees. Each child is the root of a smaller tree, so the whole tree has **this node, plus the nodes in each child's tree**. That sentence is the whole function: `count` calls `count` on each child and adds up the answers.

When a function calls itself, that's **recursion**. It stops because each call is on a smaller tree, and eventually on a leaf. A leaf has no children, so the sum is of nothing, which is 0, and `count` returns 1 without calling itself again. That stopping point is the **base case**. Add `count` at the end of `src/frontier/tree.py`:

```python file=src/frontier/tree.py
"""A tree of nodes, and functions that walk it by calling themselves."""
from dataclasses import dataclass, field


@dataclass
class Node:
    label: str
    children: list["Node"] = field(default_factory=list)


def count(node: Node) -> int:
    """How many nodes: this one, and every node below it."""
    return 1 + sum(count(child) for child in node.children)
```

Each call waits while its children's calls run. Python keeps the waiting calls on the **call stack**, each with its own `node`, so the `node` inside `count(B)` and the `node` inside `count(A)` don't get mixed up. In `small_tree`, `count(A)` waits for `count(B)`, which waits for `count(D)`. That one returns 1, and so on back up. Step through it:

```figure
name: frontier/TreeCount
caption: count(A) calls count on each child and waits. Leaves return 1 straight away; every other node returns 1 plus its children's totals.
props: {"tree": {"label": "A", "children": [{"label": "B", "children": [{"label": "D"}, {"label": "E"}]}, {"label": "C"}]}}
```

A recursive function needs its base case, or something has to make each call smaller. Without one, it never stops calling.

```predict
question: `def countdown(n): return countdown(n - 1)` has no base case. What does `countdown(10)` do?
choice: runs forever
choice: returns a negative number
choice: RecursionError
answer: RecursionError
explain: Every call waits on the call stack for the next, and the stack only has room for so many. Python stops at about 1000 waiting calls and raises `RecursionError: maximum recursion depth exceeded`. Seeing that error almost always means a missing or unreachable base case. It also means recursion suits trees that are a few hundred levels deep at most, which covers every tree in this series.
verify: script no_base_case.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_tree.py -k count" label="count includes every node" -- Return 1 plus the sum of count(child) for each child.
```

## Depth and order

Two more walks, with the same shape. A tree's **depth** is its number of levels: 1 for this node, plus the depth of its *deepest* child. `max` over a generator expression finds the deepest. A leaf has no children, and `max` of nothing would be an error, so `default=0` says what to return then.

`labels` collects every label, this node's first, then each child's whole list in turn, left to right. `extend` adds every item of one list to the end of another. Add both at the end of `src/frontier/tree.py`:

```python file=src/frontier/tree.py
"""A tree of nodes, and functions that walk it by calling themselves."""
from dataclasses import dataclass, field


@dataclass
class Node:
    label: str
    children: list["Node"] = field(default_factory=list)


def count(node: Node) -> int:
    """How many nodes: this one, and every node below it."""
    return 1 + sum(count(child) for child in node.children)


def depth(node: Node) -> int:
    """How many levels, this node's included: 1 for a leaf."""
    return 1 + max((depth(child) for child in node.children), default=0)


def labels(node: Node) -> list[str]:
    """Every label, each node before the nodes below it, children left to right."""
    found = [node.label]
    for child in node.children:
        found.extend(labels(child))
    return found
```

In `small_tree`, `labels(A)` starts with `["A"]` and extends it with `labels(B)`, which is `["B", "D", "E"]`, and then with `labels(C)`, which is `["C"]`. The whole of `B`'s branch comes before `C`. Visiting each node before its children like this is called **pre-order**. Lesson 2.5 needs the opposite order, children first.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tree.py -k depth" label="depth counts the levels" -- Return 1 plus the largest depth(child), with default=0 for a leaf.
run ".venv/Scripts/python -m pytest -q tests/test_tree.py -k labels" label="each label comes before its children's" -- Start with [node.label], then extend it with labels(child) for each child.
run ".venv/Scripts/python -m mypy --strict src/frontier/tree.py" stdout="Success" label="mypy --strict still passes" -- depth returns an int; labels returns list[str].
```

## Read the game's tests

**This step: create the supplied file and read it. No code yet.**

Now a tree that nobody builds by hand. In noughts and crosses (tic-tac-toe), X and O take turns to put their mark in an empty square of a 3 × 3 board, and three in a line wins. Every position leads to one position per empty square: a tree, with the empty board at its root. A game is one path from the root to a leaf: a win, or a full board with nobody winning.

The board is a 9-character string, read row by row, with `.` for an empty square. `"X.O.X...."` is X in the top-left corner and the middle, and O in the top-right. Click **Create provided tests/test_tictactoe.py**:

```python file=tests/test_tictactoe.py provided
# Tests for frontier.tictactoe (lesson 2.4): every game of noughts and crosses, counted.


def test_winner_reads_rows_columns_and_diagonals():
    from frontier.tictactoe import winner
    assert winner("XXX......") == "X"
    assert winner("O..O..O..") == "O"
    assert winner("X...X...X") == "X"
    assert winner("XOXOXOOXO") is None
    assert winner(".........") is None


def test_moves_are_the_empty_squares():
    from frontier.tictactoe import moves, play
    assert moves("X.O.X....") == [1, 3, 5, 6, 7, 8]
    assert play(".........", 4, "X") == "....X...."


def test_games_from_a_position():
    from frontier.tictactoe import count_games
    assert count_games("XOXOXOOX.", "X") == 1
    assert count_games("XXX......", "O") == 1
    assert count_games("X.O.X....", "O") == 441


def test_outcomes_split_by_who_wins():
    from frontier.tictactoe import outcomes
    assert outcomes("XXX......", "O") == {"X": 1}
    assert outcomes("XOXOXOOXO", "X") == {"draw": 1}
    assert outcomes("X.O.X....", "O") == {"X": 273, "O": 96, "draw": 72}
```

- **`winner`** finds three in a row, a column or a diagonal. `"XOXOXOOXO"` is a full board where nobody has three: a draw.
- **`moves`** lists the empty squares by position, 0 to 8. **`play`** returns a new board with one more mark.
- **`count_games(board, player)`** counts the games that can still happen from `board`, with `player` to move. With one square left, there's 1. On a board someone has already won, the game is over: also 1.
- **`outcomes`**, your Your turn, splits that count up by result.

```check
file tests/test_tictactoe.py -- Click "Create provided tests/test_tictactoe.py" above.
```

## A board as a string

`LINES` lists the eight ways to make three in a line, as tuples of positions: three rows, three columns, two diagonals. `winner` checks each. `board[a] == board[b] == board[c]` is a **chained comparison**: it means `board[a] == board[b] and board[b] == board[c]`. The square must also not be `.`, or three empty squares would win.

`moves` uses `enumerate`, which gives each item of a sequence together with its position, so the comprehension keeps the positions of the `.` squares. `play` builds a new string from three slices: everything before square `i`, the player's mark, and everything after. Strings can't be changed in place, so making a new one is the only way. Create `src/frontier/tictactoe.py`:

```python file=src/frontier/tictactoe.py
"""Noughts and crosses: a board, its moves, and every game from a position."""

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
```

`winner("XXX......")` finds the first line, `(0, 1, 2)`, all `X`, and returns `"X"`. `moves(EMPTY)` is all nine positions. `play(EMPTY, 4, "X")` is `"....X...."`: four empty squares, an X in the middle, then four more.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tictactoe.py -k winner" label="winner finds three in a line" -- Loop over LINES; return board[a] when it isn't "." and all three squares match; return None after the loop.
run ".venv/Scripts/python -m pytest -q tests/test_tictactoe.py -k moves" label="moves and play" -- moves keeps i for each (i, square) from enumerate(board) where square is "."; play joins board[:i], player and board[i + 1:].
run ".venv/Scripts/python -m mypy --strict src/frontier/tictactoe.py" stdout="Success" label="mypy --strict passes" -- winner returns str | None.
```

## Every game, counted

`count_games` is `count` again, with children worked out instead of stored. The base case: if someone has won, or no `.` is left, this is the end of one game, so return 1. Otherwise, add up the games after each possible move, with the other player to move next.

`other` swaps players with a **conditional expression**: `"O" if player == "X" else "X"` is `"O"` when the condition is true, and `"X"` otherwise. The defaults make `count_games()`, with no arguments, mean "from the empty board, X to move". Add both at the end of `src/frontier/tictactoe.py`:

```python file=src/frontier/tictactoe.py
"""Noughts and crosses: a board, its moves, and every game from a position."""

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


def count_games(board: str = EMPTY, player: str = "X") -> int:
    """How many different games can still happen from here, with player to move."""
    if winner(board) or "." not in board:
        return 1
    return sum(count_games(play(board, i, player), other(player)) for i in moves(board))
```

`winner(board) or ...` uses truthiness: `None` counts as false, and `"X"` or `"O"` as true. The tree is never stored: each call makes its children's boards, counts below each, and lets them go. So the memory needed is only one path from the root, at most ten boards deep, however big the tree.

```predict
question: How many different games of noughts and crosses are there, from the empty board to a win or a full board?
choice: 19683
choice: 255168
choice: 362880
answer: 255168
explain: 362880 is 9 × 8 × 7 × … × 1, every order of filling all nine squares; but many games end early with a win, which cuts their branches off. 19683 is 3⁹, every way to mark nine squares with X, O or nothing, most of which can't happen in a real game. The tree really has 255,168 leaves, and 549,946 positions in all, counting the ones in between.
verify: script every_game.py
```

Count them yourself (it takes a second or two):

```powershell
.venv\Scripts\python -c "from frontier.tictactoe import count_games; print(count_games())"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_tictactoe.py -k games" label="count_games counts every game from a position" -- Return 1 if there's a winner or no "." is left; otherwise sum count_games(play(board, i, player), other(player)) over moves(board).
run ".venv/Scripts/python -m mypy --strict src/frontier/tictactoe.py" stdout="Success" label="mypy --strict still passes" -- other and count_games need hints.
```

## Your turn: who wins?

**Build, on your own:** a function `outcomes(board, player)` at the end of `src/frontier/tictactoe.py`, with the same defaults as `count_games`. It returns a dictionary saying how many of the games from this position X wins, O wins, and are drawn: `{"X": ..., "O": ..., "draw": ...}`. A result that never happens is left out, so a board X has already won gives `{"X": 1}`. Its return type is `dict[str, int]`.

It's `count_games` with a dictionary where the number was. The base cases return a one-entry dictionary: the winner's mark with 1, or `"draw"` with 1 for a full board. Otherwise, start an empty dictionary and, for each move, add every count from that move's dictionary into it, the way `tally` added up words in Chapter 1 with `get`.

Then see the whole game's results:

```powershell
.venv\Scripts\python -c "from frontier.tictactoe import outcomes; print(outcomes())"
```

X, who moves first, wins 131,184 of the games, O wins 77,904, and 46,080 are draws. That doesn't make X the favourite between good players: two players who never blunder always draw. It counts every game, including the silly ones. Telling a good move from one that merely leads to many wins is what search is for.

```hints
nudge: Keep `winner(board)` in a variable, so you can return it as the key. Then deal with the full board, then the loop.
concept: `outcomes(play(board, i, player), other(player))` is a dictionary. Loop over its `.items()` and add each count to your running dictionary with `total.get(result, 0)`. Annotate the empty dictionary `dict[str, int]` for mypy.
answer: At the end of `src/frontier/tictactoe.py`:
~~~python
def outcomes(board: str = EMPTY, player: str = "X") -> dict[str, int]:
    """How many of the games from here X wins, O wins, and are drawn."""
    won = winner(board)
    if won:
        return {won: 1}
    if "." not in board:
        return {"draw": 1}
    total: dict[str, int] = {}
    for i in moves(board):
        for result, games in outcomes(play(board, i, player), other(player)).items():
            total[result] = total.get(result, 0) + games
    return total
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_tictactoe.py -k outcomes" label="outcomes splits the games by result" -- Return {won: 1} or {"draw": 1} at the end of a game; otherwise add every move's counts into one dictionary.
run ".venv/Scripts/python -m pytest -q tests/test_tictactoe.py tests/test_tree.py" label="every tree and game test still passes" -- outcomes only adds a function; if an older test fails, check what else changed.
run ".venv/Scripts/python -m mypy --strict src/frontier/tictactoe.py" stdout="Success" label="mypy --strict still passes" -- outcomes returns dict[str, int], and the empty dictionary needs the same annotation.
```

## Too big to count, and onto GitHub

Noughts and crosses has about half a million positions, and your laptop counts them in a second or two. Chess is estimated to have about 10¹²⁰ games, a 1 followed by 120 zeros: far more than there are atoms in the universe. Go has more still. No computer will ever walk those trees to the end.

So game programs walk a small part of the tree, chosen well. Chapter 57's Monte Carlo tree search builds the tree a node at a time, as a dataclass with children like your `Node`. It picks which branch to grow next from the results of random games played out to the end. AlphaZero, near the end of the series, adds a neural network that guesses which moves are worth a look. Underneath both are this lesson's two ideas: a tree of positions, and a function that walks it by calling itself.

Commit and push:

```powershell
git add .
git commit -m "Walk trees by recursion, and count every game of noughts and crosses"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  tree.py                Node (a dataclass with children), count, depth, labels
  tictactoe.py           winner, moves, play, other, count_games, outcomes
tests/
  test_tree.py
  test_tictactoe.py
```

Next lesson: what if a node can have more than one parent? Then it's a **graph**, and the question becomes what order to visit it in. The answer is how PyTorch works out its gradients.
