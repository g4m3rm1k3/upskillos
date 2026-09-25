export default {
  id:'b-07',slug:'matrices-as-transformations',track:'B',order:7,
  title:'Matrices as Transformations',subtitle:'What Matrix Multiplication Actually Does',
  tags:['matrix', 'transformation', 'determinant', 'composition', 'numpy', 'linear-algebra'],prereqs:['b-05', 'b-06'],unlocks:['b-08', 'd-02'],
  hook:{question:'Why is a matrix multiplication a transformation of space?',realWorldContext:'Matrix multiplication is not just bookkeeping. It is applying a transformation to a vector — rotating it, scaling it, shearing it, projecting it. Understanding this visually makes every linear algebra theorem obvious instead of opaque.'},
  intuition:{
    prose:['A 2×2 matrix encodes a transformation by saying where the basis vectors î=[1,0] and ĵ=[0,1] land. Written as rows, A = [[a,b],[c,d]] has first row [a,b] and second row [c,d]. Treating vectors as columns, î lands on the **first column** [a,c] and ĵ lands on the **second column** [b,d] — not on the rows. Every other vector follows from linearity.', 'There are two equivalent ways to compute Av. **Row view:** each output entry is a dot product of a row of A with v, so Av = [a·v[0] + b·v[1], c·v[0] + d·v[1]]. **Column view:** Av = v[0]·A[:,0] + v[1]·A[:,1], a **linear combination of the matrix columns** with the vector components as coefficients. Both give the same numbers; the column view explains the geometry, the row view is how you usually calculate by hand.', 'The **determinant** tells you how the transformation changes area. Its **absolute value** is the area scaling factor: |det| = 2 means every area doubles. Its **sign** tells you about orientation: a negative determinant means the transformation flips the plane over, like a mirror (î and ĵ swap their clockwise order). det = 0 means space is squashed onto a line or a point — the transformation is not invertible.'],
    callouts:[{type:'important',title:'Row View and Column View Agree',body:'A = [[1, 2], [3, 4]], v = [5, 6]\n\nRow view (row · v):\n  [1·5 + 2·6, 3·5 + 4·6] = [17, 39]\n\nColumn view (columns are [1,3] and [2,4]):\n  5·[1,3] + 6·[2,4] = [5,15] + [12,24] = [17, 39]\n\nColumn 1 = where î lands. Column 2 = where ĵ lands.'}],
    visualizations:[{id:'PythonNotebook',title:'Matrices as Transformations',
      props:{initialCells:[{id:1,cellTitle:'Stage 1 — Matrix-Vector Multiplication, Two Ways',prose:'A @ v applies the transformation to vector v. This cell computes it three ways: with @, with the row view (dot product of each row with v), and with the column view (v[0] times column 0 plus v[1] times column 1). It also shows where î and ĵ land: A @ [1,0] is column 0 and A @ [0,1] is column 1.',instructions:'Predict A @ v by hand with the row view before running. Run and check that all three agree. Then change A and v and confirm they still agree.',code:'import numpy as np\nA = np.array([[1.0, 2.0], [3.0, 4.0]])\nv = np.array([5.0, 6.0])\n\nprint("A @ v       =", A @ v)                           # [17. 39.]\nprint("row view    =", np.array([A[0] @ v, A[1] @ v]))  # rows dotted with v\nprint("column view =", v[0]*A[:,0] + v[1]*A[:,1])       # combination of columns\n\nprint("i-hat lands on", A @ np.array([1.0, 0.0]), "= column 0", A[:,0])\nprint("j-hat lands on", A @ np.array([0.0, 1.0]), "= column 1", A[:,1])',output:'',status:'idle'},
        {id:2,cellTitle:'Stage 2 — Visualizing Transformations',prose:'The matrix transforms the grid. The columns show where î and ĵ land.',instructions:'Run. Try the rotation matrix [[0,-1],[1,0]].',code:'from opencalc import Figure\nimport numpy as np\n\nA = np.array([[1.5, 0.5], [0.0, 1.5]])\nfig = Figure(square=True, xmin=-5, xmax=5, ymin=-5, ymax=5)\nfig.grid()\nfig.transformed_grid(A.tolist())\nfig.vector(A[:,0].tolist(), color="red", label="î→")\nfig.vector(A[:,1].tolist(), color="green", label="ĵ→")\nfig.show()',output:'',status:'idle'},
        {id:3,cellTitle:'Stage 3 — Matrix Multiplication as Composition',prose:'(A @ B) @ v applies B first, then A. Order usually matters: AB ≠ BA in general. Here we rotate by 90° and stretch only the x-direction by 2 (a non-uniform scale). Follow v = [1, 0]: rotate-then-stretch sends it to [0, 1] and then leaves it at [0, 1], because stretching x does nothing to a vector with x = 0. Stretch-then-rotate sends it to [2, 0] and then to [0, 2]. Some pairs do commute: scaling every direction by the same factor commutes with any rotation, because it does not care which way a vector points. That is a special case, not the rule.',instructions:'Predict both results for v = [1, 0] by hand before running. Run and confirm they differ. Then change stretch_x to the uniform scale [[2,0],[0,2]] and observe that the two orders now agree.',code:'import numpy as np\nrotate = np.array([[0,-1],[1,0]])       # 90° counter-clockwise\nstretch_x = np.array([[2,0],[0,1]])     # double x only (non-uniform)\nv = np.array([1, 0])\n\nprint("stretch after rotate:  (stretch_x @ rotate) =")\nprint(stretch_x @ rotate)\nprint("  applied to v:", (stretch_x @ rotate) @ v)   # [0 1]\n\nprint("rotate after stretch:  (rotate @ stretch_x) =")\nprint(rotate @ stretch_x)\nprint("  applied to v:", (rotate @ stretch_x) @ v)   # [0 2]\n\nprint("Same matrix?", np.array_equal(stretch_x @ rotate, rotate @ stretch_x))  # False',output:'',status:'idle'},
        {id:4,cellTitle:'Stage 4 — Determinant: Size and Sign',prose:'|det(A)| is the area scaling factor; the sign says whether orientation is kept (+) or flipped like a mirror (−). det = 0 means the transformation collapses the plane onto a line or point. Note that floating-point arithmetic may print a tiny number like 1e-16 instead of exactly 0 for a singular matrix.',instructions:'Predict each determinant before running (for [[a,b],[c,d]], det = ad − bc). Then build a reflection of your own, such as [[-1,0],[0,1]], and check its sign.',code:'import numpy as np\nA = np.array([[2.0, 1], [0, 3]])\nprint(f"det(A) = {np.linalg.det(A):.4f}")        # 6: areas ×6, orientation kept\n\nF = np.array([[0.0, 1], [1, 0]])                  # swaps x and y: a mirror\nprint(f"det(F) = {np.linalg.det(F):.4f}")        # -1: area kept, orientation flipped\n\nB = np.array([[1.0, 2], [2, 4]])                  # second column = 2 × first\nprint(f"det(B) = {np.linalg.det(B):.4f}")        # 0: collapses the plane onto a line',output:'',status:'idle'},
        {id:11,challengeType:'write',challengeNumber:1,challengeTitle:'Challenge 1 — Rotation Verification',difficulty:'medium',prompt:'The 45° rotation matrix is [[cos45,-sin45],[sin45,cos45]]. Apply it to [1,0] and verify the result equals [cos45, sin45]. Store the result in rotated.',instructions:'1. import math. 2. Build the rotation matrix. 3. Apply to [1,0]. 4. Verify.',code:'import numpy as np, math\nangle = math.pi / 4  # 45 degrees\nR = np.array([[math.cos(angle), -math.sin(angle)],\n              [math.sin(angle),  math.cos(angle)]])\nv = np.array([1.0, 0.0])\nrotated = ',output:'',status:'idle',testCode:'\nimport numpy as np,math\nexpected=np.array([math.cos(math.pi/4),math.sin(math.pi/4)])\nif not np.allclose(rotated,expected,atol=1e-6): raise ValueError(f"Expected {expected}, got {rotated}")\nres=f"SUCCESS: R @ [1,0] = [{rotated[0]:.4f}, {rotated[1]:.4f}] = [cos45°, sin45°]."\nres\n',hint:'rotated = R @ v'}]}
    }],
  },
  mentalModel:['Matrix columns (not rows) show where î and ĵ land: for [[a,b],[c,d]], î → [a,c] and ĵ → [b,d].', 'A @ v = v[0]*A[:,0] + v[1]*A[:,1] (column view) = rows of A dotted with v (row view).', 'A @ B: apply B first, then A. AB ≠ BA in general; commuting pairs (like uniform scaling with a rotation) are special cases.', '|det(A)|: area scaling factor. Negative det: orientation flipped. det=0: transformation collapses space (not invertible).', 'np.linalg.det(), np.linalg.solve(), @ for matrix multiply.'],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Matrix A = [[2,0],[0,3]] applied to vector [1,1] gives what?',
      options: [
        '[3,3] — the matrix scales the sum of components',
        '[2,3] — A @ [1,1] = [2×1 + 0×1, 0×1 + 3×1] = [2, 3]: the x-component scales by 2, y-component by 3',
        '[1,1] — the identity matrix leaves vectors unchanged',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Why does det(A) = 0 mean the transformation A cannot be inverted?',
      options: [
        'A determinant of 0 means the matrix has a zero row, so the inverse formula divides by zero',
        'det = 0 means the transformation collapses at least one dimension — multiple input points map to the same output (information is lost). You cannot recover the original input from the output because the mapping is not one-to-one',
        'The inverse of a matrix requires all diagonal entries to be nonzero; det=0 forces a diagonal entry to be 0',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Why does A @ B ≠ B @ A in general?',
      options: [
        'NumPy computes @ left-to-right for A@B but right-to-left for B@A',
        'A @ B means "apply B first then A"; B @ A means "apply A first then B." The order of transformations matters geometrically — rotating then reflecting is different from reflecting then rotating',
        'Matrix multiplication is commutative for square matrices, so A@B = B@A always',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'In machine learning, a neural network layer computes y = A @ x + b. What is A doing?',
      options: [
        'A is adding bias to each input component',
        'A is a linear transformation of the input vector x — it rotates, scales, and mixes the input features; b shifts the result. Together they implement a learnable affine transformation that maps x to a new feature representation y',
        'A is computing the activation function applied element-wise to x',
      ],
      correct: 1,
    },
  ],
}