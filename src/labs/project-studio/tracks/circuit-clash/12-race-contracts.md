---
title: Race contracts — state, observations, and equipment
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

Before implementation, specify these cases in your notes: an empty rocket inventory cannot create a projectile; energy 34 cannot activate a shield; energy 35 can; a second action during cooldown cannot spend resources. Each case names initial state, request, and result. We will compile the rules after each feature lesson, so a mistake stays close to the fragment that introduced it.

## Keep the build working between features {#buildable-features}

Race has several related operations. C# permits one class declaration to be split across source files with the `partial` modifier. All parts use the same namespace and class name; the compiler combines them into one type. This does not create multiple Race objects, inheritance, or separate runtime components.

We use Race.cs for initial state and equipment, Race.Driving.cs for movement/checkpoints, Race.Combat.cs for interactions, and Race.Tick.cs for sequencing. Each lesson finishes its part and builds Core. The boundary is source organization, not encapsulation: all parts still share the same fields. If responsibilities later need independent ownership, extracting collaborating classes is a different design change.

If you already completed an earlier edition with one Race.cs, keep a committed checkpoint before revisiting these steps. Do not append duplicate methods to that completed class. Starting this lesson replaces Race.cs with the first part; later lessons create the remaining parts. The final behavior and public type remain the same.

## Own the state and seed the experiment

Race owns the roster, hazards, pickups, message queue, and random generator. Step is one sixtieth of a second. A readonly roster field prevents replacing its array but not updating a kart. That lets one stable set of identities participate throughout a race.

The constructor creates each kart with a distinct Id and upgrade, then adds a small seeded lane variation. NextDouble produces a value from zero inclusive to one exclusive. Subtracting 0.5 centers it around zero; multiplying by 1.5 gives an offset in [-0.75,0.75). The float cast matches our simulation number type.

A seed makes repeated calls to the same random algorithm reproducible within this toolchain. Reproducibility also requires the same order of calls and initial state; merely storing a seed is insufficient if iteration order changes. We keep one generator per race rather than repeatedly constructing time-seeded generators inside updates.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Core/Race.cs`. Start or replace this file.

```csharp edit=Core/Race.cs mode=replace
using System.Numerics;
namespace CircuitClash;

public sealed partial class Race
{
    public const float Step = 1f / 60;
    public readonly Kart[] Karts;
    public readonly List<Hazard> Hazards = new();
    public readonly Pickup[] Pickups = { new(35), new(95), new(155), new(215), new(275), new(335) };
    public readonly Queue<string> Messages = new();
    public readonly Random Random;
    public Phase Phase = Phase.Countdown;
    public float Countdown = 3, Time;
    public Race(int seed, Package package)
    {
        Random = new Random(seed);
        Karts = new[] { new Kart(0, "You", package), new Kart(1, "Ember", Package.Engine),
            new Kart(2, "Volt", Package.Handling), new Kart(3, "Echo", Package.Armor) };
        foreach (Kart kart in Karts)
        {
            kart.Lane += (float)(Random.NextDouble() - 0.5) * 1.5f;
            kart.Place(kart.Index, kart.Lane);
        }
    }
```

## Bound events and centralize legal actions

Enqueue adds a message at the end; Dequeue removes the oldest. The while loop retains at most three, bounding screen clutter and memory. The race records meaning; it does not draw text.

Legal always includes Race, meaning no equipment action. During cooldown it returns immediately with that one choice. Otherwise it adds rocket and mine when ammunition exists, and shield/boost when energy is at least 35. At exactly 35 both energy actions are legal, but selecting one will spend the shared resource.

Returning a newly created List gives the caller its own action collection. Centralizing legality means a human, scripted driver, and learned driver cannot legitimately bypass different rules. We will check legality again when executing an action because a request is not permission by itself.

Type this fragment in `Core/Race.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Race.cs mode=append
    public void Message(string text)
    {
        Messages.Enqueue(text);
        while (Messages.Count > 3) Messages.Dequeue();
    }
    public List<Tactic> Legal(Kart kart)
    {
        List<Tactic> legal = new() { Tactic.Race };
        if (kart.Cooldown > 0) return legal;
        if (kart.Rockets > 0) legal.Add(Tactic.Rocket);
        if (kart.Mines > 0) legal.Add(Tactic.Mine);
        if (kart.Energy >= 35) { legal.Add(Tactic.Shield); legal.Add(Tactic.Boost); }
        return legal;
    }
```

## Project relative positions onto the kart basis

Subtract observer position from another kart's position to obtain a relative vector. Dotting it with observer Forward measures distance ahead; dotting with Right measures sideways distance. Abs ignores which side. We accept a target only within 32 units ahead and six sideways, excluding finished racers.

If the observer faces +Z, a rival offset (2,0,10) yields forward=10 and side=2, so it qualifies. Offset (2,0,-10) is behind and fails. Euclidean distance alone could not distinguish these two directions.

Observe reduces a detailed world to six bits: someone ahead, someone behind, nearby hostile hazard, rocket available, mine available, and enough energy. Any stops after finding one match. The lambda excludes the observer itself. `string.Concat` joins the selected "1"/"0" strings without separators, prefixed by the package name. This intentionally loses information such as exact threat angle and cooldown. Q-learning must live with that state aliasing; it does not see the rendered pixels.

Type this fragment in `Core/Race.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Race.cs mode=append
    public bool Ahead(Kart observer, Kart other)
    {
        Vector3 difference = other.Position - observer.Position;
        float forward = Vector3.Dot(difference, Track.Forward(observer.Yaw));
        float side = MathF.Abs(Vector3.Dot(difference, Track.Right(observer.Yaw)));
        return other.Finish == null && forward > 0 && forward < 32 && side < 6;
    }
    public string Observe(Kart kart)
    {
        bool ahead = Karts.Any(k => k.Id != kart.Id && Ahead(kart, k));
        bool behind = Karts.Any(k => k.Id != kart.Id && Ahead(k, kart));
        bool danger = Hazards.Any(h => h.Owner != kart.Id && Track.Distance(h.Position, kart.Position) < 18);
        bool[] bits = { ahead, behind, danger, kart.Rockets > 0, kart.Mines > 0, kart.Energy >= 35 };
        return kart.Package + ":" + string.Concat(bits.Select(b => b ? "1" : "0"));
    }
```

## Apply one legal action atomically

Act returns without mutation for Race or an illegal action. Otherwise it starts cooldown and records the action for feedback. Shield/boost subtract energy and set their timer, then return so they cannot accidentally also create a projectile.

For weapons, a bool chooses mine versus rocket. `--` subtracts one ammunition. The query filters eligible rivals, sorts by horizontal distance, and takes the first or null. `target?.Id` stores an optional target rather than requiring every rocket to home. Sorting costs O(n log n); a one-pass minimum would be cheaper for a large roster. With this small roster, clarity wins, but the alternative is explicit.

A Hazard object initializer assigns owner, type, position, angle, lifetime, and target. Mines start behind and live longer; rockets start ahead and may turn toward a target. Creating a hazard does not immediately register a hit. Collision processing decides that from positions later. Trace one rocket request during cooldown and one after expiry: only the latter may decrease ammunition and add an object.

Type this fragment in `Core/Race.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Race.cs mode=append
    public void Act(Kart kart, Tactic action)
    {
        if (action == Tactic.Race || !Legal(kart).Contains(action)) return;
        kart.Cooldown = 0.6f; kart.LastAction = action;
        if (action == Tactic.Shield || action == Tactic.Boost)
        {
            kart.Energy -= 35;
            if (action == Tactic.Shield) kart.Shield = 2; else kart.Boost = 1.6f;
            return;
        }
        bool mine = action == Tactic.Mine;
        if (mine) kart.Mines--; else kart.Rockets--;
        Kart? target = Karts.Where(k => k.Id != kart.Id && Ahead(kart, k))
            .OrderBy(k => Track.Distance(k.Position, kart.Position)).FirstOrDefault();
        Hazards.Add(new Hazard { Owner = kart.Id, IsMine = mine,
            Position = kart.Position + Track.Forward(kart.Yaw) * (mine ? -3 : 3) + Vector3.UnitY,
            Yaw = kart.Yaw, Life = mine ? 18 : 3, Target = target?.Id });
    }
}
```


## Build the equipment boundary {#equipment-build}

Run `dotnet build Core`. The file now closes the first part of Race, and every referenced type already exists. No driving method is called yet. A compiler failure here is local to state/equipment and its earlier dependencies; do not proceed with unresolved diagnostics.
