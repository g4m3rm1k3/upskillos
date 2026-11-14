# Audit: software engineering curriculum

Audited 2026-11-14: `src/docs/clojure/sql stuff/CAD-CAM/software_engineering_ai_directed_curriculum_final.md` (with `00-curriculum.md`, an earlier draft of the same file, and `01-foundations.md`, a CAM-project lesson).

## Decisions (owner, 2026-11-14)

- **Audience: anyone.** UpSkillOS is open source; the course must be generic. No CAD/CAM voice.
- **Purpose:** the missing skill of the AI era. A learner understands code and architecture well enough to **communicate and steer**: to state what they want in a form that cannot be misread. The reader may be a language model, a teammate or a future self. The course is not about agents as such.
- **It is a software engineering course.** It teaches the computer science and engineering concepts themselves, as the curriculum file lists them. Being able to steer (and to state intent in code rather than prose) is the outcome of understanding them, not a separate subject or exercise format.
- **No final project.** Several projects grow across the series. A section may add to two projects; a later section adds more to those two and starts a third. Concept lessons in between stand alone.
- **Language per concept.** Use whichever language exposes the concept best (Rust, C++, Go, Python, TypeScript, C, SQL and others). There is no house language.
- **No agent-tool controls.** No instruction files, hooks, plan modes or tool-specific features.
- **Exhaustive, in depth tiers.** The course covers the whole map, not a cut-down core. Each module is written in tiers: a learner first learns it "well enough" to start, then goes as deep as they choose. U / R / A / E are those tiers.
- **Engineering, not agents.** These are general engineering concepts. Working with AI is one place they apply, not the subject.

## Direction (owner, 2026-11-14)

- **Platform: Project Studio.** Use generic wording: a big system is many small projects (packages) joined together. Where to cut and how pieces become reusable packages is a key teaching.
- **Two kinds of lesson, interleaved:**
  - **Concept lessons** stand alone and use the language that suits them. Python covers scripting-style topics such as opening files, parsing and regular expressions.
  - **Project lessons** come after the concepts they need. They teach the same idea again in C# (or the project's language) and add to one of the growing projects.

  Teaching a concept twice in two languages separates the idea from the syntax.
- **Projects grow in parallel, and new ones join by section.** Projects that later use each other show packages being reused across project boundaries. One of them is **a full-stack framework, built and used**:
  - The core is in C#: a solution of several projects, with one-way references and `internal` visibility, so the compiler enforces the boundaries.
  - The backend connects to databases.
  - The frontend is HTML, CSS and JavaScript. Both server-side templates and React must be possible, so the view layer is a boundary with two very different consumers.
- **Guarding against over-engineering:** grow the framework alongside small apps that use it. A piece moves into the framework when a second app needs it. Build templates first and add React second; the second frontend tests whether the view boundary was cut in the right place.
- **C# still allows mud.** It happens through one giant project, a "Common" project everything depends on, or everything `public`. Project boundaries enforce the direction of dependencies, not where to cut, so the course teaches where to cut.

## Verdict

The curriculum file is an excellent **map of computing**: broad, well ordered, with good standing rules (the underneath rule, failure modes with every concept, alternatives, invariants as a thread). Its scope (119 modules, 15 labs) is right for an exhaustive course. What it lacks: tiered content inside each module (a "well enough" layer, then deeper ones), and a visible thread of expressing intent in code. That skill is scattered across modules rather than being the spine.

## Keep

- The diagnosis in section 2: documents are advice, code and checks are enforcement. Under the new thesis this becomes the opening argument. Put the architecture in the code.
- The six-step teaching method, construct / deconstruct / evaluate assessment, and spot-the-flaw.
- Invariants, trust boundaries, failure modes and alternatives as threads through every module.
- The standing rule that other languages appear "when they expose something Python hides", generalised to every module.
- The modules that become the core: 1.4, 1.8, 1.9, 2.5–2.9, 3.1, 3.2, 3.5, 3.6, 3.8–3.10, 6.3.

## Findings, most important first

### 1. The skill is scattered, not the spine

The core moves are each present somewhere: types that rule out invalid states (6.3, stage 6), invariants (2.6), state machines (2.7), interfaces (3.1), dependency direction (3.2), executable architecture (3.6), tests as oracles (1.9). But nothing connects them as **one skill: saying what you mean in code**. Types arrive in stage 6, after the architecture they would express. A learner never practises turning an ambiguous request into code that admits only the intended meaning.

**Fix:** reorder so these concepts arrive together and early (shape below).

### 2. (Removed 2026-11-14: the "one request, five readings" exercise put a teaching device at the centre of an engineering course. The owner rejected it.)

### 3. Growth is the pain, and no module teaches designing for the next change

Systems break when they are extended, not when they are first written. The curriculum treats structure as static (coupling, cohesion, layers, patterns) and never asks "where does the next feature go, and what else has to change?" Missing:

- Decomposing by what is likely to change (Parnas's information-hiding criterion), not by processing steps.
- Extension points: the one obvious place a new variant plugs in (table, registry, interface), and when to add one (at the second or third variant, not the first).
- Organising code by feature vs by layer, and what each does to the locality of a change.
- Change-impact prediction: list the files a change should touch, then compare with the real diff.

**Fix:** a "Designing for change" module.

### 4. Without a main project, mud must be supplied, not grown

Mud only shows at scale: around the tenth to twentieth feature of a system. Ten-step labs can't show it, and the course has no project that grows.

**Fix:** lessons ship codebases already at that scale, in pairs. The same system at feature 15 is built twice, once muddy and once with clear boundaries. The learner specifies and adds feature 16 to both, predicts which files change, and compares. The pair is fixed lesson material, so every learner sees the same evidence.

### 5. Assessment is not operational

U / R / A / E are defined, but no module says what demonstrates each tier, and the tracker is self-ticked.

**Fix:** give each module, at each tier, a concrete task with a check, using the curriculum's own three kinds of assessment:

- construct a solution
- deconstruct an unfamiliar implementation
- evaluate alternatives, including spot-the-flaw

Where code is produced, checks run it against hidden tests, as the Dynamic Programming course does.

### 6. Language per concept: needs a stated reason in each module

This is the right decision, and the curriculum half-supports it already. Each module should say in one line why its language was chosen. Likely pairings:

| Concept | Language | Why |
|---|---|---|
| Invalid states unrepresentable, sum types | Rust (or Haskell-family) | The compiler forces you to handle every case |
| Ownership, lifetimes | Rust | Ownership is part of the type |
| Small interfaces, implicit satisfaction | Go | An interface is just the methods a caller needs |
| Memory, layout, what abstractions cost | C, C++ | Nothing is hidden |
| Structural types, gradual typing | TypeScript | You can see where a type stops holding |
| Duck typing and its costs | Python | The contrast case |
| The relational model, constraints | SQL | Rules enforced by the data store |

Cost: several toolchains. Exercises that need native toolchains run only where a desktop check can run them; where in-browser runtimes exist, use them.

### 7. Agent material must be refocused

Under "not about agents per se", 1.11, 1.12, 3.7, 3.11, 3.12, 8.11 and 10.10 shrink. What survives is reader-neutral:

- Why any reader, human or model, follows code over prose: the nearest example is the strongest instruction, and a muddy file teaches mud.
- A catalog of plausible-but-wrong code (3.7, reframed): swallowed errors, duplicated logic, speculative layers, weakened tests. Each comes with how to see it in a diff.

10.10 (building LLM products) belongs in the app's existing AI courses, not here.

### 8. Ordering

Types (6.3) and executable architecture (3.6) must move into the core, before the architecture they express. Week-one checks currently sit in stage 8 (8.6, 8.9, 8.11), and the symptom index sends stage-1 problems there.

### 9. Housekeeping

- The CAD/CAM voice must go: "where your trade lives", machine-axis and CNC examples, "your boss's spreadsheet". The examples need generic domains.
- `01-foundations.md` is a CAM project lesson, not part of this course. 1.4's note "(Lesson 01 covers this module)" is wrong.
- `00-curriculum.md` is a superseded draft. Appendix B (v1 crosswalk) is author history.
- The files live under `src/docs/clojure/sql stuff/CAD-CAM/`; move them when the course gets a home.

## Proposed shape

**Part A: Code and architecture (the opening)**

| # | Module | From |
|---|---|---|
| 1 | Reading code: state, identity, tracing execution | 1.4, 1.5 |
| 2 | Names and vocabulary as design | 3.8, 2.8 |
| 3 | Reading a diff against its intent | 1.8 |
| 4 | Tests as statements of intent; the oracle problem | 1.9 |
| 5 | Invariants and contracts | 2.6 |
| 6 | Types that rule out wrong states | 6.3 |
| 7 | State machines | 2.7 |
| 8 | Interfaces and information hiding | 3.1 |
| 9 | Boundaries and dependency direction | 3.2 |
| 10 | Designing for change | new |
| 11 | Skeleton first: boundaries, types and failing tests before implementation | new |
| 12 | Executable architecture: making violations fail | 3.6 |
| 13 | Plausible-but-wrong code, mud and over-engineering | 3.7, 3.8, 3.9 |
| 14 | Recovering a muddy system | 3.10 |

**Part B: Architecture.** Each module still ends with "say it in code":

- Deciding and specifying: 2.1, 2.2, 2.4, 2.5, 2.9
- Design and patterns: 3.3–3.5, 6.9
- Verification and evolution: 8.6, 8.7, 9.7
- Architecture and trade-offs: 9.5, 9.6, 9.8

*Proposal, not decided:* Part A is the opening of the first "well enough" pass. Parts B and C are still part of the course, each module in tiers.

**Part C: the rest of the map.** Where the app already teaches a topic in depth, its deeper tiers can link to that course instead of duplicating it. Present now:

- logic, discrete-math, digital-fundamentals
- data-structures-and-algorithms, dynamic-programming
- git, command-line-interface
- sql, nosql
- linear-algebra, cpp-patterns

Gaps to write later include operating systems, networking, concurrency, compilers and languages, distributed systems, security, and Rust and Go introductions. Stages 4–10 of the curriculum file are the index for these.

## Platform: requirements from this audit

The owner has not chosen a platform. The core exercise needs:

1. a prompt and a starting file in the language the module chose
2. the learner's code run against one correct implementation and several wrong ones
3. a report of which wrong readings survived

Paired-codebase lessons (finding 4) also need a folder and a diff view.

- **Project Studio** has lessons beside a real folder, a terminal, and checks run in that folder on desktop. Its docs show C++, Python, Java and .NET toolchains already in use, plus diff, prediction and hint blocks.
- **Markdown Hub** has a reading pane, a workspace and a terminal, but no check system.
- **A new desktop-only app** is justified only if the "rule out wrong readings" grader and the paired codebases need a lesson model that neither existing tool has.

## Next step

Platform is decided (Project Studio). The projects are laid out across the whole map in [software-engineering-curriculum.md](software-engineering-curriculum.md). That file is a working copy of the curriculum: every module has a **Builds** line, section 4 lists the projects, and section 5 lists the audit changes applied. Next: review the project set, then write each module's tiers and checks.
