---
title: Application state, focus pause, and fixed-step execution
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

We will assemble the application shell in this lesson and its menus in the next. The completed shell will connect existing systems without duplicating their rules.

## Own the application lifecycle explicitly

Screen describes which interface is active; Phase describes whether the race simulation is advancing. They are related but not identical: the garage menu has no corresponding physics phase. Keeping both concepts explicit prevents menu layout from becoming the authoritative rule for whether projectiles move.

App owns world presentation, keyboard adapter, persistence paths, garage, policy, and the current race. Its private fields cannot be changed directly by arbitrary callers. Demo controls whether the player is automated; paid prevents duplicate rewards; canSave protects an unreadable original garage. These booleans each name a specific lifecycle condition rather than one ambiguous “active” flag.

Task<Policy>? represents either no training operation or an asynchronous computation that will yield a Policy. Completed is the progress count shared with that operation. We will use thread-safe operations for it rather than assume ordinary reads and writes establish a cross-thread communication protocol.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Game/App.cs`. Start or replace this file.

```csharp edit=Game/App.cs mode=replace
using Raylib_cs;
using CircuitClash;

public sealed class App
{
    private enum Screen { Menu, Garage, Race, Pause, Results, Learning }
    private Screen screen = Screen.Menu;
    private readonly World world = new();
    private readonly KeyboardDriver keyboard = new();
    private readonly string directory, garagePath, policyPath;
    private Garage garage;
    private Policy policy = new();
    private Race race;
    private bool scripted = true, demo, paid, canSave;
    private float accumulator;
    private string notice;
    private Task<Policy>? training;
    private int completed;
```

## Load state at the boundary and start clean races

The constructor creates the chosen data directory and combines paths using the platform path API. Garage.Load returns both usable session state and a warning. A nonempty warning disables automatic replacement of the original file. Policy loading is independent: a missing or invalid policy leaves scripted rivals available.

Start creates a new Race rather than trying to reset every field of the previous one manually. It resets reward bookkeeping, accumulated time, and pending input together. Environment.TickCount supplies varying seeds for ordinary play; reproducible experiments use explicit seeds through Training instead.

Save refuses to overwrite a preserved garage until the UI explicitly enables it. Expected I/O and permission errors become notices while the session continues in memory. A successful method return establishes that this write completed, not that a disk can never fail afterward. Keep that distinction in user-facing wording.

Type this fragment in `Game/App.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/App.cs mode=append
    public App(string directory)
    {
        this.directory = directory; Directory.CreateDirectory(directory);
        garagePath = Path.Combine(directory,"garage.json"); policyPath = Path.Combine(directory,"policy.json");
        garage = Garage.Load(garagePath,out notice); canSave = notice.Length == 0;
        race = new Race(1,garage.Selected);
        try { if (File.Exists(policyPath)) { policy = PolicyFile.Load(policyPath); scripted = false; } }
        catch (Exception e) when (e is IOException or System.Text.Json.JsonException)
        { notice = "Policy unavailable; using scripted rivals."; }
    }
    public void Start(bool watch = false)
    {
        race = new Race(Environment.TickCount,garage.Selected);
        demo = watch; paid = false; accumulator = 0; keyboard.Clear(); screen = Screen.Race;
    }
    private void Save()
    {
        if (!canSave) { notice = "Save preserved. Choose Use new garage to replace it."; return; }
        try { garage.Save(garagePath); notice = "Garage saved."; }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        { notice = "Save failed; session still works: " + e.Message; }
    }
```

## Accept a completed worker result on the main thread

Update checks whether a training task has finished. Only IsCompletedSuccessfully permits reading Result as a successful policy. While it is still running, Result would block the calling thread, freezing the window. On success, App adopts the new policy and attempts to save it. On failure, the previous policy remains usable.

The worker owns the policy it is constructing. The main thread reads it only after completion, avoiding simultaneous mutation of one dictionary during rendering or racing. Progress is a separate small shared value. That ownership model is simpler than putting locks around every table access.

After processing completion, a non-race screen returns before input or physics. Escape or loss of window focus changes the phase to Paused, selects the pause screen, and clears input. This protects the player when switching applications. Resume will explicitly reset accumulated time so the game does not simulate all the time spent away.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Game/App.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/App.cs mode=append
    public void Update(float elapsed)
    {
        if (training?.IsCompleted == true)
        {
            if (training.IsCompletedSuccessfully)
            {
                policy = training.Result; scripted = false;
                try { PolicyFile.Save(policy,policyPath); notice = "Training finished. Policy saved."; }
                catch (Exception e) when (e is IOException or UnauthorizedAccessException) { notice = "Trained but could not save: " + e.Message; }
            }
            else notice = "Training failed. Previous policy kept.";
            training = null;
        }
        if (screen != Screen.Race) return;
        if (Raylib.IsKeyPressed(KeyboardKey.Escape) || !Raylib.IsWindowFocused())
        { race.Phase = Phase.Paused; screen = Screen.Pause; keyboard.Clear(); return; }
```

## Accumulate display time into fixed simulation steps

A display frame contributes elapsed seconds to an accumulator, capped at .1 to prevent an unbounded catch-up after a long stall. While at least one fixed Step remains, compute a complete Control array, advance the race once, and subtract exactly Step. A fast display may draw with zero simulation ticks; a slow frame may run several.

The driver expression chooses keyboard only for kart zero in a normal race; demos and opponents use the computer strategy. Casting keyboard to IDriver gives the conditional expression one shared contract type. ToArray resolves all decisions before state mutation by Tick.

Once finished, award credits only to a non-demo player who actually finished, and only once. Rank index zero receives the largest award. The balance cap matches save validation. Mark paid and switch screen before leaving the loop so subsequent display frames cannot pay again.

Clamping means the simulation intentionally slows relative to wall time during severe stalls. This avoids a spiral of catch-up work. It is a documented tradeoff, not perfect real-time synchronization or network lockstep.

Type this fragment in `Game/App.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/App.cs mode=append
        keyboard.Capture(); accumulator += Math.Min(0.1f,elapsed);
        IDriver rivals = new WaypointDriver(policy,scripted);
        while (accumulator >= Race.Step)
        {
            Control[] input = race.Karts.Select(k => (k.Id == 0 && !demo ? (IDriver)keyboard : rivals).Decide(race,k)).ToArray();
            race.Tick(input); accumulator -= Race.Step;
            if (race.Phase == Phase.Finished)
            {
                if (!paid && !demo && race.Karts[0].Finish != null)
                {
                    int place = Array.IndexOf(race.Ranking(),race.Karts[0]);
                    garage.Credits = Math.Min(100000,garage.Credits + 60 + (3-place)*30); Save();
                }
                paid = true; screen = Screen.Results; break;
            }
        }
    }
```

## Render a world and select one screen

Draw first updates camera presentation using display elapsed time, then begins a frame and draws the world. The menu camera is selected with a pattern matching any of three screen values. The race screen draws the HUD; other screens draw a panel and dispatch to one menu method.

Ui.Begin and Ui.End bracket all controls for focus bookkeeping. Raylib.BeginDrawing and EndDrawing bracket the whole frame. These are two different lifecycles even though both use Begin/End naming. Nest them consistently.

Draw may cause application transitions through button results, but it never calls Race.Tick or modifies physics timers. The screen methods added next complete this class. Save each fragment now and wait until the final HUD step before building App; the declared method references will then all exist.

Type this fragment in `Game/App.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/App.cs mode=append
    public void Draw(float elapsed)
    {
        world.Camera(race.Karts[0],elapsed,screen is Screen.Menu or Screen.Garage or Screen.Learning);
        Raylib.BeginDrawing(); Raylib.ClearBackground(new Color(184,217,228,255)); world.Draw(race);
        Ui.Begin(); Ui.Text("CIRCUIT CLASH / ALPINE CIRCUIT",24,20,24,Art.Dark);
        if (screen == Screen.Race) Hud();
        else
        {
            Ui.Panel(20,60,500,620);
            if (screen == Screen.Menu) Menu();
            if (screen == Screen.Garage) GarageMenu();
            if (screen == Screen.Pause) PauseMenu();
            if (screen == Screen.Results) Results();
            if (screen == Screen.Learning) Learning();
        }
        Ui.End(); Raylib.EndDrawing();
    }
```

