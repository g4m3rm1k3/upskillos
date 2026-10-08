---
title: Launch the game and expose reproducible experiments
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

The entry point chooses a mode, owns the graphics resource lifecycle, and passes storage paths explicitly. We replace the earlier triangle experiment rather than hiding a second entry point.

## Resolve a data directory and an offline training mode

args contains command-line arguments after the executable name. FirstOrDefault selects the first `--data=` option or null. The null-conditional range `[7..]` removes that prefix; `??` chooses the operating system's local application-data directory if no option exists. Path.Combine handles separators rather than concatenating platform-specific slashes.

A caller can use `--data=play-data` to keep experiments in a dedicated directory. That is separate from source and ignored by Git. The directory is created before policy paths are used. Passing an invalid or unwritable directory can fail early with an exception; the command-line tool should report failure rather than claim a successful save.

When --train is present, the program runs the headless experiment, prints progress every sixty episodes, saves the completed table, and returns before opening a window. Top-level return exits the generated entry method. Graphics availability therefore cannot affect whether the simulation can train.

Type this fragment in `Game/Program.cs`. Start or replace this file.

```csharp edit=Game/Program.cs mode=replace
using Raylib_cs;
using CircuitClash;

string directory = args.FirstOrDefault(a => a.StartsWith("--data="))?[7..]
    ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"CircuitClash");
Directory.CreateDirectory(directory);
string policyPath = Path.Combine(directory,"policy.json");
if (args.Contains("--train"))
{
    Policy trained = Training.Train(600,n => { if (n%60==0) Console.WriteLine($"Trained {n}/600"); });
    PolicyFile.Save(trained,policyPath); return;
}
```

## Print paired held-out results as data

Evaluation loads the saved policy and prints a CSV header. The outer loop compares scripted and learned tactics; the inner loop uses the held-out seeds. FormattableString.Invariant fixes decimal formatting independently of the machine's locale, preventing a decimal comma from accidentally creating an extra CSV column.

Each row records controller, seed, seconds, place, hits, and suffered hits. A result is evidence about this experiment, not a rank attached permanently to the algorithm. Keep the raw rows so you can inspect variation instead of only a favorable mean.

The tool deliberately fails if the policy file is missing or invalid. Train first or choose the correct data directory. Silently evaluating an empty table under the label learned would produce misleading results even if the program ran successfully.

Type this fragment in `Game/Program.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/Program.cs mode=append
if (args.Contains("--evaluate"))
{
    Policy policy = PolicyFile.Load(policyPath);
    Console.WriteLine("controller,seed,seconds,place,hits,suffered");
    foreach (bool scripted in new[] {true,false}) for (int seed = 9100; seed < 9112; seed++)
    {
        var result = Training.Evaluate(policy,seed,scripted);
        Console.WriteLine(FormattableString.Invariant($"{(scripted ? "scripted" : "learned")},{seed},{result.Seconds:F2},{result.Place},{result.Hits},{result.Suffered}"));
    }
    return;
}
```

## Own and close the native window

InitWindow creates the desktop graphics context. SetExitKey Null disables Raylib's default Escape-to-exit behavior because Escape belongs to our pause flow. The window close control still ends the main loop. TargetFPS paces drawing; App's accumulator still determines simulation steps.

App loads the persistent session. --demo starts automated driving; --capture also starts a demo and exits after a bounded number of frames with a screenshot. The screenshot helper writes its filename under the working directory, so we pass a simple relative name rather than assume it honors an absolute path.

Every frame reads elapsed time, updates, and draws. Finally closes the window even when an exception leaves the loop. This releases native resources that managed garbage collection alone does not own. The capture path is a render smoke test, not evidence of manual driving quality or a complete race.

Type this fragment in `Game/Program.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/Program.cs mode=append
Raylib.InitWindow(1200,720,"Circuit Clash / C# engineering");
Raylib.SetExitKey(KeyboardKey.Null); Raylib.SetTargetFPS(60);
try
{
    App app = new(directory);
    bool capture = args.Contains("--capture");
    if (args.Contains("--demo") || capture) app.Start(true);
    int frames = 0;
    while (!Raylib.WindowShouldClose())
    {
        float elapsed = Raylib.GetFrameTime(); app.Update(elapsed); app.Draw(elapsed);
        if (capture && ++frames == 300) { Raylib.TakeScreenshot("native-race.png"); break; }
    }
}
finally { Raylib.CloseWindow(); }
```

## Verify and explain the boundary

Run `dotnet run --project Game -- --data=play-data`. The first `--` ends dotnet options and passes the following options to your program. You should see the native main menu, generated world, and kart.

Exercise this sequence: start a race; steer; select and fire each weapon; use shield and boost; recover; pause; switch to another application; resume; finish or observe a demo finish; enter garage; buy and re-equip; close and reopen to verify persistence. Confirm a demo gives no credits. Use Tab/Enter for menus as well as mouse clicks. If a check fails, record the initial state and exact input sequence.

Then run `dotnet run --project Game -- --train --data=play-data` and `dotnet run --project Game -- --evaluate --data=play-data`. Training prints its final completed count; evaluation prints CSV rows. The native implementation is behaviorally comparable to the browser sample, not numerically identical. Its hand-written CPU face lighting and Raylib presentation intentionally differ from the browser's Three.js rendering.

