// Write the learning contract BEFORE authoring targets. This is an authoring gate,
// not an automated claim that a learner understands the material.
// Prerequisites name stable lesson ids; a later concept may not silently become an entry requirement.
export const CONTRACTS = {
  '00-meet-dice-duel': {
    outcome: 'Explain the roll, bank, bust and win rules after trying the preview.',
    prerequisites: [], recall: 'No C++ knowledge is required. Choose whether you would keep five points or risk another roll.',
    transfer: 'Trace a bank, bust and winning roll without looking at the rules.', concepts: ['game state', 'action', 'outcome'],
  },
  '01-source-to-program': {
    outcome: 'Create, compile and run a C++ program, then explain why an old executable ignores a source edit.',
    prerequisites: ['00-meet-dice-duel'], recall: 'What information did the game display? Choose one line your own program could print.',
    transfer: 'Write a different greeting without the target visible; deliberately run a stale executable and recover.', concepts: ['source and executable', 'compiler', 'entry point'],
  },
  '02-values-and-types': {
    outcome: 'Calculate remaining points and a fractional ratio using appropriate C++ types.',
    prerequisites: ['01-source-to-program'], recall: 'Which command must run after changing C++ source? Explain before compiling.',
    transfer: 'Change the input numbers in the independent report and recompute the expected result by hand.', concepts: ['types', 'initialization and assignment', 'arithmetic'],
  },
  '03-input-and-failure': {
    outcome: 'Read terminal input and handle failed extraction before using a value.',
    prerequisites: ['02-values-and-types'], recall: 'Give a value that belongs in an int, then an input that cannot be read as an int.',
    transfer: 'Handle valid, word and end-of-input cases in a different calculation.', concepts: ['streams', 'extraction failure', 'exit status'],
  },
  '04-decisions-and-boundaries': {
    outcome: 'Implement a decision that distinguishes below, exactly at, and beyond a boundary.',
    prerequisites: ['03-input-and-failure'], recall: 'At score four and pot eight, has the target twelve been reached?',
    transfer: 'Use a different target and explain the equality case with the example hidden.', concepts: ['conditions', 'boolean operations', 'boundary cases'],
  },
  '05-functions-and-results': {
    outcome: 'Put a calculation in a function and use its returned value in a caller.',
    prerequisites: ['04-decisions-and-boundaries'], recall: 'Describe the remaining-points calculation in words before naming its inputs.',
    transfer: 'Write and call a different boolean rule function; identify parameters, arguments and the returned value.', concepts: ['function call', 'value return', 'scope'],
  },
  '06-copies-and-references': {
    outcome: 'Choose between copying a value, mutating the caller, and borrowing read-only.',
    prerequisites: ['05-functions-and-results'], recall: 'What happens to a function’s local names after it returns?',
    transfer: 'Transfer into only the second player’s score and reset the caller’s pot.', concepts: ['copy', 'reference and alias', 'const reference'],
  },
  '07-players-and-collections': {
    outcome: 'Represent independent players, select an array element and distinguish a value copy from an alias.',
    prerequisites: ['06-copies-and-references'], recall: 'Draw the difference between two integers with equal values and two names for one integer.',
    transfer: 'Change a copied player while preserving both originals; explain why fixed players and growing history use different containers.', concepts: ['struct members', 'fixed array', 'growing vector'],
  },
  '08-actions-and-loops': {
    outcome: 'Trace repeated updates and stop a recorded turn at the first bust.',
    prerequisites: ['07-players-and-collections'], recall: 'Which indices are valid in an array with two elements?',
    transfer: 'Handle empty, no-bust, bust-first and trailing-roll cases without copying the loop.', concepts: ['named action', 'iteration and accumulation', 'break versus continue'],
  },
  '09-tests-that-fail': {
    outcome: 'Write a test that both accepts correct behavior and rejects a known bug.',
    prerequisites: ['08-actions-and-loops'], recall: 'Why would banking by replacement appear correct when the starting score is zero?',
    transfer: 'Show the same test passing addition and rejecting replacement; explain why disabled assertions are insufficient.', concepts: ['expected versus actual', 'failure status', 'assertion limits'],
  },
  '10-score-class': {
    outcome: 'Protect an invariant with private state and a small public interface.',
    prerequisites: ['09-tests-that-fail'], recall: 'Can an ordinary public integer prevent a caller assigning a negative score?',
    transfer: 'Design and test a bounded counter, including rejection without mutation and independent copies.', concepts: ['class interface', 'const method', 'invariant'],
  },
  '11-valid-construction': {
    outcome: 'Construct a valid object or report that construction failed.',
    prerequisites: ['10-score-class'], recall: 'What must be true about an object before a caller can safely use its methods?',
    transfer: 'Validate both target boundaries in a different Rules class and explain why no invalid object is returned.', concepts: ['constructor initialization', 'explicit conversion', 'exception transfer'],
  },
  '12-snapshots': {
    outcome: 'Expose an independent state snapshot without giving a caller mutation access to the model.',
    prerequisites: ['11-valid-construction', '07-players-and-collections'], recall: 'Does modifying a copied Player alter the original? Explain using storage, not the variable names.',
    transfer: 'Build a match counter with a value snapshot and show that modifying the snapshot leaves the model intact.', concepts: ['composition', 'snapshot', 'interface boundary'],
  },
  '13-rejection-and-exceptions': {
    outcome: 'Distinguish a rejected request from a legal unfavorable outcome, preserving state on failure.',
    prerequisites: ['12-snapshots'], recall: 'If a function returns false after changing the pot, did it preserve the old state?',
    transfer: 'Implement the bounded-pot variant and test both exact admission and rejected overflow.', concepts: ['result convention', 'internal contract failure', 'validate before mutation'],
  },
  '14-lifetimes-and-ownership': {
    outcome: 'Predict destruction order on scope exit and early return.',
    prerequisites: ['13-rejection-and-exceptions'], recall: 'When does a constructor run, and which local names belong to a nested block?',
    transfer: 'Trace a helper’s local object ending while its caller’s object remains alive.', concepts: ['lifetime', 'destructor order'],
  },
  '14b-file-persistence': {
    outcome: 'Save an integer and load it in another process, reporting failures.',
    prerequisites: ['14-lifetimes-and-ownership', '03-input-and-failure'], recall: 'What must succeed before you use an extracted value?',
    transfer: 'Keep a valid save when a later write request is rejected; read independently of standard input.', concepts: ['file streams', 'resource ownership', 'RAII'],
  },
  '14c-borrowed-pointers': {
    outcome: 'Use a checked optional pointer without taking ownership.',
    prerequisites: ['14b-file-persistence', '06-copies-and-references'], recall: 'Can an alias extend the lifetime of an inner block’s integer?',
    transfer: 'Award points to either selected object or safely reject no selection.', concepts: ['address and dereference', 'null', 'borrowing lifetime'],
  },
  '14d-noncopyable-owners': {
    outcome: 'Explain why one owner needs one release and forbid both copying operations.',
    prerequisites: ['14c-borrowed-pointers'], recall: 'Who closes a file stream, and when does that object stop existing?',
    transfer: 'Verify the lifetime trace and both deleted-copy diagnostics for an independently written owner.', concepts: ['copy construction', 'copy assignment', 'noncopyable owner'],
  },
  '15-headers-and-sources': {
    outcome: 'Compile separate callers against one class interface and implementation.',
    prerequisites: ['14d-noncopyable-owners'], recall: 'Which parts of Score must a caller know, and which parts should remain private?',
    transfer: 'Write a shared-implementation test, diagnose an omitted source file and rebuild both executables.', concepts: ['declaration and definition', 'translation unit', 'linking'],
  },
  '16-two-executables': {
    outcome: 'Build two executables that share one implementation and diagnose a missing definition.',
    prerequisites: ['15-headers-and-sources'], recall: 'What did the header declare, and which source file supplied the method bodies?',
    transfer: 'Write an independent boundary test and build it without duplicating the Score implementation.', concepts: ['shared implementation', 'executable boundary', 'version-control milestone'],
  },
  '17-build-dependencies': {
    outcome: 'Describe and build the dependency graph for a shared library and its callers.',
    prerequisites: ['16-two-executables'], recall: 'Which source file is shared by the demo and the tests? Which file owns each main?',
    transfer: 'Register a second test target and rebuild from an empty build directory.', concepts: ['build target', 'usage requirement', 'configure build test'],
  },
  '18-deterministic-game': {
    outcome: 'Implement and test legal game transitions without generating random dice or reading input.',
    prerequisites: ['17-build-dependencies'], recall: 'What must remain unchanged when a request is rejected, and why must a snapshot be a copy?',
    transfer: 'Write rule tests for bank, bust, exact win, overshoot and rejection after the match ends.', concepts: ['state transition', 'legality', 'terminal state'],
  },
  '19-command-lines': {
    outcome: 'Read complete input lines and translate them into commands without changing game state.',
    prerequisites: ['18-deterministic-game', '03-input-and-failure'], recall: 'Why must a rejected request leave the game unchanged? What does failed input extraction mean?',
    transfer: 'Write a separate command test covering exact matches, empty input, extra text and case differences.', concepts: ['string values', 'whole-line input', 'parsing boundary'],
  },
  '19b-repeatable-dice': {
    outcome: 'Own a random engine in a Die and reproduce a sequence for debugging in the same build.',
    prerequisites: ['19-command-lines', '11-valid-construction'], recall: 'Why did the game rules accept an explicit face instead of generating one internally?',
    transfer: 'Test range, repeatability and advancing state without assuming a particular library’s face sequence.', concepts: ['pseudorandom engine', 'seed', 'uniform distribution'],
  },
  '19c-terminal-match': {
    outcome: 'Connect input, random generation and tested rules into a playable terminal match with a fixed-strategy opponent.',
    prerequisites: ['19b-repeatable-dice'], recall: 'Which component parses text, which generates faces, and which alone can change the game state?',
    transfer: 'Add a rejected-request counter without counting quit or end of input, consuming dice or changing turns.', concepts: ['application orchestration', 'opponent policy', 'integration testing'],
  },
  '20-six-possible-futures': {
    outcome: 'Enumerate fair-die outcomes and distinguish an expected immediate quantity from the chance of winning a match.',
    prerequisites: ['19c-terminal-match'], recall: 'Does a fair die have to show every face in six rolls? What does rolling one preserve and discard?',
    transfer: 'Count immediate winning faces for a new score and pot, including exact wins and rejected finished positions.', concepts: ['probability', 'expectation', 'immediate versus long-term outcome'],
  },
  '21-reward-perspective': {
    outcome: 'Define terminal feedback from a named agent’s perspective without confusing reward with banked points.',
    prerequisites: ['20-six-possible-futures', '13-rejection-and-exceptions'], recall: 'Does a positive expected change in pot prove a higher chance of winning the match?',
    transfer: 'Test wins, losses and unfinished games for both agent seats, and reject invalid outcome metadata.', concepts: ['agent and environment', 'episode', 'reward perspective'],
  },
  '21b-decision-boundaries': {
    outcome: 'Advance one agent decision through the fixed opponent’s response to the next agent decision or a finished match.',
    prerequisites: ['21-reward-perspective'], recall: 'After the agent banks, whose turn is it, and can that opponent win before the agent chooses again?',
    transfer: 'Test retained turns, opponent banks and busts, both winners, incomplete scripts and input preservation.', concepts: ['decision boundary', 'transition result', 'copy before simulation'],
  },
  '22-observation-addresses': {
    outcome: 'Extract an agent-decision observation and encode it into a checked, reversible table address.',
    prerequisites: ['21b-decision-boundaries', '07-players-and-collections'], recall: 'Why must an unfinished successor belong to seat zero before the agent chooses again?',
    transfer: 'Decode an unfamiliar address, reject unused positions, and check every admitted observation for collisions.', concepts: ['observation boundary', 'index encoding', 'inverse and collision'],
  },
  '22b-action-value-storage': {
    outcome: 'Store separate action estimates, preserve neighboring cells, and query only legal choices without exposing mutable storage.',
    prerequisites: ['22-observation-addresses', '06-copies-and-references', '10-score-class'], recall: 'Which three numbers identify a row, and why is an empty-pot Bank not a choice?',
    transfer: 'Write independent storage tests that reject copied-row writes and maxima containing illegal actions.', concepts: ['action value', 'table ownership', 'legal maximum'],
  },
  '22c-deliver-a-small-change': {
    outcome: 'Turn a small request into an independently designed, tested change, then review feedback and recover an unstaged Git edit.',
    prerequisites: ['22b-action-value-storage', '16-two-executables'], recall: 'What can a passing example fail to tell you? Why might direct addressing be wasteful?',
    transfer: 'Choose storage and an algorithm for a locker selector, derive cases, adapt to feedback and demonstrate staged-versus-working recovery.', concepts: ['acceptance and iteration', 'independent design and tests', 'Git inspection and recovery'],
  },
};

export function learningIntro(id, intro) {
  const contract = CONTRACTS[id];
  if (!contract) throw new Error(`Write the learning contract before authoring ${id}`);
  if (contract.concepts.length > 3) throw new Error(`Split the primary learning goals for ${id}`);
  // Focused ownership lessons already place the recall and outcome in their authored introduction.
  if (intro.startsWith('**Outcome:**')) return intro;
  return `**Outcome:** ${contract.outcome}\n\n**Recall before looking at code:** ${contract.recall}\n\n${intro}`;
}
