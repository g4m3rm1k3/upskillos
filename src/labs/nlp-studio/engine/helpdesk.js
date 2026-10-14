// Part 8: python/helpdesk.py in JavaScript (parity8.test.js checks). A help desk for your own app:
// questions and answers as plain text, matched by meaning, refused when nothing is close, tested.

// Python's str.splitlines() splits on more than \n.
const lines = text => text.split(/\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]/).filter((l, i, all) => i < all.length - 1 || l !== '')

export function parseFaq(text) {
  const entries = []
  let questions = []
  for (const raw of lines(text)) {
    const line = raw.trim()
    if (line.toLowerCase().startsWith('q:')) {
      if (line.slice(2).trim()) questions.push(line.slice(2).trim())
    } else if (line.toLowerCase().startsWith('a:')) {
      if (questions.length) { entries.push({ questions, answer: line.slice(2).trim() }); questions = [] }
    } else if (line && entries.length && !questions.length) entries.at(-1).answer += ' ' + line
  }
  return entries
}

export const examples = entries => entries.flatMap((e, k) => e.questions.map(q => [q, k]))

export function bestEntry(questionVector, exampleVectors, exampleEntries) {
  let best = -1, score = -2
  exampleVectors.forEach((v, i) => {
    const s = questionVector.reduce((t, a, d) => t + a * v[d], 0)
    if (s > score) { best = exampleEntries[i]; score = s }
  })
  return [best, score]
}

export const route = (best, score, threshold) => (score >= threshold ? best : -1)

export function parseTests(text) {
  const tests = []
  for (const line of lines(text)) {
    const at = line.lastIndexOf('=>')
    if (at < 0) continue
    const question = line.slice(0, at).trim(), label = line.slice(at + 2).trim().toLowerCase()
    if (question && (label === 'none' || /^[0-9]+$/.test(label))) tests.push([question, label === 'none' ? -1 : Number(label) - 1])
  }
  return tests
}

export function outcomes(results, threshold) {
  const counts = { right: 0, wrong: 0, refused: 0, missed: 0 }
  for (const [score, best, right] of results) {
    const answered = route(best, score, threshold)
    if (answered === -1) counts[right === -1 ? 'refused' : 'missed'] += 1
    else counts[answered === right ? 'right' : 'wrong'] += 1
  }
  return counts
}

export function chooseThreshold(results, thresholds, wrongCost = 3) {
  let best = null
  for (const t of thresholds) {
    const c = outcomes(results, t), cost = wrongCost * c.wrong + c.missed
    if (best === null || cost < best[1]) best = [t, cost]
  }
  return best
}

// The help desk this lab ships with: questions about NLP Studio itself, all true of the lab.
export const FAQ = `Q: Where does my code run?
Q: Is the Python in the lessons real?
A: In real Python inside this page (Pyodide), so your code is never sent to a server.

Q: How do I step through a program one line at a time?
Q: What is the Real Python tab?
A: In the desktop app, press a 🐍 button in a lesson: the Real Python tab runs the lab's own program one line at a time and shows its variables.

Q: How do I save the model I trained?
Q: Can I download my tiny GPT?
A: Press Download .safetensors under the trainer (lesson 5.6, or 6.4 for Bot 3). Upload loads it back later.

Q: Does the lab download anything big?
Q: How large are the pre-trained models?
A: Only when you press a Download button: GPT-2's tokenizer is 1.4 MB, MiniLM 23 MB and SmolLM2 137 MB. Your browser keeps them afterwards.

Q: What does Show me do?
Q: Can I see the answer to an exercise?
A: Show me reveals the lab's own version of the function. Try yours first: the checks show which calls give the wrong result.

Q: My code never finishes
Q: Why did Python stop after a minute?
A: Your code is stopped after 60 seconds. Look for a loop whose variable never changes.

Q: Do I need a GPU?
Q: Will training freeze my computer?
A: No. The page trains on the CPU in small slices, and the desktop PyTorch lessons use a single thread.`

// Questions the help desk never saw, with the entry that should answer them (or none).
export const TESTS = `is my python code sent to a server? => 1
does the code really run as python? => 1
how can I run the code step by step => 2
where can I watch the variables change => 2
how do I keep the gpt I trained => 3
can I export my model to a file => 3
how many megabytes will it download => 4
where can I see the solution => 5
my loop seems to run forever => 6
do I need a graphics card => 7
what's the weather tomorrow => none
can you order me a pizza => none
how do I reset my password => none
can I use this on my phone => none
who wrote this lab => none`

export const THRESHOLDS = Array.from({ length: 19 }, (_, i) => Math.round(i * 5) / 100)
