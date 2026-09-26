// Lesson order for Lab 23: each paragraph followed by what makes it concrete (see LessonFlow).
// Generated from the scratch spec; the PyTorch fold-outs hold code and output from a local run.
export const blocks = {
  "l23-tensors": [
    {
      "p": 0
    },
    {
      "p": 1
    },
    {
      "p": 2
    },
    {
      "p": 3
    },
    {
      "cell": 0
    },
    {
      "bridge": {
        "label": "The same in PyTorch: autograd accumulates into .grad",
        "title": "",
        "body": [
          "Runs on your own machine with `pip install torch` (checked with PyTorch 2.14.0, CPU). It does not run in the browser."
        ],
        "code": "import torch\nx = torch.tensor(3.0, requires_grad=True)\ny = x ** 2 + 2 * x\ny.backward()\nprint(x.grad)                 # dy/dx = 2x + 2 at x = 3\ny = x ** 2 + 2 * x\ny.backward()                  # no zeroing in between\nprint(x.grad)                 # accumulated: 8 + 8",
        "output": "tensor(8.)\ntensor(16.)"
      }
    },
    {
      "predict": {
        "prompt": "x = 2 with requires_grad=True and y = x³. You call y.backward() twice without zeroing. What is x.grad?",
        "answer": 24,
        "explain": "dy/dx = 3x² = 12, and backward adds it into .grad each time: 12 + 12 = 24.",
        "misconceptions": [
          {
            "answer": 12,
            "feedback": "That is one backward pass. The second adds another 12 because .grad was not cleared."
          }
        ]
      }
    },
    {
      "p": 4
    },
    {
      "math": true
    }
  ],
  "l23-modules": [
    {
      "p": 0
    },
    {
      "p": 1
    },
    {
      "p": 2
    },
    {
      "cell": 0
    },
    {
      "bridge": {
        "label": "The same in PyTorch: nn.Linear and nn.Sequential",
        "title": "",
        "body": [
          "Runs on your own machine with `pip install torch` (checked with PyTorch 2.14.0, CPU). It does not run in the browser."
        ],
        "code": "import torch.nn as nn\nlayer = nn.Linear(5, 1)\nprint(layer.weight.shape, layer.bias.shape)\nmodel = nn.Sequential(nn.Linear(2, 8), nn.ReLU(), nn.Linear(8, 2))\nprint(sum(p.numel() for p in model.parameters()))",
        "output": "torch.Size([1, 5]) torch.Size([1])\n42"
      }
    },
    {
      "predict": {
        "prompt": "How many parameters does nn.Linear(10, 4) have?",
        "answer": 44,
        "explain": "A 4 × 10 weight (40) plus 4 biases: 44.",
        "misconceptions": [
          {
            "answer": 40,
            "feedback": "Add the 4 biases."
          },
          {
            "answer": 14,
            "feedback": "10 + 4 adds the widths; the weight has 10 × 4 entries."
          }
        ]
      }
    },
    {
      "p": 3
    },
    {
      "p": 4
    },
    {
      "math": true
    }
  ],
  "l23-loop": [
    {
      "p": 0
    },
    {
      "p": 1
    },
    {
      "cell": 0
    },
    {
      "figure": "ZeroGradCurves",
      "caption": "The playground’s loop (momentum SGD with dropout) with and without zero_grad: training loss, log scale."
    },
    {
      "bridge": {
        "label": "The same in PyTorch: the loop with zero_grad",
        "title": "",
        "body": [
          "Runs on your own machine with `pip install torch` (checked with PyTorch 2.14.0, CPU). It does not run in the browser."
        ],
        "code": "import torch\ntorch.manual_seed(0)\nx = torch.linspace(-2, 2, 64).unsqueeze(1); y = 3 * x - 1\nmodel = torch.nn.Linear(1, 1)\nopt = torch.optim.SGD(model.parameters(), lr=0.05)\nfor step in range(200):\n    opt.zero_grad()                                   # delete this line to see accumulation\n    loss = torch.nn.functional.mse_loss(model(x), y)\n    loss.backward()\n    opt.step()\nprint(round(loss.item(), 6), [round(v, 3) for v in (model.weight.item(), model.bias.item())])",
        "output": "0.0 [3.0, -1.0]"
      }
    },
    {
      "p": 2
    },
    {
      "cell": 1
    },
    {
      "predict": {
        "prompt": "Dropout with p = 0.5 is on during training. A value of 1 survives. What value does it pass on?",
        "answer": 2,
        "explain": "Survivors are scaled by 1/(1 − p) = 2, so that on average the layer’s output is unchanged; in eval mode nothing is dropped or scaled.",
        "misconceptions": [
          {
            "answer": 1,
            "feedback": "Survivors are scaled by 1/(1 − p) so the average stays the same: 1/0.5 = 2."
          }
        ]
      }
    },
    {
      "p": 3
    },
    {
      "p": 4
    },
    {
      "math": true
    }
  ],
  "l23-verify": [
    {
      "p": 0
    },
    {
      "p": 1
    },
    {
      "cell": 0
    },
    {
      "p": 2
    },
    {
      "p": 3
    },
    {
      "p": 4
    },
    {
      "cell": 1
    },
    {
      "predict": {
        "prompt": "np.allclose(a, b, rtol=1e-5, atol=0) with a = 100.0003 and b = 100. Does it pass? (1 = yes, 0 = no)",
        "answer": 1,
        "explain": "The test is |a − b| ≤ atol + rtol·|b|: 0.0003 ≤ 0 + 1e-5 × 100 = 0.001, so yes. The same absolute difference next to b = 0.01 would fail."
      }
    },
    {
      "math": true
    }
  ],
  "l23-checkpoints": [
    {
      "p": 0
    },
    {
      "p": 1
    },
    {
      "p": 2
    },
    {
      "cell": 0
    },
    {
      "figure": "ResumeDrift",
      "caption": "The playground’s run, interrupted at step 40 and resumed with and without the optimizer’s state: how far the weights end up from the uninterrupted run."
    },
    {
      "bridge": {
        "label": "The same in PyTorch: resuming with and without the optimizer’s state",
        "title": "",
        "body": [
          "Runs on your own machine with `pip install torch` (checked with PyTorch 2.14.0, CPU). It does not run in the browser."
        ],
        "code": "import torch, io\ntorch.manual_seed(0)\nx = torch.linspace(-2, 2, 64).unsqueeze(1); y = 3 * x - 1\ndef make():\n    torch.manual_seed(1)\n    m = torch.nn.Linear(1, 1); return m, torch.optim.SGD(m.parameters(), lr=0.02, momentum=0.9)\ndef train(m, opt, steps):\n    for _ in range(steps):\n        opt.zero_grad(); torch.nn.functional.mse_loss(m(x), y).backward(); opt.step()\nm, opt = make(); train(m, opt, 40)                                  # uninterrupted: 40 steps\na, oa = make(); train(a, oa, 20)                                    # interrupted after 20\nbuf = io.BytesIO(); torch.save({\"model\": a.state_dict(), \"opt\": oa.state_dict()}, buf); buf.seek(0)\nck = torch.load(buf)\nfor with_opt in (True, False):\n    b, ob = make(); b.load_state_dict(ck[\"model\"])\n    if with_opt: ob.load_state_dict(ck[\"opt\"])\n    train(b, ob, 20)\n    print(\"with optimizer state\" if with_opt else \"without           \", (b.weight - m.weight).abs().item())",
        "output": "with optimizer state 0.0\nwithout            0.30520129203796387"
      }
    },
    {
      "predict": {
        "prompt": "nn.Linear(10, 4) trained with Adam. How many numbers are in the optimizer’s state, not counting step counters?",
        "answer": 88,
        "explain": "Adam keeps m and v for each of the 44 parameters: 88 numbers, twice the model’s size.",
        "misconceptions": [
          {
            "answer": 44,
            "feedback": "That is the model’s size. Adam keeps two numbers per parameter, m and v."
          }
        ]
      }
    },
    {
      "p": 3
    },
    {
      "cell": 1
    },
    {
      "p": 4
    },
    {
      "math": true
    },
    {
      "ladder": "torch"
    }
  ]
}
