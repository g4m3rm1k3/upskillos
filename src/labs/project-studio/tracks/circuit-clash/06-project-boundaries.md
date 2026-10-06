---
title: Build boundaries, dependencies, and Git
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: csharp
pedagogy: typed
console: true
---

We now create the actual game projects. Keep Scratch for experiments; it is not a dependency of the game.

## Make the rules a library

Create `Core`, `Game`, and `Checks` folders alongside Scratch. Core is a library: omit OutputType Exe because another program calls it. It will contain ordinary C# and System.Numerics vectors, with no window, keyboard, or graphics package dependency. Checks references Core, so rules can run without a display. Game references Core and Raylib.

The dependency direction is Game → Core and Checks → Core. Core must never call Game to display a message. Instead it stores an event/message and the presentation reads it. This prevents a headless training run from requiring a window and lets us test the same rules the player uses.

Type this fragment in `Core/Core.csproj`. Start or replace this file.

```xml edit=Core/Core.csproj mode=replace
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
```

## Pin the rendering binding

A ProjectReference tells the build to compile another project first and make its public types available. `../Core/Core.csproj` means move up from Game, then into Core. PackageReference fetches the C# binding and its native Raylib runtime through NuGet. Pinning 8.1.0 avoids silently teaching against whatever API is newest tomorrow.

A binding translates managed calls into a native library's calling convention. It does not implement our game logic. A compile-time missing method suggests API/version mismatch; a runtime native-library load failure suggests the operating system, architecture, or deployment files. Those failures need different investigations.

[Raylib-cs 8.1.0](https://www.nuget.org/packages/Raylib-cs/8.1.0) targets .NET 8 and 10. We use net10.0 consistently. Run `dotnet restore Game` after typing this file. Restore may need network access and may print vulnerability information. Do not disable security checks to hide a warning; inspect the affected dependency and advisory.

Type this fragment in `Game/Game.csproj`. Start or replace this file.

```xml edit=Game/Game.csproj mode=replace
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="../Core/Core.csproj" />
    <PackageReference Include="Raylib-cs" Version="8.1.0" />
  </ItemGroup>
</Project>
```

## Give tests their own executable

Checks is an executable because its entry point will run assertions. It references Core, not Game. A failed assertion must produce a nonzero exit code so a command-line check or CI job can detect failure without interpreting a screenshot.

We start with a tiny assertion runner to expose what a test actually does. Larger teams commonly use a test framework for isolated cases, richer reporting, fixtures, and discovery. The transferable contract is arrange known input, execute behavior, assert an observable result, and fail the process when the requirement is violated. Our executable stops at its first failed assertion, a limitation we keep visible.

Type this fragment in `Checks/Checks.csproj`. Start or replace this file.

```xml edit=Checks/Checks.csproj mode=replace
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="../Core/Core.csproj" />
  </ItemGroup>
</Project>
```

## Keep source and generated output separate

Builds produce bin and obj directories beneath each project. They contain compiled output, intermediate files, and restored dependency metadata. They can be regenerated and do not belong in source commits. Player saves and learned policy data also do not belong in the code repository by default. This ignore file uses `**/` to match generated folders at any depth.

Run `git --version` to confirm Git is installed. In your new learning folder, run `git init`, then `git status`. Review `git diff`, stage specific source paths with `git add`, inspect `git diff --cached`, and make a checkpoint commit with `git commit -m "Create C# project boundaries"`. Staging chooses what the next commit contains; editing a staged file afterward does not silently update that staged version.

A commit records a snapshot, not a backup of every untracked file. Before experiments, use `git switch -c experiment/track`. To restore a tracked file from the current commit, first inspect its diff, then use `git restore -- path/to/file` only when you intend to discard those edits. To undo a published commit while preserving history, use `git revert`, which creates an inverse commit. These operations solve different recovery problems.

Type this fragment in `.gitignore`. Start or replace this file.

```text edit=.gitignore mode=replace
**/bin/
**/obj/
play-data/
artifacts/
native-race.png
```

## Practice a conflict without risking your game

After committing a small notes file, make a branch `practice/a`, change its first line, and commit. Return to your original branch, change that same line differently, and commit. Merge `practice/a`. If Git cannot choose a combined meaning, it reports a conflict and marks competing regions with `<<<<<<<`, `=======`, and `>>>>>>>`.

Open the file, decide the intended final sentence, and remove all markers. Stage the resolved file and finish the merge commit. Run `git status` to verify that no unresolved files remain. If you are not ready to resolve it, `git merge --abort` attempts to return to the pre-merge state; begin this exercise with a clean working tree so your own edits are not entangled.

A conflict is not fixed merely by deleting markers. The final code must satisfy both intended requirements and pass checks. Later every milestone ends with build, behavior checks, and a focused diff so you can explain exactly what changed.

## Challenge — return to this later

This is optional. You can continue without completing it; no later guided step depends on your solution. Keep your attempt and revisit it.

Recover a deliberately deleted committed notes file, then compare that with recovering an untracked file. Explain why Git can restore one but may have no record of the other.

