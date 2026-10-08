---
title: Regression checks for saves, learning, and complete races
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

The original runner still covers geometry, checkpoints, equipment, and pause. Append these independent observations to exercise the completed systems. A failure anywhere must still fail the process.

## Test purchasing through its public operation

These assertions call Select, not a copy of its code. The first checks both success and payment. The second equips already-owned packages and requires no new charge. The third checks failure and unchanged selection. If you remove the affordability guard, the third assertion should fail.

Use a fresh Garage so earlier play or disk state cannot affect the test. This is test isolation: each scenario controls what it depends on. We intentionally test the model before file I/O, so a failed purchase assertion cannot be confused with a disk permission issue.

Type this fragment in `Checks/Program.cs`. Append it after the previous fragment in this file.

```csharp edit=Checks/Program.cs mode=append
Garage garage = new();
Require(garage.Select(Package.Engine) && garage.Credits == 0, "buy charges once");
Require(garage.Select(Package.Handling) && garage.Select(Package.Engine) && garage.Credits == 0, "owned equip is free");
Require(!garage.Select(Package.Armor) && garage.Selected == Package.Engine, "unaffordable purchase is unchanged");
```

## Use a disposable directory for real persistence

Path.GetTempPath chooses the operating system's temporary directory. Guid.NewGuid supplies a unique suffix so concurrent runs do not overwrite each other's files. We create the directory, save, load, and assert both selected package and credits. This is an integration test of real JSON and file operations, not a mocked save call.

Next we overwrite only the test file with malformed text and call Load. A warning must appear and the original text must remain unchanged. That checks data preservation, which a test of default returned values alone would miss.

Finally deletes this unique test directory even if an assertion throws. Passing true includes its contents. Never substitute your real save directory into this cleanup block. Resource cleanup is safe because the test created and owns this exact disposable path.

Type this fragment in `Checks/Program.cs`. Append it after the previous fragment in this file.

```csharp edit=Checks/Program.cs mode=append
string folder = Path.Combine(Path.GetTempPath(), "circuit-check-" + Guid.NewGuid());
Directory.CreateDirectory(folder);
try
{
    string path = Path.Combine(folder,"garage.json"); garage.Save(path);
    Garage loaded = Garage.Load(path,out string warning);
    Require(warning == "" && loaded.Selected == Package.Engine && loaded.Credits == 0, "garage round trip");
    File.WriteAllText(path,"{broken"); Garage.Load(path,out warning);
    Require(warning.Length > 0 && File.ReadAllText(path) == "{broken", "invalid save is preserved");
}
finally { Directory.Delete(folder,true); }
```

## Test the actual Q-table and ownership boundary

Set the real Policy's row values to the hand-calculated example. Supplying alpha and gamma overrides their training defaults so the expected 4.3 is easy to verify independently. The terminal update uses alpha one, so the estimate becomes exactly the immediate reward regardless of next-state value.

Copy the policy, mutate the original row, and assert the snapshot stayed at three. A dictionary-only copy would fail this test because the row arrays would still be shared. This establishes independent estimates, not merely different Policy object identities.

To investigate sensitivity, temporarily change Copy to store entry.Value directly and run the suite. Observe the snapshot assertion fail, then restore Clone. Restore every deliberate mutation before committing or training a new artifact.

Type this fragment in `Checks/Program.cs`. Append it after the previous fragment in this file.

```csharp edit=Checks/Program.cs mode=append
Policy policy = new();
policy.Row("s")[0] = 2; policy.Row("next")[0] = 4;
policy.Update("s",Tactic.Race,3,"next",new() {Tactic.Race},false,0.5f,0.9f);
Require(Near(policy.Row("s")[0],4.3f), "Q update uses legal future reward");
policy.Update("s",Tactic.Race,3,"next",new() {Tactic.Race},true,1,0.9f);
Require(Near(policy.Row("s")[0],3), "terminal update has no future");
Policy frozen = policy.Copy(); policy.Row("s")[0] = 99;
Require(frozen.Row("s")[0] == 3, "snapshot owns independent rows");
```

## Exercise collision and resource boundaries

For impact, arrange an unshielded handling kart at speed twenty and require speed seven plus one suffered hit. Then activate a fresh race for independent contact setup. Place two karts at the same coordinate and require finite separation afterward. That catches the divide-by-zero branch that ordinary noncoincident positions would miss.

For pickup arbitration, move every racer far away and place only the player at the pickup with empty resources. Collection must award one unit of each ammunition and set the respawn timer. A second immediate collection must do nothing. This scenario establishes that an unavailable pickup cannot be harvested repeatedly.

Direct field assignments here arrange the isolated state. The gameplay path still uses drivers and Tick. If the final race integration test fails while these pass, investigate sequencing and interactions rather than weakening these expectations.

Type this fragment in `Checks/Program.cs`. Append it after the previous fragment in this file.

```csharp edit=Checks/Program.cs mode=append
race = new(42,Package.Handling); player = race.Karts[0]; player.Speed = 20;
race.Hit(player,1);
Require(player.Suffered == 1 && Near(player.Speed,7), "unshielded impact slows kart");
race.Karts[1].Position = player.Position;
race.Contacts();
Require(float.IsFinite(player.Position.X) && Track.Distance(player.Position,race.Karts[1].Position) > 2, "coincident karts separate");
foreach (Kart kart in race.Karts) kart.Position = new Vector3(1000,0,1000);
player.Place(35,0); player.Rockets = 0; player.Mines = 0; player.Energy = 0;
race.Collect(Race.Step);
Require(player.Rockets == 1 && player.Mines == 1 && race.Pickups[0].Wait == 7, "pickup replenishes once");
race.Collect(Race.Step);
Require(player.Rockets == 1, "pickup waits before respawning");
```

## Run complete seeded races and repeat training

Evaluate drives a full race through the shared controller and rules. Two runs with the same seed and strategy must yield the same Result in this toolchain. Requiring a time below the cap also checks that the controller actually finishes rather than deterministically getting stuck.

Train twice on a short fixed experiment and compare every numeric row. SequenceEqual compares array contents; `==` on arrays would compare references and reject separate arrays with identical values. Reproducibility does not prove policy quality, but it makes future regressions diagnosable.

The short training check is intentionally small enough for frequent runs. Full training and held-out evaluation belong in release evidence or deliberate experiments, not every keystroke. The final success message now follows every assertion; an earlier foundation success line alone is not a passing full process.

Type this fragment in `Checks/Program.cs`. Append it after the previous fragment in this file.

```csharp edit=Checks/Program.cs mode=append
Training.Result first = Training.Evaluate(new Policy(),9100,true);
Training.Result repeat = Training.Evaluate(new Policy(),9100,true);
Require(first == repeat && first.Seconds < 180, "seeded scripted race repeats and finishes");
Policy aPolicy = Training.Train(2), bPolicy = Training.Train(2);
Require(aPolicy.Values.Count > 0 && aPolicy.Values.All(row => bPolicy.Values[row.Key].SequenceEqual(row.Value)), "training is deterministic");
Console.WriteLine("ALL CHECKS PASSED");
```

## Interpret the evidence without expanding its claim

Run `dotnet run --project Checks`. Expect exit status zero and ALL CHECKS PASSED after the individual assertions. A nonzero process is a failure even if some earlier lines say PASS. Do not filter output down to successful lines.

Run the full training/evaluation commands from the prior lesson. Compare mean time and place, inspect per-seed variation, and record completion. A policy may finish slower while securing better position through attacks. That is evidence of the reward tradeoff, not a reason to suppress the time metric.

Finally return to the real window. Verify focus pause, keyboard menu activation, saved purchases after reopening, and visible effects. Those involve presentation and device integration beyond the headless suite. A deterministic test and a human playtest answer different questions; your release notes should say which was performed.

```check
run "dotnet run --project Checks" exit=0 stdout="ALL CHECKS PASSED" timeout=120
```

## Challenge — return to this later

This is optional. You can continue without completing it; no later guided step depends on your solution. Keep your attempt and revisit it.

Add a regression for an invalid policy row and another for a garage with an unsupported version. State the expected behavior first. Then revisit the earlier failed challenge without looking at its previous attempt and compare your reasoning.

