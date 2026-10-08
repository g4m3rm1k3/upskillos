---
title: Driving, recovery, and honest lap counting
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

You will translate input into motion, then decide what counts as race progress. A visible kart moving around the road is not enough: shortcuts, reversing, recovery, and the start seam must obey defined rules.

## Recover to a validated checkpoint

Recovery uses the previously accepted checkpoint, not whichever section of track happens to be closest. NextGate-1 gives that prior gate; Place wraps negative indices when the prior gate is the start. An offset of four samples puts the kart just beyond it.

Reset speed and progress together and charge a reward penalty. We do not increment Gates or Lap, so repeatedly requesting recovery cannot grant a finish. This matters for both fair play and learned behavior: if a shortcut generated progress reward without completing checkpoints, the learner could exploit it.

Move begins by loading upgrade specifications and decreasing active timers toward zero. Max prevents negative timers. Energy regenerates at six units per second and caps at 100. Timers advance with simulation dt, so pausing by skipping Move pauses effects too. Act occurs after timer decay, which means an action can become legal on the exact tick its cooldown reaches zero.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Core/Race.Driving.cs`. Start this new part of the Race class; append the following fragments to this same file.

```csharp edit=Core/Race.Driving.cs mode=replace
using System.Numerics;
namespace CircuitClash;
public sealed partial class Race
{
    public void Recover(Kart kart)
    {
        kart.Place((kart.NextGate - 1) * 90 + 4, 0);
        kart.Speed = 0; kart.Progress = kart.Gates * 90 + 4; kart.Reward -= 3;
        if (kart.Id == 0) Message("Recovered to the last checkpoint");
    }
    public void Move(Kart kart, Control control, float dt)
    {
        Specs specs = Specs.For(kart.Package);
        kart.Shield = Math.Max(0, kart.Shield - dt); kart.Boost = Math.Max(0, kart.Boost - dt);
        kart.Cooldown = Math.Max(0, kart.Cooldown - dt); kart.Stun = Math.Max(0, kart.Stun - dt);
        kart.Decision = Math.Max(0, kart.Decision - dt); kart.Energy = Math.Min(100, kart.Energy + 6 * dt);
        Act(kart, control.Action);
        if (control.Recover) { Recover(kart); return; }
```

## Integrate acceleration and steering with units

The speed cap is the package limit plus 14 during boost. Acceleration combines throttle thrust, optional braking, constant drag, and speed-dependent drag. Multiplying acceleration by dt changes speed; Clamp keeps it between zero and the cap. There is no reverse gear in this arcade model.

Boost adds further acceleration while respecting the cap. Stun multiplies speed down each fixed step. Steering changes yaw by requested steer times package turn rate times a low-speed factor times seconds. At rest the low-speed factor is zero, preventing rotation in place. At speed nine or higher it saturates at one.

Position advances along the new heading, using speed times seconds. Nearest updates the local track hint; Y attaches the kart to the centerline's sampled height. This is not suspension, gravity, or tire-force simulation. Lateral distance beyond HalfWidth slows the kart; beyond 18 triggers recovery. Checkpoint runs only after those motion rules. Predict the order difference if collision or checkpoint logic ran on the previous position instead.

Type this fragment in `Core/Race.Driving.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Race.Driving.cs mode=append
        float cap = specs.Speed + (kart.Boost > 0 ? 14 : 0);
        float acceleration = control.Throttle * 15 - (control.Brake ? 26 : 0) - 2 - kart.Speed * 0.12f;
        kart.Speed = Math.Clamp(kart.Speed + acceleration * dt, 0, cap);
        if (kart.Boost > 0) kart.Speed = Math.Min(cap, kart.Speed + 22 * dt);
        if (kart.Stun > 0) kart.Speed *= 1 - 1.5f * dt;
        kart.Yaw += control.Steer * specs.Turn * Math.Min(1, kart.Speed / 9) * dt;
        kart.Position += Track.Forward(kart.Yaw) * kart.Speed * dt;
        kart.Index = Track.Nearest(kart.Position, kart.Index);
        kart.Position.Y = Track.At(kart.Index).Y;
        float distance = Track.Distance(kart.Position, Track.At(kart.Index));
        if (distance > Track.HalfWidth) kart.Speed *= 1 - 2.8f * dt;
        if (distance > 18) { Recover(kart); return; }
        Checkpoint(kart);
    }
```

## Accept checkpoints in order and measure progress

Only NextGate is eligible. The distance test requires being near its center; the cosine test requires facing roughly along the track rather than backward. This is an arcade proximity-and-heading rule, not an exact swept crossing-plane detector. A fast object or a different track scale would warrant that stronger geometry.

After acceptance, Gates increments. Crossing gate zero completes a lap; the second lap records the current Time and adds a terminal reward. NextGate advances modulo four. Repeatedly touching the start line cannot satisfy gate one, which is why ordered state matters.

For ranking unfinished racers, we compute progress relative to the previous gate. Wrapping and subtracting 180 creates a signed local offset across the seam. Clamp limits it to a small backward allowance and one segment forward. Reward uses bounded progress change plus a small per-tick time penalty. Progress is measured in track samples, not exact metres, so this shaping is heuristic. We will evaluate outcomes rather than equating a higher training reward with a universally better driver.

Type this fragment in `Core/Race.Driving.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Race.Driving.cs mode=append
    public void Checkpoint(Kart kart)
    {
        int gate = kart.NextGate * 90;
        if (Track.Distance(kart.Position, Track.At(gate)) < 9 &&
            MathF.Cos(Track.Turn(kart.Yaw, Track.Yaw(gate))) > 0)
        {
            kart.Gates++;
            if (kart.NextGate == 0)
            {
                kart.Lap++;
                if (kart.Lap == 2) { kart.Finish = Time; kart.Reward += 10; Message(kart.Name + " finished"); }
            }
            kart.NextGate = (kart.NextGate + 1) % 4;
        }
        int origin = Track.Wrap((kart.NextGate - 1) * 90);
        int segment = Math.Clamp(Track.Wrap(kart.Index - origin + 180) - 180, -12, 90);
        float progress = kart.Gates * 90 + segment;
        kart.Reward += Math.Clamp(progress - kart.Progress, -1, 2) * 0.04f - Step * 0.02f;
        kart.Progress = progress;
    }
}
```

## Challenge — return to this later

This is optional. You can continue without completing it; no later guided step depends on your solution. Keep your attempt and revisit it.

Design a swept crossing test for a checkpoint plane. Explain which failure in the current proximity rule it would prevent. You can defer the implementation; the guided game uses the documented arcade rule.


## Build this completed feature {#feature-build}

Run `dotnet build Core`. This part of Race is now closed and can compile with the previously completed parts. Keep the file in Core so the SDK includes it automatically. Do not copy these methods back into Race.cs as well; duplicate member declarations are a compiler error. Inspect the diff and preserve a working checkpoint before continuing.
