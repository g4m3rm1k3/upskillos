// cpp-dsa — Lesson 10: Binary Search Tree
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 10 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-10-binary-search-tree',
  slug: 'binary-search-tree',
  chapter: 3,
  order: 2,
  title: 'Binary Search Tree',
  subtitle: 'Trees, Heaps, and Graphs',
  tags: ['binary-search-tree-bst', 'inorder-successor', 'degenerate-tree'],

  hook: {
    question: 'What is "Binary Search Tree", and why does it matter?',
    realWorldContext: 'You will write isolated console programs that construct, search, and mutate a Binary Search Tree (BST) using raw C++ pointers. These programs demonstrate how to organize data dynamically so that insertions, lookups, and deletions can be performed efficiently without scanning the entire collection. The transferable problem this solves is maintaining a sorted dataset that can be searched quickly even as new items are added or removed.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: The BST Property and Insertion, Searching a BST, Deletion in a BST, Unbalanced Degradation, The Standard Library Equivalent (std::set).',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Binary Search Tree (BST):** A binary tree where every node\'s left children contain only strictly smaller values, and its right children contain only strictly larger values. It exists To allow binary search (cutting the search space in half at each step) on a dynamic, node-based data structure that can grow and shrink without reallocating arrays.\n- **Inorder Successor:** The node containing the smallest value that is strictly greater than a given node. It exists To find the correct mathematical replacement node when deleting a node that has two children, preserving the global BST property.\n- **Degenerate Tree:** A tree where every node has only one child, effectively forming a linked list. It exists It is the pathological failure state of a naive BST when data is inserted in already-sorted order, demonstrating why plain BSTs break down and self-balancing variants are necessary.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Observe how the property `left < root < right` is the engine behind the entire structure. It dictates where new nodes are inserted, it provides the roadmap for searching that cuts the workload in half at every step, and it dictates the complex rules of deletion to ensure the property survives mutations. The structure trades the simple linear layout of arrays for the complexity of disjointed nodes, purely to gain that O(log n) speed advantage.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you break the BST property manually, the search algorithm completely fails. Imagine a tree where you forcibly placed `99` as the left child of `50`. If you call `search(root, 99)`, the algorithm compares 99 to 50. Since 99 &gt; 50, the algorithm strictly routes to the right subtree. It will never check the left side, and it will return `false`, confidently claiming 99 is missing even though it physically exists in memory. The data structure is compromised.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Min and Max:** Using the raw pointer tree from the first units, write a function `int findMax(Node* root)` that returns the largest value in the tree. (Hint: think about how `findMin` worked).\n- **Postorder Verification:** Write a `printPostOrder` function that prints the left child, the right child, and then the root. Run it on a tree and observe how the output differs from the sorted inorder traversal.\n- **STL Map:** Read the documentation for `std::map`. It is also a binary search tree, but it stores key-value pairs instead of single elements. Write a program using `std::map<std::string, int>` to store people\'s names as the search keys and their ages as the payloads.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have written a function to insert nodes maintaining the BST property.\n- [ ] You have traced how the `search` function ignores half the tree at each step.\n- [ ] You can explain why the inorder successor is needed to delete a node with two children.\n- [ ] You have witnessed how inserting sorted data destroys the tree\'s performance.\n- [ ] You have replaced the raw pointer implementation with `std::set` and verified it behaves identically.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 10: Binary Search Tree',
        caption: 'Binary Search Tree',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The BST Property and Insertion',
              prose: [
                'A standard binary tree has no rules about where data goes. If you want to find a specific number in a plain binary tree, you must visit every node until you find it, which takes O(n) time. You need a structure that organizes data upon insertion so that you know exactly which path to take to find it later, ignoring the rest of the tree.',
                '## How the Code Works',
                '- `Node(int val)`: A constructor that initializes the node\'s payload and explicitly nullifies both child pointers, proving this new node is currently a leaf.\n- `if (root == nullptr)`: The base case of the recursion. If we reach a null pointer, we have found the exact empty spot where this new value belongs.\n- `return new Node(value);`: Allocates memory for the new node and returns its address up the call stack so the parent node can link to it.\n- `if (value < root->data)`: The defining rule of the **Binary Search Tree**. If the incoming value is smaller than the current node\'s value, it must exist somewhere in the left subtree.\n- `root->left = insert(root->left, value);`: Recursively calls `insert` on the left child. The return value is assigned back to `root->left` to re-establish the link in case the left child was previously null.\n- `else if (value > root->data)`: Symmetrically, if the value is larger, it must go to the right subtree.\n- `printInOrder(root)`: Traverses the left subtree, prints the current node, then traverses the right subtree. Because of the BST property, this mathematically guarantees the values are printed in sorted ascending order.',
                '**CS lens.** This structure enables **binary search**. At every step down the tree, you discard half of the remaining nodes. If you are looking for 30 and the root is 50, you know with absolute certainty that 30 cannot be in the right subtree. You never even look at the right subtree. This reduces the time complexity of insertion from linear O(n) to logarithmic O(log n), assuming the tree is reasonably balanced.',
                '**SE lens.** The alternative not chosen is keeping a dynamically resizing array (like `std::vector`) and calling `std::sort` after every insertion. The tradeoff here is write performance. Sorting an entire array takes O(n log n) time and requires moving chunks of memory around. A BST achieves the same sorted guarantee by simply changing a few pointers in O(log n) time, making it vastly superior for datasets that experience frequent insertions.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct Node {\n    int data;\n    Node* left;\n    Node* right;\n    \n    Node(int val) : data(val), left(nullptr), right(nullptr) {}\n};\n\nNode* insert(Node* root, int value) {\n    if (root == nullptr) {\n        return new Node(value);\n    }\n    \n    if (value < root->data) {\n        root->left = insert(root->left, value);\n    } else if (value > root->data) {\n        root->right = insert(root->right, value);\n    }\n    // If value == root->data, we do nothing (no duplicates allowed).\n    \n    return root;\n}\n\nvoid printInOrder(Node* root) {\n    if (root == nullptr) return;\n    printInOrder(root->left);\n    std::cout << root->data << " ";\n    printInOrder(root->right);\n}\n\nvoid destroy(Node* root) {\n    if (root == nullptr) return;\n    destroy(root->left);\n    destroy(root->right);\n    delete root;\n}\n\nint main() {\n    Node* root = nullptr;\n    root = insert(root, 50);\n    insert(root, 30);\n    insert(root, 70);\n    insert(root, 20);\n    insert(root, 40);\n    \n    std::cout << "Inorder traversal: ";\n    printInOrder(root);\n    std::cout << "\\n";\n    \n    destroy(root);\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Searching a BST',
              prose: [
                'Now that the tree enforces the property `left < root < right`, we need an algorithm that actually exploits this property to find data. A naive tree traversal checks every node. We need a function that actively chooses which path to take, halting as soon as it finds the target or proves the target does not exist.',
                '## How the Code Works',
                '- `bool search(Node* root, int target)`: A function that takes a starting node and the value to find, returning a boolean indicating presence.\n- `if (root == nullptr) return false;`: The failure base case. If we hit the bottom of the tree without finding the target, the target absolutely does not exist in the collection.\n- `if (root->data == target) return true;`: The success base case. We found the exact value.\n- `if (target < root->data)`: The routing logic. We compare the target against the current node. If it is smaller, we recursively search only the left child.\n- `else return search(root->right, target);`: If it is larger, we recursively search only the right child.\n- `search(root, 30)` — compares 30 to root (50). 30 < 50, so it proceeds left.\n- `search(root->left, 30)` — compares 30 to the new root (30). 30 == 30, returning true immediately. The right side of the tree (70) was never accessed.',
                '**CS lens.** This is the tree equivalent of the binary search algorithm used on sorted arrays. It operates in O(h) time, where `h` is the height of the tree. If the tree is full and balanced, `h` is log(n).',
                '**SE lens.** The alternative not chosen is an iterative `while` loop instead of recursion. Recursion uses stack memory for every level descended. If the tree is millions of nodes deep, recursion could trigger a stack overflow. In production systems (like the Linux kernel\'s scheduling trees), tree traversals are often written iteratively to guarantee safety, but recursion is taught first because it directly mirrors the tree\'s own recursive mathematical definition.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct Node {\n    int data;\n    Node* left;\n    Node* right;\n    Node(int val) : data(val), left(nullptr), right(nullptr) {}\n};\n\nNode* insert(Node* root, int value) {\n    if (root == nullptr) return new Node(value);\n    if (value < root->data) root->left = insert(root->left, value);\n    else if (value > root->data) root->right = insert(root->right, value);\n    return root;\n}\n\nbool search(Node* root, int target) {\n    if (root == nullptr) {\n        return false;\n    }\n    \n    if (root->data == target) {\n        return true;\n    }\n    \n    if (target < root->data) {\n        return search(root->left, target);\n    } else {\n        return search(root->right, target);\n    }\n}\n\nint main() {\n    Node* root = nullptr;\n    root = insert(root, 50);\n    insert(root, 30);\n    insert(root, 70);\n    \n    std::cout << "Search 30: " << (search(root, 30) ? "Found" : "Missing") << "\\n";\n    std::cout << "Search 99: " << (search(root, 99) ? "Found" : "Missing") << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Deletion in a BST',
              prose: [
                'Removing a node from a BST is not as simple as deleting the memory. If the node being deleted has children, those children must be reattached to the rest of the tree. Crucially, the reattachment must not violate the `left < root < right` rule. This creates three distinct scenarios: deleting a leaf (no children), deleting a node with one child, and the complex case of deleting a node with two children.',
                '## How the Code Works',
                '- `Node* findMin(Node* node)`: A helper function that simply walks left as far as possible. Because smaller values are always to the left, the leftmost node in any subtree is mathematically guaranteed to be its minimum value.\n- `if (key < root->data)`: We must first traverse the tree to locate the node, using the exact same routing logic as the `search` function.\n- `if (root->left == nullptr)`: Handles **Case 1 (Leaf)** and **Case 2 (One Child)**. If there is no left child, we save the right child pointer in `temp`, delete the current node, and return `temp`. If the right child was also null (a leaf), we just returned `nullptr` to the parent. If it wasn\'t null (one child), we just bypassed the deleted node and connected its parent directly to its single child.\n- `Node* temp = findMin(root->right);`: Handles **Case 3 (Two Children)**. We cannot just bypass this node, because its parent only has one pointer available, and we have two orphaned subtrees. Instead, we find the **Inorder Successor** — the smallest value in the right subtree.\n- `root->data = temp->data;`: We do not actually delete the current node\'s memory. Instead, we overwrite its payload with the successor\'s payload. The tree structure remains intact, but the target value is gone.\n- `root->right = deleteNode(root->right, temp->data);`: We now have two copies of the successor\'s data. We recursively call `deleteNode` on the right subtree to hunt down and delete the original successor node (which is guaranteed to fall into Case 1 or Case 2, making it easy to remove).',
                '**CS lens.** Case 3 relies on a mathematical trick: the smallest value in the right subtree is the only value guaranteed to be larger than everything in the left subtree, but smaller than everything else in the right subtree. Promoting it to the root position perfectly preserves the BST property without requiring a total rebuild of the tree structure.',
                '**SE lens.** The alternative not chosen is "lazy deletion" (or "tombstoning"), where you simply add a `bool isDeleted` flag to the node and ignore it during searches. The tradeoff is code complexity versus memory. Tombstoning makes deletion O(1) and prevents pointer rewiring bugs entirely, but if your application deletes items frequently, the tree will fill up with dead nodes, wasting memory and slowing down searches. Real databases often use tombstoning and run a background cleanup task later.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct Node {\n    int data;\n    Node* left;\n    Node* right;\n    Node(int val) : data(val), left(nullptr), right(nullptr) {}\n};\n\nNode* findMin(Node* node) {\n    while (node && node->left != nullptr) {\n        node = node->left;\n    }\n    return node;\n}\n\nNode* deleteNode(Node* root, int key) {\n    if (root == nullptr) return root;\n    \n    if (key < root->data) {\n        root->left = deleteNode(root->left, key);\n    } else if (key > root->data) {\n        root->right = deleteNode(root->right, key);\n    } else {\n        // We found the node to delete\n        \n        // Case 1 & 2: No child or exactly one child\n        if (root->left == nullptr) {\n            Node* temp = root->right;\n            delete root;\n            return temp;\n        } else if (root->right == nullptr) {\n            Node* temp = root->left;\n            delete root;\n            return temp;\n        }\n        \n        // Case 3: Two children\n        Node* temp = findMin(root->right);\n        root->data = temp->data;\n        root->right = deleteNode(root->right, temp->data);\n    }\n    return root;\n}\n\nvoid printInOrder(Node* root) {\n    if (root == nullptr) return;\n    printInOrder(root->left);\n    std::cout << root->data << " ";\n    printInOrder(root->right);\n}\n\n// Assume insert() and destroy() are present identically to the first unit',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Unbalanced Degradation',
              prose: [
                'We have stated that BST operations take O(log n) time. However, this relies on an assumption that the tree is relatively balanced — meaning the left and right sides are roughly the same depth. What happens if you insert data that is already sorted?',
                '## How the Code Works',
                '- `insert(root, 10)`: Becomes the root.\n- `insert(root, 20)`: 20 is greater than 10, so it becomes the right child of 10.\n- `insert(root, 30)`: 30 is greater than 10 (goes right), greater than 20 (goes right), becomes the right child of 20.',
                '**CS lens.** Because every incoming number is strictly larger than the previous one, the `insert` function exclusively takes the `root->right` path. The left child pointers remain permanently null. This creates a **Degenerate Tree**. Structurally, this is no longer a tree at all; it is a linked list. If you search for 50, you must traverse 10, 20, 30, and 40 first. The time complexity has degraded from O(log n) back to the worst-case O(n).',
                '**SE lens.** This failure mode is why bare, naive Binary Search Trees are almost never used in production software. They are a teaching tool. In the real world, you use self-balancing trees like AVL Trees or Red-Black Trees. These structures automatically perform pointer rotations during insertion to mathematically guarantee the tree remains balanced, preventing the O(n) degradation no matter what order the data arrives in.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct Node {\n    int data;\n    Node* left;\n    Node* right;\n    Node(int val) : data(val), left(nullptr), right(nullptr) {}\n};\n\nNode* insert(Node* root, int value) {\n    if (root == nullptr) return new Node(value);\n    if (value < root->data) root->left = insert(root->left, value);\n    else if (value > root->data) root->right = insert(root->right, value);\n    return root;\n}\n\nint main() {\n    Node* root = nullptr;\n    root = insert(root, 10);\n    insert(root, 20);\n    insert(root, 30);\n    insert(root, 40);\n    insert(root, 50);\n    \n    std::cout << "Root: " << root->data << "\\n";\n    std::cout << " -> Right: " << root->right->data << "\\n";\n    std::cout << "    -> Right: " << root->right->right->data << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'The Standard Library Equivalent (std::set)',
              prose: [
                'Writing raw pointers, handling the three deletion cases, and managing memory leaks is dangerous and time-consuming. Furthermore, building a self-balancing Red-Black tree from scratch takes hundreds of lines of complex pointer logic. When you just need a container that enforces uniqueness and keeps elements sorted, you should rely on the standard library.',
                '## How the Code Works',
                '- `#include <set>`: Imports the standard library\'s self-balancing binary search tree container.\n- `std::set<int> numbers;`: Instantiates the tree. No `Node` structs or raw pointers are exposed to you.\n- `numbers.insert(50);`: Allocates memory internally, creates the node, and balances the tree automatically. O(log n) time.\n- `numbers.erase(30);`: Searches for the value and handles the complex deletion rewiring (including the two-child successor swap) behind the scenes, safely freeing the memory.\n- `for (int num : numbers)`: Iterating over a `std::set` inherently performs an inorder traversal, yielding the numbers in strictly sorted ascending order.\n- `numbers.find(40)`: Traverses the tree using the BST property, returning an iterator to the item in O(log n) time. If it reaches the bottom without finding it, it returns `numbers.end()`.',
                '**CS lens.** The `std::set` is mandated by the C++ Standard to guarantee O(log n) time complexity for insertions, deletions, and searches. To achieve this, almost all implementations use a Red-Black Tree under the hood. You get the speed of a binary search tree without the fatal O(n) degradation flaw.',
                '**SE lens.** The alternative not chosen is writing your own tree. The tradeoff is absolute control versus safety and time. Unless you are writing a custom memory allocator or an operating system kernel, you should always use `std::set` or `std::map` when you need a BST. It is heavily optimized, entirely memory-safe, and instantly recognizable to other engineers.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <set>\n\nint main() {\n    std::set<int> numbers;\n    \n    // Insertion\n    numbers.insert(50);\n    numbers.insert(30);\n    numbers.insert(70);\n    numbers.insert(20);\n    numbers.insert(40);\n    \n    // Attempting to insert a duplicate does nothing\n    numbers.insert(50); \n    \n    // Deletion (handles all child cases internally)\n    numbers.erase(30);\n    \n    // Inorder Traversal\n    std::cout << "Tree contents: ";\n    for (int num : numbers) {\n        std::cout << num << " ";\n    }\n    std::cout << "\\n";\n    \n    // Searching\n    if (numbers.find(40) != numbers.end()) {\n        std::cout << "40 is in the tree.\\n";\n    }\n    \n    return 0;\n}',
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
      'Next lesson: Heap and Priority Queue.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Degenerate Tree"?',
      options: [
        'A tree where every node has only one child, effectively forming a linked list. It exists It is the pathological failure state of a naive BST when data is inserted in already-sorted order, demonstrating why plain BSTs break down and self-balancing variants are necessary.',
        'The node containing the smallest value that is strictly greater than a given node. It exists To find the correct mathematical replacement node when deleting a node that has two children, preserving the global BST property.',
        'A binary tree where every node\'s left children contain only strictly smaller values, and its right children contain only strictly larger values. It exists To allow binary search (cutting the search space in half at each step) on a dynamic, node-based data structure that can grow and shrink without reallocating arrays.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Inorder Successor"?',
      options: [
        'A tree where every node has only one child, effectively forming a linked list. It exists It is the pathological failure state of a naive BST when data is inserted in already-sorted order, demonstrating why plain BSTs break down and self-balancing variants are necessary.',
        'A binary tree where every node\'s left children contain only strictly smaller values, and its right children contain only strictly larger values. It exists To allow binary search (cutting the search space in half at each step) on a dynamic, node-based data structure that can grow and shrink without reallocating arrays.',
        'The node containing the smallest value that is strictly greater than a given node. It exists To find the correct mathematical replacement node when deleting a node that has two children, preserving the global BST property.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Binary Search Tree (BST)"?',
      options: [
        'A binary tree where every node\'s left children contain only strictly smaller values, and its right children contain only strictly larger values. It exists To allow binary search (cutting the search space in half at each step) on a dynamic, node-based data structure that can grow and shrink without reallocating arrays.',
        'The node containing the smallest value that is strictly greater than a given node. It exists To find the correct mathematical replacement node when deleting a node that has two children, preserving the global BST property.',
        'A tree where every node has only one child, effectively forming a linked list. It exists It is the pathological failure state of a naive BST when data is inserted in already-sorted order, demonstrating why plain BSTs break down and self-balancing variants are necessary.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Binary Search Tree (BST)** — A binary tree where every node\'s left children contain only strictly smaller values, and its right children contain only strictly larger values. It exists To allow binary search (cutting the search space in half at each step) on a dynamic, node-based data structure that can grow and shrink without reallocating arrays.',
    '**Inorder Successor** — The node containing the smallest value that is strictly greater than a given node. It exists To find the correct mathematical replacement node when deleting a node that has two children, preserving the global BST property.',
    '**Degenerate Tree** — A tree where every node has only one child, effectively forming a linked list. It exists It is the pathological failure state of a naive BST when data is inserted in already-sorted order, demonstrating why plain BSTs break down and self-balancing variants are necessary.',
  ],

  checkpoints: ['read-intuition'],
}
