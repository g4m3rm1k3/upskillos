import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 34,
  short: 'Retrieval & LLM apps',
  question: 'How do you make an assistant answer from your own documents — and prove it?',
  intro: 'Retrieval-augmented generation from the retrieval side: lexical and semantic ranking, labelled evaluation, permissions before retrieval, grounded answers and operational costs.',
  lessons, sources, python,
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'The retrieval-augmented pattern, chunking, TF-IDF and BM25, vocabulary mismatch and dense embeddings (via a clearly labelled toy), recall@k and MRR, evaluation leakage, permission filtering, grounding and refusal, prompt injection, cost and freshness. No language model is called; generation is replaced by an extractive answer.',
}
