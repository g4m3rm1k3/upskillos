# Frontier: modern AI from zero, from your first line of Python to a language model that learns by reinforcement and search — series plan

**Status:** planned 2026-10-08. The owner reviewed the drafts the same day and set three things: the series stands alone; it assumes no knowledge of machine learning, software engineering or computer science (but does assume the learner can already hack Python together, from introductory courses); and it teaches the professional tools as well as building by hand. This version has all three. The owner approved it the same day: lessons are written in plan order without review pauses, the lessons will be run on a different machine from the authoring one, and testing on the authoring machine must be careful (an earlier PyTorch run by an agent froze it; see *Testing safely on the authoring machine*). No lessons are written yet.

A new Project Studio series (desktop app). It starts from scripts you'd hack together and goes to a small GPT trained on your own GPU. From there it joins language models with reinforcement learning and search, the two lines of work behind assistants like Claude and game-players like AlphaZero. Every mechanism is built by hand first, so nothing is a black box. Then the tool that professionals use for the same job is learned and used for real work. Along the way the learner practises the research skills: reading papers, reproducing results, running fair experiments and writing them up.

Working series key: `frontier`. Tracks are `frontier-<chapter-slug>`.

## Who it's for, and what it asks for

- **What's assumed:** the learner can write Python scripts that work (variables, loops, functions, lists, dictionaries, maybe a class) from introductory courses, and hacks code together to get things done. **Nothing else is assumed:** no software engineering (project structure, testing, debugging method, git), no computer science (complexity, data structures, how numbers are stored), no maths beyond school algebra, no machine learning. Every one of these is taught in this series, in the lesson where it's first needed. It doesn't depend on any other series. Other series (the ML series, Q-Arcade, Forge, the math series) cover some of the same ground. That overlap is on purpose, so this series stays complete on its own.
- **The goal** is the knowledge and the portfolio that frontier labs look for in research engineers: you can build the systems, you can use the industry's tools fluently, you understand the mathematics, and you can run an experiment that tells you something true. *Portfolio* below lists the evidence the series produces.
- **Hardware:** the learner's machine isn't known, so no lesson depends on a GPU.
  - **Every step's checks pass on an ordinary laptop CPU** in seconds, using tiny configs.
  - **Bigger runs** (training the GPT, scaling laws, fine-tuning, GRPO) each have three sizes. *Small* runs on a CPU in minutes and is enough to see the effect. *Full* is for a GPU with about 6 GB or more. *Cloud* is the same code in a free cloud GPU notebook (Kaggle or Google Colab), taught in Chapter 15.
  - Each lesson says which size it expects and what result to look for at each size.
  - Lessons never quote a number from a run that wasn't measured. Where a full run couldn't be measured while writing, the lesson says what shape of result to expect, and the learner records their own numbers.

## The rules every lesson follows

1. **Build it, check it, then use the tool.** Each mechanism is written by hand first (plain Python, then NumPy) and checked against the library's version to a stated tolerance. Then the learner switches to the professional tool (PyTorch, Hugging Face, Gymnasium, TRL and so on; see *Tools* below) and uses it for real work. If the tool and the hand-built version disagree, the learner reads the tool's source to find out why.
2. **Measure, then derive.** A gradient is measured by nudging a number before it is derived. A claim like "attention needs scaling by √d" is shown to break training before it is explained.
3. **Nothing used before it's taught.** A word, a symbol or a library call appears only after the lesson that teaches it, or in the step that teaches it.
4. **Small typed pieces.** Each step adds 3–15 lines, explained before they're typed and traced after. No whole-file dumps. 20–40 minutes per lesson, with 3–6 steps, each checked by tests.
5. **Predict first.** Before a run, the learner writes down what they expect (a prediction box). Many of the best lessons are the ones where the prediction is wrong.
6. **Research rule: one change at a time, several seeds, error bars.** No result is reported from one run. This starts in Part 2, as soon as there's something to measure.
7. **Research rule: every chapter from Part 3 on has a paper.** One lesson reads the original paper's key section next to the code just written. The learner already knows what each equation does, so this is how they learn to read papers.
8. **Research rule: every chapter from Part 3 on ends in an open question.** The last lesson poses an experiment whose answer isn't in the lesson (*Open questions* below has the list). The learner designs it, runs it, and writes a half-page result in their research journal.

## Tools

Each tool comes after the hand-built version of what it does, never instead of it.

| Tool | What it's for | First used |
|---|---|---|
| VS Code, `venv`, `pip`, `pyproject.toml` | a project set up the way professionals do it | Ch 0 |
| `pytest`, `argparse`, dataclasses | testing, command-line tools, clean data types | Ch 1 |
| git and GitHub | saving history, sharing the portfolio | Ch 1 |
| the VS Code debugger, `logging`, `cProfile` | debugging and finding slow code | Ch 3 |
| NumPy | arrays and fast maths | Ch 4 |
| Matplotlib | plots | Ch 4 |
| pandas | tables of data and results | Ch 8 |
| scikit-learn | classic ML, done professionally | Ch 8 |
| TensorBoard (and Weights & Biases, optionally) | tracking experiments | Ch 11 |
| PyTorch (`nn`, `optim`, `DataLoader`, AMP, `torch.compile`, profiler) | deep learning | Ch 14 onward |
| CuPy, Triton | writing your own GPU code | Ch 15, Ch 41 |
| Gymnasium | the standard RL environment interface | Ch 23 |
| Stable-Baselines3 | tested RL algorithms to compare yours against | Ch 25 |
| `tiktoken`, Hugging Face `tokenizers` | production tokenizers | Ch 28 |
| gensim | word vectors | Ch 29 |
| Hugging Face `transformers`, `datasets`, the Hub | pretrained models and datasets | Ch 37 onward |
| `torch.distributed` | training across processes and GPUs | Ch 42 |
| Hugging Face `peft`, `bitsandbytes` | LoRA and quantised fine-tuning | Ch 45 |
| `lm-evaluation-harness` | standard language-model benchmarks | Ch 46 |
| Hugging Face TRL | SFT, PPO, DPO and GRPO trainers | Ch 44, Ch 51–54 |
| `diffusers` | production diffusion models | Ch 61 |
| TransformerLens | interpretability on real models | Ch 63 |

## A map of the field, in plain words

The series teaches each of these properly. This map is here so the words aren't strangers when they appear.

- **Model:** a function with adjustable numbers (*parameters*, or *weights*) inside it. **Training** adjusts the numbers so the function does what we want on examples.
- **Loss:** one number that says how wrong the model is. **Gradient:** which way to nudge every parameter to lower the loss. **Backpropagation:** the chain rule, used to get every gradient in one backward pass. **Autograd:** software that does backpropagation for you.
- **Optimizer:** the rule for using gradients (SGD, momentum, **Adam**). **Learning rate:** how big each nudge is.
- **Supervised learning:** learning from examples with answers. **Self-supervised learning:** the answers come from the data itself, e.g. "predict the next word". This is how language models are **pretrained**.
- **Overfitting:** the model memorises the training examples instead of learning the pattern. **Generalisation:** doing well on examples it hasn't seen.
- **Reinforcement learning (RL):** learning from rewards for actions. **Policy:** what the agent does in each state. **Value / Q-function:** how good a state or action is. **Q-learning:** learning the Q-function from experience. **Policy gradient, PPO:** ways to improve the policy directly.
- **Token:** a piece of text (a word, part of a word, or a character) turned into a number. **Tokenizer (BPE):** decides the pieces. **Embedding:** a learned vector for each token.
- **Language model:** predicts the next token. **Perplexity:** how surprised it is by real text (lower is better).
- **Attention:** each position looks at the other positions and takes a weighted mix of them. **Transformer:** stacked attention and feed-forward layers. **GPT:** a transformer trained to predict the next token.
- **Pretraining → fine-tuning → RLHF:** how a raw text predictor becomes an assistant: train on lots of text, then on example conversations (**SFT**), then with reward from human (or AI) preferences (**RLHF**, **DPO**, **RLAIF / Constitutional AI**).
- **Reward model:** a network trained to score answers the way people would. **Reward hacking:** the policy finds a way to score high without doing the task.
- **Search:** trying many possibilities before acting. **MCTS:** a tree search that spends effort on promising moves. **Self-play:** an agent improves by playing copies of itself. **AlphaZero** = a network that guides MCTS, trained on its own self-play games. **MuZero** = the same, with the game's rules also learned.
- **Test-time compute / reasoning:** letting a model think longer (more samples, search, chains of thought) at answer time instead of only training it more. This is where language models and AlphaZero-style search are meeting.
- **Scaling laws:** how loss falls as model size, data and compute grow. They are measured, not derived, and they're the reason labs train big models.
- **Interpretability:** reading what a trained network computes inside (attention heads, features, circuits). **Alignment / safety:** making sure a capable model does what was intended.
- **Other families you'll meet:** CNNs (images), RNNs and LSTMs (sequences before transformers), autoencoders and **VAEs**, **diffusion models** (image generators), **contrastive learning / CLIP** (text and images in one space), **state-space models / Mamba** (an alternative to attention), **mixture of experts** (only part of a big model runs for each token).

## Chapters

16 parts (0–15), 68 chapters (0–67) and roughly 270 lessons. The plan order is the writing order. Chapter numbers are fixed. Lesson counts are estimates.

### Part 0 — From hacked-together scripts to software

The learner already writes Python. This part teaches what turns working scripts into software you can trust and grow, and the computer science the later parts rely on. Each idea is chosen because a later chapter needs it (noted in the Taught column).

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 0 | `frontier-setup` | A real project | the series' project: VS Code, a `.venv`, a `pyproject.toml`, a `src/` package, run from the terminal; PyTorch installed (the CUDA build if there's an NVIDIA GPU, the CPU build otherwise) and checked against NumPy | what a virtual environment and a package are, and why; `pip` and pinned versions; modules vs packages vs scripts; what `import` actually does |
| 1 | `frontier-engineering` | From script to software | a supplied hacked-together text-statistics script (one long file, globals, copy-paste) refactored step by step into functions, modules, a dataclass and a command-line tool, without changing its output | naming and function design; type hints; dataclasses; exceptions used on purpose; a command line with `argparse`; tests with `pytest`, written first to pin the old behaviour (a safety net for refactoring); git: commits, branches, GitHub |
| 2 | `frontier-cs` | The computer science you'll need | small benchmarks, a priority queue, a tree, a graph | big-O measured by timing, then reasoned about; lists vs dicts vs sets (hashing); heaps (BPE merges and search use them); trees and recursion (MCTS); graphs and topological sort (autograd); how floats are stored and where they break (`exp` overflowing in softmax, 0.1 + 0.2) |
| 3 | `frontier-tools` | Debugging and speed | a bug found with the debugger instead of `print`; a slow function found with the profiler; a loop made 100× faster by vectorising | debugging as a method (reproduce, narrow down, hypothesise, test); the VS Code debugger; logging; `cProfile`; why a Python loop is slow (a preview of NumPy, taught properly in Chapter 4); reading a library's source code |

### Part 1 — Mathematics through code

Every piece of maths is measured in code first, then written in symbols.

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 4 | `frontier-vectors` | Vectors and matrices | similarity between word counts; a dataset as a matrix; NumPy introduced after lists | vectors, dot product, length, cosine similarity; matrices and matrix multiplication; NumPy arrays, broadcasting; Matplotlib |
| 5 | `frontier-calculus` | Slopes and gradients | a slope measured by nudging; a ball rolling downhill on a loss surface | derivatives, the chain rule, partial derivatives, gradients, gradient descent |
| 6 | `frontier-probability` | Probability by simulation | dice, coins and spam filters simulated | probability, conditional probability, Bayes' rule, distributions, mean, variance, standard error |
| 7 | `frontier-information` | Information | surprise measured on text | log probabilities; entropy, cross-entropy and KL divergence (they come back in every later part) |

### Part 2 — Learning from data

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 8 | `frontier-first-model` | A line through the points | linear regression by gradient descent, by hand, then with scikit-learn, matching | models, parameters, loss, training; feature scaling; pandas for the data |
| 9 | `frontier-classify` | Yes or no, then one of ten | logistic regression and softmax by hand, then scikit-learn; a spam filter and a digit reader | sigmoid, softmax, cross-entropy loss; accuracy, precision, recall, the confusion matrix |
| 10 | `frontier-generalise-basics` | Does it work on new data? | train, validation and test splits; overfitting made to happen | overfitting; regularisation; cross-validation; data leakage |
| 11 | `frontier-lab` | Your experiment harness, and how to read a paper | a small library: configs, seeds, a run log, plots with error bars; TensorBoard; a research journal | reproducibility; what a seed controls and what it doesn't; confidence intervals by bootstrap; why a single run lies; how a paper is structured, reading in three passes, arXiv |

### Part 3 — Neural networks and your own autograd

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 12 | `frontier-scalar-grad` | Autograd on single numbers | a `Value` class with `+ * tanh exp`, a graph and `backward()`; a neuron, then a small network | computational graphs; backpropagation as local gradients multiplied; topological sort; gradient checking; the bug where a value used twice loses a gradient |
| 13 | `frontier-tensor-grad` | Autograd on tensors | `Tensor` over NumPy: matmul, sum, broadcast, reshape, softmax, log, with backward for each | vector-Jacobian products; the broadcasting backward rule; numerical stability (log-sum-exp) |
| 14 | `frontier-pytorch` | A tiny PyTorch, then the real one | `Module`, `Linear`, `ReLU`, cross-entropy and `SGD` in your library, reading MNIST digits; then the same network in PyTorch, matched weight for weight; then PyTorch used properly: `Dataset`, `DataLoader`, saving models, a CNN | what `nn.Module` and `optim` actually do; PyTorch's source for `Linear` and `CrossEntropyLoss` |
| 15 | `frontier-gpu` | What a GPU is | the project opened in a free cloud GPU notebook (Kaggle or Colab); your tensor class on the GPU through CuPy; a first Triton kernel; PyTorch's profiler | memory bandwidth vs arithmetic; why big matrix multiplies are fast and small ops are slow (measured); kernels and launch overhead |

### Part 4 — Training deep networks well

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 16 | `frontier-init` | Starting weights | deep networks that fail and then train | vanishing and exploding activations, measured layer by layer; Xavier and Kaiming initialisation derived |
| 17 | `frontier-norm` | Normalisation and residuals | BatchNorm and LayerNorm by hand, then `nn.LayerNorm`; residual connections | why a 50-layer network trains with residuals and not without, measured; the residual stream |
| 18 | `frontier-optim` | Optimisers, derived | SGD, momentum, RMSProp, Adam and AdamW by hand, checked against `torch.optim`; schedulers | Adam's bias correction measured; weight decay vs L2; warmup and cosine decay |
| 19 | `frontier-debug` | Debugging training | a checklist tool that runs on any model, logging to TensorBoard | overfit one batch first; reading loss curves; dead ReLUs; gradient norms |
| 20 | `frontier-generalise` | Why deep networks generalise at all | experiments on MNIST and a synthetic task | double descent and grokking, both reproduced at small scale |

### Part 5 — Reinforcement learning

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 21 | `frontier-bandits` | Explore or exploit | a slot-machine (bandit) testbed; ε-greedy, UCB and Thompson sampling | the running average; regret; explore vs exploit (UCB comes back in MCTS) |
| 22 | `frontier-mdp` | Planning when you know the rules | a grid world; value iteration and policy iteration | states, actions, rewards, discounting; the Bellman equation |
| 23 | `frontier-qlearning` | Q-learning | tabular Q-learning on the grid world, then on CartPole with Gymnasium | learning without knowing the rules; temporal-difference updates; turning continuous states into table cells; judging an agent honestly |
| 24 | `frontier-dqn` | Deep Q-learning | DQN on CartPole, then on a small game's pixels | why naive training diverges, measured; replay buffer; target network; the 2015 Atari paper |
| 25 | `frontier-policy` | Learning the policy directly | REINFORCE, actor-critic, then PPO by hand; then Stable-Baselines3's PPO on the same task and seeds, compared | the policy gradient measured then derived; baselines; advantages and GAE; the clipped objective |

### Part 6 — Language modelling from counts

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 26 | `frontier-ngram` | Predicting the next character | bigram and n-gram models on a names dataset and TinyShakespeare, a sampler | maximum likelihood is counting; smoothing; perplexity on your own model |
| 27 | `frontier-mlp-lm` | A neural language model | Bengio et al. (2003)'s model in your own autograd, then PyTorch | embeddings as learned lookup tables; context windows |
| 28 | `frontier-bpe` | Tokenisation | a byte-pair encoding tokenizer from scratch, matched against `tiktoken`'s GPT-2 encoding; then a tokenizer trained with Hugging Face `tokenizers` | bytes and Unicode; merges; why tokenizers cause odd model behaviour (spelling, numbers, spaces) |
| 29 | `frontier-word2vec` | Word vectors | skip-gram with negative sampling by hand, then gensim on a larger corpus | vector arithmetic on meaning; what the vectors encode and what they don't |

### Part 7 — Sequences and the road to attention

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 30 | `frontier-rnn` | Recurrent networks | an RNN language model, backprop through time by hand | why gradients vanish over long sequences, measured; gradient clipping |
| 31 | `frontier-lstm` | LSTM and GRU | an LSTM cell by hand, checked against `nn.LSTM` | gates as learned switches |
| 32 | `frontier-seq2seq` | The first attention | an encoder-decoder that reverses or sorts sequences, then Bahdanau attention added | the bottleneck problem; attention as soft lookup |

### Part 8 — The Transformer, and your own GPT

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 33 | `frontier-attention` | Self-attention by hand | one attention head in NumPy, causal masking, multiple heads | queries, keys, values; why divide by √d (training breaks without it, measured) |
| 34 | `frontier-transformer` | The block | a full transformer block; pre-norm vs post-norm compared | positional information: learned, sinusoidal, then RoPE; "Attention Is All You Need" read next to your code |
| 35 | `frontier-gpt` | Your own GPT | a GPT trained on the GPU on TinyStories (about 10–30M parameters), writing coherent short stories | the training loop at scale: mixed precision (AMP), gradient accumulation, checkpoints, validation loss, `torch.compile` |
| 36 | `frontier-sampling` | Generating text | a generator with a KV cache; temperature, top-k, top-p | why the KV cache is fast, measured; sampling vs quality and diversity |
| 37 | `frontier-gpt2` | Real models: GPT-2 and Hugging Face | GPT-2 (124M) weights loaded into your own GPT class, matching Hugging Face's logits to 1e-4; then `transformers` and the Hub used properly: loading models, `generate`, `datasets` | weight files (`safetensors`); the proof that your implementation is the real thing; reading a model card |

### Part 9 — Scale and systems

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 38 | `frontier-flops` | Counting compute and memory | a calculator for parameters, FLOPs and memory of any GPT config, checked against measurements | 6·N·D; activation memory; gradient checkpointing measured |
| 39 | `frontier-scaling` | Scaling laws, measured | 6–10 small GPTs of different sizes, and a power-law fit | Kaplan and Chinchilla in miniature; compute-optimal size; the limits of extrapolation |
| 40 | `frontier-quantise` | Smaller numbers | int8 and 4-bit quantisation by hand, error measured; then `bitsandbytes` | floating-point formats (fp32, bf16, fp16, int8) |
| 41 | `frontier-flash` | Faster attention | online softmax in NumPy, then a tiled attention kernel in Triton, checked against `scaled_dot_product_attention` | why attention is memory-bound; the FlashAttention idea |
| 42 | `frontier-parallel` | Training on many GPUs, simulated | data parallelism with several processes using `torch.distributed`; tensor and pipeline parallelism in a small simulator | all-reduce; ZeRO / FSDP sharding |
| 43 | `frontier-moe-ssm` | Beyond the dense transformer | a mixture-of-experts layer in your GPT; a minimal Mamba-style selective scan compared at equal compute | sparse vs dense compute; routing collapse; why attention costs n² |

### Part 10 — From text predictor to assistant

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 44 | `frontier-sft` | Supervised fine-tuning | a fine-tuning loop by hand on a small open chat model (about 0.5B parameters, e.g. Qwen2.5-0.5B), a chat template written by hand; then TRL's `SFTTrainer` doing the same | why a pretrained model doesn't follow instructions; loss masking on the prompt |
| 45 | `frontier-lora` | LoRA | a LoRA layer by hand, then `peft`; QLoRA with `bitsandbytes` | low-rank updates and why they work; memory measured |
| 46 | `frontier-evals` | Evaluating language models | an evaluation harness by hand (exact match, multiple choice by log-probability, pass@k, LLM-as-judge); then `lm-evaluation-harness` on the same model | contamination; held-out sets; error bars on evals |

### Part 11 — Language meets reinforcement learning (Q-learning and NLP together)

It starts with Q-learning on text and ends with the methods used to train reasoning models. Each method is built by hand on your own GPT, then run with TRL's trainer on the 0.5B model.

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 47 | `frontier-text-env` | A world made of words | a small text-adventure environment with the Gymnasium interface | language as states and actions; why the action space is huge |
| 48 | `frontier-text-q` | Q-learning on text | tabular Q-learning on the text game, then a DQN whose state is a text encoder and whose actions are scored commands (DRRN-style) | representing states with language; generalising to unseen rooms, measured |
| 49 | `frontier-lm-as-policy` | A language model is a policy | your GPT viewed as an RL agent: each token is an action, the text so far is the state | the MDP over tokens; sparse rewards; Q-values as logits (soft Q-learning), derived |
| 50 | `frontier-reinforce-lm` | Policy gradient on a language model | REINFORCE on your GPT with a verifiable reward (correct sums) | the KL penalty to a reference model, and the collapse without it (shown) |
| 51 | `frontier-ppo-lm` | PPO for language models | PPO with a value head and GAE by hand; then TRL's PPO | per-token advantages; RLHF's training loop from the InstructGPT paper |
| 52 | `frontier-reward-models` | Learning what people prefer | a reward model on preference pairs (Bradley–Terry), then RLHF against it | reward hacking, made to happen and measured; RLAIF and Constitutional AI |
| 53 | `frontier-dpo` | Skipping the reward model | DPO derived and trained by hand; then TRL's `DPOTrainer`; compared with PPO | the closed form of the KL-regularised optimum |
| 54 | `frontier-grpo` | Reinforcement learning for reasoning | GRPO by hand on arithmetic and logic puzzles with a rule-based verifier; then TRL's `GRPOTrainer` on the 0.5B model | why verifiable rewards are powerful; reasoning length growing during training, measured; the DeepSeek-R1 paper |

### Part 12 — Search and self-play: AlphaZero, and AlphaZero for language

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 55 | `frontier-minimax` | Game trees | tic-tac-toe and Connect Four engines with minimax and alpha-beta | game trees; why exhaustive search fails at chess and Go sizes |
| 56 | `frontier-mcts` | Monte Carlo tree search | MCTS with UCT on Connect Four | UCB from Chapter 21 applied to trees |
| 57 | `frontier-alphazero` | AlphaZero | a policy-value network guiding MCTS, trained by self-play on Connect Four | self-play → train → evaluate; Elo ratings; the AlphaGo Zero and AlphaZero papers |
| 58 | `frontier-muzero` | MuZero: learning the rules too | a small MuZero on Connect Four and a simple game | learned dynamics models; planning in latent space |
| 59 | `frontier-test-time` | Thinking longer at answer time | best-of-n with a verifier, majority vote, a process reward model scoring each step | test-time compute scaling, measured: accuracy vs samples |
| 60 | `frontier-reasoning-search` | AlphaZero for reasoning | MCTS over reasoning steps with your language model as the policy; then expert iteration: search finds better answers, the model is trained on them, repeat | where the two lines of work meet |

### Part 13 — Beyond text

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 61 | `frontier-generative` | Autoencoders, VAEs and diffusion | a VAE and a small diffusion model generating MNIST digits by hand; then `diffusers` with a pretrained model | latent variables; the ELBO; denoising as the training task |
| 62 | `frontier-multimodal` | Images and text together | a vision transformer, then a mini-CLIP; then a pretrained CLIP from the Hub | patches as tokens; contrastive learning |

### Part 14 — Understanding and aligning what you built

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 63 | `frontier-interp` | Looking inside a GPT | attention viewer, logit lens and activation patching by hand on your GPT; induction heads found forming during training; then TransformerLens on GPT-2 | mechanistic interpretability; the residual stream; Anthropic's transformer-circuits papers |
| 64 | `frontier-features` | Features and sparse autoencoders | a sparse autoencoder on your GPT's activations, features labelled by hand | superposition (the toy model reproduced); dictionary learning |
| 65 | `frontier-safety` | Alignment and safety, by experiment | specification gaming, sycophancy in a fine-tuned model, a red-teaming harness, small dangerous-behaviour evals | what labs' safety teams do and why |

### Part 15 — Research practice and capstone

| # | Track | Chapter | Built | Taught |
|---|---|---|---|---|
| 66 | `frontier-reproduce` | Reproduce a paper | one recent small-scale paper reproduced end to end, chosen from a shortlist when the chapter is written | finding the details papers leave out; reporting what didn't reproduce |
| 67 | `frontier-capstone` | Your own idea | an original experiment from *Open questions* (or the learner's own), written up as a paper, in a public repository | choosing a question small enough to answer; ablations; writing results people trust |

## Open questions: where "make the algorithms better" starts

Each chapter's last lesson from Part 3 on poses one of these, or something like it, at a scale the 3060 can answer in an hour. They're real research questions. Some have partial answers in the literature, which the lesson points to *after* the learner has tried.

- **Training:** does a learning-rate schedule learned from the loss curve beat cosine decay on your GPT? What makes grokking start sooner?
- **RL:** can a learned exploration bonus make DQN solve a sparse-reward game that ε-greedy can't?
- **Tokenisation:** does a tokenizer trained on the task (arithmetic) make GRPO learn faster than GPT-2's tokenizer?
- **Architecture:** at equal compute, where does a state-space model beat your GPT, and where does it lose?
- **RL for language:** can a value function trained by Q-learning on tokens (Chapter 49) replace GRPO's group baseline and need fewer samples?
- **Search:** does MCTS over reasoning steps beat best-of-n at the same compute? At what model size does the answer flip?
- **Self-improvement:** in the expert-iteration loop (Chapter 60), when does improvement stop, and does a curriculum of harder problems keep it going?
- **Self-play for language:** two copies of your model, one setting puzzles and one solving them. Does it improve both?
- **Interpretability:** can you find the circuit your GRPO-trained model uses to carry a digit?

## Portfolio: what the learner ends with

1. A tensor autograd library that trains an MNIST network, matched against PyTorch.
2. A GPT written from scratch that loads GPT-2's real weights and reproduces its outputs.
3. A scaling-law fit from your own runs.
4. A model fine-tuned and RL-trained with the industry tools (TRL, PEFT), evaluated with `lm-evaluation-harness`.
5. A tiny reasoner trained with GRPO and improved with search, with the curves.
6. A small AlphaZero that beats your own alpha-beta engine.
7. An interpretability finding in your own model.
8. One paper reproduction and one original experiment, both written up, in public repositories.

Honest note: labs hire on demonstrated skill, and these are the things they ask about (implement attention, debug a training run, explain an RL objective, use the standard tools, reproduce a result). The series can build that skill. It can't promise a job.

## How lessons are written

As in Q-Arcade (`docs/q-arcade-series-plan.md`, *How lessons are written*) and Forge: Markdown lessons in `src/labs/project-studio/tracks/frontier-*/`, tests that check each step, prediction boxes with verify scripts, Your turn steps with hints and answers, and a `tracks/frontier.walkthrough.js` with wrong answers per step, walked by `src/labs/project-studio/frontier.desktop.test.js`.

A chapter usually runs: build it by hand → check it against the library → use the tool for something bigger than the hand-built version could do → paper → open question.

Long training runs are made test-friendly two ways: the step's test runs a tiny version (seconds, CPU, two threads), and the bigger run is a separate command the learner starts, whose saved results a later step checks only for shape (the file exists, the loss went down), never for an exact number.

Chapters needing a GPU-only library (Triton, `bitsandbytes` 4-bit) teach the idea with a CPU version that every learner runs, and the library itself as a GPU or cloud step.

## Testing safely on the authoring machine

An agent running PyTorch earlier froze the owner's PC. Every check run while writing follows these rules, with no exceptions:

1. **The guard script.** `scripts/frontier-safe-run.mjs` (Node, so it needs no Python package) runs one command with:
   - the GPU hidden (`CUDA_VISIBLE_DEVICES=""`);
   - threads capped at 2 (`OMP_NUM_THREADS`, `MKL_NUM_THREADS`, `torch.set_num_threads`);
   - a hard timeout, 120 s by default;
   - a memory ceiling, 2 GB by default, measured over the whole process tree every 1.5 s; the tree is killed if it goes over.

   Usage: `node scripts/frontier-safe-run.mjs [--timeout s] [--mem MB] [--threads n] -- <command>`. Exit code 124 means it timed out, 137 means it hit the memory limit. Both were tested on 2026-10-08.

   Every Python run that imports NumPy, PyTorch or any ML library goes through it.
2. **One run at a time,** in the foreground. No parallel runs, no background training, no dev servers left running.
3. **Tiny configs only.** Model, batch and data sizes are chosen so a check finishes in under a minute and stays well under the memory ceiling. Full-size runs are never started on this machine.
4. **No GPU use** unless the owner asks for it in that session.
5. **Downloads over 1 GB** (models, datasets) only with the owner's OK. Smaller ones are cached once, inside the project's ignored data folder.
6. **Only what's needed.** Following the owner's standing rule, code whose result is obvious isn't run just to be safe. Runs go to the checks a lesson actually depends on.

The walkthrough test (`frontier.desktop.test.js`) runs every command with the GPU hidden and two threads, and the whole test is itself run through the guard:

```powershell
node scripts/frontier-safe-run.mjs --timeout 590 --mem 4096 -- npx vitest run src/labs/project-studio/frontier.desktop.test.js
```

`FRONTIER_UNTIL=<lesson id prefix>` stops after that lesson. `FRONTIER_KEEP=<folder>` keeps the finished project, and `FRONTIER_START=<that folder>` with `FRONTIER_FROM=<lesson id prefix>` resumes from it. Use these to keep each run under the 590-second limit as the series grows.

## Spikes to measure before writing (all through the guard script)

1. **Package resolution on Windows:** `pip install --dry-run` for the CPU builds of PyTorch, `transformers`, `datasets`, `peft`, `trl` and TransformerLens, to fix versions without installing heavy packages twice.
2. **CPU sizes:** the largest GPT, batch and step count whose *small* run finishes in about 5 minutes on 2 threads, and whose check finishes in under 30 seconds.
3. **Cloud notebook:** the same project running in Kaggle or Colab, with the GPU used. The owner runs this one; the agent only writes the notebook.

## Decisions made (no input needed)

- **Python throughout.** PyTorch is the deep-learning framework. JAX is mentioned in Chapter 42 only.
- **Standalone.** Nothing links out as required reading. Other series may be linked as optional extra practice.
- **Datasets** are small and downloadable: names, TinyShakespeare, MNIST, TinyStories (a slice for *small* runs), and arithmetic problems generated locally.
- **Written in plan order without review pauses.** The owner reviews by doing the lessons.

## Progress

Lessons live in `src/labs/project-studio/tracks/frontier-*/`, Your turn answers in each chapter's `answers/`, prediction verify scripts in its `verify/`, and every step's walkthrough entry in `tracks/frontier.walkthrough.js`. The series is registered in `series.js` (all 68 chapter names) and `learningProfile.js`. Handoff for the next session: `docs/frontier-handoff.md`.

| Chapter | Lessons | Walkthrough |
|---|---|---|
| 0 · A Real Project | 0.1–0.3 | passes (2026-10-08, 465 s, peak 788 MB) |
| 1 · From Script to Software | 1.1–1.3 written; 1.4–1.5 to come | 1.1–1.3 pass (2026-10-09, walked from a kept Chapter 0 project) |
| 2–67 | | not written |

Changes from the chapter tables above, made while writing: the cloud notebook moved from Chapter 0 to Chapter 15, where a GPU is first useful.

Measured while writing (Windows 11, Python 3.14.3, the walkthrough's CPU-only environment):

- PyPI has Windows wheels for Python 3.12–3.14 for `torch==2.14.1` and `numpy==2.5.3`; the Windows `torch` from PyPI is `2.14.1+cpu`.
- An editable install (`pip install -e .`, setuptools) writes `__editable__.frontier-0.1.0.pth` holding one line, the path to `src`.
- `mypy==2.4.0 --strict` accepts `words = []` followed by `words.append(word)`, but rejects `counts = {}` followed by `counts.get(...)` (`var-annotated`): lesson 1.3 teaches the variable hint because of it.
- `matmul_difference(64, 0)` = 1.07e-14 and `matmul_difference(512, 0)` = 2.13e-13 (NumPy vs PyTorch CPU, float64).
