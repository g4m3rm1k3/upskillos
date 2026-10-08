---
title: Profile, package, and investigate a release
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

You now have the guided game. Finishing software engineering work also means understanding performance, producing a runnable artifact, and reporting limitations honestly.

## Measure before changing architecture

The world currently regenerates static geometry and small arrays while drawing. That is easy to inspect but may cause unnecessary CPU work and garbage collection. Measure frame time while driving through the same section, with the same window size and build configuration. Compare a Release build using `dotnet run --project Game -c Release -- --data=play-data` with Debug before making claims.

A frame budget at 60 frames per second is about 16.67 milliseconds. Average time can hide visible stalls; inspect worst or percentile frames too. Separate time spent in simulation, geometry generation, submission, and waiting for the frame limiter. A profiler's sample count identifies where execution spends time; it does not automatically identify the best design change.

A justified optimization would cache static road/tree triangles once, while leaving moving kart transforms dynamic. Another would use a single-pass nearest target search instead of sorting. For each, state the expected reduced work, preserve existing behavioral tests, and compare measurements. Do not rewrite everything into an entity-component framework because a pattern sounds professional. The current boundaries already permit replacing one implementation at a time.

## Produce a native artifact for a specific platform

First run the checks and build in Release. A runtime identifier selects operating system and processor: osx-arm64 for Apple silicon, osx-x64 for Intel macOS, win-x64 for common 64-bit Windows, or linux-x64 for common 64-bit Linux. Choose the machine on which you will test. A successful cross-platform publish is not proof that the target window system works.

For Apple silicon, run `dotnet publish Game/Game.csproj -c Release -r osx-arm64 --self-contained true -o artifacts/osx-arm64`. The framework, managed assemblies, and native binding files are copied into the output. Self-contained means the recipient does not need a separately installed matching .NET runtime; it does not eliminate operating-system graphics dependencies.

Run `artifacts/osx-arm64/Game --data=play-data --demo` from the learning root. On Windows use the generated Game.exe in the corresponding output. Distribute the whole publish directory, not just the executable: Raylib's native library and other files are part of the artifact. Signing, notarization, installers, and store distribution are separate release work; this lesson produces a local runnable folder, not a signed consumer installer.

## Investigate a failure from evidence

Imagine the published game opens on your machine but fails on another. Ask for the exact artifact version, operating system/architecture, launch command, and full error. A missing native library, denied file permission, invalid save schema, and a graphics initialization failure require different fixes. Reproduce using a fresh data directory before altering a real player's file.

If purchases disappear, trace Select → Save → destination path → Load → validation. Confirm that launch commands use the same --data directory. Do not infer persistence from a success-colored button. If training freezes the UI, inspect whether it ran on the main thread or whether code accessed Task.Result before completion.

If the road disappears, inspect a single triangle's positions, winding, normal, and camera before rewriting the renderer. A controlled reduction to the first-window experiment can separate the library environment from the world's geometry. Preserve a minimal reproduction and restore the working source through a reviewed Git change.

## Write a reviewable release record

Record the requirements delivered, the exact commands run, their results, the platform actually tested, and remaining limitations. Include the arcade physics approximation, fixed desktop layout, programmed steering, frozen tactical policies during play, and local save scope. Neither “all tests pass” nor “AI works” communicates those boundaries.

Review the diff for generated files, personal saves, unrelated edits, and accidental changes to package/action order. Commit source and teaching notes in focused changes. For future feature work, use a branch, write a behavioral example, make a meaningful failing test when the behavior is testable, implement it, refactor, and review the evidence.

An automated build service can run the same Core checks without a display, then build Game. A graphics smoke test needs a compatible graphical runner and cannot be replaced by pretending a headless compile rendered a frame. Keep those jobs' claims separate.

## Challenge — return to this later

This is optional. You can continue without completing it; no later guided step depends on your solution. Keep your attempt and revisit it.

Cache the static road geometry behind a small mesh data type. Measure before and after, preserve winding checks, and explain memory cost versus reduced per-frame work. This is an optional optimization; the complete guided game already runs without it.

