import { parse } from 'acorn'

// A curated library of common JS expressions, grouped and parameterized —
// the same idea as CSS_PROP_GROUPS/CSS_PROP_VALUES in VisualJsPanel.tsx, just
// for JS instead of CSS. Doesn't try to cover the whole language (that's
// infinite); covers the patterns a beginner actually needs constantly
// (find an element, fetch some JSON, round a number, uppercase text...) so
// they're a dropdown pick instead of memorized syntax. Anything not covered
// still falls back to typing it by hand — every field this powers stays a
// normal, always-editable text input.
//
// Params of kind 'expression' are genuinely recursive: VisualJsPanel renders
// them as another full nested pattern-picker, not a plain text box — so
// "call a method with an argument that's itself a comparison that's itself
// a property lookup" can be built (or, via detectTemplate below, decomposed
// back out of already-written code) one explicit piece at a time, instead
// of bottoming out at "type the rest by hand" the moment there's more than
// one operator in play.

export type ExpressionParamKind = 'selector' | 'variable' | 'expression' | 'text' | 'domProperty' | 'boolean'

export interface ExpressionParam {
  name: string
  label: string
  kind: ExpressionParamKind
  placeholder?: string
  default?: string
}

export interface ExpressionTemplate {
  id: string
  group: string
  label: string
  description: string
  params: ExpressionParam[]
  build: (v: Record<string, string>) => string
}

export const EXPRESSION_GROUPS: { id: string; label: string }[] = [
  { id: 'values', label: 'Values' },
  { id: 'dom', label: 'Find on the page' },
  { id: 'calls', label: 'Calls & properties' },
  { id: 'logic', label: 'Logic (and / or / not)' },
  { id: 'network', label: 'Network / JSON' },
  { id: 'text', label: 'Text' },
  { id: 'array', label: 'Lists' },
  { id: 'math', label: 'Math' },
  { id: 'convert', label: 'Convert' },
  { id: 'time', label: 'Time' },
  { id: 'compare', label: 'Compare' },
]

const p = (name: string, label: string, kind: ExpressionParamKind = 'text', def?: string): ExpressionParam =>
  ({ name, label, kind, default: def })

export const EXPRESSION_LIBRARY: ExpressionTemplate[] = [
  { id: 'textValue', group: 'values', label: 'Text', description: 'Text in quotes. Quotes and special characters are added for you.', params: [p('text', 'Text')], build: v => JSON.stringify(v.text ?? '') },
  { id: 'numberValue', group: 'values', label: 'Number', description: 'A numeric value.', params: [p('value', 'Number', 'text', '0')], build: v => v.value || '0' },
  { id: 'booleanValue', group: 'values', label: 'True or false', description: 'A boolean value.', params: [p('value', 'Boolean', 'boolean', 'true')], build: v => v.value === 'false' ? 'false' : 'true' },
  { id: 'variableValue', group: 'values', label: 'Use a variable', description: 'Read a value stored under this name.', params: [p('value', 'Variable', 'variable')], build: v => v.value || 'value' },
  { id: 'getElementById', group: 'dom', label: 'Find element by ID', description: 'document.getElementById(id)', params: [p('id', 'Element ID')], build: v => `document.getElementById(${JSON.stringify(v.id || '')})` },

  // ── DOM ──────────────────────────────────────────────────────────────────
  {
    id: 'querySelector', group: 'dom', label: 'Find one element',
    description: 'document.querySelector(selector)',
    params: [p('selector', 'Element', 'selector')],
    build: v => `document.querySelector(${JSON.stringify(v.selector || '')})`,
  },
  {
    id: 'querySelectorAll', group: 'dom', label: 'Find all matching elements',
    description: 'document.querySelectorAll(selector) — a list, not one element',
    params: [p('selector', 'Elements', 'selector')],
    build: v => `document.querySelectorAll(${JSON.stringify(v.selector || '')})`,
  },
  {
    id: 'createElement', group: 'dom', label: 'Create a new element',
    description: "document.createElement(tag) — not on the page until you add it",
    params: [p('tag', 'Tag name', 'text', 'div')],
    build: v => `document.createElement(${JSON.stringify(v.tag || 'div')})`,
  },
  {
    id: 'closest', group: 'dom', label: 'Nearest ancestor matching a selector',
    description: 'element.closest(selector)',
    params: [p('value', 'Element', 'variable'), p('selector', 'Ancestor', 'selector')],
    build: v => `${v.value || 'element'}.closest(${JSON.stringify(v.selector || '')})`,
  },
  {
    id: 'getElementProperty', group: 'dom', label: "Get an element's property",
    description: "element.property — e.g. a checkbox's checked state, an input's value, a link's href. Pick the element (nest another DOM pattern, or type a variable name), then pick which property.",
    params: [p('object', 'Element', 'expression'), p('property', 'Property', 'domProperty')],
    build: v => `${v.object || 'element'}.${v.property || 'textContent'}`,
  },

  // ── Calls & properties ──────────────────────────────────────────────────
  // The general-purpose building blocks: "call this with these arguments"
  // and "get this property off that." Every argument is itself a nested
  // expression picker, so e.g. btn.addEventListener('click', load) breaks
  // down into: call → fn: btn.addEventListener, arg1: a text literal,
  // arg2: a bare identifier — instead of one opaque string.
  {
    id: 'callFn', group: 'calls', label: 'Call a function or method',
    description: "name(arg1, arg2, arg3) — e.g. btn.addEventListener. Leave argument boxes blank if not needed.",
    params: [
      p('fn', 'Function / method (e.g. btn.addEventListener)', 'text'),
      p('arg1', 'Argument 1 (optional)', 'expression'),
      p('arg2', 'Argument 2 (optional)', 'expression'),
      p('arg3', 'Argument 3 (optional)', 'expression'),
    ],
    build: v => {
      const args = [v.arg1, v.arg2, v.arg3].map(a => (a ?? '').trim()).filter(Boolean)
      return `${v.fn || 'fn'}(${args.join(', ')})`
    },
  },
  {
    id: 'getProperty', group: 'calls', label: 'Get a property',
    description: 'object.property',
    params: [p('object', 'Object', 'expression'), p('property', 'Property name', 'text')],
    build: v => `${v.object || 'object'}.${v.property || 'property'}`,
  },

  // ── Logic (boolean combinators) ─────────────────────────────────────────
  // These read as sentences on purpose — a learner should never have to
  // wonder what && does at a given point; the label says it.
  {
    id: 'logicAnd', group: 'logic', label: 'Both must be true (AND)',
    description: 'a && b',
    params: [p('a', 'First', 'expression'), p('b', 'Second', 'expression')],
    build: v => `${v.a || 'a'} && ${v.b || 'b'}`,
  },
  {
    id: 'logicOr', group: 'logic', label: 'Either can be true (OR)',
    description: 'a || b',
    params: [p('a', 'First', 'expression'), p('b', 'Second', 'expression')],
    build: v => `${v.a || 'a'} || ${v.b || 'b'}`,
  },
  {
    id: 'logicNot', group: 'logic', label: 'Is not true (NOT)',
    description: '!value',
    params: [p('value', 'Value', 'expression')],
    build: v => `!${v.value || 'value'}`,
  },
  {
    id: 'guardThen', group: 'logic', label: 'Only if it exists, then...',
    description: "value && action — a common safety check: don't run action unless value is real (not null/undefined). Same as AND, worded for this specific, very common use.",
    params: [p('check', 'Only if this exists', 'expression'), p('then', 'Then do this', 'expression')],
    build: v => `${v.check || 'value'} && ${v.then || 'action'}`,
  },

  // ── Network / JSON ───────────────────────────────────────────────────────
  {
    id: 'fetchJson', group: 'network', label: 'Fetch JSON from a URL',
    description: 'fetch(url).then(response => response.json()) — just the promise, e.g. to return or assign it',
    params: [p('url', 'URL', 'text', 'https://api.example.com')],
    build: v => `fetch(${JSON.stringify(v.url || '')}).then(response => response.json())`,
  },
  {
    id: 'fetchJsonHandle', group: 'network', label: 'Fetch JSON, then use it',
    description: 'fetch(url).then(r => r.json()).then(data => { ... }) — the whole chain, explicit: fill in what happens with the data, and (optionally) what happens if it fails',
    params: [
      p('url', 'URL', 'text', 'https://api.example.com'),
      p('body', 'What to do with the data (data is available)', 'text', 'console.log(data)'),
      p('errorBody', 'What to do if it fails (optional)', 'text', ''),
    ],
    build: v => {
      const url = JSON.stringify(v.url || '')
      const body = v.body?.trim() || 'console.log(data)'
      const base = `fetch(${url}).then(response => response.json()).then(data => { ${body} })`
      const errorBody = v.errorBody?.trim()
      return errorBody ? `${base}.catch(error => { ${errorBody} })` : base
    },
  },
  {
    id: 'fetchText', group: 'network', label: 'Fetch plain text from a URL',
    description: 'fetch(url).then(response => response.text())',
    params: [p('url', 'URL', 'text', 'https://api.example.com')],
    build: v => `fetch(${JSON.stringify(v.url || '')}).then(response => response.text())`,
  },
  {
    id: 'jsonStringify', group: 'network', label: 'Turn a value into JSON text',
    description: 'JSON.stringify(value)',
    params: [p('value', 'Value', 'variable')],
    build: v => `JSON.stringify(${v.value || 'value'})`,
  },
  {
    id: 'jsonParse', group: 'network', label: 'Turn JSON text into a value',
    description: 'JSON.parse(text)',
    params: [p('value', 'JSON text', 'variable')],
    build: v => `JSON.parse(${v.value || 'text'})`,
  },

  // ── Text ─────────────────────────────────────────────────────────────────
  {
    id: 'strUpper', group: 'text', label: 'Make uppercase',
    description: 'text.toUpperCase()',
    params: [p('value', 'Text', 'variable')],
    build: v => `${v.value || 'text'}.toUpperCase()`,
  },
  {
    id: 'strLower', group: 'text', label: 'Make lowercase',
    description: 'text.toLowerCase()',
    params: [p('value', 'Text', 'variable')],
    build: v => `${v.value || 'text'}.toLowerCase()`,
  },
  {
    id: 'strTrim', group: 'text', label: 'Remove leading/trailing spaces',
    description: 'text.trim()',
    params: [p('value', 'Text', 'variable')],
    build: v => `${v.value || 'text'}.trim()`,
  },
  {
    id: 'strIncludes', group: 'text', label: 'Contains a piece of text?',
    description: 'text.includes(search)',
    params: [p('value', 'Text', 'variable'), p('search', 'Looking for', 'text')],
    build: v => `${v.value || 'text'}.includes(${JSON.stringify(v.search || '')})`,
  },
  {
    id: 'strReplace', group: 'text', label: 'Replace a piece of text',
    description: 'text.replace(find, withThis)',
    params: [p('value', 'Text', 'variable'), p('search', 'Find', 'text'), p('replacement', 'Replace with', 'text')],
    build: v => `${v.value || 'text'}.replace(${JSON.stringify(v.search || '')}, ${JSON.stringify(v.replacement || '')})`,
  },
  {
    id: 'strSplit', group: 'text', label: 'Split into a list',
    description: "text.split(separator)",
    params: [p('value', 'Text', 'variable'), p('separator', 'Split on', 'text', ',')],
    build: v => `${v.value || 'text'}.split(${JSON.stringify(v.separator ?? ',')})`,
  },
  {
    id: 'strLength', group: 'text', label: 'How many characters?',
    description: 'text.length',
    params: [p('value', 'Text', 'variable')],
    build: v => `${v.value || 'text'}.length`,
  },
  {
    id: 'templateJoin', group: 'text', label: 'Combine text with a value',
    description: '`before${value}after` — a template string',
    params: [p('before', 'Text before', 'text'), p('value', 'Value', 'variable'), p('after', 'Text after', 'text')],
    build: v => `\`${v.before || ''}\${${v.value || 'value'}}${v.after || ''}\``,
  },

  // ── Lists (arrays) ───────────────────────────────────────────────────────
  {
    id: 'arrLength', group: 'array', label: 'How many items?',
    description: 'list.length',
    params: [p('value', 'List', 'variable')],
    build: v => `${v.value || 'list'}.length`,
  },
  {
    id: 'arrJoin', group: 'array', label: 'Join into one piece of text',
    description: 'list.join(separator)',
    params: [p('value', 'List', 'variable'), p('separator', 'Between items', 'text', ', ')],
    build: v => `${v.value || 'list'}.join(${JSON.stringify(v.separator ?? ', ')})`,
  },
  {
    id: 'arrIncludes', group: 'array', label: 'Contains an item?',
    description: 'list.includes(item)',
    params: [p('value', 'List', 'variable'), p('item', 'Item', 'text')],
    build: v => `${v.value || 'list'}.includes(${v.item || ''})`,
  },
  {
    id: 'arrPush', group: 'array', label: 'Add an item to the end',
    description: 'list.push(item)',
    params: [p('value', 'List', 'variable'), p('item', 'Item to add', 'text')],
    build: v => `${v.value || 'list'}.push(${v.item || ''})`,
  },
  {
    id: 'arrMap', group: 'array', label: 'Transform every item',
    description: 'list.map(item => ...)',
    params: [p('value', 'List', 'variable'), p('expr', 'New value for each item', 'text', 'item')],
    build: v => `${v.value || 'list'}.map(item => ${v.expr || 'item'})`,
  },
  {
    id: 'arrFilter', group: 'array', label: 'Keep only matching items',
    description: 'list.filter(item => ...)',
    params: [p('value', 'List', 'variable'), p('expr', 'Keep item when', 'text', 'true')],
    build: v => `${v.value || 'list'}.filter(item => ${v.expr || 'true'})`,
  },

  // ── Math ─────────────────────────────────────────────────────────────────
  {
    id: 'mathRandom', group: 'math', label: 'Random number, 0 to 1',
    description: 'Math.random()',
    params: [],
    build: () => 'Math.random()',
  },
  {
    id: 'mathRandomInt', group: 'math', label: 'Random whole number',
    description: 'Math.floor(Math.random() * max)',
    params: [p('max', 'Up to (exclusive)', 'text', '10')],
    build: v => `Math.floor(Math.random() * ${v.max || '10'})`,
  },
  {
    id: 'mathRound', group: 'math', label: 'Round to nearest whole number',
    description: 'Math.round(value)',
    params: [p('value', 'Value', 'variable')],
    build: v => `Math.round(${v.value || '0'})`,
  },
  {
    id: 'mathFloor', group: 'math', label: 'Round down',
    description: 'Math.floor(value)',
    params: [p('value', 'Value', 'variable')],
    build: v => `Math.floor(${v.value || '0'})`,
  },
  {
    id: 'mathMax', group: 'math', label: 'Larger of two values',
    description: 'Math.max(a, b)',
    params: [p('a', 'First', 'variable'), p('b', 'Second', 'variable')],
    build: v => `Math.max(${v.a || '0'}, ${v.b || '0'})`,
  },
  {
    id: 'mathMin', group: 'math', label: 'Smaller of two values',
    description: 'Math.min(a, b)',
    params: [p('a', 'First', 'variable'), p('b', 'Second', 'variable')],
    build: v => `Math.min(${v.a || '0'}, ${v.b || '0'})`,
  },

  // ── Convert ──────────────────────────────────────────────────────────────
  {
    id: 'toNumber', group: 'convert', label: 'Turn into a number',
    description: 'Number(value)',
    params: [p('value', 'Value', 'variable')],
    build: v => `Number(${v.value || 'value'})`,
  },
  {
    id: 'toText', group: 'convert', label: 'Turn into text',
    description: 'String(value)',
    params: [p('value', 'Value', 'variable')],
    build: v => `String(${v.value || 'value'})`,
  },
  {
    id: 'parseWholeNumber', group: 'convert', label: 'Read a whole number from text',
    description: 'parseInt(text)',
    params: [p('value', 'Text', 'variable')],
    build: v => `parseInt(${v.value || 'text'})`,
  },
  {
    id: 'parseDecimal', group: 'convert', label: 'Read a decimal number from text',
    description: 'parseFloat(text)',
    params: [p('value', 'Text', 'variable')],
    build: v => `parseFloat(${v.value || 'text'})`,
  },

  // ── Time ─────────────────────────────────────────────────────────────────
  {
    id: 'dateNow', group: 'time', label: 'Current time (milliseconds)',
    description: 'Date.now()',
    params: [],
    build: () => 'Date.now()',
  },
  {
    id: 'newDate', group: 'time', label: "Today's date and time",
    description: 'new Date()',
    params: [],
    build: () => 'new Date()',
  },

  // ── Compare (mainly for If conditions) ──────────────────────────────────
  {
    id: 'cmpEquals', group: 'compare', label: 'Are equal',
    description: 'a === b',
    params: [p('a', 'First', 'expression'), p('b', 'Second', 'expression')],
    build: v => `${v.a || 'a'} === ${v.b || 'b'}`,
  },
  {
    id: 'cmpNotEquals', group: 'compare', label: 'Are not equal',
    description: 'a !== b',
    params: [p('a', 'First', 'expression'), p('b', 'Second', 'expression')],
    build: v => `${v.a || 'a'} !== ${v.b || 'b'}`,
  },
  {
    id: 'cmpGreater', group: 'compare', label: 'Greater than',
    description: 'a > b',
    params: [p('a', 'First', 'expression'), p('b', 'Second', 'expression')],
    build: v => `${v.a || 'a'} > ${v.b || 'b'}`,
  },
  {
    id: 'cmpLess', group: 'compare', label: 'Less than',
    description: 'a < b',
    params: [p('a', 'First', 'expression'), p('b', 'Second', 'expression')],
    build: v => `${v.a || 'a'} < ${v.b || 'b'}`,
  },
]

// ── Reverse detection ─────────────────────────────────────────────────────
export interface DetectedTemplate {
  id: string
  params: Record<string, string>
}

export function detectTemplate(value: string): DetectedTemplate | null {
  const v = value.trim()
  if (!v) return null
  try {
    const statement = parse(`(${v}\n)`, { ecmaVersion: 'latest' }).body[0]
    if (statement.type !== 'ExpressionStatement') return null
    const node = statement.expression
    const source = (part: { start: number; end: number }) => v.slice(part.start - 1, part.end - 1)
    if (node.type === 'Literal') {
      if (typeof node.value === 'string') return { id: 'textValue', params: { text: node.value } }
      if (typeof node.value === 'number') return { id: 'numberValue', params: { value: source(node) } }
      if (typeof node.value === 'boolean') return { id: 'booleanValue', params: { value: String(node.value) } }
    }
    if (node.type === 'Identifier') return { id: 'variableValue', params: { value: node.name } }
    if (node.type === 'UnaryExpression') {
      if (node.operator === '!' ) return { id: 'logicNot', params: { value: `(${source(node.argument)})` } }
      if (['-', '+'].includes(node.operator) && node.argument.type === 'Literal' && typeof node.argument.value === 'number') return { id: 'numberValue', params: { value: source(node) } }
    }
    if (node.type === 'BinaryExpression' || node.type === 'LogicalExpression') {
      const ids: Record<string, string> = { '&&': 'logicAnd', '||': 'logicOr', '===': 'cmpEquals', '!==': 'cmpNotEquals', '>': 'cmpGreater', '<': 'cmpLess' }
      const id = ids[node.operator]
      if (id) return { id, params: { a: `(${source(node.left)})`, b: `(${source(node.right)})` } }
    }
    if (node.type === 'MemberExpression' && !node.computed && !node.optional && node.property.type === 'Identifier') {
      return { id: 'getProperty', params: { object: ['Identifier', 'MemberExpression', 'CallExpression', 'ThisExpression'].includes(node.object.type) ? source(node.object) : `(${source(node.object)})`, property: node.property.name } }
    }
    if (node.type === 'CallExpression' && !node.optional && node.arguments.every(arg => arg.type !== 'SpreadElement')) {
      const fn = source(node.callee)
      const args = node.arguments
      const fixed: Record<string, [string, string[]]> = {
        'Math.random': ['mathRandom', []], 'Date.now': ['dateNow', []],
        'Math.round': ['mathRound', ['value']], 'Math.floor': ['mathFloor', ['value']],
        'Math.max': ['mathMax', ['a','b']], 'Math.min': ['mathMin', ['a','b']],
        'Number': ['toNumber', ['value']], 'String': ['toText', ['value']],
        'parseInt': ['parseWholeNumber', ['value']], 'parseFloat': ['parseDecimal', ['value']],
        'JSON.stringify': ['jsonStringify', ['value']], 'JSON.parse': ['jsonParse', ['value']],
      }
      const known = fixed[fn]
      if (known && args.length === known[1].length) return { id: known[0], params: Object.fromEntries(args.map((arg, i) => [known[1][i], source(arg)])) }
      const dom: Record<string, [string, string]> = { 'document.querySelector': ['querySelector', 'selector'], 'document.querySelectorAll': ['querySelectorAll', 'selector'], 'document.getElementById': ['getElementById', 'id'], 'document.createElement': ['createElement', 'tag'] }
      const domCall = dom[fn]
      if (domCall && args.length === 1 && args[0].type === 'Literal' && typeof args[0].value === 'string') return { id: domCall[0], params: { [domCall[1]]: args[0].value } }
      if (args.length <= 3 && /^(?:[A-Za-z_$][\w$]*)(?:\.[A-Za-z_$][\w$]*)*$/.test(fn)) return { id: 'callFn', params: { fn, ...Object.fromEntries(args.map((arg, i) => [`arg${i + 1}`, source(arg)])) } }
    }
  } catch { /* Incomplete or unsupported expressions stay editable as code. */ }
  return null
}
