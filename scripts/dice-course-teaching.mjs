// Authored teaching stages for Dice Duel. Targets remain complete files so Project Studio
// compares each stage against the learner's actual buffer, not a canned previous snapshot.
const before = (text, marker) => {
  const at = text.indexOf(marker);
  if (at < 0) throw new Error(`Missing teaching boundary: ${marker}`);
  return text.slice(0, at);
};
const replace = (text, from, to) => {
  if (!text.includes(from)) throw new Error(`Missing teaching edit: ${from}`);
  return text.replace(from, to);
};
const headerBefore = (text, marker) => before(text, marker) + '#endif\n';
const cut = (text, from, until) => replace(text, from + before(text.slice(text.indexOf(from) + from.length), until), '');
const main = (include, body) => `${include}\nint main() {\n${body}\n}\n`;
const compile = (file, exe = 'stage') => `run "g++ -std=c++20 -Wall -Wextra -pedantic ${file} -o ${exe}"`;
const run = (file, input = '', output = '') => compile(file) + '\nrun "./stage"' + (input ? ` stdin=${JSON.stringify(input)}` : '') + (output ? ` stdout=${JSON.stringify(output)}` : '');
const stage = (title, code, prose, explain, checks) => ({ title, code, prose, explain, checks });

// Tests are also typed in small, meaningful scenarios. Each boundary is outside any loop,
// catch block or scope, so closing main here yields a coherent partial test, not sliced code.
const testPlans = {
  'test_rules.cpp': [
    ['    apply(g, Action::Bank);', 'Test a roll without banking', 'A new game has score 0 and pot 0. Rolling 4 must change only the pot. The first assertion separately rules out banking an empty pot.', 'The three comparisons after the roll protect three different fields: pot becomes 4, score stays 0, and turn stays 0. If you asserted only the pot, accidentally banking the points could go unnoticed.'],
    ['    apply(g, Action::Roll, 5);', 'Test banking as a separate transition', 'Now add a bank action to the same trace. There is already 4 in the pot from the previous step; do not reset the game.', 'After banking, score[0] is 4, pot is 0, and turn is 1. This assertion checks that saving points and passing the turn happen together.'],
    ['    Game exact;', 'Test a bust and a later win', 'Player 1 rolls 5, then 1. The first roll creates a pot; the second destroys it. Player 0 then rolls 6 and 2 on top of the banked 4.', 'Trace the total: 4 + 6 is 10, so play continues; 4 + 8 is 12, so player 0 wins. A finished game must reject even a roll. The test protects permanent score from the bust.'],
    ['    Game bad;', 'Test the boundary from both seats', 'Create two independent games. One reaches exactly 12; the other passes 12 from player 1. Independent variables prevent the previous finished game from affecting these cases.', '`exact.score[0] = 6` sets up the boundary directly. `over.turn = 1` asks the rule to use the other score slot. These catch `>` in place of `>=` and a hard-coded player-0 winner.'],
    ['    rejected = false;', 'Test an illegal bank', 'A rejected action must throw an error and leave the game unchanged. Start a boolean flag at false, call the bad action inside `try`, and set the flag only in the matching `catch`.', 'If no exception is thrown, the flag stays false. If the wrong kind is thrown, it escapes this catch. `assert(rejected && bad.turn == 0)` requires both the right failure and no turn change.'],
    [null, 'Test an impossible die face', 'Reset the flag before trying face 7. Reusing the true flag from the bank test would let a missing exception pass unnoticed.', 'The final output is printed only after every assertion survives. The implementation steps that follow will compile and execute this complete contract.'],
  ],
  'test_io.cpp': [
    ['    for (int face = 1;', 'Test a repeatable sequence', 'Construct engines a and b with the same seed. For each roll from a, compare a fresh roll from b, check its bounds, and increment that face in the histogram.', '`counts` has seven slots so face 6 is a valid index; slot 0 is unused. The engine is advanced once per loop on each side. Recreating b inside the loop would compare every roll against its first roll.'],
    ['    Game g;', 'Test all faces and parse exact commands', 'Require every face to occur, then test the parser independently. Begin with Bank so rejecting the word roll must leave an observable old value intact.', 'The test distinguishes invalid text from an illegal game action. The text b parses successfully even when banking will later be forbidden by the rules. Parsing does not know the pot.'],
    [null, 'Test the fixed policy boundary', 'Check pot 0, pot 3, and pot 4. These cases straddle the bank-at-4 threshold.', 'Zero and three require Roll; four requires Bank. This catches a strict-greater-than comparison, which would wait one point too long.'],
  ],
  'test_env.cpp': [
    ['    int wins = 0, losses = 0;', 'Test a decision-to-decision transition', 'Prepare a pot of 4 and ask the agent to bank. Check both the unchanged input game and the returned successor.', 'Passing Game by value is intentional here. The wrapper explores a successor without mutating the caller. If the game is still running, the returned turn must already be 0 again.'],
    [null, 'Test rewards for both possible winners', 'Give both players score 11 and repeat the next decision across seed values. Count observed wins and losses while checking their reward signs.', 'A normal roll wins immediately; a bust may let the opponent win. `wins > 0 && losses > 0` ensures the test really visited both branches, instead of silently skipping one.'],
  ],
  'test_table.cpp': [
    ['    Game g; g.score', 'Test every valid state address', 'Use three nested loops to enumerate own score, other score and legal pot. Mark each row number the first time it appears.', '`seen[id]` must be false before marking it. A collision means two distinct situations would overwrite the same learned values. The pot loop ends at TARGET - own because reaching the target is terminal.'],
    ['    Game empty;', 'Test one row by hand', 'Encode scores 2 and 3 with pot 4, then place two known values into that row. Work out the address on paper before reading the assertion.', '(2 × 12 + 3) × 12 + 4 is 328. A best value of 0.7 means the bank column wins this comparison; it is not an observed win rate.'],
    [null, 'Test that an illegal maximum is ignored', 'Put an absurd 99 in the bank column of an empty-pot state. The legal maximum must still be -0.4.', 'A naive maximum over both columns passes most normal cases. This adversarial row distinguishes action legality from numerical size.'],
  ],
  'test_policy.cpp': [
    ['    int exploratory_rolls', 'Test forced moves and exploitation', 'At pot zero, even full exploration must roll. Then give a nonempty-pot state a strictly better bank value and turn exploration off.', 'The same function must enforce both requirements. Random exploration is never permission to choose an illegal action.'],
    ['    q.at(state_id(g)) = {0.0, 0.0};', 'Test exploration separately', 'Set epsilon to 1 and count rolls across 1000 choices. The two actions should both appear despite bank having the higher value.', 'The 300–700 bounds are deliberately broad. This is a smoke test for selecting both actions, not a demand for exactly 500 rolls.'],
    [null, 'Test ties without exploration', 'Make both values zero, set epsilon to zero and count choices again. This exercises the tie branch, not the exploration branch.', 'Always taking column 0 would produce 1000 rolls and fail. Separate this case from exploration so one working random branch cannot hide a broken one.'],
  ],
  'test_update.cpp': [
    ['    Game terminal;', 'Test one numeric update', 'Set old roll value 0.2 and next best value 0.8. With gamma 0.9 the target is 0.72. Half the difference from 0.2 is 0.26.', 'The new value must be approximately 0.46. The untouched bank value must remain -0.3. An absolute tolerance avoids confusing floating-point rounding with a faulty update.'],
    ['    Game empty;', 'Test a terminal loss', 'Give the terminal successor pot 99, outside the decision table. Correct terminal code never tries to encode it.', 'Halfway from 0.46 toward -1 is -0.27. This test catches both the wrong reward sign and accidentally bootstrapping after the game ends.'],
    [null, 'Test the legal bootstrap value', 'Create a successor with pot zero and a huge illegal bank estimate. Alpha 1 makes the new estimate equal the legal target.', 'The selected bank cell in the previous state should become approximately 0.1. The action just taken may be Bank even though Bank is illegal at the successor; these are different states.'],
  ],
  'test_train.cpp': [
    ['    int nonzero', 'Test reset and reproducibility', 'Zero episodes should return a fresh zero table. Two runs with the same seed and episode count should agree on this compiler.', 'This protects the training loop from unseeded randomness and accidental reuse of an old table. It says nothing yet about whether learning happened.'],
    [null, 'Test that learning leaves finite evidence', 'Visit both values in each row, require each to be finite and within the reward bounds, and count changed cells.', 'The count detects a trainer that returns zeros. The different-seed comparison detects ignored seeds. Neither proves a strong policy; that requires held-out games.'],
  ],
  'test_eval.cpp': [
    ['    double baseline', 'Test that evaluation cannot train', 'Copy the trained table before evaluating. Compare every cell afterward, then repeat the same evaluation seed.', 'The score must be in [0,1], the table must be unchanged, and rerunning must agree. Those are three independent properties, not three ways to measure strength.'],
    [null, 'Test a baseline and invalid sample size', 'The fixed policy plays itself with alternating starters. A broad 40–60% range catches gross score or seat bugs. Also require zero games to throw.', 'Division by zero is not a meaningful experiment. The rejection flag proves the API explains invalid input instead of returning an unusable number.'],
  ],
  'test_storage.cpp': [
    ['    for (const std::string text', 'Test a precise round trip', 'Put a nontrivial decimal and a negative value into row 17, save, then load and compare the entire vector.', 'A value such as 0.123456789012345 exposes default stream precision that simple values like 0.5 would not. The saved test model is disposable.'],
    ['    { std::ofstream out("test-model.txt",', 'Test malformed models', 'Loop over a wrong header, a truncated model and an impossible value. Each case writes its own bad file before loading it.', 'The inner braces destroy the output stream and flush the file before input opens it. A rejection flag checks that every bad file fails explicitly.'],
    [null, 'Test unwanted trailing data', 'Append garbage to the previously valid file, then require loading to fail. `std::ios::app` means append instead of replacing the old contents.', 'The loader must consume exactly its format. Otherwise a stale or concatenated file could appear valid because its beginning happened to look correct.'],
  ],
};

function splitTest(s) {
  return testPlans[s.file].map(([boundary, title, prose, explain], index, all) => {
    const code = boundary ? before(s.code, boundary) + '}\n' : s.code;
    const lastLine = code.trim().split('\n').slice(0, -1).at(-1).trim();
    return {
      ...s, title, code,
      prose: (index === 0 ? s.prose + '\n\n' : '') + prose + '\n\n**Edit `' + s.file + '`** using the live comparison below. Keep the earlier scenarios; add this one inside `main`, before its closing brace.',
      explain: explain + '\n\n**Check now:** this checks that the scenario was typed. The functions it calls are built in the next steps, which run the complete test file. Do not remove assertions just to make an unfinished implementation pass.',
      checks: `contains ${s.file} ${JSON.stringify(lastLine)}`,
      wrong: [{ name: 'scenario not typed', files: { [s.file]: '' }, fails: [0] }],
    };
  });
}

export function teachingStages(s) {
  if (!s.file) return [s];
  if (testPlans[s.file]) return splitTest(s);
  const c = s.code;
  let stages;
  if (s.file === 'game.hpp' && s.title === 'Describe the state') {
    stages = [
      stage('Give a game its own data', headerBefore(c, 'inline bool finished'),
        'Two separate Python lists could represent the scores, but the turn and pot belong with them. Create `game.hpp` with a `Game` struct so a complete position can be passed as one value. Type only the fields and action names in this step.',
        '`std::array<int, 2>` owns two adjacent integers. Braces initialize both to zero. `turn = 0` selects the first slot; `winner = -1` reserves a value that is neither player. `constexpr` makes TARGET a compile-time constant. `enum class` creates a separate action type, so a die face is not accidentally passed as a move. The header guard keeps a second include from defining Game twice.'),
      stage('Ask whether play has finished', headerBefore(c, 'inline bool legal'),
        'Add `finished` after the struct, before `#endif`. It answers a question without changing the game. In Python you might read `game.winner != -1`; here the function promises a `bool`, either true or false.',
        '`const Game& g` borrows the caller\'s game. The `&` avoids copying its fields; `const` prevents this function from changing them. `return` hands back the comparison. With winner -1 it returns false; with winner 0 it returns true. `inline` permits this header definition in multiple compiled source files.'),
      stage('Decide whether an action is allowed', headerBefore(c, 'inline void pass_turn'),
        'Add `legal` below `finished`. Read its expression in two pieces: the game is not finished, and the proposed action is allowed. A roll is allowed on any live turn; a bank also needs a positive pot.',
        '`&&` requires both sides; `||` accepts either branch. Parentheses group the two action cases under the unfinished-game condition. Trace pot 0 with Bank: the roll branch is false and `g.pot > 0` is false, so legal returns false. A positive pot must still not permit actions after victory.'),
      stage('Pass the turn without erasing saved points', c,
        'Add `pass_turn` below `legal`. Unlike the query functions, it must modify the caller. Its parameter is `Game&`, without const, and its return type is `void` because it reports no value.',
        'The pot is temporary; banked scores survive turn changes. Set pot to zero and compute `1 - g.turn`: 1 - 0 gives 1, while 1 - 1 gives 0. Do not reset the score array. This same operation will be used after both a bank and a bust. The rule tests will execute after apply is added.'),
    ];
  } else if (s.file === 'game.hpp') {
    const base = before(c, 'inline void apply');
    const bankOnly = before(c.slice(base.length), '    if (face < 1') + '}\n';
    const withBust = before(c.slice(base.length), '    g.pot += face;') + '}\n';
    stages = [
      stage('Reject an illegal move, then bank', base + bankOnly + '#endif\n',
        'Start `apply` before the closing header guard. For now implement banking only; rolling is completed in the next steps. First reject illegal actions so a bad bank cannot alter any fields.',
        '`throw std::invalid_argument` exits with a named error. In the bank branch, `g.score[g.turn] += g.pot` adds to the active player\'s permanent score. Call pass_turn only after reading the pot: it clears that value. `return;` prevents a bank from falling through into the roll logic. The unused-face warning at this intermediate stage disappears when we implement rolling.'),
      stage('Make a one mean bust', base + withBust + '#endif\n',
        'Continue below the bank branch. Reject die faces outside 1–6 before changing state. Then handle face 1 as a separate early exit.',
        'Trace score 4, pot 6, face 1. pass_turn clears the 6 and switches player; the banked 4 is untouched. Returning here is essential: otherwise the later addition would put the busting 1 into the next player\'s pot. Ordinary rolls still do nothing until the next edit.'),
      stage('Add a safe roll and detect victory', c, s.prose,
        'Now add the face to the pot, then test score plus pot against TARGET. `>=` handles both exact arrival and overshoot. Set winner to the active player, not a hard-coded zero. A roll can win immediately without a later bank.\n\n' + s.explain),
    ];
  } else if (s.file === 'io.hpp') {
    stages = [
      stage('Advance one random engine', headerBefore(c, 'inline bool parse_action'),
        'Create `io.hpp` and add only `roll` first. The game rules take a face as input; this adapter produces one. Keep the random engine outside the function so successive calls continue the same sequence.',
        '`std::mt19937& rng` borrows and advances the engine. `std::uniform_int_distribution<int>(1, 6)` constructs a mapping to the inclusive integer range. The final `(rng)` invokes that mapping using the engine. Passing rng by value would repeatedly start from a copy of its old state.'),
      stage('Turn text into an action', headerBefore(c, 'inline Action fixed_action'),
        'Add `parse_action` after roll. It has two results: whether parsing succeeded and, on success, which action was read. Return the boolean; write the action through a mutable reference.',
        '`const std::string& text` borrows text without copying or changing it. `Action& action` is deliberately mutable. For text r, assign Roll and return true immediately. For any unrecognized text, return false without writing to action. This keeps a typo from silently becoming a valid move.'),
      stage('Write the opponent rule in plain sight', c,
        'Add the fixed policy: bank once the pot reaches the threshold, otherwise roll. The default argument makes the threshold 4 when a caller omits it.',
        '`condition ? first : second` returns first when true and second otherwise. At pot 3 this returns Roll; at 4 it returns Bank. The policy chooses an action but does not apply it, draw a die, or print anything. That separation lets tests and training reuse it.\n\n' + s.explain),
    ];
  } else if (s.file === 'play.cpp') {
    const includes = '#include "io.hpp"\n#include <iostream>';
    const init = '    Game g;\n    std::mt19937 dice(42);';
    const display = '        std::cout << "You " << g.score[0] << " Bot " << g.score[1]\n                  << " pot " << g.pot << " turn " << g.turn << \'\\n\';';
    const loop = init + '\n    while (!finished(g)) {\n' + display + '\n        Action action = fixed_action(g);\n        int face = action == Action::Roll ? roll(dice) : 1;\n        apply(g, action, face);\n    }';
    const noValidation = cut(c, '            if (!parse_action', '        }\n        int face');
    const simpleInput = replace(noValidation, '            }\n        }\n        int face', '            }\n            action = Action::Roll;\n        }\n        int face');
    stages = [
      stage('Watch two fixed policies finish a game', main(includes, loop),
        'Before handling keyboard input, make the computer play both seats. Create `play.cpp`. Initialize one game and one seeded engine, then repeat display, choose and apply until a winner exists.',
        'A loop iteration performs one move, not necessarily a whole turn. A roll of 2–6 may leave the same player active. The conditional expression draws a face only for Roll; Bank uses an ignored placeholder 1. Run the program: you should see changing scores and pots, then it exits. If it runs forever, inspect whether apply changes the same Game by reference.', run('play.cpp', '', 'You 0 Bot 0')),
      stage('Show the outcome after the loop', replace(cut(c, '        if (g.turn == 0)', '        int face'), '        std::cout << (action == Action::Roll ? "roll " : "bank ")\n                  << (action == Action::Roll ? face : g.pot) << \'\\n\';\n', ''),
        'Keep the automatic players, but add the final winner message after the loop. The loop stops because finished became true; now the saved winner tells us which message to show.',
        'Putting this output inside the loop would announce an outcome before the game ended. A single final message distinguishes a complete match from an intermediate score. This version still controls both seats automatically.', run('play.cpp')),
      stage('Pause for a human line and support quitting', simpleInput,
        'Inside the loop, add an input branch only when turn is 0. For this intermediate version, any line except q means Roll. The next step will parse r and b properly. Also print the chosen move before applying it.',
        '`std::getline(std::cin, line)` waits for a complete line. If it returns false, input has ended, so exit gracefully. Testing q in the same condition handles deliberate quitting. The branch for player 1 still uses the fixed policy. Run, type any word, then q; this proves the waiting and exit paths independently of parsing.', run('play.cpp', 'q\n', 'Goodbye')),
      stage('Reject bad text and illegal banking', c,
        'Replace the temporary forced Roll with parse_action and legal. The parser recognizes the command; the rule checks whether that action is allowed in this state. A readable b can still be illegal at pot zero.',
        '`continue` restarts the while loop before any face is drawn or move applied. Invalid input therefore neither passes the turn nor consumes randomness. Try b, nonsense, then q at the initial prompt: two rejections, no bot turn, then Goodbye.\n\n' + s.explain),
    ];
  } else if (s.file === 'env.hpp') {
    stages = [
      stage('Finish the fixed opponent turn', headerBefore(c, 'struct Transition'),
        'Create `env.hpp`. A learning step must not stop while the opponent still controls the next action. Add a loop that acts only while the game is unfinished and turn is 1.',
        'After a safe roll, turn remains 1 so the loop repeats. After banking or busting, pass_turn changes it to 0 and the loop ends. After victory, finished ends the loop even though the turn may still be 1. This is why the condition needs both tests.'),
      stage('Name what one learning step returns', headerBefore(c, 'inline Transition agent_step'),
        'Add a Transition struct below the opponent loop. It packages the next game, a numeric reward and a terminal flag. These values describe one decision\'s consequences.',
        '`Game next` owns a copy, so the result does not dangle after a local variable goes out of scope. Reward is a double to work with future value estimates. Done is a bool that distinguishes a last outcome from a successor where more decisions remain.'),
      stage('Return to the next agent decision', c, s.prose,
        'Follow the calls in order: apply the agent move, then finish any intervening opponent turn. Only afterward compute reward. If player 1 wins during that turn, reward is -1 for the preceding agent action. `return {g, reward, done}` initializes the three fields in their declaration order.\n\n' + s.explain),
    ];
  } else if (s.file === 'agent.hpp' && s.title === 'Own the table and borrow a row') {
    stages = [
      stage('Allocate two estimates for each address', headerBefore(c, 'inline int state_id'),
        'Create `agent.hpp`. A Row is an array containing the two action values. A Table is a vector of rows. Start every estimate at zero; the program has not seen evidence for either action.',
        '`Table(STATES, Row{0.0, 0.0})` fills the vector with copies of the zero row. STATES is 12 × 12 × 12: one dimension each for own score, other score and pot. Some combinations are impossible, but the rectangular layout keeps addressing simple. The vector owns and releases its memory automatically.'),
      stage('Encode one decision state', headerBefore(c, 'inline int column'),
        'Add state_id. Validate the state first, then encode it. We only store decisions for player 0 before victory; a terminal pot can lie outside this table.',
        'Think of a three-digit number with base 12. Scores 2 and 3 followed by pot 4 become (2 × 12 + 3) × 12 + 4 = 328. The first multiplication reserves a whole block for each own score. The second reserves a whole row for each opponent score. Adding scores without multiplication would create collisions.'),
      stage('Read the best legal value', c, s.prose,
        'column converts the scoped enum into an array index explicitly. best_value borrows a row with `const Row&`; it does not copy or change it. At pot zero, return roll even when the bank column is numerically larger. This action mask must agree with the game rules.\n\n' + s.explain),
    ];
  } else if (s.file === 'agent.hpp' && s.title === 'Choose an action') {
    const greedy = cut(c, '    if (std::uniform_real_distribution', '    const Row& row');
    const noTie = cut(greedy, '    if (row[0] == row[1])', '    return row[0] > row[1]');
    stages = [
      stage('Choose the best legal action first', noTie,
        'Append choose before the closing guard. Start with greedy selection only: at pot zero force Roll; otherwise compare the row and return the larger action. The exploration parameters are unused until the next edits.',
        'With row {-0.5, 0.2}, Bank wins the comparison. With {0.2, 0.2}, this temporary version falls through to Bank because `>` is false. That arbitrary tie preference is the next problem to remove. Unused-parameter warnings at this intermediate stage are expected.'),
      stage('Give tied actions equal treatment', greedy,
        'Insert the equality branch before the greater-than comparison. If both values are equal, draw an integer 0 or 1 and map it to the action.',
        'A fresh table contains ties everywhere. Always choosing one side would embed a preference unsupported by experience. Tie randomness remains even when epsilon is zero: both actions are equally greedy. The choices engine advances independently of the dice engine.'),
      stage('Explore before comparing estimates', c, s.prose,
        'Insert the exploration branch after the forced-roll case and before reading the row. First draw the epsilon coin. If it succeeds, choose either legal action and return immediately. Otherwise continue to greedy selection. Exploration may also choose the best action; it does not mean deliberately choosing the worse one.\n\n' + s.explain),
    ];
  } else if (s.file === 'agent.hpp') {
    const terminalOnly = replace(c, '    if (!t.done) target += gamma * best_value(q, t.next);\n', '');
    stages = [
      stage('Move an estimate toward a terminal reward', terminalOnly,
        'Start update with terminal outcomes only. This intermediate function uses reward as the whole target; do not use it for training yet. Borrow the old cell, then move partway from its value toward the target.',
        'For old 0.2, reward 1 and alpha 0.5, the error is 0.8, the correction is 0.4 and the new estimate is 0.6. `double& value` aliases the actual cell. Without the ampersand, only a local copy changes. Gamma is unused until we add the next-state estimate.'),
      stage('Bootstrap only when another decision exists', c, s.prose,
        'Add one conditional line before borrowing the old cell. A continuing transition gets gamma times the next legal maximum; a terminal one skips that access completely. Compute the target first so an update to the current row cannot influence its own successor lookup.\n\n' + s.explain),
    ];
  }
  if (!stages) stages = laterStages(s);
  if (!stages) return [s];
  return stages.map((part, i) => {
    const last = i === stages.length - 1;
    const syntax = `run "g++ -std=c++20 -Wall -Wextra -pedantic -fsyntax-only -x c++ ${s.file}"`;
    const check = part.checks ?? (last ? s.checks : syntax);
    return {
      ...s, ...part,
      prose: part.prose + '\n\n**Edit `' + s.file + '`**. Type the green additions and make the red deletions in the comparison below. Keep the unchanged lines. The comparison follows your current file as you work.',
      explain: part.explain + (!last && !part.checks ? '\n\n**Check now:** compile this intermediate file for syntax errors. This does not claim the finished behavior works yet; the complete behavioral tests run after the final edit.' : '\n\n**Check now:** save the file and run the checks below. Read the first failing assertion or compiler error before editing again.'),
      checks: check,
      wrong: last ? s.wrong : [{ name: 'invalid C++ in this stage', files: { [s.file]: '@ invalid C++\n' }, fails: [0] }],
    };
  });
}

function laterStages(s) {
  const c = s.code;
  if (s.file === 'train.hpp') {
    const start = before(c, '    for (int episode') + '    return q;\n}\n#endif\n';
    const reset = before(c, '        double fraction') + '    }\n    return q;\n}\n#endif\n';
    return [
      stage('Own one table for the whole training run', start,
        'Create train.hpp. Construct the table once, before any episode loop. Construct two seeded engines: one for game dice and one for the policy\'s random choices. This first version returns the unchanged table.',
        'A function-local table begins fresh on each call to train, but survives all the episodes inside that call. Putting make_table inside the future episode loop would erase previous experience. Separate engines keep an extra exploration draw from directly consuming a die draw. The different seed offset names a separate stream; it is not a mathematical guarantee of independence.'),
      stage('Reset games, not learned values', reset,
        'Add the episode loop. Each pass creates a new Game while retaining the table outside it. Alternate the initial turn with episode % 2, then complete an opening opponent turn if necessary.',
        '| episode | initial turn | table | game |\n|---|---|---|---|\n| 0 | 0 | retained | fresh |\n| 1 | 1 | retained | fresh |\n| 2 | 0 | retained | fresh |\n\nAn opponent can win before the agent ever acts. Such a game contains no agent action to update. We will naturally skip it with the next step\'s finished check.'),
      stage('Schedule exploration using floating-point division', before(c, '        int decisions') + '    }\n    return q;\n}\n#endif\n',
        'Add fraction and epsilon inside the episode loop. Convert the episode number to double before dividing; otherwise integer division would keep fraction at zero for nearly the entire run.',
        'With 100 episodes: episode 0 gives epsilon 1, episode 50 gives 0.5, and episode 99 is clamped to 0.05. std::max enforces the floor. This is a transparent starting schedule, not a claim that these settings are optimal. At this stage epsilon is unused, so its warning is expected.'),
      stage('Learn before advancing to the successor', c, s.prose,
        'The inner loop has four ordered operations: choose from g, get t from that action, update the cell for g, then replace g with t.next. Moving the last assignment above update would train the wrong state. The guard throws rather than inventing a loss.\n\n' + s.explain),
    ];
  }
  if (s.file === 'evaluate.hpp') {
    const base = before(c, '    for (int episode') + '    return 0.0;\n}\n#endif\n';
    const fixed = replace(c, 'learned ? choose(q, g, 0.0, choices) : fixed_action(g)', 'fixed_action(g)');
    return [
      stage('Create a read-only experiment', base,
        'Create evaluate.hpp with a const reference to the model and an explicit positive game count. Seed evaluation separately from training. This first version returns zero while we build the match loop.',
        'Const prevents accidental table writes through q. Reject games <= 0 before any division. The learned flag will choose between policies later, and opponent_threshold lets us test a changed opponent. The unused-variable warnings disappear as the experiment is assembled.'),
      stage('Measure the fixed policy before the learned one', fixed,
        'Add the match loop with fixed_action controlling player 0. Player 1 also uses the fixed policy by default. Alternate starting players, complete every match, then increment wins only for player 0.',
        '`wins += g.winner == 0` adds 1 when the comparison is true and 0 otherwise. Convert wins to double before division. A record of 3 wins in 5 games must produce 0.6, not integer zero. Opponent turns and agent moves use the same rules as the playable game, preventing evaluation on a different game by accident.'),
      stage('Switch policies without changing the experiment', c, s.prose,
        'Replace just the action-selection line. The learned branch uses choose with epsilon 0; the baseline branch retains fixed_action. Everything else stays the same. Never call update here: the experiment must measure a frozen policy.\n\n' + s.explain),
    ];
  }
  if (s.file === 'experiment.cpp') {
    const baseline = cut(c, '        double learned', '        std::cout');
    const shortOutput = before(baseline, '        std::cout') + '        std::cout << "seed " << seed << " baseline " << baseline << \'\\n\';\n    }\n}\n';
    return [
      stage('Repeat an experiment for independent training seeds', shortOutput,
        'Create experiment.cpp. The braced list gives the loop three explicit seeds. Train a fresh table for each seed and evaluate the fixed-policy baseline on held-out dice.',
        'The u suffix marks each seed literal as unsigned. Each printed line records which run produced that score; without the seed, a result is harder to reproduce. Run the program now. Its baseline scores should vary, even though the policy is unchanged.', run('experiment.cpp', '', 'seed 303 baseline')),
      stage('Report sampling error and an opponent change', c, s.prose,
        'Add the learned score, approximate standard error and bank-at-7 score before printing them. `std::sqrt` computes a square root; the arithmetic inside is p times (1-p), divided by the sample size. Keep all rows, including disappointing runs.\n\n' + s.explain),
    ];
  }
  if (s.file === 'storage.hpp') {
    const saveOnly = headerBefore(c, 'inline Table load_table');
    const headerOnly = cut(saveOnly, '    out << std::setprecision', '    out.close();');
    const loadHeader = before(c, '    Table q = make_table();') + '    return make_table();\n}\n#endif\n';
    return [
      stage('Write a model identity before its numbers', headerOnly,
        'Create storage.hpp. Start with a writer that opens a file, checks that it opened, writes the version and rule settings, then closes it. It is not yet a complete saved model.',
        'The header records DICE_Q_V1, target 12, opponent threshold 4 and the row count. A future loader can reject the wrong game before accepting any values. Check the stream after close so a failed flush is reported too. Opening with ofstream replaces an existing file, so experiments worth keeping need distinct names.'),
      stage('Preserve the table precision', saveOnly,
        'Insert the precision setting and row loop before close. Each line records roll then bank in that order. Keep the header as the first line.',
        'Default formatting keeps too few significant digits for an exact double round trip. Seventeen digits retain the stored value. `const Row&` borrows each row read-only. The newline separates rows for a human reader; the loader will accept any whitespace between numbers.'),
      stage('Read and reject an incompatible header', loadHeader,
        'Add load_table after save_table. Read the version string and three integers. Reject extraction failures and mismatched metadata before allocating a model. This intermediate loader deliberately returns an empty table; do not use it for play yet.',
        '`in >> version >> target >> opponent >> states` extracts fields in sequence. A malformed or missing field makes the stream false. The surrounding ! catches that failure, while the remaining comparisons catch a readable but incompatible header. Zero initializers keep the local integers defined even if input stops early.'),
      stage('Validate every estimate before returning', c, s.prose,
        'Replace the empty-table return with nested row/value loops. The mutable double reference puts each extracted number into its destination. Reject failed reads, nonfinite values and estimates outside the agreed reward range. Finally reject an extra token. Only a fully validated local table reaches return.\n\n' + s.explain),
    ];
  }
  if (s.file === 'learn.cpp') return [stage(s.title, c, s.prose,
    'The try block performs three operations in order: train, save, report success. If either of the first two throws, control jumps to catch and the success message is skipped. `const std::exception&` handles these standard error types without copying the exception. `what()` supplies its description. `std::cerr` is the error stream, separate from normal output, and return 1 lets a script detect failure.\n\n' + s.explain)];
  if (s.file === 'duel.cpp') {
    const load = before(c, '        Game g;') + '        std::cout << "Loaded " << q.size() << " rows\\n";\n' + c.slice(c.indexOf('    } catch'));
    const noAgent = replace(cut(c, '            } else {', '            int face'), '            int face', '            } else {\n                action = fixed_action(g);\n            }\n            int face');
    const noValidation = cut(noAgent, '                if (!parse_action', '            } else {');
    const shortPlay = cut(noValidation, '            std::cout << (action', '            apply(g');
    const autoPlay = replace(cut(shortPlay, '            if (g.turn == 1)', '            int face'),
      '            Action action = Action::Roll;', '            Action action = fixed_action(g);');
    return [
      stage('Load the saved table before starting a match', load,
        'Create duel.cpp. First do only model loading and print its row count. Keep the table const. If the file is absent or invalid, report the error and stop rather than silently substituting an untrained table.',
        'This isolates persistence from gameplay. Run learn first to create dice-q.txt, then build and run duel. A successful load prints Loaded followed by the expected row count. The catch block uses the same exit-code contract as learn.', run('duel.cpp', '', 'Loaded')),
      stage('Run the familiar match loop beside the loaded model', autoPlay,
        'Replace the row-count print with the same display/choose/apply loop you built for play.cpp. For this intermediate run, fixed policies still control both seats. Start player 1 so the human will take the first turn when input is added next.',
        'The loaded table stays available outside the loop but does not choose actions yet. This lets you check state initialization, turn switching and final output separately from model selection. Run it: one match completes and prints its winner. The two engines will serve different roles once choose is connected.', run('duel.cpp', '', 'Agent 0 You 0')),
      stage('Connect the human to player one', shortPlay,
        'Add the turn loop. Human is player 1 now, matching the agent-as-player-0 convention. Begin with a fixed bot and let any non-q line roll; command validation returns in the next step.',
        'Action starts as Roll each iteration, so the human branch does not use an uninitialized enum. The seeded choices engine will be used when we connect the model. random_device initializes varied live dice; use a fixed seed instead when reproducing a bug. EOF and q exit without taking another move.', run('duel.cpp', 'q\n', 'Goodbye')),
      stage('Restore command validation and move reporting', noAgent,
        'Add parsing, legality checks and the move report, just as in the earlier terminal game. Keep these controls working before changing the bot policy.',
        'A bad command must continue before the die draw. The report reads the pot before apply clears it on banking. Try b at the initial prompt: it is invalid and the human keeps the turn. Then q should still exit cleanly.', run('duel.cpp', 'b\nq\n', 'Invalid move')),
      stage('Let the table choose the bot action', c, s.prose,
        'Replace only the fixed bot branch. Read and display the current Q-row, omit the illegal bank value at pot zero, then choose with epsilon zero. The input, rules and output flow are unchanged. There is no update during play, so you are testing the saved policy.\n\n' + s.explain),
    ];
  }
  return null;
}
