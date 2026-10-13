---
title: Side lab — references and const references
track: Start here — one file before classes
runtime: none
---

Trace a value parameter and a reference parameter, then choose which contract a function needs.

## Two names, one object

Suppose die holds 2. A copy gets its own 2; a reference is another name for the existing die. In a declaration, `int& face` means reference to int. It must be initialized to refer to an object. Assignment through it changes that object; assignment does not reseat the reference.

`void` means this function returns no result value. `const int&` borrows an integer while preventing mutation through that reference. It does not freeze all other names for the object. For an ordinary int, passing by value is usually clearer; the const-reference example prepares you for larger objects such as a scorecard.

Create the scratch folder before creating this experiment. It has its own main, so compile it alone.

```cpp file=scratch/references.cpp
#include <iostream>

void changeCopy(int face) {
    face = 6;
    std::cout << "Copy: " << face << '\n';
}
void changeOriginal(int& face) {
    face = 6;
}
int readFace(const int& face) {
    return face;
}
int main() {
    int die = 2;
    changeCopy(die);
    std::cout << "After copy: " << die << '\n';
    changeOriginal(die);
    std::cout << "After reference: " << readFace(die) << '\n';
}
```

```check
run "g++ -std=c++17 -Wall -Wextra -Wpedantic scratch/references.cpp -o intro_check" label="Compile the example"
run "./intro_check" stdout="After reference: 6" label="Observe the result"
```

```predict
question: int a = 2; int b = 5; int& r = a; r = b; Which object changes?
choice: a becomes 5; r still refers to a
choice: r stops referring to a and refers to b
answer: a becomes 5; r still refers to a
explain: The assignment copies b's value into the object named by r. References do not reseat.
```

## Trace lifetimes and return types

The reference parameter exists only during the call; the caller's die survives the call. Never return a reference to a local variable: the local object dies when the function ends, leaving a dangling reference. Returning a small calculated int by value is safe.

A borrowed `const int& view = die` sees later changes made through `die`. The const belongs to the permitted access path. It does not mean snapshot. By contrast `const int snapshot = die` makes an independent read-only copy.

## Try it — Let the compiler explain the contract

Add `face = 1;` inside readFace and compile. Assignment is rejected through a const reference. Remove it. Then change changeOriginal's parameter to a plain int and observe the caller remain 2. Restore the reference. Explain the outcome without saying C++ randomly ignored your assignment.

## Your turn — Explain and change it

Write swapFaces(int& a, int& b). Test 2/6 becomes 6/2, and test passing the same variable twice leaves it unchanged. Explain why two value parameters cannot perform this job.

```hints
nudge: Preserve one old value before overwriting it.
concept: Both references name caller-owned objects. They can even name the same object.
shape: Use a temporary int for a, assign b into a, then the temporary into b. Compile the scratch file alone and print both results.
```
