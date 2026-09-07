// cpp-from-scratch — Lesson 32: The Build System
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 32 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-32-the-build-system',
  slug: 'the-build-system',
  chapter: 6,
  order: 2,
  title: 'The Build System',
  subtitle: 'CMake',
  tags: ['cmake', 'target', 'out-of-source-build', 'build-type'],

  hook: {
    question: 'What is "The Build System", and why does it matter?',
    realWorldContext: '— A multi-file C++ project managed entirely through CMake, producing separate optimized and debugging executables without polluting the source directory. The transferable problem this lesson solves is how to systematically tell a compiler about multiple source files, header search paths, dependencies, and optimization flags without typing brittle, enormous terminal commands by hand.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: CMakeLists.txt and Targets, Out-of-Source Builds, target_include_directories, target_link_libraries, Debug vs Release Configurations.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **CMake:** a build system generator. It exists to read a high-level description of your project and automatically generate the low-level, platform-specific build scripts (like Makefiles or Visual Studio project files) needed to actually compile it, isolating you from platform differences.\n- **Target:** a logical entity in a CMake build, usually an executable or a library. It exists to act as an isolated container for source files and settings, so you can apply configuration to just one part of your project without affecting the rest.\n- **Out-of-source build:** the practice of keeping all generated build files in a separate directory from your source code. It exists so you can cleanly delete the build artifacts (the "build directory") without risking your source code, and so you never accidentally commit generated binaries to version control.\n- **Build Type:** a named configuration profile (like Debug or Release) that controls how the code is built. It exists to let you instantly switch between a version optimized for developer inspection (slow, but includes line numbers and variable names) and a version optimized for production (fast, heavily transformed by the compiler).',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **cmake_minimum_required:** A CMake command that sets the lowest version of CMake permitted to process the file.\n- **project:** A CMake command that names the overall project.\n- **add_executable:** A CMake command that defines a new executable target.\n- **target_include_directories:** A CMake command that adds directories to the compiler\'s include search path for a specific target.\n- **add_library:** A CMake command that defines a new library target.\n- **target_link_libraries:** A CMake command that declares a dependency between targets.\n- **set:** A CMake command that assigns a value to a variable.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Trace the lifecycle of our `network::connect()` call: 1. You run `cmake -B build -DCMAKE_BUILD_TYPE=Debug`. 2. CMake reads `CMakeLists.txt`, noting that `NetworkLib` is built from `src/Network.cpp` and `EngineApp` requires `NetworkLib`. 3. CMake generates a Makefile inside `build/` holding instructions to build `NetworkLib` with `-g` (Debug) flags. 4. You run `cmake --build build`. 5. The compiler compiles `src/Network.cpp` into an object file. 6. The compiler compiles `src/main.cpp` into an object file. It successfully finds `network::connect()` because of the forward declaration. 7. The linker runs, taking the `EngineApp` object file, locating the missing `network::connect` implementation inside `NetworkLib`, and binding them together into the final executable.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'Let\'s break the link. Open `CMakeLists.txt` and delete the link command: \n\n```cmake\n# target_link_libraries(EngineApp PRIVATE NetworkLib)\n```\n\nRun `cmake --build build`. **The error:** \n\n```\n/usr/bin/ld: CMakeFiles/EngineApp.dir/src/main.cpp.o: in function `main\':\nmain.cpp:(.text+0x18): undefined reference to `network::connect()\'\ncollect2: error: ld returned 1 exit status\n```\n\nThis is a **linker error** (`ld` is the linker). The compiler succeeded—`main.cpp` compiled fine because it knew `network::connect()` *existed* (the declaration). But when the linker tried to assemble the final program, you never told it to link `NetworkLib`, so it couldn\'t find the *implementation*. Restore the `target_link_libraries` line to fix it.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Change `CMAKE_CXX_STANDARD` to `11`. Run `cmake -B build`. Notice how CMake reconfigures the build system instantly. Change it back to `17`.\n- Add a new file `src/Physics.cpp` with a simple function. Create a new library target named `PhysicsLib` in `CMakeLists.txt`. Link it into `EngineApp` and call the function from `main.cpp`.\n- Build the project in Debug mode, then run the Linux/Mac command `ls -lh build/EngineApp` to see its file size. Then, rebuild in Release mode (`-DCMAKE_BUILD_TYPE=Release`) and check the file size again. The Release binary should be noticeably smaller.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have written a `CMakeLists.txt` file from scratch.\n- [ ] You have executed an out-of-source build, keeping your source directory clean.\n- [ ] You have injected header search paths into a target using `target_include_directories`.\n- [ ] You have compiled a separate static library and linked it to an executable using `target_link_libraries`.\n- [ ] You have successfully switched between Debug and Release build configurations.\n- [ ] You can explain what a CMake target is out loud, in your own words, to someone who hasn\'t read this lesson.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 32: The Build System',
        caption: 'The Build System',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'CMakeLists.txt and Targets',
              prose: [
                'When you write a single `main.cpp`, compiling it is easy: `g++ main.cpp -o app`. But real projects have dozens of source files. Typing `g++ main.cpp user.cpp network.cpp display.cpp...` every time you build is tedious and error-prone. Worse, if you move to a different operating system, the compiler commands might change. We need a single configuration file that describes *what* makes up our program, leaving the *how* to a dedicated tool.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n\nint main() {\n    std::cout << "Built by CMake.\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `cmake_minimum_required(VERSION 3.10)` checks the installed version of CMake. If the user has an older version (like 3.8), CMake immediately stops with a clear error. This prevents mysterious failures later caused by missing modern CMake features.\n- `project(Engine LANGUAGES CXX)` initializes the project workspace. It tells CMake the name of the project is "Engine", and that the language we are using is C++ (`CXX`). This causes CMake to actively probe the system to locate the C++ compiler.\n- `set(CMAKE_CXX_STANDARD 17)` assigns the value `17` to the built-in variable `CMAKE_CXX_STANDARD`. This is how we instruct the underlying compiler to use the C++17 standard, replacing the need to manually pass `-std=c++17` on the command line.\n- `set(CMAKE_CXX_STANDARD_REQUIRED ON)` enforces the previous line. If the compiler does not support C++17, the build fails immediately, rather than silently falling back to C++14 or older.\n- `add_executable(EngineApp src/main.cpp)` creates a new **target**. A target is the fundamental unit of work in CMake. This specific target is an executable program named `EngineApp`, and it is built by compiling the source file `src/main.cpp`.',
                '**CS lens.** This embodies declarative configuration. Rather than writing an imperative script of commands to run (`do this, then do that`), you declare the desired end state ("I want an executable named X made of these files"). The build system generator calculates the graph of actions needed to achieve that state.',
                '**SE lens.** The engineering principle is platform abstraction. The alternative not chosen is writing a raw `Makefile` or an `install.bat` script. The tradeoff is learning a new configuration language (CMake) instead of using the shell you already know. The benefit is that this exact same `CMakeLists.txt` will automatically generate Makefiles on Linux, an Xcode project on macOS, and a Visual Studio solution on Windows, without changing a single line of code.'
              ],
              typeIt: true,
              solution: 'cmake_minimum_required(VERSION 3.10)\nproject(Engine LANGUAGES CXX)\n\nset(CMAKE_CXX_STANDARD 17)\nset(CMAKE_CXX_STANDARD_REQUIRED ON)\n\nadd_executable(EngineApp src/main.cpp)',
              expectedOutput: '-- The CXX compiler identification is GNU 11.4.0\n-- Check for working CXX compiler: /usr/bin/c++ - skipped\n-- Configuring done\n-- Generating done\n-- Build files have been written to: /path/to/project/build\n[ 50%] Building CXX object CMakeFiles/EngineApp.dir/src/main.cpp.o\n[100%] Linking CXX executable EngineApp\n[100%] Built target EngineApp',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Out-of-Source Builds',
              prose: [
                'When a compiler builds a C++ program, it creates intermediate files (object files, dependency graphs) alongside the final executable. If these files are dumped directly next to your source code, your project folder becomes a polluted mess of generated binaries mixed with human-written code. You risk accidentally committing compiled binaries to version control, and "cleaning" the project becomes dangerously equivalent to deleting files randomly in your source directory.',
                '## First, In Isolation',
                '```cpp\nint main() { return 0; }\n```',
                '## How the Code Works',
                '- `rm -rf build/` completely deletes the existing build directory. Because this is an out-of-source build, deleting this folder is 100% safe. It acts as a perfect "clean" step, destroying all intermediate artifacts without ever touching the source code.\n- `cmake -B build/` invokes CMake. The `-B build/` argument explicitly dictates the **Build** directory. CMake will read the `CMakeLists.txt` in the current directory, but it will write every single generated file—including the final executable—into the `build/` folder.',
                '**CS lens.** This embodies the concept of pure functions applied to file systems. The source directory acts as read-only input. The build directory acts as the output. Because the input is never mutated, the build process is significantly more predictable and reproducible.',
                '**SE lens.** The engineering principle is ephemeral artifacts. The alternative not chosen is an "in-source build" where CMake writes its generated files directly next to `CMakeLists.txt`. The immediate tradeoff of out-of-source builds is that you must navigate into `build/` to run your program, adding a step. The immense benefit is that you can add `build/` to your `.gitignore` file once, and permanently eliminate the risk of committing a compiled 50MB binary to your repository.'
              ],
              typeIt: true,
              solution: 'rm -rf build/\ncmake -B build/',
              expectedOutput: '.  ..  build  CMakeLists.txt  src',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'target_include_directories',
              prose: [
                'When you `#include "math/Vector.h"` in `main.cpp`, the compiler needs to know where the `math` directory actually lives. If you move `main.cpp` to a different folder, relative paths like `#include "../../math/Vector.h"` will break immediately. We need a way to tell the compiler, at the project level, exactly which directories act as the root search paths for header files.',
                '## First, In Isolation',
                '```cpp\n#pragma once\n#include <iostream>\ninline void print() { std::cout << "Header found.\\n"; }\n```',
                '## How the Code Works',
                '- `target_include_directories(EngineApp PRIVATE include)` is the command that modifies our target.\n- `EngineApp` is the exact name of the target we defined earlier with `add_executable`. We are attaching properties directly to this specific target.\n- `PRIVATE` is the visibility specifier. It declares that the `include` directory is needed to compile *this target only*. If another target later depends on `EngineApp`, that target will *not* inherit this include directory. `PRIVATE` means "this is an internal implementation detail of EngineApp."\n- `include` is the relative path from the `CMakeLists.txt` file to the directory containing our headers. Because of this line, when `main.cpp` says `#include "core/Logger.h"`, the compiler automatically looks inside `include/` and finds `include/core/Logger.h`.',
                '**CS lens.** This embodies dependency injection at the build level. Rather than the source code hardcoding the absolute path of its dependencies, the environment (CMake) injects the search paths into the compiler. This completely decouples the source file\'s physical location on disk from the headers it needs to access.',
                '**SE lens.** The engineering principle is interface vs implementation separation. A common C++ project layout places all public `.h` files in a dedicated `include/` folder, and all internal `.cpp` files in a `src/` folder. The tradeoff is having to mirror your directory structure in two places. The benefit is immediate clarity: any file in `include/` is meant to be consumed by other parts of the codebase, while `src/` is strictly internal. `target_include_directories` is the mechanism that makes this layout physically possible to compile.'
              ],
              typeIt: true,
              solution: '#pragma once\n#include <iostream>\n\nnamespace core {\n    inline void log(const char* message) {\n        std::cout << "[LOG] " << message << "\\n";\n    }\n}',
              expectedOutput: '[LOG] Engine starting up.',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'target_link_libraries',
              prose: [
                'As a project grows, compiling every single source file directly into one massive executable becomes incredibly slow. Changing one file forces a recompilation of everything. We need to modularize the codebase: compile smaller, independent components into "libraries", and then stitch (link) those libraries into the final executable.',
                '## First, In Isolation',
                '```cpp\nint add(int a, int b) { return a + b; }\n```',
                '## How the Code Works',
                '- `add_library(NetworkLib STATIC src/Network.cpp)` creates a new target, but it is a library, not an executable. You cannot run a library directly.\n- `NetworkLib` is the name we assign to this new target.\n- `STATIC` explicitly defines the type of library. A static library is essentially a compressed zip file of compiled object code. When linked, the linker extracts the needed code and embeds it directly into the final executable.\n- `src/Network.cpp` is the source file compiled to build this library.\n- `target_link_libraries(EngineApp PRIVATE NetworkLib)` creates the actual bridge. It instructs the linker: "When you are assembling `EngineApp`, take the compiled contents of `NetworkLib` and wire them in."\n- `PRIVATE` means `EngineApp` uses `NetworkLib` for its own internal implementation. If another target were to link against `EngineApp` (impossible for an executable, but relevant if `EngineApp` were itself a library), it would not automatically inherit `NetworkLib`.',
                '**CS lens.** This embodies modular compilation and resolution. The compiler translates source files into object files independently. It leaves "holes" for functions it doesn\'t have the code for yet (like `network::connect()`). The linker is a separate program that runs afterward; it maps the missing symbols in the executable to the concrete implementations provided by the linked libraries.',
                '**SE lens.** The engineering principle is component isolation. The alternative not chosen is listing every single `.cpp` file in the `add_executable` command. The tradeoff of multiple targets is a more complex `CMakeLists.txt`. The immense benefit is caching: if you change `main.cpp`, only `main.cpp` is recompiled. `NetworkLib` is already built, so the linker simply re-attaches it instantly. This is how massive C++ projects keep compilation times manageable.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nnamespace network {\n    void connect() {\n        std::cout << "Connected to server.\\n";\n    }\n}',
              expectedOutput: '[LOG] Engine starting up.\nConnected to server.',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'Debug vs Release Configurations',
              prose: [
                'When you are actively writing code, you need the compiler to embed line numbers and variable names into the executable so your debugger can tell you exactly where a crash happened. This makes the executable large and slow. When you ship the code to a user, you want the compiler to brutally optimize the math, discard variable names, and inline functions to make it run as fast as physically possible. You cannot have both at once.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n\nint main() {\n#ifdef NDEBUG\n    std::cout << "Release mode: optimizations ON, debug asserts OFF.\\n";\n#else\n    std::cout << "Debug mode: optimizations OFF, debug asserts ON.\\n";\n#endif\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `cmake -B build` tells CMake to generate into the `build` directory, as before.\n- `-DCMAKE_BUILD_TYPE=Release` is a command-line override.\n- `-D` is CMake\'s syntax for defining a variable from the command line.\n- `CMAKE_BUILD_TYPE` is a built-in CMake variable that specifically controls the configuration.\n- `Release` is the value we are assigning. This tells CMake to configure the project using its internal Release profile. For the GCC/Clang compilers, this automatically appends the `-O3` flag (maximum optimization) and `-DNDEBUG` (disable debug assertions).\n- If we had passed `Debug` instead, CMake would append `-g` (generate debug symbols) and `-O0` (disable optimizations so the code executes exactly in the order you wrote it, making stepping through it predictable).',
                '**CS lens.** This embodies static program analysis and transformation. In a Release build, the compiler is not merely translating your code; it is analyzing the control flow, predicting behavior, unrolling loops, and deleting code it proves is mathematically redundant. Debug builds forbid this because transforming the code makes it impossible to map the running machine instructions back to your original source lines.',
                '**SE lens.** The engineering principle is deployment profiles. The tradeoff is build time: a Release build takes significantly longer to compile because the optimizer is running intense graph-coloring and path-finding algorithms on your code. The standard industry practice is to use `Debug` exclusively while writing code locally, and use `Release` only when benchmarking performance or building the final artifact for deployment.'
              ],
              typeIt: true,
              solution: 'rm -rf build/\ncmake -B build -DCMAKE_BUILD_TYPE=Release\ncmake --build build',
              expectedOutput: '[LOG] Engine starting up.\nConnected to server.',
              code: '',
            },
          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: { prose: [], callouts: [], visualizations: [] },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If the simulated output doesn\'t match what you expected, re-read the reference code line by line — the walkthrough above explains exactly what each line does.',
      'Compile errors in real C++ are informative — read the first error the compiler reports, not the last; later errors are often just fallout from the first one.',
    ],
    futureLinks: [
      'Next lesson: Linking and Symbol Visibility.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Build Type"?',
      options: [
        'a build system generator. It exists to read a high-level description of your project and automatically generate the low-level, platform-specific build scripts (like Makefiles or Visual Studio project files) needed to actually compile it, isolating you from platform differences.',
        'a logical entity in a CMake build, usually an executable or a library. It exists to act as an isolated container for source files and settings, so you can apply configuration to just one part of your project without affecting the rest.',
        'a named configuration profile (like Debug or Release) that controls how the code is built. It exists to let you instantly switch between a version optimized for developer inspection (slow, but includes line numbers and variable names) and a version optimized for production (fast, heavily transformed by the compiler).'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Target"?',
      options: [
        'a logical entity in a CMake build, usually an executable or a library. It exists to act as an isolated container for source files and settings, so you can apply configuration to just one part of your project without affecting the rest.',
        'a named configuration profile (like Debug or Release) that controls how the code is built. It exists to let you instantly switch between a version optimized for developer inspection (slow, but includes line numbers and variable names) and a version optimized for production (fast, heavily transformed by the compiler).',
        'a build system generator. It exists to read a high-level description of your project and automatically generate the low-level, platform-specific build scripts (like Makefiles or Visual Studio project files) needed to actually compile it, isolating you from platform differences.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Out-of-source build"?',
      options: [
        'a named configuration profile (like Debug or Release) that controls how the code is built. It exists to let you instantly switch between a version optimized for developer inspection (slow, but includes line numbers and variable names) and a version optimized for production (fast, heavily transformed by the compiler).',
        'the practice of keeping all generated build files in a separate directory from your source code. It exists so you can cleanly delete the build artifacts (the "build directory") without risking your source code, and so you never accidentally commit generated binaries to version control.',
        'a build system generator. It exists to read a high-level description of your project and automatically generate the low-level, platform-specific build scripts (like Makefiles or Visual Studio project files) needed to actually compile it, isolating you from platform differences.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "CMake"?',
      options: [
        'the practice of keeping all generated build files in a separate directory from your source code. It exists so you can cleanly delete the build artifacts (the "build directory") without risking your source code, and so you never accidentally commit generated binaries to version control.',
        'a logical entity in a CMake build, usually an executable or a library. It exists to act as an isolated container for source files and settings, so you can apply configuration to just one part of your project without affecting the rest.',
        'a build system generator. It exists to read a high-level description of your project and automatically generate the low-level, platform-specific build scripts (like Makefiles or Visual Studio project files) needed to actually compile it, isolating you from platform differences.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**CMake** — a build system generator. It exists to read a high-level description of your project and automatically generate the low-level, platform-specific build scripts (like Makefiles or Visual Studio project files) needed to actually compile it, isolating you from platform differences.',
    '**Target** — a logical entity in a CMake build, usually an executable or a library. It exists to act as an isolated container for source files and settings, so you can apply configuration to just one part of your project without affecting the rest.',
    '**Out-of-source build** — the practice of keeping all generated build files in a separate directory from your source code. It exists so you can cleanly delete the build artifacts (the "build directory") without risking your source code, and so you never accidentally commit generated binaries to version control.',
    '**Build Type** — a named configuration profile (like Debug or Release) that controls how the code is built. It exists to let you instantly switch between a version optimized for developer inspection (slow, but includes line numbers and variable names) and a version optimized for production (fast, heavily transformed by the compiler).',
  ],

  checkpoints: ['read-intuition'],
}
