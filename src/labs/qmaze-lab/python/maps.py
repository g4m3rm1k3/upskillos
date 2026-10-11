"""The maps. Each one is a plain dictionary: the grid as text, and the rules that go with it.

Cell letters:
  .  floor        #  wall         S  start
  C  cheese       c  small cheese X  cat
  H  hole         G  goal         K  cliff (back to the start)
"""

MAPS = {
    "corridor": {
        "title": "Tiny corridor",
        "rows": ["S...C"],
        "step": 0.0,
        "cells": {"C": {"reward": 1.0, "end": True}},
    },
    "cheese_and_cat": {
        "title": "Cheese and cat",
        "rows": [
            "S...",
            ".#.X",
            "...#",
            "#..C",
        ],
        "step": -0.04,
        "cells": {
            "C": {"reward": 1.0, "end": True},
            "X": {"reward": -1.0, "end": True},
        },
    },
    "qmaze": {
        "title": "Classic QMaze",
        "rows": [
            "S#........",
            ".....#....",
            ".....#....",
            "##.##.#...",
            "..#.#.###.",
            "..#.#.....",
            "..........",
            "......####",
            ".#####....",
            ".......#.C",
        ],
        "step": -0.04,
        "bump": -0.75,
        "revisit": -0.25,
        "cells": {"C": {"reward": 1.0, "end": True}},
        "max_steps": 200,
    },
    "cliff": {
        "title": "Cliff",
        "rows": [
            "............",
            "............",
            "............",
            "SKKKKKKKKKKG",
        ],
        "step": -1.0,
        "cells": {
            "K": {"reward": -100.0, "to_start": True},
            "G": {"reward": -1.0, "end": True},
        },
        "max_steps": 200,
    },
    "frozen_lake": {
        "title": "Frozen lake",
        "rows": [
            "S...",
            ".H.H",
            "...H",
            "H..G",
        ],
        "step": 0.0,
        "intended": 1 / 3,
        "cells": {
            "H": {"reward": 0.0, "end": True},
            "G": {"reward": 1.0, "end": True},
        },
        "max_steps": 100,
    },
    "frozen_lake_8x8": {
        "title": "Frozen lake 8 × 8",
        "rows": [
            "S.......",
            "........",
            "...H....",
            ".....H..",
            "...H....",
            ".HH...H.",
            ".H..H.H.",
            "...H...G",
        ],
        "step": 0.0,
        "intended": 1 / 3,
        "cells": {
            "H": {"reward": 0.0, "end": True},
            "G": {"reward": 1.0, "end": True},
        },
        "max_steps": 200,
    },
    "cats_and_cheese": {
        "title": "Cats and cheese",
        "rows": [
            "S.....",
            ".##.X.",
            "c.#...",
            ".X#.#.",
            "..#...",
            "....XC",
        ],
        "step": -0.01,
        "cells": {
            "C": {"reward": 1.0, "end": True},
            "c": {"reward": 0.3, "end": True},
            "X": {"reward": -1.0, "end": True},
        },
        "max_steps": 100,
    },
}
