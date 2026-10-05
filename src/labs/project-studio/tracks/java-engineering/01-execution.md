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

### Begin with values, names and execution

Suppose a board contains eight planned jobs and three completed jobs. We want the computer to calculate five remaining jobs. The numbers are **values**. A **variable** gives a value a name so a later instruction can use it. An **expression** is a piece of code that produces a value: `8`, `planned`, and `planned - completed` are expressions. A **statement** tells Java to do something, such as create a variable or return a result.

Read `int planned = 8;` in execution order: evaluate the expression `8`, then initialize a variable named `planned` with that value. `int` is the variable's type: Java permits whole numbers in its defined range, from -2,147,483,648 to 2,147,483,647. `=` assigns a value; it does not ask whether two things are equal. `;` ends this statement. Spaces separate words; indentation helps a reader see structure. Java does not use indentation to decide which statements belong together.

A later statement `planned = 10;` would replace the value held by that variable. It omits `int` because the variable already exists. Writing `int planned = 10;` in the same scope would attempt a second declaration with the same name and fail compilation. A **scope** is the region where a name can be used. Here each method's braces enclose its own local names.

### Read the outside before entering the method

A **class** declares a named Java type and groups its members. `public class Trace {` starts the class named `Trace`; its last `}` ends that declaration. The source filename is `Trace.java` because the public top-level class and filename must agree. `Trace` and `trace` are different names: Java is case-sensitive.

A **method** groups instructions under a name. Its declaration specifies what goes in and what comes out. In `static int remaining(int planned, int completed)`, the `int` before `remaining` says the method returns one integer. The parentheses declare two **parameters**, local names receiving input values. The comma separates them. `static` means this method can be called without constructing an individual `Trace` object. We will construct objects when we model tasks; no object construction is needed for this calculation.

`return planned - completed;` reads those two local values, subtracts, then ends this method call and gives the integer result back. Merely declaring a method does not execute its body. Java does not run `remaining` first because it appears first on the page.

`public static void main(String[] args)` declares the entry method used by the Java launcher. `public` makes it accessible to the launcher. `void` means this method returns no result value. `String` represents text. `String[]` means an array whose elements are strings; an array holds an ordered, fixed number of elements. `args` receives command-line inputs. This experiment does not read them yet. Keep this signature exactly as written while learning the entry protocol.

`System.out.println(result)` sends a value to standard output, normally displayed in your terminal. `System` is a Java library class. Its `out` field identifies an output stream. The dots select a member of the thing on their left. Calling the stream's `println` method prints the argument and ends the line. Printing is an observable effect; it is different from returning a result to another method.

```predict
question: main calls remaining with 8 and 3. Does declaring remaining above main make its body execute before main starts?
choice: Yes, source declarations execute from top to bottom.
choice: No, the body executes when the method is called.
answer: No, the body executes when the method is called.
explain: The launcher enters main. At its call expression, main waits while a new remaining invocation receives copies of 8 and 3. A declaration makes the method available; it does not call it.
```

### Follow a call instead of reading top to bottom

Before typing, predict whether this program prints once or twice. There are two methods, but only one printing statement.

| Instruction reached | Local state in `main` | What happens next |
|---|---|---|
| Enter `main` | `args` exists; number variables do not yet exist | Start its first statement |
| `int planned = 8;` | `planned` is 8 | Continue |
| `int completed = 3;` | `planned` is 8, `completed` is 3 | Continue |
| Evaluate `remaining(planned, completed)` | `main` waits; `result` is not initialized yet | Copy 8 and 3 into the called method's parameters |
| `return planned - completed;` | The caller is still waiting | Calculate 5 and finish `remaining` |
| Finish `int result = ...;` | `result` is now 5 | Resume the caller |
| `System.out.println(result);` | All three integers still exist | Print one line: 5 |

The separate set of local variables for a method invocation is its **stack frame**. While `remaining` runs, the call stack contains a waiting `main` frame and an active `remaining` frame. Returning removes the active frame. The caller resumes immediately after its call, not at the beginning of `main`.

The two methods happen to use the same parameter names. They do not share variables. If you rename the method's `planned` parameter to `total`, you must change its use in the subtraction, but the caller's `planned` can stay unchanged. Matching argument positions, not matching names, transfers the values.

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

### Understand each command before running it

A terminal runs a **shell**, a program that reads command text and launches other programs. The shell's current directory determines what a relative path such as `scratch/Trace.java` means. In this course it should be your learning project's root folder. The terminal's prompt is not part of a command: type only the displayed command text.

In `javac -d scratch/out scratch/Trace.java`, `javac` selects the compiler, `-d` is an option, `scratch/out` is that option's output directory, and `scratch/Trace.java` is the input source file. Successful compilation usually prints nothing. It writes `scratch/out/Trace.class`. This file contains bytecode, the instructions the JVM can load; editing the source text does not automatically update it.

In `java -cp scratch/out Trace`, `java` launches the virtual machine. `-cp scratch/out` tells it where to search for classes. `Trace` names the class containing our entry method. The launcher calls `main` after loading the class. Do not append `.java` or `.class` to that class name in this two-command workflow.

### Make three distinct failures visible

1. Compile and run the original. Write `5` in your log as an observation, not just a prediction.
2. Change 3 to 9, save, compile again, then run. Expect `-1`. The program executed correctly according to its instructions, but whether that answer is acceptable depends on the requirement.
3. Change the number to the quoted text `"three"`. Save and compile. Expect an incompatible-types diagnostic: the compiler cannot put a text reference into an integer variable. Quotation marks are syntax for a string literal; the letters between them are the value.
4. If you run the old `java -cp ...` command after that failed compilation, an older successful `.class` may still exist. Its output does not prove the edited source compiled. Run only after the compiler succeeds.
5. Restore 3, remove the semicolon after its declaration, and compile again. The compiler reports a syntax problem. Inspect the reported line and the preceding line: a missing delimiter can make a later token appear wrong. Restore the semicolon and rebuild.

A **runtime exception** is different again: valid Java has begun executing but an operation cannot complete. The next step's argument access can produce one when an argument is missing. Classify the failure before editing: source syntax/type checking, class loading, execution, or incorrect business behavior. They have different causes.

### Transfer the reasoning

Temporarily call `remaining(completed, planned)` instead. Predict the output before rebuilding. It is `-5`: argument order places 3 in the first parameter and 8 in the second. Both inputs have the same type, so the compiler cannot identify your swapped business meanings. Restore the call afterward.

Now change `remaining` to print the subtraction but omit its `return`. Predict whether the caller receives the printed number. It does not: printing sends text to a stream. The compiler rejects a missing return from this integer-returning method. Restore it. Being able to explain this distinction matters when we later return data from an HTTP controller.

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

### Learn the input and decision tools first

Before the optional exercise, learn two operations that the guided application will also use: reading input and choosing a branch. Read this explanation even if you defer Capacity.

Running `java challenges/Capacity.java 8 3` uses Java's source-file launch mode: the launcher compiles this small source program for execution. The arguments following the filename arrive as text. `args.length` is 2. `args[0]` is the string `"8"`; `args[1]` is `"3"`. Array positions start at zero, so position 2 would be outside this array. Square brackets read one element; `.length` reads the array's size without calling a method.

`Integer.parseInt(args[0])` first reads the text at position zero, then asks Java's `Integer` library class to parse a decimal integer from it. The returned value is the integer 8, not the text `"8"`. `Integer` is a class name; `int` is the primitive numeric type. `parseInt` throws `NumberFormatException` for text such as `"eight"`. Reading a missing argument throws `ArrayIndexOutOfBoundsException` before parsing starts. The upcoming optional exercise supplies two valid integers; accepting arbitrary user input is a separate requirement.

A **boolean** has one of two values, `true` or `false`. A comparison such as `completed > planned` produces a boolean. With 3 and 8 it is false; with 8 and 3 it is true. An `if` statement evaluates a boolean and executes its body only when true. For example, `if (temperature < 0) { System.out.println("Freezing"); }` prints for -2 and skips printing for 4. `<` means strictly less than. Braces enclose the conditional body.

You can initialize a local variable with your computed answer, then conditionally assign a different value to that same variable. This is **reassignment**, using `=` without redeclaring its type. The program continues after the `if` regardless of which branch it took. Decide which line should print once after that decision. The example about temperature is a syntax example, not the capacity implementation: you still assemble this challenge yourself.


## Challenge — Capacity without a template

Trace the required cases first:

| Planned | Completed | Raw subtraction | Is the raw answer negative? | Required output |
|---|---|---|---|---|
| 8 | 3 | 5 | false | 5 |
| 3 | 8 | -5 | true | 0 |
| 0 | 0 | 0 | false | 0 |

If one case fails, locate the first table column where your execution differs. Do not add special cases for the three test inputs. Write one rule that explains all three and, for example, 12 completed out of 10 planned.

Write `challenges/Capacity.java` with a public class `Capacity` and `main`. Read planned and completed counts from `args` using `Integer.parseInt`. Print their difference, clamped to zero when completed exceeds planned. Do not use a library that implements the entire rule.

Examples: `8 3` prints `5`; `3 8` prints `0`; `0 0` prints `0`. Explain which values change, and why clamping would be wrong if a negative value represented debt in a different domain. Hint: an `if` selects a statement based on a boolean expression.

This is optional. Use **Defer and continue** to revisit it later. Do challenge experiments on a separate branch or in `challenges/`; subsequent lessons do not depend on your answer.

```check
run "java challenges/Capacity.java 8 3" stdout="5"
run "java challenges/Capacity.java 3 8" stdout="0"
run "java challenges/Capacity.java 0 0" stdout="0"
```
