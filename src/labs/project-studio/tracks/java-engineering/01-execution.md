---
title: Java — follow execution, not appearances
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

We begin with a program small enough to trace completely. A source file is text; `javac` translates valid Java to bytecode; `java` starts a JVM that loads and executes that bytecode. Compiler errors and runtime errors occur at different stages and need different investigations.

## A method and its inputs

`class` introduces a named type. `public` permits access from outside its package. A method declares a return type, name and parameters. `int` stores a signed 32-bit whole number. `static` makes this method belong to the class rather than an individual object. `return` ends the method and gives its value to the caller.

The JVM enters `main`. Its `String[] args` parameter contains command-line arguments; `void` means it returns no value. Execution assigns 8, assigns 3, calls `remaining`, stores the returned 5, then prints it. The parameter variables receive copies of the caller's values. Renaming `planned` inside the method would not rename or change the caller's variable.

A semicolon terminates each statement here. Braces delimit a class or method body. Type the complete small experiment, then compile and run with the commands in the next step.

Type this fragment yourself. Start an empty file at `scratch/Trace.java`:

```java edit=scratch/Trace.java mode=replace
public class Trace {
    static int remaining(int planned, int completed) {
        return planned - completed;
    }
    public static void main(String[] args) {
        int planned = 8;
        int completed = 3;
        int result = remaining(planned, completed);
        System.out.println(result);
    }
}
```

## Separate compile time from run time

Run:

```text
javac -d scratch/out scratch/Trace.java
java -cp scratch/out Trace
```

`-d` selects the output directory. `-cp` is the classpath: where the JVM searches for compiled classes. The second command names a class, not a file. Expected output: `5`.

Change `completed` to 9. The result becomes -1; compilation still succeeds because arithmetic has no knowledge of our business rule. Now change it to `"three"`. Compilation fails because a string cannot initialize an integer. Revert both experiments before checking.

Use a debugger breakpoint on `remaining`, or trace the assignments on paper. “Step into” enters a called method; “step over” executes it without opening its body. The call stack shows the caller waiting for a result. Explain why a successful compile cannot prove that remaining work is sensible.

```check
run "javac -d scratch/out scratch/Trace.java"
run "java -cp scratch/out Trace" stdout="5"
```

## Challenge — Capacity without a template

Write `challenges/Capacity.java` with a public class `Capacity` and `main`. Read planned and completed counts from `args` using `Integer.parseInt`. Print their difference, clamped to zero when completed exceeds planned. Do not use a library that implements the entire rule.

Examples: `8 3` prints `5`; `3 8` prints `0`; `0 0` prints `0`. Explain which values change, and why clamping would be wrong if a negative value represented debt in a different domain. Hint: an `if` selects a statement based on a boolean expression.

This is optional. Use **Defer and continue** to revisit it later. Do challenge experiments on a separate branch or in `challenges/`; subsequent lessons do not depend on your answer.

```check
run "java challenges/Capacity.java 8 3" stdout="5"
run "java challenges/Capacity.java 3 8" stdout="0"
run "java challenges/Capacity.java 0 0" stdout="0"
```
