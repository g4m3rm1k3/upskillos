// cpp-dsa — Lesson 9: Binary Tree
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 09 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-09-binary-tree',
  slug: 'binary-tree',
  chapter: 3,
  order: 1,
  title: 'Binary Tree',
  subtitle: 'Trees, Heaps, and Graphs',
  tags: ['binary-tree', 'node', 'root', 'leaf', 'left-child-right-child', 'traversal'],

  hook: {
    question: 'What is "Binary Tree", and why does it matter?',
    realWorldContext: 'You will build a hierarchical data structure from scratch using connected nodes to represent relationships that are not strictly linear. You will implement a binary tree and write recursive functions to traverse its elements in three specific orders, proving how traversal choice guarantees different visit sequences.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: Node Structure and the Root, Inorder Traversal, Preorder Traversal, Postorder Traversal.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Binary Tree:** A hierarchical data structure where each element has at most two outgoing connections. It exists To represent data with branching relationships, or to organize data to make search and insertion significantly faster than a flat linear array.\n- **Node:** The fundamental container block in a tree. It exists To package a piece of data together with the pointers that connect it to its descendants.\n- **Root:** The single topmost node in a tree. It exists To serve as the definitive entry point for the entire structure; if you lose the root, you lose the tree.\n- **Leaf:** A node that has no children. It exists To represent the absolute bottom edges of the structure, serving as the natural base case where recursive operations stop.\n- **Left Child / Right Child:** The specific left or right descending connection from a node. It exists To give structural meaning to position; in many algorithms, going left implies a different rule than going right.\n- **Traversal:** The process of visiting every node in a tree exactly once. It exists To serialize or inspect a multi-dimensional structure into a flat sequence of actions.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **TreeNode:** A custom structure representing a single element in the tree.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'A single tree structure—built of `TreeNode` blocks connected by `left` and `right` pointers—can be serialized in completely different ways purely by shifting the timing of the visit action inside a recursive function. When you call `inorder(root)`, the 10 waits for the left subtree, printing exactly in the middle. When you call `preorder(root)`, the 10 prints immediately, serving as a structural anchor. When you call `postorder(root)`, the 10 prints dead last, proving it safely waited for its entire dependency chain to resolve. The data structure didn\'t change; the recursive guarantee did.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you accidentally write a cycle into your tree creation, your traversals will fatally loop. Modify the `preorder` setup to intentionally cause a cycle: \n\n```cpp\nTreeNode* root = new TreeNode(10);\nroot->left = new TreeNode(5);\nroot->left->left = root; // Cycle! 5\'s left child points back to the root.\n\npreorder(root);\n```\n\n**The compiler error (Runtime failure):** `Segmentation fault (core dumped)` Because the tree rule is violated, `preorder(root)` visits 10, goes left to 5, goes left back to 10, goes left to 5, infinitely repeating until the system call stack exhausts its memory limit and the operating system violently kills the process.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Sum the Tree:** Write a recursive function `int sumTree(TreeNode* node)` that returns the total sum of all `data` fields in the tree. (Hint: Think postorder—sum the left, sum the right, add your own data, and return it).\n- **Count Leaves:** Write a recursive function `int countLeaves(TreeNode* node)` that returns the number of nodes that have no children.\n- **Safe Deletion:** Write a `void destroyTree(TreeNode* node)` function that uses the postorder pattern to safely call `delete node;` only after its children have been recursively deleted. Call it at the end of `main`.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and run the basic `TreeNode` structure and accessed child properties.\n- [ ] You have run an Inorder traversal and observed the elements printing from bottom-left inward.\n- [ ] You have run a Preorder traversal and observed the parent printing before any of its descendants.\n- [ ] You have run a Postorder traversal and observed the root printing absolutely last.\n- [ ] You can explain out loud why a postorder traversal is the only safe way to manually delete a tree.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 9: Binary Tree',
        caption: 'Binary Tree',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Node Structure and the Root',
              prose: [
                'Linear structures like vectors and linked lists force a strictly one-after-another sequence. If you want to model a decision tree, a family tree, or a structure where data naturally splits into multiple paths, a linear sequence fails. You need a structure where one element can point to multiple subsequent elements.',
                '## How the Code Works',
                '- `struct TreeNode`: Defines a new composite data type. Unlike a linked list node with one `next` pointer, this contains two.\n- `int data;`: The actual payload this node holds.\n- `TreeNode* left;`: A pointer to another `TreeNode` representing the left branch.\n- `TreeNode* right;`: A pointer to another `TreeNode` representing the right branch.\n- `TreeNode(int value)`: The constructor. It assigns the payload and explicitly initializes both child pointers to `nullptr`, guaranteeing that a newly created node is safely recognized as a leaf.\n- `TreeNode* root = new TreeNode(10);`: Dynamically allocates the topmost node of the tree and holds its memory address in `root`.\n- `root->left = new TreeNode(5);`: Allocates a new node and attaches it to the `left` pointer of the `root`.\n- `root->right = new TreeNode(15);`: Allocates another node and attaches it to the `right` pointer.\n- `root->left->data`: Chained pointer access. It follows the root\'s left pointer to the child node, and reads its `data` field.',
                '**CS lens.** This is a **directed acyclic graph** restricted to at most two outgoing edges per node. By strictly forbidding cycles (a child pointing back to an ancestor), the tree guarantees that you can follow pointers infinitely downward without ever entering an infinite loop. Also recognized in: abstract syntax trees in compilers, the Document Object Model (DOM) in web browsers, and file system directory hierarchies.',
                '**SE lens.** The alternative not chosen is storing tree relationships implicitly in a flat array (like a binary heap). The tradeoff is flexibility: the pointer-based node structure allows you to graft or prune entire subtrees simply by reassigning a single pointer in constant time, whereas an array-backed tree would require shifting massive amounts of memory.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct TreeNode {\n    int data;\n    TreeNode* left;\n    TreeNode* right;\n    \n    TreeNode(int value) {\n        data = value;\n        left = nullptr;\n        right = nullptr;\n    }\n};\n\nint main() {\n    TreeNode* root = new TreeNode(10);\n    root->left = new TreeNode(5);\n    root->right = new TreeNode(15);\n    \n    std::cout << "Root: " << root->data << "\\n";\n    std::cout << "Left child: " << root->left->data << "\\n";\n    std::cout << "Right child: " << root->right->data << "\\n";\n    \n    // Cleanup\n    delete root->left;\n    delete root->right;\n    delete root;\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Inorder Traversal',
              prose: [
                'Now that you have a branching structure, a simple `for` loop no longer works. You need an algorithm that systematically visits every node in the tree without missing any or visiting any twice. Specifically, if you want to visit the left side, then the current node, and then the right side, you need a recursive strategy.',
                '## How the Code Works',
                '- `void inorder(TreeNode* node)`: A function that takes a pointer to a tree node and returns nothing, designed to be called recursively.\n- `if (node == nullptr)`: The recursive base case. If the traversal steps off the bottom of a leaf, the pointer is null.\n- `return;`: Immediately stops execution for this specific call, preventing null pointer dereferences and unwinding the call stack back to the parent.\n- `inorder(node->left);`: The function pauses its own execution and recursively calls itself on the left child. This ensures the entire left subtree is processed before the current node does anything else.\n- `std::cout << node->data << " ";`: The "visit" action. This prints the node\'s payload. Crucially, this happens *after* the left recursive call finishes, but *before* the right recursive call begins.\n- `inorder(node->right);`: After printing its own data, the function recursively processes the entire right subtree.\n- `inorder(10)` — Passes the root. Not null. Calls `inorder(5)`.\n- `inorder(5)` — Not null. Calls `inorder(2)`.\n- `inorder(2)` — Not null. Calls `inorder(nullptr)`.\n- `inorder(nullptr)` — Hits the base case, returns immediately.\n- `inorder(2)` resumes — Prints `2`. Calls right child `inorder(nullptr)`, which returns. `inorder(2)` finishes.\n- `inorder(5)` resumes — Prints `5`. Calls right child `inorder(7)`.',
                '**CS lens.** Inorder traversal strictly guarantees a **Left, Root, Right** visit order. When applied to a Binary Search Tree (where left children are smaller and right children are larger), an inorder traversal will naturally visit the elements in perfectly sorted ascending order.',
                '**SE lens.** The alternative not chosen is an iterative traversal using a manual `std::stack`. The tradeoff is code complexity versus call stack safety. Recursion relies on the system call stack to remember where it is, making the code elegant and minimal, but a maliciously deep tree could cause a stack overflow. Iterative traversal uses heap memory (a stack object), avoiding stack overflows at the cost of significantly harder-to-read boilerplate.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct TreeNode {\n    int data;\n    TreeNode* left;\n    TreeNode* right;\n    TreeNode(int value) { data = value; left = nullptr; right = nullptr; }\n};\n\nvoid inorder(TreeNode* node) {\n    if (node == nullptr) {\n        return;\n    }\n    inorder(node->left);\n    std::cout << node->data << " ";\n    inorder(node->right);\n}\n\nint main() {\n    TreeNode* root = new TreeNode(10);\n    root->left = new TreeNode(5);\n    root->right = new TreeNode(15);\n    root->left->left = new TreeNode(2);\n    root->left->right = new TreeNode(7);\n    \n    std::cout << "Inorder: ";\n    inorder(root);\n    std::cout << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Preorder Traversal',
              prose: [
                'Inorder traversal visits the bottom-left first. But if you want to serialize the tree to a file, or create an exact structural clone of the tree, visiting the children before the parent makes reconstruction impossible because you won\'t know what node is the root. You need an order that guarantees a parent is visited *before* any of its children.',
                '## How the Code Works',
                '- `void preorder(TreeNode* node)`: The recursive function for preorder traversal.\n- `std::cout << node->data << " ";`: The "visit" action happens **first**. The node processes its own payload before even looking at its children.\n- `preorder(node->left);`: Recursively processes the entire left subtree.\n- `preorder(node->right);`: Recursively processes the entire right subtree.\n- `preorder(10)` — Prints `10` immediately. Then calls `preorder(5)`.\n- `preorder(5)` — Prints `5` immediately. Then calls `preorder(2)`.\n- `preorder(2)` — Prints `2` immediately. Both children are null, so it finishes.\n- `preorder(5)` resumes — Calls right child `preorder(7)`.\n- `preorder(7)` — Prints `7`.',
                '**CS lens.** Preorder traversal strictly guarantees a **Root, Left, Right** visit order. Because the root of any given subtree is processed before its descendants, it is the standard algorithm used to copy or serialize a tree. If you insert elements into a new binary tree in preorder sequence, the new tree will have the exact same shape as the original.',
                '**SE lens.** The alternative not chosen is Level-Order (Breadth-First) traversal, which visits nodes row-by-row top-down using a queue. Preorder is a Depth-First Search (DFS) algorithm, diving down to the leaves before exploring sibling branches. Preorder uses strictly less memory than breadth-first for deep, narrow trees because its memory usage scales with tree depth, not tree width.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct TreeNode {\n    int data;\n    TreeNode* left;\n    TreeNode* right;\n    TreeNode(int value) { data = value; left = nullptr; right = nullptr; }\n};\n\nvoid preorder(TreeNode* node) {\n    if (node == nullptr) return;\n    \n    std::cout << node->data << " ";\n    preorder(node->left);\n    preorder(node->right);\n}\n\nint main() {\n    TreeNode* root = new TreeNode(10);\n    root->left = new TreeNode(5);\n    root->right = new TreeNode(15);\n    root->left->left = new TreeNode(2);\n    root->left->right = new TreeNode(7);\n    \n    std::cout << "Preorder: ";\n    preorder(root);\n    std::cout << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Postorder Traversal',
              prose: [
                'Sometimes a parent node cannot do its job until its children have completely finished theirs. For example, if you are writing a destructor to clean up the tree\'s memory, deleting the parent first destroys the pointers you need to find the children. You need an order that guarantees a parent is visited *only after* all its descendants have been fully processed.',
                '## How the Code Works',
                '- `void postorder(TreeNode* node)`: The recursive function for postorder traversal.\n- `postorder(node->left);`: Recursively processes the entire left subtree first.\n- `postorder(node->right);`: Recursively processes the entire right subtree second.\n- `std::cout << node->data << " ";`: The "visit" action happens **last**. The node only processes its own payload after both recursive child calls have completely finished and returned.\n- `postorder(10)` — Calls `postorder(5)`.\n- `postorder(5)` — Calls `postorder(2)`.\n- `postorder(2)` — Left is null, right is null. Prints `2`. Finishes.\n- `postorder(5)` resumes — Calls `postorder(7)`.\n- `postorder(7)` — Left is null, right is null. Prints `7`. Finishes.\n- `postorder(5)` resumes — Both children finished. Prints `5`. Finishes.',
                '**CS lens.** Postorder traversal strictly guarantees a **Left, Right, Root** visit order. It is an inherently "bottom-up" approach. Also recognized in: postfix mathematical notation (Reverse Polish Notation) calculators, computing the total size of a directory on disk (you must sum the files inside before you know the folder\'s size), and safely destroying dynamic graph structures.',
                '**SE lens.** The alternative not chosen is using smart pointers (`std::unique_ptr`) to implicitly handle the destruction. If a `TreeNode` uses `std::unique_ptr<TreeNode> left`, the compiler will automatically generate a postorder-like destruction sequence when the root goes out of scope. We write it manually here to understand the algorithmic guarantee that makes safe destruction possible.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct TreeNode {\n    int data;\n    TreeNode* left;\n    TreeNode* right;\n    TreeNode(int value) { data = value; left = nullptr; right = nullptr; }\n};\n\nvoid postorder(TreeNode* node) {\n    if (node == nullptr) return;\n    \n    postorder(node->left);\n    postorder(node->right);\n    std::cout << node->data << " ";\n}\n\nint main() {\n    TreeNode* root = new TreeNode(10);\n    root->left = new TreeNode(5);\n    root->right = new TreeNode(15);\n    root->left->left = new TreeNode(2);\n    root->left->right = new TreeNode(7);\n    \n    std::cout << "Postorder: ";\n    postorder(root);\n    std::cout << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: { prose: [], callouts: [], visualizations: [] },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If the simulated output doesn\'t match what you expected, re-read the reference code line by line — the walkthrough above explains exactly what each line does.',
      'Compile errors in real C++ are informative — read the first error the compiler reports, not the last; later errors are often just fallout from the first one.',
    ],
    futureLinks: [
      'Next lesson: Binary Search Tree.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Traversal"?',
      options: [
        'The fundamental container block in a tree. It exists To package a piece of data together with the pointers that connect it to its descendants.',
        'The process of visiting every node in a tree exactly once. It exists To serialize or inspect a multi-dimensional structure into a flat sequence of actions.',
        'The single topmost node in a tree. It exists To serve as the definitive entry point for the entire structure; if you lose the root, you lose the tree.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Binary Tree"?',
      options: [
        'The single topmost node in a tree. It exists To serve as the definitive entry point for the entire structure; if you lose the root, you lose the tree.',
        'The process of visiting every node in a tree exactly once. It exists To serialize or inspect a multi-dimensional structure into a flat sequence of actions.',
        'A hierarchical data structure where each element has at most two outgoing connections. It exists To represent data with branching relationships, or to organize data to make search and insertion significantly faster than a flat linear array.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Leaf"?',
      options: [
        'The process of visiting every node in a tree exactly once. It exists To serialize or inspect a multi-dimensional structure into a flat sequence of actions.',
        'A node that has no children. It exists To represent the absolute bottom edges of the structure, serving as the natural base case where recursive operations stop.',
        'A hierarchical data structure where each element has at most two outgoing connections. It exists To represent data with branching relationships, or to organize data to make search and insertion significantly faster than a flat linear array.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Node"?',
      options: [
        'The specific left or right descending connection from a node. It exists To give structural meaning to position; in many algorithms, going left implies a different rule than going right.',
        'The fundamental container block in a tree. It exists To package a piece of data together with the pointers that connect it to its descendants.',
        'The process of visiting every node in a tree exactly once. It exists To serialize or inspect a multi-dimensional structure into a flat sequence of actions.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Binary Tree** — A hierarchical data structure where each element has at most two outgoing connections. It exists To represent data with branching relationships, or to organize data to make search and insertion significantly faster than a flat linear array.',
    '**Node** — The fundamental container block in a tree. It exists To package a piece of data together with the pointers that connect it to its descendants.',
    '**Root** — The single topmost node in a tree. It exists To serve as the definitive entry point for the entire structure; if you lose the root, you lose the tree.',
    '**Leaf** — A node that has no children. It exists To represent the absolute bottom edges of the structure, serving as the natural base case where recursive operations stop.',
    '**Left Child / Right Child** — The specific left or right descending connection from a node. It exists To give structural meaning to position; in many algorithms, going left implies a different rule than going right.',
    '**Traversal** — The process of visiting every node in a tree exactly once. It exists To serialize or inspect a multi-dimensional structure into a flat sequence of actions.',
  ],

  checkpoints: ['read-intuition'],
}
