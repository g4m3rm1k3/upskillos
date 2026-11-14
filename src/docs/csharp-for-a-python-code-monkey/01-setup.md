# Setup: compile and run a native Windows app

Run these from PowerShell in the repository root:

```powershell
dotnet --list-sdks
./src/docs/csharp-for-a-python-code-monkey/tetris/run.ps1 -Stage 01
```

Expected result: a native window saying `Hello, Python code monkey.` Close it before building the next stage. A running executable can lock its output files.

## What must be installed

These checkpoints target **Windows x64 and .NET 10**. Install the .NET 10 SDK, not just the runtime. An editor with C# support helps; Visual Studio with WinUI development tooling provides XAML editing and debugging. The project also references Windows App SDK and Windows SDK build tools through NuGet. First restore needs Internet access. You do not need Unity, Godot, Python, Node, or the React dev server to run this project.

Microsoft's [WinUI setup guide](https://learn.microsoft.com/en-us/windows/apps/get-started/start-here) covers the development tools. The [unpackaged application guide](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/unpackage-winui-app?tabs=csharp) explains the deployment model used here. The project pins Windows App SDK `2.2.0`; that is a reproducible dependency choice, not a claim about the newest release.

If PowerShell policy blocks the helper script, you can run its underlying command directly without changing system policy:

```powershell
dotnet run --project src/docs/csharp-for-a-python-code-monkey/tetris/Tetris.csproj --property:Stage=01 --property:Platform=x64 --no-launch-profile
```

Use two digits for the stage. `01` and `1` select different folder names.

## The smallest source is not the whole toolchain

Python often lets you start with `python game.py`. For this application, C# source is compiled and XAML is processed before the program launches. There is some project scaffolding even when the window does almost nothing.

| File | Its job | Rough Python comparison |
|---|---|---|
| `Tetris.csproj` | Select target framework, dependencies, and source files | Parts of `pyproject.toml`, plus build instructions |
| `Directory.Build.props` | Choose the default checkpoint and separate build folders | Shared build configuration |
| `App.xaml` | Declare application resources | Framework setup |
| `App.xaml.cs` | Create and activate the first window | Startup code in a GUI script |
| `checkpoints/01/MainWindow.xaml` | Describe the window's content | Constructing GUI widgets |
| `checkpoints/01/MainWindow.xaml.cs` | Implement the window's C# behavior | Widget callbacks and initialization |
| `app.manifest` | Declare Windows application compatibility | No exact equivalent |

Open those files in that order. You do not need to memorize their contents. You do need to distinguish build configuration from code that executes when a key is pressed.

`--property:Stage=01` tells MSBuild to compile the files under `checkpoints/01/`. It does not switch behavior inside a giant running program. The other checkpoints are not compiled into this executable. Their outputs live in separate `bin/<stage>/` and `obj/<stage>/` folders.

`WindowsPackageType=None` makes this an unpackaged app. `WindowsAppSDKSelfContained=true` copies the Windows App SDK runtime beside the program. `.NET SelfContained=false` means it still uses an installed .NET runtime. These are two different runtime dependencies.

## Build versus run

```powershell
dotnet build src/docs/csharp-for-a-python-code-monkey/tetris/Tetris.csproj --property:Stage=01 --property:Platform=x64
```

`build` produces the program without opening its window. `run` builds as needed and starts it. Compiler errors happen before the application runs; runtime exceptions happen while it executes.

## If it fails

| Symptom | What to inspect |
|---|---|
| `dotnet` not recognized | Install the SDK and reopen the terminal |
| Target framework unsupported | Confirm `dotnet --list-sdks` includes 10.x |
| `NU1301` or restore failure | NuGet connectivity, proxy, or package source availability |
| `NU1900` | Vulnerability metadata could not be fetched; distinguish this warning from a compilation error |
| XAML compiler exits without useful detail | Run `dotnet build` with `--verbosity:normal`; inspect the first error |
| Build cannot overwrite an executable | Close that checkpoint's running window |
| Key presses do nothing in later lessons | Click the board; inspect keyboard focus |

## Predict, then check

Would changing the greeting in checkpoint 02 change the program launched with `-Stage 01`?

**Answer:** no. The project selects one checkpoint's files at build time. This is why we can safely keep a beginner version and an extracted-class version beside each other.

Continue to [a running window](02-a-window.md).
