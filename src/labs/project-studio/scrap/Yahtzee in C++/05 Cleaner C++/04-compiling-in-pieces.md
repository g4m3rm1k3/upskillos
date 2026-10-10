---
title: 5.4 — Compiling in Pieces
runtime: none
---

You have typed a nine-file `g++` command many times. This lesson looks at what that command does, so you can build faster and read the errors. You turn each `.cpp` file into an object file by itself, then link them. You also put the file list in a file so you never retype it.

## The stages

Words first:

- **Preprocessing**: the text step. `#include` pastes the named file in, and `#define` and `#ifdef` act on the text.
- **Compiling**: translating one preprocessed `.cpp` file into machine code. The result is an **object file**.
- **Object file**: machine code for one `.cpp` file. Calls to functions in other files are left as blank holes.
- **Linking**: joining object files into one program, filling each hole with the address of a definition.

The preprocessor's output can be seen. Run this and count the lines:

```bash
g++ -std=c++17 -E Die.cpp -o Die.i
```

- `-E`: stop after preprocessing and write the text out.
- `Die.cpp` is about 60 lines, but `Die.i` is around 25,000. Almost all of that is the standard library headers that `<string>` and `<cstdlib>` paste in. The compiler reads all of it for every `.cpp` file.

## Compile each file alone

Make a folder for the object files, then compile one file:

```bash
mkdir obj
g++ -std=c++17 -Wall -Wextra -c Die.cpp -o obj/Die.o
```

- `mkdir obj`: creates the folder. The command is the same on Windows, macOS and Linux.
- `-c`: compile only. Do not link. The result is an object file.
- `-o obj/Die.o`: the name of the output. The `.o` extension is a convention.

Compile the other eight the same way, then link all nine:

```bash
g++ obj/main.o obj/Game.o obj/Turn.o obj/Input.o obj/Scorecard.o obj/Scoring.o obj/Dice.o obj/Die.o obj/Terminal.o -o game_obj
```

- With only `.o` files on the line, `g++` does no compiling. It runs the linker and nothing else.
- Leave one object file out, such as `obj/Terminal.o`, and the link fails. You see lines like `undefined reference to 'clearScreen()'`. The compiler was happy with every file, and the hole could not be filled.

```predict
question: You change one line inside Die.cpp. How many of the nine object files must be rebuilt, before you link again?
choice: All nine
choice: Only Die.o
choice: None, linking is enough
answer: Only Die.o
explain: Each .cpp file compiles on its own. Die.o is the only object built from Die.cpp, so it is the only one that goes out of date. The other eight object files are still correct. This is the reason to build in pieces on a large project. (If you change a header, every .cpp file that includes it, directly or through other headers, has to be rebuilt.)
```

## One file for the list

Typing nine names is a chore, and a typo gives an error. `g++` can read options and file names from a text file when you write `@` in front of its name. Create `sources.txt`.

```text file=sources.txt
main.cpp
Game.cpp
Turn.cpp
Input.cpp
Scorecard.cpp
Scoring.cpp
Dice.cpp
Die.cpp
Terminal.cpp
```

Line by line:

- One file name per line. `g++` treats the lines as if you had typed them on the command line. This works the same way on every system.
- It is called a response file.

Build with it:

```bash
g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game
./game
```

- `-Wpedantic`: warns about anything that is not standard C++, such as an extension only some compilers accept. A clean build prints nothing.
- When you add a tenth `.cpp` file, add one line to `sources.txt` and nothing else changes.

```check
file sources.txt
run "g++ -std=c++17 -Wall -Wextra -Wpedantic @sources.txt -o game" label="the game builds from sources.txt" -- Every line of sources.txt must name a file that exists in this folder.
run "./game --fast" stdin="1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n" stdout="Game over." label="the game still plays to the end" -- Nothing in the game changed. Only the build did.
```

## Your turn: build from object files

Build the game from object files, without using `sources.txt`:

1. Make a folder named `obj`.
2. Compile each of the nine `.cpp` files with `-c` into `obj/`, one object file per source file, named after it (`obj/Game.o` and so on).
3. Link the nine object files into a program named `game_obj`.

```check
dir obj label="the obj folder exists" -- mkdir obj
file obj/main.o label="main.o exists" -- g++ -std=c++17 -c main.cpp -o obj/main.o
file obj/Game.o label="Game.o exists" -- g++ -std=c++17 -c Game.cpp -o obj/Game.o
file obj/Turn.o label="Turn.o exists" -- g++ -std=c++17 -c Turn.cpp -o obj/Turn.o
file obj/Input.o label="Input.o exists" -- g++ -std=c++17 -c Input.cpp -o obj/Input.o
file obj/Scorecard.o label="Scorecard.o exists" -- g++ -std=c++17 -c Scorecard.cpp -o obj/Scorecard.o
file obj/Scoring.o label="Scoring.o exists" -- g++ -std=c++17 -c Scoring.cpp -o obj/Scoring.o
file obj/Dice.o label="Dice.o exists" -- g++ -std=c++17 -c Dice.cpp -o obj/Dice.o
file obj/Die.o label="Die.o exists" -- g++ -std=c++17 -c Die.cpp -o obj/Die.o
file obj/Terminal.o label="Terminal.o exists" -- g++ -std=c++17 -c Terminal.cpp -o obj/Terminal.o
run "./game_obj --fast" stdin="1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n" stdout="Game over." label="game_obj plays to the end" -- Link with: g++ obj/main.o obj/Game.o obj/Turn.o obj/Input.o obj/Scorecard.o obj/Scoring.o obj/Dice.o obj/Die.o obj/Terminal.o -o game_obj
```

```hints
nudge: Which flag stops g++ before it links, and what does it need to be told about the output name?
concept: `-c` compiles one source file into one object file, and `-o` names the result. A command that lists only .o files links them into a program.
shape: Run nine commands of the form `g++ -std=c++17 -c NAME.cpp -o obj/NAME.o`, one for each source file. Then run one command that lists the nine .o files and ends with `-o game_obj`.
answer: The commands:
~~~bash
mkdir obj
g++ -std=c++17 -c main.cpp -o obj/main.o
g++ -std=c++17 -c Game.cpp -o obj/Game.o
g++ -std=c++17 -c Turn.cpp -o obj/Turn.o
g++ -std=c++17 -c Input.cpp -o obj/Input.o
g++ -std=c++17 -c Scorecard.cpp -o obj/Scorecard.o
g++ -std=c++17 -c Scoring.cpp -o obj/Scoring.o
g++ -std=c++17 -c Dice.cpp -o obj/Dice.o
g++ -std=c++17 -c Die.cpp -o obj/Die.o
g++ -std=c++17 -c Terminal.cpp -o obj/Terminal.o
g++ obj/main.o obj/Game.o obj/Turn.o obj/Input.o obj/Scorecard.o obj/Scoring.o obj/Dice.o obj/Die.o obj/Terminal.o -o game_obj
~~~
```
