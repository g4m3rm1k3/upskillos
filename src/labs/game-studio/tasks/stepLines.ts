// What a task's steps write, line by line: for the rule that every lesson explains every line of the code its task
// built (docs/game-studio-course-plan.md, "The standard for every game chapter", rule 4). The course tests check
// that each of these lines appears in the lesson's "the code you wrote, line by line" walkthrough.

/** A line that writes a whole file: a script, or an SVG picture (project.writeSvg), with its text as JSON. */
const WRITE = /^project\.(?:writeScript|writeSvg)\(['"]([^'"]+)['"], (".*")\)$/;
/**
 * Lines with nothing to explain: brackets and punctuation, blank lines, and comments (line comments and doc comments).
 * And a saved brain: training makes it (Run › Train an agent…, Save as brain), nobody writes its numbers.
 */
const QUIET = (line: string) => /^[\s{}()[\];,]*$/.test(line) || /^(\/\/|\/\*|\*)/.test(line) || line.startsWith('project.saveBrain(');

export interface Written {
  /** The script's (or SVG picture's) path, or '' for the Scene API code that builds scenes, nodes, actions and assets. */
  file: string;
  /** Its lines that the task wrote, trimmed, in order, each once. */
  lines: string[];
}

/**
 * Replay steps in order, keeping each script's text, and return what the target task's own steps wrote: every
 * Scene API line, and in each script the lines that were not there before the step (a changed script's new or
 * changed lines; a new script's every line).
 */
export function writtenBy(steps: { task: string; code: string }[], target: string): Written[] {
  const scripts = new Map<string, string>(), out = new Map<string, string[]>();
  const add = (file: string, line: string) => {
    const list = out.get(file) ?? (out.set(file, []), out.get(file)!);
    if (!list.includes(line)) list.push(line);
  };
  for (const { task, code } of steps) {
    for (const raw of code.split('\n')) {
      const line = raw.trim(), m = WRITE.exec(line);
      if (!m) { if (task === target && !QUIET(line)) add('', line); continue; }
      const [, path, json] = m, src = JSON.parse(json) as string;
      const before = new Set((scripts.get(path) ?? '').split('\n').map((l) => l.trim()));
      if (task === target) for (const l of src.split('\n').map((x) => x.trim())) if (!QUIET(l) && !before.has(l)) add(path, l);
      scripts.set(path, src);
    }
  }
  return [...out].map(([file, lines]) => ({ file, lines }));
}

/** The lines of code in a walkthrough's fenced code blocks, trimmed. */
export function walkthroughLines(markdown: string): Set<string> {
  const lines = new Set<string>();
  for (const block of markdown.matchAll(/```[a-z]*\n([\s\S]*?)```/g)) for (const l of block[1].split('\n')) lines.add(l.trim());
  return lines;
}
