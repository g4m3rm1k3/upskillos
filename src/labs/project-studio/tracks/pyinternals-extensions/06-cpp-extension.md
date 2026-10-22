---
title: 6 — C++ Extensions with pybind11
track: Writing C Extensions for Python
trackOrder: 12
runtime: cpp
console: true
---

The Python C API is powerful but verbose — every function binding, every exception, every type conversion requires dozens of lines of boilerplate. **pybind11** is a header-only C++11 library that generates all of that glue automatically, letting you focus on the C++ logic itself. It is the standard choice for binding new C++ code to Python.

## Step 1 — Why pybind11? A Direct Comparison

**This step:** see the same function written with the raw C API and with pybind11, side by side.

Both snippets expose a function `add(a: int, b: int) -> int` to Python:

```c
/* RAW C API — 20+ lines for a trivial function */
#include <Python.h>

static PyObject *
mymod_add(PyObject *self, PyObject *args)
{
    int a, b;
    if (!PyArg_ParseTuple(args, "ii", &a, &b))
        return NULL;
    return PyLong_FromLong(a + b);
}

static PyMethodDef methods[] = {
    {"add", mymod_add, METH_VARARGS, "Add two integers."},
    {NULL, NULL, 0, NULL}
};
static struct PyModuleDef moddef = {
    PyModuleDef_HEAD_INIT, "mymod", NULL, -1, methods
};
PyMODINIT_FUNC PyInit_mymod(void) { return PyModule_Create(&moddef); }
```

```cpp
/* pybind11 — 6 lines */
#include <pybind11/pybind11.h>
namespace py = pybind11;

int add(int a, int b) { return a + b; }

PYBIND11_MODULE(mymod, m) {
    m.def("add", &add, "Add two integers.");
}
```

pybind11 reads the C++ function signature at compile time (via templates) and generates the `PyArg_ParseTuple` / `PyLong_FromLong` calls automatically. Type errors raised at the Python call site are precise `TypeError` messages.

## Step 2 — Install pybind11 and Write a Minimal Module

**This step:** install pybind11 and compile a working "hello world" extension.

```text
$ pip install pybind11
```

Finding the include path:

```text
$ python3 -c "import pybind11; print(pybind11.get_include())"
```

Minimal source file (`hello.cpp`):

```cpp
#include <pybind11/pybind11.h>
namespace py = pybind11;

std::string greet(const std::string &name)
{
    return "Hello, " + name + "!";
}

PYBIND11_MODULE(hello, m)
{
    m.doc() = "A minimal pybind11 extension.";
    m.def("greet", &greet, "Return a personalised greeting.");
}
```

Compile manually (Linux/macOS):

```text
$ c++ -O2 -shared -fPIC \
      $(python3-config --includes --ldflags) \
      -I$(python3 -c "import pybind11; print(pybind11.get_include())") \
      -std=c++14 \
      -o hello$(python3-config --extension-suffix) \
      hello.cpp
$ python3 -c "import hello; print(hello.greet('world'))"
Hello, world!
```

Or use a `setup.py` for cross-platform builds:

```python
# setup.py
from pybind11.setup_helpers import Pybind11Extension, build_ext
from setuptools import setup

ext = Pybind11Extension("hello", ["hello.cpp"])
setup(name="hello", ext_modules=[ext], cmdclass={"build_ext": build_ext})
```

```text
$ pip install .
```

```check
run "python -c \"import hello; print(hello.greet('world'))\"" stdout="Hello, world!"
```

## Step 3 — Bind a C++ Function: PYBIND11_MODULE and m.def

**This step:** understand all the parameters of `m.def` and how pybind11 handles types.

`m.def` signature:

```cpp
m.def(
    "python_name",          // name visible in Python
    &cpp_function,          // pointer to the C++ function
    "docstring",            // optional docstring
    py::arg("a"),           // optional: name the argument
    py::arg("b") = 0        // optional: give it a default value
);
```

pybind11 knows how to convert between Python and C++ for a wide range of types automatically:

| C++ type | Python type |
|---|---|
| `int`, `long`, `size_t` | `int` |
| `float`, `double` | `float` |
| `bool` | `bool` |
| `std::string` | `str` |
| `std::vector<T>` | `list` |
| `std::map<K,V>` | `dict` |
| `std::optional<T>` | value or `None` |
| `std::tuple<...>` | `tuple` |

For types not in this list you define your own bindings (see Step 4).

```cpp
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>      /* enables std::vector <-> list conversion */
#include <vector>
#include <numeric>
namespace py = pybind11;

double average(const std::vector<double> &v)
{
    if (v.empty()) throw std::invalid_argument("empty sequence");
    return std::accumulate(v.begin(), v.end(), 0.0) / v.size();
}

PYBIND11_MODULE(stats, m)
{
    m.def("average", &average,
          "Return the arithmetic mean of a list of floats.",
          py::arg("v"));
}
```

The `#include <pybind11/stl.h>` header activates automatic `std::vector` ↔ Python `list` conversions. Without it, passing a Python list would raise a `TypeError`.

## Step 4 — Bind a C++ Class: py::class_<>

**This step:** expose a C++ class as a Python class with attributes and methods.

```cpp
#include <pybind11/pybind11.h>
#include <string>
namespace py = pybind11;

class Counter {
public:
    int value;

    Counter(int start = 0) : value(start) {}

    void increment(int by = 1) { value += by; }
    void reset()               { value = 0;   }
    int  get() const           { return value; }
    std::string repr() const   {
        return "<Counter value=" + std::to_string(value) + ">";
    }
};

PYBIND11_MODULE(counter, m)
{
    py::class_<Counter>(m, "Counter",
                         "A simple integer counter.")
        /* Constructor — py::init<ArgTypes...>() */
        .def(py::init<int>(), py::arg("start") = 0)

        /* Instance methods */
        .def("increment", &Counter::increment,
             py::arg("by") = 1,
             "Increment the counter.")
        .def("reset",     &Counter::reset,
             "Reset the counter to zero.")
        .def("get",       &Counter::get,
             "Return the current value.")

        /* Read-write attribute (direct member access) */
        .def_readwrite("value", &Counter::value)

        /* Python special methods */
        .def("__repr__", &Counter::repr);
}
```

From Python:

```python
from counter import Counter
c = Counter(10)
c.increment()
c.increment(by=5)
print(c.get())      # 16
print(repr(c))      # <Counter value=16>
c.value = 0
print(c.value)      # 0
```

Other class-binding helpers:

| pybind11 helper | Purpose |
|---|---|
| `.def_readonly` | Read-only attribute |
| `.def_readwrite` | Read-write attribute |
| `.def_property` | Property with getter/setter |
| `.def_static` | Static method |
| `.def_property_static` | Static property |

## Step 5 — Named Arguments and Default Values: py::arg

**This step:** use `py::arg` to give Python-visible names and defaults to C++ function parameters.

Without `py::arg`, all arguments are positional and anonymous:

```python
m.average(1.0, 2.0)   # works
m.average(a=1.0, b=2.0)   # TypeError: got unexpected keyword argument
```

With `py::arg`:

```cpp
m.def("clamp",
      [](double val, double lo, double hi) {
          if (val < lo) return lo;
          if (val > hi) return hi;
          return val;
      },
      "Clamp val to [lo, hi].",
      py::arg("val"),
      py::arg("lo") = 0.0,
      py::arg("hi") = 1.0);
```

Now in Python:

```python
import mymod
mymod.clamp(1.5)              # 1.0 (hi default)
mymod.clamp(0.3, lo=0.2)     # 0.3
mymod.clamp(-1.0, -2.0, 2.0) # -1.0
```

The lambda form (`[](...){...}`) is convenient for short adapter functions that you don't want to give a separate C++ name.

`py::arg` supports keyword-only arguments (Python 3 style) via `py::kw_only()`:

```cpp
m.def("greet",
      greet_func,
      py::arg("name"),
      py::kw_only(),
      py::arg("loud") = false);
/* Python: greet("alice", loud=True) */
```

## Step 6 — Exception Translation: pybind11 Catches C++ Exceptions Automatically

**This step:** see how pybind11 translates standard C++ exceptions to Python exceptions without any boilerplate.

pybind11 wraps every call to a bound function in a `try/catch` block. Standard C++ exceptions are translated automatically:

| C++ exception | Python exception |
|---|---|
| `std::invalid_argument` | `ValueError` |
| `std::domain_error` | `ValueError` |
| `std::out_of_range` | `IndexError` |
| `std::overflow_error` | `OverflowError` |
| `std::runtime_error` | `RuntimeError` |
| `std::bad_alloc` | `MemoryError` |

```cpp
#include <pybind11/pybind11.h>
#include <stdexcept>
namespace py = pybind11;

double safe_sqrt(double x)
{
    if (x < 0)
        throw std::domain_error("sqrt of negative number");
    return std::sqrt(x);
}

PYBIND11_MODULE(mathext, m)
{
    m.def("safe_sqrt", &safe_sqrt, py::arg("x"));
}
```

```python
import mathext
mathext.safe_sqrt(4.0)     # 2.0
mathext.safe_sqrt(-1.0)    # raises ValueError: sqrt of negative number
```

For custom C++ exception types, register a translator:

```cpp
class MyLibError : public std::exception {
public:
    MyLibError(const char *msg) : msg_(msg) {}
    const char *what() const noexcept override { return msg_; }
private:
    const char *msg_;
};

PYBIND11_MODULE(mylib, m)
{
    /* Register the translator BEFORE any m.def calls that might throw it */
    py::register_exception<MyLibError>(m, "MyLibError");

    m.def("risky", []() { throw MyLibError("C++ blew up"); });
}
```

```python
import mylib
try:
    mylib.risky()
except mylib.MyLibError as e:
    print(e)   # C++ blew up
```

## Step 7 — Challenge: Wrap a C++ Class That Holds a std::vector<double>

**This step:** bind a non-trivial C++ class using everything from this lesson.

Implement and bind the following C++ class in a module named `vecmath`:

```cpp
#include <vector>
#include <stdexcept>
#include <cmath>
#include <numeric>

class Vec {
public:
    std::vector<double> data;

    Vec() = default;
    explicit Vec(std::vector<double> v) : data(std::move(v)) {}

    /* Element access */
    double get(int i) const {
        if (i < 0 || i >= (int)data.size())
            throw std::out_of_range("index out of range");
        return data[i];
    }

    void set(int i, double val) {
        if (i < 0 || i >= (int)data.size())
            throw std::out_of_range("index out of range");
        data[i] = val;
    }

    /* Arithmetic */
    Vec add(const Vec &other) const {
        if (data.size() != other.data.size())
            throw std::invalid_argument("size mismatch");
        Vec out(data);
        for (size_t i = 0; i < data.size(); i++)
            out.data[i] += other.data[i];
        return out;
    }

    double dot(const Vec &other) const {
        if (data.size() != other.data.size())
            throw std::invalid_argument("size mismatch");
        double s = 0;
        for (size_t i = 0; i < data.size(); i++) s += data[i] * other.data[i];
        return s;
    }

    double norm() const {
        return std::sqrt(dot(*this));
    }

    size_t size() const { return data.size(); }
};
```

Your binding must support:

```python
from vecmath import Vec
a = Vec([1.0, 2.0, 3.0])
b = Vec([4.0, 5.0, 6.0])
print(a.size())       # 3
print(a.get(1))       # 2.0
a.set(1, 9.0)
print(a.dot(b))       # 1*4 + 9*5 + 3*6 = 67.0
c = a.add(b)
print(c.get(0))       # 5.0
print(b.norm())       # sqrt(77) ≈ 8.774
print(a.data)         # [1.0, 9.0, 3.0]  (list)
```

Requirements:
- Use `py::class_<Vec>` with `py::init<std::vector<double>>()`.
- Expose `get`, `set`, `add`, `dot`, `norm`, `size` as instance methods.
- Expose `data` as a read-write attribute so Python can read it as a `list`.
- `std::out_of_range` should become `IndexError` automatically.
- `std::invalid_argument` should become `ValueError` automatically.

```hints
nudge: Include <pybind11/stl.h> to enable std::vector <-> list conversion.
concept: .def_readwrite("data", &Vec::data) exposes the vector as a Python list automatically with stl.h included.
shape: py::init<std::vector<double>>() matches the explicit constructor.
- You do not need py::register_exception — pybind11 handles out_of_range and invalid_argument.
```

```check
file vecmath.cpp
contains vecmath.cpp "py::class_<Vec>"
contains vecmath.cpp "py::init<std::vector<double>>"
contains vecmath.cpp "def_readwrite"
contains vecmath.cpp "pybind11/stl.h"
```
