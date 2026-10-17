export const task = (params, prompt, constraints, cases, hints) => ({
  params, prompt, constraints, hints,
  cases: cases.map(([args, expected]) => ({ args, expected })),
  starters: {
    Python: `def solve(${params}):\n    # Write your solution here. Return the result.\n    pass\n`,
    JavaScript: `function solve(${params}) {\n  // Write your solution here. Return the result.\n}\n`,
  },
})

export const CHALLENGES = {
  recursion: task('n', 'Return the sum of the decimal digits of n. Use this exercise to practice reducing a problem until it reaches a stopping case. Return a number, not printed text.', 'n is an integer from 0 through 999999999. Recursive and iterative implementations are accepted.', [
    [[407], 11], [[0], 0], [[9], 9], [[10020], 3], [[999999999], 81], [[123456], 21],
  ], ['What remains after removing the last digit?', 'Which input no longer needs a smaller problem?', 'Test a number with a zero in the middle; that zero must not stop the whole calculation.']),
  'recursive-trees': task('n', 'Count every function call made by naive Fibonacci(n), including the initial call and repeated calls. The function returns immediately for n = 0 or 1; otherwise it calls Fibonacci(n − 1) and Fibonacci(n − 2) once each. Return the call count, not the Fibonacci value.', '0 ≤ n ≤ 25. You may compute the count without actually making all the calls.', [
    [[3], 5], [[0], 1], [[1], 1], [[2], 3], [[5], 15], [[10], 177], [[20], 21891],
  ], ['Draw one box for every invocation, including the root.', 'How many calls happen before either child starts?', 'Check n = 2 manually: repeated subproblems and unique subproblems are different counts.']),
  induction: task('n', 'Return the sum of the first n positive odd numbers. For n = 3 the terms are 1, 3, and 5. Before coding, identify a stopping case and explain why adding the next odd number preserves your claim.', '0 ≤ n ≤ 1000. A loop, recurrence, or justified closed form is accepted; code checks validate the result, not the proof.', [
    [[3], 9], [[0], 0], [[1], 1], [[2], 4], [[17], 289], [[1000], 1000000],
  ], ['Write the terms for n = 0, 1, and 2.', 'Which single term changes when n increases by one?', 'Your explanation must cover both the first case and the step to the next case.']),
  asymptotics: task('n, k', 'A table fills states i = 1 through n. At state i it tries every jump j = 1 through min(i, k). Return the total number of transitions inspected. Do not count initializing state 0.', '0 ≤ n ≤ 10000; 1 ≤ k ≤ 100. Return an integer.', [
    [[4, 2], 7], [[0, 3], 0], [[1, 8], 1], [[3, 10], 6], [[5, 1], 5], [[10000, 100], 995050],
  ], ['Count one row at a time for a small table.', 'Are all rows long enough to use all k jumps?', 'When k exceeds n, the row lengths should still grow from one rather than starting at k.']),
  enumeration: task('values, target', 'Count subsets of input positions whose values sum to target. Each position can be used at most once. Equal values at different positions are separate choices. Include the empty subset when its sum matches.', 'At most 15 integers, each between −5 and 9; −30 ≤ target ≤ 60. Return the number of subsets.', [
    [[[1, 2, 2], 3], 2], [[[], 0], 1], [[[], 2], 0], [[[0, 0], 0], 4], [[[-2, 2, 3], 3], 2], [[[1, 1, 1], 2], 3],
  ], ['Name the two choices for one input position.', 'How will you distinguish equal values at different positions?', 'A partial sum above the target is not necessarily hopeless when negative values remain.']),
  'recursive-backtracking': task('n', 'Return the number of binary strings of length n that do not contain adjacent 1s. The empty string counts as one valid string. Only return the count; do not return the strings.', '0 ≤ n ≤ 25. A binary string uses only 0 and 1.', [
    [[3], 5], [[0], 1], [[1], 2], [[2], 3], [[4], 8], [[10], 144], [[25], 196418],
  ], ['List the valid strings of length two.', 'Does the whole prefix matter, or only a property of its final symbol?', 'Two different prefixes can have the same set of legal suffixes, but both prefixes still contribute to the count.']),
  overlap: task('n', 'Naive Fibonacci(n) stops at 0 and 1, and otherwise requests n − 1 and n − 2. Return the number of distinct argument values requested, including n itself. Count a repeated argument only once.', '0 ≤ n ≤ 1000. Do not expand an exponential call tree for large inputs.', [
    [[4], 5], [[0], 1], [[1], 1], [[2], 3], [[8], 9], [[1000], 1001],
  ], ['Label states by the argument, not by where the call was drawn.', 'Does a call at a base case make any child calls?', 'Compare n = 1 with n = 2 before generalizing a pattern.']),
  'optimal-substructure': task('costs', 'You start just before a line of paid stepping stones. Move forward one or two positions at a time, paying a stone’s cost when you land on it. Return the cheapest cost to move just beyond the last stone. An empty line costs zero; a single stone may be skipped.', '0–100 stones; each cost is an integer from 0 to 100. You may start by landing on stone 0 or stone 1, or on the exit if it is within two positions.', [
    [[[10, 15, 20]], 15], [[[]], 0], [[[7]], 0], [[[4, 6]], 4], [[[1, 100, 1, 1, 1]], 3], [[[0, 0, 0]], 0],
  ], ['Which last landing positions can reach the exit?', 'Could replacing an expensive prefix with a cheaper prefix change the legal next moves?', 'For one stone, check whether stepping directly to the exit is permitted.']),
  'state-sufficiency': task('rewards', 'Choose activity A or B on each day, with no activity repeated on consecutive days. rewards[i] is [reward_for_A, reward_for_B] on day i. Return the maximum total reward. You must choose an activity on every day.', '0–100 days; each reward is an integer between −100 and 100. An empty schedule returns zero.', [
    [[[[8, 7], [100, 0]]], 107], [[[]], 0], [[[[-3, -1]]], -1], [[[[3, 9], [2, 5], [7, 1]]], 15], [[[[0, 0], [0, 0]]], 0],
  ], ['Can the best total so far tell you which activity is allowed tomorrow?', 'Try preserving two partial schedules with different final activities.', 'A negative reward does not make skipping a day legal.']),
  'state-meaning': task('values', 'Return a prefix-sum table of length len(values) + 1. Entry i must equal the sum of exactly the first i values. Entry 0 represents an empty prefix.', '0–100 integers, each between −100 and 100. Return a list/array.', [
    [[[4, -2, 7]], [0, 4, 2, 9]], [[[]], [0]], [[[-5]], [0, -5]], [[[0, 0]], [0, 0, 0]], [[[2, 3]], [0, 2, 5]],
  ], ['Translate “first i values” into indices before writing a loop.', 'What does the extra table entry represent?', 'A one-element input should produce two entries.']),
  transitions: task('n', 'Count ordered sequences of jumps of size 1 or 3 that total exactly n. Different orders are different sequences. The empty sequence reaches zero in one way.', '0 ≤ n ≤ 30. Return an integer count.', [
    [[4], 3], [[0], 1], [[1], 1], [[2], 1], [[3], 2], [[6], 6], [[8], 13],
  ], ['Group valid sequences by their final jump.', 'Could the same sequence belong to both final-jump groups?', 'Check whether an index below zero represents a legal previous position.']),
  'base-cases': task('rows, cols', 'Return the number of paths from the top-left cell to the bottom-right cell of an empty rectangular grid, using only right and down moves. A grid with zero rows or columns has no path.', '0 ≤ rows, cols ≤ 15. A single-cell grid has one path: make no moves.', [
    [[2, 3], 3], [[0, 4], 0], [[4, 0], 0], [[1, 1], 1], [[1, 8], 1], [[3, 3], 6],
  ], ['Compare no grid with a grid containing one cell.', 'How many choices do you have on the first row?', 'The empty action sequence can be valid even when there are no moves to make.']),
  unreachable: task('coins, amount', 'Return the fewest coins needed to make amount exactly using unlimited copies of each denomination. Return −1 if impossible. Making zero needs zero coins.', 'coins contains distinct positive integers; 0–8 denominations; 0 ≤ amount ≤ 100.', [
    [[[2, 5], 3], -1], [[[2, 5], 0], 0], [[[], 4], -1], [[[2, 5], 7], 2], [[[4], 8], 2], [[[3, 7], 11], -1],
  ], ['Should an uncomputed positive amount look like a free solution?', 'What happens if you add a coin to an impossible predecessor?', 'Distinguish the value representing impossibility internally from the required return value.']),
  'dependency-order': task('values', 'Return a suffix-minimum table: output[i] is the smallest value from input index i through the end. Return an empty table for empty input.', '0–100 integers between −100 and 100.', [
    [[[4, 2, 7, 1, 5]], [1, 1, 1, 1, 5]], [[[]], []], [[[8]], [8]], [[[-1, -4, 0]], [-4, -4, 0]], [[[1, 2, 3]], [1, 2, 3]],
  ], ['Which neighboring suffix is contained inside the current suffix?', 'Draw the dependency arrow before choosing loop direction.', 'The last position has no smaller suffix to consult.']),
  'answer-extraction': task('values', 'Return the largest sum of a nonempty contiguous segment. If the input is empty, return 0. You may not skip elements inside the segment.', '0–100 integers between −100 and 100. For a nonempty all-negative input, return its largest element.', [
    [[[4, -1, 2, -10]], 5], [[[]], 0], [[[-5, -2, -8]], -2], [[[3]], 3], [[[-1, 4, -2, 5]], 7], [[[0, 0]], 0],
  ], ['Does the optimal segment necessarily touch the last input position?', 'Separate the best segment ending here from the best seen anywhere.', 'If all numbers are negative, is an empty segment allowed?']),
  'dp-vs-greedy': task('amount', 'A machine accepts coins of value 1, 3, and 4. Return the minimum number of coins needed for amount. All denominations may be reused.', '0 ≤ amount ≤ 100. Return 0 for amount 0.', [
    [[6], 2], [[0], 0], [[1], 1], [[2], 2], [[8], 2], [[10], 3], [[15], 4],
  ], ['Try the largest-coin strategy on a small amount that is a multiple of three.', 'What alternatives does committing to the largest coin discard?', 'Use your smallest counterexample as a regression test.']),
  memoization: task('n', 'Count ordered ways to climb n steps using jumps of 1, 2, or 3. The empty climb counts as one way. Reuse solved subproblems so the largest test does not require an exponential search.', '0 ≤ n ≤ 30. Return an integer. Both memoization and tabulation are accepted.', [
    [[4], 7], [[0], 1], [[1], 1], [[2], 2], [[5], 13], [[30], 53798080],
  ], ['When two calls have the same remaining distance, can their answers differ?', 'Where could you store a completed answer so another call can reuse it?', 'A cached zero is still a cached answer; test membership rather than truthiness.']),
  tabulation: task('n', 'Count ordered ways to total n using jumps of 1 or 4. Build or otherwise efficiently evaluate smaller distances before larger ones. The empty sequence counts once.', '0 ≤ n ≤ 30. Return an integer count.', [
    [[5], 3], [[0], 1], [[3], 1], [[4], 2], [[8], 7], [[10], 14],
  ], ['Which distances must already be solved before a row can be filled?', 'What should be in the table before the first positive distance?', 'For distances below four, which moves are actually available?']),
  'dense-sparse': task('values', 'Return all distinct sums reachable by choosing any subset of positions, sorted in increasing order. Each position may be used once. Include zero for the empty subset.', 'At most 12 integers, each between −1000000 and 1000000. Return a sorted list/array with no duplicates.', [
    [[[1000000, 3]], [0, 3, 1000000, 1000003]], [[[]], [0]], [[[2, 2]], [0, 2, 4]], [[[-2, 2]], [-2, 0, 2]], [[[0, 0]], [0]],
  ], ['How many different states are actually reached compared with the numeric range?', 'Should the sums created by this item be eligible to use this same item again?', 'Separate the old reachable sums from the sums being added in this step.']),
  'cache-keys': task('grids', 'For each grid, return its right/down path count from top-left to bottom-right. A 1 blocks a cell; a 0 is open. Each grid is a separate problem, even when its dimensions match another grid. Return the answers in input order.', 'Each grid is rectangular and at most 8×8; empty grids and blocked endpoints return 0.', [
    [[[[[0, 0], [0, 0]], [[0, 1], [0, 0]]]], [2, 1]], [[[[[1]], [[0]], []]], [0, 1, 0]], [[[[[0, 0, 0]], [[0, 1, 0]], [[0, 0, 0]]]], [1, 0, 1]],
  ], ['What information can change between two calls with the same coordinates?', 'Decide whether the cache belongs to one grid or to all grids.', 'Run an open grid, a blocked grid, and the open grid again in one invocation.']),
  'stack-limits': task('values', 'Return the sum of values without depending on a call stack that grows with input length. The longest test exceeds typical Python recursion depth.', '0–3000 integers between −100 and 100. Use a loop, explicit work stack, or a nonrecursive built-in.', [
    [[[2, -3, 8]], 7], [[[]], 0], [[[0]], 0], [[Array(3000).fill(1)], 3000], [[[-10, -2]], -12],
  ], ['Does a pending return really need to be stored for every element?', 'What information must survive from one iteration to the next?', 'Removing recursive calls should preserve the same result on an empty input.']),
  'numeric-safety': task('a, b', 'a and b are nonnegative integers written as decimal strings. Return their exact sum as a decimal string with no unnecessary leading zeros. Do not convert through a JavaScript Number.', 'Each input has 1–80 digits. Python int and JavaScript BigInt are allowed; convert the result back to a string.', [
    [['9007199254740993', '2'], '9007199254740995'], [['0', '0'], '0'], [['0009', '001'], '10'], [['99999999999999999999', '1'], '100000000000000000000'], [['123', '456'], '579'],
  ], ['Can your numeric type represent every input integer exactly?', 'Parsing into an approximate type first cannot be repaired by converting later.', 'The required output type matters as much as its printed digits.']),
  'modular-counting': task('n, modulus', 'Return Fibonacci(n) modulo modulus, using Fibonacci(0) = 0 and Fibonacci(1) = 1. Keep intermediate arithmetic bounded.', '0 ≤ n ≤ 1000; 1 ≤ modulus ≤ 1000000. Return a number, not a string.', [
    [[10, 7], 6], [[0, 5], 0], [[1, 1], 0], [[20, 100], 65], [[100, 1000], 75], [[1000, 2], 1],
  ], ['Which operations in this recurrence are compatible with taking a remainder?', 'Does modulus one need a special mathematical rule?', 'Large n should not require storing the full Fibonacci integer.']),
  'table-aliasing': task('rows, cols, updates', 'Create a rows×cols table of zeros. Apply each update [row, column, value] in order, replacing that cell. Return the final table. Changing one row must not change any other row.', '0 ≤ rows, cols ≤ 10. All update coordinates are valid; when either dimension is zero there are no updates.', [
    [[2, 2, [[0, 1, 7]]], [[0, 7], [0, 0]]], [[0, 3, []], []], [[2, 0, []], [[], []]], [[2, 2, [[0, 0, 1], [1, 0, 3], [0, 0, 5]]], [[5, 0], [3, 0]]],
  ], ['How many independent row objects did you create?', 'Two equal rows need not be the same mutable object.', 'Change one cell, then inspect the same column in every other row.']),
  'differential-testing': task('values', 'Return the maximum sum obtainable by selecting non-adjacent positions. Selecting nothing is allowed. For small inputs, write an exhaustive oracle first; use it to check a faster implementation.', 'At most 15 integers between −20 and 30. Equal values at different positions are distinct positions.', [
    [[[2, 7, 9, 3, 1]], 12], [[[]], 0], [[[-3, -1]], 0], [[[8, 1, 8]], 16], [[[4, 5, 4]], 8], [[[0, 0]], 0],
  ], ['What does a subset mask let you inspect independently of your optimized algorithm?', 'Which pairs of selected positions make a candidate invalid?', 'Use an asymmetric input so accidentally reversing or skipping indices is detectable.']),
  invariants: task('values', 'Return running maxima: output[i] must be the largest value among positions 0 through i. Do not include an extra empty-prefix entry.', '0–100 integers between −1000 and 1000. Empty input returns an empty list/array.', [
    [[[-4, -7, -2, -9]], [-4, -4, -2, -2]], [[[]], []], [[[3]], [3]], [[[1, 5, 2, 8]], [1, 5, 5, 8]], [[[0, 0]], [0, 0]],
  ], ['Write a sentence describing what your running value means after each iteration.', 'Is zero a valid initial best value for every possible input?', 'Check the first output before investigating later outputs.']),
  'edge-cases': task('grid', 'Return the minimum sum along a path from top-left to bottom-right, moving right or down and including both endpoint values. Return 0 when the grid has no cells.', 'Rectangular grid, at most 10×10; integer costs between −20 and 20. Negative costs are allowed; there are no cycles.', [
    [[[[1, 3, 1], [1, 5, 1], [4, 2, 1]]], 7], [[[]], 0], [[[[]]], 0], [[[[-5]]], -5], [[[[2, -4, 3]]], 1], [[[[1], [-3], [2]]], 0], [[[[1, -5], [2, 1]]], -3],
  ], ['Separate “no cells” from “one cell” before filling the table.', 'Can every cell use both a top and a left predecessor?', 'Negative costs are safe on this acyclic grid, but a zero sentinel may still be wrong.']),
  reconstruction: task('n', 'Start at position 0 and reach n using jumps of 1 or 3. Return a list of visited positions, including 0 and n, using the fewest jumps. If several shortest paths exist, repeatedly choose the smaller predecessor position when tracing backward from n.', '0 ≤ n ≤ 100. The tie rule is defined backward from the target, not by forward lexicographic order.', [
    [[4], [0, 1, 4]], [[0], [0]], [[2], [0, 1, 2]], [[3], [0, 3]], [[5], [0, 1, 2, 5]], [[8], [0, 1, 2, 5, 8]],
  ], ['What extra information would let you retrace a best transition?', 'When two choices tie, apply the stated rule at the current destination.', 'A backward trace must be reversed before it is returned.']),
  ties: task('values', 'Select non-adjacent positions, possibly none. Return an object/dict with keys best and ways: the maximum possible sum and the number of distinct position subsets that attain it. Different subsets with equal values still count separately.', 'At most 15 integers between −10 and 20. The empty input has best 0 and ways 1.', [
    [[[1, 1]], { best: 1, ways: 2 }], [[[]], { best: 0, ways: 1 }], [[[0]], { best: 0, ways: 2 }], [[[0, 0]], { best: 0, ways: 3 }], [[[2, 1, 2]], { best: 4, ways: 1 }], [[[-2, -1]], { best: 0, ways: 1 }],
  ], ['Keep the best value and its multiplicity as different pieces of information.', 'What should happen to counts when two disjoint choices produce equal values?', 'Zero-valued items can create extra optimal subsets without improving the score.']),
}
