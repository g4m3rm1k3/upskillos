// "Check yourself" for the tree lessons (Advanced, trees group). Format and checks: checks.js and
// checks.test.js; the numbers come from advanced-oracles.js, which lists subsets or searches from every vertex.
// For challenges that return a value per vertex, part picks the vertex asked about.

export const TREE_CHECKS = {
  'tree-basics': [
    {
      know: 'size(v) = 1 + the sizes of v’s children, filled children first from the root 0.',
      ask: 'Edges 0–1, 0–2, 2–3, 2–4, 4–5. How big is vertex 2’s subtree?',
      args: [6, [[0, 1], [0, 2], [2, 3], [2, 4], [4, 5]]], part: 2, answer: 4,
      misconceptions: [
        { answer: 3, feedback: '3 counts vertex 2 and its children, but vertex 5 hangs below vertex 4.' },
        { answer: 6, feedback: '6 is the whole tree, vertex 0’s subtree.' },
      ],
      explain: 'Vertices 2, 3, 4 and 5.',
    },
    {
      know: 'A recursive walk goes one call deeper for every level of the tree.',
      ask: 'What can go wrong on a path of 100 000 vertices, and what avoids it?',
      options: [
        { text: 'The recursion is 100 000 calls deep and overflows the stack; an explicit order (a breadth-first list walked backwards) avoids it', right: true, why: 'Python’s default limit is about 1000 calls. An order list does the same work with a loop.' },
        { text: 'Nothing: the work is only O(n)', why: 'The work is fine; the depth of the call stack is the problem.' },
        { text: 'The sizes overflow', why: 'A size is at most n, which fits easily.' },
      ],
    },
    {
      know: 'Each vertex is visited once and each edge is looked at twice (once from each end).',
      ask: 'How much work does computing every subtree size take?',
      options: [
        { text: 'O(n): every vertex and edge a constant number of times', right: true, why: 'A tree has n − 1 edges, so the whole pass is linear.' },
        { text: 'O(n²): each vertex counts its subtree afresh', why: 'Children’s sizes are reused, never recounted.' },
        { text: 'O(n log n), like sorting', why: 'Nothing is sorted; one pass in the right order is enough.' },
      ],
    },
  ],

  'tree-independent': [
    {
      know: 'Take(v) = w(v) + Σ Skip(child); Skip(v) = Σ max(Take(child), Skip(child)).',
      ask: 'A path 0–1–2–3 with weights 3, 4, 3, 1. What is the largest total with no two neighbours?',
      args: [[3, 4, 3, 1], [[0, 1], [1, 2], [2, 3]]], answer: 6,
      misconceptions: [
        { answer: 5, feedback: '5 is greedy: take the heaviest (4), which blocks both 3s, then the 1. Vertices 0 and 2 together weigh 6.' },
        { answer: 11, feedback: '11 takes every vertex, but neighbours can’t both be chosen.' },
      ],
      explain: 'Vertices 0 and 2: 3 + 3 = 6.',
    },
    {
      know: 'On a tree, fixing whether v is taken makes its children’s subtrees independent.',
      ask: 'Does the same two-state method work on a graph with cycles?',
      options: [
        { text: 'No: a cycle links subtrees back together, and maximum independent set is NP-hard on general graphs', right: true, why: 'The tree structure is what lets each child be solved on its own.' },
        { text: 'Yes, from any root', why: 'With a cycle, two “children” can be neighbours of each other, which the method never checks.' },
        { text: 'Yes, if the weights are positive', why: 'The difficulty is the structure, not the weights.' },
      ],
    },
    {
      know: 'The table gives the best total, not the chosen vertices.',
      ask: 'How are the chosen vertices recovered?',
      options: [
        { text: 'Walk down from the root: take a vertex if its Take wins and its parent wasn’t taken, then do the same for its children', right: true, why: 'Each decision is read from the two stored numbers.' },
        { text: 'Take every vertex whose Take is larger than its Skip', why: 'Two neighbours could both have Take larger; the parent’s choice must be respected.' },
        { text: 'They can’t be recovered from the table', why: 'Both states are stored for every vertex, which is exactly what the walk needs.' },
      ],
    },
  ],

  'tree-cover': [
    {
      know: 'S(v) = 1 + Σ min(S(c), U(c)); U(v) = Σ S(c): an unchosen vertex forces its children.',
      ask: 'Edges 0–1, 0–2, 0–3, 3–4, 4–5. What is the smallest vertex cover?',
      args: [6, [[0, 1], [0, 2], [0, 3], [3, 4], [4, 5]]], answer: 2,
      misconceptions: [
        { answer: 3, feedback: '3 chooses every vertex that isn’t a leaf (0, 3, 4). Vertex 3’s edges are already covered by 0 and 4.' },
        { answer: 1, feedback: 'Vertex 0 covers its three edges, but 3–4 and 4–5 need another.' },
      ],
      explain: 'Vertices 0 and 4 touch all five edges.',
    },
    {
      know: 'König’s theorem: in a bipartite graph, the smallest vertex cover has the same size as the largest matching. Every tree is bipartite.',
      ask: 'What does that say about trees?',
      options: [
        { text: 'The tree-cover and tree-matching answers are always equal', right: true, why: 'Each matched edge needs its own cover vertex, and in a bipartite graph that is enough.' },
        { text: 'The cover is always twice the matching', why: 'Choosing both ends of each matched edge is a cover, but not the smallest one.' },
        { text: 'Nothing: König’s theorem is about other graphs', why: 'Trees have no odd cycles, so they are bipartite and the theorem applies.' },
      ],
    },
    {
      know: 'A dominating set must contain each vertex or one of its neighbours.',
      ask: 'Why does a dominating set need a third state?',
      options: [
        { text: 'An unchosen vertex may be dominated by a child or by its parent, so the parent must know which case it is in', right: true, why: 'States: chosen; not chosen but dominated by a child; not chosen and waiting for its parent.' },
        { text: 'It doesn’t: the cover rules work', why: 'Covering is about edges; domination is about vertices, and the rules differ.' },
        { text: 'To count the leaves separately', why: 'The extra state is about who dominates a vertex, not about leaves.' },
      ],
    },
  ],

  'tree-matching': [
    {
      know: 'free(v) = Σ best(c); best(v) also tries matching v to one child c, which adds 1 but makes c free.',
      ask: 'A path of 6 vertices, 0–1–2–3–4–5. What is the largest matching?',
      args: [6, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]], answer: 3,
      misconceptions: [
        { answer: 5, feedback: '5 takes every edge, but neighbouring edges share a vertex.' },
        { answer: 2, feedback: 'Edges 0–1, 2–3 and 4–5 share no vertex: 3.' },
      ],
      explain: 'Edges 0–1, 2–3 and 4–5.',
    },
    {
      know: 'A leaf has only one edge, the one to its parent, so it can only be matched along that edge.',
      ask: 'Does the greedy rule “match a leaf to its parent, remove both, repeat” give a maximum matching on a tree?',
      options: [
        { text: 'Yes: some maximum matching always uses that leaf’s edge, so taking it loses nothing', right: true, why: 'If the parent is matched elsewhere, swapping that edge for the leaf’s edge keeps the size the same.' },
        { text: 'No: it can take the wrong edge', why: 'An exchange argument shows the leaf’s edge is always safe.' },
        { text: 'Only on paths', why: 'The exchange argument works for any tree.' },
      ],
    },
    {
      know: 'The DP keeps two numbers per vertex and looks at each child once.',
      ask: 'How much work does it take?',
      options: [
        { text: 'O(n)', right: true, why: 'Each child adds to its parent’s free value and offers one gain.' },
        { text: 'O(n²): each vertex tries every child as a partner', why: 'Trying every child is one pass over the children, done once per vertex: n in total.' },
        { text: 'O(2ⁿ): every set of edges', why: 'The table never lists sets of edges.' },
      ],
    },
  ],

  'tree-diameter': [
    {
      know: 'down(v) is v’s longest branch; the longest path whose top is v joins its two longest branches.',
      ask: 'Edges 0–1 (2), 1–2 (2), 0–3 (3), 3–4 (1). What is the longest path?',
      args: [5, [[0, 1, 2], [1, 2, 2], [0, 3, 3], [3, 4, 1]]], answer: 8,
      misconceptions: [
        { answer: 4, feedback: '4 is the longest path starting at the root. The longest path runs through it from 2 to 4.' },
        { answer: 7, feedback: '7 stops at vertex 3. The edge 3–4 extends that branch to 4: 4 + 4 = 8.' },
      ],
      explain: '2 → 1 → 0 → 3 → 4: 2 + 2 + 3 + 1 = 8.',
    },
    {
      know: 'Another method: search from any vertex to the farthest vertex a, then from a to the farthest vertex b.',
      ask: 'When is the distance from a to b the diameter?',
      options: [
        { text: 'When edge lengths are non-negative', right: true, why: 'The farthest vertex from anywhere is an end of some longest path; negative edges break that.' },
        { text: 'Always', why: 'With negative edges the first search can end somewhere useless.' },
        { text: 'Only on paths', why: 'It works on every tree with non-negative lengths.' },
      ],
    },
    {
      know: 'Here every branch has positive length, so a longer branch is always worth adding.',
      ask: 'If edges could be negative, what must change?',
      options: [
        { text: 'A branch is added only if it helps: down(v) = max(0, best branch), and a path may stop at v', right: true, why: 'A negative branch makes a path longer by leaving it out.' },
        { text: 'Nothing', why: 'Joining v’s two “longest” branches would then add negative lengths.' },
        { text: 'Take the absolute value of every edge', why: 'That changes the problem; a negative edge really shortens a path.' },
      ],
    },
  ],

  'tree-reroot': [
    {
      know: 'far(v) = max(down(v), up(v)); up(v) goes to the parent, then up again or down a branch that isn’t v’s.',
      ask: 'A path of 5 vertices, 0–1–2–3–4. How far is the farthest vertex from vertex 2?',
      args: [5, [[0, 1], [1, 2], [2, 3], [3, 4]]], part: 2, answer: 2,
      misconceptions: [
        { answer: 4, feedback: '4 is the longest path in the tree. From the middle, both ends are 2 away.' },
        { answer: 1, feedback: 'Vertices 0 and 4 are 2 edges from vertex 2.' },
      ],
      explain: 'From the middle vertex, both ends are 2 edges away.',
    },
    {
      know: 'Running the down pass from every root separately would answer every vertex too.',
      ask: 'What does rerooting save?',
      options: [
        { text: 'n separate passes become two: about n instead of n² work', right: true, why: 'Each answer is built from its neighbour’s by fixing up one edge.' },
        { text: 'Nothing: it is the same work in a different order', why: 'Two passes of n each, versus n passes of n each.' },
        { text: 'Memory, but not time', why: 'Both passes keep a few numbers per vertex; the saving is in time.' },
      ],
    },
    {
      know: 'Each vertex keeps its deepest and second-deepest branch.',
      ask: 'Why the second deepest?',
      options: [
        { text: 'So a child whose own branch is the parent’s deepest can still learn the parent’s best other way', right: true, why: 'up(child) must not go back down through the child itself.' },
        { text: 'To break ties', why: 'Ties would give the same value either way; the second branch is for excluding a child.' },
        { text: 'To find the diameter', why: 'The diameter uses them too, but here they serve the up pass.' },
      ],
    },
  ],

  'reroot-prefix': [
    {
      know: 'A set through v is a set below v (down(v)) joined to nothing above or to one of up(v) sets.',
      ask: 'A star: centre 0 with leaves 1, 2, 3. How many connected sets contain the centre?',
      args: [4, [[0, 1], [0, 2], [0, 3]]], part: 0, answer: 8,
      misconceptions: [
        { answer: 11, feedback: '11 counts every connected set, including the three single leaves, which don’t contain the centre.' },
        { answer: 4, feedback: 'Each leaf is independently in or out with the centre: 2³ = 8.' },
      ],
      explain: 'The centre with any subset of the three leaves: 2³ = 8.',
    },
    {
      know: 'Counting is done modulo the prime 1 000 000 007.',
      ask: 'Why build “all children but c” from prefix and suffix products instead of dividing?',
      options: [
        { text: 'A factor can be 0 modulo the prime, and division by it is impossible', right: true, why: 'Prefix and suffix products need no division at all.' },
        { text: 'Division is slower', why: 'Speed is not the main reason; correctness under the modulus is.' },
        { text: 'Division would give fractions', why: 'Modular inverses avoid fractions, but don’t exist for a factor that is 0 mod p.' },
      ],
    },
    {
      know: 'For a vertex with k children, the prefix and suffix arrays each have k + 1 entries.',
      ask: 'How much extra work do they add over the whole tree?',
      options: [
        { text: 'O(n): the children lists of all vertices together have n − 1 entries', right: true, why: 'Each child appears in exactly one list.' },
        { text: 'O(n²): every vertex builds arrays over all vertices', why: 'Each vertex builds arrays only over its own children.' },
        { text: 'O(n log n)', why: 'Nothing is sorted or halved; it is linear.' },
      ],
    },
  ],

  'tree-distances': [
    {
      know: 'S(v) = S(parent) + n − 2·size(v); the root’s sum is the sum of depths.',
      ask: 'A path of 5 vertices, 0–1–2–3–4. What is the sum of distances from vertex 2?',
      args: [5, [[0, 1], [1, 2], [2, 3], [3, 4]]], part: 2, answer: 6,
      misconceptions: [
        { answer: 10, feedback: '10 is the sum from an end. From the middle: 2 + 1 + 1 + 2.' },
      ],
      explain: 'From the middle: 2 + 1 + 1 + 2 = 6, the smallest sum on the path.',
    },
    {
      know: 'Suppose edges have lengths, and the edge from p to v has length w.',
      ask: 'How does the rule change?',
      options: [
        { text: 'S(v) = S(p) + w · (n − 2·size(v))', right: true, why: 'Every distance changes by w instead of 1, in the same directions.' },
        { text: 'S(v) = S(p) + n − 2·size(v) + w', why: 'The w applies to every one of the n distances that change.' },
        { text: 'It can’t be done by rerooting', why: 'The same counting works; each change is just w instead of 1.' },
      ],
    },
    {
      know: 'Each S(v) is filled from its parent’s in constant time.',
      ask: 'Which vertex has the smallest S?',
      options: [
        { text: 'A centroid-like vertex: moving to child v helps only while size(v) > n/2', right: true, why: 'S decreases when n − 2·size(v) < 0, so the minimum is where no child has more than half the vertices.' },
        { text: 'The root', why: 'The root is just where the computation started.' },
        { text: 'A leaf', why: 'A leaf is usually far from most vertices.' },
      ],
    },
  ],

  'tree-knapsack': [
    {
      know: 'D(v, b) is the best with v chosen and cost at most b; children are merged by sharing the budget.',
      ask: 'Values [1, 4, 6, 2], costs [1, 2, 2, 1]; edges 0–1, 1–2, 0–3; budget 4. What is the best value?',
      args: [[1, 4, 6, 2], [1, 2, 2, 1], [[0, 1], [1, 2], [0, 3]], 4], answer: 7,
      misconceptions: [
        { answer: 11, feedback: '11 takes 0, 1 and 2, which cost 5.' },
        { answer: 10, feedback: '10 takes 1 and 2 without the root, but every chosen vertex needs its parent.' },
      ],
      explain: '0, 1 and 3: cost 4, value 1 + 4 + 2 = 7.',
    },
    {
      know: 'Merging a child tries every split of every budget: about B² work per child.',
      ask: 'What is the total work for n vertices and budget B?',
      options: [
        { text: 'About n · B², since each vertex is merged into its parent once', right: true, why: 'A refinement that bounds each budget by the subtree’s size brings it to about n · B.' },
        { text: 'About n · B', why: 'That needs the size-bounding refinement; the plain merge is B² per child.' },
        { text: 'About Bⁿ, every combination', why: 'Merging one child at a time avoids listing combinations.' },
      ],
    },
    {
      know: 'Here a vertex can be chosen only with its parent.',
      ask: 'Without that rule, what problem is left?',
      options: [
        { text: 'An ordinary 0/1 knapsack over all the vertices: the tree no longer matters', right: true, why: 'With no dependencies, the shape of the tree plays no part.' },
        { text: 'The same tree knapsack', why: 'The parent rule is what makes the tree matter.' },
        { text: 'A shortest-path problem', why: 'There is no path to follow without the dependencies.' },
      ],
    },
  ],

  'tree-coloring': [
    {
      know: 'W(v, c) multiplies, over children, all the child’s colourings minus those where it is c.',
      ask: 'A path 0–1–2, every vertex allowed colours 1, 2 and 3. How many proper colourings?',
      args: [[[0, 1], [1, 2]], [[1, 2, 3], [1, 2, 3], [1, 2, 3]]], answer: 12,
      misconceptions: [
        { answer: 27, feedback: '27 is every colouring, 3³. Neighbours must differ.' },
        { answer: 6, feedback: 'The middle vertex has 3 choices and each end 2: 3 · 2 · 2 = 12.' },
      ],
      explain: '3 colours for vertex 1, then 2 for each end: 12.',
    },
    {
      know: 'With the same k colours allowed everywhere, the root has k choices and each other vertex must differ from its parent.',
      ask: 'How many proper colourings does a tree of n vertices have then?',
      options: [
        { text: 'k · (k − 1)ⁿ⁻¹', right: true, why: 'Each non-root vertex has k − 1 choices given its parent, whatever the shape.' },
        { text: 'kⁿ', why: 'That counts every colouring, ignoring the rule that neighbours differ.' },
        { text: 'It depends on the shape of the tree', why: 'Every tree with n vertices gives the same count.' },
      ],
    },
    {
      know: 'Counts multiply at every vertex, once for each child.',
      ask: 'What should a program watch for on large trees?',
      options: [
        { text: 'The counts grow exponentially; use big integers or count modulo a prime', right: true, why: 'A path of 50 already has 3 · 2⁴⁹ colourings with 3 colours.' },
        { text: 'Negative counts', why: 'Each factor is a count of colourings, never negative.' },
        { text: 'Nothing: counts stay below n', why: 'They grow like (k − 1)ⁿ, far past n.' },
      ],
    },
  ],

  'tree-path-count': [
    {
      know: 'Every path is counted at its highest vertex, pairing depths from two different branches.',
      ask: 'A star: centre 0 with 5 leaves. How many pairs are exactly 2 edges apart?',
      args: [6, [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]], 2], answer: 10,
      misconceptions: [
        { answer: 20, feedback: '20 counts each pair twice, once from each end.' },
        { answer: 5, feedback: '5 is the number of pairs at distance 1, the edges.' },
      ],
      explain: 'Every pair of leaves: C(5, 2) = 10.',
    },
    {
      know: 'The depth counts keep k + 1 numbers per vertex.',
      ask: 'When k can be as large as n, what does the simple method cost, and what is the usual fix?',
      options: [
        { text: 'About n², and small-to-large merging of depth arrays (or centroid decomposition) brings it down', right: true, why: 'Keeping the deepest child’s array and merging shorter ones into it saves the repeated work.' },
        { text: 'Still about n · k = n, since k is just a number', why: 'With k close to n each vertex keeps about n counts.' },
        { text: 'It becomes exponential', why: 'It grows polynomially; no subsets are listed.' },
      ],
    },
    {
      know: 'Each child’s depths are paired with the branches merged before it, then merged in.',
      ask: 'Why pair before merging?',
      options: [
        { text: 'So the two ends of a path come from different branches; merging first would pair a branch with itself', right: true, why: 'Such “paths” would go down a branch and back up the same edges.' },
        { text: 'It makes no difference', why: 'Merging first counts false paths, as the bug hunt shows.' },
        { text: 'To keep the counts sorted', why: 'The order matters for correctness, not sorting.' },
      ],
    },
  ],

  'tree-connected': [
    {
      know: 'C(v) = Π (1 + C(child)) counts the sets whose top is v; the answer adds C over every vertex.',
      ask: 'A star: centre 0 with leaves 1, 2, 3. How many non-empty connected sets are there?',
      args: [4, [[0, 1], [0, 2], [0, 3]]], answer: 11,
      misconceptions: [
        { answer: 8, feedback: '8 counts only the sets containing the centre. The three single leaves count too.' },
        { answer: 15, feedback: '15 is every non-empty set; two leaves without the centre aren’t connected.' },
      ],
      explain: '8 sets contain the centre, plus the 3 single leaves.',
    },
    {
      know: 'C(root) counts the connected sets that contain the root.',
      ask: 'How do you count the connected sets that contain a particular vertex x?',
      options: [
        { text: 'Root the tree at x and read C(x), or reroot to get every vertex at once', right: true, why: 'With x as the root, every set containing x has x as its top.' },
        { text: 'Read C(x) with the root at 0', why: 'That counts only sets whose top is x, missing those that also reach above it.' },
        { text: 'Divide the total by n', why: 'Different vertices are in different numbers of sets.' },
      ],
    },
    {
      know: 'The highest vertex of a connected set is the one closest to the root.',
      ask: 'Why does every connected set have exactly one highest vertex?',
      options: [
        { text: 'Two highest vertices would need a path between them going above both, through a vertex closer to the root', right: true, why: 'That vertex would be in the set and higher, a contradiction.' },
        { text: 'Because sets are counted once by definition', why: 'The uniqueness is what makes the counting work; it needs a reason.' },
        { text: 'Because the root is always in the set', why: 'Most connected sets don’t contain the root.' },
      ],
    },
  ],

  'tree-small-large': [
    {
      know: 'Each vertex’s colour set is its own colour joined with its children’s sets.',
      ask: 'Colours [1, 2, 3, 1]; edges 0–1, 0–2, 2–3. How many different colours are in the whole tree (vertex 0’s subtree)?',
      args: [[1, 2, 3, 1], [[0, 1], [0, 2], [2, 3]]], part: 0, answer: 3,
      misconceptions: [
        { answer: 4, feedback: '4 counts vertices; vertices 0 and 3 share colour 1.' },
        { answer: 2, feedback: 'Colours 1, 2 and 3 all appear.' },
      ],
      explain: 'Colours 1, 2 and 3; colour 1 appears twice but counts once.',
    },
    {
      know: 'An element moves only when its set is poured into one at least as large.',
      ask: 'How many times can one colour entry move in total?',
      options: [
        { text: 'At most about log₂ n times, so all merging costs O(n log n)', right: true, why: 'Each move at least doubles the size of the set it is in, which can’t exceed n.' },
        { text: 'Up to n times', why: 'That happens only if the larger set is poured into the smaller.' },
        { text: 'Once', why: 'An entry can move again when its new set is later poured into a bigger one.' },
      ],
    },
    {
      know: 'Suppose the question is the most frequent colour in each subtree.',
      ask: 'What must each merged structure hold instead of a set?',
      options: [
        { text: 'A count for each colour, so overlapping colours add their counts', right: true, why: 'Small-to-large still works: pour the smaller map into the larger, adding counts.' },
        { text: 'The same set', why: 'A set forgets how many times each colour appears.' },
        { text: 'Only the current most frequent colour', why: 'A colour that is second now may win after merging another child.' },
      ],
    },
  ],
}
