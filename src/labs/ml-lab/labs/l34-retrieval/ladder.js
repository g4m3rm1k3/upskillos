import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 34 practice ladder: idf, cosine, recall@k and MRR by hand; permissions before ranking; the metrics in code.

export const idfOf = (N, df) => Math.log(N / df)
export const recallAtKOf = (ranking, relevant, k) => relevant.filter(r => ranking.slice(0, k).includes(r)).length / relevant.length
export const rrOf = (ranking, relevant) => { const i = ranking.findIndex(d => relevant.includes(d)); return i < 0 ? 0 : 1 / (i + 1) }

const IDF_CASES = [[12, [1, 3, 6, 12]], [100, [1, 10, 50]], [5, [5]]].map(([N, df]) => ({ N, df, expected: df.map(d => idfOf(N, d)) }))
const RECALL_CASES = [
  { ranking: [3, 7, 1], relevant: [3, 5], k: 3 },
  { ranking: [3, 7, 1, 5], relevant: [3, 5], k: 3 },
  { ranking: [2, 4, 6, 8, 9], relevant: [9], k: 5 },
  { ranking: [1, 2], relevant: [1, 2], k: 1 },
].map(c => ({ ...c, expected: recallAtKOf(c.ranking, c.relevant, c.k) }))
export const RR_CASES = [
  { ranking: [4, 2, 9], relevant: [9] },
  { ranking: [4, 2, 9], relevant: [4] },
  { ranking: [4, 2, 9], relevant: [7] },
  { ranking: [1, 5, 3, 8], relevant: [8, 5] },
].map(c => ({ ...c, expected: rrOf(c.ranking, c.relevant) }))

export function diagnoseIdf(c, got) {
  if (Array.isArray(got.value) && got.value.every((v, i) => Math.abs(v + c.expected[i]) < 1e-9) && c.expected.some(v => v > 0)) return 'The ratio is upside down: idf = ln(N/df), so rare words get large positive weights.'
  if (Array.isArray(got.value) && got.value.every((v, i) => Math.abs(v - c.N / c.df[i]) < 1e-9)) return 'Take the natural logarithm of N/df: without it a word in 1 of 100 documents outweighs a common one a hundredfold.'
  return null
}
export function diagnoseRecall(c, got) {
  const prec = c.relevant.filter(r => c.ranking.slice(0, c.k).includes(r)).length / c.k
  if (Math.abs(got.value - prec) < 1e-12 && prec !== c.expected) return 'That divides by k — it is precision@k. Recall divides by the number of relevant documents.'
  return null
}
export function diagnoseRr(c, got) {
  const i = c.ranking.findIndex(d => c.relevant.includes(d))
  if (i >= 0 && Math.abs(got.value - 1 / i) < 1e-12 && i > 0) return 'Ranks start at 1: the first result has reciprocal rank 1/1, so use 1/(index + 1).'
  if (i < 0 && got.none !== true && Number.isNaN(got.value)) return 'When nothing relevant is retrieved the reciprocal rank is 0.'
  return null
}
export function evaluatePermissions(vars) {
  const miss = needVars(vars, ['filter_first', 'restricted_in_prompt', 'n_passages'])
  if (miss) return { passed: false, message: miss }
  if (Number(vars.restricted_in_prompt.value)) return { passed: false, message: 'The restricted failover runbook is in the prompt, so the model can paraphrase it into its answer — no later clean-up can undo that. Set `filter_first = 1` so permissions are applied before ranking, and run again.' }
  return { passed: true, message: `No restricted text reaches the prompt, and it still holds ${Number(vars.n_passages.value)} passages: filtering first lets the next-best allowed runbooks fill the slots.` }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['idf', 'mrr', 'tokens']
export function generate(template, seed) {
  const g = rng(seed * 233 + TEMPLATES.indexOf(template) * 4153 + 71)
  if (template === 'idf') {
    const N = g.pick([10, 12, 20, 50, 100]), df = g.pick([1, 2, 4, 5, 10].filter(d => d < N)), answer = idfOf(N, df)
    return { template, seed, N, df, answer, misconceptions: [{ answer: Math.log10(N / df), feedback: 'Use the natural logarithm (ln), as in the lesson.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
  }
  if (template === 'mrr') {
    const ranks = [g.pick([1, 2, 3]), g.pick([1, 2, 4, 5]), g.pick([0, 1, 3, 10])], answer = ranks.reduce((s, x) => s + (x ? 1 / x : 0), 0) / 3
    return { template, seed, ranks, answer, misconceptions: [{ answer: ranks.filter(Boolean).reduce((s, x) => s + 1 / x, 0) / Math.max(1, ranks.filter(Boolean).length), feedback: 'A question with no relevant result counts 0 and stays in the average.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
  }
  const k = g.pick([3, 4, 5, 8]), tokens = g.pick([100, 120, 200, 250]), q = g.pick([30, 50, 60]), answer = k * tokens + q
  return { template, seed, k, tokens, q, answer, misconceptions: [{ answer: k * tokens, feedback: 'The question is part of the prompt too.' }] }
}
export function view(p) {
  if (p.template === 'idf') return { intro: `A corpus has ${p.N} chunks and a word appears in ${p.df} of them.`, questions: [{ id: 'i', type: 'number', label: 'What is its idf, ln(N/df)? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  if (p.template === 'mrr') return { intro: `Three questions have their first relevant result at: ${p.ranks.map(x => (x ? `rank ${x}` : 'not retrieved')).join(', ')}.`, questions: [{ id: 'm', type: 'number', label: 'What is the MRR? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  return { intro: `A prompt holds k = ${p.k} chunks of about ${p.tokens} tokens and a ${p.q}-token question.`, questions: [{ id: 't', type: 'number', label: 'About how many tokens is the prompt?', answer: p.answer, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'idf') return `ln(${p.N}/${p.df}) = **${Math.round(p.answer * 1000) / 1000}**.`
  if (p.template === 'mrr') return `(${p.ranks.map(x => (x ? `1/${x}` : '0')).join(' + ')})/3 = **${Math.round(p.answer * 1000) / 1000}**.`
  return `${p.k} × ${p.tokens} + ${p.q} = **${p.answer}**.`
}

export const retrieval = {
  title: 'Retrieval: weights, metrics and permissions',
  version: 1,
  templates: TEMPLATES,
  templateNames: { idf: 'Inverse document frequency', mrr: 'Mean reciprocal rank', tokens: 'Prompt size' },
  generate, view, workedSolution,
  intro: 'Seven steps: retrieval arithmetic by hand, permissions applied before ranking, and writing idf, recall@k and the reciprocal rank. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Retrieval arithmetic by hand',
      prompt: 'A corpus has 12 chunks. Separately: unit vectors q = (0.6, 0.8, 0) and d = (0.8, 0, 0.6); a question with relevant documents {a, b} whose top 3 is [a, x, y]; and three questions whose first relevant result is at ranks 1, 2 and 4.',
      fields: [
        { label: 'idf of a word in 3 of the 12 chunks (three decimals)', answer: Math.log(4), tolerance: 0.0006 },
        { label: 'Cosine of q and d', answer: 0.48, tolerance: 1e-9 },
        { label: 'recall@3 for {a, b}', answer: 0.5, tolerance: 1e-9 },
        { label: 'MRR of ranks 1, 2 and 4 (three decimals)', answer: 1.75 / 3, tolerance: 0.0006 },
      ],
      explain: 'ln(12/3) = ln 4 = 1.386. For unit vectors the cosine is the dot product: 0.6 × 0.8 + 0.8 × 0 + 0 × 0.6 = 0.48. One of the two relevant documents is in the top 3: 1/2. (1 + 1/2 + 1/4)/3 = 0.583.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Permissions before ranking',
      prompt: 'A user outside the database team asks how to promote a replica. Run it: the restricted failover runbook lands in the prompt. **Set `filter_first = 1`** so restricted documents are removed before ranking, and run again.',
      starter: `import re
docs = [
    {"id": "db-replica", "restricted": False, "text": "Replica lag grows when the primary database receives heavy write traffic. Pause batch jobs to let the replica catch up."},
    {"id": "db-failover", "restricted": True, "text": "To fail over the primary database, promote the healthiest replica. Update the connection secret in the vault."},
    {"id": "deploy-rollback", "restricted": False, "text": "Roll back a bad deployment by redeploying the previous release tag."},
    {"id": "dns", "restricted": False, "text": "Services become unreachable when DNS resolution fails. Check the resolver configuration."},
]
words = lambda t: set(re.findall(r"[a-z]+", t.lower()))
def score(question, doc):
    return len(words(question) & words(doc["text"]))

question, k, user_on_db_team = "promote a replica to primary", 2, False
filter_first = 0          # 1: remove what the user may not read BEFORE ranking; 0: rank everything, clean up afterwards

candidates = [d for d in docs if user_on_db_team or not d["restricted"]] if filter_first else docs
top = sorted(candidates, key=lambda d: -score(question, d))[:k]
prompt = "Answer only from these passages:\\n" + "\\n".join(f"[{d['id']}] {d['text']}" for d in top) + f"\\nQuestion: {question}"
restricted_in_prompt = int(any(d["restricted"] for d in top))
n_passages = len(top)
print(prompt)
print(f"\\nfilter_first = {filter_first}: restricted text in the prompt: {bool(restricted_in_prompt)}; passages: {n_passages}")`,
      probe: ['filter_first', 'restricted_in_prompt', 'n_passages'],
      evaluate: evaluatePermissions,
      done: 'The same rule holds for every data source an assistant can read: enforce access where the data is fetched, never in the answer.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in idf',
      prompt: 'Replace `___` with the idf of each word, given the number of chunks `N` and an array `df` of document frequencies.',
      starter: `import numpy as np

def idf(N, df):
    """Inverse document frequency of each word: rare words weigh more."""
    return ___`,
      hint: 'The lesson’s formula is ln(N / df).',
      solution: 'return np.log(N / df)',
      check: { fn: 'idf', args: ['N', 'df'], ints: ['N'], cases: IDF_CASES, describe: c => `N = ${c.N}, df = [${c.df.join(', ')}]`, diagnose: diagnoseIdf },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For the ranking [3, 7, 1], relevant documents [3, 5] and k = 3 this returns **0.333**; one of the two relevant documents was found, so recall@3 is 0.5. Fix it.',
      starter: `def recall_at_k(ranking, relevant, k):
    """The fraction of the relevant documents that appear in the top k of the ranking."""
    found = len(set(ranking[:k]) & set(relevant))
    return found / k`,
      hint: 'Recall is about the relevant documents: how many of them were found?',
      solution: 'return found / len(relevant)',
      check: { fn: 'recall_at_k', args: ['ranking', 'relevant', 'k'], ints: ['ranking', 'relevant', 'k'], cases: RECALL_CASES, describe: c => `ranking [${c.ranking.join(', ')}], relevant [${c.relevant.join(', ')}], k = ${c.k}`, diagnose: diagnoseRecall },
      explainChoice: {
        prompt: 'Why is recall@k, not precision@k, the usual retrieval metric for an assistant?',
        options: [
          { text: 'The generator reads all k passages anyway; what matters is whether the answering passage is among them. Missing it caps answer quality, while a few irrelevant passages mostly cost tokens.', correct: true },
          { text: 'Because precision cannot be computed for retrieval.', feedback: 'It can: found / k. It answers a different question.' },
          { text: 'Because recall is always higher.', feedback: 'Not necessarily; with one relevant document and k = 3, precision is at most 1/3 and recall can be 1.' },
          { text: 'Because relevant documents are always ranked first.', feedback: 'If they were, every metric would be perfect.' },
        ],
        rightFeedback: 'Irrelevant passages still matter — they cost tokens and can distract — which is why MRR, rewarding the answer at the top, sits beside recall.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'The reciprocal rank',
      prompt: 'Write `reciprocal_rank` from its contract.',
      starter: `def reciprocal_rank(ranking, relevant):
    """1 / (position of the first relevant document in the ranking), counting from 1; 0 if none is retrieved.

    Example: reciprocal_rank([4, 2, 9], [9])  ->  0.333...
    """
    pass   # replace with your code`,
      hint: 'Walk the ranking with its position; return 1/(position + 1) at the first relevant document.',
      solution: 'for i, doc in enumerate(ranking):\n    if doc in relevant:\n        return 1 / (i + 1)\nreturn 0.0',
      check: { fn: 'reciprocal_rank', args: ['ranking', 'relevant'], ints: ['ranking', 'relevant'], cases: RR_CASES, describe: c => `ranking [${c.ranking.join(', ')}], relevant [${c.relevant.join(', ')}]`, diagnose: diagnoseRr },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New corpora, rankings and prompts. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
