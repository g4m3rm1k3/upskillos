---
title: Translate devices into simulation inputs
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

A display may update at a different rate from the simulation. We must not lose a press on a frame with no simulation tick or replay it on every catch-up tick.

## Introduce a contract because callers need substitution

The game needs to request input from either a person or a computer without rewriting its simulation loop. An interface declares that shared capability. IDriver promises a Decide method that accepts the current Race and one Kart and returns a Control. It does not prescribe fields or implementation.

A class implements this contract with `: IDriver` and a public method matching the signature. The caller can hold an IDriver reference and invoke Decide without knowing the concrete class. This is polymorphism through a contract. We choose composition: the game owns a driver and asks it for input, rather than making a human kart and computer kart subclasses with duplicated rules.

This is the Strategy pattern in a concrete setting: replace the input-decision algorithm while retaining the same simulation. Naming it is useful only after understanding the problem it solves. The interface belongs in Core because it speaks only Core types and must also be available to headless training.

Type this fragment in `Core/IDriver.cs`. Start or replace this file.

```csharp edit=Core/IDriver.cs mode=replace
namespace CircuitClash;

public interface IDriver
{
    Control Decide(Race race, Kart kart);
}
```

## Capture held state and queue discrete actions

This file implements the IDriver contract declared in the first step of this lesson. A private field is accessible only within this class. The pending queue belongs to this keyboard adapter, not the race.

IsKeyDown reports held state, suitable for throttle, steering, and brake. IsKeyPressed reports a transition, suitable for selecting or firing equipment. Down is a local helper accepting two equivalent keys. Steering subtracts left from right: right alone gives +1, left alone -1, both give zero. We do not infer steering from text characters typed into a console.

Discrete equipment presses enter a FIFO queue. If the display frame has no physics tick, the event stays queued. If it has several, each event is consumed only once. The race still rejects requests that violate cooldown or inventory. `recover |= ...` retains an observed recovery press until consumed; bool OR assignment cannot erase a true value merely because the following frame has no new press.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Game/KeyboardDriver.cs`. Start or replace this file.

```csharp edit=Game/KeyboardDriver.cs mode=replace
using Raylib_cs;
using CircuitClash;

public sealed class KeyboardDriver : IDriver
{
    private readonly Queue<Tactic> pending = new();
    private float throttle, steer;
    private bool brake, recover;
    public Tactic Weapon = Tactic.Rocket;
    public void Capture()
    {
        bool Down(KeyboardKey a, KeyboardKey b) => Raylib.IsKeyDown(a) || Raylib.IsKeyDown(b);
        throttle = Down(KeyboardKey.W,KeyboardKey.Up) ? 1 : 0;
        steer = (Down(KeyboardKey.D,KeyboardKey.Right) ? 1 : 0) - (Down(KeyboardKey.A,KeyboardKey.Left) ? 1 : 0);
        brake = Down(KeyboardKey.S,KeyboardKey.Down);
        if (Raylib.IsKeyPressed(KeyboardKey.One)) Weapon = Tactic.Rocket;
        if (Raylib.IsKeyPressed(KeyboardKey.Two)) Weapon = Tactic.Mine;
        if (Raylib.IsKeyPressed(KeyboardKey.Space)) pending.Enqueue(Weapon);
        if (Raylib.IsKeyPressed(KeyboardKey.E)) pending.Enqueue(Tactic.Shield);
        if (Raylib.IsKeyPressed(KeyboardKey.LeftShift)) pending.Enqueue(Tactic.Boost);
        recover |= Raylib.IsKeyPressed(KeyboardKey.R);
    }
```

## Consume once and clear stale input at transitions

Decide removes one pending action if available, otherwise supplies Race. It copies held values into an immutable Control, then clears the one-shot recovery flag. Clearing before constructing the Control would lose that input.

Clear empties queued events and resets held state. We call it when starting, pausing, and resuming so a key pressed for a menu cannot fire equipment unexpectedly in the next race. This is a lifecycle requirement, not just a convenience for testing.

The adapter accepts Race and Kart because it fulfills the same driver contract as computer controls, though this implementation does not need those arguments. Both kinds of driver return requests; neither directly changes ammunition or awards hits. That keeps one authoritative set of rules.

Type this fragment in `Game/KeyboardDriver.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/KeyboardDriver.cs mode=append
    public Control Decide(Race race, Kart kart)
    {
        Tactic action = pending.Count > 0 ? pending.Dequeue() : Tactic.Race;
        Control input = new(throttle,steer,brake,action,recover);
        recover = false; return input;
    }
    public void Clear() { pending.Clear(); throttle = steer = 0; brake = recover = false; }
}
```

## Verify and explain the boundary

Run `dotnet build Game` after completing the interface and keyboard adapter. Trace one Space press over a display frame with zero ticks followed by a frame with two ticks. The first tick consumes one request; the second gets Race. Explain why calling IsKeyPressed separately inside each physics tick would be incorrect.

