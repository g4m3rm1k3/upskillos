export default {
  id:'a-05', slug:'state-and-execution-flow', track:'A', order:5,
  title:'State and Execution Flow', subtitle:'Tracing Memory Over Time',
  tags:['state','execution','tracing','debugging','nameerror'],
  prereqs:['a-04'], unlocks:['a-06','a-10'],
  hook:{
    question:'What is "state" and why does it change?',
    realWorldContext:'A data pipeline that produces wrong results but no errors is usually a state bug — a variable was overwritten at the wrong moment, or read before it was written. Learning to trace state is learning to debug.',
  },
  intuition:{
    prose:[
      '**State** is everything the program remembers at a moment in execution. For the code in this lesson, a useful simplified model is a table of variable bindings: each name and the value it currently refers to. (Real state also includes things like open files, objects shared between names, and — in a notebook — whatever earlier cells left behind.) Every assignment changes this table. Understanding a program means being able to reconstruct the table at every line.',
      'A **NameError** occurs when Python looks up a name that is not bound where the code is running. Common causes: (1) the assignment comes after the read, or never happens; (2) the name is **misspelled** or has different capitalization (`Total` vs `total`); (3) the name was bound in a different **scope**, such as a local variable inside a function, which does not exist outside it; (4) in a notebook, the cell that assigns it was never run, or the kernel was restarted.',
      'Tracing state means writing down, after each line: every variable name and its current value. If you cannot do this, you cannot debug systematically. It feels slow but it is the fastest way to find bugs.',
    ],
    callouts:[
      {type:'important',title:'State Trace Format',body:'After each line, write:\nname1 = value1\nname2 = value2\n...\nIf a name was not yet assigned, it does not appear.\nIf a name was reassigned, show the new value only.'},
      {type:'warning',title:'Diagnosing a NameError',body:'If you get NameError: name \'x\' is not defined, check in this order:\n- Spelling and capitalization: is it really x everywhere?\n- Order: was x assigned before this line ran?\n- Scope: was x only assigned inside a function?\n- Notebook: did the cell that assigns x actually run since the last restart?'},
    ],
    visualizations:[{
      id:'PythonNotebook', title:'Tracing State',
      props:{initialCells:[
        {id:1,cellTitle:'Stage 1 — Building State Line by Line',
          prose:'Watch state build up as each line runs. After each assignment, there is one more binding in state.',
          instructions:'Run the cell. Then, in a comment below the code, write the state (all variable values) after each of the 5 lines.',
          code:'a = 10           # State: a=10\nb = 20           # State: a=10, b=20\nc = a + b        # State: a=10, b=20, c=30\na = c - a        # State: ?\nb = a * 2        # State: ?\nprint(a, b, c)',
          output:'', status:'idle'},
        {id:2,cellTitle:'Stage 2 — NameError in Practice',
          prose:'This cell reads a variable before it is bound. Python raises NameError. Here the cause is order, so the fix is to move the assignment before the read. Stage 2b shows NameErrors with different causes and different fixes.',
          instructions:'Run the cell to see the NameError. Then fix it by reordering the lines so total is computed after x and y are defined.',
          code:'total = x + y    # NameError — x and y not yet bound\nx = 15\ny = 25\nprint(total)',
          output:'', status:'idle'},
        {id:6,cellTitle:'Stage 2b — NameErrors That Are Not About Order',
          prose:'Reordering lines does not fix every NameError. In the first part, the assignment is already above the read, but the name is misspelled: `price_total` was bound, `price_totl` was read. In the second part, `discount` is bound inside a function, so it is a **local** name: it exists only while the function runs and is not visible outside it.',
          instructions:'Run the cell and read the error. Fix the spelling and run again: a second NameError appears, from the scope problem. Fix it by using the value the function returns (for example `discount = get_discount()`), not by moving lines.',
          code:'price_total = 120\nprint(price_totl)      # NameError: misspelled name\n\ndef get_discount():\n    discount = 0.1     # local to get_discount\n    return discount\n\nget_discount()\nprint(discount)        # NameError: discount only existed inside the function',
          output:'', status:'idle'},
        {id:3,cellTitle:'Stage 3 — Overwriting State',
          prose:'When a variable is reassigned, the old value is completely gone. There is no "undo." This is intentional — but it causes bugs when you overwrite a variable you still needed.',
          instructions:'Run the cell. The bug: original is overwritten before it is used in the final calculation. Find and fix the bug.',
          code:'original = 100\nresult = original * 2\noriginal = result + 50  # bug: original is gone!\nfinal = original + result  # this uses the WRONG original\nprint(final)  # should be 100 + 200 = 300, but gets 250 + 200 = 450',
          output:'', status:'idle'},
        {id:4,cellTitle:'Stage 4 — State in a 10-Line Trace',
          prose:'This is a full state trace exercise. Do NOT run the cell until you have predicted every value.',
          instructions:'Write down the state after each line. Then run and compare.',
          code:'x = 5\ny = x + 3\nx = y * 2\nz = x - y\ny = z + x\nw = y // z\nprint(x, y, z, w)',
          output:'', status:'idle'},
        {id:5,cellTitle:'Stage 5 — Using Intermediate Variables to Preserve State',
          prose:'When you need to use a value both in a computation and later on, save it before overwriting. This is the fix for the Stage 3 bug.',
          instructions:'Run the cell. The intermediate_original variable preserves the value before it is overwritten.',
          code:'original = 100\nintermediate_original = original  # save before overwriting\nresult = original * 2\noriginal = result + 50\nfinal = intermediate_original + result  # uses saved original\nprint(final)  # correctly 300',
          output:'', status:'idle'},
        {id:11,challengeType:'write',challengeNumber:1,challengeTitle:'Challenge 1 — The Swap Bug',
          difficulty:'easy',
          prompt:'The code below tries to swap a and b but does it incorrectly — both end up with the same value. Fix it using a temporary variable.',
          instructions:'1. Run the broken version to see the bug.\n2. Add a temp variable to preserve the overwritten value.\n3. After fixing: a should be 99, b should be 7.',
          code:'a = 7\nb = 99\n# Broken swap:\na = b\nb = a   # too late — a is already 99\nprint(a, b)  # should be 99 7 but gets 99 99\n',
          output:'', status:'idle',
          testCode:`
if a != 99 or b != 7:
    raise ValueError(f"Got a={a}, b={b}. Expected a=99, b=7. Use a temp variable: temp=a; a=b; b=temp")
res = "SUCCESS: Swap works. The pattern: temp=a; a=b; b=temp is the classic swap."
res
`,
          hint:'temp = a\na = b\nb = temp'},
        {id:12,challengeType:'write',challengeNumber:2,challengeTitle:'Challenge 2 — Running Total',
          difficulty:'medium',
          prompt:'Five sales figures come in one at a time. Accumulate them into a running total WITHOUT using a list or sum(). Use only assignment and addition. Store the final total in `total` and the count in `sales_count`.',
          instructions:'1. Initialize total = 0 and sales_count = 0.\n2. Add each sale to total, increment sales_count.\n3. Compute average = total / sales_count.',
          code:'sale1 = 120.50\nsale2 = 89.99\nsale3 = 204.00\nsale4 = 55.25\nsale5 = 178.30\n# Your accumulator here\ntotal = \nsales_count = \naverage = \n',
          output:'', status:'idle',
          testCode:`
if 'total' not in locals(): raise ValueError("Missing: total")
if 'sales_count' not in locals(): raise ValueError("Missing: sales_count")
if 'average' not in locals(): raise ValueError("Missing: average")
expected = 120.50 + 89.99 + 204.00 + 55.25 + 178.30
if abs(total - expected) > 0.01: raise ValueError(f"total should be {expected:.2f}, got {total}")
if sales_count != 5: raise ValueError(f"sales_count should be 5, got {sales_count}")
if abs(average - expected/5) > 0.01: raise ValueError(f"average wrong")
res = f"SUCCESS: total={total:.2f}, average={average:.2f}. The accumulator pattern is fundamental."
res
`,
          hint:'total = 0\nsales_count = 0\ntotal += sale1; sales_count += 1\n(repeat for each sale)\naverage = total / sales_count'},
      ]}
    }],
  },
  mentalModel:[
    'A variable table (name → current value) is a useful simplified model of state.',
    'A simple assignment like x = 5 changes one binding; a, b = b, a changes two.',
    'NameError = the name is not bound where it is read: wrong order, misspelling, wrong scope, or a notebook cell that never ran.',
    'Save values in intermediate variables before overwriting them.',
    'Tracing state line by line is the foundation of systematic debugging.',
  ],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'x = 10; x = x * 2; x = x - 3. What is x at the end?',
      options: [
        '17 — 10 * 2 = 20, then 20 - 3 = 17',
        '20 — the multiplication runs last',
        '7 — the subtraction runs first on the original 10',
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Why does saving intermediate values in separate variables help with debugging?',
      options: [
        'Python requires intermediate variables for multi-step calculations',
        'Intermediate variables let you inspect each step separately — you can print or check total before using it downstream, making it easy to pinpoint exactly which step produced an unexpected value',
        'Intermediate variables prevent memory leaks by releasing values after each computation',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'A function uses a variable named result. You also have a result in the outer scope. After the function call, what is the outer result?',
      options: [
        'Changed — function assignments modify the nearest variable with the same name',
        'Unchanged — Python functions have their own local scope; assigning to result inside a function creates a local variable, not modifying the outer one',
        'It depends on whether you used global result in the function',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Tracing means following a program\'s execution step by step. What is the goal of tracing a bug?',
      options: [
        'To find the line where the error message appeared — that is always where the bug is',
        'To find the exact step where the state first diverges from what you expected — the error message shows where Python complained, but the root cause may be earlier, where a wrong value was computed or assigned',
        'To determine how many instructions the program executed before crashing',
      ],
      correct: 1,
    },
  ],
}
