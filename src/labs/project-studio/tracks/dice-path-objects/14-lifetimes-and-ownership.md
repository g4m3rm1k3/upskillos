---
title: A14 — Trace when an object stops existing
track: C++ Games — Objects and Files
trackOrder: 4.2
runtime: cpp
console: true
---

**Outcome:** predict and verify destructor order on ordinary scope exit and early return. Recall A11: when does a constructor run? Draw the scopes before opening the first example.

A saved model will need its file closed even when a function returns early. First isolate the mechanism that makes cleanup possible. Files, pointers and copy restrictions each get their own lesson after this one.

## Observe the end of a lifetime

Create explore/lifetime.cpp. A **lifetime** is the interval in which an object exists. A **destructor**, written ~Trace(), runs when a fully constructed local object’s lifetime ends. It has no return type or arguments. Nested braces create a scope. Locals are destroyed in reverse construction order as their scopes end.

```predict
question: Which object ends first?
choice: The inner object 2
choice: The outer object 1
answer: The inner object 2
explain: The inner scope ends while the outer object is still alive.
```


**Edit `explore/lifetime.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/lifetime.cpp
#include <iostream>
struct Trace {
    int id;
    explicit Trace(int value) : id(value) { std::cout << "begin " << id << '\n'; }
    ~Trace() { std::cout << "end " << id << '\n'; }
};
int main() {
    Trace first{1};
    {
        Trace second{2};
        std::cout << "inside\n";
    }
    std::cout << "outside\n";
    return 0;
}
```

| Event | Objects still alive afterwards |
|---|---|
| Construct first | 1 |
| Enter block, construct second | 1, 2 |
| Leave inner block | 1 |
| Return from main | none |

The destructor runs at scope exit, not at the last place you read the object. Its printed message lets you observe that event.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/lifetime.cpp -o lesson
./lesson
```

Expected output:

```text
begin 1
begin 2
inside
end 2
outside
end 1
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/lifetime.cpp -o lesson"
run "./lesson" stdout="begin 1\nbegin 2\ninside\nend 2\noutside\nend 1\n"
```

## An early return still leaves scopes {#early-return}

Add return 0 inside the inner block. It exits main, so both live local objects must finish. Predict whether outside will print before you run. This is normal return, not abrupt process termination; the distinction matters for cleanup.

**Edit `explore/lifetime.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/lifetime.cpp
#include <iostream>
struct Trace {
    int id;
    explicit Trace(int value) : id(value) { std::cout << "begin " << id << '\n'; }
    ~Trace() { std::cout << "end " << id << '\n'; }
};
int main() {
    Trace first{1};
    {
        Trace second{2};
        std::cout << "leaving early\n";
        return 0;
    }
    std::cout << "outside\n";
    return 0;
}
```

Execution prints leaving early, destroys second, then destroys first. The outside print is skipped. Moving return changes which statements run, but it does not bypass destruction of these fully constructed locals.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/lifetime.cpp -o lesson
./lesson
```

Expected output:

```text
begin 1
begin 2
leaving early
end 2
end 1
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/lifetime.cpp -o lesson"
run "./lesson" stdout="begin 1\nbegin 2\nleaving early\nend 2\nend 1\n"
```

## Try it — Reverse the construction order {#reverse-order}

Inside one pair of braces, construct Trace alpha{3}; then Trace beta{8};. Predict the final two lines. Run and then swap the declarations. The last-created object in that scope is destroyed first. Restore the guided file. Explain why object names do not control destruction order.



## Your turn — Trace a helper returning to its caller {#lifetime-transfer}

**No solution is shown.** Create `practice/lifetime_trace.cpp` yourself. Create your own Trace type that prints begin ID in its constructor and end ID in its destructor. main reads 0 or 1 and creates object 1. A void helper visit(bool early) creates object 2, then returns immediately if early is true; otherwise it prints work. After the helper returns, main prints back. Do not print destruction messages from main or visit: the destructor owns them.

| Input | Required output | Exit status |
|---|---|---|
| 0 | begin 1 / begin 2 / work / end 2 / back / end 1 | 0 |
| 1 | begin 1 / begin 2 / end 2 / back / end 1 | 0 |
| word | (no required output) | 1 |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/lifetime_trace.cpp -o lesson
./lesson
```

```hints
nudge: A helper returning does not end main’s scope.
concept: Object 2 is local to visit. Object 1 remains alive when back prints.
shape: Define the trace type, implement visit, then let main own the outer object and call the helper.
```


**Ready to move on:** hide the source and draw the lifetime intervals for both inputs. Then move object 1 into a nested block and predict the changed output before compiling. Output tests do not prove that destruction is automatic; point to the destructor and show that changing a scope changes the trace without moving a print statement.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/lifetime_trace.cpp -o lesson"
run "./lesson" stdin="0\n" stdout="begin 1\nbegin 2\nwork\nend 2\nback\nend 1\n"  without="begin 1\nbegin 2\nend 2\nback\nend 1\n"
run "./lesson" stdin="1\n" stdout="begin 1\nbegin 2\nend 2\nback\nend 1\n"  without="begin 1\nbegin 2\nwork\nend 2\nback\nend 1\n"
run "./lesson" stdin="word\n" exit=1 without="begin 1\nbegin 2\nwork\nend 2\nback\nend 1\n"
```

