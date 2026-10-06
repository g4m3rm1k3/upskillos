---
title: Model a race without drawing it
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: csharp
pedagogy: typed
console: true
---

A kart is not its rendered mesh. We first define the state that rules can inspect and change. A renderer will read that state later.

## Name the finite choices and immutable inputs

An enum names a finite set of choices. Package has Handling, Engine, and Armor; Tactic lists equipment actions; Phase lists race states. Their underlying integer values start at zero in declaration order. The Q-table will depend on Tactic's order, so changing that order later requires migrating saved data.

Specs is a readonly record struct: Speed, Turn, and DamageScale become named values with value equality. A switch expression chooses one result for a package. `_` is the fallback pattern. Engine gets more speed and less turn rate; Armor halves impact penalties but lowers maximum speed. These are tradeoffs, not a strictly superior upgrade.

Control records an input for one simulation step. Its first two values are throttle and steer; optional parameters have defaults when omitted. `new Control(1,0)` accelerates straight without braking, equipment, or recovery. Immutable inputs make it possible to inspect what a driver requested separately from whether the race allowed it.

Type this fragment in `Core/Models.cs`. Start or replace this file.

```csharp edit=Core/Models.cs mode=replace
using System.Numerics;
namespace CircuitClash;

public enum Package { Handling, Engine, Armor }
public enum Tactic { Race, Rocket, Mine, Shield, Boost }
public enum Phase { Countdown, Racing, Paused, Finished }
public readonly record struct Specs(float Speed, float Turn, float DamageScale)
{
    public static Specs For(Package package) => package switch
    {
        Package.Engine => new(31, 1.7f, 1),
        Package.Armor => new(26, 2, 0.5f),
        _ => new(28, 2.4f, 1)
    };
}
public readonly record struct Control(float Throttle, float Steer,
    bool Brake = false, Tactic Action = Tactic.Race, bool Recover = false);
```

## Give each racer an identity and lifecycle

Kart is a class because racers have identity over time. Two racers with equal positions remain distinct objects. Id indexes the fixed roster; Name is display text. Position and Yaw describe placement, while Speed is metres per second. Index is a nearby track sample; NextGate is the next required checkpoint. Gates counts accepted crossings across laps. These values answer different questions and must not be conflated.

Timers are seconds remaining: a value above zero means active. Energy starts at 100, ammunition at two of each kind. Finish is nullable: null means unfinished, while zero would be a real time. Public fields keep this small simulation explicit. That exposes mutation; it is not enforced encapsulation. We centralize rule changes in Race and treat external writes as test setup only. A larger shared API should restrict setters or use commands to protect invariants.

The constructor has the class name and no return type. It stores its arguments, alternates starting lanes using remainder, offsets the starting grid by racer Id, and calls Place. At construction time only this new kart's fields are changed.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Core/Models.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Models.cs mode=append
public sealed class Kart
{
    public int Id;
    public string Name;
    public Package Package;
    public Vector3 Position;
    public float Yaw, Speed, Lane;
    public int Index, NextGate = 1, Gates, Lap;
    public float Progress, Energy = 100, Shield, Boost, Cooldown, Stun;
    public float Decision, Reward;
    public int Rockets = 2, Mines = 2, Hits, Suffered;
    public float? Finish;
    public Tactic LastAction;
    public Kart(int id, string name, Package package)
    {
        Id = id; Name = name; Package = package;
        Lane = id % 2 == 0 ? 2 : -2;
        Progress = -id * 3;
        Place(-id * 3, Lane);
    }
```

## Reset all representations of a position together

Place updates Index, Yaw, and Position as one operation. Wrapping handles negative starting-grid indices. The local right direction multiplied by lane shifts the centerline sideways: positive lane goes right, negative left. Setting only Position would leave a stale search hint and heading.

Hazard groups state shared by rockets and mines: owner, position, lifetime, optional target, and the IsMine discriminator. We choose one simple data type rather than an inheritance hierarchy because both are processed together and differ in a short update branch. If their behavior grows independently, that decision can be revisited.

Pickup stores a track location and a respawn timer. Its constructor requires a location. The default Wait of zero means it is available initially. Neither Hazard nor Pickup draws itself or reads input; that separation lets training reuse them without a window.

Type this fragment in `Core/Models.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Models.cs mode=append
    public void Place(int index, float lane)
    {
        Index = Track.Wrap(index); Yaw = Track.Yaw(Index);
        Position = Track.At(Index) + Track.Right(Yaw) * lane;
    }
}
public sealed class Hazard
{
    public Vector3 Position;
    public float Yaw, Life;
    public int Owner;
    public int? Target;
    public bool IsMine;
}
public sealed class Pickup
{
    public int Index;
    public float Wait;
    public Pickup(int index) { Index = index; }
}
```

## Verify and explain the boundary

Build Core again. Check the constructor trace for Id 1: Lane=-2, Progress=-3, wrapped Index=357, and a heading from that track sample. Explain why copying `Kart a = race.Karts[0]` later will not create a new racer. A Control copy, in contrast, copies its values.

