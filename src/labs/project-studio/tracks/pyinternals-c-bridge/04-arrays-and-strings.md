---
title: 4 — Arrays and C Strings
track: C for Python Programmers
trackOrder: 14
runtime: cpp
console: true
---

Python lists are dynamic, resizable, and can hold any mix of types. Python strings are immutable, Unicode-aware sequences of characters with a rich API. In C, both are far more primitive — and understanding that primitiveness explains why Python's high-level abstractions are so valuable, and also why NumPy arrays and C extensions are so fast.

A C array is a fixed block of memory. A C string is a character array with a `\0` terminator. That's it. No length field, no resizing, no UTF-8 awareness. Everything you take for granted in Python you'll now see Python had to build from scratch on top of these primitives.

## Step 1 — Fixed-Size Arrays

**This step:** Declare and initialize C arrays and compare them to Python lists.

Python lists are flexible and dynamic:
```python
nums = [10, 20, 30, 40, 50]
nums.append(60)    # grows automatically
print(len(nums))   # 6
```

C arrays are fixed-size blocks of memory declared at compile time:

```c
int nums[5] = {10, 20, 30, 40, 50};
/* Can't append — fixed size */
/* No built-in len() — you track the size manually */
```

Key differences from Python lists:

| Python list              | C array                          |
|--------------------------|----------------------------------|
| Dynamic size             | Fixed size (declared at compile time) |
| Any mix of types         | One type only                    |
| `len(lst)` works         | Must track size manually         |
| Negative indexing works  | No negative indexing             |
| Bounds-checked           | No bounds checking — overflow is silent! |
| Stored on heap           | Usually on the stack             |

Initialization forms:
```c
int a[5] = {1, 2, 3, 4, 5};   /* fully initialized */
int b[5] = {1, 2};             /* rest are zeroed: {1, 2, 0, 0, 0} */
int c[5] = {0};                /* all zeros */
int d[] = {1, 2, 3};          /* size inferred: 3 elements */
```

```c file=arrays_basic.c
#include <stdio.h>

int main(void) {
    int  nums[5] = {10, 20, 30, 40, 50};
    int  len     = 5;

    /* print with index */
    printf("Array elements:\n");
    for (int i = 0; i < len; i++) {
        printf("  nums[%d] = %d\n", i, nums[i]);
    }

    /* modify an element */
    nums[2] = 999;
    printf("After nums[2] = 999: nums[2] = %d\n", nums[2]);

    /* sizeof trick to compute array length (only works for stack arrays!) */
    int auto_len = sizeof(nums) / sizeof(nums[0]);
    printf("Length via sizeof: %d\n", auto_len);

    /* 2D array — like a list of lists */
    int matrix[2][3] = {{1, 2, 3}, {4, 5, 6}};
    printf("matrix[1][2] = %d\n", matrix[1][2]);  /* 6 */

    return 0;
}
```

```check
file arrays_basic.c
run "gcc -o arrays_basic arrays_basic.c && ./arrays_basic" stdout="Length via sizeof: 5" -- Use sizeof(nums) / sizeof(nums[0]) to compute length
contains arrays_basic.c "sizeof(nums)"
contains arrays_basic.c "int matrix[2][3]"
```

## Step 2 — Iterating Over Arrays with Pointers

**This step:** Use both index-based and pointer-based iteration, seeing how they produce the same result.

Python iteration hides everything behind an iterator protocol. In C, you have two equivalent approaches:

```c
int arr[] = {1, 2, 3, 4, 5};

/* Index-based (familiar) */
for (int i = 0; i < 5; i++) {
    printf("%d\n", arr[i]);
}

/* Pointer-based (idiomatic C, and what NumPy uses internally) */
for (int *p = arr; p < arr + 5; p++) {
    printf("%d\n", *p);
}
```

These two loops are **identical at the machine level** — the compiler generates the same code. `arr[i]` is literally defined as `*(arr + i)` in C. This equivalence is fundamental: array indexing **is** pointer arithmetic.

This identity — `arr[i] == *(arr + i)` — means you can even write the bizarre-but-legal: `3[arr]` (same as `arr[3]`). Don't do this; it's just useful to understand the underlying mechanism.

```c file=array_iteration.c
#include <stdio.h>

/* Compute sum using index-based approach */
int sum_by_index(int *arr, int len) {
    int total = 0;
    for (int i = 0; i < len; i++) {
        total += arr[i];
    }
    return total;
}

/* Compute sum using pointer-based approach — preferred in performance code */
int sum_by_pointer(int *arr, int len) {
    int  total = 0;
    int *end   = arr + len;
    for (int *p = arr; p < end; p++) {
        total += *p;
    }
    return total;
}

int main(void) {
    int data[] = {3, 1, 4, 1, 5, 9, 2, 6};
    int len    = sizeof(data) / sizeof(data[0]);

    printf("Sum by index:   %d\n", sum_by_index(data, len));
    printf("Sum by pointer: %d\n", sum_by_pointer(data, len));
    printf("arr[3] == *(arr+3): %d == %d\n", data[3], *(data + 3));
    return 0;
}
```

```check
file array_iteration.c
run "gcc -o array_iteration array_iteration.c && ./array_iteration" stdout="Sum by index:   31" -- Both sums should equal 31
contains array_iteration.c "int *p = arr"
contains array_iteration.c "p < end"
```

## Step 3 — Array Decay: Why Arrays Become Pointers

**This step:** Understand array decay and why C arrays lose their size information when passed to functions.

This is one of the most important and confusing aspects of C, with no Python equivalent. When you pass an array to a function in C, the array **decays** to a pointer — specifically, a pointer to its first element. The size information is **lost**:

```c
void print_array(int *arr, int len) {
    /* Here, sizeof(arr) would give you the size of a POINTER (8 bytes)
       not the size of the array. You must pass len separately. */
}

int data[10] = {0};
print_array(data, 10);   /* data decays to int*, passing &data[0] */
```

In Python, `len(lst)` always works because Python lists store their length as a field. In C, once an array decays to a pointer, the length is gone — this is why you see C functions always have a separate `len` or `size` parameter alongside array pointers.

This is also a security issue: if you write past the end of a C array, there's no check. **Buffer overflows** in C code cause crashes, data corruption, and security vulnerabilities. Python prevents all of this with bounds checking.

```c file=array_decay.c
#include <stdio.h>

void demonstrate_decay(int *arr, int len) {
    printf("Inside function:\n");
    printf("  sizeof(arr) = %zu (pointer size, not array!)\n", sizeof(arr));
    printf("  len = %d (passed separately)\n", len);
    printf("  arr[0] = %d\n", arr[0]);
}

int main(void) {
    int data[5] = {10, 20, 30, 40, 50};
    int len     = sizeof(data) / sizeof(data[0]);

    printf("In main:\n");
    printf("  sizeof(data) = %zu (real array size in bytes)\n", sizeof(data));
    printf("  len = %d\n", len);

    /* passing data is like passing &data[0] */
    demonstrate_decay(data, len);

    /* These are equivalent — all pass a pointer to first element */
    demonstrate_decay(data,     len);
    demonstrate_decay(&data[0], len);
    return 0;
}
```

```check
file array_decay.c
run "gcc -o array_decay array_decay.c && ./array_decay" stdout="sizeof(arr) =" -- Show that sizeof changes inside the function
contains array_decay.c "sizeof(arr)"
contains array_decay.c "sizeof(data)"
```

## Step 4 — C Strings: char Arrays with '\0'

**This step:** Work with C strings as character arrays terminated by a null byte, contrasting them with Python strings.

Python strings are objects with length, Unicode support, and dozens of methods. A C string is just a `char` array where the last character is `'\0'` (the null terminator, byte value 0):

```c
char greeting[] = "Hello";
/* Stored as: ['H','e','l','l','o','\0']  — 6 bytes for 5 visible chars */
```

The null terminator is how string functions know where the string ends — they keep reading bytes until they hit `'\0'`. There's no stored length. This is why C strings are both simple and dangerous.

String literals in C are stored in read-only memory. You should use `char name[] = "Alice"` (copy to stack) rather than `char *name = "Alice"` (points to read-only memory that you must not modify).

```c file=c_strings.c
#include <stdio.h>

int main(void) {
    /* string as character array */
    char greeting[] = "Hello";   /* 6 bytes: H e l l o \0 */
    int  len        = 5;

    printf("String: %s\n", greeting);
    printf("Length: %d visible chars\n", len);
    printf("Size:   %zu bytes (includes \\0)\n", sizeof(greeting));

    /* access individual characters */
    printf("First char: %c (ASCII %d)\n", greeting[0], greeting[0]);
    printf("Null terminator at index 5: %d\n", greeting[5]);  /* 0 */

    /* manually iterate until null terminator */
    printf("Character by character: ");
    for (int i = 0; greeting[i] != '\0'; i++) {
        printf("%c", greeting[i]);
    }
    printf("\n");

    /* modify a character (valid: greeting is a stack copy) */
    greeting[0] = 'J';
    printf("After greeting[0]='J': %s\n", greeting);

    return 0;
}
```

```check
file c_strings.c
run "gcc -o c_strings c_strings.c && ./c_strings" stdout="Null terminator at index 5: 0" -- Access greeting[5] to show the null terminator is 0
contains c_strings.c "greeting[i] != '\\0'"
contains c_strings.c "char greeting[]"
```

## Step 5 — String Functions: strlen, strcpy, strcat, strcmp

**This step:** Use the standard C string library functions from `<string.h>` and compare them to Python string methods.

Since C strings have no methods (they're just arrays), the standard library provides functions in `<string.h>`:

| C function         | Python equivalent      | What it does                    |
|--------------------|------------------------|---------------------------------|
| `strlen(s)`        | `len(s)`               | Returns length (excluding `\0`) |
| `strcpy(dst, src)` | `dst = src`            | Copies string (dangerous!)      |
| `strncpy(d, s, n)` | `dst = src[:n]`        | Copies at most n chars (safer)  |
| `strcat(dst, src)` | `dst += src`           | Appends src to dst              |
| `strcmp(a, b)`     | `a == b` (returns 0)   | Compares: 0=equal, <0, >0       |
| `strchr(s, c)`     | `s.find(c)`            | Find first occurrence of char   |
| `strstr(s, sub)`   | `sub in s`             | Find substring                  |

**Warning:** `strcpy` and `strcat` don't check buffer sizes — always ensure your destination buffer is large enough, or use `strncpy`/`strncat`.

```c file=string_functions.c
#include <stdio.h>
#include <string.h>

int main(void) {
    char  src[50]  = "Hello";
    char  dest[50] = "";
    char  name[50] = "World";

    /* strlen — like Python's len() */
    printf("strlen(src) = %zu\n", strlen(src));

    /* strcpy — copies string into dest buffer */
    strcpy(dest, src);
    printf("After strcpy: dest = '%s'\n", dest);

    /* strcat — appends to dest */
    strcat(dest, ", ");
    strcat(dest, name);
    strcat(dest, "!");
    printf("After strcat: dest = '%s'\n", dest);

    /* strcmp — returns 0 if equal, negative if less, positive if greater */
    char a[] = "apple";
    char b[] = "banana";
    int cmp = strcmp(a, b);
    printf("strcmp(apple, banana) = %d (negative means 'apple' < 'banana')\n", cmp);
    printf("strcmp(apple, apple) = %d\n", strcmp(a, a));

    /* strchr — find character */
    char  sentence[] = "The quick brown fox";
    char *found      = strchr(sentence, 'q');
    if (found) {
        printf("Found 'q' at position %td: '%s'\n", found - sentence, found);
    }
    return 0;
}
```

```check
file string_functions.c
run "gcc -o string_functions string_functions.c && ./string_functions" stdout="After strcat: dest = 'Hello, World!'" -- Build the string Hello, World! using strcat
contains string_functions.c "#include <string.h>"
contains string_functions.c "strlen"
contains string_functions.c "strcmp"
```

## Step 6 — Buffer Overflow: What Python Protects You From

**This step:** Understand buffer overflows by examining what happens when you write past the end of a C array.

In Python, writing past the end of a sequence raises `IndexError`. In C, the hardware doesn't check — it just writes to whatever memory is there:

```c
char buf[5];
strcpy(buf, "This is way too long for the buffer!");
/* buf can only hold 5 chars including \0
   strcpy writes 37 chars — corrupting memory */
```

This is a **buffer overflow** — one of the most common and dangerous bugs in C. It can:
- Corrupt adjacent variables on the stack
- Overwrite the return address (enabling code injection attacks)
- Cause crashes that appear far from the actual bug
- Silently produce wrong results

This example demonstrates a **controlled** small overflow to show what happens to adjacent variables. **Never do this in real code.**

```c file=buffer_demo.c
#include <stdio.h>
#include <string.h>

int main(void) {
    /* Demonstrate safe vs unsafe string operations */
    char safe_dst[10];
    char src[] = "Hello, World!";  /* 14 chars including \0 */

    /* SAFE: strncpy limits the copy */
    strncpy(safe_dst, src, sizeof(safe_dst) - 1);
    safe_dst[sizeof(safe_dst) - 1] = '\0';  /* ensure null-terminated */
    printf("Safe copy: '%s'\n", safe_dst);   /* 'Hello, Wo' — truncated */

    /* snprintf is the safest way to build strings */
    char result[20];
    int  value = 42;
    snprintf(result, sizeof(result), "Value is %d", value);
    printf("snprintf result: '%s'\n", result);

    /* Python comparison: Python would just allocate more memory */
    /* C forces you to know your buffer sizes in advance */
    printf("\nBuffer size of safe_dst: %zu bytes\n", sizeof(safe_dst));
    printf("Attempted source length: %zu chars\n", strlen(src));
    printf("Result was truncated to fit the buffer safely.\n");
    return 0;
}
```

```check
file buffer_demo.c
run "gcc -o buffer_demo buffer_demo.c && ./buffer_demo" stdout="Safe copy:" -- Use strncpy or snprintf for safe string operations
contains buffer_demo.c "strncpy"
contains buffer_demo.c "snprintf"
contains buffer_demo.c "sizeof(safe_dst) - 1"
```

## Step 7 — Challenge: Implement Your Own strlen

**This step:** Implement `my_strlen` that counts characters until it finds `'\0'`, replicating what the standard library does.

Python's `len()` just reads the stored length field of the string object — O(1). C's `strlen()` must walk the string byte by byte until it finds `'\0'` — O(n). This difference is why Python strings store their length explicitly.

Write `int my_strlen(const char *s)` that returns the number of characters before the null terminator. Use a pointer to walk through the string (not an index, as a challenge).

Also write `int my_strcmp(const char *a, const char *b)` that returns 0 if equal, negative if `a < b`, positive if `a > b` — character by character.

```hints
nudge: Both functions walk the string one character at a time until they reach `' '`.
concept: `const char *` means the function promises not to modify the string, which is good practice. The return type is `int`, not `size_t`, to keep it simple.
shape: For strlen: start a pointer `p` at `s`, increment it while `*p != ' '`, and return `p - s`. For strcmp: loop while both characters are equal and neither is `' '`, then return `*a - *b`.
```

```c file=my_strlen.c
#include <stdio.h>
#include <string.h>   /* for verification against stdlib */

int my_strlen(const char *s) {
    const char *p = s;
    while (*p != '\0') {
        p++;
    }
    return (int)(p - s);
}

int my_strcmp(const char *a, const char *b) {
    while (*a != '\0' && *a == *b) {
        a++;
        b++;
    }
    return (unsigned char)*a - (unsigned char)*b;
}

int main(void) {
    char test1[] = "Hello, World!";
    char test2[] = "";
    char test3[] = "C";

    printf("my_strlen(\"%s\") = %d (stdlib: %zu)\n",
           test1, my_strlen(test1), strlen(test1));
    printf("my_strlen(\"%s\") = %d (stdlib: %zu)\n",
           test2, my_strlen(test2), strlen(test2));
    printf("my_strlen(\"%s\") = %d (stdlib: %zu)\n",
           test3, my_strlen(test3), strlen(test3));

    printf("\nmy_strcmp(\"abc\", \"abc\") = %d\n", my_strcmp("abc", "abc"));
    printf("my_strcmp(\"abc\", \"abd\") = %d\n", my_strcmp("abc", "abd"));
    printf("my_strcmp(\"abd\", \"abc\") = %d\n", my_strcmp("abd", "abc"));
    return 0;
}
```

```check
file my_strlen.c
run "gcc -o my_strlen my_strlen.c && ./my_strlen" stdout="my_strlen(\"Hello, World!\") = 13" -- Walk the pointer until \0 and subtract to get length
contains my_strlen.c "const char *p = s"
contains my_strlen.c "*p != '\\0'"
contains my_strlen.c "return (int)(p - s)"
contains my_strlen.c "int my_strcmp"
```
