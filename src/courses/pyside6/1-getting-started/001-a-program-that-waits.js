// pyside6 — Getting Started — Lesson 1: A Program That Waits Instead of Finishing
// Hand-authored pilot for the PySideNotebook + autonomous Python/PySide6
// installer pipeline (see desktop/app/runtimes/python.cjs). Source:
// src/docs/tutorials/PySide6/lesson-01-pyside6.md — this is a proof-of-concept
// conversion of ONE lesson, not a bulk conversion; the rest of that series
// (and MASTERCAM-APP-ENGINEERING-MASTERCLASS's PySide6 phase, on-the-side's
// series-2-pyside6-desktop, python-tooldb's Qt lessons) is a deliberate
// follow-up once this pilot is verified working end-to-end.

export default {
  id: 'pyside6-001-a-program-that-waits',
  slug: 'a-program-that-waits',
  chapter: 1,
  order: 1,
  title: 'A Program That Waits Instead of Finishing',
  subtitle: 'Getting Started',
  tags: ['pyside6', 'qapplication', 'qwidget', 'event-loop'],

  hook: {
    question: 'Why does a GUI program have to *refuse* to end?',
    realWorldContext: 'Every program you\'ve likely written before runs top to bottom and exits. A GUI program has to do the opposite: start up, then deliberately refuse to end until something — a click, a close button — tells it to. This lesson builds the smallest possible PySide6 program: a window that opens, sits on screen, and stays open until the user closes it. Getting that inversion straight, and seeing exactly which object is responsible for it, matters more than the four lines of code that follow from it.',
    previewVisualizationId: 'PySideNotebook',
  },

  intuition: {
    prose: [
      'PySide6 is a GUI toolkit: a library that draws windows, buttons, and other visible controls and translates raw operating-system input (mouse moves, key presses, window-manager close requests) into events your code can react to. It exists because talking to the OS\'s actual windowing system directly (X11, Wayland, Win32, Cocoa) is low-level, verbose, and different on every platform — a toolkit gives one API that works the same way across all of them.',
      'The core inversion this lesson teaches: a normal script has a "next line" to run. A GUI program, once it\'s shown its window, has no next line — it has a standing readiness to react whenever something arrives. That readiness is implemented by an event loop, running inside the toolkit\'s own code, that repeatedly asks the operating system "has anything happened?" and dispatches the answer to the right piece of your code. Starting that loop is a blocking call: control does not return to the line after it until some condition (the window closing) is met — not because it\'s slow, but because *you* don\'t control when it returns, the event loop does.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Terms Used in This Lesson',
        body: '- **GUI toolkit** — a library that draws windows and controls and translates raw OS input into events your code can react to.\n- **Event loop** — a loop inside the toolkit\'s own code that repeatedly checks "has anything happened?" and dispatches it to your code. It exists because a GUI program can\'t know in advance *when* the user will click something.\n- **Blocking call** — a function call that does not return control until some condition is satisfied. What defines it is that *you* don\'t control when it returns — something else does.\n- **Headless / offscreen rendering** — running GUI code with no real display attached, telling the toolkit to render into memory instead of onto a physical screen (used for automated testing/CI, and in this lesson\'s own verified example runs).',
      },
      {
        type: 'definition',
        title: 'Objects and Methods Used',
        body: '- **`QApplication`** — the single object, per process, that represents "this GUI program is running." Constructed `QApplication(sys.argv)`. Owns and runs the event loop, tracks every top-level window, holds process-wide GUI state. Every PySide6 program must construct exactly one before creating any widget. `QApplication.instance()` always returns that same object from anywhere in the program — genuine identity (`is`), not just equal-looking values. This is the Singleton pattern.\n- **`QWidget`** — the base class for every visible thing in PySide6: a window, a button, a text box. Constructed `QWidget()` with no required arguments. Depends on a `QApplication` already existing in the process, or construction raises an error.\n- **`QWidget.show()`** — real signature `show() -> None`. Flips the widget\'s internal visibility flag and asks the OS to actually draw it. It does not start any loop and does not block — a widget exists as a Python object the instant `QWidget()` returns, but stays invisible until `show()` is called.\n- **`QApplication.exec()`** — real signature `exec() -> int`. Starts Qt\'s own event loop and hands control of the program to it. Returns only once the loop is told to stop (a window closing, or code calling `.quit()`). Its return value is meant to be handed to `sys.exit(...)`, which is why `sys.exit(app.exec())` appears in nearly every PySide6 program.',
      },
    ],
    visualizations: [
      {
        id: 'PySideNotebook',
        title: 'Hands-On: A Program That Waits',
        caption: 'Click Run to open a real native window — this only works in the OpenCalc desktop app.',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Complete Program',
              prose: [
                'This is the finished main.py this lesson builds, three jobs in sequence: create the one shared application object, construct and display exactly one window, and hand control over to Qt\'s own event loop so the process stays alive until you close the window.',
              ],
              filename: 'main.py',
              code: 'from PySide6.QtWidgets import QApplication, QWidget\nimport sys\n\napp = QApplication(sys.argv)\nwindow = QWidget()\nwindow.setWindowTitle("Lesson 1 Lab")\nwindow.show()\nsys.exit(app.exec())\n',
            },
            {
              id: 2,
              cellTitle: 'Before app.exec() vs. After',
              prose: [
                'The timing trace from Concept Unit 3: notice that everything before app.exec() runs immediately, top to bottom, exactly like a normal script — and that the final print only happens after the window is closed (here, a QTimer.singleShot fires app.quit() after 50ms so the lab ends on its own instead of waiting for a click).',
              ],
              filename: 'timing_trace.py',
              code: 'from PySide6.QtWidgets import QApplication, QWidget\nfrom PySide6.QtCore import QTimer\nimport sys\n\napp = QApplication(sys.argv)\nwindow = QWidget()\nwindow.setWindowTitle("Lesson 1 Lab")\nwindow.show()\n\nprint("show() has returned. Program is still running, no clicks possible yet.")\nprint("window.isVisible():", window.isVisible())\n\nQTimer.singleShot(50, app.quit)\nprint("About to call app.exec() - this will block until quit() fires")\nexit_code = app.exec()\nprint("app.exec() returned:", exit_code, type(exit_code))\n',
            },
          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: {
    prose: [
      'This is the Singleton pattern: exactly one instance of a class permitted to exist, with a way for any code anywhere to retrieve that one instance (`QApplication.instance()`). Nothing in Python\'s own language rules enforces this — Qt raises a runtime error at the library level if you try to construct a second `QApplication`. The same idea shows up in a database connection pool shared across a web server process, a logging system\'s single shared logger, and a game engine\'s single `GameManager`/`World` object. The alternative not chosen — every widget carrying its own private event loop and list of sibling windows — is roughly how some very early GUI toolkits worked; the real cost is that coordinating between windows becomes something every widget has to solve for itself, redundantly, instead of once, centrally.',
      'The event loop itself is a genuine computer-science idea, not routine syntax: a web server\'s request-handling loop, a video game\'s main loop, an OS kernel\'s scheduler loop, and a chat app waiting on a network socket all share the same shape — a program that has finished "setup" but is not finished running, because its actual job is to react to things it cannot predict the timing of. The alternative nearly every beginner reaches for first, a hand-rolled `while True: check_for_click(); time.sleep(0.01)`, either burns CPU constantly re-checking nothing (no sleep) or adds real input lag (with one). Qt\'s `exec()` is written against the OS\'s own native "wake me up only when something happens" mechanisms — instant reaction without a hand-written loop ever burning CPU doing nothing. The real cost this design carries: any code meant to run after the window closes has to go after `app.exec()`, and any code meant to run while the window is open has to be structured as a reaction to an event, not a later line in the same top-to-bottom script.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If Run does nothing, check the environment banner above the editor — Python + PySide6 may still be installing (PySide6 alone is a large download and can take a few minutes the first time).',
      'The window that opens is a real, separate window from OpenCalc itself — look for it in your taskbar if it doesn\'t appear on top.',
      'Closing the window is what ends the program — there\'s no timeout in the first cell, unlike the second cell\'s timing trace.',
    ],
    futureLinks: [
      'Next lesson: giving this bare window something to show and something to click, and the signal/slot mechanism that turns a click into code running.',
    ],
  },

  quiz: [],

  mentalModel: [
    'I can explain why a GUI program can\'t just run top to bottom like a normal script.',
    'I know that QApplication is a singleton — exactly one per process, retrievable from anywhere via QApplication.instance().',
    'I can explain the two-step lifecycle of a QWidget: constructed (invisible) vs. shown (visible) are genuinely separate steps.',
    'I understand that app.exec() is a blocking call — it does not return until the event loop is told to stop.',
    'I have run this lesson\'s program for real and seen an actual native window open and close.',
  ],

  checkpoints: ['read-intuition'],
}
