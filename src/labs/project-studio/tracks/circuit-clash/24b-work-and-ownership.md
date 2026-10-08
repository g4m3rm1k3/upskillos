---
title: Threads, tasks, and keeping the window responsive
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

Training is CPU work that can take longer than a frame. Before the application starts it in the background, understand which thread owns data and when a result becomes safe to use.

## Wait for a result without sharing its construction

Task.Run schedules work on a thread-pool worker. A Task<int> represents eventual completion with an integer result, not the integer itself. `await` waits logically for completion and then produces that result; it does not mean the worker has finished immediately when scheduled.

Top-level await makes the compiler generate an asynchronous entry method. Our local Compute uses only its own variables. There is no shared mutable counter and no graphics call in the worker. The caller consumes the returned value after completion. The printed result must be 499500 regardless of exactly when the operating system schedules the worker.

This console experiment waits because it has nothing else to draw. The game instead keeps calling Update/Draw and polls IsCompleted, adopting the policy only when the task succeeded. Reading Result before completion would block the window thread. Awaiting a task is not a universal permission to call Raylib from any thread; graphics-context ownership still applies.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
int Compute()
{
    int total = 0;
    for (int i = 0; i < 1000; i++) total += i;
    return total;
}
Task<int> work = Task.Run(Compute);
int result = await work;
if (result != 499500) throw new Exception("Worker result failed");
Console.WriteLine("TASK OWNERSHIP PASSED");
```

## Recognize a read-modify-write race

Incrementing a shared count means read, add, then write. If two threads read 10 before either writes, both can write 11 and lose one increment. An int-sized read or write being atomic does not make the whole sequence atomic.

Interlocked performs a specified update atomically. Volatile.Read provides visibility/order guarantees for a single published value; it does not make a dictionary transaction thread-safe. The game uses these narrowly for a progress count and keeps the policy under one worker's ownership until completion.

A copied dictionary containing shared row arrays would still permit both threads to change the same estimates. That links the earlier reference-copy lesson to a concurrency bug. Prefer reducing shared mutable state over adding locks everywhere. A lock can protect a critical section, but also introduces waiting and potential deadlocks when multiple locks are acquired inconsistently.

## Own failure, cancellation, and shutdown

A task can complete successfully, fault with an exception, or be canceled cooperatively. Completion alone is not proof that a usable result exists. The application checks IsCompletedSuccessfully before reading its policy and retains the prior one on failure.

Cooperative cancellation passes a signal that work checks at safe boundaries, such as between episodes. It is different from forcibly killing a thread midway through a save. Our current training screen has no cancel button and saves only completed policies; exiting may abandon unfinished training. This limitation is stated rather than disguised as persisted progress.

Test the user-visible lifecycle as well as arithmetic: training must not freeze menu interaction, a second job must not start while one is running, failure must not erase a working policy, and graphics resources must close on exit. Those are engineering requirements independent of whether the learning algorithm is sophisticated.

