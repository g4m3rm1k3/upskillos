---
title: One simulation step with a defined order
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: csharp
pedagogy: typed
console: true
---

The race now has all its component operations. We need one entry point that establishes when and in which order they are allowed to run.

## Order results and establish the simulation transaction

Ranking orders finished racers by finish time. Null finish values become positive infinity, so unfinished racers follow. Their progress sorts descending; Id provides a deterministic final tie-break. ToArray materializes the order so a later state change cannot silently alter a deferred query during display.

Tick is the simulation's entry point. Paused and Finished return before any timer advances. Countdown consumes time without moving racers. During racing, Time advances, each unfinished kart applies the input indexed by its Id, then contacts, combat, and pickups run in that explicit order. Changing this order changes who can be hit or collect equipment on a tick.

All production callers use the default fixed Step. The dt parameter exists for focused experiments, not permission to mix arbitrary display intervals with reward shaping. The race ends when the player finishes or the time limit is reached. Opponents still unfinished are ranked by progress. That is the product rule, not an accidental consequence of stopping the window.

Type this fragment in `Core/Race.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Race.cs mode=append
    public Kart[] Ranking() => Karts.OrderBy(k => k.Finish ?? float.PositiveInfinity)
        .ThenByDescending(k => k.Progress).ThenBy(k => k.Id).ToArray();
    public void Tick(Control[] controls, float dt = Step)
    {
        if (Phase == Phase.Paused || Phase == Phase.Finished) return;
        if (Countdown > 0)
        {
            Countdown = Math.Max(0, Countdown - dt);
            if (Countdown == 0) Phase = Phase.Racing;
            return;
        }
        Time += dt;
        foreach (Kart kart in Karts) if (kart.Finish == null) Move(kart, controls[kart.Id], dt);
        Contacts(); Combat(dt); Collect(dt);
        if (Karts[0].Finish != null || Time >= 180) Phase = Phase.Finished;
    }
}
```

## Build the complete rules

Run `dotnet build Core`. The Race declaration is now complete. If compilation fails, first inspect braces at fragment boundaries, then referenced names. Do not remove a behavior merely to silence a diagnostic.

Trace a racing tick and a paused tick on paper. In the paused case, no countdown, effect, pickup, projectile, or race clock changes. In the racing case, requests are supplied before rules run. We will keep that order in both the human game and headless training, avoiding a second inconsistent implementation of the rules.

