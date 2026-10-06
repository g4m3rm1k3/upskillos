---
title: Values, types, and the units behind motion
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: csharp
pedagogy: typed
console: true
---

A kart moves because numbers change in a defined order. You will trace those changes before adding a class or a graphics library.

## Distinguish whole counts from fractional quantities

`int` holds a signed whole number. Ammunition is a count: firing one rocket subtracts one, not 0.3. `float` holds an approximate fractional number. The suffix `f` makes a numeric literal a float rather than the default double. `string` holds text; `bool` holds exactly `true` or `false`.

A declaration gives a variable its type, name, and initial value. `=` assigns; it does not compare. `rockets -= 1` reads the existing count, subtracts one, and writes back the result. Without the declaration's `int`, it changes an existing variable. C# prevents assigning text to an integer, but does not prevent treating metres as seconds. Units remain a design responsibility.

The `$` before the quoted string enables interpolation: each `{expression}` is evaluated and inserted as text. Predict the output before running: ammunition becomes 1; energy stays 100; the name stays You. Values only change where a statement changes them.

Type this fragment in `Scratch/Program.cs`. Start or replace this file.

```csharp edit=Scratch/Program.cs mode=replace
int rockets = 2;
float energy = 100f;
string name = "You";
bool shielded = false;
rockets -= 1;
Console.WriteLine($"{name}: {rockets} rockets, {energy} energy, shield={shielded}");
```

## Integrate speed over a measured interval

At 10 metres per second, travelling for 0.5 seconds covers 5 metres. Multiplying speed by time cancels the time unit. At acceleration 4 metres per second squared, half a second adds 2 metres per second to speed. The first statement below updates speed to 12; the next uses that new value and advances position by 6.

This is semi-implicit Euler integration: first update velocity, then position. Exact constant-acceleration motion over this interval would cover 5.5 metres. Smaller intervals reduce this integration error. We choose a fixed small simulation interval later, rather than claim numerical integration is exact.

`1 / 60` performs integer division and yields zero. `1f / 60` performs floating-point division and approximates one sixtieth. Parentheses control expression grouping. `Console.WriteLine` displays values but does not update them. Run, then reverse the two update statements and explain why position becomes 5 instead of 6. Restore the shown order.

Type this fragment in `Scratch/Program.cs`. Start or replace this file.

```csharp edit=Scratch/Program.cs mode=replace
float speed = 10f;
float acceleration = 4f;
float seconds = 0.5f;
float position = 0f;
speed += acceleration * seconds;
position += speed * seconds;
Console.WriteLine($"speed={speed}, position={position}");
Console.WriteLine($"integer step={1 / 60}, float step={1f / 60}");
```

## Separate display precision from calculation precision

Replace `seconds = 0.5f` with `seconds = 1f / 60` and run. Several printed digits do not mean exact arithmetic. A binary float cannot represent every decimal exactly. We will compare computed values using a tolerance instead of requiring equality to a decimal that has been rounded differently.

Try `Console.WriteLine($"{speed:F2}");` after the existing lines. `F2` formats two decimal places; it does not round the stored speed for the next calculation. Keep physical values in metres and seconds. Convert speed to kilometres per hour at the display boundary using multiplication by 3.6. Updating physics with a formatted string would mix presentation with rules.

Restore the original half-second experiment before continuing. Write its state after each assignment, including the old and new speed. This is an execution trace; it provides stronger evidence of understanding than a screenshot of its last line.

## Challenge — return to this later

This is optional. You can continue without completing it; no later guided step depends on your solution. Keep your attempt and revisit it.

Start at speed 6 with acceleration -2 for three intervals of 0.25 seconds. Trace both speed and position each interval. Then compare with one interval of 0.75 seconds and explain the different approximate distance.

