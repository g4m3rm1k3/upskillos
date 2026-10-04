---
title: Start here — build Common Ground
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

**Common Ground** is a collaborative project workspace. You will build a task board with a browser interface, persistent tasks and discussion, permissions, concurrent editing protection, and an operational release process. The project starts small because each addition must be understood, not because the final application is a toy.

This course is for self-taught scripters, graduates, and people who can assemble programs but want to understand and own their behavior. No framework knowledge is assumed. A little familiarity with variables is helpful; the opening lessons explain Java execution directly. There is no agent section.

Every code fragment is typed by you. There is no starter download or solution injection. Read the explanation, predict the behavior, type the fragment, and inspect what happens. Small fragments sometimes leave an unfinished class until the next step; the lesson tells you when to compile. Optional challenges never unlock or block teaching content. Passing checks is evidence about particular behavior, not a certificate of mastery.

## Decide what the first release means

A requirement states observable behavior, not an implementation. “Use React” chooses a tool; “a teammate can see whether a task was saved” describes behavior. Our first release supports one team's shared board. Editors create tasks, change status and discuss work; readers inspect it. Authentication uses local development accounts before external identity becomes an extension.

Create `decisions/001-scope.md` in the explorer. In your own words record the users, three useful workflows, and these exclusions: billing, file uploads, public signup, and multi-organization tenancy. Exclusions keep a first release explainable. They are not claims that those features are unimportant.

Acceptance example: given a task at revision 2, when one editor updates it and another submits revision 2, the second receives a conflict instead of overwriting the first edit. We will implement that rule only after understanding state and persistence.

A **modular monolith** is one deployable application with internal responsibilities separated. It avoids network boundaries inside our application. Its cost is that modules share a release and process; decide differently when measured organizational or workload constraints justify it.

```check
file decisions/001-scope.md
```

## Prepare a real development folder

Choose a new empty folder in Project Studio. Keep it for this entire course. The explorer's new-file action accepts paths; create the parent folders when needed. Files you type are ordinary files on disk. In the browser edition, use your own editor and terminal alongside these lessons; execution checks require the desktop edition.

Install a JDK 21, Maven 3.9+, Git, and Node 22.14+ using their official installation instructions. A JDK includes the compiler; a Java runtime alone does not. Open a fresh terminal and run each command separately:

```text
java -version
javac -version
mvn -version
git --version
node --version
npm --version
```

The compiler and runtime should both report major version 21. `mvn -version` reports which Java it uses: a different installation can explain why an editor succeeds while Maven fails. PATH is the ordered list of directories the shell searches for commands. JAVA_HOME identifies a JDK directory; it is not the executable path. Restart the desktop app after changing its environment if checks cannot find a command that a new terminal can.

Use the **Terminal**, not a single-file Run button, for this multi-file course. Commands are run from the project root unless a lesson says otherwise. The first dependency downloads require network access.

Installation references: [JDK](https://adoptium.net/installation/), [Maven](https://maven.apache.org/install.html), [Git](https://git-scm.com/downloads), [Node](https://nodejs.org/en/download).

```check
run "javac -version"
run "mvn -version" timeout=120
run "git --version"
run "node --version"
```

## Keep evidence without blocking progress

Create `learning-log.md`. For each lesson record a prediction, one observed result, and one design choice you could explain to another engineer. When an expectation is wrong, record the smallest example that changed your mind.

Next and Continue are always available. **Material covered** records your acknowledgement, not correctness. **Practice to revisit** retains deferred or unsuccessful challenges. Checks inspect selected behaviors; your explanation and transfer to a new problem supply additional evidence.

If a guided exercise breaks, compare the compiler's file and line number with the step that introduced it. Restore a known commit on a practice branch if useful, then retype the relevant fragment. You can read later material and return; challenge code is never required by later application code.

```check
file learning-log.md
```
