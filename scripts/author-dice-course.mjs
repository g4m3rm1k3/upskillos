// Authoring source for the Project Studio Dice Duel track. Run with Node to regenerate Markdown.
// Full-file targets drive the normal live diff; teaching stages introduce small changes.
import fs from 'node:fs';
import path from 'node:path';
import { teachingStages } from './dice-course-teaching.mjs';
import { explorationFor, practiceFor } from './dice-course-practice.mjs';

const root = 'src/labs/project-studio/tracks/dice-cpp';
fs.mkdirSync(root, { recursive: true });
const walkthrough = {};
const ids = [];
let lesson;
const fence = (lang, code) => '```' + lang + '\n' + code.trim() + '\n```\n';
function begin(id, title, intro, run = '') {
  ids.push(id);
  lesson = { id, text: `---\ntitle: ${title}\ntrack: C++ for Python Developers — Dice Duel and Q-Learning\ntrackOrder: 5\nruntime: cpp\nconsole: true\n${run ? `run: ${run}\n` : ''}---\n\n${intro}\n\n` };
}
function step(title, prose, file, code, explain, checks, wrong = []) {
  if (file && !lesson.explored && !lesson.id.startsWith('01-')) {
    emit(explorationFor(lesson.id));
    lesson.explored = true;
  }
  for (const stage of teachingStages({ lessonId: lesson.id, title, prose, file, code, explain, checks, wrong })) {
    emit(stage);
  }
}
function emit(stage) {
  lesson.text += `## ${stage.title}\n\n${stage.prose}\n\n`;
  if (stage.file) lesson.text += fence(`cpp file=${stage.file}`, stage.code) + '\n';
  lesson.text += stage.explain + '\n\n';
  if (stage.checks) lesson.text += fence('check', stage.checks) + '\n';
  walkthrough[`${lesson.id}#${stage.title}`] = { wrong: stage.wrong ?? [], ...(stage.files ? { files: stage.files } : {}) };
}
function end() {
  if (!lesson.explored) emit(explorationFor(lesson.id));
  for (const stage of practiceFor(lesson.id)) emit(stage);
  fs.writeFileSync(path.join(root, lesson.id + '.md'), lesson.text);
}
const compile = (file, exe) => `run "g++ -std=c++20 -Wall -Wextra -pedantic ${file} -o ${exe}"`;
const checks = (file, exe, output) => compile(file, exe) + `\nrun "./${exe}" stdout="${output}"`;
const mutation = (file, from, to, fails = [1]) => ({ name: `${file}: ${from} becomes ${to}`, typeFile: true, editFiles: { [file]: [[from, to]] }, fails });
const predict = (question, answer, other, explain) => fence('predict', `question: ${question}\nchoice: ${answer}\nchoice: ${other}\nanswer: ${answer}\nexplain: ${explain}`);
const typing = () => 'Type the highlighted changes yourself in the named file. The comparison below updates against your saved work; green lines are additions and red lines are deletions.';
const testIntro = 'Read these checks before writing the implementation. Type this test file yourself. `assert(condition)` stops the program when a condition is false. Keep assertions enabled: do not compile these exercises with `-DNDEBUG`. A successful test prints its final message; compilation alone is not a pass.';
function testStep(file, code, note) {
  step('Read and type the tests', `${testIntro}\n\n${note}\n\nThe implementation is not ready yet. Predict which check will fail when you first compile. The file check below only records that you typed the test; the implementation step runs it.`, file, code,
    'The first include names the header you will implement next. Quoted includes search this project. Angle-bracket includes name standard library headers. Read each assertion as a concrete example of the contract.',
    `file ${file}`, [{ name: 'test file absent', fails: [0] }]);
}

begin('01-from-python-to-a-binary', '1 — A Python programmer meets the compiler',
`You know Python functions, lists, dictionaries, loops and basic tests. You need no C++, game development or machine-learning experience. In this course you type **all** game, training, evaluation and test code yourself. There are no supplied game files or hidden framework helpers.

Open **Project Studio in the desktop app**, choose this track, and select a new empty folder named \`dice-duel\`. Keep that folder for the entire track. Use the terminal for interactive programs; the Run output pane is not an interactive input terminal. On Windows the commands below use PowerShell; on macOS/Linux use your normal shell.

We build a small Pig-like dice game. Two players race to **12**. A turn has an unbanked pot. Roll 2–6 to add to the pot; roll 1 to lose the pot and pass the turn. Bank a nonempty pot to add it to your permanent score and pass. Reaching 12 with score plus pot wins immediately. Banking zero is illegal. We deliberately choose a small target so a table can represent every decision.

First you play a rule-based opponent. Later the opponent learns which legal action has the best expected win/loss reward. No graphics library is needed. The eventual graphical sequel uses SDL3; it is a separate future project.

**Outcome:** compile a program and explain why integer division differs from Python's \`/\`.

\`source.cpp → compiler → executable → terminal output\``.replaceAll('\`', '`'), 'hello.cpp');
step('Find the compiler', 'Type `g++ --version` in the terminal. If it is missing, use **Install C++ compiler**, then close and reopen the terminal. C++ source must be compiled after every edit; running an old executable does not test new source.', null, '',
  'Procedure: 1. Save source. 2. Compile. 3. Read the first error. 4. Run only after compilation succeeds. `-std=c++20` selects the language version; `-Wall -Wextra -pedantic` request diagnostics. `-o hello` names the executable (`hello.exe` on Windows).',
  'run "g++ --version"');
const hello = `#include <iostream>
int main() {
    const int target = 12;
    const double bust = 1.0 / 6.0;
    std::cout << "Dice Duel: first to " << target << '\\n';
    std::cout << "integer " << 1 / 6 << " probability " << bust << '\\n';
    return 0;
}`;
step('Print the rules and a probability',
  'Create `hello.cpp`. `#include <iostream>` declares stream operations. `int main()` is the entry point and returns an integer exit status. Braces delimit its body. Each statement ends with `;`. `const int` declares an unchanging whole number; `double` stores a floating-point approximation. `std::` selects the standard-library namespace, like qualifying a Python name with its module. `std::cout << value` sends text to standard output. `\\n` ends a line. Type the program, save, then compile and run it.\n\n' + predict('What does 1 / 6 print when both operands are integers?', '0', '0.166667', 'C++ integer division discards the fractional part. Making an operand 1.0 selects floating-point division.'),
  'hello.cpp', hello,
  fence('text', 'g++ -std=c++20 -Wall -Wextra -pedantic hello.cpp -o hello\n./hello') + '\nExpect `Dice Duel: first to 12` and `integer 0 probability 0.166667`. Python integers grow as needed; C++ `int` has a bounded range. Our scores remain small. Make a missing-semicolon error, read the compiler location, repair it, and rebuild.\n\n**Explain without the reference:** why did changing `1` to `1.0` change the result? A type controls which operation runs, not just how a variable is labelled.',
  checks('hello.cpp', 'hello', 'integer 0 probability 0.166667'), [mutation('hello.cpp', '1.0 / 6.0', '1 / 6')]);
end();

const gameBase = `#ifndef DICE_GAME_HPP
#define DICE_GAME_HPP
#include <array>
#include <stdexcept>
constexpr int TARGET = 12;
enum class Action { Roll = 0, Bank = 1 };
struct Game {
    std::array<int, 2> score{0, 0};
    int turn = 0;
    int pot = 0;
    int winner = -1;
};
inline bool finished(const Game& g) { return g.winner != -1; }
inline bool legal(const Game& g, Action action) {
    return !finished(g) && (action == Action::Roll ||
           (action == Action::Bank && g.pot > 0));
}
inline void pass_turn(Game& g) {
    g.pot = 0;
    g.turn = 1 - g.turn;
}
`;
const transition = `inline void apply(Game& g, Action action, int face = 1) {
    if (!legal(g, action)) throw std::invalid_argument("illegal action");
    if (action == Action::Bank) {
        g.score[g.turn] += g.pot;
        pass_turn(g);
        return;
    }
    if (face < 1 || face > 6) throw std::invalid_argument("bad die");
    if (face == 1) { pass_turn(g); return; }
    g.pot += face;
    if (g.score[g.turn] + g.pot >= TARGET) g.winner = g.turn;
}
`;
let game = gameBase + transition + '#endif\n';
const gameTests = `#include "game.hpp"
#include <cassert>
#include <iostream>
int main() {
    Game g;
    assert(!legal(g, Action::Bank));
    apply(g, Action::Roll, 4);
    assert(g.pot == 4 && g.score[0] == 0 && g.turn == 0);
    apply(g, Action::Bank);
    assert(g.score[0] == 4 && g.pot == 0 && g.turn == 1);
    apply(g, Action::Roll, 5);
    apply(g, Action::Roll, 1);
    assert(g.score[1] == 0 && g.pot == 0 && g.turn == 0);
    apply(g, Action::Roll, 6);
    apply(g, Action::Roll, 2);
    assert(g.winner == 0 && !legal(g, Action::Roll));
    Game exact; exact.score[0] = 6;
    apply(exact, Action::Roll, 6);
    assert(exact.winner == 0);
    Game over; over.score[1] = 9; over.turn = 1;
    apply(over, Action::Roll, 6);
    assert(over.winner == 1);
    Game bad;
    bool rejected = false;
    try { apply(bad, Action::Bank); }
    catch (const std::invalid_argument&) { rejected = true; }
    assert(rejected && bad.turn == 0);
    rejected = false;
    try { apply(bad, Action::Roll, 7); }
    catch (const std::invalid_argument&) { rejected = true; }
    assert(rejected && bad.pot == 0);
    std::cout << "rules ok\\n";
}`;
begin('02-state-and-rules', '2 — Make the rules deterministic',
  'With score 4 and pot 6, rolling 2 wins immediately. Rolling 1 instead loses only the pot: the banked 4 survives. We need those transitions to be testable without hoping for a lucky die. **Outcome:** represent a game and implement a deterministic transition function.\n\n`score + pot → roll / bank → new score, pot, turn, winner`');
testStep('test_rules.cpp', gameTests, 'The examples cover roll, bank, bust, exact victory, overshoot, both seats, and rejected input. `&&` means both conditions must hold. `try` runs code that may throw; `catch` handles the named error type.');
step('Describe the state',
  'Create `game.hpp`. A `struct` groups named fields, like a small Python dataclass. `std::array<int, 2>` stores exactly two integers and uses zero-based indexing. Braced initializers give every field a defined value. `enum class` restricts action names to `Action::Roll` and `Action::Bank`; it avoids confusing a die face with an action.\n\n`const Game&` borrows the original game without copying and forbids mutation through this reference. `Game&` borrows it mutably: unlike assigning a Python name, changes reach the caller. A plain `Game` parameter would copy the fields. `inline` allows these header definitions to appear in multiple compilation units. The `#ifndef` / `#define` / `#endif` guard prevents duplicate inclusion.\n\n' + typing(gameBase + '#endif\n'),
  'game.hpp', gameBase + '#endif\n',
  'Procedure: 1. Write the fields. 2. Write the legal-action query. 3. Write turn passing. 4. Implement rules separately from randomness. `winner == -1` means nobody won. `!` negates a boolean. `1 - turn` switches between 0 and 1. No terminal output belongs in these rules.\n\nKeep the tests intact. The next step supplies `apply`, after which you compile and run them. The file check does not claim the rules work yet.',
  'contains game.hpp "struct Game"', [mutation('game.hpp', 'struct Game', 'struct Match', [0])]);
step('Implement one transition',
  'Add `apply` before the final `#endif`. Its default `face = 1` lets a bank call omit the unused die. `throw` stops this call with an error rather than silently accepting an impossible move. `return;` ends a void function immediately. `+=` adds to a field.\n\n' + predict('Score 4, pot 6, then roll 1. What is the banked score?', '4', '0', 'Bust clears the pot, not previously banked points.') + '\n' + typing(transition),
  'game.hpp', game,
  'Build and run `test_rules.cpp` using the check commands. The test injects faces directly; real randomness comes next. Our invariant: before victory, scores and score-plus-pot are below 12. Only a roll can cross the target because a previous roll would already have ended the game.\n\n**Debugging task:** remove `&` from `apply(Game& g, ...)`. The code compiles but the first pot assertion fails because the function modified a copy. Restore it. **Transfer:** a card game can also take an explicit drawn card as input; shuffling belongs outside its rule function.',
  checks('test_rules.cpp', 'test_rules', 'rules ok'), [mutation('game.hpp', 'g.pot = 0;', 'g.pot = 1;'), mutation('game.hpp', '>= TARGET', '> TARGET'), mutation('game.hpp', 'apply(Game& g', 'apply(Game g')]);
end();

const io = `#ifndef DICE_IO_HPP
#define DICE_IO_HPP
#include "game.hpp"
#include <random>
#include <string>
inline int roll(std::mt19937& rng) {
    return std::uniform_int_distribution<int>(1, 6)(rng);
}
inline bool parse_action(const std::string& text, Action& action) {
    if (text == "r") { action = Action::Roll; return true; }
    if (text == "b") { action = Action::Bank; return true; }
    return false;
}
inline Action fixed_action(const Game& g, int threshold = 4) {
    return g.pot >= threshold ? Action::Bank : Action::Roll;
}
#endif`;
const ioTests = `#include "io.hpp"
#include <cassert>
#include <iostream>
int main() {
    std::mt19937 a(42), b(42);
    std::array<int, 7> counts{};
    for (int i = 0; i < 6000; ++i) {
        int face = roll(a);
        assert(face >= 1 && face <= 6 && face == roll(b));
        ++counts[face];
    }
    for (int face = 1; face <= 6; ++face) assert(counts[face] > 500);
    Action action = Action::Bank;
    assert(!parse_action("roll", action) && action == Action::Bank);
    assert(parse_action("r", action) && action == Action::Roll);
    assert(parse_action("b", action) && action == Action::Bank);
    assert(!parse_action("", action));
    Game g; assert(fixed_action(g) == Action::Roll);
    g.pot = 3; assert(fixed_action(g) == Action::Roll);
    g.pot = 4; assert(fixed_action(g) == Action::Bank);
    std::cout << "input and dice ok\\n";
}`;
begin('03-randomness-and-input', '3 — Random dice, predictable tests', 'Rolling 6000 times should visit every face. It need not visit each exactly 1000 times. **Outcome:** use a seeded random engine and parse a whole input line without corrupting game state.\n\n`seed → engine state → distribution → die face → deterministic rules`');
testStep('test_io.cpp', ioTests, 'The histogram is a coarse smoke test, not a statistical proof of fairness. Equal seeds must give equal sequences within the same toolchain. Standard-library distribution algorithms can differ across platforms.');
step('Separate chance from choice',
  '`std::mt19937` is a pseudorandom engine. Seeding initializes its internal state. A distribution maps engine output to the required range, including both endpoints. Pass the engine by reference so successive calls advance the same stream. Never construct or reseed it on every roll.\n\n`std::string` owns text. The parser accepts exactly `r` or `b`; invalid input leaves the output action unchanged. This deliberately rejects `roll`, trailing spaces and blank lines. `fixed_action` is our transparent baseline: bank at pot 4, otherwise roll.\n\n' + predict('Should 6000 fair rolls contain exactly 1000 ones?', 'No', 'Yes', 'An expectation describes an average across repetitions, not a promise about one sample.'),
  'io.hpp', io,
  'Type the three short functions, then compile and run the tests. In the loop, `++i` increments a counter; `++counts[face]` increments a histogram bin. Empty braces initialize all counts to zero. **Repair exercise:** change the distribution upper bound to 5 and explain which assertion detects it. **Transfer:** random card draws need a shrinking deck, not independent die sampling.',
  checks('test_io.cpp', 'test_io', 'input and dice ok'), [mutation('io.hpp', '(1, 6)(rng)', '(1, 5)(rng)'), mutation('io.hpp', 'g.pot >= threshold', 'g.pot > threshold')]);
end();

const consoleGame = `#include "io.hpp"
#include <iostream>
int main() {
    Game g;
    std::mt19937 dice(42);
    while (!finished(g)) {
        std::cout << "You " << g.score[0] << " Bot " << g.score[1]
                  << " pot " << g.pot << " turn " << g.turn << '\\n';
        Action action = fixed_action(g);
        if (g.turn == 0) {
            std::cout << "r=roll b=bank q=quit: ";
            std::string line;
            if (!std::getline(std::cin, line) || line == "q") {
                std::cout << "Goodbye\\n"; return 0;
            }
            if (!parse_action(line, action) || !legal(g, action)) {
                std::cout << "Invalid move\\n"; continue;
            }
        }
        int face = action == Action::Roll ? roll(dice) : 1;
        std::cout << (action == Action::Roll ? "roll " : "bank ")
                  << (action == Action::Roll ? face : g.pot) << '\\n';
        apply(g, action, face);
    }
    std::cout << (g.winner == 0 ? "You win\\n" : "Bot wins\\n");
}`;
begin('04-play-the-terminal-game', '4 — A complete console duel', 'You type `b` at pot 0. The game should explain the mistake and ask again, not give the bot a turn. **Outcome:** build an interactive game loop that shares its tested rules with a fixed opponent.\n\n`display → read / choose → validate → apply → repeat`', 'play.cpp');
step('Give the rules a terminal',
  'Create `play.cpp`. Type one block at a time: initialize state, display it, read a human action, then apply one move. `while` repeats until a winner exists. `std::getline` reads an entire line; its false result means end-of-input. `||` short-circuits, so quit works without parsing an action. `continue` skips to the next iteration after a rejected move. The `condition ? yes : no` expression selects one value.\n\n' + predict('At pot zero, input b then q. Does the bot take a turn?', 'No', 'Yes', 'The illegal action reaches continue before apply; the next input is still yours.'),
  'play.cpp', consoleGame,
  fence('text', 'g++ -std=c++20 -Wall -Wextra -pedantic play.cpp -o play\n./play') + '\nPlay several games in the terminal. The seed 42 makes debugging reproducible; changing it changes the sequence. EOF exits gracefully, which also makes automated input tests finite. The automated check types an invalid bank, nonsense, then quit. It proves input recovery, not strategy strength.\n\n**Explain:** why does banking avoid drawing a die? Consuming unused randomness makes traces harder to compare. **Challenge:** add a help command that prints the rules without altering state or consuming randomness.',
  compile('play.cpp', 'play') + '\nrun "./play" stdin="b\\nwrong\\nq\\n" stdout="Invalid move" without="turn 1"\nrun "./play" stdin="q\\n" stdout="Goodbye"',
  [mutation('play.cpp', '!legal(g, action)', 'false', [1]), mutation('play.cpp', '"Goodbye\\n"', '"bye\\n"', [2])]);
end();

const env = `#ifndef DICE_ENV_HPP
#define DICE_ENV_HPP
#include "io.hpp"
inline void opponent_turn(Game& g, std::mt19937& dice, int threshold = 4) {
    while (!finished(g) && g.turn == 1) {
        Action action = fixed_action(g, threshold);
        apply(g, action, action == Action::Roll ? roll(dice) : 1);
    }
}
struct Transition {
    Game next;
    double reward;
    bool done;
};
inline Transition agent_step(Game g, Action action, std::mt19937& dice) {
    if (g.turn != 0) throw std::invalid_argument("not the agent turn");
    apply(g, action, action == Action::Roll ? roll(dice) : 1);
    opponent_turn(g, dice);
    const bool done = finished(g);
    const double reward = done ? (g.winner == 0 ? 1.0 : -1.0) : 0.0;
    return {g, reward, done};
}
#endif`;
const envTests = `#include "env.hpp"
#include <cassert>
#include <iostream>
int main() {
    std::mt19937 dice(7);
    Game g; g.pot = 4;
    Transition t = agent_step(g, Action::Bank, dice);
    assert(g.pot == 4 && g.score[0] == 0);
    assert(t.next.score[0] == 4);
    assert(t.done || t.next.turn == 0);
    assert(t.reward == (t.done ? -1.0 : 0.0));
    int wins = 0, losses = 0;
    for (unsigned seed = 0; seed < 200; ++seed) {
        std::mt19937 rng(seed);
        Game near; near.score = {11, 11};
        auto result = agent_step(near, Action::Roll, rng);
        if (result.done && result.next.winner == 0) {
            assert(result.reward == 1.0); ++wins;
        }
        if (result.done && result.next.winner == 1) {
            assert(result.reward == -1.0); ++losses;
        }
        assert(result.done || result.next.turn == 0);
    }
    assert(wins > 0 && losses > 0);
    std::cout << "environment ok\\n";
}`;
begin('05-the-agent-environment-boundary', '5 — Whose turn is a learning step?', 'The agent banks 4. The opponent then rolls 6, rolls 5 and wins. The agent must receive **-1** for its bank decision, not learn from a state where the opponent controls the next action. **Outcome:** return a transition from one agent decision to its next decision or the end of the game.\n\n`agent action → rules → whole fixed-opponent turn → agent decision or terminal reward`');
testStep('test_env.cpp', envTests, 'The input game must remain unchanged: this time passing `Game` by value is deliberate. The test checks both positive and negative outcomes and ensures every nonterminal successor belongs to the agent.');
step('Wrap the fixed opponent',
  'Create `env.hpp`. The agent is always player 0 inside the learning environment; player 1 follows the bank-at-4 rule. `Transition` owns a copied successor plus reward and completion flag. `auto` asks the compiler to infer a variable type from its initializer; it remains statically typed.\n\n' + predict('After the agent banks, may a nonterminal successor have turn 1?', 'No', 'Yes', 'The wrapper plays the opponent until player 0 can choose again. A loss during that turn belongs to the preceding agent action.'),
  'env.hpp', env,
  'Procedure: 1. Apply one agent action. 2. Finish the opponent turn if needed. 3. Detect the winner. 4. Return reward +1, -1, or 0. No intermediate points are rewards: otherwise the agent might prefer scoring to winning. We later use discount 1, so grouping multiple die events into one decision step does not introduce time-discount ambiguity.\n\nA **Markov state** contains enough information to predict future outcomes given an action. Scores and pot suffice against this fixed memoryless opponent. Changing the opponent during training changes the environment; self-play is not automatically the same problem. **Transfer:** a card game with hidden hands would need an observation model; do not give the agent secret cards.',
  checks('test_env.cpp', 'test_env', 'environment ok'), [mutation('env.hpp', 'opponent_turn(g, dice);', '// opponent skipped'), mutation('env.hpp', '1.0 : -1.0', '1.0 : 0.0')]);
end();

const tableBase = `#ifndef DICE_AGENT_HPP
#define DICE_AGENT_HPP
#include "env.hpp"
#include <vector>
#include <algorithm>
#include <cmath>
constexpr int STATES = TARGET * TARGET * TARGET;
using Row = std::array<double, 2>;
using Table = std::vector<Row>;
inline Table make_table() { return Table(STATES, Row{0.0, 0.0}); }
inline int state_id(const Game& g) {
    if (finished(g) || g.turn != 0 || g.score[0] < 0 || g.score[0] >= TARGET ||
        g.score[1] < 0 || g.score[1] >= TARGET || g.pot < 0 ||
        g.score[0] + g.pot >= TARGET)
        throw std::invalid_argument("not a decision state");
    return (g.score[0] * TARGET + g.score[1]) * TARGET + g.pot;
}
inline int column(Action action) { return static_cast<int>(action); }
inline double best_value(const Table& q, const Game& g) {
    const Row& row = q.at(state_id(g));
    return g.pot == 0 ? row[0] : std::max(row[0], row[1]);
}
`;
let agent = tableBase + '#endif\n';
const tableTests = `#include "agent.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table();
    std::vector<bool> seen(STATES, false);
    for (int own = 0; own < TARGET; ++own)
        for (int other = 0; other < TARGET; ++other)
            for (int pot = 0; pot < TARGET - own; ++pot) {
                Game g; g.score = {own, other}; g.pot = pot;
                int id = state_id(g);
                assert(id >= 0 && id < STATES && !seen[id]);
                seen[id] = true;
            }
    Game g; g.score = {2, 3}; g.pot = 4;
    assert(state_id(g) == 328);
    q.at(state_id(g)) = {-0.4, 0.7};
    assert(best_value(q, g) == 0.7);
    Game empty;
    q.at(state_id(empty)) = {-0.4, 99.0};
    assert(best_value(q, empty) == -0.4);
    std::cout << "table ok\\n";
}`;
begin('06-addressing-the-q-table', '6 — From Python dictionaries to a C++ table', 'For scores 2 and 3 with pot 4, the row number is `(2 * 12 + 3) * 12 + 4 = 328`. That row has two values: roll and bank. **Outcome:** map every decision state to a unique row and ignore illegal actions when reading its best value.\n\n`(own, other, pot) → one row → [roll value, bank value]`');
testStep('test_table.cpp', tableTests, 'The nested loops check every valid encoding for collisions. An enormous value in an illegal bank column must not affect `best_value`. This is stronger than checking table dimensions alone.');
step('Own the table and borrow a row',
  'Create `agent.hpp`. `using` gives a type an alias. `std::vector<Row>` owns a dynamic sequence of rows; unlike a Python list it stores one element type. `Row{0.0, 0.0}` is copied into every row by the vector constructor. Some rows are unreachable; a simple rectangular allocation is worth the small waste.\n\n`.at(index)` checks bounds. `const Row&` borrows a row without copying. Such a reference must not outlive its vector or survive a reallocation; we never resize this table. `static_cast<int>` explicitly converts the action enum into its column.\n\n' + predict('At pot 0, roll has value -0.4 and bank has value 99. Which value is legal?', '-0.4', '99', 'Bank is unavailable. Both action selection and bootstrapping must mask it.'),
  'agent.hpp', agent,
  'Procedure: 1. Multiply own score by the second dimension. 2. Add opponent score. 3. Multiply by the pot dimension. 4. Add pot. This is positional notation, like hours/minutes/seconds in a clock. Tests enumerate all valid states, including asymmetric scores so swapping players cannot hide. **Debug:** terminal states must not be indexed; the winning pot may already be outside the table. **Transfer:** adding remaining cards requires another dimension and quickly enlarges storage.',
  checks('test_table.cpp', 'test_table', 'table ok'), [mutation('agent.hpp', '(g.score[0] * TARGET + g.score[1]) * TARGET + g.pot', '(g.score[0] + g.score[1]) * TARGET + g.pot'), mutation('agent.hpp', 'g.pot == 0 ? row[0] : std::max(row[0], row[1])', 'std::max(row[0], row[1])')]);
end();

const choose = `inline Action choose(const Table& q, const Game& g, double epsilon,
                     std::mt19937& choices) {
    if (g.pot == 0) return Action::Roll;
    if (std::uniform_real_distribution<double>(0.0, 1.0)(choices) < epsilon)
        return std::uniform_int_distribution<int>(0, 1)(choices) == 0
            ? Action::Roll : Action::Bank;
    const Row& row = q.at(state_id(g));
    if (row[0] == row[1])
        return std::uniform_int_distribution<int>(0, 1)(choices) == 0
            ? Action::Roll : Action::Bank;
    return row[0] > row[1] ? Action::Roll : Action::Bank;
}
`;
agent = agent.replace('#endif\n', choose + '#endif\n');
const policyTests = `#include "agent.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table(); std::mt19937 rng(11);
    Game g;
    for (int i = 0; i < 100; ++i) assert(choose(q, g, 1.0, rng) == Action::Roll);
    g.pot = 3; q.at(state_id(g)) = {-0.5, 0.2};
    for (int i = 0; i < 100; ++i) assert(choose(q, g, 0.0, rng) == Action::Bank);
    int exploratory_rolls = 0;
    for (int i = 0; i < 1000; ++i)
        exploratory_rolls += choose(q, g, 1.0, rng) == Action::Roll;
    assert(exploratory_rolls > 300 && exploratory_rolls < 700);
    q.at(state_id(g)) = {0.0, 0.0};
    int ties = 0;
    for (int i = 0; i < 1000; ++i) ties += choose(q, g, 0.0, rng) == Action::Roll;
    assert(ties > 300 && ties < 700);
    std::cout << "policy ok\\n";
}`;
begin('07-exploration-and-expectation', '7 — Explore without cheating', 'With exploration probability 0.2 and two legal actions, an inferior action is selected about 0.1 of the time: only half of exploratory choices pick it. **Outcome:** implement epsilon-greedy selection and random tie-breaking.\n\n`epsilon coin → random legal action OR best legal value → random tie if needed`');
testStep('test_policy.cpp', policyTests, 'The tests check forced rolls, exploitation, exploration and ties independently. Loose frequency bounds detect gross mistakes without claiming an exact random count.');
step('Choose an action',
  'Append `choose` before `#endif` in `agent.hpp`. Epsilon is the probability of exploration, between 0 and 1. A uniform real draw in `[0,1)` falls below epsilon that fraction of the time. Exploration can still select the best action. At a tie, use a fair choice even when epsilon is zero.\n\n' + predict('Epsilon is 0.2 and bank is uniquely best. How often is roll chosen in expectation?', '0.1', '0.2', 'Exploration happens 0.2 of the time, then chooses roll half of those times.') + '\n' + typing(choose),
  'agent.hpp', agent,
  'There are two random engines in the eventual trainer: one for dice, one for policy choices. Changing epsilon must not directly consume the die engine. Different policies still take different numbers of rolls; equal seeds do not guarantee identical trajectories.\n\n**Worked expectation:** at pot 6, ignoring victory for this local calculation, the next unbanked pot is 0, 8, 9, 10, 11 or 12. Their average is 50/6, about 8.33. That is not automatically the best match-winning move: banked scores and the opponent matter. **Misconception:** a zero Q-table contains no evidence that roll is better. Always picking the first maximum embeds an accidental roll preference. **Challenge:** measure exploration over 100 and 10000 choices, and explain why neither count must equal its expectation.',
  checks('test_policy.cpp', 'test_policy', 'policy ok'), [mutation('agent.hpp', '< epsilon)', '< 0.0)'), mutation('agent.hpp', 'if (row[0] == row[1])', 'if (false)')]);
end();

const update = `inline void update(Table& q, const Game& before, Action action,
                   const Transition& t, double alpha = 0.1, double gamma = 1.0) {
    if (!legal(before, action)) throw std::invalid_argument("illegal update");
    double target = t.reward;
    if (!t.done) target += gamma * best_value(q, t.next);
    double& value = q.at(state_id(before)).at(column(action));
    value += alpha * (target - value);
}
`;
agent = agent.replace('#endif\n', update + '#endif\n');
const updateTests = `#include "agent.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table();
    Game before; before.pot = 2;
    Game next; next.pot = 3;
    q.at(state_id(before)) = {0.2, -0.3};
    q.at(state_id(next)) = {0.8, 0.4};
    update(q, before, Action::Roll, {next, 0.0, false}, 0.5, 0.9);
    assert(std::abs(q.at(state_id(before))[0] - 0.46) < 1e-12);
    assert(q.at(state_id(before))[1] == -0.3);
    Game terminal; terminal.winner = 1; terminal.pot = 99;
    update(q, before, Action::Roll, {terminal, -1.0, true}, 0.5);
    assert(std::abs(q.at(state_id(before))[0] + 0.27) < 1e-12);
    Game empty;
    q.at(state_id(empty)) = {0.1, 99.0};
    update(q, before, Action::Bank, {empty, 0.0, false}, 1.0);
    assert(std::abs(q.at(state_id(before))[1] - 0.1) < 1e-12);
    std::cout << "update ok\\n";
}`;
begin('08-the-q-learning-update', '8 — A value learns from a target', 'An estimate of 0.2 moves halfway toward 0.72: the correction is `0.5 * (0.72 - 0.2) = 0.26`, leaving 0.46. **Outcome:** implement and numerically test one Q-learning update, including terminal losses.\n\n`old estimate → prediction error (target - old) → scaled correction → new estimate`');
testStep('test_update.cpp', updateTests, 'The first assertion checks real arithmetic rather than a keyword. The second proves that only the selected action changes. An intentionally unindexable terminal successor proves that terminal updates do not read its Q-row.');
step('Learn one estimate',
  'Append `update` before `#endif`. Alpha is the learning rate: the fraction of prediction error used. Gamma discounts future reward. The target is immediate reward plus gamma times the largest **legal** next value, unless the episode ended. A `double&` is an alias to the table cell: updating it updates the table. Without `&`, you change a temporary copy.\n\nWe just computed old + alpha * (target - old). In general the target is `reward + gamma * max_legal Q(next, action)`. This is Q-learning: its target uses the best next action even when its behavior explores. SARSA instead uses the next action actually chosen; that is a different algorithm.\n\n' + predict('A terminal loss has reward -1 and a hypothetical next value 99. What target do we use?', '-1', '98', 'There is no next decision after termination. Terminal updates use reward alone.') + '\n' + typing(update),
  'agent.hpp', agent,
  'Procedure: 1. Start with reward. 2. Bootstrap from the legal next maximum only if nonterminal. 3. Borrow the selected old cell. 4. Add alpha times its error. `std::abs(error) < 1e-12` tests approximate equality because floating-point arithmetic is rounded.\n\nFor this episodic game, gamma 1 makes the return the final +1 or -1 outcome. A perfect estimate equals `2 * win_probability - 1`, so Q=0.4 corresponds to 70% wins under the continuation policy and fixed opponent. We do not claim our finite training produces perfect estimates. Constant alpha keeps adapting; it does not meet every diminishing-step convergence condition. **Debug:** adding the target directly causes values to accumulate instead of converge. **Transfer:** an intermediate checkpoint is not a terminal state just because you stopped a simulation there.',
  checks('test_update.cpp', 'test_update', 'update ok'), [mutation('agent.hpp', 'if (!t.done)', 'if (true)'), mutation('agent.hpp', 'double& value', 'double value'), mutation('agent.hpp', '(target - value)', 'target')]);
end();

const train = `#ifndef DICE_TRAIN_HPP
#define DICE_TRAIN_HPP
#include "agent.hpp"
inline Table train(unsigned seed, int episodes) {
    Table q = make_table();
    std::mt19937 dice(seed), choices(seed + 100000u);
    for (int episode = 0; episode < episodes; ++episode) {
        Game g; g.turn = episode % 2;
        opponent_turn(g, dice);
        double fraction = static_cast<double>(episode) / std::max(1, episodes);
        double epsilon = std::max(0.05, 1.0 - fraction);
        int decisions = 0;
        while (!finished(g)) {
            if (++decisions > 10000) throw std::runtime_error("episode guard");
            Action action = choose(q, g, epsilon, choices);
            Transition t = agent_step(g, action, dice);
            update(q, g, action, t);
            g = t.next;
        }
    }
    return q;
}
#endif`;
const trainTests = `#include "train.hpp"
#include <cassert>
#include <iostream>
int main() {
    assert(train(12, 0) == make_table());
    Table first = train(12, 3000);
    assert(first == train(12, 3000));
    int nonzero = 0;
    for (const Row& row : first)
        for (double value : row) {
            assert(std::isfinite(value) && value >= -1.0 && value <= 1.0);
            if (value != 0.0) ++nonzero;
        }
    assert(nonzero > 100);
    assert(first != train(13, 3000));
    std::cout << "training ok\\n";
}`;
begin('09-training-episodes', '9 — Let the opponent learn', 'One game updates a handful of rows. Thousands of games revisit states under different dice outcomes. **Outcome:** train from scratch reproducibly, alternate who starts, and keep a safety cutoff distinct from a game outcome.\n\n`reset → act → transition → update → next state → repeat until winner`');
testStep('test_train.cpp', trainTests, 'A same-seed rerun must match exactly on the same build. A different seed should change estimates. Nonzero cells prove learning happened, not that the policy is strong; evaluation is a separate lesson.');
step('Write the training loop',
  'Create `train.hpp`. `unsigned` is a nonnegative integer type used for seeds. `% 2` alternates the starting player. When the opponent starts and wins without an agent move, no agent decision exists to update. `static_cast<double>` prevents integer division in the exploration schedule.\n\nA range-based `for` in the tests visits each element of a container, like Python `for row in table`. `const Row&` avoids row copies. The function returns the owned vector; C++ can move its storage instead of copying it. No manual allocation or `delete` is needed.\n\n' + predict('A debugging cutoff is reached with no winner. Should it become a loss reward?', 'No', 'Yes', 'A timeout is not a loss under the game rules. This implementation throws and aborts the run so no invented terminal update is made.'),
  'train.hpp', train,
  'We decay epsilon from 1 toward a floor of 0.05. For 100 episodes, halfway gives fraction 0.5 and epsilon 0.5; it is a simple teaching schedule, not a proven optimum. Use 50000 episodes for the final experiment. Tabular learning here needs no GPU.\n\nThe guard catches accidental infinite loops. It aborts instead of quietly biasing training. In a time-limited environment, you would explicitly distinguish termination from truncation and decide how to bootstrap. **Common error:** reset `q` inside the episode loop and the agent forgets every game. **Challenge:** log episode, epsilon and visited-cell count every 1000 episodes, using the terminal without changing random draws.',
  checks('test_train.cpp', 'test_train', 'training ok'), [mutation('train.hpp', 'update(q, g, action, t);', '// forgot to learn')]);
end();

const evaluate = `#ifndef DICE_EVALUATE_HPP
#define DICE_EVALUATE_HPP
#include "train.hpp"
inline double evaluate(const Table& q, unsigned seed, int games,
                       bool learned = true, int opponent_threshold = 4) {
    if (games <= 0) throw std::invalid_argument("positive games required");
    std::mt19937 dice(seed), choices(seed + 100000u);
    int wins = 0;
    for (int episode = 0; episode < games; ++episode) {
        Game g; g.turn = episode % 2;
        int decisions = 0;
        while (!finished(g)) {
            if (++decisions > 10000) throw std::runtime_error("evaluation guard");
            if (g.turn == 1) { opponent_turn(g, dice, opponent_threshold); continue; }
            Action action = learned ? choose(q, g, 0.0, choices) : fixed_action(g);
            apply(g, action, action == Action::Roll ? roll(dice) : 1);
        }
        wins += g.winner == 0;
    }
    return static_cast<double>(wins) / games;
}
#endif`;
const evalTests = `#include "evaluate.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = train(9, 3000), before = q;
    double rate = evaluate(q, 900009, 500);
    assert(rate >= 0.0 && rate <= 1.0 && q == before);
    assert(rate == evaluate(q, 900009, 500));
    double baseline = evaluate(q, 900009, 2000, false);
    assert(baseline > 0.4 && baseline < 0.6);
    bool rejected = false;
    try { evaluate(q, 1, 0); }
    catch (const std::invalid_argument&) { rejected = true; }
    assert(rejected);
    std::cout << "evaluation ok\\n";
}`;
const experiment = `#include "evaluate.hpp"
#include <iostream>
int main() {
    for (unsigned seed : {101u, 202u, 303u}) {
        Table q = train(seed, 50000);
        double baseline = evaluate(q, 900000u + seed, 2000, false);
        double learned = evaluate(q, 900000u + seed, 2000);
        double changed = evaluate(q, 950000u + seed, 2000, true, 7);
        double se = std::sqrt(learned * (1.0 - learned) / 2000.0);
        std::cout << "seed " << seed << " baseline " << baseline
                  << " learned " << learned << " approximate_se " << se
                  << " bank7 " << changed << '\\n';
    }
}`;
begin('10-evaluate-without-learning', '10 — Is it better, or just lucky?', 'A policy that wins 1200 of 2000 games has win rate 0.6. Its approximate sampling standard error is `sqrt(0.6 * 0.4 / 2000)`, about 0.011. **Outcome:** compare a frozen learner to a baseline on held-out randomness and disclose what that comparison cannot prove.\n\n`training seeds → frozen table → unseen evaluation seeds → baseline and uncertainty`');
testStep('test_eval.cpp', evalTests, 'Evaluation must leave every Q-cell unchanged. The symmetric fixed-versus-fixed matchup is a smoke test for a roughly balanced starting schedule, not a pass threshold for machine learning.');
step('Freeze learning and exploration',
  'Create `evaluate.hpp`. A `const Table&` enforces read-only evaluation through this interface. Epsilon zero removes exploratory actions, but equal best actions still use random tie-breaking. Alternate the starting player so first-move advantage does not masquerade as learning.\n\n' + predict('A learned policy wins during training with epsilon 0.5. Is that its greedy evaluation score?', 'No', 'Yes', 'Training includes exploratory actions and changes the table. Evaluation freezes both the table and the exploration setting.'),
  'evaluate.hpp', evaluate,
  'Procedure: 1. Freeze the table. 2. Use new seeds. 3. Alternate starters. 4. Count complete-game wins. 5. Compare to the fixed policy under the same evaluation protocol. The bank-at-7 opponent is a distribution shift; do not tune against its reported test scores and still call them held out.',
  checks('test_eval.cpp', 'test_eval', 'evaluation ok'), [mutation('evaluate.hpp', 'static_cast<double>(wins) / games', 'wins / games')]);
step('Run and report an experiment',
  'Create `experiment.cpp`. The range loop uses three independent training seeds. Build with the command below and run `./experiment`. Write down all printed rows, compiler version, episode count and opponent rule. There is no promised win percentage.\n\nThe standard error measures game-sampling variability for one frozen policy; it does not measure variation between training runs. Report that spread separately. Games alternate starters, so the pooled Bernoulli formula is an approximation; stratify by starter for a more careful analysis.',
  'experiment.cpp', experiment,
  'Interpretation task: compare learned minus baseline for every seed, rather than choosing the nicest run. A rough interval is rate plus/minus twice the printed standard error; it is not a rigorous interval for a difference between two policies. Shared seed numbers do not make trajectories identical because policies consume different numbers of dice.\n\n**Detect a bad claim:** “Our agent is optimal because it won one game.” Reject it: no optimality proof or reference solution was computed. **Transfer:** compare performance on bank-at-7, but do not claim competence against every human or self-play opponent. Tune on separate development seeds, then run untouched test seeds once.',
  compile('experiment.cpp', 'experiment') + '\nrun "./experiment" stdout="seed 303 baseline"', [mutation('experiment.cpp', '{101u, 202u, 303u}', '{101u, 202u}')]);
end();

const storage = `#ifndef DICE_STORAGE_HPP
#define DICE_STORAGE_HPP
#include "agent.hpp"
#include <fstream>
#include <iomanip>
inline void save_table(const Table& q, const std::string& path) {
    std::ofstream out(path);
    if (!out) throw std::runtime_error("cannot open model for writing");
    out << "DICE_Q_V1 " << TARGET << " 4 " << STATES << '\\n';
    out << std::setprecision(17);
    for (const Row& row : q) out << row[0] << ' ' << row[1] << '\\n';
    out.close();
    if (!out) throw std::runtime_error("model write failed");
}
inline Table load_table(const std::string& path) {
    std::ifstream in(path);
    std::string version;
    int target = 0, opponent = 0, states = 0;
    if (!(in >> version >> target >> opponent >> states) ||
        version != "DICE_Q_V1" || target != TARGET || opponent != 4 || states != STATES)
        throw std::runtime_error("incompatible model header");
    Table q = make_table();
    for (Row& row : q)
        for (double& value : row)
            if (!(in >> value) || !std::isfinite(value) || value < -1.0 || value > 1.0)
                throw std::runtime_error("invalid model value");
    std::string extra;
    if (in >> extra) throw std::runtime_error("extra model data");
    return q;
}
#endif`;
const storageTests = `#include "storage.hpp"
#include <cassert>
#include <iostream>
int main() {
    Table q = make_table(); q[17] = {0.123456789012345, -0.7};
    save_table(q, "test-model.txt");
    assert(load_table("test-model.txt") == q);
    for (const std::string text : {"wrong 12 4 1728", "DICE_Q_V1 12 4 1728\\n0 0",
                                   "DICE_Q_V1 12 4 1728\\n99 0"}) {
        { std::ofstream out("bad-model.txt"); out << text; }
        bool rejected = false;
        try { load_table("bad-model.txt"); }
        catch (const std::runtime_error&) { rejected = true; }
        assert(rejected);
    }
    { std::ofstream out("test-model.txt", std::ios::app); out << "garbage"; }
    bool rejected = false;
    try { load_table("test-model.txt"); }
    catch (const std::runtime_error&) { rejected = true; }
    assert(rejected);
    std::cout << "storage ok\\n";
}`;
begin('11-save-and-validate', '11 — A model that survives closing the terminal', 'A table trained for target 12 should not silently load into a target-20 game. **Outcome:** save full-precision values and reject incompatible, truncated or malformed model files.\n\n`table → versioned text file → validated temporary table → returned model`');
testStep('test_storage.cpp', storageTests, 'The tests type deliberately bad files too. They check exact round-trip values, a wrong header, a truncated model, out-of-range values and trailing garbage.');
step('Use scope to own a file',
  'Create `storage.hpp`. `std::ofstream` opens an output file; `std::ifstream` opens input. Their destructors close resources when scope ends: this is RAII, resource acquisition is initialization. The braces in the test close a file before reading it. We explicitly close the writer in `save_table` so a final flush failure can be reported.\n\n`>>` extracts whitespace-separated fields; a failed extraction makes the stream test false. `std::setprecision(17)` retains enough significant decimal digits to round-trip a double. The model version names our exact rules and encoding; change it if either changes. The header also records the target, fixed training opponent and row count.\n\n' + predict('Can a half-written model safely become the live Q-table?', 'No', 'Yes', 'Load into a new local table, validate every value, then return it only after success.'),
  'storage.hpp', storage,
  'The [-1,1] validation matches our gamma-1 win/loss rewards, zero initialization and convex updates. A different reward scale needs a different format contract. Never silently treat a failed load as a trained model. **Limit:** saving directly can truncate an existing file on a failed write; choose a new filename to preserve an experiment. Atomic replacement is a useful later extension. **Challenge:** add a training-seed field under a new format version and test rejection of the old version.',
  checks('test_storage.cpp', 'test_storage', 'storage ok'), [mutation('storage.hpp', 'std::setprecision(17)', 'std::setprecision(6)'), mutation('storage.hpp', 'if (in >> extra)', 'if (false)')]);
end();

const trainMain = `#include "train.hpp"
#include "storage.hpp"
#include <iostream>
int main() {
    try {
        Table q = train(101, 50000);
        save_table(q, "dice-q.txt");
        std::cout << "Saved dice-q.txt\\n";
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\\n'; return 1;
    }
}`;
const finalPlay = `#include "storage.hpp"
#include <iostream>
int main() {
    try {
        const Table q = load_table("dice-q.txt");
        Game g; g.turn = 1;
        std::mt19937 dice(std::random_device{}()), choices(123);
        while (!finished(g)) {
            std::cout << "Agent " << g.score[0] << " You " << g.score[1]
                      << " pot " << g.pot << " turn " << g.turn << '\\n';
            Action action = Action::Roll;
            if (g.turn == 1) {
                std::cout << "r=roll b=bank q=quit: ";
                std::string line;
                if (!std::getline(std::cin, line) || line == "q") {
                    std::cout << "Goodbye\\n"; return 0;
                }
                if (!parse_action(line, action) || !legal(g, action)) {
                    std::cout << "Invalid move\\n"; continue;
                }
            } else {
                const Row& row = q.at(state_id(g));
                std::cout << "Q roll " << row[0];
                if (g.pot > 0) std::cout << " bank " << row[1];
                std::cout << '\\n';
                action = choose(q, g, 0.0, choices);
            }
            int face = action == Action::Roll ? roll(dice) : 1;
            std::cout << (action == Action::Roll ? "roll " : "bank ")
                      << (action == Action::Roll ? face : g.pot) << '\\n';
            apply(g, action, face);
        }
        std::cout << (g.winner == 0 ? "Agent wins\\n" : "You win\\n");
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\\n'; return 1;
    }
}`;
begin('12-play-a-learned-opponent', '12 — Play against what you trained', 'You now have separate rules, a terminal interface, a learning algorithm, evaluation and storage. **Outcome:** train a saved opponent and play it with visible action values, without retraining during a match.\n\n`trainer → dice-q.txt → frozen agent + human input → shared rules`', 'duel.cpp');
step('Train a model file',
  'Create `learn.cpp`. `std::exception` is the common base of our standard exceptions. `error.what()` describes the failure. `std::cerr` prints an error stream; return 1 signals failure to the shell and automated checks. Run this before compiling the final duel. It overwrites `dice-q.txt`; rename an earlier experiment first if you want to keep it.',
  'learn.cpp', trainMain,
  'Compile and run using the checks below. A saved file proves the workflow completed, not that it beats a human. The preceding evaluation lesson is how you assess it.',
  checks('learn.cpp', 'learn', 'Saved dice-q.txt') + '\nfile dice-q.txt', [mutation('learn.cpp', 'save_table(q, "dice-q.txt");', 'throw std::runtime_error("save failed");')]);
step('Play and inspect the agent',
  'Create `duel.cpp`. Human is now player 1, agent is player 0, matching training. The human starts. `std::random_device{}()` seeds varied live dice; tests keep deterministic seeds. It is not used as a cryptographic guarantee. The learned table is `const`; no update function is called while playing.\n\n' + predict('The model learned against bank-at-4. Must its displayed values be accurate against your strategy?', 'No', 'Yes', 'A human can change the opponent distribution. Values are estimates for the training environment, not universal win probabilities.'),
  'duel.cpp', finalPlay,
  fence('text', 'g++ -std=c++20 -Wall -Wextra -pedantic duel.cpp -o duel\n./duel') + '\nPlay in the terminal, then explain one agent move from its displayed values. At pot zero only roll is legal; the interface omits the bank value. For a reproducible bug report replace the live seed with 42, record inputs, and rebuild.\n\n**Mastery check:** explain value versus reference using `agent_step` and `apply`; trace a bust; calculate a terminal update; distinguish a training score from evaluation; identify why playing a human is a distribution shift. If you cannot, revisit that lesson before adding graphics.\n\n**Capstone, without copying:** add a bank-at-6 opponent experiment and write an honest comparison across fresh seeds. Then add a terminal replay mode that accepts recorded faces and actions. Replays must pass through `apply` and reject illegal moves. Keep model-format changes explicit.\n\n**Next project: SDL3.** Build a small graphical dice/card game after this course: window lifetime with RAII, event handling, drawing scores/dice, a nonblocking input/update/render loop, then reuse these tested rules and frozen policy. SDL is a multimedia library, not the game rules. Never run the full training loop inside a render frame. SDL lessons are planned, not implemented here. [SDL3 documentation](https://wiki.libsdl.org/SDL3/FrontPage). For the learning algorithm, consult Sutton and Barto, *Reinforcement Learning: An Introduction*, section 6.5, [the authors\' book site](http://incompleteideas.net/book/the-book-2nd.html).',
  compile('duel.cpp', 'duel') + '\nrun "./duel" stdin="b\\nnonsense\\nq\\n" stdout="Invalid move" without="turn 0"\nrun "./duel" stdin="q\\n" stdout="Goodbye"',
  [mutation('duel.cpp', '!legal(g, action)', 'false', [1]), mutation('duel.cpp', '"Goodbye\\n"', '"bye\\n"', [2])]);
end();

fs.writeFileSync('src/labs/project-studio/tracks/dice-cpp.walkthrough.js', '// Generated by scripts/author-dice-course.mjs. Wrong answers must fail real learner checks.\nexport const WALKTHROUGH = ' + JSON.stringify(walkthrough, null, 2) + ';\n');
fs.writeFileSync('src/labs/project-studio/diceCpp.desktop.test.js', `import { walkCppTrack } from './walkCppTrack.js';\nimport { WALKTHROUGH } from './tracks/dice-cpp.walkthrough.js';\n\nawait walkCppTrack({\n  trackKey: 'dice-cpp',\n  title: 'C++ Dice Duel for Python developers',\n  walkthrough: WALKTHROUGH,\n  lessonIds: ${JSON.stringify(ids)},\n});\n`);
console.log('Wrote Dice Duel lessons and compiled walkthrough fixtures.');
