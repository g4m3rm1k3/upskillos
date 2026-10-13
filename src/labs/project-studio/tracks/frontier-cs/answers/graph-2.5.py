"""A graph of things that need other things first, and an order to do them in."""


def visit(graph: dict[str, list[str]], node: str, done: set[str], visiting: set[str], result: list[str]) -> None:
    """Add node to result after everything it needs, unless it's there already."""
    if node in done:
        return
    if node in visiting:
        raise ValueError(f"cycle through {node}")
    visiting.add(node)
    for need in graph.get(node, []):
        visit(graph, need, done, visiting, result)
    visiting.remove(node)
    done.add(node)
    result.append(node)


def order(graph: dict[str, list[str]]) -> list[str]:
    """Every node, each one after everything it needs."""
    done: set[str] = set()
    visiting: set[str] = set()
    result: list[str] = []
    for node in graph:
        visit(graph, node, done, visiting, result)
    return result
