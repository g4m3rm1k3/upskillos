export default {
  id:'a-12',slug:'while-loops',track:'A',order:12,
  title:'While Loops',subtitle:'Condition-Controlled Repetition',
  tags:['while','convergence','infinite-loop','binary-search','newton'],
  prereqs:['a-10','a-11'],unlocks:['a-13'],
  hook:{question:'How do you repeat until a condition changes — not a fixed number of times?',realWorldContext:`Numerical algorithms — Newton's method, gradient descent, iterative solvers — all run until convergence, not for a fixed number of steps. Understanding while loops is prerequisite to understanding optimization algorithms.`},
  intuition:{
    prose:[`\`while condition:\` runs as long as condition is True. Unlike for, the number of iterations is not known in advance. You must ensure the condition eventually becomes False — otherwise the loop runs forever.`,
      `Ask **how will this loop end?** A loop can end in several ways: (1) the condition becomes False because a variable it tests changes inside the body (the most common beginner pattern — a **termination variable** like a counter); (2) a \`break\` jumps out, as in \`while True:\` loops that break when a result is found; (3) a \`return\` inside a function leaves the loop and the function; (4) an exception is raised; (5) the condition depends on something outside the loop body, such as user input, a file, or the clock. So "no variable in the condition is modified in the body" is a warning sign, not proof of an infinite loop. As a beginner, prefer one clear termination variable plus a maximum-iteration guard.`,
      `**Convergence loops** run until a value stops changing significantly. This is the pattern behind Newton's method, gradient descent, and most numerical algorithms. Add a max_iterations guard to prevent infinite loops on non-convergent cases.`],
    callouts:[{type:'warning',title:'The Infinite Loop',body:`while True:
    do_work()  # runs forever — nothing ever exits the loop

A loop needs a way out: a condition that eventually becomes False,
a break, a return, or an exception.

Bounded beginner pattern — a max_iterations guard:
i = 0
while condition and i < 1000:
    update()
    i += 1
if i == 1000:
    print("stopped by the guard, not by the condition")`}],
    visualizations:[{id:'PythonNotebook',title:'While Loops',props:{initialCells:[
      {id:1,cellTitle:'Stage 1 — Basic While',prose:'Countdown — runs until count reaches 0.',instructions:'Trace the value of count at each iteration.',code:`count = 5
while count > 0:
    print(count)
    count -= 1
print("Done!")`},
      {id:2,cellTitle:'Stage 2 — Accumulate Until Threshold',prose:'Keep adding until the total exceeds a threshold.',instructions:'How many iterations does this take? Count without running first.',code:`total = 0
step = 1
while total < 100:
    total += step
    step += 1
print(f"total={total}, steps={step-1}")`},
      {id:3,cellTitle:'Stage 3 — Binary Search',prose:'Find a target by halving the search range each iteration.',instructions:'Run. Notice the range halves each step — this is O(log n).',code:`lo, hi = 0, 100
target = 73
steps = 0
while lo < hi:
    mid = (lo + hi) // 2
    if mid == target:
        break
    elif mid < target:
        lo = mid + 1
    else:
        hi = mid
    steps += 1
print(f"Found {mid} in {steps} steps")`},
      {id:4,cellTitle:`Stage 4 — Newton's Method`,prose:'Compute square root by iterative refinement. Runs until the guess stops changing.',instructions:'Run with x=25. Notice rapid convergence — only ~5 iterations.',code:`def newton_sqrt(x, tolerance=1e-10):
    guess = x / 2
    iterations = 0
    while True:
        better = (guess + x / guess) / 2
        if abs(better - guess) < tolerance:
            return better, iterations
        guess = better
        iterations += 1

result, iters = newton_sqrt(25)
print(f"sqrt(25) ≈ {result:.10f} in {iters} iterations")`},
      {id:11,challengeType:'write',challengeNumber:1,challengeTitle:'Challenge 1 — Smallest Power of 2',difficulty:'easy',
        prompt:`Find the smallest power of 2 that is strictly greater than 1000. Store it in result and the exponent in exponent.`,
        instructions:`1. Start with power=1, exp=0. 2. Double power (multiply by 2) each iteration, increment exp. 3. Stop when power > 1000.`,
        code:`result = 
exponent = 
print(result, exponent)`,
        testCode:`
if result!=1024: raise ValueError(f"result should be 1024 (2^10), got {result}")
if exponent!=10: raise ValueError(f"exponent should be 10, got {exponent}")
res="SUCCESS: 2^10 = 1024, the smallest power of 2 greater than 1000."
res
`,hint:`p=1;e=0
while p<=1000:
    p*=2;e+=1
result=p;exponent=e`},
      {id:12,challengeType:'write',challengeNumber:2,challengeTitle:'Challenge 2 — Collatz Sequence',difficulty:'hard',
        prompt:`Implement the Collatz sequence starting from n=27. Rule: if even, divide by 2; if odd, multiply by 3 and add 1. Continue until reaching 1. Count the steps and store in steps.`,
        instructions:`1. Start n=27, steps=0. 2. Loop until n==1. 3. Apply the rule. Increment steps.`,
        code:`n = 27
steps = `,
        testCode:`
if steps!=111: raise ValueError(f"steps should be 111 (Collatz(27)=111), got {steps}")
res=f"SUCCESS: Collatz(27) = 111 steps. This sequence always reaches 1 (conjecture — unproven for all n)."
res
`,hint:`n=27;steps=0
while n!=1:
    if n%2==0: n//=2
    else: n=3*n+1
    steps+=1`},
    ]}}],
  },
  mentalModel:[`while runs as long as condition is True — number of iterations not known in advance.`,`Ask how the loop ends: the condition turns False, break, return, an exception, or an outside change.`,`Add a max_iterations guard to prevent infinite loops.`,`Convergence loops run until abs(new - old) < tolerance.`,`Binary search and Newton's method are classic while loop patterns.`],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'x = 1; while x < 100: x *= 2. How many times does the loop body run?',
      options: [
        '99 — the loop runs from 1 to 99',
        '7 — x doubles each time: 1, 2, 4, 8, 16, 32, 64, 128. At x=64, x < 100 is True so x becomes 128. At 128, the condition fails. That is 7 iterations',
        '100 — x starts at 1 and the loop counts to 100',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'When is a while loop preferable to a for loop?',
      options: [
        'When you need to iterate over a list — while loops are more memory efficient for lists',
        'When the number of iterations is not known in advance — e.g., running until convergence (|new - old| < tolerance) or until user input meets a condition; for loops require knowing the count upfront',
        'Always — while loops are strictly more powerful than for loops',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'What causes an infinite loop, and how do you guard against it?',
      options: [
        'Infinite loops are caused by syntax errors; fixing the syntax stops them',
        'An infinite loop occurs when nothing ever ends the loop: the condition never becomes False and no break, return or exception exits it — often because the variable the condition tests is never modified. Guard with a max_iterations counter',
        'Infinite loops happen when the initial condition is True — starting with a False condition prevents them',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'A convergence loop runs while abs(new_val - old_val) > 1e-6. What does this idiom check?',
      options: [
        'Whether the computation has produced a value smaller than one millionth',
        'Whether the successive approximations have stopped changing significantly — once the difference between consecutive estimates drops below 10⁻⁶, the algorithm has converged and further iterations give negligible improvement',
        'Whether the loop has executed more than one million times',
      ],
      correct: 1,
    },
  ],
}