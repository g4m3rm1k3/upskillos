// Part 6: reading papers. A method for decoding any equation, practised on real ones from famous
// papers, using the Symbol decoder's equation gallery.
export const PART6 = {
  id: 'part6', title: 'Part 6 · Reading papers', lessons: [
    {
      id: 'reading-papers', number: '6.1', title: 'How to read an equation in a paper',
      goal: 'Decode an unfamiliar equation with a five-step method: name the pieces, find the loss, check the shapes, say it in words, write it as code.',
      builds: ['attention'],
      blocks: [
        { md: `You can now read every symbol in this lab. Real papers still feel dense because they combine many pieces at once and rarely explain them. A method helps:

1. **Find the output.** What is being defined, minimised or computed? Look for $=$, $:=$, $\\arg\\min$, or "the loss is". Everything else serves it.
2. **Name every symbol.** Go through left to right and say each one aloud ("theta star is the arg min over theta of…"). Anything you can't name: look in the paper's notation section, or the 🔣 Symbol decoder.
3. **Find the familiar shapes.** Almost every ML equation is built from a handful of patterns: a **sum or expectation over examples** ($\\frac1n\\sum_i$, $\\mathbb E_{x\\sim\\mathcal D}$), a **loss** (squared error or a negative log-probability), a **model** ($f_\\theta$, $W\\mathbf x + \\mathbf b$, softmax), a **penalty** ($\\lambda\\|\\theta\\|^2$, a KL term), and an **update** ($\\theta \\leftarrow \\theta - \\eta\\nabla$).
4. **Check the shapes.** For vectors and matrices, write each one's size underneath: $W \\in \\mathbb R^{m\\times n}$, $\\mathbf x \\in \\mathbb R^n$, so $W\\mathbf x \\in \\mathbb R^m$. If the sizes don't fit, you have misread something.
5. **Say it in one sentence, then write it as code.** If you can turn it into a loop (Σ is a \`for\`, $\\mathbb E$ is an average over samples, $\\nabla$ is \`backward()\`), you understand it.

Try it on the general training objective below. Click each piece.` },
        { figure: 'EquationAnatomy', props: { ids: ['erm'] }, caption: 'Click any piece of the equation to see what it is and which lesson taught it.' },
        { md: `In one sentence: **find the parameters that make the average loss over the training examples, plus a penalty on large parameters, as small as possible.** As code: a loop over the examples adding up the loss of each prediction, plus \`lam * sum(t * t for t in theta)\`, minimised by gradient descent. Every model in this lab, from linear regression to a Transformer, is trained by an equation of exactly this shape; only $f_\\theta$ and $\\ell$ change.` },
        {
          choice: {
            prompt: 'A paper writes $\\mathcal L(\\theta) = \\mathbb E_{(x,y)\\sim\\mathcal D}\\left[-\\log p_\\theta(y \\mid x)\\right]$. Which reading is right?',
            options: [
              { text: 'The average, over examples drawn from the data, of minus the log-probability the model gives the correct label', why: 'Yes: an expectation (4.3) of a negative log-likelihood (4.11) of a conditional probability (4.5). With softmax for $p_\\theta$, it is exactly lesson 5.5\'s cross-entropy.' },
              { text: 'The probability that the model is correct', why: 'It is a loss to minimise, built from log-probabilities, not a probability itself.' },
              { text: 'The expected value of the parameters', why: 'The expectation is over data $(x, y)$, as the subscript says, not over θ.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: '$W \\in \\mathbb R^{512 \\times 768}$ and $\\mathbf x \\in \\mathbb R^{768}$. What is the shape of $W\\mathbf x$?',
            options: [
              { text: '$\\mathbb R^{512}$', why: 'Yes: rows of $W$ give outputs. $(512 \\times 768)(768) \\to 512$.' },
              { text: '$\\mathbb R^{768}$', why: 'The 768s are the inside dimension that must match; the result has as many entries as $W$ has rows.' },
              { text: 'It isn\'t defined', why: 'The inside dimensions match (768 and 768), so it is.' },
            ],
            answer: 0,
          },
        },
        { note: 'Output first; name every symbol; spot the patterns (average, loss, model, penalty, update); check shapes; say it in a sentence and as code.' },
      ],
    },

    {
      id: 'decode-practice', number: '6.2', title: 'Practice: equations from famous papers',
      goal: 'Decode backpropagation, Adam, attention, the KL divergence and the policy gradient as they appear in the papers that introduced them.',
      builds: ['reading-papers'],
      blocks: [
        { md: `Here are equations as their papers wrote them. Each is in the gallery below, broken into pieces. Before clicking, try the method of lesson 6.1 on your own: what is the output, what are the pieces, what is the sentence?

One of them is new: the **policy gradient** from reinforcement learning, the method behind CartPole Lab's REINFORCE and, in refined forms, the training of language models from human feedback. Every symbol in it is one you know: an expectation over episodes $\\tau$ played by the policy, the gradient of a log-probability, and a return $G_t$ (a sum of rewards).` },
        { figure: 'EquationAnatomy', props: { ids: ['backprop', 'adam', 'attention', 'kl', 'pg', 'bayes', 'gaussian'] }, caption: 'Pick an equation, then click its pieces.' },
        {
          choice: {
            prompt: 'In the policy gradient $\\mathbb E\\left[\\sum_t \\nabla_\\theta\\log\\pi_\\theta(a_t\\mid s_t)\\,G_t\\right]$, what does a large positive $G_t$ do?',
            options: [
              { text: 'Pushes θ strongly toward making action $a_t$ more likely in state $s_t$', why: 'Yes. $\\nabla\\log\\pi$ points toward "more likely"; a big return scales that push up. Good outcomes reinforce the actions that led to them.' },
              { text: 'Makes action $a_t$ less likely', why: 'That happens when $G_t$ is negative (or below a baseline).' },
              { text: 'Nothing: $G_t$ is a constant', why: 'It weights each action\'s gradient; it is the whole learning signal.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'In backpropagation, $\\boldsymbol\\delta^{(l)} = (W^{(l+1)\\top}\\boldsymbol\\delta^{(l+1)}) \\odot \\sigma\'(\\mathbf z^{(l)})$. Why the **transpose**?',
            options: [
              { text: 'Going forward, $W$ mixed layer $l$ into layer $l+1$; going back, each neuron collects the errors of all the neurons it fed, which is multiplication by $W^\\top$', why: 'Yes. Entry $k$ of $W^\\top\\boldsymbol\\delta$ is $\\sum_j W_{jk}\\delta_j$: neuron $k$\'s share of every downstream error, weighted by its connection.' },
              { text: 'To make the shapes square', why: 'The shapes do need to fit, and that is a clue, but the reason is which errors each neuron is responsible for.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Adam divides by $\\sqrt{\\hat{\\mathbf v}_t} + \\epsilon$. What would go wrong without the ε?',
            options: [
              { text: 'A parameter whose gradients have all been zero would divide by zero', why: 'Yes. $\\epsilon \\approx 10^{-8}$ keeps the division defined and the step finite.' },
              { text: 'The step would be too small', why: 'ε is tiny; it barely changes the step when gradients are normal-sized.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'A VAE paper\'s loss contains $D_{KL}\\big(q(z\\mid x)\\,\\|\\,\\mathcal N(0, I)\\big)$. What is this term asking for?',
            options: [
              { text: 'That the encoder\'s distribution over the hidden code $z$ stays close to a standard bell curve', why: 'Yes. KL measures how far $q$ is from the target $\\mathcal N(0, I)$ (mean 0, identity covariance); as a penalty it keeps the codes tidy and well spread. You can read a paper\'s new term with old pieces.' },
              { text: 'That the reconstruction is accurate', why: 'That is the other term of the VAE loss. This one is a penalty on the code\'s distribution.' },
            ],
            answer: 0,
          },
        },
        { md: `**Where to go from here.** The other labs use all of this:

- **Neural Net Lab** builds layers, losses, backpropagation and Adam by hand and checks them against PyTorch.
- **QMaze Lab** and **CartPole Lab** use expectations, the Bellman equation, policy gradients and DQN.
- **KartLab** and **Tabletop RL Lab** use linear function approximation, TD learning and paired statistics.

Whenever a symbol there looks foreign, the 🔣 Symbol decoder points back to the lesson that built it.` },
        { note: 'Every equation in ML is assembled from a small set of pieces: sums and expectations, logs and exponentials, dot products and matrices, derivatives and gradients, probabilities. You now know all of them.' },
      ],
    },
  ],
}
