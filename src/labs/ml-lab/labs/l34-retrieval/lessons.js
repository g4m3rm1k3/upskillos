import { extras } from './notebooks.js'

export const lessons = [
  {
    id: 'l34-rag',
    title: '34.1 · Retrieval before generation',
    sections: ['Why retrieve?', 'The retrieval-augmented pattern', 'Chunks', 'Two systems, two evaluations', 'Put it into practice'],
    skill: 'Describe retrieval-augmented generation and why retrieval quality bounds answer quality.',
    prerequisite: 'Core labs 01–33; text features (Lab 11), embeddings (Lab 25), attention (Lab 26), evaluation (Lab 06).',
    paragraphs: [
      'A language model alone answers from what it absorbed during training: it knows nothing about your team\'s runbooks and may invent confident, plausible details. Retrieval-augmented generation (RAG) first **retrieves** relevant passages from your own documents, then asks the model to answer **from those passages**, citing them.',
      'The pipeline: split documents into **chunks**; index them; for a question, score every chunk and keep the top k; build a prompt containing the question and those passages; generate an answer with citations. The playground replaces the generator with an extractive answer — the single best supporting sentence — so every step is inspectable.',
      'Chunk size is a trade-off: small chunks match precisely but may lose context ("restart the gateway" without saying which failure); large chunks carry context but dilute the match and fill the model\'s context window.',
      'If the right passage is not retrieved, no generator can answer correctly from it — at best it answers from memory, at worst it makes something up. Retrieval quality is an upper bound on answer quality, so evaluate it separately.',
      'Procedure: collect real questions with the documents that answer them; measure retrieval (Lesson 34.3); only then add generation and measure answer correctness and faithfulness to the cited sources.',
    ],
    formula: 'question → retrieve top-k chunks → prompt(question + chunks) → answer with citations',
    experiment: 'Ask "workers crash from insufficient RAM" with BM25, then with the toy semantic method. What does the grounded answer say in each case?',
    question: 'Retrieval finds the right passage for 74% of questions. If the generator answers perfectly whenever it gets the right passage and never otherwise, what is the best possible answer accuracy? (Decimal.)',
    answer: 0.74,
    explanation: 'Answers can only be correct when the supporting passage was retrieved: at most 0.74. Improving the generator cannot lift that ceiling.',
    reflection: 'Which documents in your work would you want an assistant to answer from? Who is allowed to see each of them?',
  },
  {
    id: 'l34-lexical',
    title: '34.2 · Lexical retrieval: TF-IDF and BM25',
    sections: ['Match words', 'Weight rare words', 'Cosine similarity', 'BM25', 'Where lexical methods fail'],
    skill: 'Score documents with TF-IDF cosine and BM25 and explain their failure on paraphrases.',
    prerequisite: 'Lesson 34.1; bag of words (Lab 11), vectors (Lab 03).',
    paragraphs: [
      'The simplest score counts shared words. But "the" matches everything, while "lockfile" is decisive. **Inverse document frequency** weights a word by how rare it is: `idf(w) = log(N / df(w))`, where df is the number of chunks containing w. In 12 documents, a word in 1 gets log 12 ≈ 2.48; a word in all 12 gets 0.',
      '**TF-IDF** represents each chunk as a vector of term frequency × idf, normalized to length 1; the question gets the same treatment. Their **cosine similarity** — the dot product of unit vectors (Lab 03) — scores relevance independent of length.',
      '**BM25** refines this: repeated occurrences of a word give diminishing returns (a saturation parameter k₁), and long chunks are penalized relative to the average length (parameter b). It remains a strong, fast baseline used in production search engines.',
      'All lexical methods fail on **vocabulary mismatch**: "insufficient RAM" shares no word with "out of memory errors", "jobs piling up unprocessed" none with "queue backlog". In the playground, six paraphrased questions drop lexical recall@1 to about 74%.',
      'Remedies: stemming and synonyms (brittle), query expansion, and learned **dense embeddings** that map meaning rather than spelling (the playground’s toy semantic method imitates one, by hand). Hybrid search — combining BM25 with embeddings — is common in practice.',
    ],
    formula: 'idf(w) = log(N/df(w))     cos(q, d) = q·d / (‖q‖‖d‖)',
    experiment: 'Try each lexical method on the paraphrased questions (buttons). Which ones retrieve nothing at all?',
    question: 'A corpus has 12 documents and a word appears in 3 of them. What is its idf, log(N/df)? (Natural log, three decimals.)',
    answer: 1.3863, tolerance: 0.001,
    explanation: 'log(12/3) = log 4 ≈ 1.386. A word in only one document would get log 12 ≈ 2.485.',
    reflection: 'Write three ways a user might ask about the same problem in your domain using no shared words.',
  },
  {
    id: 'l34-eval',
    title: '34.3 · Evaluating retrieval',
    sections: ['A labelled question set', 'Recall@k', 'Mean reciprocal rank', 'Honest evaluation sets', 'Answer quality is separate'],
    skill: 'Build a labelled evaluation set and measure retrieval with recall@k and MRR.',
    prerequisite: 'Lessons 34.1–34.2; leakage (Lab 06).',
    paragraphs: [
      'Collect real questions (from tickets, chat logs, search logs) and label which documents answer each. Even 50 labelled questions reveal far more than anecdotes.',
      '**Recall@k**: the fraction of relevant documents found in the top k. With k = 3 and one relevant document, a question scores 1 if the document is among the top 3.',
      '**Mean reciprocal rank** (MRR): for each question, 1 divided by the rank of the first relevant result (0 if none); averaged. First place scores 1, second 0.5, third 0.33 — it rewards putting the answer at the top, where users and generators look.',
      'Keep the evaluation honest: questions written by the same person who tuned the system, or synonym lists built while reading the test questions, inflate scores (Lab 06). The playground\'s toy concept map is exactly such a leak. Hold out questions, and refresh the set as new questions arrive.',
      'Evaluate answers separately: correctness (does it answer?) and faithfulness (is every claim supported by the cited passages?). A fluent answer with a wrong citation is worse than "I don\'t know".',
    ],
    formula: 'recall@k = |relevant ∩ top k| / |relevant|     MRR = mean(1 / rank of first relevant)',
    experiment: 'Compare recall@1 and recall@3 for each method in the table. For which method does going from k = 1 to k = 3 help most?',
    question: 'Three questions have their first relevant result at ranks 1, 2 and 4. What is the MRR? (Three decimals.)',
    answer: 0.5833, tolerance: 0.001,
    explanation: '(1 + 1/2 + 1/4)/3 = 1.75/3 ≈ 0.583.',
    reflection: 'Where would you get 50 real questions for an assistant in your domain, and who would label them?',
  },
  {
    id: 'l34-ops',
    title: '34.4 · Permissions, grounding and cost',
    sections: ['Filter before retrieval', 'Grounding and refusal', 'Prompt injection', 'Cost and latency', 'Demonstrate understanding'],
    skill: 'Enforce permissions, require grounded answers, and account for the costs of a retrieval assistant.',
    prerequisite: 'Lessons 34.1–34.3; privacy (Lab 31), serving (Lab 29).',
    paragraphs: [
      'Apply access control **before** retrieval: filter the candidate chunks to those the user may read. Filtering after generation is too late — the model may already have paraphrased restricted content into its answer. In the playground, the failover runbook never reaches users outside the database team.',
      'Require grounding: instruct the generator to answer only from the retrieved passages, cite them, and say "I could not find this" otherwise. Check faithfulness automatically on a sample (does each sentence overlap a cited passage?) and by human review.',
      'Retrieved text is untrusted input. A document containing "ignore previous instructions" can try to steer the model (**prompt injection**). Keep instructions separate from retrieved content, limit what the model can do (no automatic actions), and review sources that enter the index.',
      'Costs: embedding and indexing documents, storing vectors, retrieval latency, and generation cost that grows with prompt length (k × chunk size). Measure them like any serving system (Lab 29), and update the index when documents change — stale runbooks produce confidently wrong answers.',
      'You have completed this specialization when you can: build and evaluate retrieval with a labelled question set; explain lexical versus dense retrieval; enforce permissions before retrieval; require grounded, cited answers; and account for cost, latency and freshness. The Python challenge implements TF-IDF, BM25 and the retrieval metrics.',
    ],
    formula: 'allowed = filter(chunks, user) → rank(allowed) → answer only from top-k, with citations',
    experiment: 'Ask "promote a replica to primary" with and without the team permission. What does the assistant answer in each case?',
    question: 'A prompt includes k = 4 chunks of about 120 tokens each plus a 60-token question. About how many tokens is the retrieved context plus question?',
    answer: 540,
    explanation: '4 × 120 + 60 = 540 tokens — generation cost and latency grow with this number.',
    reflection: 'Which document in your organization must never appear in an answer for most users? How would you guarantee that?',
  },
]

export const sources = [
  { title: 'Lewis et al. (2020) · Retrieval-augmented generation for knowledge-intensive NLP tasks', url: 'https://arxiv.org/abs/2005.11401' },
  { title: 'Robertson & Zaragoza (2009) · The probabilistic relevance framework: BM25 and beyond', url: 'https://doi.org/10.1561/1500000019' },
  { title: 'Manning, Raghavan & Schütze · Introduction to Information Retrieval (free book)', url: 'https://nlp.stanford.edu/IR-book/' },
  { title: 'OWASP · Top 10 for LLM applications (prompt injection)', url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/' },
]

// Runnable cells, typeset formulas and math ↔ code tables for each lesson live in notebooks.js.
for (const lesson of lessons) Object.assign(lesson, extras[lesson.id])
