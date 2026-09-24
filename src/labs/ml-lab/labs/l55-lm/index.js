import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 55,
  short: 'Language models',
  question: 'How does predicting the next token become a system that writes — and what turns it into an assistant?',
  intro: 'The chain rule and perplexity, byte-pair encoding, n-gram models and smoothing, a neural language model, sampling controls, and how pretrained models are adapted with fine-tuning, LoRA and preference optimization.',
  lessons, sources, python,
  math: ['stat.conditional', 'pre.log', 'ai.info', 'calc.explog', 'dm.automata', 'ai.lora'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Language models as next-token predictors, the chain rule, cross-entropy, bits per character and perplexity, subword tokenization and BPE, n-gram estimation, add-k smoothing, interpolation and backoff, neural language models, greedy decoding, temperature, top-k and top-p sampling, memorization, pretraining and scaling laws, fine-tuning, LoRA, instruction tuning, RLHF and DPO, and evaluation of assistants.',
}
