---
title: TDD — a meaningful failure before implementation
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

A task title must contain visible text and be at most 80 Java characters after surrounding whitespace is removed. That last detail is a product choice: Java string length counts UTF-16 code units, not necessarily displayed characters. We document this first-release limit rather than pretending it is universally correct.

## Declare the seam before the solution

### Turn a sentence into a contract

Start with three concrete inputs: `"  Fix search  "` should become `"Fix search"`; spaces alone should be rejected; 81 `x` characters should be rejected. A **contract** states what callers may supply and what they may observe in return. Here the result is a normalized string on success and an exception on invalid input. We do not return an empty string for failure, because that could be mistaken for a successful normalized title.

`package workspace;` assigns this type its full name `workspace.Titles`. With Maven's source root, it lives at `src/main/java/workspace/Titles.java`. A package organizes names; it does not create a running process. Code in the same package can refer to `Titles` without importing it. `String` needs no explicit import because Java makes `java.lang` types available automatically.

`public final class Titles` exposes the type and prevents subclasses from extending it. The word `final` has context-dependent meanings: on this class it prevents inheritance, whereas on a variable it prevents reassignment. The private constructor `private Titles() {}` has the class's name and no return type. A **constructor** initializes a new object when `new` is used. We do not need individual `Titles` objects, so private access prevents callers constructing them. They call the static operation instead.

`normalize(String input)` receives a copy of a reference to text. A **reference** identifies an object, rather than storing its entire contents in the local variable. It can also be `null`, meaning no object. In contrast, the primitive `int` variables in Trace held numeric values directly. Calling a method through a null reference fails because there is no object on which to perform the operation.

### A compilable promise can still fail at execution

`new UnsupportedOperationException("Not implemented")` constructs an exception object carrying a message. `throw` stops normal execution and transfers control outward until a matching handler is found. If the test runner receives it unexpectedly, the test fails. This placeholder deliberately does not satisfy the contract.

The stub gives the test a method to call and valid types to compile against. We want red to mean “this observed behavior is missing,” not “the compiler cannot find the method.” Do not replace the exception with a fake value just to remove a red indicator. The failing observation is what will guide implementation.

A package names a group of types and corresponds to the folder path. `final` prevents subclassing; the private constructor prevents creating an instance of this utility. The public static method expresses the contract's input and output without solving it. Throwing an exception transfers control to a caller or fails the test; it does not return a placeholder that could accidentally satisfy a test.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/Titles.java`:

```java edit=src/main/java/workspace/Titles.java mode=replace
package workspace;

public final class Titles {
    private Titles() {}
    public static String normalize(String input) {
        throw new UnsupportedOperationException("Not implemented");
    }
}
```

## Turn examples into assertions

### Read a test as an executable claim

An **assertion** compares observed behavior with an expectation and fails the test if they disagree. JUnit calls each method marked `@Test`; your application launcher does not call them through `main`. `@Test void trimsSurroundingWhitespace()` combines metadata, a no-result return type, a descriptive method name and an empty parameter list. Each pair of braces encloses one test's statements.

`import org.junit.jupiter.api.Test;` lets this source use the annotation's short name. `import static org.junit.jupiter.api.Assertions.*;` imports static assertion methods; the asterisk selects all accessible static members from that class. It does not download code or execute every assertion. We use only the methods actually called below.

Follow `assertEquals("Fix search", Titles.normalize("  Fix search  "))` from the inside out. Java evaluates the expected string, then calls `normalize` to obtain the actual value, then calls `assertEquals` with those two values. Against the stub, `normalize` throws first, so the equality comparison is never reached. An unexpected exception is the intended initial failure for this positive case.

### Why an exception assertion receives an action

We want JUnit to observe an exception rather than let it escape before JUnit can inspect it. `() -> Titles.normalize("  ")` is a **lambda expression**: it describes an action to run later. Empty parentheses mean this action takes no arguments. The arrow separates its inputs from its body. Creating the action does not yet normalize the title.

`assertThrows(IllegalArgumentException.class, action)` calls that action inside JUnit's exception-handling code. `IllegalArgumentException.class` supplies a value representing the expected exception type, not an exception instance. JUnit passes this assertion only if the action throws that type or a subtype. Returning normally fails the assertion; throwing an unrelated exception also fails it. An implementation that always throws `UnsupportedOperationException` is therefore not “close enough.”

Contrast the execution orders:

| Form | Who runs normalization, and when? |
|---|---|
| `assertEquals(expected, Titles.normalize(input))` | Java evaluates normalization before entering the equality assertion |
| `assertThrows(type, () -> Titles.normalize(input))` | JUnit enters the exception assertion, then invokes the action |

The lambda is ordinary Java behavior used by a testing library. We will reuse callbacks for HTTP handlers and transactions; the essential question stays “who calls this action, and when?”

`"x".repeat(80)` calls a String method to create a string containing eighty copies of `x`. It is input construction, not our title validation. Testing 80 and 81 distinguishes `> 80` from `>= 80`. Spaces-only and null are different invalid inputs and need separate observations.

### Predict and inspect red

Predict which test fails first in its own execution and why. Each test should fail against the stub, but the runner need not execute methods in source order. Read the test name and exception type in Maven's report under `target/surefire-reports`. A missing import or unresolved artifact means the test never got far enough to establish behavioral red.

A small test set cannot establish every title rule. Later add a title with internal spaces: surrounding whitespace should disappear, while `"Fix  search"` retains its two internal spaces. The expected value should come from the contract, not from calling the implementation a second time.

`@Test` is metadata JUnit uses to discover a test method. A static import lets us call assertion methods without a class prefix. `assertEquals` compares an expected value with the actual result; order matters for readable diagnostics. The lambda `() -> ...` postpones a call so `assertThrows` can execute it and inspect the exception.

Run `mvn -Dtest=TitlesTest test`. It must fail because our method throws UnsupportedOperationException. A syntax error is not this intended red: first get valid code, then observe the missing behavior. Read the test name and cause, not just the red total.

Type this fragment yourself. Start an empty file at `src/test/java/workspace/TitlesTest.java`:

```java edit=src/test/java/workspace/TitlesTest.java mode=replace
package workspace;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class TitlesTest {
    @Test void trimsSurroundingWhitespace() {
        assertEquals("Fix search", Titles.normalize("  Fix search  "));
    }
    @Test void rejectsBlankAndNull() {
        assertThrows(IllegalArgumentException.class, () -> Titles.normalize("  "));
        assertThrows(IllegalArgumentException.class, () -> Titles.normalize(null));
    }
    @Test void checksTheBoundary() {
        assertEquals("x".repeat(80), Titles.normalize("x".repeat(80)));
        assertThrows(IllegalArgumentException.class, () -> Titles.normalize("x".repeat(81)));
    }
}
```

```check
run "mvn -q -Dtest=TitlesTest test" exit=1 timeout=180 -- Expected red: inspect the report for UnsupportedOperationException, not a compilation or download error.
```

## Implement only the specified behavior

### Trace validation in the order it must happen

`input == null` compares the reference with the special absent-reference value. `==` is equality comparison here; `=` would be assignment. If the comparison is true, the following `throw` exits normal execution before the next statement. An `if` can control one statement without braces; the later multi-statement-shaped block uses braces to make its boundary explicit.

Only after ruling out null do we call `input.strip()`. String objects are **immutable**: methods such as strip produce a result without changing the existing text object. Assign that result to `title` so later validation and the final return use the normalized value. Ignoring the return value would leave the original spaces in place.

`title.isEmpty()` returns a boolean indicating length zero. `title.length()` returns an integer. `title.length() > 80` compares that integer to the limit. `||` is logical OR: if the left condition is true, the whole condition is true and the right side is skipped. If the left is false, Java evaluates the right. This is **short-circuit evaluation**. There is no need to test length once emptiness has already established invalidity.

| Input | Null check | Value after strip | Empty or too long? | Outcome |
|---|---|---|---|---|
| `null` | true | Never evaluated | Never evaluated | Throw “Title required” |
| `"   "` | false | `""` | true, from emptiness | Throw length/content error |
| `"  Fix search  "` | false | `"Fix search"` | false | Return normalized text |
| 80 copies of `x` | false | Unchanged | false | Return text |
| 81 copies of `x` | false | Unchanged | true, from length | Throw length/content error |

**Predict:** what fails if you move `input.strip()` above the null check? A null argument throws `NullPointerException` before the intended exception can be constructed. Our exception assertion should catch this regression because the error type is part of the contract.

### Combine conditions in later rules

Logical AND, written `&&`, requires both conditions to be true. It skips the right side when the left is false. For example, checking `input != null && input.length() > 0` avoids calling length on an absent reference. OR skips its right side when the left is true; AND skips it when the left is false. Predict each side separately before combining them.

The comparisons `>=` and `<=` include equality, unlike `>` and `<`. An inclusive range needs a lower comparison and an upper comparison joined with AND. These operators belong to the guided foundation even if you defer the following range challenge; they reappear in request policies and retry limits.

### Refactor against evidence

First run the tests unchanged and see green. Then consider naming the limit. A constant declared as `private static final int MAX_TITLE_LENGTH = 80;` belongs to the class and cannot be reassigned; its uppercase name is a convention. Replace only the comparison's 80 with that name, rerun, and inspect the diff. Do not change the requirement or test expectation as part of this refactor.

Next deliberately replace `> 80` with `>= 80` on a practice branch. Predict which boundary assertion fails before running it. Restore the implementation afterward. This exercise establishes that the test distinguishes a plausible wrong implementation; simply obtaining green did not establish that.

Finally, consider a title containing an emoji. Java String length counts UTF-16 code units; some displayed symbols use two or more. A user-visible “80 characters” promise may therefore need a different counting rule. Record the first-release rule honestly. A test can faithfully enforce a requirement that is still the wrong product decision.

Replace the short stub. `null` means no reference, so test it before calling a method on the string. `strip` returns a string; it does not mutate the original String, which is immutable. `||` short-circuits: the second condition is evaluated only if the first is false. The local variable separates normalization from validation and avoids repeating an expression.

Run the same test command: green should mean the specified examples now hold. Refactoring changes structure while preserving behavior. Try extracting the maximum into a named constant, rerun tests, then decide whether it improved clarity. Avoid adding unrelated features while making this test pass.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/Titles.java`:

```java edit=src/main/java/workspace/Titles.java mode=replace
package workspace;

public final class Titles {
    private Titles() {}
    public static String normalize(String input) {
        if (input == null) throw new IllegalArgumentException("Title required");
        String title = input.strip();
        if (title.isEmpty() || title.length() > 80) {
            throw new IllegalArgumentException("Title must contain 1 to 80 characters");
        }
        return title;
    }
}
```

```check
run "mvn -q -Dtest=TitlesTest test" timeout=180
```

## Challenge — A different boundary

### Combine comparisons without adding special cases

From Capacity you know `args[0]`, `Integer.parseInt`, and `if`. This problem adds an inclusive interval: a valid number is at least 1 **and** at most 100. `>=` means greater than or equal; `<=` means less than or equal. `&&` means both boolean conditions must be true. It short-circuits when its left side is false because the whole conjunction is then false.

Alternatively, invalidity means below the lower bound **or** above the upper bound, using `||`. Choose one formulation and keep the printed branch consistent with it. An `else` following an `if` supplies the branch executed when its condition is false. Exactly one of those two bodies runs.

Before coding, write the two comparison results for 0, 1, 100 and 101. At 100, “at most 100” is true. If you reject it, examine the equality part of your operator. This is a general boundary technique you can reuse for sizes, dates and permissions.

Write `challenges/Limit.java` as a source-file program. It accepts a requested page size as its first argument. Print the number if it is between 1 and 100 inclusive; otherwise print `invalid`. Test -1, 0, 1, 100 and 101 before checking. How does a page-size limit protect resource use differently from a title limit?

If the boundary check fails, inspect `>` versus `>=`, and trace the boolean expression at exactly 100.

This is optional. Use **Defer and continue** to revisit it later. Do challenge experiments on a separate branch or in `challenges/`; subsequent lessons do not depend on your answer.

```check
run "java challenges/Limit.java 1" stdout="1"
run "java challenges/Limit.java 100" stdout="100"
run "java challenges/Limit.java 101" stdout="invalid"
run "java challenges/Limit.java 0" stdout="invalid"
```
