# Module 5: Templates & Operator Overloading — Generic `Stack<T>` and `Queue<T>`

## Why this module matters

Every structure you've built so far only holds `int`. That's obviously limiting — you'd have to copy-paste the whole class to hold `double` or `std::string` instead. Templates let the compiler generate a specialized version of a class or function for whatever type you actually use, written once. Operator overloading lets your custom types use the same clean syntax (`+`, `[]`, `<<`) as built-in types. This module's build: `Stack<T>` and `Queue<T>`, generic and pleasant to use.

---

## 1. Function templates

```cpp
template <typename T>
T maxOf(T a, T b) {
    return (a > b) ? a : b;
}

int x = maxOf(3, 7);          // T deduced as int
double y = maxOf(3.5, 2.1);   // T deduced as double
```

`template <typename T>` declares `T` as a placeholder type, filled in by the compiler based on the arguments you pass (**template argument deduction**) or explicitly (`maxOf<double>(3, 7)`). The compiler generates a real, concrete `maxOf(int, int)` and a real, concrete `maxOf(double, double)` — as if you'd written both by hand — at compile time. This is why it has zero runtime overhead (Module 4's trade-off table, revisited): by the time the program runs, there's no "generic" code left, just fully concrete functions.

---

## 2. Class templates: building `Stack<T>`

```cpp
// Stack.h  (recall Module 4.5: template code lives in the header)
#pragma once

template <typename T>
class Stack {
private:
    T* data;
    int capacity;
    int count;

    void grow() {
        int newCapacity = (capacity == 0) ? 1 : capacity * 2;
        T* newData = new T[newCapacity];
        for (int i = 0; i < count; i++) {
            newData[i] = data[i];
        }
        delete[] data;
        data = newData;
        capacity = newCapacity;
    }

public:
    Stack() : data(nullptr), capacity(0), count(0) {}

    ~Stack() { delete[] data; }

    Stack(const Stack& other)
        : data(new T[other.capacity]), capacity(other.capacity), count(other.count) {
        for (int i = 0; i < count; i++) data[i] = other.data[i];
    }

    Stack& operator=(const Stack& other) {
        if (this == &other) return *this;
        delete[] data;
        capacity = other.capacity;
        count = other.count;
        data = new T[capacity];
        for (int i = 0; i < count; i++) data[i] = other.data[i];
        return *this;
    }

    void push(const T& value) {
        if (count == capacity) grow();
        data[count] = value;
        count++;
    }

    void pop() {
        if (count == 0) throw std::out_of_range("pop from empty stack");
        count--;
    }

    T& top() {
        if (count == 0) throw std::out_of_range("top of empty stack");
        return data[count - 1];
    }

    bool empty() const { return count == 0; }
    int size() const { return count; }
};
```

Notice this is almost *exactly* your `DynamicArray` from Module 3, with `int` replaced by `T` everywhere, plus stack-specific naming (`push`/`pop`/`top` instead of `push_back`/array indexing) and a restricted interface (a stack should only expose its top — not arbitrary indexing — that restriction is the whole point of the abstraction). The Rule of Three still applies identically; templates don't change the memory-management rules at all, they just parameterize the type being managed.

```cpp
Stack<int> intStack;
intStack.push(5);

Stack<std::string> stringStack;
stringStack.push("hello");
```

### `Queue<T>` — built on the `LinkedList` pattern from Module 4

```cpp
// Queue.h
#pragma once

template <typename T>
class Queue {
private:
    struct Node {
        T value;
        Node* next;
        Node(const T& v) : value(v), next(nullptr) {}
    };

    Node* front_;
    Node* back_;
    int count;

public:
    Queue() : front_(nullptr), back_(nullptr), count(0) {}

    ~Queue() {
        while (front_ != nullptr) {
            Node* next = front_->next;
            delete front_;
            front_ = next;
        }
    }

    void push(const T& value) {
        Node* newNode = new Node(value);
        if (back_ == nullptr) {
            front_ = back_ = newNode;
        } else {
            back_->next = newNode;
            back_ = newNode;
        }
        count++;
    }

    void pop() {
        if (front_ == nullptr) throw std::out_of_range("pop from empty queue");
        Node* old = front_;
        front_ = front_->next;
        if (front_ == nullptr) back_ = nullptr;   // list is now empty
        delete old;
        count--;
    }

    T& front() {
        if (front_ == nullptr) throw std::out_of_range("front of empty queue");
        return front_->value;
    }

    bool empty() const { return count == 0; }
    int size() const { return count; }
};
```

A queue's `Node` struct is declared *nested inside* the `Queue` class (`private` even) — it's an implementation detail that has no meaning outside `Queue`, so hiding it there (rather than as a free-standing class like Module 4's `Node`) is good encapsulation. This class needs both a `front_` and `back_` pointer, unlike Module 4's `LinkedList`, specifically so `push` (adding at the back) is O(1) without walking the whole list.

### Trade-off: `Stack<T>` (array-backed) vs. `Queue<T>` (linked-list-backed) — why the difference?

- A **stack** only ever touches one end (the top) — an array-backed (dynamic array) implementation gives O(1) push/pop at that end with excellent cache locality, and never needs O(n) traversal for anything.
- A **queue** touches both ends (push at back, pop at front) — an array-backed implementation would need either O(n) shifting on `pop` (everything moves down) or a more complex circular-buffer scheme. A linked-list-backed implementation gets O(1) at both ends for free, at the cost of the linked list's usual cache-locality and per-node memory overhead downsides (Module 4's trade-off table).

This is a genuinely representative example of a broader DSA principle you'll see again: **the right underlying structure depends on which operations you need to be fast**, not on some universal "best" data structure.

---

## 3. Operator overloading

Without operator overloading, you'd write `stack.push(x)` — fine. But for some types, natural syntax matters more, especially comparison, arithmetic, indexing, and stream output.

```cpp
class Point {
public:
    double x, y;
    Point(double x, double y) : x(x), y(y) {}

    // operator+ : Point + Point -> Point
    Point operator+(const Point& other) const {
        return Point(x + other.x, y + other.y);
    }

    // operator== : Point == Point -> bool
    bool operator==(const Point& other) const {
        return x == other.x && y == other.y;
    }

    // operator[] : indexed access, e.g. p[0] for x, p[1] for y
    double& operator[](int index) {
        if (index == 0) return x;
        if (index == 1) return y;
        throw std::out_of_range("Point index must be 0 or 1");
    }
};

// operator<< usually defined OUTSIDE the class (it's not a method ON Point,
// it's a method ON std::ostream, taking a Point as its second argument)
std::ostream& operator<<(std::ostream& os, const Point& p) {
    os << "(" << p.x << ", " << p.y << ")";
    return os;
}
```

```cpp
Point a(1, 2), b(3, 4);
Point c = a + b;         // uses operator+
bool same = (a == b);    // uses operator==
std::cout << c;          // uses operator<<, prints "(4, 6)"
```

### Why `operator<<` is a free function, not a member

If it were a member of `Point`, the syntax would have to be `p << std::cout` (the object on the left has to be the one whose member function is called) — backwards from how streaming actually reads. Making it a free function taking `(ostream&, const Point&)` lets `std::cout << p` read naturally, matching how it works for every built-in type.

### Trade-off: which operators are worth overloading?

| Overload it when... | Don't overload it when... |
|---|---|
| The operation has an obvious, unambiguous mathematical/logical meaning for your type (`+` for a `Vector2D`, `==` for value comparison) | The "natural" meaning is genuinely unclear or would surprise a reader (e.g., what would `Stack + Stack` even mean?) |
| It meaningfully improves readability at call sites (`c = a + b` vs `c = a.add(b)`) | You're doing it just because you can — an unclear operator overload is worse than a clearly-named method |
| The type conceptually behaves like a value/number (`Point`, `Fraction`, `Matrix`) | The type represents a service or container-like abstraction where explicit method names communicate intent better |

You'll use `operator[]` again heavily when you write the `HashMap` in Module 8 — it's the mechanism behind `map[key] = value` syntax.

---

## 4. Template specialization (a preview, not a deep dive)

Sometimes the generic template body isn't right for one specific type. You can provide an override for that one case:

```cpp
template <typename T>
void printValue(T value) {
    std::cout << value;
}

template <>
void printValue<bool>(bool value) {
    std::cout << (value ? "true" : "false");   // special-cased for bool
}
```

We're not going deep on this now — it's a large topic on its own (and `std::vector<bool>`'s well-known quirks from Module 2 are actually a famous example of specialization gone slightly wrong) — but it's worth knowing this tool exists for when the generic version of a template genuinely isn't correct for one particular type.

---

## Practice Problems

1. **Build and test `Stack<T>`**: Implement the full `Stack<T>` above, and test it with three different types: `Stack<int>`, `Stack<double>`, `Stack<std::string>`. Confirm push/pop/top all behave correctly for each.

2. **Build and test `Queue<T>`**: Same, for `Queue<T>`. Write a small test that pushes 1,2,3 and confirms popping returns them in the same order (FIFO), unlike the stack's LIFO order.

3. **Exception safety check**: Call `.pop()` or `.top()`/`.front()` on an empty `Stack<int>`/`Queue<int>` and confirm the exception is thrown and catchable with `try`/`catch (const std::out_of_range& e)`.

4. **Implement `Point` fully**: Add `operator-`, `operator*` (scalar multiplication: `Point * double`), and `operator<<` as shown above. Write a small program computing a few vector sums and printing them.

5. **`operator[]` bounds test**: For your `Point::operator[]`, confirm that `p[0]` and `p[1]` work and that `p[2]` throws as expected.

6. **Generic `max` with a custom type**: Take the `maxOf` function template from section 1 and call it with two `Point` objects. It won't compile — figure out why (hint: what operator does `maxOf`'s body require that `Point` doesn't have?), then add the missing operator to `Point` to make it compile. This demonstrates that templates aren't "anything goes" — the type just has to support whatever operations the template body actually uses.

---

**Next: Module 6 — Move Semantics & Smart Pointers**, where you'll rebuild `DynamicArray` (or `Stack<T>`) with move semantics for performance, and rebuild the `LinkedList`'s ownership model using `unique_ptr` so memory safety is enforced by the type system instead of by discipline. Say "next module" when ready.
