---
title: 7.1 — A Window
track: Graphics
runtime: none
---

Until now the game lives in a text console. In this chapter it gets a real window, drawn with **SDL2**, a library that opens windows, draws shapes and reports key presses on Windows, macOS and Linux. The game rules don't change: `Game`, `Env` and everything you tested stay as they are. Only the way the game looks and listens changes.

In this lesson you open an empty window and wrap it in a class that cleans up after itself.

## Install SDL2

You need the SDL2 **development** files, which include the headers:

- **Windows (MSYS2):** `pacman -S mingw-w64-x86_64-SDL2`
- **macOS (Homebrew):** `brew install sdl2`
- **Ubuntu or Debian:** `sudo apt install libsdl2-dev`

SDL2 is written in C, so its functions look different from your classes: plain functions with an `SDL_` prefix.

A library lives outside your project, so the compiler needs two extra things: **where its headers are** (an `-I` flag) and **which library to link** (`-L` and `-l` flags). Where SDL2 was installed differs from computer to computer, so SDL2 comes with a small program, `sdl2-config`, that prints the right flags for yours. Try it:

```
sdl2-config --cflags --libs
```

On a Mac with Homebrew it prints something like `-I/opt/homebrew/include/SDL2 -D_THREAD_SAFE -L/opt/homebrew/lib -lSDL2main -lSDL2`. The `-I` path ends in `SDL2`, which is why the code below includes `<SDL.h>`, not `<SDL2/SDL.h>`.

In the terminal, `$( ... )` runs the command inside and pastes its output into the line. So this builds with exactly the flags your computer needs:

```
g++ -std=c++17 sdl_main.cpp $(sdl2-config --cflags --libs) -o game_sdl
```

Files that only include SDL, and are compiled on their own with `-c`, need just the header flags: `$(sdl2-config --cflags)`. The graphics checks in this chapter run on macOS and Linux. On Windows, build in the MSYS2 terminal, where `sdl2-config` works the same way.

Create a new file, `sdl_main.cpp`. It is a second program, next to your console `main.cpp`.

## Open a window

```cpp file=sdl_main.cpp
#define SDL_MAIN_HANDLED
#include <SDL.h>
#include <iostream>

int main() {
    if (SDL_Init(SDL_INIT_VIDEO) != 0) {
        std::cout << "SDL_Init failed: " << SDL_GetError() << std::endl;
        return 1;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Dungeon Dash",
        SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
        480, 320,
        SDL_WINDOW_SHOWN);
    if (window == nullptr) {
        std::cout << "Could not open a window: " << SDL_GetError() << std::endl;
        SDL_Quit();
        return 1;
    }

    bool running = true;
    while (running) {
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_QUIT) {
                running = false;
            }
        }
        SDL_Delay(16);
    }

    SDL_DestroyWindow(window);
    SDL_Quit();
    return 0;
}
```

- `#define SDL_MAIN_HANDLED` comes **before** the include. On Windows, SDL otherwise renames your `main` and needs extra link flags. This line turns that off.
- `SDL_Init(SDL_INIT_VIDEO)` starts SDL's video part. It returns `0` on success, so `!= 0` means failure. `SDL_GetError()` returns a text describing the last SDL problem.
- `SDL_Window*` is a **pointer**: a value that says where an object lives in memory. SDL created the window and handed you this pointer as a handle. Every SDL call about the window takes it back.
- `nullptr` is the pointer that points at nothing. SDL returns it when creation fails, so always compare with it before using the pointer.
- SDL's calls come in pairs: `SDL_Init` and `SDL_Quit`, `SDL_CreateWindow` and `SDL_DestroyWindow`. You must destroy what you create. The next steps make that automatic.
- `SDL_Event event;` is a variable SDL fills with news: a key press, a mouse click, a close request. `&event` is the **address of** `event`: a pointer to it, so `SDL_PollEvent` can write into your variable.
- `SDL_PollEvent(&event)` returns `1` and fills `event` if something was waiting, or `0` if not. The inner `while` handles every waiting event in turn.
- `event.type == SDL_QUIT` is true when the player clicks the window's close button.
- `SDL_Delay(16)` sleeps 16 milliseconds so the loop doesn't use the whole processor. That is about 60 passes per second.

```predict
question: The window is open and you don't touch anything for one pass of the loop. What does SDL_PollEvent(&event) return?
answer: 0
explain: PollEvent returns 1 only when it found a waiting event. With nothing waiting it returns 0, so the inner while loop does not run.
tolerance: 0
```

```check
file sdl_main.cpp -- Create a file called sdl_main.cpp in the project folder.
contains sdl_main.cpp "#define SDL_MAIN_HANDLED" -- Start with #define SDL_MAIN_HANDLED, before the SDL include.
contains sdl_main.cpp "SDL_Init(SDL_INIT_VIDEO)" -- Start SDL with SDL_Init(SDL_INIT_VIDEO)
contains sdl_main.cpp "SDL_CreateWindow(" -- Open the window with SDL_CreateWindow(...)
contains sdl_main.cpp "SDL_PollEvent(&event)" -- Read events with SDL_PollEvent(&event)
run "g++ -std=c++17 sdl_main.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=mac label="sdl_main.cpp compiles" -- Fix the compiler errors shown. If the SDL2 header can't be found, check your SDL2 install.
run "g++ -std=c++17 sdl_main.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=linux label="sdl_main.cpp compiles" -- Fix the compiler errors shown. If the SDL2 header can't be found, check your SDL2 install.
```

## Draw something

A window shows nothing until you draw into it. SDL draws through a **renderer**, an object that draws into a window. The recipe each frame is: pick a colour, clear the window with it, draw, then **present** so the finished picture appears. Add the renderer after the window is created:

```cpp file=sdl_main.cpp
#define SDL_MAIN_HANDLED
#include <SDL.h>
#include <iostream>

int main() {
    if (SDL_Init(SDL_INIT_VIDEO) != 0) {
        std::cout << "SDL_Init failed: " << SDL_GetError() << std::endl;
        return 1;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Dungeon Dash",
        SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
        480, 320,
        SDL_WINDOW_SHOWN);
    if (window == nullptr) {
        std::cout << "Could not open a window: " << SDL_GetError() << std::endl;
        SDL_Quit();
        return 1;
    }

    SDL_Renderer* renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED);
    if (renderer == nullptr) {
        renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_SOFTWARE);
    }
    if (renderer == nullptr) {
        std::cout << "Could not create a renderer: " << SDL_GetError() << std::endl;
        SDL_DestroyWindow(window);
        SDL_Quit();
        return 1;
    }

    bool running = true;
    while (running) {
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_QUIT) {
                running = false;
            }
        }

        SDL_SetRenderDrawColor(renderer, 20, 20, 30, 255);
        SDL_RenderClear(renderer);
        SDL_RenderPresent(renderer);
        SDL_Delay(16);
    }

    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return 0;
}
```

- `SDL_CreateRenderer(window, -1, flags)` makes a renderer for that window. `-1` means "use the first driver that fits". `SDL_RENDERER_ACCELERATED` asks for the graphics card.
- If that fails, for example on a virtual machine, the code tries again with `SDL_RENDERER_SOFTWARE`, which draws with the processor.
- `SDL_SetRenderDrawColor(renderer, r, g, b, a)` sets the **current drawing colour**. Each number runs from 0 to 255: red, green, blue and **alpha**, which is opacity (255 is solid). SDL remembers it for every later draw call. `20, 20, 30` is a very dark blue.
- `SDL_RenderClear` fills the whole window with the current colour. `SDL_RenderPresent` shows what you drew. Until then it is drawn on a hidden **back buffer**, so the player never sees a half-finished picture.
- Cleanup runs in the **reverse** order of creation: renderer, then window, then SDL itself.

```check
contains sdl_main.cpp "SDL_CreateRenderer(" -- Create a renderer with SDL_CreateRenderer(...)
contains sdl_main.cpp "SDL_RenderClear(renderer)" -- Clear the window each frame with SDL_RenderClear(renderer);
contains sdl_main.cpp "SDL_RenderPresent(renderer)" -- Show the frame with SDL_RenderPresent(renderer);
contains sdl_main.cpp "SDL_DestroyRenderer(renderer)" -- Destroy the renderer before the window.
run "g++ -std=c++17 sdl_main.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=mac label="sdl_main.cpp compiles" -- Fix the compiler errors shown.
run "g++ -std=c++17 sdl_main.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=linux label="sdl_main.cpp compiles" -- Fix the compiler errors shown.
```

## A class that cleans up after itself

All those early `return 1;` paths each repeat part of the cleanup. Forget one and you leak the window. C++ has a better tool. A **destructor** is a special function that runs automatically when an object goes out of scope, including when `main` returns early. You put the cleanup there once. Create `sdl_window.h`:

```cpp file=sdl_window.h
#pragma once

#include <SDL.h>

class SdlWindow {
public:
    SdlWindow(const char* title, int width, int height);
    ~SdlWindow();

    SdlWindow(const SdlWindow&) = delete;
    SdlWindow& operator=(const SdlWindow&) = delete;

    bool ok() const;
    SDL_Renderer* renderer() const;

private:
    SDL_Window* window;
    SDL_Renderer* rend;
    bool started;
};
```

- `~SdlWindow();` is the destructor: the class's name with a `~` in front, no return type and no parameters.
- `= delete` removes a function. A **copy** of an `SdlWindow` would hold the same two pointers, and both copies would try to destroy the same window. By deleting the copy constructor and the copy assignment, the compiler refuses any attempt to copy one.
- `const char*` is a pointer to plain C text, such as `"Dungeon Dash"`. It is how SDL takes strings.
- `ok()` says whether everything was created. `renderer()` hands out the pointer for drawing.
- The members are declared in the order `window`, `rend`, `started`. The constructor's list must follow that order.

```check
file sdl_window.h -- Create a file called sdl_window.h in the project folder.
matches sdl_window.h "SdlWindow\s*\(\s*const\s+char\s*\*\s*\w+\s*,\s*int\s+\w+\s*,\s*int\s+\w+\s*\)\s*;" -- Declare the constructor SdlWindow(const char* title, int width, int height);
matches sdl_window.h "~SdlWindow\s*\(\s*\)\s*;" -- Declare the destructor ~SdlWindow();
matches sdl_window.h "SdlWindow\s*\(\s*const\s+SdlWindow\s*&\s*\)\s*=\s*delete\s*;" -- Delete the copy constructor: SdlWindow(const SdlWindow&) = delete;
matches sdl_window.h "bool\s+ok\s*\(\s*\)\s*const\s*;" -- Declare bool ok() const;
matches sdl_window.h "SDL_Renderer\s*\*\s*renderer\s*\(\s*\)\s*const\s*;" -- Declare SDL_Renderer* renderer() const;
```

## Define it in sdl_window.cpp

Create `sdl_window.cpp`:

```cpp file=sdl_window.cpp
#include "sdl_window.h"

SdlWindow::SdlWindow(const char* title, int width, int height)
    : window(nullptr), rend(nullptr), started(false) {
    if (SDL_Init(SDL_INIT_VIDEO) != 0) {
        return;
    }
    started = true;

    window = SDL_CreateWindow(title,
                              SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
                              width, height, SDL_WINDOW_SHOWN);
    if (window == nullptr) {
        return;
    }

    rend = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED);
    if (rend == nullptr) {
        rend = SDL_CreateRenderer(window, -1, SDL_RENDERER_SOFTWARE);
    }
}

SdlWindow::~SdlWindow() {
    if (rend != nullptr) {
        SDL_DestroyRenderer(rend);
    }
    if (window != nullptr) {
        SDL_DestroyWindow(window);
    }
    if (started) {
        SDL_Quit();
    }
}

bool SdlWindow::ok() const { return rend != nullptr; }
SDL_Renderer* SdlWindow::renderer() const { return rend; }
```

- All three pointers start as `nullptr`, and `started` as `false`. The constructor fills in only what succeeds, and returns early at the first failure.
- The destructor undoes exactly what was done, in reverse. It destroys a thing only if it exists, so it is safe after a half-finished setup.
- `ok()` is true only when the renderer exists, because that means the window does as well.

```predict
question: You create an SdlWindow at the top of main, and main later runs `return 1;` in the middle. Does SDL_Quit still run?
choice: Yes, the destructor runs when the object goes out of scope
choice: No, only a normal return at the end runs it
answer: Yes, the destructor runs when the object goes out of scope
explain: Leaving the scope by any route, including an early return, runs the destructors of the objects declared in it. That is why cleanup belongs in a destructor.
```

```check
file sdl_window.cpp -- Create a file called sdl_window.cpp in the project folder.
contains sdl_window.cpp "SdlWindow::~SdlWindow()" -- Define the destructor SdlWindow::~SdlWindow() { ... }
contains sdl_window.cpp "SDL_Quit()" -- Call SDL_Quit() in the destructor, but only if SDL_Init worked.
run "g++ -std=c++17 -c sdl_window.cpp $(sdl2-config --cflags) -o sdl_window.o" os=mac label="sdl_window.cpp compiles" -- Fix the compiler errors shown. Keep the initializer list in the same order as the members in sdl_window.h.
run "g++ -std=c++17 -c sdl_window.cpp $(sdl2-config --cflags) -o sdl_window.o" os=linux label="sdl_window.cpp compiles" -- Fix the compiler errors shown. Keep the initializer list in the same order as the members in sdl_window.h.
```

## Use it in sdl_main.cpp

Now `main` shrinks to the loop:

```cpp file=sdl_main.cpp
#define SDL_MAIN_HANDLED
#include <SDL.h>
#include <iostream>
#include "sdl_window.h"

int main() {
    SdlWindow window("Dungeon Dash", 480, 320);
    if (!window.ok()) {
        std::cout << "Could not open a window: " << SDL_GetError() << std::endl;
        return 1;
    }

    bool running = true;
    while (running) {
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_QUIT) {
                running = false;
            }
        }

        SDL_SetRenderDrawColor(window.renderer(), 20, 20, 30, 255);
        SDL_RenderClear(window.renderer());
        SDL_RenderPresent(window.renderer());
        SDL_Delay(16);
    }

    return 0;
}
```

There is no cleanup code in `main` any more. `window` is destroyed when `main` returns.

```check
contains sdl_main.cpp "#include \"sdl_window.h\"" -- Include sdl_window.h in sdl_main.cpp.
contains sdl_main.cpp "SdlWindow window(" -- Create the window with SdlWindow window("Dungeon Dash", 480, 320);
lacks sdl_main.cpp "SDL_DestroyWindow" -- main shouldn't clean up by hand any more. The destructor does it.
lacks sdl_main.cpp "SDL_Quit" -- main shouldn't call SDL_Quit any more. The destructor does it.
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=mac label="the window program builds" -- Build both .cpp files together and fix the errors shown.
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=linux label="the window program builds" -- Build both .cpp files together and fix the errors shown.
```

Build it and run `game_sdl` from a terminal. You should see a dark window that closes when you click the close button.

## Your turn: escape closes the window

Make the **Escape** key close the window as well. Handle it in the event loop in `sdl_main.cpp`.

- A key press has the type `SDL_KEYDOWN`.
- Which key it was is in `event.key.keysym.sym`. SDL names the Escape key `SDLK_ESCAPE`.
- You will turn keys into game actions properly in lesson 7.4. This is only a taste.

```check
contains sdl_main.cpp "SDL_KEYDOWN" -- Check for key presses with event.type == SDL_KEYDOWN
contains sdl_main.cpp "SDLK_ESCAPE" -- Compare event.key.keysym.sym with SDLK_ESCAPE
contains sdl_main.cpp "event.key.keysym.sym" -- Read the key with event.key.keysym.sym
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=mac label="the window program builds" -- Build both .cpp files together and fix the errors shown.
run "g++ -std=c++17 sdl_main.cpp sdl_window.cpp $(sdl2-config --cflags --libs) -o game_sdl" os=linux label="the window program builds" -- Build both .cpp files together and fix the errors shown.
```

```hints
nudge: The loop already has an if for SDL_QUIT. Which type of event describes a key press?
concept: event.type tells you what kind of event it is. For SDL_KEYDOWN, the field event.key.keysym.sym says which key. Compare it with SDLK_ESCAPE, and stop the loop the same way as for SDL_QUIT.
shape: Add an else if after the SDL_QUIT test that checks both event.type == SDL_KEYDOWN and event.key.keysym.sym == SDLK_ESCAPE, then sets running to false.
answer: In the event loop, change the if to:
~~~cpp
            if (event.type == SDL_QUIT) {
                running = false;
            } else if (event.type == SDL_KEYDOWN && event.key.keysym.sym == SDLK_ESCAPE) {
                running = false;
            }
~~~
```
