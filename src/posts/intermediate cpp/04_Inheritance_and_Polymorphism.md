# Module 4: Inheritance & Polymorphism — Shape Hierarchy + Intro Linked List

## Why this module matters

Inheritance and virtual functions are how C++ implements *runtime* polymorphism — code that works correctly on objects whose exact type isn't known until the program runs. This module has two builds: a polymorphic `Shape` hierarchy (the classic teaching example, done properly with the gotchas explained) and the start of a `LinkedList`, where the `Node*` pattern from Module 1 becomes a real, working structure.

---

## 1. Basic inheritance

```cpp
class Shape {
protected:
    std::string name;
public:
    Shape(std::string n) : name(n) {}
    virtual double area() const { return 0.0; }
    virtual ~Shape() {}   // see section 4 — this is NOT optional
};

class Circle : public Shape {
private:
    double radius;
public:
    Circle(double r) : Shape("Circle"), radius(r) {}
    double area() const override { return 3.14159265 * radius * radius; }
};

class Rectangle : public Shape {
private:
    double width, height;
public:
    Rectangle(double w, double h) : Shape("Rectangle"), width(w), height(h) {}
    double area() const override { return width * height; }
};
```

**`protected`** is like `private`, but visible to derived classes too (external code still can't touch it). Use it sparingly — it's a weaker encapsulation guarantee than `private`, since any subclass can now depend on and potentially break the base class's internal state.

**`: Shape("Circle")`** in `Circle`'s initializer list calls the *base class* constructor — base class subobjects must be constructed before the derived class's own members, and the initializer list is where you control what gets passed to that base constructor.

---

## 2. Virtual functions and why they matter

Without `virtual`, C++ resolves which function to call based on the **static type** (the declared type of the variable/pointer), not the actual object. With `virtual`, it resolves based on the **dynamic type** (the actual object's type) — resolved at runtime.

```cpp
Shape* s = new Circle(5.0);
std::cout << s->area();   // WITH virtual: calls Circle::area() (5.0*5.0*pi)
                            // WITHOUT virtual: calls Shape::area() (0.0) -- wrong!
```

This is the entire point: `s` is declared as `Shape*`, but it's actually pointing at a `Circle`. `virtual` says "look at what this actually is at runtime, not what the pointer type claims it is."

### How it works: the vtable (conceptually)

```
Circle object in memory:
+------------------+
| vtable pointer  --+--> [ Circle::area ]
+------------------+     [ Circle::~Circle ]
| radius           |
+------------------+

Rectangle object in memory:
+------------------+
| vtable pointer  --+--> [ Rectangle::area ]
+------------------+     [ Rectangle::~Rectangle ]
| width            |
| height           |
+------------------+
```

Every object of a class with virtual functions carries a hidden pointer to a **vtable** — a per-class table of function pointers. Calling a virtual function is: follow the object's vtable pointer, look up the right slot, call that function. This costs one extra pointer indirection per call compared to a normal function call — small, but not zero, which matters for the trade-off discussion below.

### `override` — always use it

```cpp
double area() const override { ... }
```

`override` isn't required by the compiler, but you should treat it as if it is. It tells the compiler "I intend to override a base class virtual function — error out if I got the signature wrong" (wrong parameter types, missing `const`, misspelled name). Without it, a typo silently creates a brand-new, unrelated function instead of overriding — and you get no warning, just a confusing bug where polymorphism "doesn't work."

---

## 3. Pure virtual functions and abstract classes

```cpp
class Shape {
protected:
    std::string name;
public:
    Shape(std::string n) : name(n) {}
    virtual double area() const = 0;   // PURE virtual — no implementation, forces subclasses to provide one
    virtual ~Shape() {}
};
```

`= 0` makes `area()` a **pure virtual function**, and any class with at least one pure virtual function is an **abstract class** — you cannot instantiate it directly (`Shape s;` won't compile), only through a derived class that implements every pure virtual function. This is the correct design here: there's no sensible "area of a generic Shape," so the base class shouldn't pretend to have one — it should force every concrete subclass to define it.

### Trade-off: pure virtual (interface) vs. virtual with a default implementation

| | Pure virtual (`= 0`) | Virtual with default body |
|---|---|---|
| Meaning | "Every subclass MUST provide this" | "Here's a sensible default; override only if you need to" |
| Can the base class be instantiated? | No | Yes |
| Use when | The base concept has no meaningful default behavior | Most subclasses will share behavior, a few need to customize |

---

## 4. Virtual destructors — the trap that will bite you if you skip it

```cpp
class Shape {
public:
    ~Shape() { /* not virtual! */ }   // BUG waiting to happen
};

Shape* s = new Circle(5.0);
delete s;   // only ~Shape() runs, NOT ~Circle()!
            // if Circle owned heap memory, it just leaked
```

If a base class destructor isn't `virtual`, deleting a derived object through a base pointer only calls the base class's destructor — the derived class's destructor (and any cleanup it does) is silently skipped. This is one of the most common real-world C++ bugs.

**Rule**: if a class has *any* virtual function, give it a virtual destructor too, even if it does nothing (`virtual ~Shape() {}`). This costs nothing extra (the vtable already exists) and closes off an entire category of bug.

---

## 5. Object slicing

```cpp
void printArea(Shape s) {   // takes by VALUE, not by pointer/reference
    std::cout << s.area();  // always calls Shape::area() — the "Circle-ness" is gone
}

Circle c(5.0);
printArea(c);   // c gets SLICED down to just its Shape part
```

When you pass or assign a derived object *by value* into a base-typed variable, only the base class portion gets copied — the derived-specific data and vtable pointer are lost. This is why polymorphism only works through pointers or references (`Shape*` or `Shape&`), never by value. Keep this in the front of your mind: **polymorphic code almost always uses pointers/references, not by-value parameters.**

### Trade-off: virtual functions vs. templates (static polymorphism)

Virtual functions give you *runtime* flexibility (decide the type at runtime, store different types in the same container) at the cost of a small per-call overhead and an extra pointer per object. Templates (Module 5) give you *compile-time* polymorphism — zero runtime overhead, the compiler generates a specialized version per type — but you must know the type at compile time, and you can't put different template instantiations in the same container without extra machinery.

| | Virtual functions | Templates |
|---|---|---|
| When type is decided | Runtime | Compile time |
| Runtime overhead | Small (vtable lookup) | None |
| Can mix types in one container | Yes (`std::vector<Shape*>`) | Not directly |
| Compile time / binary size | Smaller | Can grow (one instantiation per type used) |
| Use when | You genuinely don't know the type until runtime (e.g., reading shape data from a file) | You know the type at compile time and want max performance |

---

## 6. Starting the Linked List: `Node*` made real

```cpp
struct Node {
    int value;
    Node* next;
    Node(int v) : value(v), next(nullptr) {}
};

class LinkedList {
private:
    Node* head;
    int count;
public:
    LinkedList() : head(nullptr), count(0) {}

    ~LinkedList() {
        Node* current = head;
        while (current != nullptr) {
            Node* next = current->next;   // save next BEFORE deleting current
            delete current;
            current = next;
        }
    }

    void push_front(int value) {
        Node* newNode = new Node(value);
        newNode->next = head;
        head = newNode;
        count++;
    }

    void print() const {
        Node* current = head;
        while (current != nullptr) {
            std::cout << current->value << " -> ";
            current = current->next;
        }
        std::cout << "nullptr\n";
    }
};
```

```
push_front(3), then push_front(1):

Step 1: head -> [3|nullptr]

Step 2: newNode = [1|?]
        newNode->next = head   ->  [1| ] -> [3|nullptr]
        head = newNode          ->  head now points to [1]

Result: head -> [1] -> [3] -> nullptr
```

Notice the destructor here does exactly what Module 1's manual-memory-management practice demanded — walks the whole structure and frees every node — except now it's guaranteed to run automatically (RAII again), and you can never forget it because it's tied to the `LinkedList` object's lifetime, not scattered across every place the list might go out of scope.

**Why save `next` before deleting `current`?** Because once you `delete current`, reading `current->next` is a use-after-free (Module 1's dangling pointer bug) — you'd be dereferencing freed memory.

### Trade-off: `LinkedList` vs. `DynamicArray` (from Module 3)

| | `DynamicArray` | `LinkedList` |
|---|---|---|
| Random access (`arr[i]`) | O(1) | O(n) — must walk from head |
| Insert/remove at front | O(n) — shift everything | O(1) |
| Insert/remove at back | O(1) amortized | O(1) if you track a tail pointer, else O(n) |
| Memory overhead per element | None extra | One pointer (`next`) per element |
| Cache locality | Excellent (contiguous memory) | Poor (nodes scattered across the heap) |

That cache locality point is easy to underestimate: even though both are "O(1) at the front" in different scenarios, in practice `DynamicArray`/`std::vector` frequently outperforms a linked list for many workloads because contiguous memory plays much better with CPU cache prefetching. Linked lists earn their place when you need guaranteed O(1) insertion/removal at arbitrary positions *given a pointer to that position* (you'll see this matter more once you compare against trees and hash tables later in the series).

---

## Practice Problems

1. **Break polymorphism on purpose**: Remove `virtual` from `Shape::area()`, keep everything else the same, and call `area()` through a `Shape*` pointing at a `Circle`. Confirm you get `Shape`'s behavior (0.0), not `Circle`'s. Add `virtual` back and confirm it's fixed.

2. **Trigger the destructor bug**: Remove `virtual` from `~Shape()`, give `Circle` a member that allocates heap memory in its constructor and frees it in its destructor, then `delete` a `Circle` through a `Shape*`. Run under AddressSanitizer and read the leak report. Add `virtual` back and confirm the leak disappears.

3. **Slicing demo**: Write `printArea(Shape s)` (by value) and call it with a `Circle`. Confirm (with a debug print in each `area()` override) that it always calls `Shape::area()`. Fix it by changing the parameter to `const Shape&`.

4. **Extend the Shape hierarchy**: Add a `Triangle` class and a pure virtual `perimeter()` method to the base class. Write a function that takes a `std::vector<Shape*>` and prints the total area and perimeter across all shapes — this is polymorphism doing real work, processing mixed types through one interface.

5. **Extend the Linked List**: Add `push_back` (requires walking to the end, or track a `tail` pointer for O(1) — try both and compare), `pop_front`, and a `find(int value)` that returns whether a value exists.

6. **Reverse the list**: Implement `void reverse()` that reverses a `LinkedList` in place, using only pointer manipulation (no extra array/copy). This is one of the most common DSA interview questions, and it's a direct test of whether the pointer mental model from Module 1 has actually stuck.

---

**Next: Module 5 — Templates & Operator Overloading**, where you'll make your `Stack` and `Queue` generic (work for any type, not just `int`) and add clean operator syntax. Say "next module" when ready.
