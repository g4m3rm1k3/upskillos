// Small executable explorations and independent practice, following Applied ML's
// problem → run → trace → explain → integrate rhythm. Reference challenge answers
// go only into the walkthrough fixture, never into the lesson's file target.
const fence = (kind, text) => '```' + kind + '\n' + text + '\n```';
const compile = (file, out) => `run "g++ -std=c++20 -Wall -Wextra -pedantic ${file} -o ${out}"`;
const predict = (question, yes, no, why) => fence('predict', `question: ${question}\nchoice: ${yes}\nchoice: ${no}\nanswer: ${yes}\nexplain: ${why}`);
const program = (body, headers = '') => `#include <iostream>\n${headers ? headers + '\n' : ''}int main() {\n${body}\n}\n`;

const explorations = {
  '01': {
    title: 'Read a value instead of hard-coding the answer',
    file: 'explore_input.cpp',
    code: program('    int pot = 0;\n    std::cin >> pot;\n    std::cout << pot + 4 << \'\\n\';'),
    input: '3\n', output: '7',
    problem: 'The game needs values from a player, not just constants in the source. Here is the smallest numeric input experiment. Create explore_input.cpp, compile it, then run it and type 3 followed by Enter.',
    mechanism: '`std::cin` is standard input. `>> pot` reads a whole-number token and stores it in pot. It is input extraction here; the `<<` on cout is output insertion. With input 3, pot becomes 3 and pot + 4 produces 7. Changing the input to 8 gives 12 without recompiling.\n\nUnlike Python input(), numeric extraction converts directly into the declared type. This experiment assumes valid numeric input. The real game will read a whole string with getline so it can report malformed commands. All numeric practice prompts specify valid inputs.',
    question: 'You change the input from 3 to 8 without editing the source. Must you recompile?', yes: 'No', no: 'Yes', why: 'Compilation translates the instructions. The executable reads new data each time it runs.',
    change: ['pot + 4', 'pot - 4'],
  },
  '02': {
    title: 'See a copy and a reference behave differently', file: 'explore_reference.cpp',
    code: program('    int pot = 4;\n    int copy = pot;\n    int& alias = pot;\n    copy += 2;\n    alias += 3;\n    std::cout << pot << " " << copy << \'\\n\';'),
    output: '7 6',
    problem: 'When a function changes a C++ value, does the caller see it? Before designing Game, isolate the difference between a copy and a reference using two integers.',
    mechanism: 'Assignment to a new ordinary int copies a value. Declaring `int& alias = pot` instead creates another name for the same storage; it does not create another independent integer.\n\n| line | pot | copy | what alias refers to |\n|---|---|---|---|\n| initialize | 4 | 4 | pot |\n| copy += 2 | 4 | 6 | pot |\n| alias += 3 | 7 | 6 | pot |\n\nThis is the reason apply will accept Game& while queries can use const Game&. A Python assignment normally attaches a name to an object; C++ variable declarations choose value or reference semantics explicitly.',
    question: 'Will adding 3 through alias also change pot?', yes: 'Yes', no: 'No', why: 'alias names pot itself. Only copy has independent storage.', change: ['int& alias', 'int alias'],
  },
  '03': {
    title: 'Advance an engine twice', file: 'explore_random.cpp',
    code: program('    std::mt19937 first(42), second(42);\n    auto a = first();\n    auto b = first();\n    std::cout << (a == second()) << \'\\n\';\n    std::cout << (b == second()) << \'\\n\';', '#include <random>'),
    output: '1\n1',
    problem: 'Reproducible randomness sounds contradictory until you see the engine state advance. Create two engines with the same seed, then compare their first and second outputs.',
    mechanism: 'Calling first() returns a number and changes internal state. The second call therefore produces the next number. The other engine advances independently through the same sequence. `auto` infers the engine output\'s integer type; it does not mean the type can change later. C++ prints bool as 1 or 0 by default.\n\nThe raw numbers are not die faces. A distribution will map them into 1–6 in the real game. Reinitializing an engine with 42 before each roll would restart at its first output instead of continuing the sequence.',
    question: 'Do the two engines produce matching second outputs too?', yes: 'Yes', no: 'No', why: 'Both began in the same state and have each advanced once before the second comparison.', change: ['second(42)', 'second(43)'],
  },
  '04': {
    title: 'Follow continue through a loop', file: 'explore_continue.cpp',
    code: program('    for (int command = 0; command < 3; ++command) {\n        if (command == 1) {\n            std::cout << "reject\\n";\n            continue;\n        }\n        std::cout << "apply " << command << \'\\n\';\n    }'),
    output: 'apply 0\nreject\napply 2',
    problem: 'Invalid input must skip applying a move, but must not end the game. Isolate that control-flow decision before adding a keyboard to the match.',
    mechanism: '| command | condition | output | reaches apply? |\n|---|---|---|---|\n| 0 | false | apply 0 | yes |\n| 1 | true | reject | no |\n| 2 | false | apply 2 | yes |\n\nContinue jumps to this loop\'s next iteration. In a for loop the increment runs before the condition is tested again. Break would exit the whole loop and lose the final apply 2. Return would exit main entirely. These are three different control-flow decisions.',
    question: 'Does the line after continue print apply 1?', yes: 'No', no: 'Yes', why: 'continue skips the remaining body for command 1.', change: ['continue;', 'break;'],
  },
  '05': {
    title: 'Reward an outcome from one player’s perspective', file: 'explore_reward.cpp',
    code: program('    for (int winner : {-1, 0, 1}) {\n        double reward = 0.0;\n        if (winner == 0) reward = 1.0;\n        if (winner == 1) reward = -1.0;\n        std::cout << winner << " -> " << reward << \'\\n\';\n    }'),
    output: '-1 -> 0\n0 -> 1\n1 -> -1',
    problem: 'The same win is good for one player and bad for the other. Our learner is always player 0. Compute its reward before introducing an environment wrapper.',
    mechanism: 'The range-based for binds winner to each element of the braced list. -1 means unfinished, so neither condition changes reward. Winner 0 changes it to +1; winner 1 changes it to -1. The zero initialization must happen inside the loop, otherwise a previous outcome could leak into the next one.\n\nReward describes the agent\'s objective, not the number printed on the die. Adding the die face to reward would teach a different goal: collecting faces rather than winning the match.',
    question: 'Player 1 wins. Should the agent receive +1 because somebody won?', yes: 'No', no: 'Yes', why: 'Player 1 is the opponent. The reward is -1 from the agent’s fixed perspective.', change: ['reward = -1.0', 'reward = 1.0'],
  },
  '06': {
    title: 'Pack and unpack a state address', file: 'explore_address.cpp',
    code: program('    int own = 2, other = 3, pot = 4;\n    int id = (own * 12 + other) * 12 + pot;\n    std::cout << id << \'\\n\';\n    std::cout << id / 144 << " " << (id / 12) % 12 << " " << id % 12 << \'\\n\';'),
    output: '328\n2 3 4',
    problem: 'A vector needs one integer index, but the game has three state variables. Try a small address calculation and its inverse before storing any learned values.',
    mechanism: '| operation | result | meaning |\n|---|---|---|\n| 2 * 12 + 3 | 27 | select score pair |\n| 27 * 12 + 4 | 328 | select pot within pair |\n| 328 / 144 | 2 | recover own score |\n| (328 / 12) % 12 | 3 | recover other score |\n| 328 % 12 | 4 | recover pot |\n\nInteger division drops the remainder; % keeps it. Each pot occupies its own slot within the score pair\'s block. Adding own + other instead would confuse scores (2,3) and (3,2).',
    question: 'If only pot increases by 1, how much does the address increase?', yes: '1', no: '12', why: 'Pot is the final offset, so adjacent pots occupy adjacent addresses.', change: ['own * 12 + other', 'own + other'],
  },
  '07': {
    title: 'Count the two paths to the best action', file: 'explore_epsilon.cpp',
    code: program('    double epsilon = 0.2;\n    double worse = epsilon / 2.0;\n    double best = (1.0 - epsilon) + epsilon / 2.0;\n    std::cout << worse << " " << best << \'\\n\';'),
    output: '0.1 0.9',
    problem: 'Suppose Bank is uniquely best and both actions are legal. Of every 100 choices in expectation, 80 exploit and 20 explore. How many explorations still choose Bank?',
    figure: 'EpsilonSplit',
    mechanism: 'Half the 20 exploratory choices select Bank, so its total is 80 + 10 = 90. Roll receives the other 10. This counts two disjoint routes to Bank: exploitation and exploration. The probabilities add to one.\n\nThe formula describes a long-run expectation, not an exact finite sample. A tie needs a separate rule: if neither action is better, give each half the choices. At pot zero the only legal action is Roll, regardless of epsilon.',
    question: 'With epsilon 0.2, is the worse action chosen with probability 0.2?', yes: 'No', no: 'Yes', why: 'Only half the exploratory choices pick the worse action, giving 0.1.', change: ['epsilon / 2.0;', 'epsilon;'],
  },
  '08': {
    title: 'Compute one correction before naming Q-learning', file: 'explore_update.cpp',
    code: program('    double value = 0.2, next = 0.8;\n    double alpha = 0.5, gamma = 0.9;\n    double target = gamma * next;\n    double error = target - value;\n    value += alpha * error;\n    std::cout << target << " " << error << " " << value << \'\\n\';'),
    output: '0.72 0.52 0.46',
    problem: 'An estimate is 0.2. The next decision looks worth 0.8. With a discount of 0.9 and no immediate reward, the new evidence points to 0.72. Move halfway toward it instead of replacing the old estimate outright.',
    figure: 'UpdateTrace',
    mechanism: '| name | calculation | value |\n|---|---|---|\n| target | 0 + 0.9 * 0.8 | 0.72 |\n| error | 0.72 - 0.2 | 0.52 |\n| correction | 0.5 * 0.52 | 0.26 |\n| new value | 0.2 + 0.26 | 0.46 |\n\nAlpha controls the fraction of error used. Gamma controls how much future value counts; these are different roles. Adding the whole target repeatedly would accumulate values instead of correcting an estimate. After you have traced these statements, the Q-learning notation is just a compact name for the same update applied to a selected table cell.',
    question: 'With alpha 0.5, does value become the target 0.72 immediately?', yes: 'No', no: 'Yes', why: 'It moves halfway across the gap, from 0.2 to 0.46.', change: ['target - value', 'target + value'],
  },
  '09': {
    title: 'Make the exploration schedule visible', file: 'explore_schedule.cpp',
    code: program('    for (int episode : {0, 50, 99}) {\n        double fraction = static_cast<double>(episode) / 100;\n        double epsilon = std::max(0.05, 1.0 - fraction);\n        std::cout << episode << " " << epsilon << \'\\n\';\n    }', '#include <algorithm>'),
    output: '0 1\n50 0.5\n99 0.05',
    problem: 'The trainer will reduce exploration as games accumulate. Before nesting loops, print the schedule at the beginning, midpoint and end of a short run.',
    mechanism: 'The cast occurs before division: 50 becomes 50.0, so dividing by 100 yields 0.5. Casting after integer division would preserve an already-truncated zero. At episode 99, 1 - 0.99 gives 0.01; max raises it to the 0.05 floor.\n\nThe schedule changes how the agent gathers evidence, not how an individual die is rolled. It belongs once per episode outside the decision loop.',
    question: 'Without the double cast, what is 50 / 100?', yes: '0', no: '0.5', why: 'Both operands would be integers, so division discards the fraction.', change: ['static_cast<double>(episode)', 'episode'],
  },
  '10': {
    title: 'Separate a rate from its uncertainty', file: 'explore_rate.cpp',
    code: program('    double wins = 1200, games = 2000;\n    double rate = wins / games;\n    double se = std::sqrt(rate * (1.0 - rate) / games);\n    std::cout << rate << \'\\n\';\n    std::cout << std::fixed << std::setprecision(3) << se << \'\\n\';', '#include <cmath>\n#include <iomanip>'),
    output: '0.6\n0.011',
    problem: 'Winning 1200 of 2000 games gives a rate of 0.6. We also need a sense of how much the rate might vary with another sample. Compute an approximate standard error for repeated independent win/loss trials.',
    figure: 'RateUncertainty',
    mechanism: 'The quantity rate * (1-rate) is 0.24. Dividing by 2000 gives 0.00012; its square root is about 0.010954. fixed with setprecision(3) displays three decimal places, giving 0.011, without rounding the stored se.\n\nIncreasing the game count by four reduces this standard error by about half. This approximation does not include variability between separately trained models. Alternating starters also calls for care: you can compute separate rates by starting seat.',
    question: 'Does this standard error measure variation between training seeds?', yes: 'No', no: 'Yes', why: 'It describes game sampling for one frozen policy; training variability requires separately trained policies.', change: ['wins / games', 'wins / (games * 2)'],
  },
  '11': {
    title: 'Watch a stream lose and preserve digits', file: 'explore_precision.cpp',
    code: program('    double value = 0.123456789012345;\n    std::cout << value << \'\\n\';\n    std::cout << std::setprecision(17) << value << \'\\n\';', '#include <iomanip>'),
    output: '0.123457\n0.123456789012345',
    problem: 'A model file contains decimal text. Formatting that is pleasant for a report can throw away information needed to restore the model. Compare default formatting with full-precision output before writing a file.',
    mechanism: 'Default stream precision is six significant digits. The first line rounds the value to 0.123457; those characters cannot reconstruct the original double. setprecision(17) changes later formatting on that stream. Unlike fixed mode in the rate lesson, this setting counts significant digits.\n\nYou may see one additional final digit on a different standard library; the check uses the significant prefix. Save model values precisely and choose display rounding separately.',
    question: 'Does changing output precision change the stored double?', yes: 'No', no: 'Yes', why: 'The stream changes how it writes characters; the number in memory is unchanged.', change: ['setprecision(17)', 'setprecision(6)'],
  },
  '12': {
    title: 'Mask an unavailable action in the display', file: 'explore_display.cpp',
    code: program('    for (int pot : {0, 3}) {\n        std::cout << "pot " << pot << " roll";\n        if (pot > 0) std::cout << " bank";\n        std::cout << \'\\n\';\n    }'),
    output: 'pot 0 roll\npot 3 roll bank',
    problem: 'A displayed Q-value can suggest an action the player cannot legally take. Before integrating the model, print the legal choices for empty and nonempty pots.',
    mechanism: 'Roll is printed unconditionally because both example states are live. Bank is printed only when pot is positive. The newline belongs after that branch so each state occupies one line. This is a UI reflection of the rule, not a substitute for enforcing legality in choose and apply.',
    question: 'If the UI hides Bank at pot zero, can the rules stop checking legality?', yes: 'No', no: 'Yes', why: 'Other callers, tests and training can invoke the rules without using the UI.', change: ['if (pot > 0)', 'if (pot >= 0)'],
  },
};

export function explorationFor(id) {
  const e = explorations[id.slice(0, 2)];
  const figure = e.figure ? '\n\n' + fence('figure', `name: dice/${e.figure}\ncaption: Change one setting and follow the calculation. Then implement the same arithmetic in C++.`) + '\n\nFirst explore the controls. The figure illustrates the calculation; your own executable below is what you will build and check.' : '';
  return {
    title: e.title, file: e.file, code: e.code,
    prose: e.problem + figure + '\n\n' + predict(e.question, e.yes, e.no, e.why),
    explain: fence('text', `g++ -std=c++20 -Wall -Wextra -pedantic ${e.file} -o explore\n./explore`) + (e.input ? `\n\nType ${e.input.trim()} and press Enter.` : '') + '\n\nExpected output:\n\n' + fence('text', e.output) + '\n\n### How it works\n\n' + e.mechanism + '\n\nOpen this small file in **Trace in CodeLens**, if your C++ debugger is available. Step over the assignment or loop and watch the named values change. If tracing is unavailable, the printed output and trace table let you follow the same operations. C++ tracing needs GDB with Python support; it is separate from merely having a compiler.',
    checks: compile(e.file, 'explore') + `\nrun "./explore" stdout=${JSON.stringify(e.output)}` + (e.input ? ` stdin=${JSON.stringify(e.input)}` : ''),
    wrong: [{ name: 'wrong calculation in the exploration', files: { [e.file]: e.code.replace(...e.change) }, fails: [1] }],
  };
}

// Every challenge accepts more than one input, so printing one memorized example is rejected.
const challenges = {
  '01': ['Remaining points', 'Read one integer score from standard input and print how many points remain to reach 12. Inputs are between 0 and 11.', 'int score = 0;\n    std::cin >> score;\n    std::cout << 12 - score << \'\\n\';', '', [['4\n', '8'], ['9\n', '3']], ['12 - score', '12 + score'], 'Store the score before calculating the difference.', 'The target stays 12; the missing amount changes with the input.', 'Extract one int, then print target minus score.'],
  '02': ['Bank without losing the old score', 'Read a banked score and a positive pot. Print their sum as the new banked score. Use numeric input; do not call apply for this exercise.', 'int score = 0, pot = 0;\n    std::cin >> score >> pot;\n    score += pot;\n    std::cout << score << \'\\n\';', '', [['4 3\n', '7'], ['2 6\n', '8']], ['score += pot', 'score = pot'], 'The new score includes the old points.', 'Assignment and addition-assignment do different things.', 'Read two integers, add pot to score, print score.'],
  '03': ['A threshold with an exact boundary', 'Read a nonnegative pot. Print bank at pot 5 or above, otherwise roll. This policy has threshold 5, not our training baseline of 4.', 'int pot = 0;\n    std::cin >> pot;\n    std::cout << (pot >= 5 ? "bank" : "roll") << \'\\n\';', '', [['5\n', 'bank'], ['4\n', 'roll']], ['pot >= 5', 'pot > 5'], 'Check the value exactly on the threshold.', 'At least five includes five itself.', 'Read pot and branch using an inclusive comparison.'],
  '04': ['Count accepted commands', 'Read whole command lines until q or EOF. Count only r and b. Ignore every other line. Print the accepted count once, at the end. This tests parsing, not game legality.', 'std::string line;\n    int count = 0;\n    while (std::getline(std::cin, line) && line != "q") {\n        if (line == "r" || line == "b") ++count;\n    }\n    std::cout << count << \'\\n\';', '#include <string>', [['r\nwrong\nb\nq\n', '2'], ['wrong\nq\n', '0']], ['if (line == "r" || line == "b") ++count;', '++count;'], 'Keep the counter outside the loop.', 'A command can parse even when a real game would reject it.', 'Read lines, stop at q, increment only for the two recognized commands.'],
  '05': ['Reward from the opponent seat', 'Read a winner code: -1 for unfinished, 0 or 1 for the winner. Print reward from player 1’s perspective: 0, -1, or +1. This deliberately reverses the training agent’s perspective.', 'int winner = -1;\n    std::cin >> winner;\n    double reward = 0;\n    if (winner == 1) reward = 1;\n    if (winner == 0) reward = -1;\n    std::cout << reward << \'\\n\';', '', [['0\n', '-1'], ['-1\n', '0'], ['1\n', '1']], ['if (winner == 0) reward = -1;', 'if (winner == 0) reward = 1;'], 'Name whose reward you are computing.', 'Reward signs are relative to the chosen player.', 'Start at zero; use separate branches for the two winners.'],
  '06': ['Recover the pot from a row number', 'Read a valid encoded row number in the 12-by-12-by-12 table. Print only its pot component without constructing a Game.', 'int id = 0;\n    std::cin >> id;\n    std::cout << id % 12 << \'\\n\';', '', [['328\n', '4'], ['145\n', '1']], ['id % 12', 'id / 12'], 'Pot is the offset inside one score-pair block.', 'Division removes an offset; remainder retrieves it.', 'Read the id and compute its remainder on division by 12.'],
  '07': ['Probability of choosing the best action', 'Read epsilon as a real number between 0 and 1. Assume two legal actions and a unique best action. Print the probability of selecting that best action.', 'double epsilon = 0;\n    std::cin >> epsilon;\n    std::cout << 1.0 - epsilon + epsilon / 2.0 << \'\\n\';', '', [['0.2\n', '0.9'], ['1\n', '0.5']], ['1.0 - epsilon + epsilon / 2.0', '1.0 - epsilon'], 'The best action can be selected during exploration too.', 'Add the exploitation probability to half the exploration probability.', 'Read epsilon; print one minus epsilon plus epsilon divided by two.'],
  '08': ['Update after a terminal loss', 'Read an old estimate and alpha, with alpha between 0 and 1. Print its updated value after a terminal loss of -1. There is no next-state value.', 'double value = 0, alpha = 0;\n    std::cin >> value >> alpha;\n    value += alpha * (-1.0 - value);\n    std::cout << value << \'\\n\';', '', [['0.2 0.5\n', '-0.4'], ['0.6 1\n', '-1']], ['alpha * (-1.0 - value)', 'alpha * (-1.0 + value)'], 'Work out the target minus the old estimate first.', 'A terminal transition never adds a future value.', 'Read value and alpha, then add alpha times (-1 minus value).'],
  '09': ['A different exploration floor', 'Read episode and total episode count as integers. Inputs satisfy 0 <= episode < total and total > 0. Print max(0.1, 1 - episode/total), with floating-point division.', 'int episode = 0, total = 1;\n    std::cin >> episode >> total;\n    std::cout << std::max(0.1, 1.0 - static_cast<double>(episode) / total) << \'\\n\';', '#include <algorithm>', [['50 100\n', '0.5'], ['99 100\n', '0.1']], ['static_cast<double>(episode)', 'episode'], 'Test the midpoint before the end of the schedule.', 'Casting must happen before integer division loses the fraction.', 'Convert episode to double, divide by total, subtract from one, enforce the floor.'],
  '10': ['Report a win rate', 'Read wins and games as integers, with 0 <= wins <= games and games > 0. Print the win rate as a real number without rounding it to a whole percentage.', 'int wins = 0, games = 1;\n    std::cin >> wins >> games;\n    std::cout << static_cast<double>(wins) / games << \'\\n\';', '', [['3 5\n', '0.6'], ['1 4\n', '0.25']], ['static_cast<double>(wins)', 'wins'], 'A fraction needs floating-point division.', 'Converting the result after integer division is too late.', 'Read both integers and convert wins before dividing.'],
  '11': ['Restore one model value', 'Read a double in [-1,1]. Put it into the roll column of row 17 of a new table, save to practice-model.txt, load into another table, and print the restored value. Use the storage helpers you typed.', 'double value = 0;\n    std::cin >> value;\n    Table q = make_table();\n    q[17][0] = value;\n    save_table(q, "practice-model.txt");\n    Table loaded = load_table("practice-model.txt");\n    std::cout << loaded[17][0] << \'\\n\';', '#include "storage.hpp"', [['0.25\n', '0.25'], ['-0.75\n', '-0.75']], ['q[17][0] = value;', 'q[17][1] = value;'], 'Keep row and action column separate.', 'The output must come from the loaded table.', 'Allocate, assign row 17 column 0, save, load, then print that loaded cell.'],
  '12': ['Choose from a frozen row legally', 'Read pot, roll value and bank value. If pot is zero, print roll. Otherwise print the action with the larger value; for this deterministic exercise break ties by choosing roll. Do not change the model or draw random numbers.', 'int pot = 0;\n    double roll = 0, bank = 0;\n    std::cin >> pot >> roll >> bank;\n    bool take_roll = pot == 0 || roll >= bank;\n    std::cout << (take_roll ? "roll" : "bank") << \'\\n\';', '', [['0 -0.4 99\n', 'roll'], ['3 -0.4 0.7\n', 'bank']], ['pot == 0 || roll >= bank', 'roll >= bank'], 'Apply legality before ranking the values.', 'An unavailable action is excluded even if its stored value is huge.', 'Force roll for an empty pot; otherwise compare the two estimates.'],
};

const tryIts = {
  '01': 'In explore_input.cpp replace pot + 4 with pot / 4 and input 3. Predict why it prints 0. Change the divisor to 4.0 and compare. Restore the original before rerunning its checks.',
  '02': 'In explore_reference.cpp remove & from alias. Predict the new pot, then run: it stays 4 while copy is 6. Restore &, trace again, and identify which assignment changes the original storage.',
  '03': 'Seed second with 43 in explore_random.cpp. Compare the equality outputs. Restore 42, then call second() one extra time before comparing; equal seeds alone do not help if streams are advanced differently.',
  '04': 'Replace continue with break in explore_continue.cpp. The final apply 2 disappears. Replace it with return 0 and explain why a function exit is stronger than a loop exit. Restore continue.',
  '05': 'Reverse both signs in explore_reward.cpp. The code runs, but now the objective belongs to player 1. Explain why copying that reward into the player-0 trainer would teach it to lose. Restore the signs.',
  '06': 'Change pot from 4 to 5 in explore_address.cpp and watch id grow by one. Change other from 3 to 4 instead: id grows by twelve. Restore the values, then try own + other in place of own * 12 + other and find the collision.',
  '07': 'Set epsilon to 0, 0.5 and 1 in explore_epsilon.cpp. Write down the two probabilities each time. At epsilon 1 the best action still occurs half the time; explain why exploration is not the same as choosing badly.',
  '08': 'Set alpha to 0, 0.5 and 1 in explore_update.cpp. The new estimate stays old, lands halfway, or reaches the target. Then use target - value twice without recomputing error and explain why it is not two honest updates. Restore the original file.',
  '09': 'Remove static_cast<double> from explore_schedule.cpp. Observe that the midpoint exploration stays at 1. Restore it, then increase the floor to 0.2 and predict which printed rows change.',
  '10': 'In explore_rate.cpp multiply both wins and games by four. The rate stays 0.6 and the standard error roughly halves. Then change only wins: this changes the rate, so it is a different comparison. Restore the original values.',
  '11': 'Set the second output precision to 6 in explore_precision.cpp. Both lines now lose the same digits. Restore 17, then inspect dice-q.txt: its metadata and row order are part of the model contract, not decoration.',
  '12': 'Change pot > 0 to pot >= 0 in explore_display.cpp. Bank incorrectly appears at an empty pot. Explain why the display, selector and rule function all need consistent legality before restoring the comparison.',
};

export function practiceFor(id) {
  const key = id.slice(0, 2);
  const [name, brief, body, headers, cases, mutation, nudge, concept, shape] = challenges[key];
  const file = `practice_${key}.cpp`;
  const code = program('    ' + body.replace('std::cout << ', 'std::cout << "result=" << '), headers);
  const checks = [compile(file, 'practice')];
  for (const [input, output] of cases) {
    // The label anchors the answer, distinguishing 1 from the substring inside -1.
    // Reject a second known answer too, so printing every example cannot pass.
    const different = cases.find(([, value]) => value !== output)[1];
    checks.push(`run "./practice" stdin=${JSON.stringify(input)} stdout=${JSON.stringify('result=' + output + '\n')} without=${JSON.stringify('result=' + different + '\n')}`);
  }
  return [
    { title: 'Try it', prose: tryIts[key] + '\n\nKeep experiments in the small explore file so an intentional mistake does not silently alter your game. Make a prediction, run, explain the result, then restore the file.', file: null, code: null, explain: '', checks: '', wrong: [] },
    { title: `Your turn — ${name}`, file: null, code: null,
      prose: `**No solution is shown.** Create \`${file}\` yourself. ${brief} Begin the one output line with \`result=\`, followed by your answer and a newline.\n\nBuild with \`g++ -std=c++20 -Wall -Wextra -pedantic ${file} -o practice\`, then run \`./practice\` and type the inputs.\n\n| input | expected output |\n|---|---|\n` + cases.map(([input, output]) => `| ${input.trim().replaceAll('\n', ', then ')} | result=${output} |`).join('\n') + '\n\n' + fence('hints', `nudge: ${nudge}\nconcept: ${concept}\nshape: ${shape}`),
      explain: 'The checks use different inputs. Derive the result from the data instead of printing an example answer. This practice file is separate from the game, so you can return to it without breaking later lessons.',
      checks: checks.join('\n'), wrong: [{ name: 'plausible wrong calculation', files: { [file]: code.replace(...mutation) }, fails: [1] }, { name: 'prints the first example for every input', files: { [file]: program(`    std::cout << ${JSON.stringify('result=' + cases[0][1] + '\n')} ;`) }, fails: [2] }],
      files: { [file]: code },
    },
  ];
}
