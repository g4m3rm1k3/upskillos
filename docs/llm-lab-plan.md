# LLM Lab: plan and status

A lab (`#/lab/llm-lab`) that takes a learner from a small pretrained language model to an assistant, the way real ones are made: generating text fast (the KV cache), supervised fine-tuning, honest evaluation, learning from preferences (a reward model, RLHF and DPO), and reinforcement learning with checkable rewards (GRPO); then the same ideas measured on a real 135-million-weight model. Asked for on 2026-10-16, after a survey of the ML labs found that nothing teaches how a pretrained model becomes an assistant (no KV cache, reward model, preference training or LLM evaluation anywhere).

Read this file first when resuming. Update **Where we stopped** at the start of each session.

## Who it's for

Someone who has done NLP Studio Parts 5–6 (the tiny GPT, chat format, loss masking) or ML Lab 25–26 (embeddings, attention). The lab recaps what it uses in Remember notes and links back, but doesn't re-teach attention.

## Design decisions

1. **The lab's own model, in plain Python with an exact JavaScript twin.** `python/gpt.py` starts from NLP Studio's `tinygpt.py` (a small autograd on 2-D lists, one transformer block, Adam) and adds what this lab needs: a KV cache, sequence log-probabilities, and the post-training losses. `engine/gpt.js` is the same code line for line; parity tests compare it with recorded Python runs (`tools/make_parity.py`), as NLP Studio and QMaze do. Every number a lesson states is computed by the engine or measured by a recorded run.
2. **The task is arithmetic, because every answer can be checked.** Single-digit addition has exactly 100 questions, so evaluation covers all of them, with no sampling of the test set. Checkable answers give the lab an answer key (what made QMaze and Tabletop convincing), and they are exactly what GRPO's rewards need.
3. **No PyTorch needed for the core.** No Python on the authoring Mac has PyTorch, and the pure-Python model trains fast enough (measured below). The real-model part runs SmolLM2-135M-Instruct in the browser through `@huggingface/transformers`, which NLP Studio already loads (`nlp-studio/engine/pretrained.js`); its numbers are measured and recorded with dates, not parity-checked.
4. **Safe runs.** Every Python run that trains goes through `scripts/frontier-safe-run.mjs` (timeout, memory ceiling, 2 threads, GPU hidden). The machine has 16 GB shared with other work.
5. **The recipe**: QMaze's (lessons with prose and derivations, figures on the real data, real code with a note under each line, math ↔ code tables, predict and choice checks with misconception feedback, every Python statement explained, the desktop Python tab). Blocks use `python-steps/Blocks.jsx`; progress keys use `python-steps/progress.js`.

## Measured while planning (2026-10-16, macOS, python3 3.13, through the safe-run guard)

- NLP Studio's `tinygpt.train` (dim 16, context 16): 20 steps in 0.15 s.
- **Pretraining-style loss (every character counts)** on 400 lines of `a+b=c`: after 1,500 to 8,000 steps (dim 16 to 32, lr 0.01 to 0.02), greedy exact match on all 100 sums is **2 to 12 out of 100**. Most of every window is the random input digits, which can't be predicted, so the loss carries little signal about the answers. Higher learning rates made it worse.
- **Answer-only loss** (weights 1 on the answer and its newline, 0 elsewhere; three problems per window): **77/100 after 1,500 steps and 60/100 after 3,000** at dim 16, lr 0.003 (12 s and 24 s); 66 and 68 at dim 32. At lr 0.01 it diverged: a probability underflowed to 0 and `math.log` failed.
- So: the base model knows the format but barely the answers; a loss mask is worth roughly 9/100 → 70/100; and single runs jump around (77 then 60), which Part 4 must handle with seeds and standard errors.

## The engine (built 2026-10-16)

`python/gpt.py` (model and autograd), `python/arith.py` (vocabulary, notebook, exact match), `python/pretrain.py`; `engine/gpt.js` and `engine/arith.js` are their twins. `engine/parity.test.js` checks the whole 1,500-step pretraining run against `tools/make_parity.py`'s recording **exactly**: every loss, the final weights and all 100 answers. Two things were needed for exact equality, and both are taught (lesson 1.2):

- **Our own `exp` and `log`**, from `+ − × ÷` only. `math.exp` and `Math.exp` can differ in the last bit; training is chaotic, so after 1,500 steps that had grown to a loss difference of 0.24 and different answers.
- **Our own `total()`** instead of `sum()`: since Python 3.12, `sum()` of floats uses compensated summation, which JavaScript's running total doesn't.

Base model (`pretrain()` defaults: dim 16, context 16, hidden 64, lr 0.01, 1,500 steps, seed 1): **12/100** exact match, about 12 s in Python.

Part 2 added `new_cache`, `vecmat` and `forward_cached` to `gpt.py`, and `python/generate.py` (sampling, `spread`, cached `generate`, `cache_matches`, multiplication counts, `time_both`, two demo programs); `engine/generate.js` is its twin. The cached logits are **identical** (`==`) to the full pass's last row, because `vecmat` adds in `matmul`'s order and the future's attention weights are exactly 0. Parity also covers 200 sampled answers (T 1, and T 0.7 with top-k 3) and the costs.

- **Seeds must be scrambled.** `Rng(seed)`'s first number moves only 1664525/2³² per seed, so 1,000 samples with seeds 0–999 drew their first token from one narrow band (at T 2 the base model wrote `8` 472 times in 1,000, against p ≈ 0.18). Multiplying by the golden-ratio constant alone still stepped 0.02 per seed. `spread()` (MurmurHash3's finaliser: multiply, xor-shift, twice) fixed it; `Rng` itself is unchanged, so Part 1's numbers stand. Use `generate(..., seed)` for any sampling in later parts.
- **Measured (2026-10-16, Apple M4, Python 3.13.2, medians of 3)**, `time_both(L)`: L 16: 0.022 s vs 0.0022 s, 10.1× (multiplications 8.2×); 32: 19.4× (16.7); 64: 38.8× (34.4); 128: 77.7× (72.0). The browser beats the counts by more (Chromium: 23×, 21×, 54×, 114×), because `forward` builds Tensors and gradient tables.
- Sampling the base model, 20 runs of all 100 questions each: T 0 12 every run; T 0.5 mean 10.9 (6–20); T 1 10.5 (3–15); T 2 7.6 (3–12). For `3+5=` at T 1, 163 of 1,000 samples are `8`.

## Parts and lessons (draft)

**Part 1 · A base model**
1.1 What a language model computes: next-token probabilities, recapped. 1.2 The lab's model, file by file. 1.3 Pretraining on a notebook of sums, every character counted: what it learns and doesn't. 1.4 A base model can't be asked a question: completion versus instruction.

**Part 2 · Generating fast** (built)
2.1 Choosing the next token (`sampling`). 2.2 What generating costs (`generation-cost`). 2.3 The KV cache, by hand (`kv-cache`). 2.4 The speed-up, counted and measured (`kv-speed`).

**Part 3 · Supervised fine-tuning**
3.1 Instruction data and a chat template with special tokens. 3.2 The loss mask, derived. 3.3 An SFT run: from about 9/100 to about 70/100, measured. 3.4 What fine-tuning forgets.

**Part 4 · Evaluating honestly**
4.1 An exact-match harness over all 100 questions. 4.2 One run is one sample: seeds, checkpoints and standard error. 4.3 Held-out questions and contamination. 4.4 pass@k with sampling.

**Part 5 · Learning from preferences**
5.1 Preference pairs. 5.2 A reward model (Bradley–Terry) by hand. 5.3 RL against the reward model with a KL penalty, and reward hacking made to happen. 5.4 DPO, derived. 5.5 DPO trained and compared.

**Part 6 · Rewards you can check**
6.1 Verifiable rewards. 6.2 GRPO by hand: advantages relative to a group. 6.3 A GRPO run, measured against SFT.

**Part 7 · A real model**
7.1 SmolLM2's tokens and chat template. 7.2 Its logits and sampling. 7.3 The KV cache measured on it. 7.4 Quantization: size, speed and how much the logits change.

## Where we stopped

2026-10-16, session 2: **Part 2, four lessons** (2.1 choosing the next token: temperature, top-k, scrambled seeds; 2.2 what generating costs: identical earlier rows, multiplications counted; 2.3 the KV cache by hand, with the exact test; 2.4 the speed-up counted and measured). Figures: SampleFig, ScoreFig, ReuseFig, CostFig, CacheFig, SpeedFig. Python-tab programs: `samples`, `cache`, `speed`. Seen in a real browser (Playwright): every figure draws, no KaTeX errors, the cache matches at every position, and the browser timings agree on the tokens. All 76 lab tests pass.

Not done yet: a desktop stepper test (`stepper.desktop.test.js`) for the Python-tab programs (now five).

**Next session: Part 3, supervised fine-tuning** (3.1 chat template with `<user>`, `<bot>`, `<end>`; 3.2 the loss mask, derived; 3.3 an SFT run from the base model, about 12/100 to about 70/100 per the planning spike; 3.4 what fine-tuning forgets). `cross_entropy` already takes `weights` for the mask.

### Session 1

2026-10-16, session 1: survey, spikes, this plan, the engine (exact parity over a whole pretraining run) and **Part 1, five lessons**: 1.1 what a language model computes, 1.2 numbers that agree everywhere (Rng, `total`, own `exp`/`log`), 1.3 the forward pass, 1.4 pretraining, 1.5 what a base model can and can't do. Figures: VocabFig, NextTokenFig, BitsFig, ForwardFig, PretrainFig, AnswerGrid, AskFig. Seen in a real browser (Playwright screenshots): pretraining in the page ends at exactly Python's numbers (first loss 2.827, last-100 average 1.177, 12/100).

Measured on the base model: after `3+5=`, P(`1`) = 0.593, P(`8`) = 0.174; it only ever answers `10` (77 times), `4` (17) or `8` (6); 8 of its 12 right answers are sums of 10. Greedy decoding explains the `10`: 45 of 100 answers start with `1`, and `0` is the most common digit after it. Asked `<user>3+5?<bot>` it writes `=1`, newline, `4+8`.

Shared change: `python-steps/source.js` no longer treats a function nested inside a later function as a method of an earlier class (the eight nested `backward`s were keyed `Tensor.backward`). All python-steps labs' tests still pass.

Not done yet: a desktop stepper test (`stepper.desktop.test.js`) for the two Python-tab programs.

Part 2 followed in session 2.
