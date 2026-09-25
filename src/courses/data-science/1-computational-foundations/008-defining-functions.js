export default {
  id:'a-08',slug:'defining-functions',track:'A',order:8,
  title:'Defining Functions',subtitle:'Building Your Own Machines',
  tags:['def','parameters','return','scope','pure-functions'],
  prereqs:['a-05','a-07'],unlocks:['a-09','a-10'],
  hook:{
    question:'How do you create a computation you can reuse by name?',
    realWorldContext:'Every non-trivial program is built from functions. A function you define once and call a hundred times is a hundred fewer places to have bugs. Functions also let you name a computation — good names make code read like prose.',
  },
  intuition:{
    prose:[
      '`def` registers a recipe under a name. Calling the function executes the recipe with specific arguments. `return` sends a value back to the caller. Without return, the function returns None.',
      '**Parameters are local variables.** They exist only while the function runs, and names assigned inside a function do not exist outside it. Rebinding a local name (`x = x + 1` inside the function) never changes the caller\'s variable. But a local name and the caller\'s name can refer to the **same object**. If you pass a list and the function *mutates* it (`items.append(4)`, `items[0] = 99`), the caller sees the change, because there was only ever one list. Local scope protects *names*, not *objects*.',
      'A function with no side effects that always returns the same output for the same input is a **pure function**. Pure functions are predictable, testable, and composable. Prefer them.',
    ],
    callouts:[
      {type:'important',title:'The def Anatomy',body:`def function_name(param1, param2):
    # body — indented 4 spaces
    result = param1 + param2
    return result  # sends value back to caller

# call it:
value = function_name(3, 7)  # value = 10`},
      {type:'warning',title:'Missing return = None',body:`def add(a, b):
    a + b   # computed but not returned!

x = add(3, 7)  # x is None, not 10

Fix: add return in front of the expression.`},
    ],
    visualizations:[{
      id:'PythonNotebook',title:'Defining and Using Functions',
      props:{initialCells:[
        {id:1,cellTitle:'Stage 1 — First Function',
          prose:'Define and call a simple function. Notice the indentation — it is mandatory.',
          instructions:'Run the cell. Then call square() with different arguments.',
          code:`def square(x):
    return x ** 2

print(square(5))
print(square(-3))
print(square(0))`,
          output:'',status:'idle'},
        {id:2,cellTitle:'Stage 2 — Local Scope',
          prose:'Variables defined inside a function are local — they do not exist outside. The parameter x only exists while square() is running.',
          instructions:'Run the cell. The NameError on the last line confirms that x does not exist outside the function.',
          code:`def square(x):
    result = x ** 2
    return result

y = square(4)
print(y)       # 16
# print(x)     # NameError — x is local to square()
# print(result) # NameError — result is local too`,
          output:'',status:'idle'},
        {id:7,cellTitle:'Stage 2b — Local Names vs Shared Objects',
          prose:'When you call `f(scores)`, the parameter inside `f` becomes a second name for the same list object — no copy is made. Rebinding the parameter (`items = [...]`) points only the local name at a new list, so the caller is unaffected. Mutating it (`items.append(...)`) changes the one shared list, so the caller sees it. A pure function avoids the surprise by building and returning a new list instead of changing its input.',
          instructions:'Predict what each print shows before running. Then change add_bonus_pure so it uses items.append(bonus) and returns items — run again and notice that scores changes. Undo that change before moving on.',
          code:`def rebind(items):
    items = [0, 0, 0]          # new local binding — caller unaffected
    return items

def add_bonus_mutating(items, bonus):
    items.append(bonus)        # mutates the SAME list the caller holds

def add_bonus_pure(items, bonus):
    return items + [bonus]     # builds a NEW list; input untouched

scores = [70, 85]
rebind(scores)
print(scores)                  # [70, 85]

new_scores = add_bonus_pure(scores, 5)
print(scores, new_scores)      # [70, 85] [70, 85, 5]

add_bonus_mutating(scores, 5)
print(scores)                  # [70, 85, 5] — the caller's list changed`,
          output:'',status:'idle'},
        {id:3,cellTitle:'Stage 3 — Multiple Parameters',
          prose:'Functions can take multiple parameters. Each becomes a local variable inside the function.',
          instructions:'Run the cell. The order of arguments in the call must match the order of parameters in the definition.',
          code:`def bmi(weight_kg, height_m):
    return weight_kg / (height_m ** 2)

print(bmi(70, 1.75))   # 22.857...
print(bmi(90, 1.80))   # 27.777...`,
          output:'',status:'idle'},
        {id:4,cellTitle:'Stage 4 — Missing Return Bug',
          prose:'The most common function bug: forgetting return. The function runs but gives back None.',
          instructions:'Run the cell. Notice doubled is None. Add "return" to fix it.',
          code:`def double_broken(n):
    n * 2  # computed but not returned

def double_fixed(n):
    return n * 2

print(double_broken(5))  # None
print(double_fixed(5))   # 10`,
          output:'',status:'idle'},
        {id:5,cellTitle:'Stage 5 — Default Arguments',
          prose:'Parameters can have default values. If the caller does not provide an argument, the default is used.',
          instructions:'Run the cell. round_to(3.14159) uses the default 2. round_to(3.14159, 4) overrides it.',
          code:`def round_to(value, decimals=2):
    return round(value, decimals)

print(round_to(3.14159))    # 3.14 (default)
print(round_to(3.14159, 4)) # 3.1416`,
          output:'',status:'idle'},
        {id:6,cellTitle:'Stage 6 — Functions Calling Functions',
          prose:'Functions can call other functions — this is composition with named intermediates.',
          instructions:'Run the cell. normalize_score uses clamp inside it. This is the building block of all software.',
          code:`def clamp(value, lo, hi):
    return max(lo, min(value, hi))

def normalize_score(raw):
    clamped = clamp(raw, 0, 100)
    return clamped / 100.0

print(normalize_score(150))  # 1.0
print(normalize_score(73))   # 0.73
print(normalize_score(-5))   # 0.0`,
          output:'',status:'idle'},
        {id:11,challengeType:'write',challengeNumber:1,challengeTitle:'Challenge 1 — Celsius to Fahrenheit',
          difficulty:'easy',
          prompt:'Write a function celsius_to_fahrenheit(c) that converts Celsius to Fahrenheit. Formula: F = (C × 9/5) + 32.',
          instructions:`1. Define the function with one parameter.
2. Compute the formula.
3. Return the result.`,
          code:`def celsius_to_fahrenheit(c):
    # Your code here
    pass

print(celsius_to_fahrenheit(0))    # 32.0
print(celsius_to_fahrenheit(100))  # 212.0`,
          output:'',status:'idle',
          testCode:`
if 'celsius_to_fahrenheit' not in dir(): raise ValueError("Missing function")
cases = [(0,32),(100,212),(-40,-40),(37,98.6)]
for c,expected in cases:
    got = celsius_to_fahrenheit(c)
    if abs(got - expected) > 0.1:
        raise ValueError(f"celsius_to_fahrenheit({c}) should be {expected}, got {got}")
res = "SUCCESS: All conversions correct. The formula (C × 9/5) + 32 applied correctly."
res
`,hint:`def celsius_to_fahrenheit(c):
    return (c * 9/5) + 32`},
        {id:12,challengeType:'write',challengeNumber:2,challengeTitle:'Challenge 2 — Clamp Function',
          difficulty:'medium',
          prompt:'Write clamp(value, lo, hi) that returns value if between lo and hi, lo if below, hi if above.',
          instructions:`1. Use min() and max() — one line.
2. Test: clamp(150,0,100)=100, clamp(-5,0,100)=0, clamp(50,0,100)=50.`,
          code:`def clamp(value, lo, hi):
    # Your code here
    pass
`,
          output:'',status:'idle',
          testCode:`
tests=[(150,0,100,100),(-5,0,100,0),(50,0,100,50),(3,3,10,3),(10,3,10,10)]
for v,lo,hi,exp in tests:
    got=clamp(v,lo,hi)
    if got!=exp: raise ValueError(f"clamp({v},{lo},{hi}) should be {exp}, got {got}")
res="SUCCESS: clamp() correct for all edge cases including values at the boundaries."
res
`,hint:`def clamp(value, lo, hi):
    return max(lo, min(value, hi))`},
      ]}
    }],
  },
  mentalModel:[
    'def registers a recipe under a name. Calling executes it with specific arguments.',
    'return sends the result back to the caller. Without return, the function gives None.',
    'Parameters are local variables — they only exist while the function runs.',
    'Rebinding a parameter never affects the caller; mutating a passed-in list or dict does, because both names refer to the same object.',
    'Functions should do one thing and have a name that says what that thing is.',
    'Pure functions (same input → same output, no side effects) are preferred.',
  ],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'def add(a, b): return a + b. What does add(3, 4) return?',
      options: [
        'None — you need to print the result to get a value',
        '7 — the return statement sends 3 + 4 = 7 back to the caller',
        '"a + b" — the function returns the string expression',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'A function with no return statement returns what?',
      options: [
        '0 — Python returns 0 as a default numeric value',
        'None — Python implicitly adds return None when there is no explicit return; assigning the result of such a function gives you None',
        'The last computed value — Python returns the last expression evaluated',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Why is a "pure function" (same input → same output, no side effects) easier to debug?',
      options: [
        'Pure functions run faster because Python caches their results automatically',
        'A pure function\'s output depends only on its inputs — you can test it in isolation with known inputs and verify the output without worrying about what other code has run. Side effects create dependencies on external state that make debugging unpredictable',
        'Pure functions cannot raise exceptions, so they never need debugging',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'A variable defined inside a function — can you access it outside the function?',
      options: [
        'Yes — all variables defined anywhere in the program share the same global scope',
        'No — local variables only exist during the function\'s execution and are destroyed when the function returns; accessing them outside raises a NameError',
        'Only if you use the global keyword inside the function',
      ],
      correct: 1,
    },
  ],
}