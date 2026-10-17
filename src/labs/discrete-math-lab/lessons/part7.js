// Part 7: Graph Theory, Trees & Networks — Handshaking Lemma & graph families, adjacency matrices &
// bipartite graphs, Königsberg & Euler/Hamilton paths, trees & Kruskal's MST, planar graphs & coloring.
import {
  handshakeEdges, completeEdges, bipartiteEdges, hypercubeVertices, hypercubeEdges,
  matPow, treeEdges, cayleyTrees, planarFaces, planarMaxEdges, wheelChromatic, kruskalMst,
} from '../engine/discrete.js'

export const PART7 = {
  id: 'graph-theory',
  title: 'Part [[#part:graph-theory]] · Graph theory, trees & networks',
  lessons: [
    {
      id: 'graphs-handshaking',
      title: 'Graphs G = (V, E), degree sequences, and the Handshaking Lemma',
      goal: 'Use the Handshaking Lemma $\\sum_{v \\in V} \\deg(v) = 2|E|$ to relate vertex degrees and edge counts, prove that every graph has an even number of odd-degree vertices, and recognize $K_n, C_n, K_{m,n},$ and $Q_d$.',
      builds: ['relations', 'combinations'],
      blocks: [
        { h: 'Vertices, edges, and why the sum of all degrees is always even' },
        {
          md: `A **simple graph** $G = (V, E)$ consists of a non-empty set of **vertices** (or nodes) $V$ and a set of **edges** $E$, where each edge is an unordered 2-element subset $\\{u, v\\} \\subseteq V$ ($u \\ne v$) connecting two **adjacent** vertices.
The **degree** of a vertex $v$, written $\\deg(v)$, is the number of edges incident to $v$ (how many neighbors $v$ has in a simple graph).

Suppose $n$ people are at a party, and some pairs shake hands. If you ask every person *"How many hands did you shake?"* and add up all $n$ answers, what do you get?
**Every single handshake (edge) involves $2$ people (endpoints), so it gets counted twice—once by each of its two endpoints!**

**The Handshaking Lemma:** In any undirected graph $G = (V, E)$,
$$\\sum_{v \\in V} \\deg(v) = 2\\,|E|$$

From this 1-line equation comes an immediate corollary by parity (lesson [[#contrapositive-cases]]):
> **In every graph, the number of vertices of ODD degree is always EVEN!**
> *Why?* Split the sum $\\sum_{v \\in V} \\deg(v) = 2|E|$ into even-degree vertices plus odd-degree vertices. Since $2|E|$ is even and the sum of even numbers is even, the sum of the odd degrees must be even—which is only possible if there is an **even number of odd terms**! (So no party of $9$ people can ever have everyone shake hands with exactly $3$ people, because $9 \\times 3 = 27$ is odd!)`,
        },
        {
          symbols: [
            ['G = (V, E)', 'undirected graph', '$V$ is the vertex set ($|V|$ vertices), $E$ is the edge set ($|E|$ edges)', 'In a simple graph: $0 \\le |E| \\le \\binom{|V|}{2}$'],
            ['\\sum_{v \\in V} \\deg(v) = 2|E|', 'Handshaking Lemma', 'Each edge has 2 endpoints, contributing $+2$ to the sum of degrees', 'Forces an **even** number of odd-degree vertices!'],
            ['K_n,\\;C_n,\\;W_n', 'complete, cycle, wheel graphs', '$K_n$ has all $\\binom{n}{2}$ edges (every vertex has degree $n-1$); $C_n$ is an $n$-cycle (all degree $2$)', '$|E(K_n)| = \\frac{n(n-1)}{2}$'],
            ['Q_d', 'd-dimensional hypercube', 'Vertices are all $2^d$ bit strings of length $d$; edges join strings differing in **1 bit**', '$|V(Q_d)| = 2^d$, $\\deg(v) = d$, $|E(Q_d)| = d\\cdot 2^{d-1}$'],
          ],
        },
        {
          figure: 'GraphHandshakeFig',
          caption: 'Switch between Complete graphs $K_n$, Cycles $C_n$, Hypercubes $Q_d$, or toggle your own edges: watch $\\sum \\deg(v) = 2|E|$ hold at every step and the count of odd-degree vertices stay even!',
        },
        {
          worked: {
            title: 'Counting the edges of the $d$-dimensional Hypercube $Q_d$ using the Handshaking Lemma',
            steps: [
              ['1. Count vertices $|V|$', 'Vertices are $d$-bit binary strings $\\{0, 1\\}^d \\implies |V| = 2^d$.', 'Product rule on $d$ bits'],
              ['2. Degree of each vertex', 'Two bit strings are adjacent iff they differ in **exactly 1 bit** $\\implies \\deg(v) = d$ for every $v$!', '$d$-regular graph'],
              ['3. Sum of degrees', '$\\sum_{v \\in V} \\deg(v) = |V| \\cdot d = d \\cdot 2^d$.', 'Every one of the $2^d$ vertices has degree $d$'],
              ['4. Divide by 2 (Handshaking)', '$|E| = \\frac{1}{2} \\sum \\deg(v) = \\frac{d \\cdot 2^d}{2} = d \\cdot 2^{d-1}$.', 'For a 3D cube $Q_3$: $3 \\cdot 2^2 = 12$ edges! $\\blacksquare$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'A graph has $7$ vertices whose degrees are $4, 4, 3, 3, 2, 2, 2$. How many **edges** $|E|$ does the graph have?',
            answer: handshakeEdges([4, 4, 3, 3, 2, 2, 2]),
            compute: () => handshakeEdges([4, 4, 3, 3, 2, 2, 2]),
            explain: 'Add the degrees: $4 + 4 + 3 + 3 + 2 + 2 + 2 = 20$. By the Handshaking Lemma $2|E| = 20 \\implies |E| = 10$ edges.',
            misconceptions: [
              { answer: 20, feedback: '$20$ is the sum of degrees $\\sum \\deg(v) = 2|E|$; divide by $2$ to get $|E| = 10$!' },
            ],
          },
        },
        {
          predict: {
            prompt: 'How many edges does the complete graph $K_{10}$ (where every pair of the $10$ vertices is joined by an edge) have?',
            answer: completeEdges(10),
            compute: () => completeEdges(10),
            explain: '$|E(K_{10})| = \\binom{10}{2} = \\frac{10 \\times 9}{2} = 45$ edges.',
          },
        },
        {
          predict: {
            prompt: 'How many edges does the $4$-dimensional hypercube graph $Q_4$ (whose vertices are the $2^4 = 16$ bit strings of length $4$) have?',
            answer: hypercubeEdges(4),
            compute: () => hypercubeEdges(4),
            explain: 'Each of the $2^4 = 16$ vertices can flip any of its $4$ bits (degree $4$), so by Handshaking $|E(Q_4)| = \\frac{16 \\times 4}{2} = 32$ edges.',
          },
        },
        {
          choice: {
            prompt: 'Can there exist a simple graph with $6$ vertices having degrees $5, 5, 4, 3, 2, 1$?',
            options: [
              { text: 'No! Even though the sum $5+5+4+3+2+1 = 20$ is even, two vertices of degree $5$ in a $6$-vertex simple graph must each connect to **every** other vertex, which forces the minimum degree in the graph to be at least $2$ (contradicting the vertex of degree $1$)!', why: 'Yes! An even degree sum is *necessary*, not sufficient: in a $6$-vertex simple graph, two vertices of degree $5$ both connect to all other $4$ vertices, so no vertex can have degree $1$!' },
              { text: 'Yes, because $5+5+4+3+2+1 = 20$ is even', why: 'Having an even sum is necessary by Handshaking, but the structural constraint of two degree-5 vertices makes degree 1 impossible.' },
              { text: 'No, because the sum of degrees is odd', why: 'The sum $5+5+4+3+2+1 = 20$ is actually even; the impossibility comes from the two degree-5 vertices.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'By the Pigeonhole Principle, in **any** simple graph $G$ with $n \\ge 2$ vertices, why must at least two vertices have the **exact same degree**?',
            options: [
              { text: 'Degrees lie in $\\{0, 1, \\dots, n-1\\}$, but a graph cannot simultaneously contain a vertex of degree $0$ (isolated from everyone) AND a vertex of degree $n-1$ (connected to everyone!), leaving at most $n - 1$ possible degrees (boxes) for $n$ vertices (pigeons)!', why: 'Yes! $n$ vertices placed into $n - 1$ available degree values ($\{0, \\dots, n-2\}$ or $\{1, \\dots, n-1\}$) guarantees a duplicate degree by Pigeonhole!' },
              { text: 'Because the sum of degrees is even', why: 'An even sum doesn\'t by itself force two numbers to be equal ($1 + 2 + 5 = 8$ has distinct numbers).' },
              { text: 'Only regular graphs have vertices of the same degree', why: 'Every simple graph with $n \\ge 2$ vertices has at least one pair of vertices sharing a degree!' },
            ],
            answer: 0,
          },
        },
        {
          note: 'The **Handshaking Lemma** $\\sum_{v \\in V} \\deg(v) = 2|E|$ is double counting in its purest form: counting the $(v, e)$ endpoint pairs by vertices gives $\\sum \\deg(v)$, and counting by edges gives $2|E|$.',
        },
      ],
    },

    {
      id: 'representations-isomorphism',
      title: 'Adjacency matrices, walks via Aᵏ, bipartite graphs, and isomorphism',
      goal: 'Use powers of the adjacency matrix $(A^k)_{ij}$ to count walks of length $k$, test whether a graph is bipartite (2-colorable $\\iff$ no odd cycles), and use structural invariants to test graph isomorphism.',
      builds: ['graphs-handshaking'],
      blocks: [
        { h: 'Why the k-th power of the adjacency matrix counts k-step walks' },
        {
          md: `Given a graph $G$ with vertices $1, 2, \\dots, n$, its **adjacency matrix** $A$ is the $n \\times n$ matrix where $A_{ij} = 1$ if $\\{i, j\\} \\in E$ and $0$ otherwise.

What happens when you multiply $A$ by itself to get $A^2$?
By the definition of matrix multiplication:
$$(A^2)_{ij} = \\sum_{m=1}^n A_{im}\\,A_{mj}$$
Look at each term $A_{im}\\,A_{mj}$ in that sum: since $A_{im}$ and $A_{mj}$ are $0$ or $1$, their product $A_{im} A_{mj}$ equals **$1$ if and only if there is an edge $i - m$ AND an edge $m - j$**—that is, a **2-step walk $i \\to m \\to j$** through intermediate vertex $m$!
By induction on $k$:
> **Entry $(A^k)_{ij}$ of the $k$-th matrix power $A^k$ equals the exact number of walks of length $k$ from vertex $i$ to vertex $j$!**`,
        },
        { h: 'Bipartite Graphs and Graph Isomorphism' },
        {
          md: `A graph $G = (V, E)$ is **bipartite** if its vertex set $V$ can be partitioned into two disjoint independent sets $L \\cup R$ (Left and Right, or Red and Blue) such that **every edge goes between $L$ and $R$** (no edge ever joins two vertices in the same group!).
- The **complete bipartite graph $K_{m, n}$** connects every one of the $m$ left vertices to every one of the $n$ right vertices, so $|V| = m + n$ and $|E| = m \\cdot n$.
- **König's Characterization Theorem:** *A graph is bipartite (2-colorable) if and only if it contains **no cycle of odd length**!*
  *(Why? Walking along any cycle alternates $L \\to R \\to L \\to R \\dots$; to return to your starting side $L$, the cycle must take an **even** number of steps!)*

Finally, two graphs $G_1 = (V_1, E_1)$ and $G_2 = (V_2, E_2)$ are **isomorphic** ($G_1 \\cong G_2$) if there is a bijection $f: V_1 \\to V_2$ that preserves adjacency ($\\{u,v\\} \\in E_1 \\iff \\{f(u), f(v)\\} \\in E_2$)—they are the **exact same network drawn with different vertex labels**!
To prove two graphs are **NOT** isomorphic, find any **graph invariant** they disagree on: number of vertices $|V|$, number of edges $|E|$, sorted **degree sequence**, whether they are bipartite, or number of triangles ($C_3$)!`,
        },
        {
          symbols: [
            ['(A^k)_{ij}', 'entry (i, j) of adjacency power Aᵏ', 'Exact number of walks of length $k$ between vertex $i$ and vertex $j$', '$(A^2)_{ii} = \\deg(i)$; $\\operatorname{tr}(A^3)/6 =$ number of triangles!'],
            ['K_{m, n}', 'complete bipartite graph', '$m$ vertices on Left, $n$ on Right, all $m \\cdot n$ cross-edges present', '$K_{3,3}$ (Utility Graph): $6$ vertices, $9$ edges, $3$-regular'],
            ['G \\text{ bipartite} \\iff \\text{no odd cycle}', 'bipartite / 2-colorable theorem', 'Alternating 2-coloring by BFS succeeds iff no edge connects two vertices at the same distance parity', 'Every tree and every hypercube $Q_d$ is bipartite!'],
            ['G_1 \\cong G_2', 'graph isomorphism', 'Edge-preserving vertex bijection $f: V_1 \\to V_2$', 'Must share $|V|, |E|$, degree sequence, and cycle counts'],
          ],
        },
        {
          figure: 'BipartiteWalksFig',
          caption: 'Inspect the adjacency matrix powers $A, A^2, A^3$ to count $k$-step walks between any pair of vertices, and test 2-coloring (bipartiteness) on $K_{3,3}$, $C_6$, and odd-cycle graphs.',
        },
        {
          worked: {
            title: 'Disproving Isomorphism: Why $C_6$ (a 6-cycle) and $C_3 \\cup C_3$ (two disjoint triangles) are NOT isomorphic',
            steps: [
              ['Check $|V|$ and $|E|$', 'Both have $|V| = 6$ vertices and $|E| = 6$ edges.', 'Same $|V|$ and $|E|$'],
              ['Check degree sequence', 'In both graphs, every vertex has degree $2$: $(2, 2, 2, 2, 2, 2)$.', 'Degree sequence alone does NOT distinguish them!'],
              ['Check connectivity / cycles / bipartite', '$C_6$ is **connected** and **bipartite** (no odd cycles), whereas $C_3 \\cup C_3$ is **disconnected** and contains two **odd cycles of length 3**!', 'Therefore $C_6 \\not\\cong C_3 \\cup C_3$! $\\blacksquare$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'How many edges does the complete bipartite graph $K_{4, 5}$ have?',
            answer: bipartiteEdges(4, 5),
            compute: () => bipartiteEdges(4, 5),
            explain: 'Every one of the $4$ vertices in $L$ connects to all $5$ vertices in $R$: $4 \\times 5 = 20$ edges.',
          },
        },
        {
          predict: {
            prompt: 'Let $A$ be the adjacency matrix of the 4-cycle $C_4$ ($1 - 2 - 3 - 4 - 1$). How many walks of length $k = 2$ go from vertex $1$ to its opposite vertex $3$, i.e. what is $(A^2)_{1,3}$?',
            answer: matPow([[0, 1, 0, 1], [1, 0, 1, 0], [0, 1, 0, 1], [1, 0, 1, 0]], 2)[0][2],
            compute: () => matPow([[0, 1, 0, 1], [1, 0, 1, 0], [0, 1, 0, 1], [1, 0, 1, 0]], 2)[0][2],
            explain: 'There are **2** walks of length 2 from $1$ to $3$: $1 \\to 2 \\to 3$ and $1 \\to 4 \\to 3$, so $(A^2)_{1,3} = 2$.',
          },
        },
        {
          choice: {
            prompt: 'Why is the $d$-dimensional hypercube $Q_d$ (vertices = $d$-bit strings, edges = strings differing in 1 bit) **always bipartite** for every dimension $d \\ge 1$?',
            options: [
              { text: 'Partition the vertices into $L = \\{\\text{strings with an EVEN number of } 1\\text{s}\\}$ and $R = \\{\\text{strings with an ODD number of } 1\\text{s}\\}$; flipping 1 bit always changes the parity of the number of $1$s, so every edge goes between $L$ and $R$!', why: 'Yes! Parity of the Hamming weight (number of 1-bits) gives an explicit 2-coloring of $Q_d$ in every dimension!' },
              { text: 'Only $Q_2$ (a square) is bipartite; $Q_3$ (a 3D cube) is not', why: 'Even $Q_3$ and $Q_{100}$ are bipartite—every cycle in a hypercube has even length!' },
              { text: 'Because $Q_d$ has no cycles at all', why: 'For $d \\ge 2$, $Q_d$ has many 4-cycles (squares), which are all *even* cycles.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'What does a **diagonal entry** $(A^2)_{ii}$ of the squared adjacency matrix $A^2$ of a simple graph always equal?',
            options: [
              { text: 'The degree $\\deg(i)$ of vertex $i$, because a 2-step walk from $i$ back to $i$ is simply stepping out along any incident edge $i \\to m$ and stepping right back $m \\to i$!', why: 'Yes! $(A^2)_{ii} = \\sum_m A_{im}^2 = \\sum_m A_{im} = \\deg(i)$, so the trace $\\operatorname{tr}(A^2) = \\sum \\deg(i) = 2|E|$!' },
              { text: 'Always $0$, because a simple graph has no self-loops', why: '$A_{ii} = 0$, but in $A^2$ a 2-step walk $i \\to m \\to i$ uses an ordinary edge twice.' },
              { text: 'The number of triangles containing vertex $i$', why: 'Triangles are closed walks of length **3** ($i \\to m \\to k \\to i$, counted by $(A^3)_{ii} / 2$), not length 2.' },
            ],
            answer: 0,
          },
        },
        {
          note: '**$(A^k)_{ij}$** counts $k$-step walks from $i$ to $j$. A graph is **bipartite** (2-colorable) iff it has **no odd cycles**. And to test **isomorphism**, check invariants ($|V|, |E|$, degree sequence, connectedness, cycle lengths) before constructing a bijection.',
        },
      ],
    },

    {
      id: 'paths-euler-hamilton',
      title: 'Connectivity, Königsberg’s bridges, Eulerian trails, and Hamiltonian cycles',
      goal: 'Use Euler’s degree-parity theorem to decide instantly whether a connected graph has an Eulerian circuit (0 odd vertices) or Eulerian trail (0 or 2 odd vertices), and contrast it with Hamiltonian cycles.',
      builds: ['representations-isomorphism'],
      blocks: [
        { h: '1736: How seven bridges in Königsberg gave birth to Graph Theory' },
        {
          md: `The city of Königsberg in Prussia was split by the Pregel River into **4 landmasses** ($A, B, C, D$) connected by **7 bridges**. Citizens wondered: *Can you take a walk that crosses **every one of the 7 bridges** once and only once?*

In 1736, Leonhard Euler realized that the shapes of the islands didn't matter at all—only the **4 vertices** ($A, B, C, D$) and the **7 edges** (bridges) joining them! That insight founded **graph theory**.
- An **Eulerian trail** is a walk that traverses **every edge** of $G$ **exactly once**.
- An **Eulerian circuit** is an Eulerian trail that **starts and ends at the same vertex**.

How did Euler solve the puzzle in two sentences?
Watch what happens at any **intermediate vertex** $v$ during your walk: every time you **enter** $v$ on one unused bridge, you must immediately **leave** $v$ on a *different* unused bridge!
So every visit to a vertex uses up **$2$ edges** (an entry + an exit), meaning every vertex except possibly the start and end **must have EVEN degree**!
In Königsberg, the 4 landmasses had degrees **$5, 3, 3, 3$**—all four odd! So an Eulerian walk was **impossible**!`,
        },
        { h: 'Euler (Every Edge Once) vs. Hamilton (Every Vertex Once)' },
        {
          md: `**Euler's Theorem (1736):** Let $G$ be a connected graph (ignoring isolated vertices).
1. $G$ has an **Eulerian circuit** $\\iff$ **every vertex has EVEN degree** ($0$ odd-degree vertices).
2. $G$ has an **Eulerian trail** (start $\\ne$ end) $\\iff$ $G$ has **exacty $2$ vertices of ODD degree** (and the trail *must* start at one odd vertex and end at the other!).
*(Notice why a graph can never have 1 odd vertex: by the Handshaking Lemma in lesson [[#graphs-handshaking]], the number of odd-degree vertices is always even: $0, 2, 4, \\dots$!)*

Now compare a **Hamiltonian path / cycle**: a path or cycle that visits **every VERTEX** of $G$ **exactly once**.
Despite sounding almost identical to Euler's problem, they live in completely different computational worlds:
- **Eulerian circuit:** Checked in **$O(|V| + |E|)$ linear time** just by checking vertex degrees!
- **Hamiltonian cycle:** **NP-Complete**—no simple necessary-and-sufficient local condition is known, and for large graphs it is one of the hardest search problems in computer science!`,
        },
        {
          symbols: [
            ['\\text{Eulerian circuit}', 'every edge once, closed loop', 'Exists in connected $G$ $\\iff$ **$0$ vertices of odd degree** (all degrees even)', '$C_n$, $K_5$ (all deg 4), $K_{2,4}$'],
            ['\\text{Eulerian trail}', 'every edge once, open walk', 'Exists in connected $G$ $\\iff$ **$0$ or $2$ vertices of odd degree**', 'With 2 odd vertices $u, v$, walk must start at $u$ and end at $v$'],
            ['\\text{Hamiltonian cycle}', 'every vertex once, closed cycle', 'Simple cycle of length $|V|$ visiting all vertices; NP-complete to decide', 'Dirac\'s sufficient condition: $\\forall v,\\,\\deg(v) \\ge |V|/2$'],
          ],
        },
        {
          figure: 'EulerBridgeFig',
          caption: 'Inspect the original 7 Bridges of Königsberg and trace Eulerian trails on classic networks by clicking edges in sequence.',
        },
        {
          worked: {
            title: 'Checking Eulerian & Hamiltonian properties on Complete Graphs $K_n$ and Bipartite $K_{m,n}$',
            steps: [
              ['$K_n$ Eulerian circuit?', 'Every vertex in $K_n$ has degree $n - 1$. All degrees are even $\\iff$ **$n$ is odd** ($K_3, K_5, K_7, \\dots$)!', 'For $K_4$ (deg 3,3,3,3), 4 odd vertices $\\implies$ no Euler trail!'],
              ['$K_n$ Hamiltonian cycle?', 'For **every $n \\ge 3$**, $1 \\to 2 \\to \\dots \\to n \\to 1$ is a Hamiltonian cycle!', '$K_4$ is Hamiltonian even though it is NOT Eulerian!'],
              ['$K_{m,n}$ Hamiltonian cycle?', 'Any cycle in a bipartite graph alternates $L \\to R \\to L \\to R$, using equal numbers of vertices from $L$ and $R$ $\\implies$ requires **$m = n \\ge 2$**!', '$K_{3,4}$ has NO Hamiltonian cycle because $|L|=3 \\ne |R|=4$!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'In the original 7 Bridges of Königsberg multigraph, the 4 landmasses have degrees $5, 3, 3, 3$. What is the **minimum number of bridges you must remove** so that the remaining connected graph has an **Eulerian trail** (which allows at most $2$ odd-degree vertices)?',
            answer: 1,
            compute: () => 1,
            explain: 'Removing just **1** bridge lowers the degrees of its two endpoints by $1$ each, flipping two odd degrees to even! That leaves only $4 - 2 = 2$ odd-degree vertices, so an Eulerian trail immediately exists!',
          },
        },
        {
          predict: {
            prompt: 'Among the complete graphs $K_3, K_4, K_5, K_6, K_7, K_8$, how many have an **Eulerian circuit**?',
            answer: [3, 4, 5, 6, 7, 8].filter(n => (n - 1) % 2 === 0).length,
            compute: () => [3, 4, 5, 6, 7, 8].filter(n => (n - 1) % 2 === 0).length,
            explain: 'In $K_n$, every vertex has degree $n - 1$, which is even when $n$ is odd: $K_3, K_5,$ and $K_7$ (**3** graphs).',
          },
        },
        {
          choice: {
            prompt: 'Can you draw a square with both of its diagonals ($K_4$: 4 corners, each connected to the other 3 corners, so 6 segments) in a single continuous pen stroke without lifting your pen or retracing a segment?',
            options: [
              { text: 'No! All $4$ corners have degree $3$ (odd), and an Eulerian trail exists if and only if at most $2$ vertices have odd degree', why: 'Yes! Because there are $4$ odd-degree vertices, any continuous pen stroke must miss at least one segment (or lift the pen once).' },
              { text: 'Yes, if you start in the middle where the diagonals cross', why: 'If the center crossing is not a vertex, the 4 corners have degree 3; even if you add a degree-4 vertex at the center, the 4 corners still have odd degree 3!' },
              { text: 'Yes, because 6 segments is an even number', why: 'Total edge count being even does not make vertex degrees even.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Why does the complete bipartite graph $K_{3, 5}$ have **no** Hamiltonian path or Hamiltonian cycle?',
            options: [
              { text: 'Because any path in a bipartite graph must alternate $L - R - L - R \\dots$, so the sizes of $L$ and $R$ along a path can differ by **at most $1$** ($||L| - |R|| \\le 1$), whereas $|5 - 3| = 2 > 1$!', why: 'Yes! Parity of alternation between $L$ and $R$ rules out a Hamiltonian cycle whenever $m \\ne n$ and rules out a Hamiltonian path whenever $|m - n| > 1$!' },
              { text: 'Because $K_{3, 5}$ is disconnected', why: '$K_{3, 5}$ is completely connected between $L$ and $R$.' },
              { text: 'Because $3$ and $5$ are both odd', why: '$K_{3, 3}$ has odd parts ($3$ and $3$) and DOES have a Hamiltonian cycle!' },
            ],
            answer: 0,
          },
        },
        {
          puzzle: {
            id: 'graphs',
            title: 'Euler Trail, Graph Coloring & Spanning Tree Studio',
            desc: 'Trace Euler trails and solve graph coloring & MST puzzles in the Puzzles tab.',
          },
        },
        {
          note: '**Eulerian** = every **edge** once (count odd-degree vertices: **$0$** for a circuit, **$2$** for an open trail, **$4+$** impossible!). **Hamiltonian** = every **vertex** once (NP-complete; on bipartite graphs, check $||L| - |R||$!).',
        },
      ],
    },

    {
      id: 'trees-spanning',
      title: 'Trees, |E| = |V| − 1, rooted trees, and Minimum Spanning Trees',
      goal: 'Prove that every tree on $n$ vertices has exactly $n - 1$ edges and at least 2 leaves, count labeled trees with Cayley’s formula $n^{n-2}$, and find Minimum Spanning Trees using Kruskal’s and Prim’s greedy algorithms.',
      builds: ['paths-euler-hamilton', 'induction'],
      blocks: [
        { h: 'The skeleton of a connected network: Connected + Acyclic = Tree' },
        {
          md: `A **tree** is a connected undirected graph that contains **no cycles**. (A graph with no cycles that isn't necessarily connected is a **forest**—a disjoint union of trees.)

Trees sit right on the knife-edge between having **too few edges to be connected** and **too many edges to avoid cycles**. For a graph $G$ with $n = |V| \\ge 1$ vertices, any **two** of the following three properties automatically imply the third (and define a tree!):
1. $G$ is **connected**.
2. $G$ is **acyclic** (contains no cycles).
3. $G$ has **$|E| = n - 1$ edges**.

Furthermore, in any tree, there is a **unique simple path** between every pair of vertices, and every tree with $n \\ge 2$ vertices has **at least $2$ leaves** (vertices of degree $1$).
*Why does $|E| = n - 1$ hold for every tree?*
By induction on $n$: for $n = 1$, $|E| = 0 = 1 - 1$. For $n \\ge 2$, walk along edges without repeating until you can go no further; since there are no cycles, you must get stuck at a **leaf** $v$ of degree $1$! Pruning leaf $v$ and its $1$ incident edge leaves a tree on $n - 1$ vertices, which by the Inductive Hypothesis has $(n - 1) - 1 = n - 2$ edges; adding $v$'s edge back gives $(n - 2) + 1 = n - 1$ edges! $\\blacksquare$`,
        },
        { h: 'Spanning Trees and Kruskal’s / Prim’s Greedy MST Algorithms' },
        {
          md: `Given a connected weighted graph $G = (V, E, w)$ (say, cities with road construction costs), a **spanning tree** is a subgraph $T \\subseteq G$ that is a tree and includes **all $|V| = n$ vertices** (using $n - 1$ edges). A **Minimum Spanning Tree (MST)** is a spanning tree with the smallest possible total edge weight $\\sum_{e \\in T} w(e)$.

Remarkably, two simple **greedy algorithms** always find an exact MST:
- **Kruskal's Algorithm (Sort edges cheapest-first):** Sort all edges by weight $w(e_1) \\le w(e_2) \\le \\dots$; step through them in order and **add edge $e$ unless it forms a cycle** with the edges already chosen, stopping once you have $n - 1$ edges!
- **Prim's Algorithm (Grow one connected tree):** Start from any vertex $v_0$; at each step, add the **cheapest edge that crosses the cut** from your current tree to a vertex not yet in the tree!`,
        },
        {
          symbols: [
            ['|E| = |V| - 1', 'Tree edge formula', 'Every tree on $n$ vertices has $n - 1$ edges; a forest with $c$ components has $|V| - c$ edges', '100 computers connected as a tree use 99 cables'],
            ['\\sum_{v \\in V} \\deg(v) = 2n - 2', 'Tree degree sum', 'Combines Handshaking ($2|E|$) with $|E| = n - 1$', 'Determines how many leaves a tree must have!'],
            ['n^{n-2}', 'Cayley\'s Formula', 'Number of distinct spanning trees on $n$ labeled vertices $\\{1, \\dots, n\\}$ (in $K_n$)', 'For $n=4$: $4^2 = 16$ labeled trees'],
            ['n = m \\cdot i + 1', 'full m-ary tree node formula', 'A full $m$-ary tree with $i$ internal nodes (each having $m$ children) has $m\\cdot i + 1$ total nodes and $(m-1)i + 1$ leaves', 'Full binary tree ($m=2$): $i$ internal nodes $\\implies i + 1$ leaves!'],
          ],
        },
        {
          figure: 'TreeMstFig',
          caption: 'Step through Kruskal’s greedy Minimum Spanning Tree algorithm edge by edge: watch safe edges join components while cycle-creating edges get rejected until $|V| - 1$ edges span the network.',
        },
        {
          worked: {
            title: 'Using $\\sum \\deg(v) = 2n - 2$ to find how many leaves a tree has',
            steps: [
              ['Problem setup', 'A tree $T$ has $3$ vertices of degree $4$, $2$ vertices of degree $3$, and all other vertices are leaves (degree $1$). How many leaves $L$ does $T$ have?', 'Let $L$ be the number of degree-1 vertices'],
              ['Total vertices $n$', '$n = 3 + 2 + L = 5 + L$.', 'Count all vertices'],
              ['Handshaking + Tree formula', '$\\sum \\deg(v) = 3(4) + 2(3) + L(1) = 18 + L = 2n - 2 = 2(5 + L) - 2 = 8 + 2L$.', 'Equate $\\sum \\deg(v)$ to $2n - 2$'],
              ['Solve for $L$', '$18 + L = 8 + 2L \\implies L = 10$ leaves (and $n = 15$ total vertices, $|E| = 14$ edges)!', 'Works for any tree degree puzzle'],
            ],
          },
        },
        {
          predict: {
            prompt: 'A connected network has $|V| = 15$ routers and $|E| = 22$ cables. How many cables must you remove to reduce the network to a **spanning tree** (keeping all 15 routers connected with zero cycles)?',
            answer: 22 - treeEdges(15),
            compute: () => 22 - treeEdges(15),
            explain: 'Every spanning tree on $15$ vertices has $15 - 1 = 14$ edges. So you must remove $22 - 14 = 8$ cycle edges.',
          },
        },
        {
          predict: {
            prompt: 'A forest (an acyclic graph) has $|V| = 20$ vertices and consists of $c = 4$ disconnected trees (connected components). How many edges $|E|$ does the forest have in total?',
            answer: 20 - 4,
            compute: () => 20 - 4,
            explain: 'The $i$-th tree has $n_i - 1$ edges; summing across all $c = 4$ trees gives $\\sum (n_i - 1) = |V| - c = 20 - 4 = 16$ edges.',
          },
        },
        {
          predict: {
            prompt: 'By **Cayley\'s Formula** $n^{n-2}$, how many distinct spanning trees does the complete graph $K_5$ on 5 labeled vertices $\\{1, 2, 3, 4, 5\\}$ have?',
            answer: cayleyTrees(5),
            compute: () => cayleyTrees(5),
            explain: '$5^{5-2} = 5^3 = 125$ labeled spanning trees.',
          },
        },
        {
          choice: {
            prompt: 'A knockout single-elimination tennis tournament starts with $117$ players. In each match, 2 players play and 1 loser is eliminated until 1 champion remains. How many matches are played in the entire tournament?',
            options: [
              { text: '$116$ matches ($n - 1$), because the tournament bracket is a full binary tree with $117$ leaves (or even simpler: every match eliminates exactly $1$ player, and $116$ players must be eliminated to leave $1$ champion!)', why: 'Yes! In any full binary tree with $L$ leaves, there are $i = L - 1$ internal nodes (matches)!' },
              { text: '$117$ matches', why: '1 player (the champion) is never eliminated, so $117 - 1 = 116$ matches occur.' },
              { text: 'It depends on how many byes are given in the first round', why: 'No matter how byes are arranged, every match still eliminates 1 player, so it is always $117 - 1 = 116$!' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Why is every single edge $e$ of a tree $T$ a **bridge** (removing $e$ splits $T$ into 2 disconnected components), whereas adding any new edge between two non-adjacent vertices of $T$ creates **exactly 1 cycle**?',
            options: [
              { text: 'Because in a tree there is a **unique simple path** between every pair of vertices $u, v$: deleting an edge $e = \\{u,v\\}$ destroys the only path between $u$ and $v$, while adding a new edge $e = \\{u,v\\}$ joins the unique path $u \\rightsquigarrow v$ into a single cycle!', why: 'Yes! Trees are both *minimally connected* (every edge is essential for connectivity) and *maximally acyclic* (any added edge closes a cycle).' },
              { text: 'Only edges incident to leaves are bridges', why: 'Every edge in a tree—even in the middle—disconnects the tree when removed!' },
              { text: 'Adding one edge to a tree can create 2 or 3 cycles', why: 'Because the path between $u$ and $v$ in the tree was unique, adding edge $\\{u,v\\}$ creates *only* the one cycle formed by that path plus $\\{u,v\\}$.' },
            ],
            answer: 0,
          },
        },
        {
          note: 'Three numbers to know cold for any tree on $n$ vertices: **$|E| = n - 1$**, **$\\sum \\deg(v) = 2n - 2$**, and **$0$ cycles**. For a forest with $c$ components, **$|E| = |V| - c$**.',
        },
      ],
    },

    {
      id: 'planar-coloring',
      title: 'Planar graphs, Euler’s formula V − E + F = 2, and graph coloring χ(G)',
      goal: 'Apply Euler’s Planar Formula $V - E + F = 2$ and the bound $E \\le 3V - 6$ to prove $K_5$ and $K_{3,3}$ are non-planar, and find the chromatic number $\\chi(G)$ of graphs and maps.',
      builds: ['trees-spanning'],
      blocks: [
        { h: 'Drawing a network without crossing edges: Euler’s V − E + F = 2' },
        {
          md: `A graph is **planar** if it can be drawn in the flat 2D plane so that **no two edges cross** except at their shared endpoints. Such a crossing-free drawing divides the plane into bounded regions (plus $1$ unbounded outer region!), called **faces** ($F$).

**Euler's Planar Formula (1752):** For any connected planar graph drawn in the plane with $V$ vertices, $E$ edges, and $F$ faces (including the outer infinite face),
$$V - E + F = 2$$

*Proof by induction on the number of cycles:*
- **Base case ($F = 1$, a tree):** A tree has no cycles, so it encloses only the $1$ outer face ($F = 1$). Since $E = V - 1$ (lesson [[#trees-spanning]]), $V - (V - 1) + 1 = 2$!
- **Inductive step:** If $G$ has a cycle, deleting $1$ edge on that cycle merges the two faces on either side of that edge into one, reducing $E$ by $1$ and $F$ by $1$, which leaves $V - E + F$ unchanged! $\\blacksquare$

From $V - E + F = 2$, we get two powerful **edge-count upper bounds** for any connected simple planar graph with $V \\ge 3$:
1. **General planar bound ($E \\le 3V - 6$):** Every face is bounded by at least $3$ edges, and each edge borders at most $2$ faces, so $3F \\le 2E \\implies F \\le \\frac{2}{3}E$. Plugging into $2 = V - E + F \\le V - \\frac{1}{3}E$ gives **$E \\le 3V - 6$**!
   *(For **$K_5$**: $V = 5, E = 10$, and $3(5) - 6 = 9 < 10$—so **$K_5$ is non-planar**!)*
2. **Triangle-free / Bipartite planar bound ($E \\le 2V - 4$):** With no triangles ($C_3$), every face needs at least $4$ edges ($4F \\le 2E \\implies F \\le \\frac{1}{2}E$), giving **$E \\le 2V - 4$**!
   *(For **$K_{3,3}$**: $V = 6, E = 9$, and $2(6) - 4 = 8 < 9$—so **$K_{3,3}$ is non-planar**!)*`,
        },
        { h: 'Graph Coloring and the Chromatic Number χ(G)' },
        {
          md: `A **proper vertex coloring** of $G$ assigns a color to each vertex so that **no two adjacent vertices share the same color**. The **chromatic number $\\chi(G)$** is the **minimum** number of colors needed:
- **Bipartite graphs (and trees):** $\\chi(G) = 2$ (when $|E| \\ge 1$).
- **Even cycles $C_{2k}$:** $\\chi(C_{2k}) = 2$.
- **Odd cycles $C_{2k+1}$:** $\\chi(C_{2k+1}) = 3$ (alternating two colors around an odd cycle leaves the first and last vertex adjacent with the same color, requiring a $3$rd color!).
- **Complete graph $K_n$:** $\\chi(K_n) = n$ (all $n$ vertices are mutually adjacent).
- **The Four Color Theorem (Appel & Haken, 1976):** Every **planar** graph satisfies **$\\chi(G) \\le 4$**!

Why does graph coloring show up everywhere in engineering? Because **vertices = tasks/variables** and **edges = conflicts** (two exams with shared students cannot be scheduled in the same time slot; two CPU variables alive at the same time cannot share a register; two nearby radio towers cannot use the same frequency)—so $\\chi(G)$ is the minimum number of time slots, registers, or frequencies needed!`,
        },
        {
          symbols: [
            ['V - E + F = 2', 'Euler\'s Planar Formula', 'Holds for every connected planar drawing (counting the unbounded outer region as 1 face) and every 3D convex polyhedron!', 'Cube: $8 - 12 + 6 = 2$; Icosahedron: $12 - 30 + 20 = 2$'],
            ['E \\le 3V - 6,\\;E \\le 2V - 4', 'planar edge bounds', 'Any simple planar graph ($V\\ge 3$) has $E \\le 3V - 6$ (and $E \\le 2V - 4$ if bipartite/triangle-free)', 'Proves $K_5$ ($10 > 9$) and $K_{3,3}$ ($9 > 8$) are non-planar!'],
            ['\\chi(G)', 'chromatic number of G', 'Minimum number of colors in a proper vertex coloring ($\\{u,v\\}\\in E \\Rightarrow c(u) \\ne c(v)$)', '$\\chi(K_n) = n$; $\\chi(C_{\\text{odd}}) = 3$; planar $\\chi(G) \\le 4$'],
            ['\\omega(G) \\le \\chi(G) \\le \\Delta(G) + 1', 'clique & greedy coloring bounds', '$\\chi(G)$ is at least the largest clique size $\\omega(G)$ and at most (max degree $\\Delta(G)$) $+ 1$', 'Greedy coloring never uses more than $\\Delta(G) + 1$ colors!'],
          ],
        },
        {
          figure: 'PlanarColoringFig',
          caption: 'Color the vertices of classic graphs ($C_5$, Wheel $W_5$, Petersen subgraph, Planar map) to find $\\chi(G)$, and verify Euler’s formula $V - E + F = 2$.',
        },
        {
          worked: {
            title: 'Using $E \\le 3V - 6$ to prove every planar graph has a vertex of degree $\\le 5$',
            steps: [
              ['1. Assume the opposite', 'Suppose a simple planar graph $G$ ($V \\ge 3$) had $\\deg(v) \\ge 6$ for **every** vertex $v$.', 'Proof by contradiction'],
              ['2. Sum the degrees', '$2E = \\sum_{v \\in V} \\deg(v) \\ge 6V \\implies E \\ge 3V$.', 'By Handshaking Lemma'],
              ['3. Compare with Euler\'s bound', 'For any planar graph, $E \\le 3V - 6 < 3V$—contradiction! $\\blacksquare$', 'Guarantees a vertex of degree $\\le 5$ (making 6-coloring by induction effortless!)'],
            ],
          },
        },
        {
          predict: {
            prompt: 'A connected planar graph is drawn in the plane with $V = 8$ vertices and $E = 13$ edges (with no crossing edges). Into how many **faces** $F$ (including the outer infinite face) does it divide the plane?',
            answer: planarFaces(8, 13),
            compute: () => planarFaces(8, 13),
            explain: 'By Euler\'s Formula $V - E + F = 2$: $8 - 13 + F = 2 \\implies F = 2 - 8 + 13 = 7$ faces.',
          },
        },
        {
          predict: {
            prompt: 'What is the maximum number of edges $E_{\\max} = 3V - 6$ that a simple planar graph on $V = 10$ vertices can possibly have?',
            answer: planarMaxEdges(10),
            compute: () => planarMaxEdges(10),
            explain: '$3(10) - 6 = 24$ edges (achieved when every face, including the outer face, is a triangle—a planar triangulation!).',
          },
        },
        {
          predict: {
            prompt: 'The **Wheel graph $W_5$** consists of a 5-cycle $C_5$ on the rim plus $1$ central hub vertex connected to all $5$ rim vertices ($6$ vertices total). What is its chromatic number $\\chi(W_5)$?',
            answer: wheelChromatic(5),
            compute: () => wheelChromatic(5),
            explain: 'The outer odd cycle $C_5$ requires $3$ colors. Because the central hub is adjacent to **every** vertex on the rim, the hub cannot reuse any of the rim\'s 3 colors and needs a $4$th color: $\\chi(W_5) = 3 + 1 = 4$!',
          },
        },
        {
          choice: {
            prompt: 'Why didn\'t the inequality $E \\le 3V - 6$ prove that $K_{3,3}$ ($V = 6, E = 9$) is non-planar, and why did we need $E \\le 2V - 4$ instead?',
            options: [
              { text: 'For $K_{3,3}$, $3V - 6 = 3(6) - 6 = 12 \\ge 9$, which passes! Because $K_{3,3}$ is **bipartite**, it has no triangles ($C_3$), so every face must have $\\ge 4$ sides ($4F \\le 2E$), tightening the bound to $E \\le 2V - 4 = 8 < 9$!', why: 'Yes! $E \\le 3V - 6$ is a necessary condition (not sufficient); using the fact that $K_{3,3}$ has girth 4 (shortest cycle length 4) gives $E \\le 2V - 4 = 8$, which catches $K_{3,3}$!' },
              { text: '$K_{3,3}$ is actually planar', why: '$K_{3,3}$ (the Three Utilities graph) is one of the two fundamental non-planar Kuratowski graphs ($K_5$ and $K_{3,3}$).' },
              { text: 'Because $K_{3,3}$ has 9 vertices', why: '$K_{3,3}$ has $3 + 3 = 6$ vertices and $3 \\times 3 = 9$ edges.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'According to **Kuratowski\'s Theorem**, how do $K_5$ and $K_{3,3}$ characterize **every** non-planar graph in the universe?',
            options: [
              { text: 'A graph $G$ is planar if and only if it contains no subgraph that is a subdivision of $K_5$ or $K_{3,3}$ (meaning $K_5$ and $K_{3,3}$ are the **only two root causes** of non-planarity!)', why: 'Yes! Every non-planar graph ever drawn fails to be planar because it hides a $K_5$ or a $K_{3,3}$ inside it!' },
              { text: 'Every non-planar graph has at least 10 edges', why: '$K_{3,3}$ is non-planar and has only 9 edges.' },
              { text: 'Every planar graph is bipartite', why: '$K_4$ and $C_3$ are planar and not bipartite.' },
            ],
            answer: 0,
          },
        },
        {
          puzzle: {
            id: 'graphs',
            title: 'Play Vertex Coloring & Kruskal’s MST',
            desc: 'Color planar and non-planar graphs with χ(G) colors in the Puzzles & Challenges tab.',
          },
        },
        {
          note: '**Euler\'s Planar Formula** $V - E + F = 2$ implies $E \\le 3V - 6$ (killing $K_5$) and $E \\le 2V - 4$ for triangle-free graphs (killing $K_{3,3}$). For **coloring**, check the largest clique $\\omega(G)$, odd cycles ($\chi = 3$), and hub vertices!',
        },
      ],
    },
  ],
}
