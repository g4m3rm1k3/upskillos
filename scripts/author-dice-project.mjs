// Run after author-dice-objects.mjs. Prerequisite files are seeded ONLY in author tests.
import fs from 'node:fs';
import { author } from './dice-path-authoring.mjs';
import { gameLessons } from './dice-game-lessons.mjs';
import { commandLessons } from './dice-command-lessons.mjs';
import { randomLessons } from './dice-random-lessons.mjs';
import { terminalLessons } from './dice-terminal-lessons.mjs';
import { parseLesson } from '../src/labs/project-studio/parseTrack.js';
import { WALKTHROUGH as prior } from '../src/labs/project-studio/tracks/dice-objects.walkthrough.js';
const { lesson, step, predict, end, finish } = author({ key: 'dice-path-project', title: 'C++ Games — Build the Project', order: 4.3, fixture: 'dice-project', test: 'diceProject' });
const prerequisite = parseLesson(fs.readFileSync('src/labs/project-studio/tracks/dice-path-objects/15-headers-and-sources.md', 'utf8'), 'dice-path-objects/15-headers-and-sources');
const seed = Object.fromEntries(prerequisite.steps.filter(s => s.file).map(s => [s.file, s.target]));
Object.assign(seed, prior['15-headers-and-sources#Your turn — Test the shared implementation'].files);
const compile = (entry, executable) => `g++ -std=c++20 -Wall -Wextra -pedantic -Iinclude ${entry} src/dice/Score.cpp -o ${executable}`;
const command = (cmd, options = '') => `run ${JSON.stringify(cmd)}${options ? ' ' + options : ''}`;

lesson('16-two-executables', 'A16 — One rule, two programs',
  'The demo can print points=5; the tests can catch a broken bank. In this section both become named build targets, so changing the rule updates every caller. This is the project foundation for the terminal game, trainer and later graphics backends. Select the same dice-lab folder used in A15. Do not start a new folder or retype completed files.');
step('Resume the working project',
  'Check that include/dice/Score.hpp, src/dice/Score.cpp, apps/score_demo.cpp and tests/shared_score.cpp are your own files from A15. Build the demo and tests separately using the commands below. The demo prints points=5; the tests finish with exit 0. If either fails, recover with A15 before adding more files.\n\n```text\n' + compile('apps/score_demo.cpp','score_demo') + '\n./score_demo\n' + compile('tests/shared_score.cpp','score_tests') + '\n./score_tests\n```', null, null,
  'A **shared implementation** means both programs compile the same source file, not that you copied its text into both entry points. Each executable has exactly one main. Author walkthroughs reconstruct your already-taught A15 files to test this section independently; the app supplies none of them.',
  command(compile('apps/score_demo.cpp','score_demo')) + '\n' + command('./score_demo','stdout="points=5"') + '\n' + command(compile('tests/shared_score.cpp','score_tests')) + '\n' + command('./score_tests'), { files: seed });
let report = '#include <iostream>\n#include "dice/Score.hpp"\nint main() {\n    dice::Score score;\n    score.bank(4);\n    score.bank(5);\n    std::cout << "points=" << score.points() << \'\\n\';\n    return 0;\n}';
step('A caller chooses inputs, not the banking formula',
  'Create apps/score_report.cpp. It requests two banks, then queries the result. Keep the formula in Score.cpp. This caller does not need access to points_.\n\n' + predict('If Score.cpp changes from addition to replacement, which callers are affected after rebuilding?', 'Both demo and report', 'Only the report', 'Both link definitions from the same source file.'), 'apps/score_report.cpp', report,
  'Build with ' + compile('apps/score_report.cpp','score_report') + ', then run ./score_report. Expect points=9. The original demo still starts a separate score at zero. Programs do not share live objects merely because they share source.',
  command(compile('apps/score_report.cpp','score_report')) + '\n' + command('./score_report','stdout="points=9"'),
  { wrong: [{ name: 'caller duplicates the wrong rule', files: { 'apps/score_report.cpp': report.replace('score.bank(5);', '') }, fails: [1] }] });
step('Try it — Diagnose the phase that failed',
  'First compile the report without Score.cpp: the declarations compile, but linking fails because definitions are missing. Restore the source in the command. Then try compiling both apps/score_demo.cpp and apps/score_report.cpp into one executable: linking reports multiple main definitions. Repair the file list, not the classes. Distinguish an unavailable header, an undefined method and a duplicate entry point in your notes.');
const bounds = '#include "dice/Score.hpp"\nint main() {\n    dice::Score score;\n    if (score.bank(0) || score.points() != 0) return 1;\n    if (score.bank(13) || score.points() != 0) return 2;\n    if (!score.bank(11) || score.points() != 11) return 3;\n    if (!score.bank(12) || score.points() != 23) return 4;\n    if (score.bank(1) || score.points() != 23) return 5;\n    return 0;\n}';
step('Your turn — Test overshoot and preservation',
  'Create tests/score_boundaries.cpp without viewing an implementation. Verify that amounts 0 and 13 are rejected without changing an initial zero score; banking 11 then 12 is accepted and yields 23; any later request is rejected without changing 23. Use explicit comparisons and nonzero failure statuses. Include the header and compile the shared source rather than defining another Score.\n\n```text\n' + compile('tests/score_boundaries.cpp','score_boundaries') + '\n./score_boundaries\n```\n\n```hints\nnudge: Separate each acceptance claim from its resulting-state claim.\nconcept: The limit is on a request and the score before that request, not on the resulting sum.\nshape: Test rejection, then two accepted requests, then post-limit rejection; return zero only after every claim holds.\n```', null, null,
  'To test the test, temporarily change the production check points_ >= 12 to points_ > 23 and rerun a freshly compiled test: it must reject the defective implementation. Restore the rule and rebuild. A passing exit alone cannot prove your assertions cover the contract; this deliberate fault is part of the task.',
  command(compile('tests/score_boundaries.cpp','score_boundaries')) + '\n' + command('./score_boundaries') + '\n' + command('g++ -std=c++20 -Iinclude tests/score_boundaries.cpp -o missing_rules','exit=1') + '\n' + command(compile('apps/score_report.cpp','score_report')) + '\n' + command('./score_report','stdout="points=9"'),
  { files: { 'tests/score_boundaries.cpp': bounds }, wrong: [
    { name:'empty test',files:{'tests/score_boundaries.cpp':'int main() { return 0; }'},fails:[2]},
    { name:'forbids valid overshoot', files:{'tests/score_boundaries.cpp':bounds,'src/dice/Score.cpp':seed['src/dice/Score.cpp'].replace('points_ >= 12','points_ + amount > 12')},fails:[1]},
  ] });
step('Record a local milestone after reviewing it',
  'A **working tree** is the files you are editing. Git can record named snapshots called **commits** so you can compare changes and recover earlier work. This is an optional local record in your own dice-lab folder; no hosting account or push is needed. Run git --version first.\n\nIf your project is not already a Git repository, run git init from its root. Use git status to inspect changes, and git diff to inspect modifications to tracked files. Untracked files do not appear in ordinary git diff. **Staging** selects what the next commit records: use git add include/dice/Score.hpp src/dice/Score.cpp apps/score_demo.cpp apps/score_report.cpp tests/shared_score.cpp tests/score_boundaries.cpp, then git diff --cached to inspect exactly that selection. Keep generated executables out of it.\n\nOnly after reviewing the staged files, optionally run git commit -m "Share tested score rules". Git may request your author name and email; configure those for this project using your chosen identity. The author walkthrough does not commit your repository.\n\n**Ready to move on:** explain why a new executable needs its own main but does not need another banking formula. Build the demo and both tests from source.');
end();

lesson('17-build-dependencies', 'A17 — Teach the build which files depend on which',
  'Repeating long compiler commands makes it easy to forget a source. CMake will describe the relationships once: a score library, a demo and test programs. CMake does not replace the compiler. Your finish line is a build from a new empty build directory and a test runner that actually discovers both test programs.');
step('Check the build tools',
  'Run cmake --version and ninja --version. **CMake** configures a build from a project description. **Ninja** executes the resulting build tasks. This lesson uses the Ninja generator and g++ consistently on each platform. The desktop C++ toolchain may already provide both; if a command is missing, install CMake and Ninja from their official distributions or your platform package manager, then reopen the terminal. Do not keep guessing commands while a required tool is unavailable.\n\nA **source directory** contains files you edit. A **build directory** contains generated files and executables. We will use build-dice for generated output; never put learner source there. Read the [official CMake tutorial](https://cmake.org/cmake/help/latest/guide/tutorial/index.html) alongside the small commands below.', null, null,
  'Check that your CMake supports the declared minimum version before configuring. The author verification used CMake 4.4.2, Ninja and g++ on Windows; other platforms use these same commands but are not claimed as verified here.',
  command('cmake --version') + '\n' + command('ninja --version'));
let cmake = 'cmake_minimum_required(VERSION 3.20)\nproject(DiceLab LANGUAGES CXX)\n';
const configure = 'cmake -S . -B build-dice -G Ninja -DCMAKE_CXX_COMPILER=g++';
step('Name the project and configure a build directory',
  'Create CMakeLists.txt in the project root. CMake commands use command_name(arguments), not C++ statements. cmake_minimum_required sets the supported policy baseline and rejects older CMake versions. project names the project and enables the C++ language (CXX). There is no executable target yet.', 'CMakeLists.txt', cmake,
  'Run ' + configure + '. -S . selects the current source directory. -B selects the generated build directory. -G chooses the Ninja generator. -D supplies a configuration value; here it selects g++ as compiler. Configuration can succeed without building a program. Do not call that a passing game test.', command(configure));
cmake += 'add_library(dice_rules STATIC src/dice/Score.cpp)\ntarget_include_directories(dice_rules PUBLIC include)\ntarget_compile_features(dice_rules PUBLIC cxx_std_20)\n';
step('Describe a shared library and its requirements',
  'A **target** is a named output or build task. add_library creates dice_rules, a static library of compiled score code. STATIC means its code will be linked into the callers. The next commands describe **usage requirements**: headers are found in include, and the interface uses C++20. PUBLIC means the target needs the requirement and its linked callers inherit it.', 'CMakeLists.txt', cmake,
  'Reconfigure, then run cmake --build build-dice. It compiles the library, but there is still no runnable demo. A **dependency** is another target whose outputs or requirements are needed to build a target.', command(configure) + '\n' + command('cmake --build build-dice'));
cmake += 'add_executable(score_demo apps/score_demo.cpp)\ntarget_link_libraries(score_demo PRIVATE dice_rules)\n';
step('Connect the executable to its dependency',
  'add_executable names score_demo and its entry source. target_link_libraries gives it the dice_rules dependency. PRIVATE here means this application consumes that dependency without declaring it as part of a reusable interface for other targets. It does not cancel the library’s PUBLIC requirements.\n\n' + predict('Does the demo need to repeat the include directory command?', 'No, it inherits the library requirement', 'Yes, every target must repeat it', 'Linking dice_rules conveys its PUBLIC usage requirements to the caller.'), 'CMakeLists.txt', cmake,
  'Configure, build and run ./build-dice/score_demo. Expect points=5. The application’s source list contains main; the library’s source list does not.', command(configure) + '\n' + command('cmake --build build-dice') + '\n' + command('./build-dice/score_demo','stdout="points=5"'));
cmake += 'enable_testing()\nadd_executable(score_contract tests/shared_score.cpp)\ntarget_link_libraries(score_contract PRIVATE dice_rules)\nadd_test(NAME score_contract COMMAND score_contract)\n';
step('Register a test with the runner',
  '**CTest** is CMake’s test runner. enable_testing permits registration. The test executable is an ordinary target; add_test registers how to run it. NAME labels the test result; COMMAND names the target executable. Registering and building are separate operations.', 'CMakeLists.txt', cmake,
  'Configure and build, then run ctest --test-dir build-dice --output-on-failure. --test-dir selects the generated build directory; --output-on-failure reveals test diagnostics when a case fails. Confirm score_contract appears. A runner reporting no tests is not evidence of correct rules.', command(configure) + '\n' + command('cmake --build build-dice') + '\n' + command('ctest --test-dir build-dice --output-on-failure','stdout="score_contract"'));
step('Try it — Remove a dependency requirement',
  'Temporarily change target_include_directories from PUBLIC to PRIVATE. The library still sees its header, but a clean build of the caller should report that dice/Score.hpp cannot be found. Restore PUBLIC and rebuild. Then remove only add_test: the executable can still build even though CTest no longer runs it. Restore the registration. These are different failure modes.');
const completed = cmake + 'add_executable(score_boundaries tests/score_boundaries.cpp)\ntarget_link_libraries(score_boundaries PRIVATE dice_rules)\nadd_test(NAME score_boundaries COMMAND score_boundaries)\n';
step('Your turn — Add and run the second test',
  'Edit CMakeLists.txt without a supplied target. Register the existing tests/score_boundaries.cpp as executable score_boundaries, link the rule library, and register it with CTest under the same name. Configure a new build-dice-fresh directory to prove the source description is sufficient without old objects.\n\n```text\ncmake -S . -B build-dice-fresh -G Ninja -DCMAKE_CXX_COMPILER=g++\ncmake --build build-dice-fresh\nctest --test-dir build-dice-fresh --output-on-failure\n./build-dice-fresh/score_demo\n```\n\n```hints\nnudge: Building a test program and registering it are different steps.\nconcept: This executable consumes the same library as the earlier caller.\nshape: Declare a target for the existing test source, link dice_rules and register a CTest name.\n```', null, null,
  '**Ready to move on:** draw the three callers and their shared dependency. Explain configure versus build versus test. In your own README, record these commands, the required tools and the role of apps, include, src, tests and build directories. Keep generated build folders out of source control. Do not delete your source folder to demonstrate a clean build; use a new build directory.',
  command('cmake -S . -B build-dice-fresh -G Ninja -DCMAKE_CXX_COMPILER=g++') + '\n' + command('cmake --build build-dice-fresh') + '\n' + command('ctest --test-dir build-dice-fresh --output-on-failure','stdout="score_boundaries"') + '\n' + command('./build-dice-fresh/score_demo','stdout="points=5"'),
  { files: {'CMakeLists.txt':completed}, wrong:[
    {name:'builds but never registers the new test',files:{'CMakeLists.txt':completed.replace('add_test(NAME score_boundaries COMMAND score_boundaries)\n','')},fails:[2]},
    {name:'does not link shared rules',files:{'CMakeLists.txt':completed.replace('target_link_libraries(score_boundaries PRIVATE dice_rules)\n','')},fails:[1]},
  ] });
end();
const gameBuild = gameLessons({lesson,step,predict,end}, completed);
const commandBuild = commandLessons({lesson,step,predict,end}, gameBuild);
const randomBuild = randomLessons({lesson,step,predict,end}, commandBuild);
terminalLessons({lesson,step,predict,end}, randomBuild);
finish();
