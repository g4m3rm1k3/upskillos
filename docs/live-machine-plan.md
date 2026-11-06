# Live Machine — plan

Working title. A survival game where the ship is your code. You learn computer science, software
engineering and mathematics by keeping a broken starship alive, one system at a time.

Status: **plan only.** Nothing is built yet. Next step is the first playable version (section 9).

---

## 1. What it is for

The learner (first of all, the owner of this project) can write some JavaScript and Python, but:

- gets lost in Java and C#, can't read Rust, and finds C++ pointers baffling;
- wants more mathematics, more ways of thinking (paradigms), and real problem-solving skill;
- wants to build practical things: a good webpage, a database-backed app, file parsers;
- does not want to be handed code by an AI without understanding it.

Live Machine is the spine that ties all of that together. It is one game world that keeps
everything you build, and it links out to the existing labs (Dynamic Programming, Linear Algebra,
Logic Suite, Sim Lab, the RL labs and others) when a level needs a deeper explanation.

## 2. The rules of the game

1. **Your code is the ship.** No minigame scores your code from the side. Power, doors, cargo,
   navigation, life support: each system is a module you wrote, running live.
2. **Small pieces.** Each step adds a few lines (about 3–15). You predict what will happen, run it,
   and see it in the world. No whole-file dumps.
3. **It is always running.** Edit code and the running ship picks it up without restarting.
   An inspector shows any system's state; time can be paused, stepped and rewound.
4. **Old code comes back.** The ship grows. Code from an early level meets bigger loads later
   (10 crates become 50,000), so old ideas get practised because the ship needs them, not
   because a quiz asks.
5. **Tests are the ship's diagnostics.** A level is passed when the ship survives scenarios
   you have not seen, not when your code matches an answer.
6. **The ship AI hands you code, and you review it.** Sometimes it is right; sometimes it has a
   bug, a security hole or a slow algorithm. Install bad code and something breaks. This trains
   the skill of judging code you didn't write.
7. **Nothing is wasted.** Every system you build stays in the ship and gets used again.

## 3. Saving progress and short sessions

The game is built for dropping in when there is time.

- **Everything saves automatically**: your code, the ship's state, the database, progress and
  snapshots. In the browser this goes to IndexedDB (localStorage is too small for code and a
  database). On the desktop app the ship can also live in a real folder of files.
- **Export / import a save file** as a backup, or to move between computers.
- **Snapshots** work like version control: save points you can go back to, compare, and restore.
  This later becomes the lesson on Git.
- **Short pieces.** Each level is split into steps of about 5–15 minutes. You can stop after any
  step.
- **Captain's log when you come back.** A short recap: where you were, what you last built, what
  is next. If you've been away a while, a quick warm-up task uses something you built earlier.

## 4. Languages

**Home language: TypeScript.** It is JavaScript plus the ideas that make Java and C# hard to
read (types, classes, interfaces, generics). Learning those ideas in familiar syntax is the
bridge to the other languages. The start of the game is plain JavaScript; types are added when
the ship's code gets big enough to need them, and the learner sees the TypeScript compiled to
JavaScript to learn what types do and don't do.

**Other languages arrive as alien tech found in wrecks**, each after its ideas are known in TS:

| Wreck | Language | Unlocks after | What it teaches |
|---|---|---|---|
| Military cruiser | Java, C# | classes and interfaces (Season 1) | Same ideas, different spelling; shown side by side, line by line |
| Reactor controller | C++ | the ship's core and memory (Season 9) | Pointers as numbered memory bays with arrows; `*` and `&` made visible |
| Sealed vault | Rust | concurrency (Season 11) | Ownership: one holder of a bay's key at a time; the compiler as guard |
| Alien probe | Lisp, Haskell | the crew language (Season 10) | Functional thinking: transform, don't change |
| Logic computer | Prolog, SQL | databases (Season 3) | Declarative thinking: say what you want, not how |

The ship's own code stays TypeScript. Alien tech is translated and connected to it.
Running other languages: read and translate in the browser first; run C++, Java and Rust on the
desktop app later (Project Studio's C++ runtime can be reused).

## 5. Seasons

Each season is a part of the ship coming back online. Levels inside a season each introduce one
new idea and reuse earlier ones.

| Season | Ship problem | Computer science / maths / engineering |
|---|---|---|
| 0. Wake up | Lights, power to rooms, door control | values, functions, conditions, loops, arrays, objects (JavaScript) |
| 1. Systems online | Cargo hold, inventory, maintenance robots | TypeScript types, interfaces, classes, modules; tests; searching, sorting, Big-O; hash maps |
| 2. Control panel | A screen to run the ship from | HTML, CSS, the DOM, events, state; Observer pattern; then React |
| 3. Ship's records | Crew, cargo manifests, logs | SQL with a real database (sql.js): tables, keys, joins, indexes, schema design; Repository pattern |
| 4. Salvage | Data logs recovered from wrecks | parsing CSV, JSON, text formats, regex, binary files; error handling; streams |
| 5. Navigation | Moving the ship and robots | vectors, trigonometry, matrices; graphs, BFS, Dijkstra, A* |
| 6. Scarcity | Fuel, cargo space, repair time | recursion, memoization, dynamic programming, greedy algorithms |
| 7. Orbits | Flying near a planet | rates of change, calculus, numerical simulation |
| 8. Noise | Unreliable sensors | probability, Bayes' rule, filtering, statistics |
| 9. The core | The ship's computer itself | bits, binary, logic gates, a tiny CPU, assembly, memory |
| 10. Crew language | Commands for the crew robots | tokenizer, parser, interpreter: how programming languages work |
| 11. Many hands | Many robots and programs at once | async, concurrency, scheduling, deadlock, operating-system ideas |
| 12. Comms | Talking to other ships | networking, protocols, encryption and number theory |
| 13. Autopilot | Flying itself | machine learning, reinforcement learning |

**Threads through every season:**

- **Design patterns**, each introduced when a problem calls for it: Observer (alarms), Strategy
  (swappable robot behaviours), State (door and reactor modes), Command (undo, robot orders),
  Factory, Adapter (connecting alien tech), Repository (records), Event queue.
- **Engineering practice:** tests, snapshots/version control, refactoring old systems, code review
  of the AI's code, reading logs, incidents ("life support failed at 03:00: find the cause").
- **Problem solving:** each level's briefing names the problem, not the solution. Hints come as a
  ladder (a question, then a nudge, then a smaller example), never as finished code.

## 6. Anatomy of a level

1. **Briefing**: what is wrong on the ship, shown in the running world.
2. **Explore**: inspect the system; predict what is causing it.
3. **Pieces**: small steps, each explained before and traced after.
4. **Ship check**: hidden scenarios (the tests) run in the world; you watch it pass or fail.
5. **Review** (some levels): the AI offers code; accept, reject or fix it, with reasons.
6. **Go deeper**: links to the matching lessons in other labs.
7. **Later**: a future level puts this system under new load, and you come back to it.

## 7. Connections to existing labs

| Season | Go deeper in |
|---|---|
| 1, 5 | DSA labs (arrays, linked lists, patterns) |
| 2 | HTML lab, CSS Mastery, React Mastery, TypeScript Lab |
| 3 | SQL course |
| 5 | Linear Algebra Lab, Matrix labs |
| 6 | Dynamic Programming Lab |
| 7 | Sim Lab, Physics |
| 8 | Odds Lab |
| 9 | Logic Suite |
| 10 | CodeLens, SICP-JS, Little Schemer |
| 13 | QMaze, KartLab, Tabletop RL, ML labs |

## 8. Technical approach

- A new lab: `src/labs/live-machine/` with `meta.js` and `index.jsx` (discovered automatically).
- **Runs in the browser.** The `typescript` package (already a dependency) compiles the learner's
  code inside a Web Worker. `sql.js` (already a dependency) provides the database.
- **The world** is a simple simulation with a fixed tick. Each ship system is a learner module
  with a small, typed interface (for example `routePower(rooms, supply)`).
- **Live reload:** on save, compile and swap the module's functions while keeping the world
  state. If the new code throws, the old version keeps running and the error is shown.
- **Safety:** learner code runs in a worker with a time limit, so an infinite loop can't freeze
  the page.
- **Inspector and rewind:** the world keeps a ring buffer of recent states.
- **Levels are data files** (briefing, steps, starting code, checks), like Project Studio tracks,
  so adding levels doesn't require code changes.
- **Saves:** IndexedDB, with export/import as a JSON file.

## 9. First playable version (v0.1)

Small on purpose: test whether it is fun and clear before building more.

- One ship with three rooms, drawn simply in 2D.
- Three levels from Season 0:
  1. **Lights**: write a function that decides which rooms get light.
  2. **Power budget**: share limited power between rooms (loops, arrays, a first constraint).
  3. **Doors**: doors open and close by rules (conditions, objects, a first State pattern).
- Editor next to the running ship; changes go live on save.
- Inspector: click a room to see its state.
- Ship checks: hidden scenarios per level.
- Auto-save and captain's log on return.

**Done when:** a learner can open the lab, play the three levels from start to finish, close it,
come back, and continue where they left off, and the lab's tests pass.

## 10. Risks

- **Scope.** This could grow forever. Rule: finish and play each version before planning the
  next in detail.
- **Simulation complexity.** Keep the world simple until a level truly needs more.
- **Too much story.** The story exists to give problems a reason. Keep each briefing short.

## 11. Status board

| Piece | Status |
|---|---|
| Plan | written 2026-11-05 |
| Lab shell (`src/labs/live-machine/`): editor, live reload in a worker, ship view, inspector, ship log, console, star map, captain's log, export/import save | built 2026-11-05 |
| Levels as JSON (`src/labs/live-machine/levels/`, authoring guide in its README.md); tests check every level | built 2026-11-05 |
| Level S0-1 Lights (functions, return, objects, comparisons, if, strings) | built and played through in a browser 2026-11-05 |
| Level S0-2 Power budget, S0-3 Doors (new worlds needed) | next |
| Saves in IndexedDB (v0.1 uses localStorage: code is small; move when the database arrives in Season 3) | later |
| Rewind (ring buffer of world states) | later |
