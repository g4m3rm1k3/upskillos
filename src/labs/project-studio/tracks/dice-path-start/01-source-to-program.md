---
title: A01 — Which program did you run?
track: C++ Games — Start Here
trackOrder: 4
runtime: cpp
console: true
---

In the preview, the game could print a score. Here you make the first piece yourself: an executable that prints the game's name. By the end you can explain why editing source does not change a program you already compiled. No C++ knowledge is assumed.

## Choose a project folder and find the terminal

In desktop Project Studio choose a new empty folder named `dice-lab`. A **folder** groups files; this is the root of your growing project. The editor changes text files. The **terminal** accepts commands that start programs. They are different tools.

Open the terminal in that folder. On Windows PowerShell, `Get-Location` prints its current folder; on macOS/Linux, use `pwd`. Confirm it is your chosen dice-lab folder. A **path** is a file's location; a relative path such as `hello.cpp` is interpreted from the current folder.

Type `g++ --version`. `g++` is the C++ compiler command; `--version` asks which build of the tool is installed. If it is unavailable, use Project Studio's Install C++ compiler control, then reopen the terminal. Browser readers need a local editor and compiler; the browser cannot run these desktop checks.

A **compiler** translates source text into a form your machine can execute and diagnoses language errors. The version report proves the compiler can start, not that your program is correct.

```check
run "g++ --version"
```

## A program can finish without printing

Create `hello.cpp` in the project root. The `.cpp` suffix identifies C++ source. Type only this small program.

`main` names the function where execution begins. A **function** is a named operation; we will write others later. Empty parentheses mean this version takes no named inputs. `int` says it returns a whole-number result. Braces enclose its body. `return 0;` ends it with a success status; the semicolon ends the statement. This status goes to the caller, not onto the screen.

**Edit `hello.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=hello.cpp
int main() {
    return 0;
}
```

The compile command selects C++20 with `-std=c++20`. `-Wall -Wextra -pedantic` request useful warnings and diagnostics. `-o lesson` names the output executable (`lesson.exe` on Windows). `./lesson` runs that executable from the current folder. Save, compile, then run only if compilation succeeded. A new prompt without printed text is the expected result, not a failure.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic hello.cpp -o lesson
./lesson
```

The program finishes without printing anything.


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic hello.cpp -o lesson"
run "./lesson"
```

## Give the program a voice

`#include <iostream>` makes the standard stream declarations available before compilation. It belongs above main, outside its braces. `std::cout` names the standard output stream. `std::` qualifies a name in the standard-library namespace; think of it as specifying which collection of names you mean.

`<<` sends the following value to that stream. Double quotes delimit text, and `\n` inside the text requests a newline. These are C++ stream operators, not Python print syntax.

```predict
question: Does return 0 print a zero after the greeting?
choice: No
choice: Yes
answer: No
explain: Return supplies an exit status. Only the output-stream statement prints here.
```


**Edit `hello.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=hello.cpp
#include <iostream>
int main() {
    std::cout << "Dice Duel\n";
    return 0;
}
```

Execution reaches the output statement, writes the text and newline, then returns success. Indentation helps the reader; braces define the C++ body. The include line is a preprocessing directive and does not end in a semicolon.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic hello.cpp -o lesson
./lesson
```

Expected output:

```text
Dice Duel
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic hello.cpp -o lesson"
run "./lesson" stdout="Dice Duel\n"
```

## An edit is not a new executable

Change the greeting, then save. **Before compiling**, run `./lesson`. Predict which greeting you will see. Then compile and run again using the commands below.

This deliberate experiment separates the **source file**, the text you edit, from the **executable**, the output of compilation. The live diff compares source; it cannot rebuild the executable for you.

**Edit `hello.cpp`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cpp file=hello.cpp
#include <iostream>
int main() {
    std::cout << "My Dice Duel\n";
    return 0;
}
```

Before rebuilding, the old executable still prints Dice Duel. After rebuilding, it prints My Dice Duel. If a compile fails, an older executable may remain. Do not run it and mistake that result for a successful test of your new source.

**Run it yourself:**

```text
g++ -std=c++20 -Wall -Wextra -pedantic hello.cpp -o lesson
./lesson
```

Expected output:

```text
My Dice Duel
```


```check
run "g++ -std=c++20 -Wall -Wextra -pedantic hello.cpp -o lesson"
run "./lesson" stdout="My Dice Duel\n"
```

## Try it — Read your first diagnostic

Remove the semicolon after the output statement, save and compile. Find the file name, line number and first diagnostic. The compiler may point at the following line because that is where it discovered the missing punctuation.

Restore the semicolon, save and recompile before running. Next change only indentation; the result stays the same. Explain why braces matter more than indentation here.



## Your turn — Introduce your project

**No solution is shown.** Create `welcome.cpp` yourself. Write a program that prints the two lines below and returns success. Use your own statement layout; do not copy a completed program. This task practices assembling an entry point and output, not arithmetic.

**Required output:**

```text
DICE LAB
Goal: reach 12
```


Build and run using the commands below. This program takes no input and should finish by itself.

```text
g++ -std=c++20 -Wall -Wextra -pedantic welcome.cpp -o lesson
./lesson
```

```hints
nudge: Start by identifying where execution begins.
concept: Printing and returning an exit status are different operations.
shape: Use the output stream for both lines and finish main successfully.
```


Before checking, name the source file and executable separately. Explain which must change when you edit the greeting. Keep this file: later practice files will also belong to you.

A green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.

```check
run "g++ -std=c++20 -Wall -Wextra -pedantic welcome.cpp -o lesson"
run "./lesson" stdout="DICE LAB\nGoal: reach 12\n"
```

