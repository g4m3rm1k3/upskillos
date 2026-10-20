// Optional track: "Circuits". Kirchhoff's current law at every node gives a conductance matrix; the
// incidence matrix writes it as G = AᵀCA from a list of branches; capacitors add time stepping; the
// capstone fixes a node with a voltage source and checks a sensor bridge's power budget.
// Each lesson carries its own why, notation, quiz, uses and angles, as in engineering.js.
const t = String.raw
const CIRC = 'Circuits'

export const circuitsLessons = [
  {
    id: 'laml-circ-nodal', module: CIRC, title: 'Kirchhoff\'s laws become a matrix', minutes: 25, level: 'Intermediate',
    why: { title: 'One equation per junction', story: 'In 1845 Gustav Kirchhoff, still a student, wrote down two rules for electric circuits: the current flowing into a junction equals the current flowing out, and the voltage drops around any loop add up to zero. Together with Ohm\'s law for each resistor, these rules turn any circuit of resistors into one linear system. Every circuit simulator builds and solves that system, from SPICE, written at Berkeley in the early 1970s, to the tools that check chips with billions of transistors. This lesson builds the smallest one by hand.' },
    objective: 'Write the current balance at each node of a resistor circuit, collect it into a conductance matrix G, and solve G*v = I for the node voltages and the current in every resistor.',
    prose: [
      'A resistor of R ohms with a voltage difference V across it carries a current of V/R amperes (Ohm\'s law). It is easier to use the **conductance** g = 1/R, measured in siemens: current = g × voltage difference. A 100 Ω resistor has g = 0.01 S, so 2 V across it drives 0.02 A, or 20 mA.',
      'Pick one point of the circuit as **ground** and call its voltage 0. Every other junction, or **node**, gets an unknown voltage. In our circuit a current source pushes a current I into node 1. Resistor R1 joins node 1 to ground, R2 joins node 1 to node 2, and R3 joins node 2 to ground.',
      'Kirchhoff\'s current law: the current leaving a node equals the current pushed into it. At node 1, current leaves through R1, g1·v1, and through R2, g2·(v1 − v2), so (g1 + g2)·v1 − g2·v2 = I. At node 2 nothing is pushed in, so −g2·v1 + (g2 + g3)·v2 = 0. Together: G * v = I with G = [g1+g2, −g2; −g2, g2+g3].',
      'If you took the Engineering track, this is the stiffness matrix pattern again. Each diagonal entry adds up the conductances touching that node, and each off-diagonal entry is minus the conductance joining two nodes. Ground plays the part of the wall. G is symmetric, and two nodes with no resistor between them get a 0.',
      'Solve v = G \\ I. Then each resistor\'s current is its conductance times the voltage across it, and the power it turns into heat is current times voltage. The currents flowing into ground add up to I: whatever is pushed in must come out.',
    ],
    procedure: ['Choose ground and number the other nodes.', 'At each node, add up the currents leaving through its resistors and set the total equal to the current pushed in. That is one row of G*v = I.', 'Solve v = G\\I. Each resistor\'s current is g times the voltage across it.'],
    prediction: { question: 'The source current I is doubled. What happens to the node voltages?', answer: 'They all double. Every equation is linear, so G*(2v) = 2I. Doubling the cause doubles every effect, which is why circuits of resistors are called linear circuits.' },
    demo: {
      code: t`R = [100 200 200];       % resistances (ohms)
g = 1./R;                % conductances (siemens)
G = [g(1)+g(2) -g(2); -g(2) g(2)+g(3)];
I = [0.03; 0];           % 30 mA pushed into node 1
v = G\I                  % node voltages (V)
current = [v(1)*g(1) (v(1)-v(2))*g(2) v(2)*g(3)]`,
      draw: t`bar(1:3, 1000*current)
title('Current in each resistor')
xlabel('Resistor'); ylabel('Current (mA)'); grid on`,
      explain: [{ code: 'g = 1./R;', meaning: 'Conductance is one over resistance, entry by entry.' }, { code: 'G = [g(1)+g(2) -g(2); -g(2) g(2)+g(3)];', meaning: 'Diagonal: conductances touching each node. Off-diagonal: minus the conductance between them.' }, { code: 'v = G\\I', meaning: 'Node 1 sits at 2.4 V and node 2 at 1.2 V.' }, { code: 'current = [...]', meaning: '24 mA through R1, and 6 mA through R2 and then R3. The 24 + 6 = 30 mA reaching ground is the 30 mA pushed in.' }],
    },
    challenge: {
      prompt: 'A ladder of five resistors: R(1) joins node 1 to ground, R(2) joins nodes 1 and 2, R(3) joins node 2 to ground, R(4) joins nodes 2 and 3, and R(5) joins node 3 to ground. The currents pushed into the nodes are in I. Store the 3 × 3 conductance matrix G, the node voltages v = G\\I, and power = dot(I, v), the power the sources deliver.',
      setup: 'R = [100 100 100 100 100];\nI = [0.05; 0; 0];',
      starter: 'g = 1./R;\nG = [g(1)+g(2) 0 0; 0 g(2)+g(3)+g(4) 0; 0 0 g(4)+g(5)];   % the resistors between nodes are missing\nv = G\\I;\npower = dot(I, v);',
      solution: 'g = 1./R;\nG = [g(1)+g(2) -g(2) 0; -g(2) g(2)+g(3)+g(4) -g(4); 0 -g(4) g(4)+g(5)];\nv = G\\I;\npower = dot(I, v);',
      checks: [{ name: 'G', expected: [[0.02, -0.01, 0], [-0.01, 0.03, -0.01], [0, -0.01, 0.02]], tolerance: 1e-9, message: 'Each diagonal entry adds the conductances touching that node.' }, { name: 'v', expected: [3.125, 1.25, 0.625], tolerance: 1e-9, message: 'Node 1, where the current enters, sits highest.' }, { name: 'power', expected: 0.15625, tolerance: 1e-9, message: 'Source current times the voltage it pushes against.' }],
      cases: [{ setup: 'R = [100 100 100 100 100];\nI = [0; 0; 0.05];', checks: [{ name: 'v', expected: [0.625, 1.25, 3.125], tolerance: 1e-9, message: 'The ladder is symmetric, so feeding the other end mirrors the voltages.' }, { name: 'power', expected: 0.15625, tolerance: 1e-9, message: 'The same power, by symmetry.' }] }],
      hints: ['Start with g = 1./R. Node 2 touches R(2), R(3) and R(4), so G(2,2) = g(2) + g(3) + g(4).', 'Nodes 1 and 3 are not joined, so G(1,3) = 0.', 'G = [g(1)+g(2) -g(2) 0; -g(2) g(2)+g(3)+g(4) -g(4); 0 -g(4) g(4)+g(5)];'],
      transfer: 'Double every resistance. Predict what happens to the voltages and to the power, then run the code to check. Why does the power change although the source current does not?',
    },
    notation: [
      { tex: t`G\mathbf v = \mathbf I, \qquad G = \begin{bmatrix} g_1 + g_2 & -g_2 \\ -g_2 & g_2 + g_3 \end{bmatrix}, \qquad g = \frac{1}{R}`, say: 'Conductances times node voltages equal the currents pushed in.' },
      { tex: t`\text{current from } a \text{ to } b = g\,(v_a - v_b), \qquad \text{power} = \text{current} \times (v_a - v_b)`, say: 'Ohm\'s law and the heat a resistor gives off.' },
    ],
    quiz: [
      { q: 'A node touches a 100 Ω and a 50 Ω resistor. What is its diagonal entry of G?', options: ['0.03 S', '150 S', '0.015 S', '−0.03 S'], answer: 0, why: '0.01 + 0.02 = 0.03. Conductances add; resistances do not.' },
      { q: 'Why must one node be chosen as ground?', options: ['Adding the same voltage to every node changes no current, so one voltage must be fixed', 'Ground carries no current', 'To make G larger', 'Ohm\'s law only works at ground'], answer: 0, why: 'Only differences drive current. Fixing one node at 0 removes the freedom, as the walls do for springs.' },
    ],
    uses: [
      { who: 'ee', title: 'Circuit simulators', story: 'SPICE and its descendants write exactly these equations, one row per node, for circuits with millions of nodes, and solve them thousands of times as a signal changes.' },
      { who: 'general', title: 'House wiring', story: 'Lights and sockets on a circuit each draw their own current, and the current law says the cable back to the fuse box carries their sum. Electricians size cables and fuses from that addition.' },
      { who: 'cs', title: 'Power grids on a chip', story: 'The metal mesh that carries power across a processor is a grid of tiny resistors. Designers solve G v = I with millions of nodes to check that no corner of the chip gets too little voltage.' },
      { who: 'physics', title: 'Conservation of charge', story: 'Kirchhoff\'s current law is conservation of charge: charge cannot pile up at a junction, so whatever flows in must flow out.' },
      { who: 'math', title: 'Graph Laplacians', story: 'Before a node is grounded, with every conductance 1, this matrix is the Laplacian of the circuit\'s graph. Its eigenvalues measure how well connected a network is.' },
    ],
    angles: [
      { title: 'Columns as experiments', body: 'Column $j$ of $G$ lists the currents you would have to push into every node to raise node $j$ to 1 V while holding all the others at 0 V. Raising node 1 drives $g_1 + g_2$ out of it, and node 2 must be held down by pulling $g_2$ out of it: the $-g_2$.' },
      { title: 'Power is always positive', body: 'The heat given off is $\\sum g\\,(\\text{voltage across})^2 = \\mathbf v^TG\\mathbf v$, which is positive whenever some voltage is not zero. So the grounded $G$ is positive definite, and $G\\mathbf v = \\mathbf I$ always has exactly one solution.' },
    ],
  },
  {
    id: 'laml-circ-incidence', module: CIRC, title: 'The incidence matrix: G = AᵀCA', minutes: 30, level: 'Advanced',
    why: { title: 'Let the computer write the equations', story: 'Writing a current balance by hand works for two nodes; a chip has billions. Circuit programs such as SPICE never ask anyone to write equations. They read a list of components, each with the two nodes it joins, and build the matrix themselves. Behind that bookkeeping sits one matrix, the incidence matrix, which records which branch touches which node. The mathematician Gilbert Strang made the same three steps (A, then C, then Aᵀ) the backbone of his teaching of applied mathematics, because they turn up in structures, networks and least squares alike.' },
    objective: 'Build the incidence matrix of a circuit from its list of branches, form G = AᵀCA, ground a node, and recover every branch current.',
    prose: [
      'List the circuit as **branches**: each resistor runs from a start node to an end node. Which way you point it is only a sign convention. The **incidence matrix** A has one row per branch and one column per node. Row b has +1 in the column of the branch\'s start node, −1 in the column of its end node, and zeros elsewhere.',
      'Three steps take voltages to currents and back. First, e = A·v gives each branch\'s **voltage drop**: start voltage minus end voltage. Second, Ohm\'s law on every branch at once: y = C·e, where C is the diagonal matrix of conductances. Third, Aᵀ·y adds up, at each node, the current leaving along branches that start there minus the current arriving along branches that end there. Kirchhoff\'s current law sets that equal to the source current f.',
      'Chain the steps: Aᵀ·C·A·v = f. So G = AᵀCA, built with two matrix products from a list of branches. On the first lesson\'s circuit it gives the same G, and nobody had to write a current balance.',
      'Built with every node, ground included, this G is singular. Raising every voltage by 1 V changes no drop, because A·ones = 0. Grounding a node fixes its voltage at 0 and removes its row and column, exactly as walls were removed from a stiffness matrix.',
      'Once v is known, put ground\'s 0 back. Then y = C·A·v gives every branch current with a sign: positive means the current flows in the direction you chose for that branch, negative means it flows the other way.',
    ],
    procedure: ['List each branch as a start node and an end node, with ground included as a node.', 'Fill A with +1 at the start node and −1 at the end node of each branch, and set C = diag(1./R).', 'Form G = transpose(A)*C*A, keep the rows and columns that are not ground, solve, and recover the branch currents with C*A*v.'],
    prediction: { question: 'What is A*ones(n,1), where n is the number of nodes?', answer: 'The zero vector. Each row has one +1 and one −1, so raising every node by the same voltage gives no drop on any branch. That is why the full G is singular until a node is grounded.' },
    demo: {
      code: t`branches = [1 3; 1 2; 2 3];   % start and end node of each resistor; node 3 is ground
R = [100 200 200];
A = zeros(3, 3);
for b = 1:3
  n1 = branches(b,1);
  n2 = branches(b,2);
  A(b, n1) = 1;
  A(b, n2) = -1;
end
C = diag(1./R);
Gfull = transpose(A)*C*A
keep = [1 2];                  % ground removed
G = Gfull(keep, keep)
f = [0.03; 0];
v = G\f
vall = zeros(3, 1);
vall(keep) = v;
y = C*A*vall                   % branch currents (A)`,
      draw: t`bar(1:3, 1000*y)
title('Branch currents from C*A*v')
xlabel('Branch'); ylabel('Current (mA)'); grid on`,
      explain: [{ code: 'A(b, n1) = 1;', meaning: 'Each row marks where its branch starts (+1) and ends (−1).' }, { code: 'Gfull = transpose(A)*C*A', meaning: 'The 3 × 3 conductance matrix with ground included. Each of its rows adds up to zero.' }, { code: 'G = Gfull(keep, keep)', meaning: 'Ground removed: the same G as in the first lesson.' }, { code: 'y = C*A*vall', meaning: '24, 6 and 6 mA: the currents found before, now from three matrix products.' }],
    },
    derive: {
      claim: t`Show that Kirchhoff's current law for a resistor circuit reads $A^TCA\,\mathbf v = \mathbf f$.`,
      given: t`Row $b$ of $A$ has $+1$ at branch $b$'s start node and $-1$ at its end node. $C$ is the diagonal matrix of conductances, and $f_n$ is the current pushed into node $n$.`,
      steps: [
        { ask: t`What is entry $b$ of $A\mathbf v$?`, options: [t`$v_{\text{start}} - v_{\text{end}}$, the voltage drop along branch $b$`, t`$v_{\text{start}} + v_{\text{end}}$`, t`The current in branch $b$`], answer: 0, why: t`The row picks out $+v_{\text{start}}$ and $-v_{\text{end}}$ and ignores every other node.` },
        { ask: t`Ohm's law gives each branch current as its conductance times its drop. How is that written for all branches at once?`, options: [t`$\mathbf y = C\,(A\mathbf v)$`, t`$\mathbf y = A\,C\,\mathbf v$`, t`$\mathbf y = C + A\mathbf v$`], answer: 0, why: t`Multiplying by a diagonal matrix scales entry $b$ by $g_b$.` },
        { ask: t`Column $n$ of $A$ has $+1$ for branches starting at node $n$ and $-1$ for branches ending there. What is entry $n$ of $A^T\mathbf y$?`, options: ['The current leaving node n minus the current arriving there', 'The voltage at node n', 'The total current in the whole circuit'], answer: 0, why: t`Entry $n$ of $A^T\mathbf y$ is column $n$ of $A$ dotted with $\mathbf y$: plus the branches leaving, minus the ones arriving.` },
        { ask: 'Kirchhoff says the net current leaving each node equals the current pushed in. Put the three steps together.', options: [t`$A^TCA\,\mathbf v = \mathbf f$`, t`$CA\,\mathbf v = \mathbf f$`, t`$A^TA\,\mathbf v = C\mathbf f$`], answer: 0, why: t`$A^T\mathbf y = \mathbf f$ with $\mathbf y = CA\mathbf v$.` },
      ],
      conclusion: t`So $G = A^TCA$. The same chain, from unknowns to differences, then a material law, then a balance, gives the stiffness matrix of a truss and, with $C = I$, the normal equations $A^TA\mathbf x = A^T\mathbf b$ of least squares.`,
    },
    challenge: {
      prompt: 'Nodes 1, 2 and 3 are joined to each other and to ground (node 4) by the five resistors listed in branches (start node, end node), with resistances R. The currents pushed into nodes 1 to 3 are in f. Store the 5 × 4 incidence matrix A, the grounded 3 × 3 conductance matrix G, and the node voltages v = G\\f.',
      setup: 'branches = [1 2; 1 3; 2 3; 2 4; 3 4];\nR = [100 100 100 100 100];\nf = [0.06; 0.03; 0];',
      starter: t`A = zeros(5, 4);
for b = 1:5
  n1 = branches(b,1);
  A(b, n1) = 1;
end
C = diag(1./R);
Gfull = transpose(A)*C*A;
G = Gfull(1:3, 1:3);
v = G\f;`,
      solution: t`A = zeros(5, 4);
for b = 1:5
  n1 = branches(b,1);
  n2 = branches(b,2);
  A(b, n1) = 1;
  A(b, n2) = -1;
end
C = diag(1./R);
Gfull = transpose(A)*C*A;
G = Gfull(1:3, 1:3);
v = G\f;`,
      checks: [{ name: 'A', expected: [[1, -1, 0, 0], [1, 0, -1, 0], [0, 1, -1, 0], [0, 1, 0, -1], [0, 0, 1, -1]], tolerance: 1e-9, message: 'Each row has +1 at its start node and −1 at its end node.' }, { name: 'G', expected: [[0.02, -0.01, -0.01], [-0.01, 0.03, -0.01], [-0.01, -0.01, 0.03]], tolerance: 1e-9, message: 'transpose(A)*C*A with the ground row and column removed.' }, { name: 'v', expected: [7.5, 4.875, 4.125], tolerance: 1e-9, message: 'Node 1, fed hardest, sits highest.' }],
      cases: [{ setup: 'branches = [1 2; 1 3; 2 3; 2 4; 3 4];\nR = [100 100 100 100 100];\nf = [0.06; 0; 0];', checks: [{ name: 'v', expected: [6, 3, 3], tolerance: 1e-9, message: 'Nodes 2 and 3 are placed alike, so they sit at the same voltage.' }] }],
      hints: ['Each row of A has exactly two nonzero entries; the starter forgets the −1.', 'In the loop: n2 = branches(b,2); A(b, n2) = -1;', 'Then Gfull = transpose(A)*C*A; G = Gfull(1:3, 1:3); v = G\\f;'],
      transfer: 'Compute the branch currents y = C*A*[v; 0]. Add up the currents in the two branches that end at ground. What must the total be, and why? Which branch carries no current in the second data set, and why?',
    },
    notation: [
      { tex: t`\mathbf e = A\mathbf v, \qquad \mathbf y = C\mathbf e, \qquad A^T\mathbf y = \mathbf f \quad\Rightarrow\quad A^TCA\,\mathbf v = \mathbf f`, say: 'Drops, Ohm\'s law, current balance.' },
      { tex: t`\text{branch from node 1 to node 3:} \quad \begin{bmatrix} 1 & 0 & -1 \end{bmatrix}`, say: 'One row of the incidence matrix.' },
    ],
    quiz: [
      { q: 'A branch runs from node 2 to node 5. Which entries of its row in A are nonzero?', options: ['+1 in column 2 and −1 in column 5', '+1 in columns 2 and 5', '1 in column 2 only', 'Every entry of the row'], answer: 0, why: 'The row marks the start with +1 and the end with −1, so A·v gives the drop v₂ − v₅.' },
      { q: 'What does a negative entry of y = C*A*v mean?', options: ['The current flows against the direction chosen for that branch', 'The resistor is broken', 'The resistance is negative', 'The branch is grounded'], answer: 0, why: 'Branch directions are a convention. The sign of the answer says which way the current really flows.' },
    ],
    uses: [
      { who: 'ee', title: 'Netlists', story: 'Every circuit design tool stores a circuit as a netlist: a list of components and the nodes each one joins. The incidence matrix is that list written as a matrix.' },
      { who: 'cs', title: 'Graphs in code', story: 'Graph libraries store networks as incidence or adjacency matrices. AᵀA for an incidence matrix is the graph Laplacian, used for clustering, ranking and drawing graphs.' },
      { who: 'mech', title: 'Trusses', story: 'For a truss, A turns joint movements into bar stretches, C holds the bar stiffnesses, and Aᵀ turns bar forces back into joint forces. The stiffness matrix is AᵀCA.' },
      { who: 'math', title: 'The fundamental framework', story: 'Gilbert Strang\'s textbooks organise applied mathematics around AᵀCA: least squares is AᵀA with C = I, and many differential equations are its continuous version.' },
      { who: 'general', title: 'Water and gas networks', story: 'City water and gas mains are solved the same way, with pressure in place of voltage and flow in place of current. Every junction must balance what flows in and out.' },
    ],
    angles: [
      { title: 'Why the same matrix keeps appearing', body: 'Least squares solves $A^TA\\mathbf x = A^T\\mathbf b$; springs solve $A^TCA\\mathbf u = \\mathbf f$; circuits solve $A^TCA\\mathbf v = \\mathbf f$. Each has a step from unknowns to differences ($A$), a material law ($C$) and a balance ($A^T$). Spotting the pattern lets one solver serve all of them.' },
      { title: 'The voltage law comes free', body: 'Kirchhoff\'s voltage law says the drops around a loop add up to zero. Going round a loop, each node is entered once and left once, so the signed rows of $A$ for the loop add up to zero, and so do the drops $A\\mathbf v$. Giving voltages to nodes makes the voltage law hold automatically.' },
    ],
  },
  {
    id: 'laml-circ-transient', module: CIRC, title: 'Capacitors: stepping through time', minutes: 30, level: 'Advanced',
    why: { title: 'Circuits that take their time', story: 'A camera flash charges for a second or two, then empties in a thousandth of a second. A phone charger smooths its output with capacitors. Every wire on a chip is a tiny capacitor, and charging it is what limits how fast the chip can run. Capacitors store charge, so voltages do not jump to their answer but climb towards it. Simulators follow that climb in small time steps, and every step is one linear solve with the same matrix.' },
    objective: 'Add capacitors to the node equations, step them through time with a backward difference, and watch the voltages settle at the answer of G*v = I.',
    prose: [
      'A capacitor of c farads takes a current c·(rate of change of its voltage). While its voltage climbs, current flows into it; once the voltage stops changing, it takes no current at all. A capacitor is a small bucket for charge.',
      'Put a capacitor from each node to ground. Kirchhoff\'s current law now has an extra term at every node: Cm·(dv/dt) + G·v = f, where Cm is the diagonal matrix of capacitances. It is a differential equation, but only a linear one.',
      'Step through time in steps of dt. Replace the rate of change by (v_new − v_old)/dt, and use the new voltages in G·v. Collecting the new voltages on the left: (Cm/dt + G)·v_new = (Cm/dt)·v_old + f. This is called the **backward Euler** step.',
      'The matrix M = Cm/dt + G never changes, only the right-hand side does. So each step is one solve with the same M. A simulator factors M once and reuses it thousands of times, which is why time stepping is fast.',
      'Where does it end? When the voltages stop changing, v_new = v_old and the capacitor terms cancel, leaving G·v = f: the answer of the first lesson. The capacitors decide only how fast the circuit gets there.',
    ],
    procedure: ['Build G as before and Cm, the diagonal matrix of capacitances.', 'Form M = Cm/dt + G once.', 'Each step: b = (Cm/dt)*v + f; v = M\\b. Repeat, and compare with the steady answer G\\f.'],
    prediction: { question: 'The capacitors start empty, so every voltage starts at 0. Where will the voltages be after a long time?', answer: 'At G\\f, the answer without capacitors. Once nothing changes, capacitors carry no current and drop out of the equations. Bigger capacitors only make the climb slower.' },
    demo: {
      code: t`R = [100 200 200];
g = 1./R;
G = [g(1)+g(2) -g(2); -g(2) g(2)+g(3)];
Cm = [0.001 0; 0 0.001];   % 1 mF at each node
f = [0.03; 0];
dt = 0.01;                 % time step (s)
M = Cm/dt + G;
v = [0; 0];
H = zeros(2, 101);
for k = 1:100
  b = (Cm/dt)*v + f;
  v = M\b;
  H(1, k+1) = v(1);
  H(2, k+1) = v(2);
end
disp(v)
steady = G\f`,
      draw: t`time = 0:dt:1;
plot(time, H(1,:))
hold on
plot(time, H(2,:))
title('Node voltages climb towards the steady answer')
xlabel('Time (s)'); ylabel('Voltage (V)'); legend('Node 1', 'Node 2'); grid on`,
      explain: [{ code: 'M = Cm/dt + G;', meaning: 'One matrix for every step: the capacitors add Cm/dt on the diagonal.' }, { code: 'b = (Cm/dt)*v + f;', meaning: 'The right-hand side remembers where the voltages were one step ago.' }, { code: 'v = M\\b;', meaning: 'After 10 steps (0.1 s) the nodes are at about 1.56 V and 0.35 V; after 100 steps, 2.398 V and 1.198 V.' }, { code: 'steady = G\\f', meaning: '2.4 V and 1.2 V: the first lesson\'s answer, where the climb is heading.' }],
    },
    challenge: {
      prompt: 'G is the conductance matrix of a two-node circuit, Cm its capacitances, f the currents pushed in and dt the time step. The voltages start at 0. Store the step matrix M, first, the voltages after one step, and v, the voltages after 300 steps.',
      setup: 'G = [0.02 -0.01; -0.01 0.02];\nCm = [0.002 0; 0 0.002];\nf = [0.03; 0];\ndt = 0.01;',
      starter: t`M = Cm/dt + G;
v = [0; 0];
for k = 1:300
  b = f;   % the capacitors' memory of the last step is missing
  v = M\b;
  if k == 1
    first = v;
  end
end`,
      solution: t`M = Cm/dt + G;
v = [0; 0];
for k = 1:300
  b = (Cm/dt)*v + f;
  v = M\b;
  if k == 1
    first = v;
  end
end`,
      checks: [{ name: 'M', expected: [[0.22, -0.01], [-0.01, 0.22]], tolerance: 1e-9, message: 'Cm/dt adds 0.2 to each diagonal entry of G.' }, { name: 'first', expected: [0.0066 / 0.0483, 0.0003 / 0.0483], tolerance: 1e-9, message: 'From zero, the first step solves M*v = f.' }, { name: 'v', expected: [2, 1], tolerance: 1e-5, message: 'After 3 seconds the voltages have settled at G\\f.' }],
      cases: [{ setup: 'G = [0.02 -0.01; -0.01 0.02];\nCm = [0.002 0; 0 0.002];\nf = [0; 0.03];\ndt = 0.01;', checks: [{ name: 'first', expected: [0.0003 / 0.0483, 0.0066 / 0.0483], tolerance: 1e-9, message: 'Feeding node 2 instead mirrors the answer.' }, { name: 'v', expected: [1, 2], tolerance: 1e-5, message: 'The mirrored steady state.' }] }],
      hints: ['The starter forgets the capacitors\' term on the right-hand side, so it never leaves its first answer.', 'Each step needs b = (Cm/dt)*v + f, using the voltages from the step before.', 'Keep M = Cm/dt + G outside the loop: it never changes.'],
      transfer: 'Change dt to 0.1 and to 0.001, with the number of steps chosen to cover 3 seconds each time. Does v still settle at the same answer? Which time step follows the climb more faithfully, and what does it cost?',
    },
    notation: [
      { tex: t`C_m\,\frac{d\mathbf v}{dt} + G\mathbf v = \mathbf f`, say: 'Kirchhoff\'s current law with a capacitor at every node.' },
      { tex: t`\Bigl(\frac{C_m}{\Delta t} + G\Bigr)\mathbf v_{\text{new}} = \frac{C_m}{\Delta t}\,\mathbf v_{\text{old}} + \mathbf f`, say: 'One backward Euler step: the same matrix every time.' },
    ],
    quiz: [
      { q: 'Why does a simulator factor M only once?', options: ['M = Cm/dt + G is the same at every step; only the right-hand side changes', 'Because M is diagonal', 'Because the voltages stop changing', 'Factoring is free'], answer: 0, why: 'With a fixed time step, nothing in M depends on time, so one factorisation serves every step.' },
      { q: 'What current flows into a capacitor whose voltage has stopped changing?', options: ['None', 'The largest current in the circuit', 'Its capacitance times its voltage', 'The source current'], answer: 0, why: 'A capacitor\'s current is c times the rate of change of its voltage, and that rate is zero.' },
    ],
    uses: [
      { who: 'ee', title: 'Transient analysis', story: 'SPICE\'s transient analysis is this loop: backward Euler or a close relative, a matrix factored once per time step size, and one solve per step. Engineers use it to see how a circuit starts up and switches.' },
      { who: 'cs', title: 'How fast a chip can run', story: 'Each wire on a chip is a resistance feeding a capacitance. Timing tools compute how long each wire takes to charge, and the slowest path sets the clock speed.' },
      { who: 'physics', title: 'Heat flow in time', story: 'The heated rod of the Engineering track, with heat capacity added, gives exactly this equation. Temperatures climb with the same backward steps until they settle.' },
      { who: 'general', title: 'Camera flash and defibrillator', story: 'Both charge a capacitor slowly through a resistance and empty it quickly. The charging curve is the climb in this lesson\'s plot.' },
      { who: 'math', title: 'Stiff equations', story: 'Backward Euler stays stable for any time step, while the forward version blows up when the step is too long. That is why implicit methods, which need a solve each step, are used for "stiff" equations.' },
    ],
    angles: [
      { title: 'Time constants are eigenvalues', body: 'The gap to the steady answer decays like a sum of $e^{-\\lambda t}$ terms, where the $\\lambda$ are the eigenvalues of $C_m^{-1}G$. In the demo they are about 18.1 and 6.9 per second, so the slow part has a time constant of $1/6.9 \\approx 0.145$ s. After 1 s, about seven time constants, the gap is roughly 0.1% of where it started.' },
      { title: 'Why step backwards?', body: 'The forward step $\\mathbf v_{\\text{new}} = \\mathbf v_{\\text{old}} + \\Delta t\\,C_m^{-1}(\\mathbf f - G\\mathbf v_{\\text{old}})$ needs no solve, but if $\\Delta t$ is larger than $2/\\lambda_{\\max}$ (here about 0.11 s) it overshoots more each step and blows up. The backward step multiplies the gap by $1/(1 + \\lambda\\Delta t)$, which is below 1 for every step size.' },
    ],
  },
  {
    id: 'laml-circ-capstone', module: CIRC, title: 'Capstone: a sensor bridge and its power budget', minutes: 35, level: 'Capstone',
    why: { title: 'Weighing with a bridge', story: 'A bathroom scale, a crane\'s load meter and the sensor that tells a car how hard you brake all use the same trick. A strain gauge, a zigzag of metal foil invented in 1938 by Edward Simmons and Arthur Ruge, is glued to a part that bends under load. As the part stretches, the foil\'s resistance rises by a tiny fraction of a percent. Measuring so small a change directly is hopeless, so the gauge sits in a bridge circuit, described by Samuel Christie in 1833 and made famous by Charles Wheatstone, that turns the change into a voltage starting from zero. Designing one means solving the circuit, reading the signal and checking that nothing overheats.' },
    objective: 'Solve a bridge circuit with a voltage source as a known node, read its output signal, find the supply current, check the power balance and compare each resistor\'s power with its rating.',
    prose: [
      'The bridge has four nodes. A supply holds node 1 at Vs volts and node 4 is ground. Two dividers hang between them: R1 above R2, meeting at node 2, and R3 above the sensor Rs, meeting at node 3. A meter of resistance Rm joins nodes 2 and 3 and reads out = v2 − v3. If R1/R2 = R3/Rs, nodes 2 and 3 sit at the same voltage and out = 0: the bridge is **balanced**. Any change in the sensor unbalances it.',
      'A voltage source fixes a node\'s voltage instead of pushing a known current. So split the nodes into unknown ones (2 and 3) and known ones (1 and 4). The unknown rows of G·v = f read G_uu·v_u + G_uk·v_k = 0, because no current is pushed into nodes 2 and 3. Move the known part across: G_uu·v_u = −G_uk·v_k. Known voltages become part of the right-hand side.',
      'The rows not used in the solve still say something. Once every voltage is known, row 1 of G·v is the current flowing out of node 1 into the circuit: the current the supply must deliver. Engineers call it the supply current, and it plays the part that the wall reactions played in the Engineering track.',
      'Check the energy. Each resistor turns drop × current into heat, so p = (C·e) .* e with drops e = A·v. All that heat comes from the supply, so sum(p) must equal Vs × supply current. A mismatch means a modelling mistake.',
      'Each resistor has a power rating: 0.25 W for a common small one, 0.0625 W for a tiny chip resistor. Utilisation = max(p)/rating must stay below 1. Lowering Vs cools everything, but the signal shrinks with Vs while the heat shrinks with Vs², so designers choose the largest supply the parts can take.',
    ],
    procedure: ['Assemble Gfull = transpose(A)*C*A from the list of branches.', 'Put the known voltages in vk, solve Gfull(unknown, unknown)*vu = −Gfull(unknown, known)*vk, and read out = vu(1) − vu(2).', 'Fill the full v, take the supply current from row 1 of Gfull*v, compute p = (C*e).*e, and check sum(p) = Vs*supply and max(p)/rating.'],
    prediction: { question: 'All four bridge resistors are equal and Vs = 10 V. What does the meter read, and what current flows through it?', answer: 'Zero for both. Each divider puts its middle node at 5 V, so the meter has no voltage across it and carries no current. That is the balanced bridge; a sensor change of a fraction of a percent then shows as a small voltage starting from zero.' },
    demo: {
      code: t`branches = [1 2; 2 4; 1 3; 3 4; 2 3];   % node 1: supply, node 4: ground
R = [1000 1000 1000 1100 10000];        % R1, R2, R3, sensor, meter
Vs = 5;
A = zeros(5, 4);
for b = 1:5
  n1 = branches(b,1);
  n2 = branches(b,2);
  A(b, n1) = 1;
  A(b, n2) = -1;
end
C = diag(1./R);
Gfull = transpose(A)*C*A;
known = [1 4];
unknown = [2 3];
vk = [Vs; 0];
rhs = -Gfull(unknown, known)*vk;
vu = Gfull(unknown, unknown)\rhs
out = vu(1) - vu(2)
v = zeros(4, 1);
v(known) = vk;
v(unknown) = vu;
flow = Gfull*v;
supply = flow(1)
e = A*v;
p = (C*e).*e;
check = sum(p) - Vs*supply
rating = 0.0625;
utilisation = max(p)/rating`,
      draw: t`bar(1:5, 1000*p)
title('Power turned into heat in each resistor')
xlabel('Resistor (R1, R2, R3, sensor, meter)'); ylabel('Power (mW)'); grid on`,
      explain: [{ code: 'rhs = -Gfull(unknown, known)*vk;', meaning: 'The supply\'s known voltage moves to the right-hand side.' }, { code: 'out = vu(1) - vu(2)', meaning: 'About −0.108 V. The sensor here is 10% above its partners, far more than a real gauge, so the numbers are easy to see.' }, { code: 'supply = flow(1)', meaning: 'About 4.88 mA: row 1 of Gfull*v, unused in the solve, gives the supply current.' }, { code: 'check = sum(p) - Vs*supply', meaning: 'Zero: the 24.4 mW of heat is exactly the power the supply delivers.' }, { code: 'utilisation = max(p)/rating', meaning: 'About 0.10: the hottest resistor, R2, uses a tenth of its rating.' }],
    },
    challenge: {
      prompt: 'A bridge: node 1 is held at Vs, node 4 is ground, and the rows of branches list the five resistors (R1, R2, R3, sensor, meter) with resistances R. Each may give off at most rating watts. Store the voltages vu of nodes 2 and 3, the meter reading out = vu(1) - vu(2), the supply current supply, the power p in each resistor, and utilisation = max(p)/rating.',
      setup: 'branches = [1 2; 2 4; 1 3; 3 4; 2 3];\nR = [100 100 100 150 200];\nVs = 10;\nrating = 0.25;',
      starter: t`A = zeros(5, 4);
for b = 1:5
  n1 = branches(b,1);
  n2 = branches(b,2);
  A(b, n1) = 1;
  A(b, n2) = -1;
end
C = diag(1./R);
Gfull = transpose(A)*C*A;
known = [1 4];
unknown = [2 3];
vk = [Vs; 0];
rhs = Gfull(unknown, known)*vk;   % check the sign
vu = Gfull(unknown, unknown)\rhs;
out = vu(1) - vu(2);
v = zeros(4, 1);
v(known) = vk;
v(unknown) = vu;
flow = Gfull*v;
supply = flow(1);
e = A*v;
p = (C*e).*e;
utilisation = max(p)/rating;`,
      solution: t`A = zeros(5, 4);
for b = 1:5
  n1 = branches(b,1);
  n2 = branches(b,2);
  A(b, n1) = 1;
  A(b, n2) = -1;
end
C = diag(1./R);
Gfull = transpose(A)*C*A;
known = [1 4];
unknown = [2 3];
vk = [Vs; 0];
rhs = -Gfull(unknown, known)*vk;
vu = Gfull(unknown, unknown)\rhs;
out = vu(1) - vu(2);
v = zeros(4, 1);
v(known) = vk;
v(unknown) = vu;
flow = Gfull*v;
supply = flow(1);
e = A*v;
p = (C*e).*e;
utilisation = max(p)/rating;`,
      checks: [{ name: 'vu', expected: [160 / 31, 180 / 31], tolerance: 1e-9, message: 'Solve Gfull(unknown, unknown)*vu = −Gfull(unknown, known)*vk.' }, { name: 'out', expected: -20 / 31, tolerance: 1e-9, message: 'The sensor is higher than its partner, so node 3 sits higher than node 2.' }, { name: 'supply', expected: 2.8 / 31, tolerance: 1e-9, message: 'Row 1 of Gfull*v.' }, { name: 'p', expected: [225 / 961, 256 / 961, 169 / 961, 216 / 961, 2 / 961], tolerance: 1e-9, message: 'Drop times current for each resistor; together they equal Vs*supply.' }, { name: 'utilisation', expected: 1024 / 961, tolerance: 1e-9, message: 'R2 gives off about 0.266 W against a 0.25 W rating.' }],
      cases: [{ setup: 'branches = [1 2; 2 4; 1 3; 3 4; 2 3];\nR = [100 100 100 150 200];\nVs = 12;\nrating = 0.25;', checks: [{ name: 'vu', expected: [192 / 31, 216 / 31], tolerance: 1e-9, message: 'Voltages grow in proportion to the supply.' }, { name: 'supply', expected: 3.36 / 31, tolerance: 1e-9, message: 'So does the supply current.' }, { name: 'utilisation', expected: 1.44 * 1024 / 961, tolerance: 1e-9, message: 'Power grows with the square of the supply: 1.2² = 1.44 times more.' }] }],
      hints: ['The starter has the sign of the right-hand side wrong: the known part moves across the equals sign.', 'rhs = -Gfull(unknown, known)*vk;', 'Everything after the solve then follows: the supply current is flow(1), and p = (C*e).*e with e = A*v.'],
      transfer: 'The design fails: R2 runs at about 107% of its rating. Find the largest supply voltage Vs that keeps utilisation at or below 1, and say how much smaller the signal out becomes. Then try instead doubling every resistance except the meter, at Vs = 10. Which fix keeps more signal?',
    },
    notation: [
      { tex: t`G_{uu}\,\mathbf v_u = -\,G_{uk}\,\mathbf v_k`, say: 'Known voltages move to the right-hand side.' },
      { tex: t`\mathbf p = (C\mathbf e) \odot \mathbf e, \quad \mathbf e = A\mathbf v, \qquad \textstyle\sum p = V_s\,I_{\text{supply}}`, say: 'Heat in each resistor, and the energy balance.' },
    ],
    quiz: [
      { q: 'A voltage source holds node 1 at 5 V. How does that enter the equations?', options: ['Node 1 becomes known, and its column of G times 5 moves to the right-hand side', 'As a current of 5 A pushed into node 1', 'It is ignored', 'As an extra resistor'], answer: 0, why: 'A known voltage is not an unknown; its effect on the other rows is −G_uk·v_k.' },
      { q: 'The supply voltage is halved. What happens to the meter reading and to the heat?', options: ['The reading halves and the heat falls to a quarter', 'Both halve', 'Both fall to a quarter', 'Nothing changes'], answer: 0, why: 'Voltages are linear in Vs, while power is a voltage times a current, so it scales with Vs².' },
    ],
    uses: [
      { who: 'mech', title: 'Load cells', story: 'Weighing scales, crane load meters and test machines glue four strain gauges to a metal block in a bridge. Bending the block unbalances the bridge in proportion to the load.' },
      { who: 'ee', title: 'Sensor front ends', story: 'Bridges read temperature sensors, pressure sensors and gas detectors. The designer trades signal size against self-heating, which itself changes a sensor\'s resistance.' },
      { who: 'general', title: 'Bathroom scales', story: 'Under each corner of a bathroom scale is a small metal beam with strain gauges in a bridge. The chip adds up the four bridge outputs to give your weight.' },
      { who: 'physics', title: 'Measuring by balance', story: 'Bridges are a balance, like a beam balance for resistance: comparing an unknown with known parts against zero is far more precise than measuring it on its own.' },
      { who: 'cs', title: 'Analogue meets digital', story: 'The bridge output feeds an analogue-to-digital converter. Knowing the largest out from the circuit model sets the converter\'s range and so how many of its bits carry information.' },
    ],
    angles: [
      { title: 'Known values, one recipe', body: 'Supports in a structure, ends of a heated rod held at a temperature, and nodes held by a voltage source are all the same idea: split the unknowns from the knowns, solve $G_{uu}\\mathbf v_u = \\mathbf f_u - G_{uk}\\mathbf v_k$, then read the reactions from the rows you did not use.' },
      { title: 'Why the bridge is so sensitive', body: 'Near balance, $\\text{out}$ is close to $\\tfrac{V_s}{4}\\cdot\\tfrac{\\Delta R}{R}$ for a small sensor change $\\Delta R$ and a meter that draws little current. A 0.1% change on a 10 V supply gives about 2.5 mV, starting from zero rather than buried in 5 V, so it can be amplified cleanly.' },
    ],
  },
]
