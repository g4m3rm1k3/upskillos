// Learner actions and deliberately wrong answers for this chapter.
export const REACT_WALKTHROUGH = {
  "winforms-react/04-01-a-small-react-screen#Start React and run the screen": {
    "run": [
      "npm.cmd --prefix Web install"
    ],
    "wrong": [
      {
        "name": "broken JSX",
        "editFiles": {
          "Web/src/App.jsx": [
            [
              "<h1>FormDesk</h1>",
              "<h1>FormDesk</div>"
            ]
          ]
        },
        "fails": [
          0
        ]
      }
    ]
  },
  "winforms-react/04-01-a-small-react-screen#Your turn: one request or many": {
    "files": {
      "Web/src/formatCount.js": "export function formatCount(count) {\n  const noun = count === 1 ? 'request' : 'requests';\n  return 'Previewed ' + count + ' ' + noun;\n}"
    },
    "wrong": [
      {
        "name": "plural at one",
        "files": {
          "Web/src/formatCount.js": "export function formatCount(count) {\n  return 'Previewed ' + count + ' requests';\n}"
        },
        "fails": [
          0
        ]
      }
    ]
  },
  "winforms-react/04-02-inputs-and-feedback#Separate validation from the screen": {
    "wrong": [
      {
        "name": "accept blank name",
        "edit": [
          [
            "if (name.trim() === '') return 'Enter a name.';",
            ""
          ]
        ],
        "fails": [
          0
        ]
      }
    ]
  },
  "winforms-react/04-02-inputs-and-feedback#Control the fields and show feedback": {
    "wrong": [
      {
        "name": "broken controlled JSX",
        "edit": [
          [
            "</form>",
            "</wrong>"
          ]
        ],
        "fails": [
          0
        ]
      }
    ]
  },
  "winforms-react/04-02-inputs-and-feedback#Your turn: require a whole quantity": {
    "files": {
      "Web/src/validateDraft.js": "export function validateDraft(name, quantityText) {\n  if (name.trim() === '') return 'Enter a name.';\n  if (name.trim().length > 40) return 'Use 40 characters or fewer.';\n  if (quantityText.trim() === '') return 'Enter a whole quantity.';\n  const quantity = Number(quantityText);\n  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {\n    return 'Use a quantity from 1 to 100.';\n  }\n  return '';\n}"
    },
    "wrong": [
      {
        "name": "range alone permits a fraction",
        "files": {
          "Web/src/validateDraft.js": "export function validateDraft(name, quantityText) {\n  if (name.trim() === '') return 'Enter a name.';\n  if (name.trim().length > 40) return 'Use 40 characters or fewer.';\n  if (quantityText.trim() === '') return 'Enter a whole quantity.';\n  const quantity = Number(quantityText);\n  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 100) {\n    return 'Use a quantity from 1 to 100.';\n  }\n  return '';\n}"
        },
        "fails": [
          0
        ]
      }
    ]
  },
  "winforms-react/04-03-a-local-webview-host#Initialize WebView2 after the form is shown": {
    "run": [
      "npm.cmd --prefix Web run build"
    ],
    "wrong": [
      {
        "name": "broken initialization name",
        "edit": [
          [
            "EnsureCoreWebView2Async",
            "NotARealMethodAsync"
          ]
        ],
        "fails": [
          0
        ]
      }
    ]
  },
  "winforms-react/04-03-a-local-webview-host#Run policy examples without a window": {
    "wrong": [
      {
        "name": "always trust origin",
        "editFiles": {
          "ReactHost/HostPolicy.cs": [
            [
              "return uri.Scheme == \"https\"",
              "return true || uri.Scheme == \"https\""
            ]
          ]
        },
        "fails": [
          0
        ]
      }
    ]
  },
  "winforms-react/04-03-a-local-webview-host#Your turn: permit only the exact page": {
    "files": {
      "ReactHost/HostPolicy.cs": "namespace FormDesk.ReactHost;\n\npublic static class HostPolicy\n{\n    public static bool IsAppPage(string address)\n    {\n        if (!Uri.TryCreate(address, UriKind.Absolute, out Uri? uri)) return false;\n        return uri.Scheme == \"https\" && uri.Host == \"formdesk.example\"\n            && uri.IsDefaultPort && uri.UserInfo == \"\" && uri.Query == \"\" && uri.Fragment == \"\"\n            && (uri.AbsolutePath == \"/\" || uri.AbsolutePath == \"/index.html\");\n    }\n}"
    },
    "wrong": [
      {
        "name": "query allowed",
        "files": {
          "ReactHost/HostPolicy.cs": "namespace FormDesk.ReactHost;\n\npublic static class HostPolicy\n{\n    public static bool IsAppPage(string address)\n    {\n        if (!Uri.TryCreate(address, UriKind.Absolute, out Uri? uri)) return false;\n        return uri.Scheme == \"https\" && uri.Host == \"formdesk.example\"\n            && uri.IsDefaultPort && uri.UserInfo == \"\"\n            && (uri.AbsolutePath == \"/\" || uri.AbsolutePath == \"/index.html\");\n    }\n}"
        },
        "fails": [
          0
        ]
      }
    ]
  },
  "winforms-react/04-04-csharp-is-the-authority#Wait for replies and release listeners": {
    "wrong": [
      {
        "name": "ignore correlation",
        "edit": [
          [
            "const request = pending.get(reply.id);",
            "const request = pending.values().next().value;"
          ]
        ],
        "fails": [
          0
        ]
      }
    ]
  },
  "winforms-react/04-04-csharp-is-the-authority#Await the host from React": {
    "wrong": [
      {
        "name": "broken async handler",
        "edit": [
          [
            "async function preview(event)",
            "function preview(event)"
          ]
        ],
        "fails": [
          0
        ]
      }
    ]
  },
  "winforms-react/04-04-csharp-is-the-authority#Prove the C# boundary rejects bypasses": {
    "wrong": [
      {
        "name": "omit C# domain validation",
        "editFiles": {
          "ReactHost/BridgeProtocol.cs": [
            [
              "string error = RequestRules.Validate(name, quantity);",
              "string error = \"\";"
            ]
          ]
        },
        "fails": [
          0
        ]
      },
      {
        "name": "break WinForms event hook",
        "editFiles": {
          "ReactHost/ShellForm.cs": [
            [
              "core.WebMessageReceived +=",
              "core.NoSuchEvent +="
            ]
          ]
        },
        "fails": [
          1
        ]
      }
    ]
  },
  "winforms-react/04-04-csharp-is-the-authority#Your turn: say who accepted the request": {
    "files": {
      "Web/src/resultMessage.js": "export function resultMessage(result) {\n  const prefix = result.ok ? 'Accepted by C#: ' : 'Needs attention: ';\n  return prefix + result.message;\n}"
    },
    "wrong": [
      {
        "name": "no authority prefix",
        "files": {
          "Web/src/resultMessage.js": "export function resultMessage(result) {\n  return result.message;\n}"
        },
        "fails": [
          0
        ]
      }
    ]
  }
};
