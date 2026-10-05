---
title: Start here — build Common Ground
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

**Common Ground** is a collaborative project workspace. You will build a task board with a browser interface, persistent tasks and discussion, permissions, concurrent editing protection, and an operational release process. The project starts small because each addition must be understood, not because the final application is a toy.

This course is for self-taught scripters, graduates, and people who can assemble programs but want to understand and own their behavior. No programming or framework knowledge is assumed. The opening instruction introduces values, variables, method calls, command-line arguments and decisions before asking you to combine them. There is no agent section.

Every code fragment is typed by you. There is no starter download or solution injection. Read the explanation, predict the behavior, type the fragment, and inspect what happens. Small fragments sometimes leave an unfinished class until the next step; the lesson tells you when to compile. Optional challenges never unlock or block teaching content. Passing checks is evidence about particular behavior, not a certificate of mastery.

## Decide what the first release means

### Translate scope into examples you can observe

A user story such as “I want to track work” is too broad to test directly. Make one event and its outcome explicit: an editor submits `Plan release`; the accepted task has TODO status and revision 0; after restarting the server it can still be retrieved. That example names the actor, input, state and durability expectation without selecting a database library.

A **non-goal** describes work intentionally excluded from this release. “No public signup” means our local identity setup is sufficient for this learning release, not that authentication is unimportant. A **constraint** is a condition the implementation must respect, such as preserving a rejected draft or keeping unauthorized writers out. Distinguish both from an assumption, such as expecting one small team's workload.

For decisions/001-scope.md, write an example of success and an example of rejection for creation, advancing and discussion. A rejection is part of the product: after a stale edit, the previous winner's state must remain intact and the losing user must have a recovery path. We will revisit these examples at release rather than declaring completion because all planned files exist.

A requirement states observable behavior, not an implementation. “Use React” chooses a tool; “a teammate can see whether a task was saved” describes behavior. Our first release supports one team's shared board. Editors create tasks, change status and discuss work; readers inspect it. Authentication uses local development accounts before external identity becomes an extension.

Create `decisions/001-scope.md` in the explorer. In your own words record the users, three useful workflows, and these exclusions: billing, file uploads, public signup, and multi-organization tenancy. Exclusions keep a first release explainable. They are not claims that those features are unimportant.

Acceptance example: given a task at revision 2, when one editor updates it and another submits revision 2, the second receives a conflict instead of overwriting the first edit. We will implement that rule only after understanding state and persistence.

A **modular monolith** is one deployable application with internal responsibilities separated. It avoids network boundaries inside our application. Its cost is that modules share a release and process; decide differently when measured organizational or workload constraints justify it.

```check
file decisions/001-scope.md
```

## Prepare a real development folder

### Know what is being installed

An editor changes source text. A terminal displays a shell, which launches commands. A compiler translates a programming language into executable instructions. A runtime executes those instructions. These roles may appear together in one application but are not interchangeable.

The JDK, Java Development Kit, contains javac for compilation and java for launching the Java Virtual Machine. Maven coordinates building multiple Java files and resolving libraries. Git records source history. Node runs JavaScript tools outside the browser, and npm installs packages and runs their scripts. You do not need to know their internal implementation to start, but you should know which role a failed command belongs to.

A **path** identifies a file or directory. A relative path starts from the process's current directory; an absolute path starts from the filesystem's root. Our instructions say project root to mean the learning folder containing your decisions, scratch work and later pom.xml. Do not type these learning commands in the UpSkillOS source repository.

Open the terminal in that learning folder. On macOS/Linux, pwd prints the current directory and ls lists its contents. In PowerShell, Get-Location and Get-ChildItem provide those observations. Use your editor's folder-opening action to select the same directory. If a file exists in the explorer but a command cannot find it, compare these locations before reinstalling tools.

Each version command below asks one installed program to report information and exit. Some print to the diagnostic stream rather than standard output; seeing a version is still expected. “Command not found” means the shell could not locate the executable, not that your Java source is wrong. A version check establishes availability, not that a whole project can build.

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

### Know what finishing this course means

The guided path ends with a locally packaged Common Ground application and a repeatable release/recovery exercise. The optional independent change evaluates whether you can transfer that reasoning without another implementation fragment. You may finish reading and the guided build while that evidence remains deferred.

Keep separate entries for **observed**, **explained**, and **independently applied**. For example, seeing a stale-write test pass is an observation. Tracing why its SQL predicate matters is an explanation. Designing equivalent protection in an unfamiliar workflow is transfer. Checking a box for one should not silently claim the others.

When a guided experiment deliberately breaks behavior, restore the specified working version before proceeding with the build. An optional challenge uses its own files or branch so deferring it never leaves a required application class missing. Later prerequisites are taught in guided material, even when a challenge revisits them.

Create `learning-log.md`. For each lesson record a prediction, one observed result, and one design choice you could explain to another engineer. When an expectation is wrong, record the smallest example that changed your mind.

Next and Continue are always available. **Material covered** records your acknowledgement, not correctness. **Practice to revisit** retains deferred or unsuccessful challenges. Checks inspect selected behaviors; your explanation and transfer to a new problem supply additional evidence.

If a guided exercise breaks, compare the compiler's file and line number with the step that introduced it. Restore a known commit on a practice branch if useful, then retype the relevant fragment. You can read later material and return; challenge code is never required by later application code.

```check
file learning-log.md
```
