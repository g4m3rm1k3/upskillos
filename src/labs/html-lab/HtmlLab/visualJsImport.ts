import { parse, type Comment } from 'acorn';
import { parseJsToBlocks } from '../../visual-code/jsToBlocks.ts';
import { createBlock } from '../../visual-code/blocks.ts';
import { normalizeProject, transpileProject } from '../../visual-code/transpiler.ts';

function tree(code: string) {
  const comments: Comment[] = [];
  const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module', onComment: comments });
  return { comments, normalized: JSON.stringify(ast, (key, value) => ['start', 'end', 'raw'].includes(key) ? undefined : value) };
}

// Check each statement separately so unsupported syntax never hides the rest
// of a file's editable blocks. Keep comments with their original statement.
export function importVisualJs(code: string) {
  if (!code.trim()) return { blocks: [], preserved: false };
  const literal = (source: string) => {
    const block = createBlock('call');
    return { ...block, fields: { ...block.fields, expression: source } };
  };
  let preserved = false;
  try {
    const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
    let offset = 0;
    const blocks = ast.body.flatMap(statement => {
      const source = code.slice(offset, statement.end);
      offset = statement.end;
      try {
        const original = tree(source);
        const candidates = parseJsToBlocks(source);
        const project = normalizeProject({ target: 'javascript', files: [{ id: 'import', name: 'script.js', blocks: candidates }], activeFileId: 'import' });
        if (!original.comments.length && original.normalized === tree(transpileProject(project).code).normalized) return candidates;
      } catch { /* Keep the original statement below. */ }
      preserved = true;
      return [literal(source)];
    });
    const tail = code.slice(offset);
    if (tail.trim()) { blocks.push(literal(tail)); preserved = true; }
    return { blocks, preserved };
  } catch {
    return { blocks: [literal(code)], preserved: true };
  }
}
