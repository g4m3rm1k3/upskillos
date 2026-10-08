---
title: Data structures and algorithms — count the work
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

An algorithm is a procedure that transforms input into a result. A data structure organizes the input so particular operations are cheap or simple. We will measure work in small examples before naming asymptotic complexity or using LINQ to hide a loop.

## Find a minimum in one pass

The distances are unsorted. To find the nearest rival, keep the smallest distance seen and its index. Begin at infinity and -1; -1 means no candidate has been selected yet. Each iteration compares one value and updates both pieces together if it improves the result.

After processing indices 0 through i, bestDistance must equal the smallest examined value and bestIndex must identify it. That is the loop invariant. At termination every element has been examined, so the result is the minimum of the whole input. Equal values keep the earlier index because the comparison is strict `<`.

comparisons counts actual iterations. For n elements this performs n comparisons and keeps only a fixed amount of extra state: O(n) time, O(1) additional space. Big-O describes growth as input size increases, not milliseconds on a particular machine. An empty input would preserve index -1; a caller must handle that instead of indexing at -1.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
float[] distances = { 12f, 4f, 9f, 4f };
int bestIndex = -1;
float bestDistance = float.PositiveInfinity;
int comparisons = 0;
for (int i = 0; i < distances.Length; i++)
{
    comparisons++;
    if (distances[i] < bestDistance)
    {
        bestDistance = distances[i];
        bestIndex = i;
    }
}
if (bestIndex != 1 || comparisons != 4) throw new Exception("Minimum search contract failed");
Console.WriteLine("LINEAR SEARCH PASSED");
```

## Explain what sorting buys and costs

Finding one minimum does not require ordering every value. Sorting is useful when we need the entire finishing order. Here insertion sort takes one value from the unsorted suffix, shifts larger prefix values right, and inserts it into the gap. After each outer iteration, the prefix through that position is sorted.

With input 9,3,6: insert 3 before 9 to get 3,9,6; then shift 9 and insert 6 to get 3,6,9. Saving value before shifts prevents it being overwritten. `j >= 0 && ...` short-circuits so values[-1] is never evaluated.

Insertion sort uses constant additional storage but may shift about n(n-1)/2 elements in reverse order: O(n²) worst-case time. We use it to understand sorting, not to replace the standard library for every task. The later ranking code delegates ordering to LINQ. Multiple sort keys and deterministic tie-breaking still need a requirement, even when a library does the comparisons.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
int[] values = { 9, 3, 6 };
for (int i = 1; i < values.Length; i++)
{
    int value = values[i];
    int j = i - 1;
    while (j >= 0 && values[j] > value)
    {
        values[j + 1] = values[j];
        j--;
    }
    values[j + 1] = value;
}
if (values[0] != 3 || values[1] != 6 || values[2] != 9)
    throw new Exception("Sort contract failed");
Console.WriteLine("INSERTION SORT PASSED");
```

## Use binary search only when its precondition holds

In a sorted sequence, comparing with the middle element lets us discard one half. low and high bound the remaining inclusive interval. If the target is smaller, set high before mid; if larger, set low after mid. When low exceeds high, the target is absent.

`low + (high-low)/2` uses integer division to choose a middle index without summing two large bounds. Each comparison roughly halves the remaining size, giving O(log n) search time. That benefit depends on sorted input and efficient indexing. It does not apply directly to nearby moving karts in an arbitrary list.

Predict the search for 9: middle 7 is too small, then 11 too large, then 9 matches. Change target to 8 and trace the empty interval; restore 9 afterward. For one query on unsorted data, sorting first can cost more than the earlier linear scan. Preconditions and total work matter more than memorizing a faster-sounding complexity.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
int[] sorted = { 1, 3, 5, 7, 9, 11, 13 };
int target = 9, low = 0, high = sorted.Length - 1, found = -1;
while (low <= high)
{
    int mid = low + (high - low) / 2;
    if (sorted[mid] == target) { found = mid; break; }
    if (sorted[mid] < target) low = mid + 1;
    else high = mid - 1;
}
if (found != 4) throw new Exception("Binary search contract failed");
Console.WriteLine("BINARY SEARCH PASSED");
```

## Choose collections by their actual operations

An array supports indexed access without searching: O(1). A List stores elements in an expandable array: appending is amortized O(1), meaning occasional resize-and-copy work is spread over many appends; removing from the middle may shift later elements, O(n). These costs concern operations, not whether the data structure is “advanced.”

A Queue consumes oldest-first, appropriate for keyboard events and breadth-first search. A Stack consumes newest-first, appropriate for undo commands or depth-first traversal. A Dictionary uses keys and hashing for expected fast lookup; hash collisions require resolving multiple keys and worst-case performance is not automatically constant. A HashSet records membership without an associated value.

The game applies these choices: fixed roster array, growing hazard list, event queue, observation-to-values dictionary. Pairwise kart contacts need n(n-1)/2 checks; doubling a large roster roughly quadruples work. A spatial grid adds bookkeeping to reduce candidates. Measure the actual bottleneck before introducing that extra representation.

Before continuing, choose a structure for unique visited checkpoints, ordered lap times, pending key presses, and lookup by racer Id. Explain the needed operation first, then the name of the collection. The next lab uses a queue and visited membership to solve a new problem.

## Challenge — revisit without blocking the course

This challenge is optional and can be deferred. All implementation needed later is in the guided path.

Run the linear minimum search on an empty array and on equal distances. Specify the desired result before editing. Then compare sorting all distances with scanning once when only one nearest rival is required.

