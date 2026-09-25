export default {
  id: 'a-03', slug: 'expressions-and-evaluation', track: 'A', order: 3,
  title: 'Expressions and Evaluation Order', subtitle: 'The Grammar of Computation',
  tags: ['expressions', 'operators', 'precedence', 'division'],
  prereqs: ['a-01','a-02'], unlocks: ['a-04','a-08'],
  hook: {
    question: 'What does 2 + 3 * 4 equal — and why?',
    realWorldContext: 'Operator precedence is not a convention someone made up — it is the grammar rule that makes expressions unambiguous. A formula in a data pipeline that computes the wrong thing because of a missing parenthesis is one of the hardest bugs to spot.',
  },
  intuition: {
    prose: [
      'An **expression** is any combination of values, operators, and function calls that evaluates to a single value. `2 + 3`, `"hello" + "world"`, `abs(-5)` are all expressions.',
      'Three separate rules decide what an expression means. **Precedence** decides which operator groups first: `**` before `*`, `/`, `//`, `%`, which come before `+` and `-` (roughly PEMDAS/BODMAS). **Associativity** decides how operators at the *same* level group: most arithmetic operators group left to right (`20 - 4 - 3` is `(20 - 4) - 3`), but `**` groups right to left (`2 ** 3 ** 2` is `2 ** (3 ** 2)` = 512, not 64). **Evaluation order** is when each operand is computed: Python computes operands left to right, even when precedence groups the right-hand part first — in `f() + g() * h()`, `f()` is called first, although the multiplication is applied before the addition.',
      'Python has three division operators: `/` (true division, always float), `//` (floor division, rounds toward negative infinity), and `%` (modulo, the remainder). All three will appear constantly in data science.',
    ],
    callouts: [
      { type: 'important', title: 'Precedence Order', body: '1. Parentheses ()\n2. Exponents **\n3. Unary minus -x\n4. Multiplication *, Division /, //, %\n5. Addition +, Subtraction -\nSame level: left to right, EXCEPT ** which groups right to left (2 ** 3 ** 2 == 2 ** 9)' },
      { type: 'warning', title: '/ vs // vs %', body: '10 / 3 = 3.333... (always float)\n10 // 3 = 3 (floor — rounds down)\n10 % 3 = 1 (remainder)\n-10 // 3 = -4 (floors toward negative infinity, not zero!)' },
    ],
    visualizations: [{
      id: 'PythonNotebook',
      title: 'Expressions and Evaluation',
      props: { initialCells: [
        { id:1, cellTitle:'Stage 1 — Precedence in Action',
          prose:'The expression 2 + 3 * 4 evaluates to 14, not 20. Multiplication happens before addition.',
          instructions:'Run the cell. Then modify line 1 to use parentheses to make it evaluate to 20.',
          code:'print(2 + 3 * 4)       # 14, not 20\nprint((2 + 3) * 4)     # 20\nprint(2 + 3 * 4 == 14) # True',
          output:'', status:'idle' },
        { id:2, cellTitle:'Stage 2 — The Three Division Operators',
          prose:'True division always produces a float. Floor division truncates toward negative infinity. Modulo gives the remainder.',
          instructions:'Run the cell. Pay attention to -10 // 3. Most beginners expect -3 but get -4.',
          code:'print(10 / 3)    # 3.3333...\nprint(10 // 3)   # 3\nprint(10 % 3)    # 1\nprint(-10 // 3)  # -4 (not -3!) floors toward -infinity',
          output:'', status:'idle' },
        { id:3, cellTitle:'Stage 3 — Exponentiation',
          prose:'** is the exponentiation operator. 2**10 is 1024. It has higher precedence than multiplication.',
          instructions:'Run the cell. Predict each result before running.',
          code:'print(2 ** 10)       # 1024\nprint(2 ** 0.5)      # square root\nprint(-2 ** 2)       # -4 (not 4!) ** binds tighter than negation\nprint((-2) ** 2)     # 4',
          output:'', status:'idle' },
        { id:4, cellTitle:'Stage 4 — Associativity and Evaluation Order',
          prose:'Associativity decides how operators of equal precedence group. `/` and `-` group left to right, so `20 / 4 / 5` means `(20 / 4) / 5`. `**` is the exception: it groups right to left, so `2 ** 3 ** 2` means `2 ** (3 ** 2)`. Separately, evaluation order says operands are *computed* left to right: the `show` helper prints each operand as Python computes it, so you can see that `show(1)` is computed before `show(2) * show(3)` is multiplied.',
          instructions:'Trace each expression by hand before running, including which parenthesized grouping Python uses. Then verify. In the last line, predict the order of the "computing" messages.',
          code:'print(20 / 4 / 5)    # (20/4)/5 = 5/5 = 1.0\nprint(20 - 4 - 3)    # (20-4)-3 = 16-3 = 13\nprint(2 ** 3 ** 2)   # 2**(3**2) = 2**9 = 512 (** groups RIGHT to left)\nprint((2 ** 3) ** 2) # 8**2 = 64 — parentheses force the other grouping\nprint(2 ** 3 ** 2 == 2 ** (3 ** 2))  # True\n\ndef show(v):\n    print("computing", v)\n    return v\n\n# Precedence groups 2*3 first, but operands are still computed left to right: 1, 2, 3\nprint(show(1) + show(2) * show(3))   # 7',
          output:'', status:'idle' },
        { id:5, cellTitle:'Stage 5 — Modulo in Practice',
          prose:'Modulo (%) is used constantly: testing if a number is even/odd, wrapping around (clock arithmetic), extracting digits. Learn it well.',
          instructions:'Run the cell. The even/odd test is one of the most common patterns in Python.',
          code:'print(7 % 2)    # 1 → 7 is odd\nprint(8 % 2)    # 0 → 8 is even\nprint(23 % 10)  # 3 → last digit of 23\nprint(7 % 3)    # 1 → remainder when dividing 7 by 3',
          output:'', status:'idle' },
        { id:6, cellTitle:'Stage 6 — Compound Expressions',
          prose:'Real formulas combine many operators. Parentheses make intent explicit and override precedence.',
          instructions:'Trace (3 + 4) ** 2 - 10 // 3 by hand: step through each operation.',
          code:'# Trace this by hand before running\nresult = (3 + 4) ** 2 - 10 // 3\nprint(result)\n\n# Break it down\nstep1 = 3 + 4       # 7\nstep2 = step1 ** 2  # 49\nstep3 = 10 // 3     # 3\nstep4 = step2 - step3  # 46\nprint(step4 == result)',
          output:'', status:'idle' },
        { id:11, challengeType:'write', challengeNumber:1, challengeTitle:'Challenge 1 — Evaluate the Formula',
          difficulty:'medium',
          prompt:'The BMI formula is: weight_kg / (height_m ** 2). Given weight = 70 kg and height = 1.75 m, compute the BMI and store it in a variable named `bmi`. Then compute whether this BMI indicates "healthy" (18.5 ≤ bmi < 25.0) and store the boolean result in `is_healthy`.',
          instructions:'1. Use the formula with proper parentheses.\n2. Use a comparison to create is_healthy.\n3. Do not hardcode the number — compute it from weight and height.',
          code:'weight = 70\nheight = 1.75\n# Your code here\nbmi = \nis_healthy = \n',
          output:'', status:'idle',
          testCode:`
if 'bmi' not in locals(): raise ValueError("Missing: bmi")
if 'is_healthy' not in locals(): raise ValueError("Missing: is_healthy")
expected_bmi = 70 / (1.75 ** 2)
if abs(bmi - expected_bmi) > 0.001:
    raise ValueError(f"bmi should be {expected_bmi:.4f}, got {bmi}. Check your formula — use ** for exponentiation.")
if is_healthy != True:
    raise ValueError(f"is_healthy should be True (bmi={bmi:.2f} is in 18.5-25.0 range)")
res = f"SUCCESS: BMI = {bmi:.2f}. is_healthy = {is_healthy}. Formula and comparison both correct."
res
`,
          hint:'bmi = weight / (height ** 2)\nis_healthy = 18.5 <= bmi < 25.0' },
        { id:12, challengeType:'write', challengeNumber:2, challengeTitle:'Challenge 2 — Modulo Patterns',
          difficulty:'medium',
          prompt:'Using ONLY the modulo operator (%) and integer division (//) — no string conversion — extract the hundreds digit, tens digit, and units digit of the number 847. Store them as `hundreds`, `tens`, `units`.',
          instructions:'1. units = 847 % 10 gives the last digit.\n2. tens requires removing the units first.\n3. hundreds requires removing units and tens.',
          code:'n = 847\n# Your code here — use only % and //\nhundreds = \ntens = \nunits = \n',
          output:'', status:'idle',
          testCode:`
if 'hundreds' not in locals(): raise ValueError("Missing: hundreds")
if 'tens' not in locals(): raise ValueError("Missing: tens")
if 'units' not in locals(): raise ValueError("Missing: units")
if units != 7: raise ValueError(f"units should be 7 (847 % 10), got {units}")
if tens != 4: raise ValueError(f"tens should be 4 ((847 // 10) % 10), got {tens}")
if hundreds != 8: raise ValueError(f"hundreds should be 8 ((847 // 100) % 10), got {hundreds}")
res = "SUCCESS: Digit extraction with modulo and floor division — a fundamental pattern."
res
`,
          hint:'units = n % 10\ntens = (n // 10) % 10\nhundreds = (n // 100) % 10' },
      ]}
    }],
  },
  mentalModel: [
    'Precedence decides which operator groups first; associativity decides grouping at the same level; operands are computed left to right.',
    '/ always gives float. // floors toward negative infinity. % gives remainder.',
    '** is right-to-left associative: 2 ** 3 ** 2 == 2 ** (3 ** 2) == 512. The other arithmetic operators group left to right.',
    'Use parentheses to make intent explicit — never rely on memorizing precedence.',
    'Modulo is a core pattern: even/odd testing, digit extraction, cyclic counting.',
  ],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'What does 2 + 3 * 4 evaluate to in Python?',
      options: [
        '20 — Python evaluates left to right: 2 + 3 = 5, then 5 * 4 = 20',
        '14 — multiplication has higher precedence than addition, so 3 * 4 = 12 is evaluated first, then 2 + 12 = 14',
        '24 — the expression is fully combined before applying operators',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'What does 17 % 5 evaluate to?',
      options: [
        '3 — 17 divided by 5 is 3 with some left over, so 17 % 5 is 3',
        '2 — 17 = 5 × 3 + 2, so 17 % 5 = 2 (the remainder after dividing by 5)',
        '3 — the result is the quotient, not the remainder',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'How do you check if a number n is even using the modulo operator?',
      options: [
        'n / 2 == 0 — even numbers divide evenly',
        'n % 2 == 0 — an even number has remainder 0 when divided by 2; n % 2 gives either 0 (even) or 1 (odd)',
        'n // 2 * 2 == n — reconstruct n from its half and check equality',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'What is the value of (1 + 2) * (3 + 4) and why do parentheses matter here?',
      options: [
        '10 — 1 + 2 * 3 + 4 by default; the parentheses just clarify and do not change the result',
        '21 — parentheses override precedence: (1+2) = 3 and (3+4) = 7, then 3 * 7 = 21, whereas without parentheses 1 + 2*3 + 4 = 11',
        '24 — the two sums are 3 and 4, and 3 × 4 × 2 = 24',
      ],
      correct: 1,
    },
  ],
}
