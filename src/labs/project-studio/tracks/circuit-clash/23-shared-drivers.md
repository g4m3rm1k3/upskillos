---
title: Program steering and compare tactical strategies
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

Every driver returns Control. The same race then decides whether those requests are legal. We will reuse steering across scripted and learned tactics so the comparison concerns equipment choices.

## Steer toward a point ahead of the kart

WaypointDriver stores its policy and whether to use scripted tactics. The constructor's `this.policy` selects the field while `policy` alone refers to the parameter. Readonly prevents changing that reference after construction, not mutation inside the referenced Policy.

Lookahead advances ten samples plus a speed-dependent amount. Faster motion looks farther ahead to avoid reacting too late. The target also includes the kart's lane offset so every rival does not aim for exactly the same centerline.

Atan2 gets the direction to that target, Turn computes the shortest angular error, and Clamp converts proportional error into a steering request from -1 to +1. Large errors reduce throttle and eventually request braking. This is a proportional controller with hand-chosen gains and thresholds, not learned steering. Increasing gain may turn more aggressively but can cause oscillation. Test it on curves rather than assuming a higher gain is better.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Core/Drivers.cs`. Start or replace this file.

```csharp edit=Core/Drivers.cs mode=replace
namespace CircuitClash;

public sealed class WaypointDriver : IDriver
{
    private readonly Policy policy;
    private readonly bool scripted;
    public WaypointDriver(Policy policy, bool scripted = false)
    { this.policy = policy; this.scripted = scripted; }
    public static Control Steer(Kart kart, Tactic action)
    {
        int index = Track.Wrap(kart.Index + 10 + (int)(kart.Speed / 5));
        var point = Track.At(index) + Track.Right(Track.Yaw(index)) * kart.Lane;
        float yaw = MathF.Atan2(point.X - kart.Position.X, point.Z - kart.Position.Z);
        float error = Track.Turn(yaw, kart.Yaw);
        return new Control(MathF.Abs(error) < 0.8f ? 1 : 0.3f,
            Math.Clamp(error * 2.2f, -1, 1), MathF.Abs(error) > 1.1f, action);
    }
```

## Give tactics a slower decision interval

Steering is recalculated each tick, but equipment decisions happen only when Decision reaches zero. The race decrements that timer; the driver resets it to half a second. A tactic is a discrete request on that decision tick, not a request repeated throughout the interval.

Scripted logic reads the observation bits: danger prefers shield, a rival ahead prefers rocket, a rival behind prefers mine, otherwise boost. Nested conditional expressions select one preference in that priority order. If the preference is illegal, the action stays Race; this script does not search a second-best fallback.

The learned branch asks Policy.Choose with the same legal list. Both branches then use Steer and the same Race.Act path. That controls a confounding factor: if the learned driver also had a better steering algorithm, improved results could not be attributed specifically to tactical learning.

Type this fragment in `Core/Drivers.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Drivers.cs mode=append
    public Control Decide(Race race, Kart kart)
    {
        Tactic action = Tactic.Race;
        if (kart.Decision <= 0)
        {
            string state = race.Observe(kart);
            List<Tactic> legal = race.Legal(kart);
            if (scripted)
            {
                string bits = state.Split(':')[1];
                Tactic desired = bits[2] == '1' ? Tactic.Shield : bits[0] == '1'
                    ? Tactic.Rocket : bits[1] == '1' ? Tactic.Mine : Tactic.Boost;
                if (legal.Contains(desired)) action = desired;
            }
            else action = policy.Choose(state, legal, race.Random);
            kart.Decision = 0.5f;
        }
        return Steer(kart, action);
    }
}
```

## Verify and explain the boundary

Build Game and run the existing Checks. Trace a decision timer of .1 across several fixed ticks and show exactly when another tactical action is requested. Explain the difference between a scripted controller and a learned table without attributing steering intelligence to the Q-table.

