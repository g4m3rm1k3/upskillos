from collections import deque

from qmaze import MAZE, MOVES, QMaze


def greedy_path(agent, maze, start, limit=200):
    saved = agent.epsilon
    agent.epsilon = 0.0
    env = QMaze(maze, start=start)
    state, _ = env.reset()
    path = [env.cell]
    reached = False
    for _ in range(limit):
        state, _, terminated, truncated, _ = env.step(agent.act(state))
        path.append(env.cell)
        if terminated:
            reached = True
            break
        if truncated:
            break
    agent.epsilon = saved
    return path, reached


def shortest_path_length(maze, start, target):
    env = QMaze(maze)
    distance = {start: 0}
    queue = deque([start])
    while queue:
        row, col = queue.popleft()
        for d_row, d_col in MOVES.values():
            cell = (row + d_row, col + d_col)
            if env.is_free(*cell) and cell not in distance:
                distance[cell] = distance[(row, col)] + 1
                queue.append(cell)
    return distance.get(target)


def completion(agent, maze=MAZE):
    env = QMaze(maze)
    wins = sum(greedy_path(agent, maze, cell)[1] for cell in env.free_cells)
    return wins, len(env.free_cells)


def extra_steps(agent, maze=MAZE):
    env = QMaze(maze)
    extra = []
    for cell in env.free_cells:
        path, reached = greedy_path(agent, maze, cell)
        if reached:
            extra.append(len(path) - 1 - shortest_path_length(maze, cell, env.target))
    return extra
