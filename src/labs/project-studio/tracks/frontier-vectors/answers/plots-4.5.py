"""Pictures of matrices and points, as Matplotlib figures."""
from matplotlib.figure import Figure

from frontier.matrix import Matrix


def heatmap(m: Matrix, labels: list[str]) -> Figure:
    """m as a grid of coloured squares, one per entry, with a colour bar as the key."""
    fig = Figure(figsize=(6, 5), layout="constrained")
    ax = fig.add_subplot()
    image = ax.imshow(m, vmin=0.0, vmax=1.0)
    ax.set_xticks(range(len(labels)), labels)
    ax.set_yticks(range(len(labels)), labels)
    ax.set_title("cosine similarity")
    fig.colorbar(image)
    return fig


def scatter(points: Matrix, title: str) -> Figure:
    """One dot per row of points: column 0 across, column 1 up."""
    fig = Figure(figsize=(5, 5), layout="constrained")
    ax = fig.add_subplot()
    ax.scatter(points[:, 0], points[:, 1])
    ax.set_title(title)
    return fig
