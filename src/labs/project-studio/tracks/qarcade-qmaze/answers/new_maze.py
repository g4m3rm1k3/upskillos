from maze_tools import completion
from qmaze import MAZE
from rewards import train_maze

FLIPPED = MAZE.T.copy()


def observe(env):
    canvas = env.maze.copy()
    canvas[env.cell] = 0.5
    return canvas.reshape(-1)


if __name__ == "__main__":
    agent = train_maze()
    print("trained on MAZE,    judged on MAZE:   ", completion(agent, MAZE))
    print("trained on MAZE,    judged on FLIPPED:", completion(agent, FLIPPED))
    print("trained on FLIPPED, judged on FLIPPED:", completion(train_maze(maze=FLIPPED), FLIPPED))
