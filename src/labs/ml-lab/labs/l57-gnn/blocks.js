// Lesson order for Lab 57: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l57-graphs': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 20–23, 26, 45 and 56", body: [
      "Lab 56: label propagation spreads known labels along a similarity graph. Lab 45: a graph's edges say which variables depend on which.",
      "Lab 26: attention lets each item gather information from the others, weighted. A graph neural network does the same along a graph's edges, trained like any network (Labs 20–23)."
    ] } }, { p: 1 },
    { predict: { prompt: 'A graph has 1,000,000 nodes, each with 10 neighbours on average. How many entries do its neighbour lists hold in total?', answer: 10000000, explain: '1,000,000 × 10 = 10 million (each edge appears in both endpoints’ lists), against 10¹² entries for a dense adjacency matrix.' } },
    { p: 2 }, { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l57-mp': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'In a tree where every node has 4 neighbours, how many nodes lie within 2 hops of a node, counting the node itself?', answer: 17, explain: '1 + 4 + 4 × 3 = 17: each neighbour has 3 further neighbours besides the node you started from.', misconceptions: [{ answer: 21, feedback: 'Each neighbour’s 4 links include the one back to the start: only 3 are new.' }] } },
    { figure: 'ReceptiveField', caption: 'The playground’s graph. Grow the number of layers and watch the receptive field of one node.' },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l57-gcn': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'Nodes i and j are linked and have 3 and 8 neighbours. With self-loops added, what is Âᵢⱼ = 1/√(dᵢ dⱼ)? (Three decimals.)', answer: 0.167, tolerance: 0.0006, explain: 'Self-loops raise the degrees to 4 and 9: 1/√36 = 1/6 ≈ 0.167.', misconceptions: [{ answer: 0.204, feedback: 'Add the self-loop to each degree first: 4 and 9, not 3 and 8.' }] } },
    { p: 2 },
    { figure: 'GcnVsMlp', caption: 'The playground’s GCN and MLP on the unlabelled nodes, for five choices of labelled nodes.' },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l57-depth': [
    { p: 0 },
    { predict: { prompt: 'A 3-layer GCN maps 8 features to 16 hidden units, 16 to 16, and 16 to 3 classes. How many weights, excluding biases?', answer: 432, explain: '8 × 16 + 16 × 16 + 16 × 3 = 128 + 256 + 48 = 432, whatever the size of the graph.' } },
    { p: 1 },
    { figure: 'SmoothingFig', caption: 'Untrained propagation on the playground’s graph: a nearest-centroid probe and the spread of the features.' },
    { cell: 0 },
    { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l57-practice': [
    { p: 0 }, { p: 1 }, { p: 2 }, { p: 3 },
    { predict: { prompt: 'A graph has 1,000 edges. You hold out 20% as test edges for link prediction. How many edges may the message-passing graph keep?', answer: 800, explain: 'The 200 test edges must be removed from the graph the GNN propagates over; otherwise the model sees the answers.' } },
    { cell: 0 },
    { p: 4 },
    { math: true },
    { ladder: 'gnn' },
  ],
}
