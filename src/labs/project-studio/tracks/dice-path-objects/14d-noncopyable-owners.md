---
title: A14d — One owner, one release
track: C++ Games — Objects and Files
trackOrder: 4.2
runtime: cpp
console: true
---

**Outcome:** explain a resource owner’s scope and deliberately forbid its copying. Recall A14b: which object closes an open file? Recall A07: an ordinary value copy is independent.

An open file is not just an integer value: two objects must not both assume responsibility for closing one underlying resource. Start with an explicit teaching trace, then check the real standard stream restriction.

## Observe one acquisition and release

Create explore/unique_marker.cpp. This type prints ownership events; it does not actually open a file or acquire a GPU resource. Its name alone does not yet make it noncopyable. The default constructor takes no arguments; the destructor reports scope exit.

**Edit `explore/unique_marker.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/unique_marker.cpp
#include <iostream>
class UniqueMarker {
public:
    UniqueMarker() { std::cout << "acquire\n"; }
    ~UniqueMarker() { std::cout << "release\n"; }
};
int main() {
    UniqueMarker marker;
    return 0;
}
```

The trace gives one acquire and one release. This is the intended balance for one owner. Next intentionally copy it to expose the defect.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/unique_marker.cpp -o lesson
./lesson
```

Expected output:

```text
acquire
release
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/unique_marker.cpp -o lesson"
run "./lesson" stdout="acquire\nrelease\n"
```

## Default copying does not reacquire a resource

```predict
question: Does default copying call our no-argument constructor again?
choice: No
choice: Yes
answer: No
explain: It uses the implicitly generated copy constructor, not our no-argument constructor.
```


**Edit `explore/unique_marker.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/unique_marker.cpp
#include <iostream>
class UniqueMarker {
public:
    UniqueMarker() { std::cout << "acquire\n"; }
    ~UniqueMarker() { std::cout << "release\n"; }
};
int main() {
    UniqueMarker marker;
    { UniqueMarker copy = marker; }
    return 0;
}
```

The trace now has one acquire and two releases. The implicit **copy constructor** creates an object from another of the same type. For this empty teaching type it has no data to copy, but both objects still run destructors. A real owner needs an explicit copying policy.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/unique_marker.cpp -o lesson
./lesson
```

Expected output:

```text
acquire
release
release
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/unique_marker.cpp -o lesson"
run "./lesson" stdout="acquire\nrelease\nrelease\n"
```

## Declare both copying operations unavailable

Remove the copy and add two declarations. UniqueMarker(const UniqueMarker&) names the copy constructor. operator= names **copy assignment**, which would replace an already existing object from another object. Its usual return type is a reference to that object. = delete makes each operation unavailable at compile time. We are declaring a restriction, not implementing an operator.

**Edit `explore/unique_marker.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/unique_marker.cpp
#include <iostream>
class UniqueMarker {
public:
    UniqueMarker() { std::cout << "acquire\n"; }
    UniqueMarker(const UniqueMarker&) = delete;
    UniqueMarker& operator=(const UniqueMarker&) = delete;
    ~UniqueMarker() { std::cout << "release\n"; }
};
int main() {
    UniqueMarker marker;
    return 0;
}
```

Valid ownership again prints one acquire and one release. An attempt to copy now fails before execution. Moving ownership is a separate operation; it will be taught before SDL owners need it, not squeezed into this lesson.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/unique_marker.cpp -o lesson
./lesson
```

Expected output:

```text
acquire
release
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/unique_marker.cpp -o lesson"
run "./lesson" stdout="acquire\nrelease\n"
```

## Try it — Verify both restrictions

Temporarily restore UniqueMarker copy = marker; and compile: expect a deleted-copy-constructor diagnostic. Remove it, construct a separate second object and try second = marker;: expect a deleted-assignment diagnostic. Restore the working file. Repeat the creation-copy experiment with std::ofstream from A14b; the standard file stream already disallows copying. Do not remove = delete to silence an ownership error.



## Your turn — A visit releases on both return paths

**No solution is shown.** Create `practice/visit.cpp` yourself. Create a noncopyable Visit type that prints enter on construction and leave on destruction. Forbid both creation by copying and copy assignment. Write a helper that creates one Visit, returns early when its boolean argument is true, otherwise prints work. main reads 0 or 1, calls the helper and then prints back. As with the marker this is a lifetime model, not an actual external resource.

| Input | Required output | Exit status |
|---|---|---|
| 0 | enter / work / leave / back | 0 |
| 1 | enter / leave / back | 0 |
| word | (no required output) | 1 |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/visit.cpp -o lesson
./lesson
```

```hints
nudge: The owner belongs to the helper’s scope.
concept: Two separate copy operations need restrictions.
shape: Use construction and destruction for the trace, return for the short path, and explicit deleted declarations for copying.
```


**Design check:** temporarily try both copying forms in your program and inspect each compiler diagnostic, then restore and rerun. The output checks verify lifetime traces, not the deleted declarations: this compile-error experiment is required evidence.

**Section transfer:** explain why a returned score snapshot is safe to copy while an owner may forbid copying. Identify an owner, a borrower and the lifetime boundary in the file example. Continue to A15 only when those explanations work with the examples hidden.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/visit.cpp -o lesson"
run "./lesson" stdin="0\n" stdout="enter\nwork\nleave\nback\n"  without="enter\nleave\nback\n"
run "./lesson" stdin="1\n" stdout="enter\nleave\nback\n"  without="enter\nwork\nleave\nback\n"
run "./lesson" stdin="word\n" exit=1 without="enter\nwork\nleave\nback\n"
```

