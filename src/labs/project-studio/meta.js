export default {
  label: 'Project Studio',
  emoji: '🛠️',
  color: '#2dd4bf',
  kind: 'lab',
  subject: 'Software Engineering',
  desc: 'Build a real multi-file project step by step — real files on disk, real interpreter, diffs that show exactly what each step adds. Desktop app only.',
  path: '/lab/project-studio',
  tags: ['pyside6', 'pygame', 'python', 'ide', 'project', 'desktop'],
  cover: {
    grad: 'linear-gradient(135deg, #0f766e 0%, #1e293b 100%)',
    mark: '🛠️',
    sub: 'Build it for real',
  },
  order: 5,
  // Labs open as floating desktop windows sized from here (EntryShell →
  // openWindow). Three panels plus an output pane needs considerably more
  // room than the ~1280x860 the widest existing lab asks for.
  width: 1500,
  height: 950,
}
