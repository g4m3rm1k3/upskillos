export default {
  id:'b-01',slug:'arrays-and-vectorization',track:'B',order:1,
  title:'Arrays and Vectorization',subtitle:'Why NumPy Exists',
  tags:['numpy','array','vectorization','broadcasting','performance'],
  prereqs:['a-13','a-11'],unlocks:['b-02','b-03'],
  hook:{question:'Why is a NumPy array 100x faster than a Python list for math?',realWorldContext:'A Python list of 1 million numbers takes ~50ms to sum. NumPy takes ~1ms. At data scale, this difference is the difference between a pipeline that runs in seconds and one that runs in hours.'},
  intuition:{
    prose:['A Python list stores references (pointers) to separate Python objects. To do math, Python must follow each reference, check the object\'s type, and dispatch the operation — for every element. A **numeric** NumPy array (the kind this course uses: ints, floats, bools) stores raw numbers of one type (its **dtype**) in a single block of memory, so the loop can run in compiled C with no per-element type checks. Two refinements you will meet later: slicing can produce a **view** that steps through another array\'s memory rather than a fresh contiguous block, and an array with `dtype=object` stores pointers to Python objects and loses most of the speed benefit.',
      '**Vectorization** means applying an operation to every element without a Python loop. `arr * 2` multiplies every element by 2 in one C call. The loop happens in C, not Python. This is not just faster — it is how you should think about array operations.',
      '**Broadcasting** lets NumPy combine arrays of different shapes without copying data. The rule: line the shapes up from the **right**; each pair of dimensions must be equal, or one of them must be 1 (a missing dimension counts as 1). A size-1 dimension is then treated as if repeated to match. So `(3, 4)` with `(4,)` works (a row applied to every row), `(3, 4)` with `(3, 1)` works (a column applied to every column), but `(3, 4)` with `(3,)` fails, because 4 and 3 are compared. It also explains a classic silent bug: `(3,)` combined with `(3, 1)` gives a `(3, 3)` result, not 3 values. Predicting shapes before you run is the habit that prevents these errors.'],
    callouts:[{type:'important',title:'The Vectorization Mindset',body:`DO NOT write:
  result = []
  for x in arr:
      result.append(x * 2)

WRITE:
  result = arr * 2

Not just faster — more readable and closer to mathematical notation.`}],
    visualizations:[{id:'PythonNotebook',title:'NumPy Arrays',props:{initialCells:[
      {id:1,cellTitle:'Stage 1 — Speed Comparison',prose:'The same computation in Python vs NumPy.',instructions:'Run the cell. Notice the timing difference.',code:`import numpy as np
import time

# Python list
data = list(range(1_000_000))
start = time.time()
total = sum(x**2 for x in data)
python_time = time.time() - start

# NumPy array
arr = np.arange(1_000_000)
start = time.time()
total_np = np.sum(arr**2)
numpy_time = time.time() - start

print(f"Python: {python_time*1000:.1f}ms")
print(f"NumPy:  {numpy_time*1000:.1f}ms")
print(f"Speedup: {python_time/numpy_time:.0f}x")`,output:'',status:'idle'},
      {id:2,cellTitle:'Stage 2 — Creating Arrays',prose:'NumPy provides many ways to create arrays.',instructions:'Run the cell. Learn these creation functions — you will use them constantly.',code:`import numpy as np
print(np.array([1,2,3,4,5]))
print(np.zeros(5))
print(np.ones((2,3)))
print(np.arange(0,10,2))     # like range()
print(np.linspace(0,1,5))    # 5 evenly spaced points 0→1
print(np.eye(3))             # identity matrix`,output:'',status:'idle'},
      {id:3,cellTitle:'Stage 3 — Vectorized Operations',prose:'Math operations apply element-wise without loops.',instructions:'Run. Every operation applies to all elements simultaneously.',code:`import numpy as np
arr = np.array([1,2,3,4,5])
print(arr * 2)
print(arr ** 2)
print(arr + arr)
print(np.sqrt(arr))
print(np.sin(arr))`,output:'',status:'idle'},
      {id:4,cellTitle:'Stage 4 — Boolean Indexing',prose:'Apply a boolean condition to get a mask, use mask to filter.',instructions:'Run. This pattern — create mask, apply mask — is used constantly in pandas.',code:`import numpy as np
arr = np.array([3,1,4,1,5,9,2,6])
mask = arr > 4
print(mask)           # [F,F,F,F,T,T,F,T]
print(arr[mask])      # [5,9,6]
print(arr[arr > 4])   # same thing, inline`,output:'',status:'idle'},
      {id:5,cellTitle:'Stage 5 — Aggregate Functions',prose:'NumPy provides fast aggregate operations.',instructions:'Run. These are the building blocks of descriptive statistics.',code:`import numpy as np
arr = np.array([4,7,2,9,1,5,8,3,6])
print("sum:", np.sum(arr))
print("mean:", np.mean(arr))
print("std:", np.std(arr))
print("min:", np.min(arr))
print("max:", np.max(arr))
print("median:", np.median(arr))`,output:'',status:'idle'},
      {id:6,cellTitle:'Stage 6 — Broadcasting: the Right-Aligned Shape Rule',prose:'Write the two shapes one above the other, aligned on the right. Compare each column of dimensions: they must be equal, or one must be 1. Example: (3, 4) and (4,) → compare 4 with 4 (ok); the missing dimension counts as 1 (ok) → result (3, 4). (3, 4) and (3,) → compare 4 with 3 → error. (3,) and (3, 1) → compare 3 with 1 (ok), then 1 (missing) with 3 (ok) → result (3, 3), which is usually NOT what you wanted.',instructions:'Before running, write the result shape (or "error") for each line. Then run. Finally fix the last example so it gives 3 differences instead of a 3×3 table, using col.ravel() or row.reshape(3, 1).',code:`import numpy as np
M = np.arange(12).reshape(3, 4)   # shape (3, 4)
row = np.array([10, 20, 30, 40])  # shape (4,)
col = np.array([[1], [2], [3]])   # shape (3, 1)

print((M + row).shape)   # (3, 4): row added to every row
print((M * col).shape)   # (3, 4): each row scaled by its col value

try:
    M + np.array([1, 2, 3])       # (3, 4) with (3,): 4 vs 3 → error
except ValueError as e:
    print("ValueError:", e)

# Silent shape bug: (3,) with (3, 1) broadcasts to (3, 3)
y_true = np.array([1.0, 2.0, 3.0])        # shape (3,)
y_pred = np.array([[1.5], [2.0], [2.5]])  # shape (3, 1)
diff = y_true - y_pred
print(diff.shape)        # (3, 3) — not 3 residuals!`,output:'',status:'idle'},
      {id:11,challengeType:'write',challengeNumber:1,challengeTitle:'Challenge 1 — Vectorized Math',difficulty:'easy',
        prompt:'Using only NumPy (no Python loops), create the array [1,2,3,...,1000], compute the sum of squares, and verify it equals n(n+1)(2n+1)/6 for n=1000. Store sum in sum_of_squares.',
        instructions:`1. Create array with np.arange().
2. Square all elements.
3. Sum with np.sum().`,
        code:`import numpy as np
sum_of_squares = 
print(sum_of_squares)
print(1000*1001*2001//6)`,output:'',status:'idle',
        testCode:`
expected=1000*1001*2001//6
if int(sum_of_squares)!=expected: raise ValueError(f"Expected {expected}, got {sum_of_squares}")
res=f"SUCCESS: Sum of squares 1..1000 = {expected}. Formula n(n+1)(2n+1)/6 verified."
res
`,hint:`arr=np.arange(1,1001)
sum_of_squares=np.sum(arr**2)`},
      {id:12,challengeType:'write',challengeNumber:2,challengeTitle:'Challenge 2 — Normalization',difficulty:'medium',
        prompt:'Write normalize(arr) that returns a new array where each element is scaled to [0,1]. Formula: (x - min) / (max - min). Do not use any loop.',
        instructions:`1. Compute min and max with np.min(), np.max().
2. Apply the formula vectorized.
3. Return the result.`,
        code:`import numpy as np
def normalize(arr):
    # Your code here
    pass

data = np.array([10.0, 20.0, 30.0, 40.0, 50.0])
print(normalize(data))`,output:'',status:'idle',
        testCode:`
import numpy as np
data=np.array([10.0,20.0,30.0,40.0,50.0])
result=normalize(data)
expected=np.array([0,0.25,0.5,0.75,1.0])
if not np.allclose(result,expected): raise ValueError(f"Expected {expected}, got {result}")
res="SUCCESS: Min-max normalization. This appears before nearly every ML algorithm."
res
`,hint:`def normalize(arr):
    return (arr - np.min(arr)) / (np.max(arr) - np.min(arr))`},
    ]}}],
  },
  mentalModel:['A numeric NumPy array stores raw values of one dtype — math runs in compiled C, not a Python loop (views and object arrays are the exceptions to learn later).','Broadcasting: align shapes on the right; each dimension pair must be equal or contain a 1. Predict the shape before you run.','Vectorization: operate on the whole array at once. No loops.','Boolean indexing: create a boolean mask, use it to filter elements.','np.arange() like range(). np.linspace() for evenly spaced floats.','Aggregates: np.sum, np.mean, np.std, np.min, np.max, np.median.'],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'a = np.array([1, 2, 3]); b = a * 2 + 1. What is b?',
      options: [
        '[3, 5, 7] — each element is multiplied by 2 then 1 is added: 1*2+1=3, 2*2+1=5, 3*2+1=7',
        '[2, 4, 6, 1] — multiplication creates a new array and 1 is appended',
        '[3, 5, 7, 1] — NumPy adds 1 as a new element when using scalar addition',
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Why is a = np.array([1,2,3,4,5]); result = a[a > 3] a key pattern?',
      options: [
        'It filters elements using a loop internally — equivalent to [x for x in a if x > 3]',
        'Boolean indexing: a > 3 produces [False,False,False,True,True], and a[[F,F,F,T,T]] selects only where True, giving [4,5] — all in vectorized C code without Python loops',
        'It removes elements equal to 3 from the array',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'What is the key difference between np.arange(0, 1, 0.1) and np.linspace(0, 1, 10)?',
      options: [
        'arange gives exactly 10 points from 0 to 1; linspace gives 9',
        'arange uses a step size (0.1) and may have floating-point imprecision in the number of points; linspace uses the exact number of points (10) evenly spaced between endpoints, guaranteeing endpoint inclusion',
        'arange is for integers only; linspace works for all numeric types',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Python loops over 1 million numbers take ~1 second. NumPy vectorized operations take ~1 millisecond. Why?',
      options: [
        'NumPy skips validation checks that Python requires for safety',
        'A numeric NumPy array stores all elements as the same raw type and executes operations in compiled C — no Python object creation, type checking, or interpreter overhead per element; the C loop over uniform memory is often 10x–1000x faster',
        'NumPy uses multiple CPU cores automatically while Python loops are single-threaded',
      ],
      correct: 1,
    },
  ],
}