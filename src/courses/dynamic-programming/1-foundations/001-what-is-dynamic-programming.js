// Lesson 1.1: what dynamic programming is, taught on climbing stairs. Every number in this
// file was computed (docs/dp-course-plan.md); the challenges' hidden tests compare the
// learner's code with brute force, and dp-challenges.test.js proves each solution passes
// and each starting point fails.
import { KIT } from '../challengeKit.js'


export default {
  id: 'dp1-001',
  slug: 'what-is-dynamic-programming',
  chapter: 'dp1',
  order: 1,
  title: 'What is Dynamic Programming?',
  subtitle: 'Solve each smaller problem once, in an order where the ones it needs are already solved',
  tags: ['dynamic programming', 'memoization', 'tabulation', 'recurrence', 'climbing stairs', 'overlapping subproblems', 'optimal substructure'],
  aliases: 'DP memo table bottom-up top-down overlapping subproblems optimal substructure recurrence cache',
  timeToComplete: 50,
  coreConcept: 'A dynamic program writes the answer to a problem as a recurrence over smaller problems of the same kind, then computes each distinct smaller problem exactly once: either by remembering answers as a recursion finds them (memoization) or by filling a table from the smallest up (tabulation).',
  prerequisites: ['Writing a recursive function with a base case', 'Arrays and Maps in JavaScript'],
  nextLesson: 'dp1-002',

  hook: {
    question: 'How many ways are there to climb 10 stairs taking 1 or 2 steps at a time? There are 89. For 50 stairs there are 20,365,011,074, and a plain recursive count makes 40,730,022,147 function calls to find that out. Remembering each answer the first time it is found brings that down to 99 calls. This lesson is about where that difference comes from.',
    realWorldContext: 'The same idea runs spell-checkers (edit distance between two words), DNA and protein alignment (the Needleman–Wunsch and Smith–Waterman algorithms), speech recognition and part-of-speech tagging (the Viterbi algorithm), and the value-iteration step of reinforcement learning (Bellman equations). Each one answers a big question from answers to smaller questions that keep coming up.',
    previewVisualizationId: 'ScienceNotebook',
  },

  intuition: {
    prose: [
      'Take a staircase of 4 stairs. You climb 1 or 2 stairs at a time. Here is every way to get to the top: 1+1+1+1, 1+1+2, 1+2+1, 2+1+1 and 2+2. There are 5.',
      'Sort those 5 by their **last** move. Three end with a 1-step: 1+1+1**+1**, 1+2**+1**, 2+1**+1**. Take that last step away and what is left is every way to climb 3 stairs. Two end with a 2-step: 1+1**+2** and 2**+2**. Take it away and what is left is every way to climb 2 stairs. So the 5 ways to climb 4 are the 3 ways to climb 3, plus the 2 ways to climb 2.',
      'Write $\\text{ways}(n)$ for the number of ways to climb $n$ stairs. The argument works for every $n \\ge 2$, so $\\text{ways}(n) = \\text{ways}(n-1) + \\text{ways}(n-2)$. An equation that defines an answer through smaller answers of the same kind is a **recurrence**.',
      'A recurrence needs somewhere to stop. $\\text{ways}(1) = 1$: a single 1-step. And $\\text{ways}(0) = 1$: with no stairs left there is exactly one way to finish, which is to do nothing. With those two **base cases** the recurrence gives 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89 for 0 to 10 stairs.',
      'A program can follow the recurrence word for word: to find $\\text{ways}(6)$, call $\\text{ways}(5)$ and $\\text{ways}(4)$ and add. But $\\text{ways}(5)$ calls $\\text{ways}(4)$ again, and each of those calls $\\text{ways}(3)$... Counted exactly, finding $\\text{ways}(6)$ this way computes $\\text{ways}(2)$ five separate times and makes 25 calls in all.',
      'In general this plain recursion makes $2 \\cdot \\text{ways}(n) - 1$ calls, so the work grows as fast as the answer does: 177 calls for $n = 10$, and 3,672,623,805 for $n = 45$. Almost all of them recompute something already computed.',
      'Each repeated call returns the same number every time, because $\\text{ways}(2)$ depends on nothing but the 2. So store each answer the first time you compute it, and look it up after that. This is **memoization**. With it, each $\\text{ways}(k)$ is computed once, and finding $\\text{ways}(n)$ enters the function only $2n - 1$ times: 89 calls for $n = 45$.',
      'Or skip the recursion altogether. Compute $\\text{ways}(0)$ and $\\text{ways}(1)$, then $\\text{ways}(2)$ from those, then $\\text{ways}(3)$, upwards, keeping the results in an array. This is **tabulation**, also called bottom-up. Memoization and tabulation are the two ways of doing **dynamic programming**: solve each smaller problem once, in an order where the ones it needs are already solved.',
      'Two things made this work, and they are what to look for in a new problem. First, **overlapping subproblems**: the same smaller question ($\\text{ways}(2)$) comes up again and again. Without repeats, there is nothing to save. Second, a **correct recurrence**. For a count, the groups you split into must not overlap and must cover every possibility, as "last step was 1" and "last step was 2" do. For a best answer (the cheapest, the shortest), the best whole must be built from best parts. That property is called **optimal substructure**.',
    ],
    callouts: [
      { type: 'definition', title: 'Words this lesson uses', body: '**Subproblem**: a smaller question of the same kind, like ways(3) inside ways(5).\n**Recurrence**: an equation giving an answer from answers to subproblems.\n**Base case**: an answer given directly, where the recurrence stops.\n**Memoization**: recursion that stores each answer the first time it is found.\n**Tabulation**: filling a table from the smallest subproblem up.' },
      { type: 'procedure', title: 'Procedure: Designing a dynamic program', body: 'Step 1. Say in words what one subproblem is: "ways(i) = the number of ways to climb i stairs".\nStep 2. Split by the last choice to write the recurrence: ways(i) = ways(i − 1) + ways(i − 2).\nStep 3. Give the base cases, the subproblems the recurrence cannot reach below: ways(0) = 1, ways(1) = 1.\nStep 4. Choose an order in which every subproblem comes after the ones it uses: i = 0, 1, 2, …\nStep 5. Say where the answer is: ways(n).\nStep 6. Count the cost: number of subproblems × work per subproblem. Here n + 1 subproblems, a constant amount of work each, so O(n) time.' },
      { type: 'warning', title: 'A cache key must include everything the answer depends on', body: 'If the answer depends on n and on k (say, the largest step allowed), the cache key must be both. Caching on n alone returns the answer for whichever k was asked first, with no error. It is the most common memoization bug, and challenge 3 below is exactly it.' },
      { type: 'prediction', title: 'Predict before you read on', body: 'Merge sort is recursive too: it sorts each half, then merges. Would memoizing merge sort make it faster? Decide, then check the first misconception at the end of the lesson.' },
      { type: 'insight', title: 'Memoization or tabulation?', body: 'Memoization is the recurrence written as recursion plus a cache, so it is the easiest to get right, and it only computes the subproblems the question actually reaches. Tabulation needs you to choose an order (Step 4), but it makes no recursive calls, so it can never overflow the call stack, and it often lets you keep only the last few entries. Start with whichever you can write correctly; they compute the same numbers.' },
    ],
    visualizations: [
      {
        id: 'ScienceNotebook',
        title: 'Watching the repeats disappear',
        caption: 'The misconception these contradict: that a recursive solution is slow because recursion itself is slow. The invariant: every version computes the same ways(n); only the number of calls changes.',
        props: {
          lesson: {
            title: 'Plain recursion, memoization and tabulation, counted',
            subtitle: 'Each cell runs as soon as the lesson opens. Open { } Source to read the code.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Plain recursion: count every call\n\nThis computes ways(10) straight from the recurrence and counts how many times each ways(k) is computed. **Watch for:** the counts for small k grow like the answers themselves (ways(2) is computed 34 times), and the total is exactly 2 × 89 − 1 = 177.',
                html: '<div id="d"></div>',
                css: 'body{margin:0;padding:12px;font:13px ui-monospace,monospace}.row{display:flex;align-items:center;gap:8px;margin:2px 0}.bar{height:12px;background:#f97316;border-radius:3px}',
                startCode: `const d = document.getElementById('d');
const computed = {};
let calls = 0;

function ways(n) {
  calls++;
  computed[n] = (computed[n] || 0) + 1;
  if (n <= 1) return 1;
  return ways(n - 1) + ways(n - 2);
}

const answer = ways(10);
for (let k = 10; k >= 0; k--) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = '<span style="width:80px">ways(' + k + ')</span><span class="bar" style="width:' + (computed[k] * 3) + 'px"></span><span>' + computed[k] + ' times</span>';
  d.appendChild(row);
}
const total = document.createElement('p');
total.textContent = 'ways(10) = ' + answer + ', found with ' + calls + ' calls (2 x ' + answer + ' - 1 = ' + (2 * answer - 1) + ').';
d.appendChild(total);`,
                outputHeight: 330,
              },
              {
                type: 'js',
                instruction: '### 2. Memoization: the same recursion, plus a Map\n\nThe only change is `memo`: check it first, fill it before returning. The log shows every call for ways(6). **Watch for:** each ways(k) is computed once; every later call for it is a lookup. 11 calls in all, which is 2 × 6 − 1.',
                html: '<div id="d"></div>',
                css: 'body{margin:0;padding:12px;font:13px ui-monospace,monospace}.c{color:#2563eb}.l{color:#16a34a}',
                startCode: `const d = document.getElementById('d');
const memo = new Map();
let calls = 0;

function ways(n, depth) {
  calls++;
  const line = document.createElement('div');
  line.style.paddingLeft = (depth * 14) + 'px';
  d.appendChild(line);
  if (n <= 1) { line.textContent = 'ways(' + n + ') = 1   base case'; return 1; }
  if (memo.has(n)) { line.className = 'l'; line.textContent = 'ways(' + n + ') = ' + memo.get(n) + '   looked up'; return memo.get(n); }
  line.className = 'c';
  line.textContent = 'ways(' + n + ')   computing...';
  const value = ways(n - 1, depth + 1) + ways(n - 2, depth + 1);
  memo.set(n, value);
  line.textContent = 'ways(' + n + ') = ' + value + '   computed';
  return value;
}

ways(6, 0);
const total = document.createElement('p');
total.textContent = calls + ' calls in all.';
d.appendChild(total);`,
                outputHeight: 300,
              },
              {
                type: 'js',
                instruction: '### 3. Tabulation: no recursion, one loop\n\nStart from the base cases and fill the table upwards. **Watch for:** each entry is the sum of the two before it, so by the time the loop reaches i, both entries it needs already exist. That ordering is Step 4 of the procedure.',
                html: '<div id="d"></div>',
                css: 'body{margin:0;padding:12px;font:13px ui-monospace,monospace}table{border-collapse:collapse}td,th{border:1px solid #94a3b8;padding:4px 8px;text-align:center}',
                startCode: `const d = document.getElementById('d');
const n = 10;
const table = new Array(n + 1);
table[0] = 1;
table[1] = 1;
for (let i = 2; i <= n; i++) {
  table[i] = table[i - 1] + table[i - 2];
}

let html = '<table><tr><th>i</th>';
for (let i = 0; i <= n; i++) html += '<th>' + i + '</th>';
html += '</tr><tr><th>ways(i)</th>';
for (let i = 0; i <= n; i++) html += '<td>' + table[i] + '</td>';
html += '</tr></table>';
d.innerHTML = html + '<p>' + (n + 1) + ' entries, each computed once from the two before it.</p>';`,
                outputHeight: 140,
              },
            ],
          },
        },
      },
      {
        id: 'ScienceNotebook',
        title: 'Challenges: write it, then prove it',
        caption: 'Each Run checks your function against a brute-force count on fixed and random cases. Hard-coding the examples cannot pass.',
        props: {
          lesson: {
            title: 'Three challenges',
            subtitle: 'Write the code in the editor and press Run. The tests are hidden; their results appear under the output.',
            cells: [
              {
                type: 'coding',
                instruction: '### 🎯 Challenge 1: memoize climbStairs\n\nReturn the number of ways to climb `n` stairs with steps of 1 or 2. Use the recurrence and the base cases from this lesson, and make it fast: the tests include n = 45 and n = 75, which plain recursion cannot finish (n = 75 would take 6,832,909,245,813,413 calls).',
                startCode: `// ways(0) = 1, ways(1) = 1, ways(n) = ways(n - 1) + ways(n - 2)
function climbStairs(n) {
  // TODO: store each answer the first time you compute it, and reuse it.
}`,
                solutionCode: `// ways(0) = 1, ways(1) = 1, ways(n) = ways(n - 1) + ways(n - 2)
function climbStairs(n) {
  const memo = new Map();
  function ways(k) {
    if (k <= 1) return 1;
    if (memo.has(k)) return memo.get(k);
    const value = ways(k - 1) + ways(k - 2);
    memo.set(k, value);
    return value;
  }
  return ways(n);
}`,
                tests: KIT + `
function enumerate(n) {            // brute force: build every sequence of 1s and 2s
  var count = 0;
  (function walk(left) { if (left === 0) { count++; return; } walk(left - 1); if (left >= 2) walk(left - 2); })(n);
  return count;
}
function climbIteratively(n) {     // for sizes too big to enumerate
  var a = 1, b = 1;
  for (var i = 2; i <= n; i++) { var c = a + b; a = b; b = c; }
  return b;
}
function reference(n) { return n <= 20 ? enumerate(n) : climbIteratively(n); }
__check(climbStairs, 'climbStairs', [[0], [1], [2], [3], [4], [10]], reference, { random: { count: 15, make: function (r) { return [r.int(21)]; } } });
__check(climbStairs, 'climbStairs', [[45], [75]], reference);
__done('Including n = 75 in a fraction of a second.');
`,
                timeoutMessage: 'No result after 5 seconds. The small cases may well be right: n = 45 needs 3,672,623,805 calls without a memo. Store each answer the first time you compute it.',
                successMessage: '✓ Every case matches a brute-force count, and n = 75 finishes instantly: each ways(k) is computed once.',
                failMessage: '✗ Not yet.',
                outputHeight: 260,
              },
              {
                type: 'coding',
                instruction: '### 🎯 Challenge 2: any step sizes, bottom-up\n\nNow each move may be any size in the array `steps` (for example `[1, 3, 5]`). Fill `table` from the bottom: `table[i]` is the number of ways to climb `i` stairs. Split by the last move, as in the lesson: the last move was some size `s`, and before it you had climbed `i − s` stairs. No recursion this time.',
                startCode: `function countWays(n, steps) {
  const table = new Array(n + 1).fill(0);
  table[0] = 1;
  // TODO: fill table[1] ... table[n], each from smaller entries.
  return table[n];
}`,
                solutionCode: `function countWays(n, steps) {
  const table = new Array(n + 1).fill(0);
  table[0] = 1;
  for (let i = 1; i <= n; i++) {
    for (const s of steps) {
      if (s <= i) table[i] += table[i - s];
    }
  }
  return table[n];
}`,
                tests: KIT + `
function enumerate(n, steps) {     // brute force: try every sequence of moves
  var count = 0;
  (function walk(left) { if (left === 0) { count++; return; } steps.forEach(function (s) { if (s <= left) walk(left - s); }); })(n);
  return count;
}
function topDown(n, steps) {       // an independent check for sizes too big to enumerate
  var memo = {};
  function w(k) { if (k === 0) return 1; if (k in memo) return memo[k]; var t = 0; steps.forEach(function (s) { if (s <= k) t += w(k - s); }); return (memo[k] = t); }
  return w(n);
}
function reference(n, steps) { return n <= 18 ? enumerate(n, steps) : topDown(n, steps); }
function randomSteps(r) { var all = [1, 2, 3, 4, 5].filter(function () { return r.next() < 0.5; }); return all.length ? all : [1 + r.int(5)]; }
__check(countWays, 'countWays', [[4, [1, 2]], [7, [1, 3, 5]], [10, [1, 3, 5]], [0, [3]], [5, [2]], [3, [5]]], reference, { random: { count: 25, make: function (r) { return [r.int(19), randomSteps(r)]; } } });
__check(countWays, 'countWays', [[50, [1, 2, 3]]], reference);
__done();
`,
                successMessage: '✓ Matches brute force on every case. You split by the last move and filled the table in an order where every entry it needs already exists.',
                failMessage: '✗ Not yet.',
                outputHeight: 260,
              },
              {
                type: 'coding',
                instruction: '### 🎯 Challenge 3: find the bug\n\n`waysUpTo(n, k)` counts the ways to climb `n` stairs when a move can be any size from 1 to `k`. It is memoized, and on its own each call looks right. But the cache is shared between calls, and asking `waysUpTo(5, 2)` and then `waysUpTo(5, 3)` gives the wrong second answer. Find out why and fix it, keeping the memo (the tests include n = 40).',
                startCode: `const memo = new Map();

function waysUpTo(n, k) {
  if (n === 0) return 1;
  if (memo.has(n)) return memo.get(n);
  let total = 0;
  for (let s = 1; s <= k && s <= n; s++) {
    total += waysUpTo(n - s, k);
  }
  memo.set(n, total);
  return total;
}`,
                solutionCode: `const memo = new Map();

function waysUpTo(n, k) {
  if (n === 0) return 1;
  const key = n + ',' + k;          // the answer depends on k too
  if (memo.has(key)) return memo.get(key);
  let total = 0;
  for (let s = 1; s <= k && s <= n; s++) {
    total += waysUpTo(n - s, k);
  }
  memo.set(key, total);
  return total;
}`,
                tests: KIT + `
function enumerate(n, k) {         // brute force: try every sequence of moves of size 1..k
  var count = 0;
  (function walk(left) { if (left === 0) { count++; return; } for (var s = 1; s <= k && s <= left; s++) walk(left - s); })(n);
  return count;
}
function bottomUp(n, k) {          // an independent check for sizes too big to enumerate
  var t = [1];
  for (var i = 1; i <= n; i++) { t[i] = 0; for (var s = 1; s <= k && s <= i; s++) t[i] += t[i - s]; }
  return t[n];
}
function reference(n, k) { return n <= 15 ? enumerate(n, k) : bottomUp(n, k); }
__check(waysUpTo, 'waysUpTo', [[5, 2], [5, 3], [10, 2], [10, 4], [3, 1]], reference, { random: { count: 25, make: function (r) { return [r.int(16), 1 + r.int(4)]; } } });
__check(waysUpTo, 'waysUpTo', [[40, 3]], reference);
__done('The calls shared one cache, and each still got its own answer.');
`,
                timeoutMessage: 'No result after 5 seconds: n = 40 is too slow. Is the memo still being used, and is it kept between calls?',
                successMessage: '✓ Fixed. The cache key now holds everything the answer depends on: n and k.',
                failMessage: '✗ Not yet.',
                outputHeight: 260,
              },
            ],
          },
        },
      },
    ],
  },

  math: {
    prose: [
      '**Why the recurrence is right.** Every way to climb $n \\ge 2$ stairs ends with a last move of 1 or of 2, never both. Removing a final 1-step turns the ways ending in 1 into the ways to climb $n-1$, one for one: nothing is lost, because adding the step back recovers the original, and nothing is counted twice. The same holds for a final 2-step and $n-2$. The two groups do not overlap and together contain every way, so $\\text{ways}(n) = \\text{ways}(n-1) + \\text{ways}(n-2)$. That a correct count needs groups that "do not overlap and cover everything" is the condition named in the intuition section.',
      '**Why plain recursion makes $2\\,\\text{ways}(n) - 1$ calls.** Let $C(n)$ be the number of calls made to compute $\\text{ways}(n)$. A base case is one call, so $C(0) = C(1) = 1$. Otherwise there is the call itself plus the calls for $n-1$ and $n-2$: $C(n) = C(n-1) + C(n-2) + 1$. Check that $2\\,\\text{ways}(n) - 1$ satisfies both: for $n = 0$ and $n = 1$ it is $2 - 1 = 1$, and $\\bigl(2\\,\\text{ways}(n-1) - 1\\bigr) + \\bigl(2\\,\\text{ways}(n-2) - 1\\bigr) + 1 = 2\\,\\text{ways}(n) - 1$ by the recurrence. Two sequences with the same starting values and the same rule are the same sequence, so $C(n) = 2\\,\\text{ways}(n) - 1$.',
      '**Why memoization makes $2n - 1$ calls.** Each $\\text{ways}(k)$ for $2 \\le k \\le n$ is computed once, and that computation makes two calls. Those $2(n-1)$ calls plus the first call total $2n - 1$. Each call does a constant amount of work besides its calls, so the time is $O(n)$ instead of growing with $\\text{ways}(n)$.',
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'The same counts, checked in Python',
        caption: 'Every number this lesson states about calls, computed and asserted.',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Plain recursion makes 2·ways(n) − 1 calls',
              prose: ['A counter shows the formula from the math section holding for every n from 0 to 22. Watch the last column stay True.'],
              code: `calls = 0

def ways(n):
    global calls
    calls += 1
    if n <= 1:
        return 1
    return ways(n - 1) + ways(n - 2)

for n in range(23):
    calls = 0
    w = ways(n)
    assert calls == 2 * w - 1
    if n in (6, 10, 22):
        print(n, w, calls, calls == 2 * w - 1)
print("formula holds for n = 0 to 22")`,
            },
            {
              id: 2,
              cellTitle: 'Memoization with functools.lru_cache',
              prose: ['Python can add the cache for you. lru_cache(maxsize=None) stores every result by its arguments. cache_info() reports how many calls were answered from the cache (hits) and how many were computed (misses).'],
              code: `from functools import lru_cache

@lru_cache(maxsize=None)
def ways_memo(n):
    if n <= 1:
        return 1
    return ways_memo(n - 1) + ways_memo(n - 2)

print(ways_memo(50))
info = ways_memo.cache_info()
print(info)
assert ways_memo(50) == 20365011074
assert info.hits + info.misses == 2 * 50 - 1`,
            },
            {
              id: 3,
              cellTitle: 'Tabulation keeps only the last two entries',
              prose: ['Each entry needs only the two before it, so two variables are enough. The assert compares it with the memoized version for every n up to 200.'],
              code: `def ways_table(n):
    a, b = 1, 1          # ways(i - 1), ways(i)
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

assert all(ways_table(n) == ways_memo(n) for n in range(201))
print(ways_table(90))`,
            },
          ],
        },
      },
    ],
  },

  rigor: {
    prose: [
      '**Formal statement.** A dynamic program is a function $f$ on a finite set of subproblems, defined by a recurrence $f(s) = \\Phi\\bigl(s, f(s_1), \\dots, f(s_k)\\bigr)$ where every $s_i$ is strictly smaller than $s$ in some well-founded order, together with values given directly for the minimal subproblems. Under those conditions $f$ is uniquely defined (by induction along the order), memoized recursion computes it, and so does any loop that visits subproblems in an order extending the dependency order. The running time is the sum, over the distinct subproblems reachable from the question, of the work done in $\\Phi$ apart from the recursive calls.',
      '**Invariant viewpoint.** Tabulation is correct because of a loop invariant: after the loop has handled index $i$, $\\text{table}[j] = \\text{ways}(j)$ for every $j \\le i$. It holds after the base cases, and each step keeps it, because $\\text{table}[i]$ is computed only from entries the invariant already guarantees. Memoization has the matching invariant: every value in the cache is the true value for its key. Challenge 3 is what breaking that invariant looks like; a key that leaves out $k$ lets the cache hold a value that is true for a different question.',
      '**Structural interpretation.** Draw each subproblem as a node, with an arrow from $\\text{ways}(i)$ to each subproblem it uses. That graph has no cycles (arrows always point to smaller $i$), so it is a directed acyclic graph. Plain recursion walks every path through it, and there are exponentially many paths. Memoization is a depth-first search that marks nodes as visited, so it does one piece of work per node. Tabulation processes the nodes in a topological order, one in which every node comes after the nodes it points to.',
      '**Where this leads.** The recurrence here combines subproblems with $+$ because it counts. Replace $+$ with $\\min$ and add a cost to each arrow, and the same DAG computes a cheapest path; use $\\max$ and it computes a best score. Chapter 2.3 makes the DAG view the main tool. The general statement, that one algorithm on the DAG works for any pair of operations behaving like $(+, \\times)$, is the algebraic idea of a semiring; in optimal control and reinforcement learning the same "best answer from best sub-answers" equation is the Bellman equation.',
    ],
  },

  examples: [
    {
      id: 'dp1-001-ex1',
      title: 'The table for 5 stairs, by hand',
      steps: [
        { expression: 'ways(0) = 1, ways(1) = 1', annotation: 'The base cases (Step 3). With no stairs left there is exactly one way to finish: stop.', strategyTitle: 'Base cases first' },
        { expression: 'ways(2) = ways(1) + ways(0) = 1 + 1 = 2', annotation: 'Last move 1 (from stair 1) or last move 2 (from the ground): 1+1 and 2.', strategyTitle: 'Apply the recurrence' },
        { expression: 'ways(3) = ways(2) + ways(1) = 2 + 1 = 3', annotation: 'Both entries it needs are already in the table: that is why we go upwards (Step 4).' },
        { expression: 'ways(4) = 3 + 2 = 5', annotation: 'The 5 ways listed at the start of the lesson.', checkpoint: 'List the five ways and sort them by last move to see 3 + 2.' },
        { expression: 'ways(5) = 5 + 3 = 8', annotation: 'The answer is the last entry (Step 5): 8 ways to climb 5 stairs.' },
      ],
    },
    {
      id: 'dp1-001-ex2',
      title: 'Steps of 1, 3 or 5, for 7 stairs',
      steps: [
        { expression: 'ways(i) = ways(i − 1) + ways(i − 3) + ways(i − 5)', annotation: 'The new complication: three possible last moves. A term only counts when its stair index is at least 0; a last move of 5 is impossible on 4 stairs.', strategyTitle: 'Split by the last move' },
        { expression: 'ways(0) = 1, ways(1) = 1, ways(2) = 1', annotation: 'For 1 and 2 stairs only 1-steps fit, so there is one way each. These come straight out of the recurrence once ways(0) = 1 is fixed.' },
        { expression: 'ways(3) = ways(2) + ways(0) = 2', annotation: '1+1+1 or a single 3.' },
        { expression: 'ways(4) = ways(3) + ways(1) = 3,  ways(5) = ways(4) + ways(2) + ways(0) = 5', annotation: 'At 5 all three moves fit for the first time.' },
        { expression: 'ways(6) = 5 + 2 + 1 = 8,  ways(7) = 8 + 3 + 1 = 12', annotation: 'ways(7) = ways(6) + ways(4) + ways(2). There are 12 ways; Challenge 2 checks this case.', checkpoint: 'Check one: 1+1+5, 1+5+1 and 5+1+1 are three of the twelve.' },
      ],
    },
    {
      id: 'dp1-001-ex3',
      title: 'How many calls does plain recursion make for ways(6)?',
      steps: [
        { expression: 'C(0) = C(1) = 1,  C(n) = C(n − 1) + C(n − 2) + 1', annotation: 'Counting calls is itself a recurrence: the call itself, plus the calls made by the two sub-calls.', strategyTitle: 'Write a recurrence for the cost' },
        { expression: 'C(2) = 3, C(3) = 5, C(4) = 9, C(5) = 15, C(6) = 25', annotation: 'Filled upwards, exactly like the ways table.' },
        { expression: '2 · ways(6) − 1 = 2 · 13 − 1 = 25', annotation: 'The closed form from the math section agrees.' },
        { expression: 'with a memo: 2 · 6 − 1 = 11 calls', annotation: 'The memo saves 14 calls here, and 3,672,623,716 at n = 45: the gap grows as fast as the answer.', checkpoint: 'Compare with cell 2 of the first notebook, which logs the 11 calls.' },
      ],
    },
  ],

  challenges: [
    {
      id: 'dp1-001-ch1',
      prompt: 'Using the table method, how many ways are there to climb 8 stairs with steps of 1 or 2?',
      walkthrough: [
        { expression: '1, 1, 2, 3, 5, 8', annotation: 'ways(0) to ways(5), from Example 1.' },
        { expression: 'ways(6) = 13, ways(7) = 21, ways(8) = 34', annotation: 'Each is the sum of the two before it: 8 + 5, 13 + 8, 21 + 13.' },
      ],
      answer: 'There are 34 ways to climb 8 stairs taking 1 or 2 at a time.',
    },
    {
      id: 'dp1-001-ch2',
      prompt: 'Work backwards. A table of ways(0) to ways(7) reads 1, 1, 1, 2, 3, 4, 6, 9 for some set of step sizes. What are the step sizes?',
      walkthrough: [
        { expression: 'ways(1) = 1 and ways(2) = 1', annotation: 'A step of 1 exists (otherwise ways(1) = 0), and a step of 2 does not: with 1 and 2, ways(2) would be 2.' },
        { expression: 'ways(3) = 2', annotation: 'A step of 1 alone would give ways(3) = ways(2) = 1. The extra way must be a single move of 3: ways(3) = ways(2) + ways(0) = 1 + 1.' },
        { expression: 'ways(4) = ways(3) + ways(1) = 3, … , ways(7) = ways(6) + ways(4) = 6 + 3 = 9', annotation: 'The rule ways(i) = ways(i − 1) + ways(i − 3) reproduces every entry, so no other step size is needed up to 7.' },
      ],
      answer: 'The steps are 1 and 3: ways(i) = ways(i − 1) + ways(i − 3) gives exactly 1, 1, 1, 2, 3, 4, 6, 9.',
    },
    {
      id: 'dp1-001-ch3',
      prompt: 'Stair 4 is broken: you may climb past it, but never land on it. How many ways are there to climb 6 stairs with steps of 1 or 2?',
      walkthrough: [
        { expression: 'ways(4) = 0', annotation: 'Change the subproblem, not the recurrence: no climb may end on stair 4, so the number of ways to reach it is 0.' },
        { expression: 'ways(0..3) = 1, 1, 2, 3', annotation: 'Unchanged below the broken stair.' },
        { expression: 'ways(5) = ways(4) + ways(3) = 0 + 3 = 3,  ways(6) = ways(5) + ways(4) = 3 + 0 = 3', annotation: 'Every route that would have used stair 4 is now worth 0 and drops out automatically.' },
      ],
      answer: 'There are 3 ways: 1+1+1+2+1, 1+2+2+1 and 2+1+2+1. Every one reaches stair 3 in one of its 3 ways, jumps 3 → 5, then steps to 6.',
    },
  ],

  misconceptions: [
    {
      falseBelief: 'Adding a memo makes any recursive function faster.',
      whyStudentsThinkIt: 'Memoization turned an exponential count into a linear one here, so it looks like a general speed-up for recursion.',
      correctionExample: 'Merge sort on 8 numbers sorts the halves [0..3] and [4..7], then [0..1], [2..3], [4..5], [6..7]: 15 sub-arrays, and no sub-array is ever sorted twice. A memo would store 15 results and never use one.',
      contrastCase: 'For ways(6), the same subproblem ways(2) comes up 5 times, so a memo saves 14 of 25 calls. A memo only helps where subproblems repeat.',
    },
    {
      falseBelief: 'Any way of splitting the possibilities into smaller cases gives a correct counting recurrence.',
      whyStudentsThinkIt: 'For best-answer problems, considering extra cases is harmless: a minimum over more options is still the minimum.',
      correctionExample: 'Split the climbs of 4 stairs by "contains a 1-step" and "contains a 2-step". 1+1+2 is in both groups and 1+1+1+1 only in one, so adding the group sizes (4 + 4 = 8) counts 1+1+2, 1+2+1 and 2+1+1 twice and gives 8 instead of 5.',
      contrastCase: 'Splitting by the last move gives groups that do not overlap and cover everything: 3 + 2 = 5, exactly right.',
    },
    {
      falseBelief: 'Dynamic programming means filling in a 2D table.',
      whyStudentsThinkIt: 'Many famous examples (edit distance, knapsack) are drawn as grids.',
      correctionExample: 'Climbing stairs is a dynamic program with a 1D table of 11 entries for n = 10, and the version in Python cell 3 keeps only 2 numbers.',
      contrastCase: 'What makes it DP is computing each subproblem once in a valid order; the shape of the table follows from what one subproblem is.',
    },
  ],

  transferPrompts: [
    {
      situation: 'You need the number of different strings of length 12 made of the letters A and B with no two Bs next to each other.',
      competingTechniques: ['Generate all 4,096 strings and test each one', 'A recurrence split by the last letter, tabulated'],
      whyThisTechniqueWins: 'Split by the end of the string. A valid string of length n ends in A (after any valid string of length n − 1) or in AB (after any valid string of length n − 2). So s(n) = s(n − 1) + s(n − 2), with s(0) = 1 and s(1) = 2: the stairs recurrence with different base cases, giving 377 in 11 additions. Testing all 4,096 strings also gives 377 at length 12, but the work doubles with every extra letter.',
    },
    {
      situation: 'A recursive function computes the shortest-path distance between two cities by trying every neighbour, and it is far too slow on a large road map.',
      competingTechniques: ['Memoize the function on the current city', 'Use a shortest-path algorithm such as Dijkstra\'s'],
      whyThisTechniqueWins: 'Memoization needs the subproblems to form an acyclic graph. Roads go both ways, so "distance from city X" depends on cities that depend on X again, and a naive memo either loops forever or caches an unfinished value. Dijkstra\'s algorithm handles the cycles. When the map is one-way with no cycles (a DAG), DP is the right tool: that is lesson 2.3.',
    },
  ],

  debugging: [
    {
      commonError: 'Caching on only some of the arguments.',
      symptom: 'Each call gives the right answer on its own, but asking a second question with a different value of the other argument returns the first question\'s answer.',
      whyItHappened: 'The cache key is n, but the answer also depends on k, so the cache returns a value computed for a different k.',
      repairStrategy: 'List every parameter and every outside variable the function reads. The key must contain each one that can change: here n + "," + k.',
    },
    {
      commonError: 'Leaving out ways(0), or setting ways(0) = 0.',
      symptom: 'Every count comes out too small: with ways(0) = 0 the table reads 0, 1, 1, 2, 3, 5, … so ways(4) is 3 instead of 5.',
      whyItHappened: 'The way that ends with a single 2-step from the ground is counted through ways(0). Setting it to 0 throws those ways away.',
      repairStrategy: 'Check the smallest cases by listing them: 2 stairs can be climbed as 1+1 or 2, so ways(2) must be 2, which forces ways(0) = 1.',
    },
    {
      commonError: 'Filling the table in an order where an entry is used before it is computed.',
      symptom: 'Answers are too small and look random, because unfilled entries still hold 0 or undefined (and undefined + 1 gives NaN).',
      whyItHappened: 'Step 4 was skipped: the loop runs downwards, or over a range that does not start at the base cases.',
      repairStrategy: 'For each entry, write which entries it reads (table[i − 1], table[i − 2]) and confirm the loop has already passed them.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Given a counting problem split by a last choice, write its recurrence and base cases and compute it both by memoization and by tabulation.',
    explainVerbally: 'Explain why plain recursion is slow here (the same subproblems are recomputed, 2·ways(n) − 1 calls), and why storing answers is safe (each depends only on its own arguments).',
    detectIncorrectApplication: 'Recognise when memoization cannot help (subproblems never repeat, as in merge sort) and when a cache is wrong (its key leaves out part of what the answer depends on).',
    transferToUnfamiliar: 'Turn a new counting question, such as strings with no two adjacent Bs, into the same recurrence with different base cases.',
  },

  semantics: {
    core: [
      { symbol: 'ways(i)', meaning: 'The number of ways to climb i stairs. It names one subproblem, and the whole method rests on saying exactly what it counts.' },
      { symbol: 'ways(i) = ways(i − 1) + ways(i − 2)', meaning: 'The recurrence: it builds the answer for i from the two smaller answers, by splitting on the last move.' },
      { symbol: 'ways(0) = 1', meaning: 'A base case: the one way to climb nothing. It is what makes the "last move was 2 from the ground" case count.' },
      { symbol: 'memo', meaning: 'A Map from a subproblem\'s key to its answer. It turns repeated calls into lookups, as long as the key captures everything the answer depends on.' },
      { symbol: 'table', meaning: 'An array where entry i holds ways(i), filled in increasing i so every entry it reads already exists.' },
      { symbol: 'C(n) = 2·ways(n) − 1', meaning: 'The number of calls plain recursion makes: it grows as fast as the answer, which is why the recursion is exponential.' },
    ],
    rulesOfThumb: [
      'Before writing code, finish the sentence "subproblem i is the number (or best value) of …". Most DP bugs are a vague version of that sentence.',
      'Split by the last choice. It almost always gives groups that do not overlap and cover everything.',
      'Check the recurrence against a brute-force count for the first few sizes before trusting it.',
      'If a recursive solution is slow, count how often each subproblem is computed. Repeats mean a memo will help; no repeats mean it will not.',
      'A memo key is every input the answer depends on, nothing less.',
    ],
  },

  spiral: {
    recoveryPoints: [
      { lessonId: 'gp-33-recursion-and-induction', label: 'Recursion and Induction', note: 'Review how a recursive function reaches its base case, and how induction proves it correct: both are used in the math section here.' },
      { lessonId: 'discrete-1-07', label: 'Recurrence Relations', note: 'Review solving and checking a recurrence with given starting values, which is how the call-count formula is proved.' },
    ],
    futureLinks: [
      { lessonId: 'dp1-002', label: '1D DP Patterns', note: 'Uses the same six-step procedure on best-answer problems (house robber, cheapest climb), where optimal substructure replaces "groups that do not overlap".' },
      { lessonId: 'dp2-003', label: 'DP on DAGs', note: 'Turns the subproblem graph from the rigor section into the main tool: any DP is a computation in topological order.' },
    ],
  },

  checkpoints: [
    { id: 'cp-dp1-001-1', label: 'Read the opening and sort the five climbs of 4 stairs by their last move', type: 'read' },
    { id: 'cp-dp1-001-2', label: 'Read why plain recursion makes 2·ways(n) − 1 calls', type: 'read' },
    { id: 'cp-dp1-001-3', label: 'Read the six-step procedure and say each step for climbing stairs', type: 'read' },
    { id: 'cp-dp1-001-4', label: 'Run the first notebook and find how many times ways(2) is computed for ways(10)', type: 'lab' },
    { id: 'cp-dp1-001-5', label: 'Run the Python cells and read the cache_info line', type: 'lab' },
    { id: 'cp-dp1-001-6', label: 'Work Example 1 without looking, then compare', type: 'example' },
    { id: 'cp-dp1-001-7', label: 'Work Example 2 and list three of its twelve climbs', type: 'example' },
    { id: 'cp-dp1-001-8', label: 'Complete all three coding challenges until they pass', type: 'challenge' },
  ],

  assessment: {
    questions: [
      {
        id: 'dp1-001-assess-1',
        type: 'choice',
        text: 'With steps of 1 or 2, how many ways are there to climb 7 stairs?',
        options: ['21', '13', '34', '14'],
        answer: '21',
        hint: 'Continue the table 1, 1, 2, 3, 5, 8, 13: each entry is the sum of the two before it, and ways(7) is the eighth entry.',
      },
      {
        id: 'dp1-001-assess-2',
        type: 'choice',
        text: 'Which property must a cached function have for memoization to give correct answers?',
        options: [
          'Its result depends only on the arguments in the cache key',
          'It calls itself at least twice with smaller arguments',
          'It returns a number rather than an object or array',
          'Its arguments decrease by exactly one on every call',
        ],
        answer: 'Its result depends only on the arguments in the cache key',
        hint: 'A cache returns an old result for the same key. That is only right if nothing outside the key could have changed the result.',
      },
    ],
  },

  quiz: [
    {
      id: 'dp1-001-quiz-1',
      type: 'choice',
      text: 'Plain recursion computes ways(10) = 89. How many calls does it make?',
      options: ['177', '89', '19', '110'],
      answer: '177',
      hints: ['The math section proves the number of calls is 2 · ways(n) − 1.', '2 × 89 − 1.'],
      reviewSection: 'Math tab: Why plain recursion makes 2·ways(n) − 1 calls',
    },
    {
      id: 'dp1-001-quiz-2',
      type: 'choice',
      text: 'With a memo, how many times is the function entered to compute ways(10)?',
      options: ['19', '10', '11', '177'],
      answer: '19',
      hints: ['Each ways(k) from 2 to 10 is computed once, and each computation makes two calls.', '2 × (10 − 1) calls plus the first call: 2n − 1.'],
      reviewSection: 'Math tab: Why memoization makes 2n − 1 calls',
    },
    {
      id: 'dp1-001-quiz-3',
      type: 'choice',
      text: 'Which of these recursive computations would a memo NOT speed up?',
      options: [
        'Merge sort, splitting an array into halves',
        'Counting climbs of n stairs with steps 1 and 2',
        'Counting paths through a grid moving right or down',
        'Counting climbs where moves can be 1, 3 or 5',
      ],
      answer: 'Merge sort, splitting an array into halves',
      hints: ['A memo saves time only when the same subproblem is asked for more than once.', 'Does merge sort ever sort the same sub-array twice?'],
      reviewSection: 'Misconceptions: Adding a memo makes any recursive function faster',
    },
    {
      id: 'dp1-001-quiz-4',
      type: 'choice',
      text: 'waysUpTo(n, k) caches on n alone. Called as waysUpTo(5, 2) and then waysUpTo(5, 3) with the same cache, what does the second call return?',
      options: ['8', '13', '5', '21'],
      answer: '8',
      hints: ['The first call stores the answer for n = 5 with k = 2.', 'The second call finds n = 5 in the cache and returns the stored value, though the right answer for k = 3 is 13.'],
      reviewSection: 'Intuition: A cache key must include everything the answer depends on',
    },
    {
      id: 'dp1-001-quiz-5',
      type: 'choice',
      text: 'Why is ways(0) set to 1 rather than 0?',
      options: [
        'Ways ending with a 2-step from the ground are counted through it',
        'Every base case of a counting recurrence must equal one',
        'An array index of 0 must never hold the value zero',
        'It makes the table one entry longer than the answer needs',
      ],
      answer: 'Ways ending with a 2-step from the ground are counted through it',
      hints: ['ways(2) = ways(1) + ways(0). How many ways are there to climb 2 stairs?', 'There are two (1+1 and 2), so ways(0) must contribute 1: the climb that is a single 2-step.'],
      reviewSection: 'Debugging: Leaving out ways(0), or setting ways(0) = 0',
    },
    {
      id: 'dp1-001-quiz-6',
      type: 'choice',
      text: 'You split the climbs of 4 stairs into "contains a 1-step" and "contains a 2-step" and add the two counts. What goes wrong?',
      options: [
        'Climbs with both step sizes are counted twice',
        'Climbs with only one step size are left out',
        'Nothing: any split gives the right total',
        'The count is right, but it is slower to compute',
      ],
      answer: 'Climbs with both step sizes are counted twice',
      hints: ['Which group is 1+1+2 in?', 'It is in both, so the groups overlap: 4 + 4 = 8 instead of 5.'],
      reviewSection: 'Misconceptions: Any way of splitting the possibilities gives a correct counting recurrence',
    },
    {
      id: 'dp1-001-quiz-7',
      type: 'choice',
      text: 'With steps of 1, 3 or 5, which entries must already be filled before ways(7) can be computed?',
      options: ['ways(6), ways(4) and ways(2)', 'ways(6) and ways(5)', 'ways(6), ways(5) and ways(4)', 'ways(1), ways(3) and ways(5)'],
      answer: 'ways(6), ways(4) and ways(2)',
      hints: ['The last move was 1, 3 or 5. How many stairs had been climbed before it?', '7 − 1, 7 − 3 and 7 − 5.'],
      reviewSection: 'Examples: Steps of 1, 3 or 5, for 7 stairs',
    },
  ],
}
