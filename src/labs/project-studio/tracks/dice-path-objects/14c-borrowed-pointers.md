---
title: A14c — Borrow an object that is still alive
track: C++ Games — Objects and Files
trackOrder: 4.2
runtime: cpp
console: true
---

**Outcome:** pass an optional object to a function and guard the absent case before access. Recall A06: a reference aliases an existing object. Recall A14: names outside a scope cannot keep its local objects alive.

Graphics APIs often identify an object through a pointer. Learn that mechanism with ordinary integers first; this lesson allocates no heap memory and owns no library handles.

## An address names a live object

Create explore/borrow.cpp. A **pointer** stores an address or a null value. int* declares a pointer to int. In the expression &pot, & obtains the address of the live pot. The expression *borrowed **dereferences** the pointer: it names the integer at that address. int& from A06 instead declared a reference; punctuation means different operations in different contexts.

**Edit `explore/borrow.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/borrow.cpp
#include <iostream>

int main() {
    int pot = 5;
    int* borrowed = &pot;
    std::cout << "value=" << *borrowed << '\n';
    return 0;
}
```

Draw one integer box labelled pot, and a pointer whose arrow reaches it. Reading *borrowed reads pot. The pointer is not a copy of the integer’s current value.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/borrow.cpp -o lesson
./lesson
```

Expected output:

```text
value=5
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/borrow.cpp -o lesson"
run "./lesson" stdout="value=5\n"
```

## Mutation reaches the pointed-to object

```predict
question: What value does the print now read?
choice: 8
choice: 5
answer: 8
explain: The assignment names pot through its pointer.
```


**Edit `explore/borrow.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/borrow.cpp
#include <iostream>

int main() {
    int pot = 5;
    int* borrowed = &pot;
    *borrowed = 8;
    std::cout << "value=" << *borrowed << '\n';
    return 0;
}
```

This is **borrowing**: access without responsibility for destroying the object. pot’s scope controls its storage. borrowed must not delete it. Nothing here calls new or requires delete.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/borrow.cpp -o lesson
./lesson
```

Expected output:

```text
value=8
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/borrow.cpp -o lesson"
run "./lesson" stdout="value=8\n"
```

## Absence must be checked before access

**nullptr** means the pointer names no object. Assigning it changes the pointer, not the earlier integer. The guard checks before dereferencing. Never dereference a null pointer or a pointer to an object whose lifetime has ended.

**Edit `explore/borrow.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=explore/borrow.cpp
#include <iostream>

int main() {
    int pot = 5;
    int* borrowed = &pot;
    borrowed = nullptr;
    if (borrowed != nullptr) std::cout << "value=" << *borrowed << '\n';
    else std::cout << "no object\n";
    std::cout << "pot=" << pot << '\n';
    return 0;
}
```

The print reports no object and pot remains 5. Null is a usable representation for “nothing selected”; it is not an object with value zero.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic explore/borrow.cpp -o lesson
./lesson
```

Expected output:

```text
no object
pot=5
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic explore/borrow.cpp -o lesson"
run "./lesson" stdout="no object\npot=5\n"
```

## Try it — Rebind while both objects live

Add int other = 2; in main. Before the guard set borrowed = &other; and run. Predict which value prints and whether pot changes. Then draw an invalid example on paper: taking an inner block’s local address and using it after the block ends. That pointer would be **dangling**. Identify the lifetime error without running it; undefined behavior has no promised output.



## Your turn — Award only a selected player

**No solution is shown.** Create `practice/borrowed_award.cpp` yourself. Write bool award(int* score, int amount). Return false without mutation for null or an amount outside 1 through 6. Otherwise add into the pointed-to integer and return true. main starts scores at 3 and 7, reads seat and amount, and selects the first score for seat 1, the second for seat 2, or no object for seat 0. Inputs use these three seat values. Print acceptance and both scores. Do not create a copied score to stand in for the selected object.

| Input | Required output | Exit status |
|---|---|---|
| 1 4 | accepted=1 first=7 second=7 | 0 |
| 2 3 | accepted=1 first=3 second=10 | 0 |
| 0 2 | accepted=0 first=3 second=7 | 0 |
| 1 0 | accepted=0 first=3 second=7 | 0 |
| 2 7 | accepted=0 first=3 second=7 | 0 |

Build and run using the commands below. For an interactive run, type one example input and press Enter.

```text
g++ -std=c++20 -Wall -Wextra -pedantic practice/borrowed_award.cpp -o lesson
./lesson
```

```hints
nudge: Check absence before dereferencing.
concept: The parameter copies the pointer value, but still points to the caller’s integer.
shape: Choose an address while both scores live, then mutate through *score only after validation.
```


**Ready to move on:** draw the pointer and both integer objects for every seat. Explain why copying the pointer does not copy the pointed-to object, why null must be checked, and why this borrower owns no cleanup.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic practice/borrowed_award.cpp -o lesson"
run "./lesson" stdin="1 4\n" stdout="accepted=1 first=7 second=7\n"  without="accepted=1 first=3 second=10\n"
run "./lesson" stdin="2 3\n" stdout="accepted=1 first=3 second=10\n"  without="accepted=1 first=7 second=7\n"
run "./lesson" stdin="0 2\n" stdout="accepted=0 first=3 second=7\n"  without="accepted=1 first=7 second=7\n"
run "./lesson" stdin="1 0\n" stdout="accepted=0 first=3 second=7\n"  without="accepted=1 first=7 second=7\n"
run "./lesson" stdin="2 7\n" stdout="accepted=0 first=3 second=7\n"  without="accepted=1 first=7 second=7\n"
```

