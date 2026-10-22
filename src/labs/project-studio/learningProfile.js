// These are entry contracts, not claims that every lesson has passed review.
//
// The family profiles below (forge-, aml-, cpp-, ml-) were written for the chapters that existed
// then. A chapter added to a family later doesn't inherit one, because later chapters need more:
// it is labelled unreviewed until it gets its own line here.
const REVIEWED_CHAPTERS = new Set([
  'forge-tools', 'forge-script', 'forge-functions', 'forge-classes', 'forge-package', 'forge-data', 'forge-saving', 'forge-records',
  'aml-python', 'aml-project',
  'cpp-foundations', 'cpp-language-basics', 'cpp-memory', 'cpp-classes', 'cpp-generic', 'cpp-dsa', 'cpp-engineering',
  'cpp-systems', 'cpp-networking', 'cpp-graphics', 'cpp-engines', 'cpp-game',
  'ml-software', 'ml-data', 'ml-math', 'ml-first-model', 'ml-web', 'ml-database', 'ml-security', 'ml-evaluation',
  'ml-classification', 'ml-trees', 'ml-clustering', 'ml-pca', 'ml-neural', 'ml-pytorch', 'ml-nlp', 'ml-studio',
  'ml-capstone', 'ml-timeseries', 'ml-boosting',
]);
const SERIES_KEYS = new Set(['forge', 'applied-ml', 'cpp-mastery', 'ml-production']);

export function learningProfile(key) {
  if (key === 'pyinternals' || key.startsWith('pyinternals-')) return { level: 'advanced', maturity: 'review-required', audience: 'For Python programmers who want to see underneath Python. Needs a C/C++ compiler (gcc/g++) and Python. Follow the chapters in order; C basics come first. Lesson quality review is pending.' };
  if (['winforms', 'winforms-start', 'winforms-forms', 'winforms-workflow', 'winforms-react'].includes(key)) return {
    level: ['winforms', 'winforms-start'].includes(key) ? 'beginner' : 'bridge',
    maturity: 'in-development',
    audience: key === 'winforms' || key === 'winforms-start'
      ? 'For basic Python scripters with no C# experience and only introductory React state knowledge. Start in an empty FormDesk folder on Windows with the .NET 10 SDK. C# types, functions, objects and tools are taught before forms; no CAD or add-in SDK knowledge is required. Node and WebView2 setup come later.'
      : 'Continue the preceding WinForms to React chapters in the same FormDesk folder on Windows. Earlier lessons supply the C# syntax, data model and rules used here. Native forms and Desktop checks require the .NET 10 SDK; the final chapter introduces Node, React and WebView2. Host-specific add-in integration is outside this series.',
  };
  if (key.startsWith('data-') && key !== 'data-foundations') return {
    level: 'beginner',
    maturity: 'in-development',
    audience: 'Continue the preceding Database Engineering chapters in the same Issue Desk folder: earlier chapters supply the database and every SQL idea used here. Chapter 8 installs PostgreSQL and chapter 9 installs Python and its database driver, each with setup steps in its first lesson.',
  };
  if (key === 'data' || key === 'data-foundations') return {
    level: 'beginner',
    maturity: 'in-development',
    audience: 'Start with an empty Issue Desk folder. No prior SQL, programming or other course required. Basic arithmetic and file use are enough. The opening uses the SQLite command-line tool, with setup guidance; Project Studio Desktop runs the file checks. PostgreSQL and application engineering are later planned chapters, not assumed knowledge.',
  };
  if (['mean', 'mean-start', 'mean-model', 'mean-database', 'mean-api', 'mean-angular', 'mean-quality'].includes(key)) return {
    level: 'bridge',
    maturity: 'in-development',
    audience: key === 'mean' || key === 'mean-start'
      ? 'For learners who know basic JavaScript and need practice. Begin with objects, array methods, modules and async/await before building one local task board with MongoDB, Express, Angular and Node. Basic HTML is helpful. Requires Desktop for filesystem checks, Node 22.22.3+ in the Node 22 line or Node 24, npm and local MongoDB 8. Database design and introductory TypeScript are taught here.'
      : 'Continue the preceding MEAN Stack chapters in the same task-board folder. Earlier chapters supply the files and data model. Requires Node, npm and local MongoDB; Angular tooling is introduced in chapter 5. This is a local single-operator prototype, with independent exercises and review still required.',
  };
  if (key === 'tabletop' || key.startsWith('tabletop-')) return {
    level: ['tabletop', 'tabletop-start', 'tabletop-language'].includes(key) ? 'beginner' : 'bridge',
    maturity: 'in-development',
    audience: key === 'tabletop' || key === 'tabletop-start'
      ? 'Start with an empty folder. No programming or earlier course required. Learn the games, HTML, CSS, JavaScript, SVG, Three.js and a trainable Pig opponent. Basic computer use and arithmetic are enough; tools are introduced when needed.'
      : 'Continue the preceding Tabletop Workshop chapters in the same project folder. All language, game and mathematics prerequisites are taught within this series; no C++ course or external project files are required.',
  };

  if (['backend', 'backend-fastapi', 'backend-django', 'backend-aspnet', 'backend-nestjs'].includes(key)) return {
    level: 'bridge',
    maturity: 'in-development',
    audience: key === 'backend'
      ? 'For learners who know variables, functions and basic control flow. Build separate backend apps with FastAPI, Django, ASP.NET Core and NestJS, in that recommended order or independently. Each framework repeats its setup and states its language prerequisites. Requires Project Studio Desktop and local Python, .NET or Node tools. Full-stack client integration follows in a separate series.'
      : key === 'backend-nestjs'
        ? 'Standalone project in a new parcel-inbox folder. Assumes JavaScript functions, promises and introductory TypeScript; requires Node 22.14+ in the Node 22/24 lines and npm. Framework setup, signed requests, durable inboxes, workers and testing are taught here. The Node 22 SQLite API is experimental; production migration is an explicit extension.'
        : key === 'backend-aspnet'
          ? 'Standalone project in a new stockroom folder. Assumes variables, functions and conditionals in any language. Requires the .NET 10 SDK; the C# constructs used here, controllers, dependency injection, authentication, transactions and tests are introduced in this section.'
          : 'Standalone project in a new folder. Assumes basic Python functions, dictionaries and exceptions; requires Python 3.12 or 3.13. Virtual environments, framework setup, data boundaries, authorization, persistence and tests are taught here. Complete the section in order; no files from another backend section are required.',
  };
  if (['frontend', 'frontend-start', 'frontend-design', 'frontend-javascript', 'frontend-planner', 'frontend-api', 'frontend-bootstrap', 'frontend-react', 'frontend-tailwind', 'frontend-quality', 'frontend-production', 'frontend-ship'].includes(key)) return {
    level: key === 'frontend' || key === 'frontend-start' ? 'beginner' : 'bridge',
    maturity: 'in-development',
    audience: key === 'frontend'
      ? 'No programming experience required. Learn through real frontend apps, beginning with files and semantic HTML. Requires a desktop editor, modern browser, Node.js and Git; setup is taught. Use the desktop app for file and browser checks. Follow the chapters in order in one portfolio folder.'
      : key === 'frontend-start'
        ? 'Start here with an empty folder. Learn what files, HTML elements, browser requests and development tools do before introducing JavaScript or frameworks. No prior code is assumed.'
        : 'Continue after the preceding Frontend Developer Bootcamp chapters in the same portfolio folder. Earlier HTML, CSS and JavaScript work supplies the prerequisites; library tooling and new concepts are introduced when needed. Independent design and accessibility review accompany automated checks.',
  };
  if (key === 'ui-mastery' || key.startsWith('ui-')) return {
    level: key === 'ui-foundations' || key === 'ui-mastery' ? 'beginner' : 'bridge',
    maturity: 'in-development',
    audience: key === 'ui-mastery'
      ? 'For developers who know basic HTML/CSS syntax but struggle with ugly interfaces, layout bugs, and visual hierarchy. Teaches design systems, spatial rhythm, typography, modern CSS layouts (Flexbox, Grid, Subgrid, Container Queries), color science, and UI/UX polish from first principles in one interface-studio folder.'
      : key === 'ui-foundations'
        ? 'Start here in an empty interface-studio folder. Learn why arbitrary margins and borders ruin interfaces, and master spatial grids, modular typography, and modern CSS resets.'
        : 'Continues in the same interface-studio folder, advancing through layouts, color systems, micro-interactions, forms, and a complete capstone app.',
  };
  if (key === 'games3d' || key === 'games3d-foundations') return { level: 'bridge', maturity: 'in-development', audience: 'For learners with introductory variables, conditions, loops and functions in any language. C#, terminal use, scene data, tests and 3D coordinates are taught here. Requires a local .NET SDK with .NET 8 targeting/runtime support and a graphics display. Begin with Foundations: scene editing, save/open, visible box sizing followed by validated recipes and durable object edits, UI layout, feedback and dark/light themes, and a small Q-learning bot are taught here. Play mode and later game genres remain planned.' };
  if (/^(forge|aml|cpp|ml)-/.test(key) && !REVIEWED_CHAPTERS.has(key) && !SERIES_KEYS.has(key)) {
    return { level: 'unclassified', maturity: 'in-development', audience: "This chapter's prerequisites haven't been reviewed yet. It builds on the chapters before it in this series; start there." };
  }
  if (key === 'qarcade' || key.startsWith('qarcade-')) return { level: 'bridge', maturity: 'in-development', audience: 'For Python scripters with no machine-learning background. Q-learning starts in Chapter 1; NumPy, game loops, PyTorch and Keras are taught when a lesson first needs them. Follow the chapters in order: they build one project.' };
  if (key === 'term') return { level: 'beginner', maturity: 'in-development', audience: 'No terminal experience needed: the macOS terminal (zsh) taught from zero, one command at a time, on a real project folder. Follow the chapters in order.' };
  if (key === 'term-basics') return { level: 'beginner', maturity: 'in-development', audience: 'Start here with an empty folder. No terminal experience needed.' };
  if (key === 'nvim') return { level: 'beginner', maturity: 'in-development', audience: 'For anyone who has only used editors like VS Code: Neovim taught from zero, with practice drills that build the keys into habits, while building a small full-stack app. Basic terminal use is assumed.' };
  if (key === 'nvim-start') return { level: 'beginner', maturity: 'in-development', audience: 'Start here with an empty folder; the first lesson provides the starter files.' };
  if (key.startsWith('nvim-')) return { level: 'beginner', maturity: 'in-development', audience: 'Continues in the same project folder as the chapters before it.' };
  if (key === 'frontier' || key.startsWith('frontier-')) return { level: 'bridge', maturity: 'in-development', audience: 'For people who can hack Python scripts together and want to understand modern AI from first principles. Software engineering, computer science, mathematics and machine learning are all taught when first needed; every method is built by hand, then used through the professional library. Follow the chapters in order: they build one project.' };
  if (key === 'forge' || key.startsWith('forge-')) return { level: 'beginner', maturity: 'in-development', recommended: true, audience: 'Recommended for self-taught Python scripters. Assumes variables, loops and functions; tools, testing and project structure are taught in order. Later engine chapters build on the earlier chapters.' };
  if (key === 'applied-ml' || key.startsWith('aml-')) return { level: 'beginner', maturity: 'in-development', audience: 'For Python beginners and scripters moving into data work. Start with Python from Zero, then A Project of Its Own; later chapters are still being authored.' };
  if (['dice-learning', 'dice-path-start', 'dice-path-state', 'dice-path-objects', 'dice-path-project', 'dice-path-learning'].includes(key)) return { level: 'bridge', maturity: 'in-development', audience: 'Learn C++ through a terminal game. Basic Python scripting is the entry prerequisite; follow the C++ chapters in order. SDL and Vulkan chapters are planned, not a completed path.' };
  if (key === 'dice-cpp') return { level: 'bridge', maturity: 'review-required', audience: 'For Python scripters building a C++ game. Review the Dice opening path first if compiling, types or native tools are unfamiliar.' };
  if (key === 'cpp-mastery' || key.startsWith('cpp-')) return { level: ['cpp-foundations', 'cpp-language-basics', 'cpp-mastery'].includes(key) ? 'bridge' : 'advanced', maturity: 'review-required', audience: key === 'cpp-mastery' ? 'Starts with compiler tools and typed values for Python scripters. Later chapters require the preceding C++ material; memory, systems, graphics and engines are advanced. Lesson quality review is pending.' : 'Follow the C++ series in order. Foundations introduces the compiler; language basics assumes that setup. Later chapters assume functions, types, compilation and tests, plus the preceding topic chapters.' };
  if (key === 'ml-production' || key.startsWith('ml-')) return { level: key === 'ml-software' || key === 'ml-production' ? 'bridge' : 'advanced', maturity: 'review-required', audience: 'For Python scripters: begin with Python Becomes Software. Later chapters assume the preceding data, mathematics and model work; production and advanced topics need those foundations.' };
  const profiles = {
    'studio-build': { level: 'bridge', maturity: 'in-development', audience: 'For learners who know some JavaScript: build a desktop game studio (Electron, React, TypeScript, Phaser) from an empty folder, every line explained. Sprint 0 is written; the rest is planned in docs/studio-from-scratch-plan.md.' },
    'spreadsheet-build': { level: 'bridge', maturity: 'review-required', audience: 'For Python scripters building a spreadsheet application. Begin with terminal and project setup; later chapters build on the earlier implementation.' },
    'java-engineering': { level: 'bridge', maturity: 'review-required', audience: 'For scripters moving into Java application development. Begin with a small Java execution experiment; build tools, databases and browser work follow. No Java framework experience is assumed.' },
    'rl-pygame': { level: 'bridge', maturity: 'review-required', audience: 'For Python scripters who can use functions, lists and dictionaries. Review the environment and testing chapters before Q-learning; game loops and learning terminology are introduced along the path.' },
    'circuit-clash': { level: 'beginner', maturity: 'review-required', audience: 'For Python scripters building stronger type, debugging and design skills. Standalone C# foundations lead through algorithms, graphics, racing, probability and Q-learning, with return-later challenges. Requires a local .NET 10 SDK and graphics display. The executable path is verified on Apple silicon macOS; learner pacing and other platforms still need review.' },
    'pyside6-engine': { level: 'advanced', maturity: 'in-development', audience: 'For learners already comfortable with Python classes, modules and debugging. Review Forge functions, objects and packaging first if GUI event handling and engine structure are unfamiliar. Only the first lesson, a window prototype, is written so far.' },
  };
  if (key === 'electron-basics' || key.startsWith('electron-basics-')) return { level: 'bridge', maturity: 'in-development', audience: 'For learners who want to understand the basics of Electron, including creating a window, accessing the filesystem securely via preload scripts, and working with a terminal.' };
  return profiles[key] || { level: 'unclassified', maturity: 'review-required', audience: "Prerequisites haven't been reviewed yet. Inspect the first lesson before choosing this track." };
}
