---
title: Train against snapshots and evaluate on held-out seeds
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: csharp
pedagogy: typed
console: true
---

Training runs the real race rules without rendering. We will rotate starting position, vary upgrades, and keep evaluation seeds separate from training.

## Create an episode with controlled variation

Train constructs a learner and a frozen snapshot. Every twelfth episode refreshes that snapshot with independent rows. Training seeds start at 100; the package cycles through the three choices. Countdown is skipped because waiting before every race would add computation without teaching equipment decisions.

The learner remains kart Id zero but swaps starting placement and lane with another grid slot. Progress must move with that placement too; otherwise reward shaping would interpret the swap as unexplained progress. Slot rotation reduces the chance that the learner only succeeds from the front. It does not prove robustness to every starting condition.

Rivals alternate scripted tactics and the frozen table. Epsilon starts near .8 and decreases toward a floor of .08, retaining some exploration. The cast in episode/(float)episodes prevents integer division from holding the schedule flat for almost the whole run. The optional Action<int> callback is a function receiving completion count; Core can report progress without knowing any UI type.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Core/Training.cs`. Start or replace this file.

```csharp edit=Core/Training.cs mode=replace
namespace CircuitClash;

public static class Training
{
    public static Policy Train(int episodes, Action<int>? progress = null)
    {
        Policy learner = new(), snapshot = new();
        for (int episode = 0; episode < episodes; episode++)
        {
            if (episode % 12 == 0) snapshot = learner.Copy();
            Race race = new(100 + episode, (Package)(episode % 3));
            race.Countdown = 0; race.Phase = Phase.Racing;
            Kart player = race.Karts[0], other = race.Karts[episode % 4];
            int index = other.Index; float lane = other.Lane;
            other.Place(player.Index, player.Lane); other.Lane = player.Lane;
            player.Place(index, lane); player.Lane = lane;
            other.Progress = 0; player.Progress = -(episode % 4) * 3;
            WaypointDriver rivals = new(snapshot, episode % 2 == 0);
            float epsilon = Math.Max(0.08f, 0.8f * (1 - episode / (float)episodes));
```

## Measure a transition over a tactical interval

At the decision boundary, record the current observation, choose an exploratory legal action, and remember cumulative reward. Then run up to thirty fixed ticks. The chosen action is supplied only on the first tick; steering continues on every tick. Other drivers decide from the same pre-tick world before ToArray materializes all inputs.

After the interval, subtract the old cumulative reward to obtain this transition's reward. Observe the resulting state and legal choices, then update the table. If the player finished, future value is zero. If the artificial time limit ended the episode without a finish, the update bootstraps. Those are deliberately different semantics.

The callback is invoked after the episode, using null-conditional invocation when no callback exists. Nothing in this loop draws or waits for display refresh. Simulation time advances only through Tick, so headless training can run faster than real time without changing movement per simulated second.

Type this fragment in `Core/Training.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Training.cs mode=append
            while (race.Phase != Phase.Finished)
            {
                string state = race.Observe(player);
                Tactic action = learner.Choose(state, race.Legal(player), race.Random, epsilon);
                float before = player.Reward;
                for (int tick = 0; tick < 30 && race.Phase != Phase.Finished; tick++)
                {
                    Control[] inputs = race.Karts.Select(k => k.Id == 0
                        ? WaypointDriver.Steer(k, tick == 0 ? action : Tactic.Race)
                        : rivals.Decide(race, k)).ToArray();
                    race.Tick(inputs);
                }
                learner.Update(state, action, player.Reward - before, race.Observe(player),
                    race.Legal(player), player.Finish != null);
            }
            progress?.Invoke(episode + 1);
        }
        return learner;
    }
```

## Compare strategies using the same held-out protocol

Result records seed, completion time, final place, hits, and suffered hits. A record struct supplies value equality, useful for reproducibility checks. Evaluate creates a fresh race and uses the same Handling package for the compared player. Rivals are scripted in both conditions.

Only the player's tactical choice switches between scripted and learned. Both use the same waypoint steering and race rules. The loop constructs all controls before Tick, and terminates under the race's finish/time-limit rule. Unfinished players report 180 seconds and a progress-based rank; inspect completion separately before interpreting averages.

The same seed pairs starting random conditions, but strategies consume random numbers differently as actions diverge. This is controlled reproducibility, not identical trajectories. The final command-line entry point will run seeds 9100 through 9111, outside training's seed range. Do not repeatedly tune against those seeds and still call them untouched final evaluation; reserve a new set if they become development feedback.

Type this fragment in `Core/Training.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Training.cs mode=append
    public readonly record struct Result(int Seed, float Seconds, int Place, int Hits, int Suffered);
    public static Result Evaluate(Policy policy, int seed, bool scripted)
    {
        Race race = new(seed, Package.Handling);
        race.Countdown = 0; race.Phase = Phase.Racing;
        IDriver player = new WaypointDriver(policy, scripted);
        IDriver rivals = new WaypointDriver(new Policy(), true);
        while (race.Phase != Phase.Finished)
        {
            Control[] inputs = race.Karts.Select(k => (k.Id == 0 ? player : rivals).Decide(race, k)).ToArray();
            race.Tick(inputs);
        }
        Kart human = race.Karts[0];
        return new Result(seed, human.Finish ?? 180, Array.IndexOf(race.Ranking(), human) + 1, human.Hits, human.Suffered);
    }
}
```

## Verify and explain the boundary

Build Core and Game. Explain why training reward, finish time, and place can disagree. Before seeing results, write what evidence would support a useful tactical improvement and what would refute it. Later we will run the complete command-line experiment and compare all metrics, without promising that learned play must outperform the script.

