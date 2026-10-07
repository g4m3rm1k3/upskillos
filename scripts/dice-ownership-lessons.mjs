// Focused replacements for the former single, overloaded A14 lesson.
// Existing A14 lesson id and its first step id remain stable. New steps use explicit keys.
export function ownershipLessons({ lesson, step, guided, practice, predict, end }) {
  const cpp = (decl, body, headers = '') => `#include <iostream>\n${headers}${decl}\nint main() {\n${body}\n    return 0;\n}`;
  const trace = 'struct Trace {\n    int id;\n    explicit Trace(int value) : id(value) { std::cout << "begin " << id << \'\\n\'; }\n    ~Trace() { std::cout << "end " << id << \'\\n\'; }\n};';
  lesson('14-lifetimes-and-ownership', 'A14 — Trace when an object stops existing',
    '**Outcome:** predict and verify destructor order on ordinary scope exit and early return. Recall A11: when does a constructor run? Draw the scopes before opening the first example.\n\nA saved model will need its file closed even when a function returns early. First isolate the mechanism that makes cleanup possible. Files, pointers and copy restrictions each get their own lesson after this one.');
  let code = cpp(trace, '    Trace first{1};\n    {\n        Trace second{2};\n        std::cout << "inside\\n";\n    }\n    std::cout << "outside\\n";');
  guided('Observe the end of a lifetime',
    'Create explore/lifetime.cpp. A **lifetime** is the interval in which an object exists. A **destructor**, written ~Trace(), runs when a fully constructed local object’s lifetime ends. It has no return type or arguments. Nested braces create a scope. Locals are destroyed in reverse construction order as their scopes end.\n\n' + predict('Which object ends first?', 'The inner object 2', 'The outer object 1', 'The inner scope ends while the outer object is still alive.'),
    'explore/lifetime.cpp', code,
    '| Event | Objects still alive afterwards |\n|---|---|\n| Construct first | 1 |\n| Enter block, construct second | 1, 2 |\n| Leave inner block | 1 |\n| Return from main | none |\n\nThe destructor runs at scope exit, not at the last place you read the object. Its printed message lets you observe that event.',
    'begin 1\nbegin 2\ninside\nend 2\noutside\nend 1\n');
  code = code.replace('        std::cout << "inside\\n";', '        std::cout << "leaving early\\n";\n        return 0;');
  guided('An early return still leaves scopes {#early-return}',
    'Add return 0 inside the inner block. It exits main, so both live local objects must finish. Predict whether outside will print before you run. This is normal return, not abrupt process termination; the distinction matters for cleanup.',
    'explore/lifetime.cpp', code, 'Execution prints leaving early, destroys second, then destroys first. The outside print is skipped. Moving return changes which statements run, but it does not bypass destruction of these fully constructed locals.',
    'begin 1\nbegin 2\nleaving early\nend 2\nend 1\n');
  step('Try it — Reverse the construction order {#reverse-order}',
    'Inside one pair of braces, construct Trace alpha{3}; then Trace beta{8};. Predict the final two lines. Run and then swap the declarations. The last-created object in that scope is destroyed first. Restore the guided file. Explain why object names do not control destruction order.');
  const answer = cpp(trace + '\nvoid visit(bool early) {\n    Trace local{2};\n    if (early) return;\n    std::cout << "work\\n";\n}', '    int early = 0;\n    if (!(std::cin >> early)) return 1;\n    Trace outer{1};\n    visit(early != 0);\n    std::cout << "back\\n";');
  practice('Trace a helper returning to its caller {#lifetime-transfer}',
    'Create your own Trace type that prints begin ID in its constructor and end ID in its destructor. main reads 0 or 1 and creates object 1. A void helper visit(bool early) creates object 2, then returns immediately if early is true; otherwise it prints work. After the helper returns, main prints back. Do not print destruction messages from main or visit: the destructor owns them.',
    'practice/lifetime_trace.cpp', answer,
    [{input:'0\n',out:'begin 1\nbegin 2\nwork\nend 2\nback\nend 1\n'}, {input:'1\n',out:'begin 1\nbegin 2\nend 2\nback\nend 1\n'}, {input:'word\n',opts:'exit=1'}],
    ['A helper returning does not end main’s scope.', 'Object 2 is local to visit. Object 1 remains alive when back prints.', 'Define the trace type, implement visit, then let main own the outer object and call the helper.'],
    [{name:'ignores early return',code:answer.replace('if (early) return;', 'if (early) {}'),fails:[2]}, {name:'destroys outer too soon',code:answer.replace('    Trace outer{1};\n    visit(early != 0);', '    { Trace outer{1}; visit(early != 0); }'),fails:[1,2]}],
    '**Ready to move on:** hide the source and draw the lifetime intervals for both inputs. Then move object 1 into a nested block and predict the changed output before compiling. Output tests do not prove that destruction is automatic; point to the destructor and show that changing a scope changes the trace without moving a print statement.');
  end();

  lesson('14b-file-persistence', 'A14b — Save now, read in a later run',
    '**Outcome:** save an integer to a file, report write failures, and recover the saved value in a separate process. Recall A03: what must you check before using a value extracted from a stream? Recall A14: what happens to local objects when a function returns early?\n\nA future trained opponent needs its learned values to survive program exit. Start with one integer. This lesson changes persistence, not pointer or class-copy rules.');
  let writer = cpp('', '    std::ofstream output{"rounds.txt"};\n    if (!output) return 1;\n    output << 3 << \'\\n\';\n    output.close();\n    if (!output) return 2;\n    std::cout << "saved\\n";', '#include <fstream>\n');
  guided('Open, write, close and check',
    'Create explore/write_rounds.cpp. Include <fstream> for file stream types. std::ofstream opens an output file when constructed; this mode **replaces** rounds.txt in your project folder. Use this practice filename, not an existing document. !output checks failure, as !std::cin did for input. << writes data. close finishes and closes the file; checking afterwards can detect write or close failure.',
    'explore/write_rounds.cpp', writer,
    'A **resource** needs eventual release: here the open file. The stream is its **owner**, responsible for closing it. Its destructor also closes on scope exit, including early return. **RAII**, Resource Acquisition Is Initialization, is the name for tying ownership to object lifetime. We explicitly close here to inspect failure before claiming success; automatic cleanup alone is not an error report.', 'saved\n');
  const reader = cpp('', '    std::ifstream input{"rounds.txt"};\n    int rounds = 0;\n    if (!(input >> rounds)) return 1;\n    std::cout << "loaded=" << rounds << \'\\n\';', '#include <fstream>\n');
  guided('A different executable reads the file',
    'Create explore/read_rounds.cpp. std::ifstream opens an input file. Its extraction operation has the same failure rule you already used with std::cin. This program never sees the writer’s local variables: that earlier process has ended.\n\n' + predict('Where does this run obtain the saved 3?', 'From rounds.txt', 'From the old output variable', 'Process-local objects are gone; the file persists and is opened again.'),
    'explore/read_rounds.cpp', reader, 'The two commands can run at different times. The filesystem connects them, not shared C++ variables. Do not print rounds unless extraction succeeded.', 'loaded=3\n');
  step('Try it — Change the data, keep the program',
    'Open rounds.txt in the editor and change 3 to 9. Run the already compiled reader: it should print loaded=9 without recompiling. Replace the file text with a word and run again: extraction must fail with nonzero exit status. Restore 3. Explain why editing data differs from editing C++ source.');
  const store = cpp('', '    int mode = 0;\n    if (!(std::cin >> mode)) return 1;\n    if (mode == 1) {\n        int rounds = 0;\n        if (!(std::cin >> rounds) || rounds < 0 || rounds > 10) return 1;\n        std::ofstream output{"practice_rounds.txt"};\n        if (!output) return 2;\n        output << rounds << \'\\n\';\n        output.close();\n        if (!output) return 2;\n        std::cout << "saved\\n";\n    } else if (mode == 2) {\n        std::ifstream input{"practice_rounds.txt"};\n        int rounds = 0;\n        if (!(input >> rounds) || rounds < 0 || rounds > 10) return 2;\n        std::cout << "loaded=" << rounds << \'\\n\';\n    } else return 1;', '#include <fstream>\n');
  practice('Separate saving from loading',
    'Create a program with two modes. Input 1 N saves N, from 0 through 10, into practice_rounds.txt and prints saved. Input 2 loads from that file and prints loaded=N; it receives no N on standard input. Reject invalid commands/values with exit 1 before opening the output file. Return 2 for file failures or invalid stored data. A failed request must preserve an earlier valid save. Run the examples below in order: each row starts a new process. File replacement is intended only for this practice file.',
    'practice/save_rounds.cpp', store,
    [{input:'1 3\n',out:'saved\n'}, {input:'2\n',out:'loaded=3\n'}, {input:'1 8\n',out:'saved\n'}, {input:'2\n',out:'loaded=8\n'}, {input:'1 11\n',opts:'exit=1 without="saved"'}, {input:'2\n',out:'loaded=8\n'}],
    ['A load run receives only its mode; obtain the count from the file.', 'Validate a new count before opening the writer, because opening replaces old data.', 'Give each branch its own stream and failure checks. Do not construct an output stream in the load branch.'],
    [{name:'reader opens a truncating writer',code:store.replace('std::ifstream input{"practice_rounds.txt"};', 'std::ofstream erase{"practice_rounds.txt"};\n        erase.close();\n        std::ifstream input{"practice_rounds.txt"};'),fails:[2,4,6]}, {name:'writes a fixed count',code:store.replace('output << rounds', 'output << 3'),fails:[4,6]}],
    '**Ready to move on:** close and rerun the program in load mode, then edit the saved integer and load again. Explain the owner’s lifetime and the point at which success is reported. This is plain text persistence, not an atomic save or a complete model format. We will teach those extra requirements when the Q table needs them.',
    { checks: ['contains practice_rounds.txt "8"'] });
  end();

  lesson('14c-borrowed-pointers', 'A14c — Borrow an object that is still alive',
    '**Outcome:** pass an optional object to a function and guard the absent case before access. Recall A06: a reference aliases an existing object. Recall A14: names outside a scope cannot keep its local objects alive.\n\nGraphics APIs often identify an object through a pointer. Learn that mechanism with ordinary integers first; this lesson allocates no heap memory and owns no library handles.');
  let pointer = cpp('', '    int pot = 5;\n    int* borrowed = &pot;\n    std::cout << "value=" << *borrowed << \'\\n\';');
  guided('An address names a live object',
    'Create explore/borrow.cpp. A **pointer** stores an address or a null value. int* declares a pointer to int. In the expression &pot, & obtains the address of the live pot. The expression *borrowed **dereferences** the pointer: it names the integer at that address. int& from A06 instead declared a reference; punctuation means different operations in different contexts.',
    'explore/borrow.cpp', pointer, 'Draw one integer box labelled pot, and a pointer whose arrow reaches it. Reading *borrowed reads pot. The pointer is not a copy of the integer’s current value.', 'value=5\n');
  pointer = pointer.replace('    std::cout', '    *borrowed = 8;\n    std::cout');
  guided('Mutation reaches the pointed-to object', predict('What value does the print now read?', '8', '5', 'The assignment names pot through its pointer.'),
    'explore/borrow.cpp', pointer, 'This is **borrowing**: access without responsibility for destroying the object. pot’s scope controls its storage. borrowed must not delete it. Nothing here calls new or requires delete.', 'value=8\n');
  pointer = pointer.replace('    *borrowed = 8;\n    std::cout << "value=" << *borrowed << \'\\n\';', '    borrowed = nullptr;\n    if (borrowed != nullptr) std::cout << "value=" << *borrowed << \'\\n\';\n    else std::cout << "no object\\n";\n    std::cout << "pot=" << pot << \'\\n\';');
  guided('Absence must be checked before access',
    '**nullptr** means the pointer names no object. Assigning it changes the pointer, not the earlier integer. The guard checks before dereferencing. Never dereference a null pointer or a pointer to an object whose lifetime has ended.',
    'explore/borrow.cpp', pointer, 'The print reports no object and pot remains 5. Null is a usable representation for “nothing selected”; it is not an object with value zero.', 'no object\npot=5\n');
  step('Try it — Rebind while both objects live',
    'Add int other = 2; in main. Before the guard set borrowed = &other; and run. Predict which value prints and whether pot changes. Then draw an invalid example on paper: taking an inner block’s local address and using it after the block ends. That pointer would be **dangling**. Identify the lifetime error without running it; undefined behavior has no promised output.');
  const award = cpp('bool award(int* score, int amount) {\n    if (score == nullptr || amount < 1 || amount > 6) return false;\n    *score += amount;\n    return true;\n}', '    int seat = 0, amount = 0;\n    if (!(std::cin >> seat >> amount)) return 1;\n    int first = 3, second = 7;\n    int* selected = nullptr;\n    if (seat == 1) selected = &first;\n    else if (seat == 2) selected = &second;\n    bool accepted = award(selected, amount);\n    std::cout << "accepted=" << accepted << " first=" << first << " second=" << second << \'\\n\';');
  practice('Award only a selected player',
    'Write bool award(int* score, int amount). Return false without mutation for null or an amount outside 1 through 6. Otherwise add into the pointed-to integer and return true. main starts scores at 3 and 7, reads seat and amount, and selects the first score for seat 1, the second for seat 2, or no object for seat 0. Inputs use these three seat values. Print acceptance and both scores. Do not create a copied score to stand in for the selected object.',
    'practice/borrowed_award.cpp', award,
    [{input:'1 4\n',out:'accepted=1 first=7 second=7\n'}, {input:'2 3\n',out:'accepted=1 first=3 second=10\n'}, {input:'0 2\n',out:'accepted=0 first=3 second=7\n'}, {input:'1 0\n',out:'accepted=0 first=3 second=7\n'}, {input:'2 7\n',out:'accepted=0 first=3 second=7\n'}],
    ['Check absence before dereferencing.', 'The parameter copies the pointer value, but still points to the caller’s integer.', 'Choose an address while both scores live, then mutate through *score only after validation.'],
    [{name:'writes a copied value only',code:award.replace('*score += amount;', 'int copy = *score; copy += amount;'),fails:[1,2]}, {name:'selects first for both seats',code:award.replace('selected = &second;', 'selected = &first;'),fails:[2]}],
    '**Ready to move on:** draw the pointer and both integer objects for every seat. Explain why copying the pointer does not copy the pointed-to object, why null must be checked, and why this borrower owns no cleanup.');
  end();

  lesson('14d-noncopyable-owners', 'A14d — One owner, one release',
    '**Outcome:** explain a resource owner’s scope and deliberately forbid its copying. Recall A14b: which object closes an open file? Recall A07: an ordinary value copy is independent.\n\nAn open file is not just an integer value: two objects must not both assume responsibility for closing one underlying resource. Start with an explicit teaching trace, then check the real standard stream restriction.');
  let marker = cpp('class UniqueMarker {\npublic:\n    UniqueMarker() { std::cout << "acquire\\n"; }\n    ~UniqueMarker() { std::cout << "release\\n"; }\n};', '    UniqueMarker marker;');
  guided('Observe one acquisition and release',
    'Create explore/unique_marker.cpp. This type prints ownership events; it does not actually open a file or acquire a GPU resource. Its name alone does not yet make it noncopyable. The default constructor takes no arguments; the destructor reports scope exit.',
    'explore/unique_marker.cpp', marker, 'The trace gives one acquire and one release. This is the intended balance for one owner. Next intentionally copy it to expose the defect.', 'acquire\nrelease\n');
  marker = marker.replace('    UniqueMarker marker;', '    UniqueMarker marker;\n    { UniqueMarker copy = marker; }');
  guided('Default copying does not reacquire a resource',
    predict('Does default copying call our no-argument constructor again?', 'No', 'Yes', 'It uses the implicitly generated copy constructor, not our no-argument constructor.'),
    'explore/unique_marker.cpp', marker, 'The trace now has one acquire and two releases. The implicit **copy constructor** creates an object from another of the same type. For this empty teaching type it has no data to copy, but both objects still run destructors. A real owner needs an explicit copying policy.', 'acquire\nrelease\nrelease\n');
  marker = marker.replace('    ~UniqueMarker()', '    UniqueMarker(const UniqueMarker&) = delete;\n    UniqueMarker& operator=(const UniqueMarker&) = delete;\n    ~UniqueMarker()').replace('    { UniqueMarker copy = marker; }\n', '');
  guided('Declare both copying operations unavailable',
    'Remove the copy and add two declarations. UniqueMarker(const UniqueMarker&) names the copy constructor. operator= names **copy assignment**, which would replace an already existing object from another object. Its usual return type is a reference to that object. = delete makes each operation unavailable at compile time. We are declaring a restriction, not implementing an operator.',
    'explore/unique_marker.cpp', marker, 'Valid ownership again prints one acquire and one release. An attempt to copy now fails before execution. Moving ownership is a separate operation; it will be taught before SDL owners need it, not squeezed into this lesson.', 'acquire\nrelease\n');
  step('Try it — Verify both restrictions',
    'Temporarily restore UniqueMarker copy = marker; and compile: expect a deleted-copy-constructor diagnostic. Remove it, construct a separate second object and try second = marker;: expect a deleted-assignment diagnostic. Restore the working file. Repeat the creation-copy experiment with std::ofstream from A14b; the standard file stream already disallows copying. Do not remove = delete to silence an ownership error.');
  const visitAnswer = cpp('class Visit {\npublic:\n    Visit() { std::cout << "enter\\n"; }\n    ~Visit() { std::cout << "leave\\n"; }\n    Visit(const Visit&) = delete;\n    Visit& operator=(const Visit&) = delete;\n};\nvoid run_visit(bool early) {\n    Visit owner;\n    if (early) return;\n    std::cout << "work\\n";\n}', '    int early = 0;\n    if (!(std::cin >> early)) return 1;\n    run_visit(early != 0);\n    std::cout << "back\\n";');
  practice('A visit releases on both return paths',
    'Create a noncopyable Visit type that prints enter on construction and leave on destruction. Forbid both creation by copying and copy assignment. Write a helper that creates one Visit, returns early when its boolean argument is true, otherwise prints work. main reads 0 or 1, calls the helper and then prints back. As with the marker this is a lifetime model, not an actual external resource.',
    'practice/visit.cpp', visitAnswer,
    [{input:'0\n',out:'enter\nwork\nleave\nback\n'}, {input:'1\n',out:'enter\nleave\nback\n'}, {input:'word\n',opts:'exit=1'}],
    ['The owner belongs to the helper’s scope.', 'Two separate copy operations need restrictions.', 'Use construction and destruction for the trace, return for the short path, and explicit deleted declarations for copying.'],
    [{name:'cleanup only on normal path',code:visitAnswer.replace('~Visit() { std::cout << "leave\\n"; }', '~Visit() {}').replace('std::cout << "work\\n";', 'std::cout << "work\\nleave\\n";'),fails:[2]}, {name:'owner ends after back',code:visitAnswer.replace('    Visit owner;\n', '').replace('    run_visit(early != 0);', '    Visit owner;\n    run_visit(early != 0);'),fails:[1,2]}],
    '**Design check:** temporarily try both copying forms in your program and inspect each compiler diagnostic, then restore and rerun. The output checks verify lifetime traces, not the deleted declarations: this compile-error experiment is required evidence.\n\n**Section transfer:** explain why a returned score snapshot is safe to copy while an owner may forbid copying. Identify an owner, a borrower and the lifetime boundary in the file example. Continue to A15 only when those explanations work with the examples hidden.');
  end();
}
