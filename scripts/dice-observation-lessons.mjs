import fs from 'node:fs';
import { parseLesson } from '../src/labs/project-studio/parseTrack.js';
import { addressPreparation, tablePreparation } from './dice-teaching-repairs.mjs';

// Independent outcomes and author-only answers precede the teaching sequence.
// Decode checks include unseen addresses and all admitted rows, not just 328.
const decodeAnswer = `#include <iostream>
#include "learning/Observation.hpp"
int main() {
    int address = 0;
    if (!(std::cin >> address) || address < 0 || address >= 1728) return 1;
    learning::Observation found{address / 144, (address / 12) % 12, address % 12};
    if (found.own + found.pot >= 12) return 1;
    if (learning::rowIndex(found) != address) return 2;
    std::cout << "own=" << found.own << " other=" << found.other << " pot=" << found.pot << '\\n';
    for (int own = 0; own < 12; ++own) {
        for (int other = 0; other < 12; ++other) {
            for (int pot = 0; pot < 12 - own; ++pot) {
                int row = learning::rowIndex({own, other, pot});
                if (row / 144 != own || (row / 12) % 12 != other || row % 12 != pot) return 3;
            }
        }
    }
    return 0;
}`;

const tableAnswer = `#include <iostream>
#include <stdexcept>
#include "learning/QAgent.hpp"
int main() {
    learning::QAgent agent;
    for (int own = 0; own < 12; ++own)
        for (int other = 0; other < 12; ++other)
            for (int pot = 0; pot < 12 - own; ++pot)
                for (dice::Action action : {dice::Action::Roll, dice::Action::Bank})
                    if (agent.value({own, other, pot}, action) != 0.0) return 1;
    learning::Observation first{3, 5, 2};
    agent.store(first, dice::Action::Roll, -0.5);
    agent.store(first, dice::Action::Bank, 0.25);
    if (agent.value(first, dice::Action::Roll) != -0.5 || agent.value(first, dice::Action::Bank) != 0.25) return 2;
    if (agent.value({3, 5, 3}, dice::Action::Roll) != 0.0 || agent.value({3, 6, 2}, dice::Action::Bank) != 0.0) return 3;
    learning::QAgent copy = agent;
    copy.store(first, dice::Action::Roll, 0.75);
    if (agent.value(first, dice::Action::Roll) != -0.5) return 4;
    dice::Game game;
    agent.store({0, 0, 0}, dice::Action::Roll, -0.5);
    agent.store({0, 0, 0}, dice::Action::Bank, 0.75);
    if (agent.bestValue(game) != -0.5) return 5;
    game.apply(dice::Action::Roll, 2);
    agent.store({0, 0, 2}, dice::Action::Roll, -0.5);
    agent.store({0, 0, 2}, dice::Action::Bank, -0.25);
    if (agent.bestValue(game) != -0.25) return 6;
    agent.store({0, 0, 2}, dice::Action::Roll, 0.5);
    if (agent.bestValue(game) != 0.5) return 7;
    bool rejected = false;
    try { agent.store({12, 0, 0}, dice::Action::Roll, 0.25); }
    catch (const std::invalid_argument&) { rejected = true; }
    if (!rejected || agent.value(first, dice::Action::Roll) != -0.5) return 8;
    game.apply(dice::Action::Bank, 0);
    rejected = false;
    try { agent.bestValue(game); }
    catch (const std::invalid_argument&) { rejected = true; }
    if (!rejected) return 9;
    dice::Game won;
    won.apply(dice::Action::Roll, 6);
    won.apply(dice::Action::Roll, 6);
    rejected = false;
    try { agent.bestValue(won); }
    catch (const std::invalid_argument&) { rejected = true; }
    if (!rejected) return 10;
    std::cout << "storage passed\\n";
    return 0;
}`;

export function observationLessons({lesson, step, predict, end}) {
  const cmd = (text, opts = '') => `run ${JSON.stringify(text)}${opts ? ' ' + opts : ''}`;
  const flags = 'g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude';
  const compile = (entry, output = 'observation_probe', extra = '') => `${flags} ${entry} src/dice/Game.cpp src/learning/Observation.cpp ${extra} -o ${output}`;
  const runProbe = (output) => cmd(compile('explore/observation_probe.cpp')) + '\n' + cmd('./observation_probe', `stdout=${JSON.stringify(output)}`);
  const hints = (a,b,c) => `\n\n\`\`\`hints\nnudge: ${a}\nconcept: ${b}\nshape: ${c}\n\`\`\``;
  let header = '#ifndef LEARNING_OBSERVATION_HPP\n#define LEARNING_OBSERVATION_HPP\n#include "dice/Game.hpp"\nnamespace learning {\nstruct Observation {\n    int own = 0;\n    int other = 0;\n    int pot = 0;\n};\nObservation observe(const dice::Game& game);\n}\n#endif';
  const observe = '#include "learning/Observation.hpp"\n#include <stdexcept>\nlearning::Observation learning::observe(const dice::Game& game) {\n    dice::GameSnapshot view = game.snapshot();\n    if (game.finished() || view.turn != 0)\n        throw std::invalid_argument("expected an unfinished seat-zero decision");\n    return {view.scores.at(0), view.scores.at(1), view.pot};\n}\n';
  const index = 'int learning::rowIndex(const Observation& seen) {\n    if (seen.own < 0 || seen.own >= dice::target ||\n        seen.other < 0 || seen.other >= dice::target ||\n        seen.pot < 0 || seen.pot >= dice::target ||\n        seen.own + seen.pot >= dice::target)\n        throw std::invalid_argument("invalid decision observation");\n    return (seen.own * dice::target + seen.other) * dice::target + seen.pot;\n}\n';
  const source = observe + index;
  lesson('22-observation-addresses', 'A22 — Give each observation its own address',
    'With banked scores two and three and pot four, the agent needs estimates for this particular situation. A pot of four alone is not enough: being two points from victory differs from being ten points away. Keep the same learner folder from A21b. We will first describe the decision, then give it a unique place in a table. No training happens in this lesson.');
  step('Choose what the agent observes',
    'An **observation** is the information given to the agent when it chooses. Ours contains own banked score, other banked score and pot, in that order. The agent is still seat zero; own does not mean whichever seat happens to be taking a turn. We accept only unfinished seat-zero decision boundaries from A21b.\n\n'+predict('Two positions have the same pot but different opponent scores. Should they share a row?', 'No', 'Yes', 'The opponent may be one roll from victory in only one position. The same pot does not describe the same decision.'), null, null,
    'Under our fixed rules, independent fair-die model and fixed opponent policy, these numbers describe the situation needed for future decisions. We omit turn because the entry contract fixes it to zero, and winner because finished games have no next choice. A terminal result still has a reward; it does not need an observation for another action. Changing the rules, opponent or agent seat requires reviewing this representation.');
  step('Name the three coordinates',
    'Create include/learning/Observation.hpp. A coordinate is one component of the address we will construct. The struct holds ordinary value members, as in A07. observe borrows a Game and returns a separate description; it cannot change the game.', 'include/learning/Observation.hpp', header,
    'The declaration is a promise, not a runnable implementation. Next define it and build a caller.', 'file include/learning/Observation.hpp');
  step('Enforce the decision boundary before extracting values',
    'Create src/learning/Observation.cpp. First copy the snapshot; then reject finished or opponent-turn games. The return braces initialize own, other and pot in declaration order. Do not silently swap scores on an opponent turn: that would change which agent these estimates describe.', 'src/learning/Observation.cpp', observe,
    'Compile this source to an object now. A complete runnable observation follows in the next step.', cmd(`${flags} -c src/learning/Observation.cpp -o observation.o`));
  let probe = '#include <iostream>\n#include "learning/Observation.hpp"\nint main() {\n    dice::Game game;\n    game.apply(dice::Action::Roll, 2);\n    game.apply(dice::Action::Bank, 0);\n    game.apply(dice::Action::Roll, 3);\n    game.apply(dice::Action::Bank, 0);\n    game.apply(dice::Action::Roll, 4);\n    learning::Observation seen = learning::observe(game);\n    std::cout << seen.own << "," << seen.other << "," << seen.pot << \'\\n\';\n    return 0;\n}';
  step('Reach a real position through the game rules',
    'Create explore/observation_probe.cpp. Bank two for seat zero, bank three for seat one, then roll four for seat zero. This deliberately uses apply rather than assigning private state. Trace which seat acts at each line before compiling.', 'explore/observation_probe.cpp', probe,
    'Run the two check commands below yourself. Expect 2,3,4. The commas describe separate fields, not one large number. Changing the returned observation cannot change game.', runProbe('2,3,4'));
  step('Count slots before writing a formula',
    'Reserve twelve pot slots for each score pair. For own=0, other=0, pots 0 through 11 occupy addresses 0 through 11. The next opponent score starts at 12. Twelve opponent-score groups occupy 144 slots before own advances. An **index encoding** converts these coordinates to one integer address.\n\n| Position | Calculation | Address |\n|---|---|---|\n| 0,0,0 | (0 × 12 + 0) × 12 + 0 | 0 |\n| 0,1,0 | (0 × 12 + 1) × 12 + 0 | 12 |\n| 1,0,0 | (1 × 12 + 0) × 12 + 0 | 144 |\n| 2,3,4 | (2 × 12 + 3) × 12 + 4 | 328 |', null, null,
    'Procedure: validate the coordinates, count complete own-score groups, count complete opponent-score groups, then add the pot offset. The general expression is (own × 12 + other) × 12 + pot. A **collision** means different admitted observations receive the same address. Simply adding the fields collides: 2,3,4 and 3,2,4 would share nine.\n\nThe rectangular storage reserves 12 × 12 × 12 slots. Some are unused: own=11, pot=1 would already have won. We reject own+pot at least twelve even when the address fits. A reserved slot is not proof of a valid decision. This table is tied to the game’s fixed target twelve.');
  header = header.replace('Observation observe', 'int rowIndex(const Observation& seen);\nObservation observe');
  step('Declare checked addressing', 'Add rowIndex inside the learning namespace in include/learning/Observation.hpp. It borrows the coordinates and returns an int address; no table is allocated yet.', 'include/learning/Observation.hpp', header,
    'The previous caller still builds because it does not yet call this new declaration.', runProbe('2,3,4'));
  step('Validate before computing an address',
    'Append rowIndex to src/learning/Observation.cpp. First require each coordinate in 0..11, then reject already-winning own+pot. The || operator stops once a condition is true, so the bounded addition happens only after coordinate checks pass. dice::target is the existing fixed constant from Game.hpp.', 'src/learning/Observation.cpp', source,
    'Compile and run the old probe again. The implementation exists, but the old caller has not exercised indexing yet.', runProbe('2,3,4'));
  probe = probe.replace('    return 0;', '    std::cout << "row=" << learning::rowIndex(seen) << \'\\n\';\n    return 0;');
  step('Observe the address of the real position', 'Add the rowIndex call after printing the three fields. Predict what changing only the pot by one would do to the address, provided the game is still unfinished.', 'explore/observation_probe.cpp', probe,
    'Expect row=328. A pot increment adds one; an opponent-score increment adds twelve; an own-score increment adds 144. These different strides prevent field boundaries from overlapping.', runProbe('2,3,4\nrow=328'));
  const rejectionProbe = '#include <iostream>\n#include <stdexcept>\n#include "learning/Observation.hpp"\nint main() {\n    dice::Game game;\n    game.apply(dice::Action::Roll, 1);\n    try { learning::observe(game); return 1; }\n    catch (const std::invalid_argument&) { std::cout << "boundary rejected\\n"; }\n    for (learning::Observation bad : {learning::Observation{-1,0,0}, {0,12,0}, {0,0,12}, {11,0,1}}) {\n        try { learning::rowIndex(bad); return 2; }\n        catch (const std::invalid_argument&) {}\n    }\n    std::cout << "coordinates rejected\\n";\n    return 0;\n}';
  step('Observe failures without reading outside a container',
    'Create explore/observation_errors.cpp. A bust puts the game on seat one. The first try must reject that boundary. The list of bad observations then tests negative, upper-bound and already-winning coordinates. The first explicit Observation names the list element type; later braces initialize more values of that same type. The empty catch body means the expected rejection needs no further work.', 'explore/observation_errors.cpp', rejectionProbe,
    'Each return inside try reports that an expected exception did not happen. Run the checks: expect both rejection messages. No out-of-bounds memory access is performed.', cmd(compile('explore/observation_errors.cpp', 'observation_errors'))+'\n'+cmd('./observation_errors','stdout="boundary rejected\\ncoordinates rejected"'));
  step('Try it — Separate a boundary failure from a coordinate failure',
    'In observation_errors.cpp replace the bust with two rolls of six. observe must reject the finished game too. Then replace the bad-coordinate list with {11,11,0}: it is an admitted observation, so this rejection test should return 2. Explain why that failure means the test expectation is now wrong. Restore the file. In the working probe temporarily misspell rowIndex as rowindex, compile and read the named symbol in the diagnostic; restore its capitalization and rebuild.');
  addressPreparation({step,predict}, {cmd,flags,hints});
  const decodeBuild = compile('practice/decode_observation.cpp', 'decode_observation');
  const decodeCases = [ ['328\n','own=2 other=3 pot=4'], ['0\n','own=0 other=0 pot=0'], ['1716\n','own=11 other=11 pot=0'], ['143\n','own=0 other=11 pot=11'], ['12\n','own=0 other=1 pot=0'] ];
  const decodeChecks = [cmd(decodeBuild), ...decodeCases.map(([input,out]) => cmd('./decode_observation',`stdin=${JSON.stringify(input)} stdout=${JSON.stringify(out)} without=${JSON.stringify(decodeCases.find(c=>c[1]!==out)[1])}`)), ...['-1\n','1728\n','1717\n','word\n'].map(input=>cmd('./decode_observation',`stdin=${JSON.stringify(input)} exit=1`))];
  step('Your turn — Recover coordinates and rule out collisions',
    'Create practice/decode_observation.cpp with no supplied body. Read one integer address. Reject failed extraction, addresses outside 0..1727 and decoded own+pot at least twelve with exit 1. Otherwise print the three coordinates exactly as below and verify rowIndex recovers the original address.\n\nReuse the quotient/remainder experiments, locker task and nested round-trip trace. Work out the two group widths from the game coordinates; design the inverse yourself before opening a hint.\n\n| Input | Output or exit |\n|---|---|\n| 328 | own=2 other=3 pot=4 |\n| 0 | own=0 other=0 pot=0 |\n| 1716 | own=11 other=11 pot=0 |\n| 143 | own=0 other=11 pot=11 |\n| -1, 1728, 1717, word (separate runs) | exit 1 |\n\nBefore success, loop over every own and other from zero through eleven and every pot below twelve minus own. Encode each triple, decode it, and return nonzero if any recovered field differs. This is a round-trip check, not a printed example list.\n\n```text\n'+decodeBuild+'\n./decode_observation\n```'+hints('Start by asking how many complete groups of 144 fit.', 'Remove the own-score group, then separate opponent groups from pot remainder.', 'Use integer / for a group count and % to remove complete groups. Nest three loops for the exhaustive check.'), null, null,
    'With the example hidden, decode address 697 and explain each field. Explain why a correct inverse prevents collisions: a single address cannot decode to two different original triples. Temporarily remove other from rowIndex; your exhaustive check must fail even when input is zero. Restore the source. A reviewer must inspect that loop; output checks alone cannot prove exhaustive coverage. If stuck, revisit A07 indexing and A02 integer division.', decodeChecks.join('\n'),
    {files:{'practice/decode_observation.cpp':decodeAnswer},wrong:[
      {name:'swaps decoded players', files:{'practice/decode_observation.cpp':decodeAnswer.replace('address / 144, (address / 12) % 12', '(address / 12) % 12, address / 144')},fails:[1]},
      {name:'admits reserved winning rows', files:{'practice/decode_observation.cpp':decodeAnswer.replace('    if (found.own + found.pot >= 12) return 1;', '').replace('    if (learning::rowIndex(found) != address) return 2;', '')},fails:[8]},
      {name:'colliding encoder caught by exhaustive inverse',files:{'practice/decode_observation.cpp':decodeAnswer,'src/learning/Observation.cpp':source.replace('+ seen.other)', '+ 0)')},fails:[2]},
      {name:'prints all examples',files:{'practice/decode_observation.cpp':'#include <iostream>\nint main() { std::cout << "own=2 other=3 pot=4\\nown=0 other=0 pot=0\\n"; }'},fails:[1]},
    ]});
  end();
  storageLesson({lesson,step,predict,end}, {cmd,flags,compile,hints});
}

function storageLesson({lesson,step,predict,end},{cmd,flags,compile,hints}) {
  const build = entry => compile(entry, 'q_probe', 'src/learning/QAgent.cpp');
  const check = (out) => cmd(build('explore/q_probe.cpp'))+'\n'+cmd('./q_probe',`stdout=${JSON.stringify(out)}`);
  let header = '#ifndef LEARNING_QAGENT_HPP\n#define LEARNING_QAGENT_HPP\n#include <array>\n#include <vector>\n#include "learning/Observation.hpp"\nnamespace learning {\nusing QRow = std::array<double, 2>;\nclass QAgent {\nprivate:\n    std::vector<QRow> rows_;\npublic:\n    QAgent();\n    double value(const Observation& seen, dice::Action action) const;\n};\n}\n#endif';
  let source = '#include "learning/QAgent.hpp"\n#include <stdexcept>\nnamespace {\nint column(dice::Action action) {\n    if (action == dice::Action::Roll) return 0;\n    if (action == dice::Action::Bank) return 1;\n    throw std::invalid_argument("unknown action");\n}\n}\nlearning::QAgent::QAgent() : rows_(dice::target * dice::target * dice::target, QRow{0.0, 0.0}) {}\ndouble learning::QAgent::value(const Observation& seen, dice::Action action) const {\n    return rows_.at(rowIndex(seen)).at(column(action));\n}\n';
  lesson('22b-action-value-storage', 'A22b — Store separate estimates for Roll and Bank',
    'At observation 2,3,4, imagine an estimate of -0.5 for Roll and 0.25 for Bank. Those are deliberately assigned demonstration values, not results of training. We want two cells in row 328, with all neighboring rows unchanged. A Q-value, or action value, estimates future accumulated reward for one observation and first action under the learning formulation. It is neither the current pot nor an immediate die average.');
  step('Give the two numbers a meaning',
    'With our terminal rewards and no discount yet, the return (accumulated reward over the remaining episode) is +1 for a win or -1 for a loss. Its expected value is probability of winning minus probability of losing when episodes finish. An estimate of 0.25 is therefore not a 25% win probability. Future lessons teach the correction rule and discounting. Here we only store numbers and inspect legal candidates.\n\n'+predict('An unvisited cell begins at zero. Does that prove its action wins half the matches?', 'No', 'Yes', 'Zero is our initialization choice, not measured evidence.'), null, null,
    '| Row | Roll, column 0 | Bank, column 1 |\n|---|---|---|\n| 328: own 2, other 3, pot 4 | -0.5 | 0.25 |\n| 329: own 2, other 3, pot 5 | 0 | 0 |\n\nThe **table** is a collection of rows; each row holds one estimate per named action. These columns do not make actions legal. At pot zero, Bank still has a reserved cell but Game rejects that action.');
  let tiny = '#include <array>\n#include <iostream>\nusing QRow = std::array<double, 2>;\nint main() {\n    QRow row{0.0, 0.0};\n    QRow copy = row;\n    copy.at(0) = -0.5;\n    std::cout << "original=" << row.at(0) << " copy=" << copy.at(0) << \'\\n\';\n    return 0;\n}';
  const tinyChecks = out=>cmd(`${flags} explore/q_row.cpp -o q_row`)+'\n'+cmd('./q_row',`stdout=${JSON.stringify(out)}`);
  step('Name a concrete row type and copy it',
    'Create explore/q_row.cpp. The using declaration gives an existing type another name: QRow means exactly std::array<double, 2>. It creates no object. The template arguments between angle brackets supply the element type double and fixed size two. The two braces initialize the two cells. copy is a distinct array.', 'explore/q_row.cpp', tiny,
    'Run the checks. Expect original=0 copy=-0.5. Writing a copied row would silently lose a table update. This is the A06 copy experiment with an entire row.',tinyChecks('original=0 copy=-0.5'));
  tiny = tiny.replace('    QRow copy', '    QRow& copy');
  step('Use a reference when the stored row must change',
    'Add & to the declaration in explore/q_row.cpp. Despite the old name copy, the variable now aliases row. Predict both printed values before running; then explain why naming a variable copy does not decide its storage behavior.', 'explore/q_row.cpp', tiny,
    'Expect original=-0.5 copy=-0.5. The method that writes our table will need a reference; the public query will return a number by value.', tinyChecks('original=-0.5 copy=-0.5'));
  tablePreparation({step,predict}, {cmd,flags});
  step('Give the table one owner',
    'Create include/learning/QAgent.hpp. std::vector<QRow> holds rows whose element type is our array alias. It is a nested container: choose a row, then a column. QAgent owns the vector as a private member and will initialize it in its constructor. value is a const query returning a double copy.', 'include/learning/QAgent.hpp', header,
    'Ownership: each QAgent owns its vector, which owns its row values. Ordinary member destruction releases that storage automatically. Copying a QAgent copies its rows independently. A local reference used during a method call borrows one row; none escapes through this interface. The vector will not resize in this lesson.', 'file include/learning/QAgent.hpp');
  const constructorOnly = '#include "learning/QAgent.hpp"\nlearning::QAgent::QAgent() : rows_(dice::target * dice::target * dice::target, QRow{0.0, 0.0}) {}\n';
  step('Initialize all rows and read one checked cell',
    'First create src/learning/QAgent.cpp with only the constructor. The colon initializes rows_ before the empty constructor body runs, revisiting A11. Its count-and-value arguments are the same as the three-row experiment; the count is now the product of the three coordinate widths.', 'src/learning/QAgent.cpp', constructorOnly,
    'This is the construction half of the milestone. Compile to an object. value is declared but not defined yet, so do not link a caller that uses it until the next step.', cmd(`${flags} -c src/learning/QAgent.cpp -o q_agent.o`));
  step('Combine the already-tested row and column selections {#checked-query-integration}',
    'Add the source-local column helper from the action experiment, then define value below the constructor. Read rows_.at(rowIndex(seen)).at(column(action)) from left to right: compute the validated address, select its row, translate the action, then select its cell.', 'src/learning/QAgent.cpp', source,
    'Each operation has now run separately. The const method returns a double copy. Compile this definition, then use the next caller to observe both initialized values together.', cmd(`${flags} -c src/learning/QAgent.cpp -o q_agent.o`));
  let probe = '#include <iostream>\n#include "learning/QAgent.hpp"\nint main() {\n    learning::QAgent agent;\n    learning::Observation seen{2, 3, 4};\n    std::cout << "roll=" << agent.value(seen, dice::Action::Roll) << \'\\n\';\n    std::cout << "bank=" << agent.value(seen, dice::Action::Bank) << \'\\n\';\n    return 0;\n}';
  step('Observe initial estimates', 'Create explore/q_probe.cpp. Query both columns of the same observation. The two zeros mean no experience has been written; no simulation ran during construction.', 'explore/q_probe.cpp', probe,
    'Compile and run with the checks below. Expect roll=0 and bank=0.', check('roll=0\nbank=0'));
  header = header.replace('    QAgent();', '    QAgent();\n    void store(const Observation& seen, dice::Action action, double estimate);');
  step('Declare a deliberate storage operation',
    'Add store to QAgent’s public declarations. This is an explicit write operation for experiments and the later learning code, not an automatic learning algorithm. For now the caller supplies a finite numeric estimate; there is no model-file loader or arbitrary numeric input here. Observation and action validation must happen before mutation.', 'include/learning/QAgent.hpp', header,
    'The existing read-only probe remains runnable. A play caller will use const queries; it cannot mutate through their returned values.', check('roll=0\nbank=0'));
  const store = 'void learning::QAgent::store(const Observation& seen, dice::Action action, double estimate) {\n    QRow& row = rows_.at(rowIndex(seen));\n    row.at(column(action)) = estimate;\n}\n';
  source += store;
  step('Write the actual row instead of a temporary copy',
    'Append store in src/learning/QAgent.cpp. QRow& row refers to the selected stored array, just as the tiny experiment did. column validates the action before the assignment. Rejected coordinates or actions therefore leave all cells unchanged.', 'src/learning/QAgent.cpp', source,
    'Rebuild the existing probe. It still prints zeros because it has not called store yet. Merely defining an operation does not invoke it.', check('roll=0\nbank=0'));
  probe = probe.replace('    std::cout << "roll=', '    agent.store(seen, dice::Action::Roll, -0.5);\n    agent.store(seen, dice::Action::Bank, 0.25);\n    std::cout << "roll=');
  probe = probe.replace('    return 0;', '    std::cout << "neighbor=" << agent.value({2, 3, 5}, dice::Action::Roll) << \'\\n\';\n    return 0;');
  step('Observe separate actions and a preserved neighbor',
    'Add two stores before the reads and one neighboring-row query afterwards. The braced observation in value constructs a temporary Observation for the read-only call. It lives long enough for that call; the query retains no reference.', 'explore/q_probe.cpp', probe,
    'Expect roll=-0.5, bank=0.25 and neighbor=0. No correction, reward or training occurs: store replaces exactly the selected number.',check('roll=-0.5\nbank=0.25\nneighbor=0'));
  header = header.replace('    QAgent();', '    QAgent();\n    double bestValue(const dice::Game& game) const;');
  step('Ask for the best legal estimate',
    'Declare bestValue in QAgent.hpp. A maximum is the largest candidate value. This query accepts the real Game so legality still comes from Game::legal. It returns a value, not a chosen action; tie-breaking and exploration belong to A23.', 'include/learning/QAgent.hpp', header,
    'No caller uses bestValue yet. Keep the storage probe passing while adding this interface.',check('roll=-0.5\nbank=0.25\nneighbor=0'));
  const best = 'double learning::QAgent::bestValue(const dice::Game& game) const {\n    Observation seen = observe(game);\n    double best = value(seen, dice::Action::Roll);\n    if (game.legal(dice::Action::Bank)) {\n        double bank = value(seen, dice::Action::Bank);\n        if (bank > best) best = bank;\n    }\n    return best;\n}\n';
  source += best;
  step('Start from a legal candidate, even if it is negative',
    'Append bestValue. observe rejects finished and opponent-turn games. Roll is always legal at the remaining unfinished agent decisions. Start best at its stored value, then consider Bank only when Game says it is legal. Starting best at zero would invent a candidate when both real estimates are negative.', 'src/learning/QAgent.cpp', source,
    'Keep the storage probe passing. The next step will specifically exercise legality; reading arbitrary cells in a diagnostic is not permission to play their actions.',check('roll=-0.5\nbank=0.25\nneighbor=0'));
  probe = probe.replace('    return 0;', '    dice::Game game;\n    agent.store({0, 0, 0}, dice::Action::Roll, -0.5);\n    agent.store({0, 0, 0}, dice::Action::Bank, 0.75);\n    std::cout << "legal best=" << agent.bestValue(game) << \'\\n\';\n    return 0;');
  step('Make an illegal cell tempting on purpose',
    'Add a new Game and demonstration values for its row. Its pot is empty. Before running, predict whether legal best prints -0.5, zero or 0.75, and justify which candidates exist.', 'explore/q_probe.cpp', probe,
    '| Candidate | Stored estimate | Legal now? | Included? |\n|---|---|---|---|\n| Roll | -0.5 | yes | yes |\n| Bank | 0.75 | no, empty pot | no |\n\nExpect legal best=-0.5. An unused cell can contain a high number without creating a legal action.',check('legal best=-0.5'));
  step('Try it — Find the copied-row and invented-zero bugs',
    'Temporarily remove & in store, rebuild, and run q_probe. Explain why the written estimates disappear even though compilation succeeds. Restore it. Next start best at 0.0 instead of the Roll estimate: the empty-pot probe must expose the invented candidate. Restore it. Finally try assigning to agent.value(seen, dice::Action::Roll). Read the compiler diagnostic: the returned double is a value, not writable access to the stored cell. Remove the assignment and rebuild.');
  const testBuild = build('tests/q_storage.cpp');
  step('Your turn — Audit storage through its public interface',
    'Create tests/q_storage.cpp independently; no body is supplied. Return nonzero at the first mismatch and print storage passed only after all cases pass. Use the public methods; do not expose rows_.\n\n| Case | Required evidence |\n|---|---|\n| Fresh agent | both columns zero for every admitted observation |\n| Store Roll=-0.5, Bank=0.25 at 3,5,2 | both values retained; rows 3,5,3 and 3,6,2 unchanged |\n| Copy agent, write 0.75 in the copy | original Roll remains -0.5 |\n| New Game, Roll=-0.5, illegal Bank=0.75 | bestValue is -0.5 |\n| After Roll 2, estimates -0.5 and -0.25 | bestValue is -0.25, not zero |\n| Raise that Roll estimate to 0.5 | bestValue is 0.5 |\n| Store with own=12 | invalid_argument; existing values unchanged |\n| Query opponent turn, then a finished match | each throws invalid_argument |\n\nThese halves and quarters are exactly representable in binary, so direct equality suffices for this storage test. Later computed updates will need a tolerance. The test accepts no terminal input.\n\n```text\n'+testBuild+'\n./q_probe\n```'+hints('Separate zero initialization, writes, copies, legality and rejection.', 'Build game positions through apply. A new game has only Roll; a roll of two admits Bank.', 'Reuse the three-coordinate loops from A22, then explicit comparisons and rejection flags from A21. Observe the original after mutating a copy.'), null, null,
    'Test your tests: remove & from store, remove the Bank legality guard, and start best at zero, one defect at a time. Each must fail. Restore each before proceeding. Also explain the row/column selection with a different triple and why a const double-returning query does not expose table storage. Recover with q_row.cpp if copy and reference behavior is unclear. Automated checks do not grade that explanation.',
    cmd(testBuild)+'\n'+cmd('./q_probe','stdout="storage passed"')+'\n'+cmd(compile('tests/q_storage.cpp','missing_q'),'exit=1')+'\n'+check('legal best=-0.5'),
    {files:{'tests/q_storage.cpp':tableAnswer},wrong:[
      {name:'updates a copy of the row',files:{'tests/q_storage.cpp':tableAnswer,'src/learning/QAgent.cpp':source.replace('QRow& row', 'QRow row')},fails:[1]},
      {name:'maximum includes illegal Bank',files:{'tests/q_storage.cpp':tableAnswer,'src/learning/QAgent.cpp':source.replace('if (game.legal(dice::Action::Bank))', 'if (true)')},fails:[1]},
      {name:'maximum invents zero',files:{'tests/q_storage.cpp':tableAnswer,'src/learning/QAgent.cpp':source.replace('double best = value(seen, dice::Action::Roll);', 'double best = 0.0;')},fails:[1]},
      {name:'always-success test',files:{'tests/q_storage.cpp':'#include <iostream>\nint main() { std::cout << "storage passed\\n"; }'},fails:[2]},
    ]});
  // Read the just-authored prior target; do not duplicate or replace its build graph.
  const prior = parseLesson(fs.readFileSync('src/labs/project-studio/tracks/dice-path-learning/21b-decision-boundaries.md', 'utf8'), 'dice-path-learning/21b-decision-boundaries');
  const oldBuild = prior.steps.findLast(s=>s.file==='CMakeLists.txt').target;
  const cmake = oldBuild.trimEnd().replace('src/learning/Decision.cpp)', 'src/learning/Decision.cpp src/learning/Observation.cpp src/learning/QAgent.cpp)')+'\nadd_executable(q_storage_tests tests/q_storage.cpp)\ntarget_link_libraries(q_storage_tests PRIVATE learning_rules)\nadd_test(NAME q_storage_tests COMMAND q_storage_tests)\n';
  step('Build the storage milestone with the existing project',
    'In CMakeLists.txt add Observation.cpp and QAgent.cpp to learning_rules, then register q_storage_tests. The existing reward, decision and game tests remain part of the build. The terminal opponent still uses its fixed policy: allocating this table has not trained it.', 'CMakeLists.txt', cmake,
    'Run configure, build and CTest using the commands below. **Section gate:** with examples closed, decode a new row, explain a rejected observation, trace one stored write and defend a negative legal maximum. Next comes action selection; learning updates and training remain later lessons.',cmd('cmake -S . -B build-dice -G Ninja -DCMAKE_CXX_COMPILER=g++')+'\n'+cmd('cmake --build build-dice')+'\n'+cmd('ctest --test-dir build-dice --output-on-failure','stdout="q_storage_tests"'));
  end();
}
