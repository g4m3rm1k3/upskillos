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

Write `challenges/Limit.java` as a source-file program. It accepts a requested page size as its first argument. Print the number if it is between 1 and 100 inclusive; otherwise print `invalid`. Test -1, 0, 1, 100 and 101 before checking. How does a page-size limit protect resource use differently from a title limit?

If the boundary check fails, inspect `>` versus `>=`, and trace the boolean expression at exactly 100.

This is optional. Use **Defer and continue** to revisit it later. Do challenge experiments on a separate branch or in `challenges/`; subsequent lessons do not depend on your answer.

```check
run "java challenges/Limit.java 1" stdout="1"
run "java challenges/Limit.java 100" stdout="100"
run "java challenges/Limit.java 101" stdout="invalid"
run "java challenges/Limit.java 0" stdout="invalid"
```
