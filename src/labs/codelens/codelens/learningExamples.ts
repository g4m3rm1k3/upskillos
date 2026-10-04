import type { LibraryExample } from './library'

/** Small bridges into the longer examples: each isolates one tracing idea. */
export const LEARNING_EXAMPLES: LibraryExample[] = [
  {
    id: 'call-return-print', title: 'Call, return, then print', group: 'Functional Programming', difficulty: 'Beginner',
    concept: 'Defining a function saves a recipe; it does not run the body. A call binds an argument to a parameter, executes the body, and gives a value back to the caller. Returning a value does not print it. Step through the separate call, assignment and print to see when each value becomes available.',
    prerequisites: ['Variables and addition'],
    watch: ['Keep Explain and Output beside each other. Output stays empty until the print executes.', 'Calls gains a node only when add_fee is called. Its return appears when that call finishes.', 'subtotal belongs to the function frame. receipt belongs to the caller and is assigned after the return.'],
    edgeCases: ['Try a price of zero.', 'Call the function twice with different prices: each call gets its own parameters.'],
    exercises: ['Predict the output before running.', 'Print inside the function as well; compare printing during the call with printing afterward.'],
    variants: {
      py: { code: `# Defining this recipe does not calculate a receipt yet.
def add_fee(price, fee):
    # These parameters belong to this call, not the caller's variables.
    subtotal = price + fee
    # Hand the number back. Nothing is printed by return.
    return subtotal

# Pause here: the body runs before receipt receives the returned number.
receipt = add_fee(12, 3)
# Only this statement sends the completed result to Output.
print("receipt:", receipt)
`, output: ['receipt: 15'] },
      js: { code: `// Defining the function saves a recipe without executing its body.
function add_fee(price, fee) {
  // Each call owns its parameters and local subtotal.
  const subtotal = price + fee
  // Return supplies a value to the caller; it does not print.
  return subtotal
}
// Evaluate the call first, then bind receipt to its result.
const receipt = add_fee(12, 3)
// Output changes only when this statement executes.
console.log("receipt:", receipt)
`, output: ['receipt: 15'] },
    },
  },
  {
    id: 'named-list-alias-copy', title: 'One list, two names, and a copy', group: 'Data Structures', difficulty: 'Beginner',
    concept: 'Assigning a list to a second variable gives the same list another name; it does not duplicate its elements. A shallow copy creates a different outer list. Watch names and object identities together to distinguish a mutation visible through both aliases from a mutation confined to the copy.',
    prerequisites: ['Variables', 'List indexing'],
    watch: ['Structures shows scores = same_scores on one object, with its identity still available.', 'copied_scores gets a different identity.', 'Changing index 0 through same_scores changes scores too; appending to copied_scores does not.'],
    edgeCases: ['Start with an empty list and append instead of assigning index 0.', 'With nested lists, a shallow copy still shares the inner lists.'],
    exercises: ['Predict both printed lists.', 'Replace the copy with a plain assignment and explain the changed output.'],
    variants: {
      py: { code: `# This statement creates a list and binds scores to it.
scores = [3, 5]
# This adds an alias: there is still only one list so far.
same_scores = scores
# A copy gets a separate outer list object.
copied_scores = scores.copy()
# Mutating through the alias is visible through scores too.
same_scores[0] = 9
# Only the copied list receives this extra element.
copied_scores.append(7)
print("original:", scores)
print("copy:", copied_scores)
`, output: ['original: [9, 5]', 'copy: [3, 5, 7]'] },
      js: { code: `// The array is an object; scores is a name referring to it.
const scores = [3, 5]
// No copy: both names refer to the same array.
const same_scores = scores
// slice makes a new outer array with the same elements.
const copied_scores = scores.slice()
// This changes the array seen through scores and same_scores.
same_scores[0] = 9
// The copied array alone grows.
copied_scores.push(7)
console.log("original:", scores.join(", "))
console.log("copy:", copied_scores.join(", "))
`, output: ['original: 9, 5', 'copy: 3, 5, 7'] },
    },
  },
  {
    id: 'grid-move-return-unpack', title: 'One grid move: return and unpack', group: 'Reinforcement Learning', difficulty: 'Beginner',
    concept: 'Before filling a table for every action, trace one downward move. Row increases downward and column increases to the right. A function returns both coordinates as one tuple; unpacking then assigns its two entries to two caller variables. The original coordinates stay unchanged because this function returns a new position.',
    prerequisites: ['Variables', 'Functions', 'Integer comparison'],
    watch: ['Follow the caller into move_down, then back to the assignment.', 'A tuple is created by the comma in return, then unpacked by the comma on the assignment side.', 'At row 4, min keeps the position inside the grid; the column never changes.'],
    edgeCases: ['Set current_row to 4: the move stays at the bottom wall.'],
    exercises: ['Write move_right: change only the column.', 'Print the original position after the call to check that it was not changed.'],
    variants: { py: { code: `# A five-row grid uses row indices 0, 1, 2, 3, 4.
def move_down(row, col):
    # First propose the next row; this is not the final position yet.
    proposed_row = row + 1
    # min chooses the smaller value, preventing a row beyond the wall.
    bounded_row = min(4, proposed_row)
    # The comma packages two numbers into one returned tuple.
    return bounded_row, col

# Row and column locate the cell before the move.
current_row = 0
current_col = 2
# Run the call, receive its tuple, then unpack it into these two names.
next_row, next_col = move_down(current_row, current_col)
# Printing happens after both caller variables have been assigned.
print("next:", next_row, next_col)
`, output: ['next: 1 2'] } },
  },
]
