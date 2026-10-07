---
title: A17 — Teach the build which files depend on which
track: C++ Games — Build the Project
trackOrder: 4.3
runtime: cpp
console: true
---

**Outcome:** Describe and build the dependency graph for a shared library and its callers.

**Recall before looking at code:** Which source file is shared by the demo and the tests? Which file owns each main?

Repeating long compiler commands makes it easy to forget a source. CMake will describe the relationships once: a score library, a demo and test programs. CMake does not replace the compiler. Your finish line is a build from a new empty build directory and a test runner that actually discovers both test programs.

## Check the build tools

Run cmake --version and ninja --version. **CMake** configures a build from a project description. **Ninja** executes the resulting build tasks. This lesson uses the Ninja generator and g++ consistently on each platform. The desktop C++ toolchain may already provide both; if a command is missing, install CMake and Ninja from their official distributions or your platform package manager, then reopen the terminal. Do not keep guessing commands while a required tool is unavailable.

A **source directory** contains files you edit. A **build directory** contains generated files and executables. We will use build-dice for generated output; never put learner source there. Read the [official CMake tutorial](https://cmake.org/cmake/help/latest/guide/tutorial/index.html) alongside the small commands below.

Check that your CMake supports the declared minimum version before configuring. The author verification used CMake 4.4.2, Ninja and g++ on Windows; other platforms use these same commands but are not claimed as verified here.

```check
run "cmake --version"
run "ninja --version"
```

## Name the project and configure a build directory

Create CMakeLists.txt in the project root. CMake commands use command_name(arguments), not C++ statements. cmake_minimum_required sets the supported policy baseline and rejects older CMake versions. project names the project and enables the C++ language (CXX). There is no executable target yet.

**Edit `CMakeLists.txt`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cmake file=CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(DiceLab LANGUAGES CXX)
```

Run cmake -S . -B build-dice -G Ninja -DCMAKE_CXX_COMPILER=g++. -S . selects the current source directory. -B selects the generated build directory. -G chooses the Ninja generator. -D supplies a configuration value; here it selects g++ as compiler. Configuration can succeed without building a program. Do not call that a passing game test.

```check
run "cmake -S . -B build-dice -G Ninja -DCMAKE_CXX_COMPILER=g++"
```

## Describe a shared library and its requirements

A **target** is a named output or build task. add_library creates dice_rules, a static library of compiled score code. STATIC means its code will be linked into the callers. The next commands describe **usage requirements**: headers are found in include, and the interface uses C++20. PUBLIC means the target needs the requirement and its linked callers inherit it.

**Edit `CMakeLists.txt`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cmake file=CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(DiceLab LANGUAGES CXX)
add_library(dice_rules STATIC src/dice/Score.cpp)
target_include_directories(dice_rules PUBLIC include)
target_compile_features(dice_rules PUBLIC cxx_std_20)
```

Reconfigure, then run cmake --build build-dice. It compiles the library, but there is still no runnable demo. A **dependency** is another target whose outputs or requirements are needed to build a target.

```check
run "cmake -S . -B build-dice -G Ninja -DCMAKE_CXX_COMPILER=g++"
run "cmake --build build-dice"
```

## Connect the executable to its dependency

add_executable names score_demo and its entry source. target_link_libraries gives it the dice_rules dependency. PRIVATE here means this application consumes that dependency without declaring it as part of a reusable interface for other targets. It does not cancel the library’s PUBLIC requirements.

```predict
question: Does the demo need to repeat the include directory command?
choice: No, it inherits the library requirement
choice: Yes, every target must repeat it
answer: No, it inherits the library requirement
explain: Linking dice_rules conveys its PUBLIC usage requirements to the caller.
```


**Edit `CMakeLists.txt`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cmake file=CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(DiceLab LANGUAGES CXX)
add_library(dice_rules STATIC src/dice/Score.cpp)
target_include_directories(dice_rules PUBLIC include)
target_compile_features(dice_rules PUBLIC cxx_std_20)
add_executable(score_demo apps/score_demo.cpp)
target_link_libraries(score_demo PRIVATE dice_rules)
```

Configure, build and run ./build-dice/score_demo. Expect points=5. The application’s source list contains main; the library’s source list does not.

```check
run "cmake -S . -B build-dice -G Ninja -DCMAKE_CXX_COMPILER=g++"
run "cmake --build build-dice"
run "./build-dice/score_demo" stdout="points=5"
```

## Register a test with the runner

**CTest** is CMake’s test runner. enable_testing permits registration. The test executable is an ordinary target; add_test registers how to run it. NAME labels the test result; COMMAND names the target executable. Registering and building are separate operations.

**Edit `CMakeLists.txt`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.

```cmake file=CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(DiceLab LANGUAGES CXX)
add_library(dice_rules STATIC src/dice/Score.cpp)
target_include_directories(dice_rules PUBLIC include)
target_compile_features(dice_rules PUBLIC cxx_std_20)
add_executable(score_demo apps/score_demo.cpp)
target_link_libraries(score_demo PRIVATE dice_rules)
enable_testing()
add_executable(score_contract tests/shared_score.cpp)
target_link_libraries(score_contract PRIVATE dice_rules)
add_test(NAME score_contract COMMAND score_contract)
```

Configure and build, then run ctest --test-dir build-dice --output-on-failure. --test-dir selects the generated build directory; --output-on-failure reveals test diagnostics when a case fails. Confirm score_contract appears. A runner reporting no tests is not evidence of correct rules.

```check
run "cmake -S . -B build-dice -G Ninja -DCMAKE_CXX_COMPILER=g++"
run "cmake --build build-dice"
run "ctest --test-dir build-dice --output-on-failure" stdout="score_contract"
```

## Try it — Remove a dependency requirement

Temporarily change target_include_directories from PUBLIC to PRIVATE. The library still sees its header, but a clean build of the caller should report that dice/Score.hpp cannot be found. Restore PUBLIC and rebuild. Then remove only add_test: the executable can still build even though CTest no longer runs it. Restore the registration. These are different failure modes.



## Your turn — Add and run the second test

Edit CMakeLists.txt without a supplied target. Register the existing tests/score_boundaries.cpp as executable score_boundaries, link the rule library, and register it with CTest under the same name. Configure a new build-dice-fresh directory to prove the source description is sufficient without old objects.

```text
cmake -S . -B build-dice-fresh -G Ninja -DCMAKE_CXX_COMPILER=g++
cmake --build build-dice-fresh
ctest --test-dir build-dice-fresh --output-on-failure
./build-dice-fresh/score_demo
```

```hints
nudge: Building a test program and registering it are different steps.
concept: This executable consumes the same library as the earlier caller.
shape: Declare a target for the existing test source, link dice_rules and register a CTest name.
```

**Ready to move on:** draw the three callers and their shared dependency. Explain configure versus build versus test. In your own README, record these commands, the required tools and the role of apps, include, src, tests and build directories. Keep generated build folders out of source control. Do not delete your source folder to demonstrate a clean build; use a new build directory.

```check
run "cmake -S . -B build-dice-fresh -G Ninja -DCMAKE_CXX_COMPILER=g++"
run "cmake --build build-dice-fresh"
run "ctest --test-dir build-dice-fresh --output-on-failure" stdout="score_boundaries"
run "./build-dice-fresh/score_demo" stdout="points=5"
```

