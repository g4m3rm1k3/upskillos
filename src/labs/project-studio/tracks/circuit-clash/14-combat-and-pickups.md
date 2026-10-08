---
title: Combat, collision, and shared resources
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

Before typing, predict these outcomes: a shielded target keeps its speed; one projectile cannot hit two racers after expiry; exactly coincident karts separate without NaN values; one pickup has one winner. Use those requirements to review every mutation below.

## Resolve defense before damage

A positive shield timer blocks the hit and returns before speed or hit counters change. Otherwise DamageScale controls both the slowdown and stun. A handling kart at speed 20 loses 65 percent and falls to seven; Armor loses half that percentage and falls to 13.5.

The target's suffered count and penalty update separately from the owner's hit count and reward. Owner is a roster index established when the hazard is created, not an arbitrary external identifier. If hazards came from a network or save file, this boundary would need validation.

Notice the reward incentive: hitting an opponent earns eight while progress earns smaller increments. That may produce an aggressive policy that wins positions but takes longer. This is a design choice to investigate, not a claim that the reward precisely represents fun or fair competition.

Type this fragment in `Core/Race.Combat.cs`. Start this new part of the Race class; append the following fragments to this same file.

```csharp edit=Core/Race.Combat.cs mode=replace
using System.Numerics;
namespace CircuitClash;
public sealed partial class Race
{
    public void Hit(Kart target, int owner)
    {
        if (target.Shield > 0) { target.Reward += 2; Message(target.Name + " blocked a hit"); return; }
        float damage = Specs.For(target.Package).DamageScale;
        target.Speed *= 1 - 0.65f * damage; target.Stun = 1.1f * damage;
        target.Suffered++; target.Reward -= 4 * damage;
        Karts[owner].Hits++; Karts[owner].Reward += 8;
        Message(Karts[owner].Name + " hit " + target.Name);
    }
```

## Advance projectiles and remove them safely

Every hazard loses lifetime first. A mine stays in place. A rocket with an unfinished target computes the desired horizontal angle and limits its turn to two radians per second. Clamping the angular change prevents instant snapping. It advances at 48 units per second and follows approximate track height.

`hazard.Target is int id` is a pattern that succeeds only when the nullable target contains an integer, then exposes that integer as id. The target may finish before the rocket arrives; the additional condition prevents following a finished racer.

The nested kart loop excludes owner and finished racers, checks remaining life, and compares horizontal distance with 2.5. A hit sets Life to zero, so subsequent candidates cannot also be hit by that same hazard. RemoveAll runs after enumeration, preventing structural mutation during foreach. This is discrete collision detection: our fixed step and speeds bound movement enough for the chosen radii, but high-speed thin objects would need swept tests.

Type this fragment in `Core/Race.Combat.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Race.Combat.cs mode=append
    public void Combat(float dt)
    {
        foreach (Hazard hazard in Hazards)
        {
            hazard.Life -= dt;
            if (!hazard.IsMine)
            {
                if (hazard.Target is int id && Karts[id].Finish == null)
                {
                    Vector3 delta = Karts[id].Position - hazard.Position;
                    float target = MathF.Atan2(delta.X, delta.Z);
                    hazard.Yaw += Math.Clamp(Track.Turn(target, hazard.Yaw), -2 * dt, 2 * dt);
                }
                hazard.Position += Track.Forward(hazard.Yaw) * 48 * dt;
                int near = Track.Nearest(hazard.Position, Karts[hazard.Owner].Index);
                hazard.Position.Y = Track.At(near).Y + 0.8f;
            }
            foreach (Kart kart in Karts)
                if (hazard.Life > 0 && kart.Id != hazard.Owner && kart.Finish == null &&
                    Track.Distance(kart.Position, hazard.Position) < 2.5f)
                { Hit(kart, hazard.Owner); hazard.Life = 0; }
        }
        Hazards.RemoveAll(h => h.Life <= 0);
    }
```

## Separate overlapping karts once per pair

The outer index selects one kart; the inner starts at i+1. This examines every unordered pair once, avoiding self-collision and duplicate processing. The number of pairs grows quadratically with roster size, which is fine here but motivates spatial partitioning in a crowded simulation.

Flatten delta.Y to zero because contact is horizontal. If centers differ, dividing delta by distance gives a unit separation direction. If centers coincide, that division is undefined, so choose UnitX deterministically. Half the overlap is applied to each kart, preserving their midpoint.

This is a positional correction with a small speed penalty, not a physically accurate impulse solver. It intentionally avoids mass, friction, and restitution. A rendering mesh may have square corners while the contact footprint is circular; explain that approximation rather than assuming visual geometry defines collision automatically.

Type this fragment in `Core/Race.Combat.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Race.Combat.cs mode=append
    public void Contacts()
    {
        for (int i = 0; i < Karts.Length; i++)
            for (int j = i + 1; j < Karts.Length; j++)
            {
                Kart a = Karts[i], b = Karts[j];
                Vector3 delta = b.Position - a.Position; delta.Y = 0;
                float distance = delta.Length();
                if (a.Finish != null || b.Finish != null || distance >= 2.3f) continue;
                Vector3 direction = distance > 0.001f ? delta / distance : Vector3.UnitX;
                Vector3 push = direction * (2.3f - distance) / 2;
                a.Position -= push; b.Position += push; a.Speed *= 0.99f; b.Speed *= 0.99f;
            }
    }
```

## Arbitrate one shared pickup

Each pickup timer counts down to zero. Available pickups examine karts beginning at a rotating roster index derived from tick time. This avoids always giving kart zero first consideration when two are within range. It is deterministic tie arbitration, not a guarantee of statistical fairness in every race.

The inner loop wraps through the whole roster. Finished or distant karts are skipped. The first eligible kart gains capped ammunition and energy; Wait becomes seven seconds and break ends the search. Without break, one pickup could replenish every overlapping kart on the same tick.

Distinguish three boundaries: an unavailable pickup does nothing; a kart exactly five units away is excluded by `>= 5`; resource caps prevent unlimited stockpiling. Those are useful test cases because an apparently correct animation could hide each corresponding logic bug.

Type this fragment in `Core/Race.Combat.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Race.Combat.cs mode=append
    public void Collect(float dt)
    {
        foreach (Pickup pickup in Pickups)
        {
            pickup.Wait = Math.Max(0, pickup.Wait - dt);
            if (pickup.Wait > 0) continue;
            int start = (int)(Time / Step) % Karts.Length;
            for (int n = 0; n < Karts.Length; n++)
            {
                Kart kart = Karts[(start + n) % Karts.Length];
                if (kart.Finish != null || Track.Distance(kart.Position, Track.At(pickup.Index)) >= 5) continue;
                kart.Rockets = Math.Min(4, kart.Rockets + 1); kart.Mines = Math.Min(4, kart.Mines + 1);
                kart.Energy = Math.Min(100, kart.Energy + 25); pickup.Wait = 7; break;
            }
        }
    }
}
```


## Build this completed feature {#feature-build}

Run `dotnet build Core`. This part of Race is now closed and can compile with the previously completed parts. Keep the file in Core so the SDK includes it automatically. Do not copy these methods back into Race.cs as well; duplicate member declarations are a compiler error. Inspect the diff and preserve a working checkpoint before continuing.
