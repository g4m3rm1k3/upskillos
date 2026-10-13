"""Part 2 of NLP Studio: a sentence's structure. A grammar, a recursive-descent parser, the
CKY chart parser, and dependency trees. Plain Python, no libraries.

A tree is a pair: (label, children) for a phrase, (part of speech, word) for a word.
"""

GRAMMAR = {
    "S": [["NP", "VP"]],
    "NP": [["Det", "N"], ["Det", "N", "PP"], ["Pronoun"], ["Name"]],
    "VP": [["V", "NP"], ["V", "NP", "PP"], ["V"]],
    "PP": [["P", "NP"]],
}

LEXICON = {
    "Det": {"the", "a"},
    "N": {"man", "dog", "cat", "telescope", "park", "hill"},
    "Pronoun": {"i", "she", "he"},
    "Name": {"alice", "bob"},
    "V": {"saw", "chased", "walked", "slept"},
    "P": {"with", "in", "on"},
}


def generate(symbol, rng):
    """A random sentence from the grammar: expand symbols until only words are left."""
    if symbol in LEXICON:
        return [rng.choice(sorted(LEXICON[symbol]))]
    rule = rng.choice(GRAMMAR[symbol])
    words = []
    for part in rule:
        words.extend(generate(part, rng))
    return words


def leaves(tree):
    """The words of a tree, left to right."""
    label, rest = tree
    if isinstance(rest, str):
        return [rest]
    words = []
    for child in rest:
        words.extend(leaves(child))
    return words


def bracket(tree):
    """A tree written on one line: (S (NP (Pronoun i)) (VP (V slept)))."""
    label, rest = tree
    if isinstance(rest, str):
        return "(" + label + " " + rest + ")"
    return "(" + label + " " + " ".join(bracket(child) for child in rest) + ")"


def parse_symbol(symbol, words, i):
    """Every way `symbol` can cover words[i:j], for any j: a list of (tree, j)."""
    if symbol in LEXICON:
        if i < len(words) and words[i] in LEXICON[symbol]:
            return [((symbol, words[i]), i + 1)]
        return []
    results = []
    for rule in GRAMMAR[symbol]:
        for children, j in parse_sequence(rule, words, i):
            results.append(((symbol, children), j))
    return results


def parse_sequence(symbols, words, i):
    """Every way the symbols, one after another, can cover words from i: a list of (trees, j)."""
    if not symbols:
        return [([], i)]
    results = []
    for first, j in parse_symbol(symbols[0], words, i):
        for rest, k in parse_sequence(symbols[1:], words, j):
            results.append(([first] + rest, k))
    return results


def parse(sentence):
    """Every tree for the whole sentence."""
    words = sentence.lower().split()
    return [tree for tree, j in parse_symbol("S", words, 0) if j == len(words)]


def catalan(n):
    """The n-th Catalan number: how many ways to bracket n + 1 things into a binary tree."""
    c = [1]
    for m in range(1, n + 1):
        c.append(sum(c[i] * c[m - 1 - i] for i in range(m)))
    return c[n]


# The same grammar in Chomsky normal form: every rule makes exactly two children, every word
# its own entry. NP -> Det N PP becomes NP -> NP PP, and VP -> V becomes intransitive verbs
# listed as VP directly.
CNF_RULES = [
    ("S", "NP", "VP"),
    ("NP", "Det", "N"),
    ("NP", "NP", "PP"),
    ("VP", "V", "NP"),
    ("VP", "VP", "PP"),
    ("PP", "P", "NP"),
]

CNF_LEXICON = {
    "the": {"Det"}, "a": {"Det"},
    "man": {"N"}, "dog": {"N"}, "cat": {"N"}, "telescope": {"N"}, "park": {"N"}, "hill": {"N"},
    "i": {"NP"}, "she": {"NP"}, "he": {"NP"}, "alice": {"NP"}, "bob": {"NP"},
    "saw": {"V"}, "chased": {"V"}, "walked": {"VP"}, "slept": {"VP"},
    "with": {"P"}, "in": {"P"}, "on": {"P"},
}


def combine(left, right):
    """Every parent a rule builds from a left cell and a right cell, and how many trees for each."""
    out = {}
    for parent, l, r in CNF_RULES:
        if l in left and r in right:
            out[parent] = out.get(parent, 0) + left[l] * right[r]
    return out


def cky(words):
    """The chart: for every span (i, j), each symbol that covers words[i:j] and its number of trees."""
    n = len(words)
    table = {}
    for i, word in enumerate(words):
        table[(i, i + 1)] = {tag: 1 for tag in sorted(CNF_LEXICON.get(word, set()))}
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length
            cell = {}
            for k in range(i + 1, j):
                for parent, trees in combine(table[(i, k)], table[(k, j)]).items():
                    cell[parent] = cell.get(parent, 0) + trees
            table[(i, j)] = cell
    return table


def count_trees(words):
    """How many sentence trees the chart finds for the whole of words."""
    return cky(words).get((0, len(words)), {}).get("S", 0)


# Which child carries a phrase's meaning: its head.
HEADS = {"S": ["VP"], "NP": ["N", "Pronoun", "Name"], "VP": ["V"], "PP": ["P"]}


def dependencies(tree):
    """A phrase tree as a dependency tree: heads[k] is the position (from 1) of word k + 1's head, 0 for the root."""
    heads = []

    def walk(node):
        label, rest = node
        if isinstance(rest, str):
            heads.append(0)
            return len(heads)
        positions = [walk(child) for child in rest]
        labels = [child[0] for child in rest]
        main = next(p for p, l in zip(positions, labels) if l in HEADS[label])
        for p in positions:
            if p != main:
                heads[p - 1] = main
        return main

    walk(tree)
    return heads


def is_tree(heads):
    """True when exactly one word hangs from the root and every word reaches it without a loop."""
    n = len(heads)
    if sum(1 for h in heads if h == 0) != 1:
        return False
    for start in range(1, n + 1):
        seen = set()
        node = start
        while node != 0:
            if node in seen or not 1 <= node <= n:
                return False
            seen.add(node)
            node = heads[node - 1]
    return True


def crossing_arcs(heads):
    """How many pairs of arcs cross when drawn above the sentence."""
    arcs = [(min(k, h), max(k, h)) for k, h in enumerate(heads, start=1) if h != 0]
    crossings = 0
    for a in range(len(arcs)):
        for b in range(a + 1, len(arcs)):
            (l1, r1), (l2, r2) = arcs[a], arcs[b]
            if l1 < l2 < r1 < r2 or l2 < l1 < r2 < r1:
                crossings += 1
    return crossings
