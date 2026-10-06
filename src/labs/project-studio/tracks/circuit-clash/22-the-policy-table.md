---
title: A policy table, exploration, and independent snapshots
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: csharp
pedagogy: typed
console: true
---

We now apply the tested equation to named observations and legal equipment actions. The table remains small enough to inspect.

## Allocate rows only when a state is encountered

Values maps a state key to one float per Tactic. TryGetValue returns whether a key exists and supplies its row through an out parameter. If missing, Row creates five zero estimates and stores that array. This sparse representation allocates only visited states rather than a full Cartesian product up front.

A row is an array reference. Returning it lets Update modify the table in place. It also means callers could corrupt it; this small internal model relies on ownership discipline and validates imported files. A public library API should expose narrower access if arbitrary callers must be prevented from mutating estimates.

Zero is an initial estimate, not evidence that every action is equally good. Unvisited states therefore need a tie-breaking policy. Learning and evaluation both use a seeded Random instance supplied by the race, making that choice reproducible within the same execution path.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Core/Policy.cs`. Start or replace this file.

```csharp edit=Core/Policy.cs mode=replace
namespace CircuitClash;

public sealed class Policy
{
    public Dictionary<string, float[]> Values { get; set; } = new();
    public float[] Row(string state)
    {
        if (!Values.TryGetValue(state, out float[]? row))
        {
            row = new float[5]; Values.Add(state, row);
        }
        return row;
    }
```

## Explore only among actions the rules allow

With probability epsilon, choose a uniformly random legal action. NextDouble is compared with epsilon; epsilon zero disables this exploration branch. Otherwise find the largest estimate among legal actions, collect all actions tied at that value, and select uniformly among the ties.

The cast from Tactic to int chooses its array slot. Max must operate on a nonempty list; Race.Legal guarantees Race is always present. Maximizing across all five slots would permit an unavailable rocket to influence a decision, so legality is part of both action selection and the future-value calculation.

At epsilon one, behavior is fully exploratory. At zero, selection is greedy but can still vary among exact ties. Frozen evaluation means estimates are not updated; it does not necessarily mean all tie choices are deterministic without a fixed seed.

Type this fragment in `Core/Policy.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Policy.cs mode=append
    public Tactic Choose(string state, List<Tactic> legal, Random random, float epsilon = 0)
    {
        if (random.NextDouble() < epsilon) return legal[random.Next(legal.Count)];
        float[] row = Row(state);
        float best = legal.Max(action => row[(int)action]);
        List<Tactic> ties = legal.Where(action => row[(int)action] == best).ToList();
        return ties[random.Next(ties.Count)];
    }
```

## Update one state-action estimate

The method accepts state, selected action, accumulated reward, next state, next legal choices, and whether the transition truly ended the race. Default alpha and gamma are the course experiment's chosen values. The terminal conditional avoids even querying a future row when no future exists.

Row(state) obtains the mutable array, and `+=` moves the selected slot toward the target. Other action estimates in that row stay unchanged. This is an off-policy update because the target uses the maximum legal next estimate, not necessarily the action that the exploratory behavior will actually take.

Use the hand-worked example from the previous lesson to inspect this implementation: set old=2, next max=4, reward=3, alpha=.5, gamma=.9 and expect 4.3. The final check suite will assert that value against this real class, not only the earlier scratch function.

Type this fragment in `Core/Policy.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Policy.cs mode=append
    public void Update(string state, Tactic action, float reward, string next,
        List<Tactic> legal, bool terminal, float alpha = 0.18f, float gamma = 0.93f)
    {
        float future = terminal ? 0 : legal.Max(a => Row(next)[(int)a]);
        float[] row = Row(state);
        row[(int)action] += alpha * (reward + gamma * future - row[(int)action]);
    }
```

## Freeze values rather than sharing arrays

A new dictionary alone would not make independent rows: copying array references would still share estimates. Copy constructs a new Policy, then Clone creates a new array for each entry. Clone returns object, so the cast restores the known float-array type.

This is a deep-enough copy for a dictionary of arrays of numbers. If rows contained mutable objects, cloning only the outer array would still share those objects and require another ownership decision. “Deep copy” always depends on the graph being copied.

Frozen opponents receive this snapshot and never call Update. Their Row method may allocate an unseen zero row, but existing estimates remain unchanged. This stabilizes opponents during a training interval without pretending the entire training process is stationary.

Type this fragment in `Core/Policy.cs`. Append it after the previous fragment in this file.

```csharp edit=Core/Policy.cs mode=append
    public Policy Copy()
    {
        Policy copy = new();
        foreach (var entry in Values) copy.Values.Add(entry.Key, (float[])entry.Value.Clone());
        return copy;
    }
}
```

## Verify and explain the boundary

Run `dotnet build Core` and `dotnet run --project Checks`. Policy now satisfies the persistence reference. Explain why a row copy is necessary, why legal actions must be nonempty, and why terminal and truncated episodes use different targets. Commit the completed policy and garage boundary together after reviewing the diff.

